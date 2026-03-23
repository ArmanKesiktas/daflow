import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'

// ── Shared popup shell ────────────────────────────────────────────────────────

interface PopupPos { top: number; left: number }

function NodePopup({
  title, pos, wide, children,
}: {
  title: string; pos: PopupPos; wide?: boolean; children: React.ReactNode
}) {
  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className={`${wide ? 'w-96' : 'w-80'} bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-4 pointer-events-none -translate-y-1/2`}
    >
      <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white mb-3">{title}</h4>
      <div className="max-h-60 overflow-hidden">
        {children}
      </div>
    </div>,
    document.body,
  )
}

// ── Small helper components ───────────────────────────────────────────────────

function KVRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
      <span className="text-[11px] text-[#1d1d1f]/50 dark:text-white/50 truncate flex-1">{label}</span>
      <span className={`text-[11px] font-semibold ml-2 ${accent ?? 'text-[#1d1d1f]/80 dark:text-white/80'}`}>{String(value)}</span>
    </div>
  )
}

function MiniBar({ pct }: { pct: number }) {
  return (
    <div className="w-16 h-1.5 bg-black/[0.06] dark:bg-white/[0.07] rounded-full overflow-hidden">
      <div className="h-full bg-[#0071E3] rounded-full" style={{ width: `${Math.min(pct, 100)}%` }} />
    </div>
  )
}

// ── Popup renderers ───────────────────────────────────────────────────────────

type RawOutput = Record<string, unknown>

function renderStatistics(output: RawOutput, pos: PopupPos) {
  const stats = output.statistics as Record<string, Record<string, number>> | undefined
  if (!stats) return null
  const cols = Object.keys(stats).slice(0, 6)
  return (
    <NodePopup title="Descriptive Statistics" pos={pos} wide>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {['Column', 'Mean', 'Std', 'Min', 'Max'].map((h) => (
              <th key={h} className={`pb-1.5 font-medium text-[#1d1d1f]/40 dark:text-white/40 ${h === 'Column' ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => {
            const s = stats[col]
            const fmt = (v?: number) => v != null ? v.toFixed(2) : '—'
            return (
              <tr key={col} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                <td className="py-0.5 text-[#1d1d1f]/80 dark:text-white/80 truncate max-w-[90px]">{col}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{fmt(s?.mean)}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{fmt(s?.std)}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{fmt(s?.min)}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{fmt(s?.max)}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
      {Object.keys(stats).length > 6 && (
        <p className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30 mt-2">+{Object.keys(stats).length - 6} more columns</p>
      )}
    </NodePopup>
  )
}

function renderAnomalySummary(output: RawOutput, pos: PopupPos) {
  const s = output.anomaly_summary as Record<string, unknown> | undefined
  if (!s) return null
  const rate = typeof s.anomaly_rate === 'number' ? (s.anomaly_rate * 100).toFixed(2) + '%' : '—'
  const accent = typeof s.anomaly_count === 'number' && s.anomaly_count > 0 ? 'text-[#FF453A]' : 'text-[#30D158]'
  return (
    <NodePopup title="Anomaly Detection" pos={pos}>
      <KVRow label="Method" value={String(s.method ?? '—')} />
      <KVRow label="Total Rows" value={String(s.total_rows ?? '—')} />
      <KVRow label="Anomalies Found" value={String(s.anomaly_count ?? '—')} accent={accent} />
      <KVRow label="Anomaly Rate" value={rate} accent={accent} />
      <KVRow label="Clean Rows" value={String(s.clean_count ?? '—')} accent="text-[#30D158]" />
    </NodePopup>
  )
}

function renderCorrelation(output: RawOutput, pos: PopupPos) {
  const pairs = output.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[] | undefined
  const method = output.method as string | undefined
  if (!pairs) return null
  return (
    <NodePopup title={`Correlation${method ? ` (${method})` : ''}`} pos={pos} wide>
      {pairs.length === 0 ? (
        <p className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40">No strong pairs found</p>
      ) : (
        <div className="space-y-0.5">
          {pairs.slice(0, 8).map((p, i) => (
            <div key={i} className="flex items-center justify-between py-0.5 border-b border-black/[0.03] dark:border-white/[0.03]">
              <span className="text-[11px] text-[#1d1d1f]/70 dark:text-white/70 truncate flex-1">
                {p.col_a} · {p.col_b}
              </span>
              <span className={`text-[11px] font-semibold ml-2 ${p.direction === 'positive' ? 'text-[#30D158]' : 'text-[#FF453A]'}`}>
                {p.correlation.toFixed(3)}
              </span>
            </div>
          ))}
          {pairs.length > 8 && (
            <p className="text-[10px] text-[#1d1d1f]/30 dark:text-white/30 pt-1">+{pairs.length - 8} more pairs</p>
          )}
        </div>
      )}
    </NodePopup>
  )
}

function renderDistributions(output: RawOutput, pos: PopupPos) {
  const dists = output.distributions as Record<string, { skewness: number; kurtosis: number; skewness_label: string }> | undefined
  if (!dists) return null
  const cols = Object.keys(dists).slice(0, 7)
  return (
    <NodePopup title="Distributions" pos={pos} wide>
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {['Column', 'Skewness', 'Kurtosis', 'Shape'].map((h) => (
              <th key={h} className={`pb-1.5 font-medium text-[#1d1d1f]/40 dark:text-white/40 ${h === 'Column' ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => {
            const d = dists[col]
            return (
              <tr key={col} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                <td className="py-0.5 text-[#1d1d1f]/80 dark:text-white/80 truncate max-w-[100px]">{col}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{d?.skewness?.toFixed(2) ?? '—'}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/60 dark:text-white/60">{d?.kurtosis?.toFixed(2) ?? '—'}</td>
                <td className="py-0.5 text-right text-[#1d1d1f]/40 dark:text-white/40 capitalize">{d?.skewness_label ?? '—'}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </NodePopup>
  )
}

function renderMissingSummary(output: RawOutput, pos: PopupPos) {
  const summary = output.missing_summary as Record<string, { missing_count: number; missing_pct: number }> | undefined
  if (!summary) return null
  const cols = Object.entries(summary).slice(0, 8)
  const totalBefore = output.total_missing_before as number | undefined
  const totalAfter = output.total_missing_after as number | undefined
  const strategy = output.strategy as string | undefined
  return (
    <NodePopup title="Missing Values" pos={pos} wide>
      {strategy && <KVRow label="Strategy" value={strategy.replace('_', ' ')} />}
      {totalBefore != null && <KVRow label="Total Missing Before" value={totalBefore} />}
      {totalAfter != null && <KVRow label="Total Missing After" value={totalAfter} accent={totalAfter === 0 ? 'text-[#30D158]' : undefined} />}
      <div className="mt-2 space-y-1">
        {cols.map(([col, info]) => (
          <div key={col} className="flex items-center gap-2">
            <span className="text-[10px] text-[#1d1d1f]/60 dark:text-white/60 truncate flex-1">{col}</span>
            <MiniBar pct={info.missing_pct} />
            <span className="text-[10px] text-[#1d1d1f]/50 dark:text-white/50 w-10 text-right">{info.missing_pct.toFixed(1)}%</span>
          </div>
        ))}
      </div>
    </NodePopup>
  )
}

function renderDuplicateSummary(output: RawOutput, pos: PopupPos) {
  const s = output.duplicate_summary as Record<string, unknown> | undefined
  if (!s) return null
  const accent = typeof s.duplicate_count === 'number' && s.duplicate_count > 0 ? 'text-[#F5A623]' : 'text-[#30D158]'
  return (
    <NodePopup title="Duplicate Detection" pos={pos}>
      <KVRow label="Total Rows" value={String(s.total_rows ?? '—')} />
      <KVRow label="Duplicate Rows" value={String(s.duplicate_count ?? '—')} accent={accent} />
      <KVRow label="Duplicate Rate" value={`${s.duplicate_pct ?? 0}%`} accent={accent} />
      <KVRow label="Unique Rows" value={String(s.unique_rows ?? '—')} accent="text-[#30D158]" />
      <KVRow label="Keep Strategy" value={String(s.keep_strategy ?? '—')} />
    </NodePopup>
  )
}

function renderColumnTypes(output: RawOutput, pos: PopupPos) {
  const types = output.column_types as Record<string, { semantic_type: string; pandas_dtype: string; unique_count: number; missing_count: number }> | undefined
  const summary = output.type_summary as Record<string, number> | undefined
  if (!types) return null
  const cols = Object.entries(types).slice(0, 8)
  const typeColor: Record<string, string> = {
    numeric: 'text-[#0071E3]', categorical: 'text-[#F5A623]',
    text: 'text-[#5E5CE6]', datetime: 'text-[#30D158]', boolean: 'text-[#FF453A]',
  }
  return (
    <NodePopup title="Column Types" pos={pos} wide>
      {summary && (
        <div className="flex gap-2 flex-wrap mb-3">
          {Object.entries(summary).filter(([, v]) => v > 0).map(([type, count]) => (
            <span key={type} className={`text-[10px] font-medium px-1.5 py-0.5 rounded-md bg-black/[0.05] dark:bg-white/[0.07] ${typeColor[type] ?? ''}`}>
              {type}: {count}
            </span>
          ))}
        </div>
      )}
      <table className="w-full text-[10px]">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {['Column', 'Type', 'Unique'].map((h) => (
              <th key={h} className={`pb-1.5 font-medium text-[#1d1d1f]/40 dark:text-white/40 ${h === 'Column' ? 'text-left' : 'text-right'}`}>{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map(([col, info]) => (
            <tr key={col} className="border-b border-black/[0.03] dark:border-white/[0.03]">
              <td className="py-0.5 text-[#1d1d1f]/80 dark:text-white/80 truncate max-w-[120px]">{col}</td>
              <td className={`py-0.5 text-right font-medium ${typeColor[info.semantic_type] ?? ''}`}>{info.semantic_type}</td>
              <td className="py-0.5 text-right text-[#1d1d1f]/50 dark:text-white/50">{info.unique_count}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </NodePopup>
  )
}

function renderFilterSummary(output: RawOutput, pos: PopupPos) {
  const s = output.filter_summary as Record<string, unknown> | undefined
  if (!s) return null
  const removed = typeof s.rows_removed === 'number' ? s.rows_removed : 0
  const before = typeof s.rows_before === 'number' ? s.rows_before : 1
  const pct = before > 0 ? ((removed / before) * 100).toFixed(1) : '0.0'
  return (
    <NodePopup title="Filter Rows" pos={pos}>
      <KVRow label="Column" value={String(s.column ?? '—')} />
      <KVRow label="Condition" value={`${s.operator} ${s.value ?? ''}`} />
      <KVRow label="Rows Before" value={String(s.rows_before ?? '—')} />
      <KVRow label="Rows After" value={String(s.rows_after ?? '—')} accent="text-[#30D158]" />
      <KVRow label="Rows Removed" value={`${removed} (${pct}%)`} accent={removed > 0 ? 'text-[#F5A623]' : undefined} />
    </NodePopup>
  )
}

function renderTimeSeries(output: RawOutput, pos: PopupPos) {
  const ts = output.time_series_data as Record<string, unknown> | undefined
  if (!ts) return null
  const direction = String(ts.trend_direction ?? '—')
  const arrow = direction === 'up' ? '↑' : direction === 'down' ? '↓' : '→'
  const accent = direction === 'up' ? 'text-[#30D158]' : direction === 'down' ? 'text-[#FF453A]' : 'text-[#F5A623]'
  return (
    <NodePopup title="Time Series" pos={pos}>
      <KVRow label="Date Column" value={String(ts.date_column ?? '—')} />
      <KVRow label="Value Column" value={String(ts.value_column ?? '—')} />
      <KVRow label="Trend" value={`${arrow} ${direction}`} accent={accent} />
      <KVRow label="Slope" value={String(ts.trend_slope ?? '—')} />
      <KVRow label="Window" value={String(ts.window ?? '—')} />
      {Array.isArray(ts.forecast) && ts.forecast.length > 0 && (
        <KVRow label="Forecast periods" value={ts.forecast.length} />
      )}
    </NodePopup>
  )
}

// ── Node factory ──────────────────────────────────────────────────────────────

type PopupRender = (output: RawOutput, pos: PopupPos) => React.ReactNode

/** Reusable analysis node — single dataframe input + single dataframe output */
function AnalysisNodeFactory(
  icon: string,
  color: string,
  renderPopup?: PopupRender,
) {
  return memo(function AnalysisNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const executionId = useExecutionStore((s) => s.executionId)
    const method = (data.config as { method?: string }).method

    const [nodeOutput, setNodeOutput] = useState<RawOutput | null>(null)
    const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const nodeRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = useCallback(async () => {
      if (!executionId || data.status !== 'success' || !renderPopup) return
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect()
        setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
      }
      timerRef.current = setTimeout(async () => {
        try {
          const result = await executionsApi.getNodeResult(executionId, id)
          if (result.output) setNodeOutput(result.output as RawOutput)
        } catch { /* silent */ }
      }, 300)
    }, [executionId, data.status, id])

    const handleMouseLeave = useCallback(() => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setNodeOutput(null)
      setPopupPos(null)
    }, [])

    return (
      <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <Handle type="target" position={Position.Left} id="dataframe" />
        <BaseNode
          label={data.label}
          icon={icon}
          status={data.status}
          color={color}
          category={data.category}
          selected={selected}
          note={data.note ? String(data.note) : undefined}
        >
          {method && <span className="text-[#1d1d1f]/40 dark:text-white/40 capitalize">{method}</span>}
          {data.resultPreview && (
            <span className="text-[#1d1d1f]/25 dark:text-white/25 text-[10px]">
              {JSON.stringify(data.resultPreview).slice(0, 60)}…
            </span>
          )}
          {data.status === 'success' && renderPopup && (
            <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[10px]">Hover to preview</span>
          )}
        </BaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" />
        {nodeOutput && popupPos && renderPopup && renderPopup(nodeOutput, popupPos)}
      </div>
    )
  })
}

// ── Exports ───────────────────────────────────────────────────────────────────

export const ColumnTypeDetectionNode = AnalysisNodeFactory('T',  'bg-orange-500', renderColumnTypes)
export const MissingValueNode        = AnalysisNodeFactory('○',  'bg-orange-500', renderMissingSummary)
export const DuplicateDetectionNode  = AnalysisNodeFactory('⊟',  'bg-orange-500', renderDuplicateSummary)
export const FilterRowsNode          = AnalysisNodeFactory('⊃',  'bg-orange-500', renderFilterSummary)
export const StatisticsNode          = AnalysisNodeFactory('σ',  'bg-green-500',  renderStatistics)
export const AnomalyDetectionNode    = AnalysisNodeFactory('△',  'bg-green-500',  renderAnomalySummary)
export const CorrelationNode         = AnalysisNodeFactory('ρ',  'bg-green-500',  renderCorrelation)
export const DistributionNode        = AnalysisNodeFactory('∿',  'bg-green-500',  renderDistributions)
export const TimeSeriesNode          = AnalysisNodeFactory('~',  'bg-green-500',  renderTimeSeries)
