/**
 * DashboardPanelChart — bridges legacy backend panels to the ECharts-only
 * dashboard architecture.
 *
 * - KPI / stat / grid cards: render as plain DOM (no chart library).
 * - All chart types (bar, line, area, pie, donut, scatter, heatmap): adapted
 *   to ChartNodeOutput via panelAdapter and rendered by EChartsRenderer.
 * - Unmapped chart types: render a DeprecationFallbackCard.
 *
 * No imports of react-chartjs-2 or chart.js — those are forbidden on the
 * dashboard render path under the ECharts-only architecture.
 *
 * Feature: echarts-dashboard-architecture
 */

import { useMemo } from 'react'
import { useTheme } from '../../hooks/useTheme'
import type { DashboardLang, EnhancedPanel } from '../../utils/dashboardEnhancements'
import type { LanguageCode, ThemeMode } from '../../lib/dashboard/dashboardSchema'
import { adaptPanelToChartNodeOutput, type LegacyPanel } from '../../lib/dashboard/panelAdapter'
import { EChartsRenderer } from './EChartsRenderer'
import { DeprecationFallbackCard } from './DeprecationFallbackCard'

function ui(lang: DashboardLang, en: string, tr: string) {
  return lang === 'tr' ? tr : en
}

const COMPOSITION_SKETCH_TYPES = new Set(['treemap', 'sunburst', 'alluvial_diagram', 'word_cloud'])
const NETWORK_SKETCH_TYPES = new Set(['correlation_network', 'network_diagram', 'connection_map', 'circular_graph', 'arc_diagram', 'time_based_network_diagram'])
const MAP_SKETCH_TYPES = new Set(['dot_map', 'choropleth_map', 'bubble_map', 'cartogram', 'dorling_cartogram'])
const SCATTER_TYPES = new Set(['scatter_plot', 'bubble_chart', 'connected_scatter_plot', 'convex_hull_chart'])

export function DashboardPanelChart({ panel, lang }: { panel: EnhancedPanel; lang: DashboardLang }) {
  const { theme } = useTheme()
  const themeMode: ThemeMode = theme === 'dark' ? 'dark' : 'light'
  const language: LanguageCode = lang === 'tr' ? 'tr' : 'en'

  // ── KPI cards / grids / stat cards: plain DOM, no chart library ─────────
  if (panel.type === 'kpi_card') {
    const kpi = (panel as EnhancedPanel & { kpi?: { label?: string; value?: unknown } }).kpi
    const fallback = panel.stats?.[0]
    const label = kpi?.label ?? fallback?.label ?? panel.title
    const value = kpi?.value ?? fallback?.value ?? '-'
    return (
      <div className="h-full min-h-32 rounded-xl bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] p-5 flex flex-col justify-center">
        <p className="text-[11px] text-[#1d1d1f]/45 dark:text-white/45 truncate">{String(label)}</p>
        <p className="mt-2 text-[32px] leading-none font-semibold tracking-tight text-[#1d1d1f] dark:text-white truncate">
          {typeof value === 'number' ? value.toLocaleString() : String(value)}
        </p>
        <p className="mt-2 text-[10px] text-[#1d1d1f]/35 dark:text-white/35">{ui(lang, 'KPI card', 'KPI kartı')}</p>
      </div>
    )
  }
  if (panel.type === 'kpi_grid') {
    return (
      <div className="grid grid-cols-2 md:grid-cols-3 gap-2">
        {(panel.kpis ?? []).slice(0, 12).map((kpi, index) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{kpi.label}</p>
            <p className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white truncate">{typeof kpi.value === 'number' ? kpi.value.toLocaleString() : kpi.value}</p>
          </div>
        ))}
      </div>
    )
  }
  if (panel.type === 'stat_card' || panel.type === 'duplicate_rate_card') {
    return (
      <div className="grid grid-cols-2 gap-2">
        {(panel.stats ?? []).map((stat, index) => (
          <div key={index} className="rounded-lg bg-white dark:bg-[#111113] border border-black/[0.05] dark:border-white/[0.05] px-3 py-2">
            <p className="text-[9px] text-[#1d1d1f]/40 dark:text-white/40 truncate">{stat.label}</p>
            <p className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white truncate">{String(stat.value)}</p>
          </div>
        ))}
      </div>
    )
  }

  // ── Sketch types (network, map, composition): not yet ported to ECharts;
  // render as a deprecation fallback so the user sees a clear message.
  if (NETWORK_SKETCH_TYPES.has(panel.type) || MAP_SKETCH_TYPES.has(panel.type) || COMPOSITION_SKETCH_TYPES.has(panel.type)) {
    return (
      <DeprecationFallbackCard
        chartId={String(panel.id ?? panel.type)}
        language={language}
        reason="unrecognized_library"
      />
    )
  }

  // ── Scatter (legacy uses panel.points instead of panel.data.datasets) ────
  if (SCATTER_TYPES.has(panel.type)) {
    const points = ((panel as EnhancedPanel & { points?: { x: number; y: number; r?: number }[] }).points ?? [])
    if (!points.length) {
      return (
        <DeprecationFallbackCard
          chartId={String(panel.id ?? panel.type)}
          language={language}
          reason="missing_option"
        />
      )
    }
    // Convert to a categorical-shaped panel so the adapter handles it
    const adapted: LegacyPanel = {
      type: 'scatter',
      title: panel.title,
      data: {
        labels: points.map((_, i) => String(i)),
        datasets: [{ label: panel.title, data: points.map((p) => p.y) }],
      },
    }
    const output = adaptPanelToChartNodeOutput(adapted, {
      language, theme: themeMode, sourceNodeId: 'panel', chartId: String(panel.id ?? panel.type),
    })
    if (output.library !== 'echarts' || !output.echartsOption) {
      return <DeprecationFallbackCard chartId={output.id} language={language} reason="missing_option" />
    }
    return <EChartsRenderer option={output.echartsOption} theme={themeMode} language={language} />
  }

  // ── All remaining chart types route through the panel adapter ────────────
  const output = useMemo(() => (
    adaptPanelToChartNodeOutput(panel as LegacyPanel, {
      language,
      theme: themeMode,
      sourceNodeId: 'panel',
      chartId: String(panel.id ?? panel.type ?? 'chart'),
    })
  ), [panel, language, themeMode])

  if (output.library !== 'echarts' || !output.echartsOption) {
    return <DeprecationFallbackCard chartId={output.id} language={language} reason="unrecognized_library" />
  }

  return <EChartsRenderer option={output.echartsOption} theme={themeMode} language={language} />
}

// ── Preview Builder (kept for the marketing/preview area, no chart libs) ────

export function buildDashboardPreviewPanel(type: string): EnhancedPanel {
  const base = {
    id: `preview_${type}`,
    type,
    title: previewTitle(type),
    description: 'Dashboard renderer preview',
    layout: { x: 0, y: 0, w: 6, h: 3 },
  } as EnhancedPanel
  if (type === 'kpi_card') return { ...base, kpi: { label: 'Revenue', value: 128430 }, stats: [{ label: 'Revenue', value: 128430 }] } as EnhancedPanel
  if (type === 'kpi_grid') return { ...base, kpis: [{ label: 'Rows', value: 1240 }, { label: 'Avg', value: 68.4 }, { label: 'Missing', value: '2.1%' }, { label: 'Score', value: 91 }] } as EnhancedPanel
  if (type === 'stat_card' || type === 'duplicate_rate_card') return { ...base, stats: [{ label: 'Duplicate rate', value: '4.8%' }, { label: 'Rows affected', value: 58 }] } as EnhancedPanel
  if (type === 'heatmap') return { ...base, data: { Sales: { Sales: 1, Profit: 0.78, Cost: -0.22 }, Profit: { Sales: 0.78, Profit: 1, Cost: -0.41 }, Cost: { Sales: -0.22, Profit: -0.41, Cost: 1 } } } as EnhancedPanel
  if (NETWORK_SKETCH_TYPES.has(type)) return { ...base, network: previewNetwork() } as EnhancedPanel
  if (MAP_SKETCH_TYPES.has(type)) return { ...base, map_points: previewMapPoints() } as EnhancedPanel
  if (SCATTER_TYPES.has(type)) return { ...base, points: [{ x: 1, y: 3 }, { x: 2, y: 5 }, { x: 3, y: 4 }, { x: 4, y: 8 }, { x: 5, y: 6 }, { x: 6, y: 9 }] } as EnhancedPanel
  if (type === 'donut_chart' || type === 'pie_chart' || type === 'polar_area_chart' || COMPOSITION_SKETCH_TYPES.has(type)) {
    return { ...base, data: { labels: ['North', 'South', 'East', 'West'], datasets: [{ label: 'Share', data: [42, 28, 18, 12] }] } } as EnhancedPanel
  }
  return { ...base, data: { labels: ['Jan', 'Feb', 'Mar', 'Apr', 'May'], datasets: [{ label: 'Sales', data: [32, 58, 44, 76, 62] }, { label: 'Profit', data: [18, 35, 28, 46, 40] }] } } as EnhancedPanel
}

function previewNetwork() {
  return {
    nodes: ['Sales', 'Profit', 'Cost', 'Region', 'Segment', 'Date'].map((label) => ({ id: label, label })),
    links: [
      { source: 'Sales', target: 'Profit', value: 0.8 },
      { source: 'Sales', target: 'Region', value: 0.5 },
      { source: 'Cost', target: 'Profit', value: 0.4 },
      { source: 'Segment', target: 'Region', value: 0.6 },
      { source: 'Date', target: 'Sales', value: 0.7 },
    ],
  }
}

function previewMapPoints() {
  return [
    { label: 'North', value: 42, x: 28, y: 24 },
    { label: 'East', value: 68, x: 56, y: 31 },
    { label: 'West', value: 30, x: 42, y: 44 },
    { label: 'South', value: 55, x: 72, y: 40 },
  ]
}

function previewTitle(type: string) {
  return type.split('_').map((part) => part.slice(0, 1).toUpperCase() + part.slice(1)).join(' ')
}
