/**
 * EChartsRenderer — the ONLY chart renderer used by the Dashboard_Page.
 *
 * Wraps echarts-for-react with:
 * - ResizeObserver-based resize handling (debounced via rAF)
 * - Empty-state placeholder when option is null/undefined or has no series
 * - Internal error boundary that catches render exceptions per-card
 * - Theme-aware (light/dark)
 * - Disposes the chart on unmount
 *
 * Does NOT inject function-valued formatters — keeps options JSON-clean.
 *
 * Feature: echarts-dashboard-architecture
 */

import { Component, useEffect, useMemo, useRef, useState, type ReactNode } from 'react'
import ReactECharts from 'echarts-for-react'
import type { EChartsOption, LanguageCode, ThemeMode } from '../../lib/dashboard/dashboardSchema'
import { getMessage } from '../../lib/dashboard/messages'

// ── Props ───────────────────────────────────────────────────────────────────

export interface EChartsRendererProps {
  /** ECharts option object. JSON-serializable. */
  option: EChartsOption | null | undefined
  /** Theme mode. Drives palette selection. */
  theme: ThemeMode
  /** Language for empty/error messages. */
  language?: LanguageCode
  /** Optional className for the host container. */
  className?: string
  /** Optional explicit height; otherwise fills the parent. */
  height?: number | string
}

// ── Empty-state Placeholder ─────────────────────────────────────────────────

function EmptyChartPlaceholder({ language }: { language: LanguageCode }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-[12px] text-[var(--color-text-muted)]">
      {getMessage(language, 'empty_chart')}
    </div>
  )
}

// ── Error-state Placeholder ─────────────────────────────────────────────────

function ErrorChartPlaceholder({ language }: { language: LanguageCode }) {
  return (
    <div className="w-full h-full flex items-center justify-center text-[12px] text-[#FF453A]">
      {getMessage(language, 'render_error')}
    </div>
  )
}

// ── Internal Error Boundary ─────────────────────────────────────────────────

interface ChartErrorBoundaryProps {
  fallback: ReactNode
  children: ReactNode
}

interface ChartErrorBoundaryState {
  hasError: boolean
}

class ChartErrorBoundary extends Component<ChartErrorBoundaryProps, ChartErrorBoundaryState> {
  state: ChartErrorBoundaryState = { hasError: false }

  static getDerivedStateFromError(): ChartErrorBoundaryState {
    return { hasError: true }
  }

  componentDidCatch(error: Error): void {
    // Local logging only — do not propagate
    if (typeof console !== 'undefined') {
      console.warn('[EChartsRenderer] render error caught locally:', error.message)
    }
  }

  render(): ReactNode {
    if (this.state.hasError) {
      return this.props.fallback
    }
    return this.props.children
  }
}

// ── Empty-option Detection ──────────────────────────────────────────────────

function isOptionEmpty(option: EChartsOption | null | undefined): boolean {
  if (option === null || option === undefined) return true
  if (!Array.isArray(option.series)) return true
  if (option.series.length === 0) return true
  // All series have empty data?
  return option.series.every((s) => {
    if (typeof s !== 'object' || s === null) return true
    const data = (s as { data?: unknown }).data
    if (!Array.isArray(data)) return true
    return data.length === 0
  })
}

// ── Renderer ────────────────────────────────────────────────────────────────

export function EChartsRenderer(props: EChartsRendererProps): ReactNode {
  const { option, theme, language = 'en', className, height } = props

  const containerRef = useRef<HTMLDivElement | null>(null)
  const echartsRef = useRef<ReactECharts | null>(null)
  const [, setResizeTick] = useState(0)

  // Resize observer
  useEffect(() => {
    const el = containerRef.current
    if (!el || typeof ResizeObserver === 'undefined') return

    let rafId: number | null = null
    const observer = new ResizeObserver(() => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      rafId = requestAnimationFrame(() => {
        const inst = echartsRef.current?.getEchartsInstance()
        if (inst) inst.resize()
        setResizeTick((t) => t + 1)
      })
    })
    observer.observe(el)
    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId)
      observer.disconnect()
    }
  }, [])

  const empty = useMemo(() => isOptionEmpty(option), [option])

  const containerStyle = useMemo<React.CSSProperties>(() => ({
    width: '100%',
    height: height ?? '100%',
    minHeight: 200,
  }), [height])

  return (
    <div ref={containerRef} className={className} style={containerStyle}>
      {empty ? (
        <EmptyChartPlaceholder language={language} />
      ) : (
        <ChartErrorBoundary fallback={<ErrorChartPlaceholder language={language} />}>
          <ReactECharts
            ref={echartsRef}
            option={option as object}
            notMerge={true}
            lazyUpdate={true}
            theme={theme === 'dark' ? 'dark' : undefined}
            style={{ width: '100%', height: '100%' }}
            opts={{ renderer: 'canvas' }}
          />
        </ChartErrorBoundary>
      )}
    </div>
  )
}

export default EChartsRenderer
