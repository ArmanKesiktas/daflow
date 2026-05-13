import { useCallback, useRef, useState, type ReactNode } from 'react'
import { createPortal } from 'react-dom'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'
import type { NodeData } from '../../types/workflow'
import { AnomalyChart, CorrelationHeatmap, DistributionChart, StatisticsChart } from '../charts'

type PreviewOutput = Record<string, unknown>

interface NodePreviewProps {
  nodeId: string
  data: NodeData
  children: ReactNode
  fallback?: PreviewOutput
}

export function NodePreview({ nodeId, data, children, fallback }: NodePreviewProps) {
  const executionId = useExecutionStore((s) => s.executionId)
  const [output, setOutput] = useState<PreviewOutput | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [position, setPosition] = useState<{ top: number; left: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const ref = useRef<HTMLDivElement>(null)

  const open = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    if (ref.current) {
      const rect = ref.current.getBoundingClientRect()
      setPosition({ top: rect.top + rect.height / 2, left: rect.right + 12 })
    }
    setLoading(true)
    setError(null)
    setOutput(null)

    timerRef.current = setTimeout(async () => {
      if (executionId && (data.status === 'success' || data.status === 'error')) {
        try {
          const result = await executionsApi.getNodeResult(executionId, nodeId)
          const resultOutput = result.output as PreviewOutput | undefined
          const nextOutput = meaningfulOutput(resultOutput)
            ? resultOutput
            : fallback ?? previewFromNodeData(data) ?? previewFromResult(result)
          if (!nextOutput) {
            if (result.error_message) {
              setError(result.error_message)
            } else {
              setOutput(statusPreview(data, Boolean(executionId)))
            }
          } else {
            setOutput(nextOutput)
          }
          setLoading(false)
          return
        } catch (exc) {
          if (fallback) {
            setOutput(fallback)
          } else {
            setError(exc instanceof Error ? exc.message : 'Preview could not be loaded.')
          }
          setLoading(false)
          return
        }
      }
      if (executionId) {
        const nextOutput = fallback ?? previewFromNodeData(data) ?? statusPreview(data, true)
        if (nextOutput) {
          setOutput(nextOutput)
          setLoading(false)
          return
        }
        setOutput(statusPreview(data, true))
        setLoading(false)
        return
      }
      const nextOutput = fallback ?? previewFromNodeData(data) ?? statusPreview(data, false)
      if (nextOutput) {
        setOutput(nextOutput)
      } else {
        setOutput(statusPreview(data, false))
      }
      setLoading(false)
    }, 220)
  }, [data, executionId, fallback, nodeId])

  const close = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = null
    setOutput(null)
    setLoading(false)
    setError(null)
    setPosition(null)
  }, [])

  return (
    <div ref={ref} onMouseEnter={open} onMouseLeave={close}>
      {children}
      {position && (loading || error || output) && createPortal(
        <div
          style={{ position: 'fixed', top: position.top, left: position.left, zIndex: 9999 }}
          className="w-[420px] max-w-[calc(100vw-32px)] -translate-y-1/2 pointer-events-none rounded-2xl bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-4"
        >
          <div className="flex items-center justify-between gap-3 mb-3">
            <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white truncate">{data.label}</h4>
            <span className="text-[9px] px-1.5 py-0.5 rounded bg-black/[0.05] dark:bg-white/[0.07] text-[#1d1d1f]/35 dark:text-white/35">
              preview
            </span>
          </div>
          {loading && (
            <div className="h-24 flex flex-col items-center justify-center gap-2 text-[#1d1d1f]/40 dark:text-white/40">
              <span className="w-6 h-6 rounded-full border-2 border-[#0071E3]/20 border-t-[#0071E3] animate-spin" />
              <span className="text-[11px]">Loading preview…</span>
            </div>
          )}
          {!loading && error && (
            <div className="rounded-lg border border-[#FF453A]/20 bg-[#FF453A]/10 px-3 py-2 text-[11px] text-[#FF453A]">
              {error}
            </div>
          )}
          {!loading && !error && output && (
            <div className="space-y-3">
              <PreviewChart output={output} nodeType={data.config?.chart_type ? String(data.config.chart_type) : undefined} />
              <PreviewBody output={output} />
            </div>
          )}
        </div>,
        document.body,
      )}
    </div>
  )
}

function PreviewChart({ output }: { output: PreviewOutput; nodeType?: string }) {
  const chartData = output.chart_data as Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }> | undefined
  const matrix = output.correlation_matrix as Record<string, Record<string, number>> | undefined
  const distributions = output.distributions as Record<string, DistributionPreviewData> | undefined
  const statistics = output.statistics as Record<string, Record<string, number>> | undefined

  if (chartData) {
    return (
      <div className="max-h-56 overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-2">
        <AnomalyChart chartData={chartData} method={output.method as string} />
      </div>
    )
  }
  if (matrix) {
    return (
      <div className="max-h-56 overflow-auto rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-2">
        <CorrelationHeatmap
          matrix={matrix}
          strongPairs={output.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[]}
          method={output.method as string}
        />
      </div>
    )
  }
  if (distributions) {
    return (
      <div className="max-h-56 overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-2">
        <DistributionChart distributions={distributions} />
      </div>
    )
  }
  if (statistics) {
    return (
      <div className="max-h-56 overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.06] p-2">
        <StatisticsChart statistics={statistics} />
      </div>
    )
  }
  return null
}

function PreviewBody({ output }: { output: PreviewOutput }) {
  const rows = summarize(output)
  const sample = dataframeSample(output)
  const columns = previewColumns(output, sample)
  const message = typeof output.message === 'string' ? output.message : ''

  return (
    <div className="space-y-3">
      {message && (
        <div className="rounded-lg bg-[#0071E3]/10 border border-[#0071E3]/15 px-3 py-2 text-[11px] text-[#0071E3]">
          {message}
        </div>
      )}
      {rows.length > 0 && (
        <div className="grid grid-cols-2 gap-2">
          {rows.slice(0, 6).map((row) => (
            <div key={row.label} className="rounded-lg bg-black/[0.035] dark:bg-white/[0.04] px-2.5 py-2 border border-black/[0.05] dark:border-white/[0.05]">
              <p className="text-[9px] uppercase tracking-widest text-[#1d1d1f]/25 dark:text-white/25 truncate">{row.label}</p>
              <p className="text-[11px] text-[#1d1d1f]/75 dark:text-white/75 truncate mt-0.5">{row.value}</p>
            </div>
          ))}
        </div>
      )}
      {columns.length > 0 ? (
        <div className="overflow-hidden rounded-lg border border-black/[0.06] dark:border-white/[0.06]">
          <table className="w-full text-[10px]">
            <thead className="bg-black/[0.04] dark:bg-white/[0.05]">
              <tr>
                {columns.slice(0, 4).map((key) => (
                  <th key={key} className="px-2 py-1 text-left font-medium text-[#1d1d1f]/45 dark:text-white/45 truncate">{key}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {sample.length > 0 ? (
                sample.slice(0, 3).map((row, index) => (
                  <tr key={index} className="border-t border-black/[0.04] dark:border-white/[0.04]">
                    {columns.slice(0, 4).map((key) => (
                      <td key={key} className="px-2 py-1 text-[#1d1d1f]/60 dark:text-white/60 truncate max-w-[70px]">{String(row[key] ?? '')}</td>
                    ))}
                  </tr>
                ))
              ) : (
                <tr className="border-t border-black/[0.04] dark:border-white/[0.04]">
                  <td className="px-2 py-3 text-[#1d1d1f]/35 dark:text-white/35 text-center" colSpan={Math.min(columns.length, 4)}>
                    Table rows will appear after the next upload or run.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      ) : (
        meaningfulOutput(output) ? (
          <pre className="max-h-40 overflow-hidden text-[10px] leading-relaxed text-[#1d1d1f]/45 dark:text-white/45 bg-black/[0.035] dark:bg-white/[0.04] rounded-lg p-2">
            {JSON.stringify(output, null, 2).slice(0, 900)}
          </pre>
        ) : null
      )}
    </div>
  )
}

interface DistributionPreviewData {
  histogram: { counts: number[]; bin_centers: number[]; bin_edges: number[] }
  kde: { x: number[]; y: number[] }
  skewness: number
  kurtosis: number
  skewness_label: string
}

function previewFromNodeData(data: NodeData): PreviewOutput | null {
  const preview = data.resultPreview as PreviewOutput | undefined
  if (!preview && !data.filename) return null
  return {
    filename: data.filename,
    columns: data.columns,
    resultPreview: preview,
    ...preview,
  }
}

function previewFromResult(result: { status?: string; metrics?: unknown; error_message?: string | null }): PreviewOutput | null {
  if (result.error_message) return { message: result.error_message }
  const metrics = result.metrics as Record<string, unknown> | undefined
  if (metrics && Object.keys(metrics).length > 0) {
    return {
      message: result.status === 'success'
        ? 'Output is still being saved. Metrics are available now.'
        : 'Output is being prepared.',
      metrics,
      ...metrics,
    }
  }
  if (result.status && result.status !== 'success') {
    return { message: `Node is ${result.status}. Output will appear after it finishes.` }
  }
  return { message: 'Output is being saved. Try again in a moment.' }
}

function statusPreview(data: NodeData, hasExecution: boolean): PreviewOutput {
  if (data.status === 'pending') return { message: 'Waiting for upstream nodes. Preview will update when this node starts.' }
  if (data.status === 'running') return { message: 'This node is running. Output preview is being prepared.' }
  if (data.status === 'success') return { message: 'Output is being saved. Try again in a moment.' }
  if (data.status === 'error') {
    return { message: String(data.error_message || 'This node failed. Check the node output panel for details.') }
  }
  if (data.status === 'cancelled') return { message: 'This node was cancelled before it produced output.' }
  return {
    message: hasExecution
      ? 'This node has not produced output in the current run yet.'
      : 'Run the workflow to preview this node output.',
  }
}

function meaningfulOutput(output?: PreviewOutput | null) {
  if (!output || typeof output !== 'object') return false
  return Object.keys(output).length > 0
}

function dataframeSample(output: PreviewOutput): Record<string, unknown>[] {
  const df = output.dataframe as { sample?: Record<string, unknown>[] } | undefined
  if (Array.isArray(df?.sample)) return df.sample
  const preview = output.preview
  if (Array.isArray(preview)) return preview as Record<string, unknown>[]
  const resultPreview = output.resultPreview as { preview?: Record<string, unknown>[] } | undefined
  if (Array.isArray(resultPreview?.preview)) return resultPreview.preview
  return []
}

function previewColumns(output: PreviewOutput, sample: Record<string, unknown>[]): string[] {
  if (sample.length > 0) return Object.keys(sample[0])
  const df = output.dataframe as { columns?: unknown[] } | undefined
  const candidates = Array.isArray(output.columns) ? output.columns : df?.columns
  if (!Array.isArray(candidates)) return []
  return candidates
    .map((column) => {
      if (typeof column === 'string') return column
      if (column && typeof column === 'object' && 'name' in column) return String((column as { name: unknown }).name)
      return ''
    })
    .filter(Boolean)
}

function summarize(output: PreviewOutput) {
  const rows: { label: string; value: string | number }[] = []
  const df = output.dataframe as { rows?: number; columns?: string[] } | undefined
  if (output.filename) rows.push({ label: 'file', value: String(output.filename) })
  if (df?.rows != null) rows.push({ label: 'rows', value: df.rows })
  if (Array.isArray(df?.columns)) rows.push({ label: 'columns', value: df.columns.length })
  if (output.row_count != null) rows.push({ label: 'rows', value: String(output.row_count) })
  if (output.column_count != null) rows.push({ label: 'columns', value: String(output.column_count) })
  if (output.anomaly_count != null) rows.push({ label: 'anomalies', value: String(output.anomaly_count) })
  if (output.duplicate_count != null) rows.push({ label: 'duplicates', value: String(output.duplicate_count) })
  if (output.big_data_summary && typeof output.big_data_summary === 'object') {
    const summary = output.big_data_summary as Record<string, unknown>
    if (summary.operation) rows.push({ label: 'operation', value: String(summary.operation) })
    if (summary.chunk_count != null) rows.push({ label: 'chunks', value: String(summary.chunk_count) })
    if (summary.output_rows != null) rows.push({ label: 'output rows', value: String(summary.output_rows) })
  }
  if (output.route_summary && typeof output.route_summary === 'object') {
    const summary = output.route_summary as Record<string, unknown>
    if (summary.input_count != null) rows.push({ label: 'inputs', value: String(summary.input_count) })
    if (summary.chart_panel_count != null) rows.push({ label: 'chart panels', value: String(summary.chart_panel_count) })
    if (summary.has_dataframe != null) rows.push({ label: 'dataframe', value: summary.has_dataframe ? 'yes' : 'no' })
  }
  if (Array.isArray(output.strong_pairs)) rows.push({ label: 'strong pairs', value: output.strong_pairs.length })
  if (output.ml_metrics && typeof output.ml_metrics === 'object') {
    const metrics = output.ml_metrics as Record<string, unknown>
    if (metrics.accuracy != null) rows.push({ label: 'accuracy', value: `${(Number(metrics.accuracy) * 100).toFixed(1)}%` })
    if (metrics.r2 != null) rows.push({ label: 'r2', value: String(metrics.r2) })
  }
  return rows
}
