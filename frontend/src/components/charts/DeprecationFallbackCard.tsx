/**
 * DeprecationFallbackCard — per-card fallback rendered when a chart entry
 * cannot be displayed by the EChartsRenderer.
 *
 * Triggered when:
 * - chart.library !== 'echarts' (legacy/unrecognized format)
 * - chart.echartsOption is missing
 * - the renderer threw a runtime error
 * - the schema validator rejected the chart entry
 *
 * The card has no interactive controls. It is purely informational so the
 * workflow author can identify and re-run the offending chart node.
 *
 * Feature: echarts-dashboard-architecture
 */

import type { LanguageCode } from '../../lib/dashboard/dashboardSchema'
import { getMessage, type MessageKey } from '../../lib/dashboard/messages'

// ── Props ───────────────────────────────────────────────────────────────────

export type DeprecationReason =
  | 'unrecognized_library'
  | 'missing_option'
  | 'render_error'
  | 'schema_error'

export interface DeprecationFallbackCardProps {
  /** The chart id from ChartNodeOutput.id, displayed so the author can find it. */
  chartId: string
  /** UI language. */
  language: LanguageCode
  /** Optional reason; defaults to 'unrecognized_library'. */
  reason?: DeprecationReason
}

// ── Reason → Message Key ────────────────────────────────────────────────────

const reasonToMessageKey: Record<DeprecationReason, MessageKey> = {
  unrecognized_library: 'deprecation_unrecognized_library',
  missing_option: 'deprecation_missing_option',
  render_error: 'deprecation_render_error',
  schema_error: 'deprecation_schema_error',
}

// ── Component ───────────────────────────────────────────────────────────────

export function DeprecationFallbackCard(props: DeprecationFallbackCardProps) {
  const { chartId, language, reason = 'unrecognized_library' } = props
  const title = getMessage(language, 'deprecation_title')
  const message = getMessage(language, reasonToMessageKey[reason])
  const idLabel = getMessage(language, 'deprecation_chart_id_label')

  return (
    <div
      role="alert"
      className="w-full h-full min-h-[160px] rounded-xl border border-dashed border-[#FF9F0A]/50 bg-[#FF9F0A]/[0.06] p-4 flex flex-col justify-center"
    >
      <div className="flex items-center gap-2 mb-2">
        <svg className="w-4 h-4 text-[#FF9F0A]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
        </svg>
        <span className="text-[12px] font-semibold text-[#FF9F0A]">{title}</span>
      </div>
      <p className="text-[12px] leading-relaxed text-[var(--color-text-secondary)] mb-2">
        {message}
      </p>
      <p className="text-[10px] font-mono text-[var(--color-text-muted)]">
        {idLabel}: {chartId}
      </p>
    </div>
  )
}

export default DeprecationFallbackCard
