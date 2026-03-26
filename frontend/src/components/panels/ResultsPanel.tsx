import { useState, useEffect } from 'react'
import { executionsApi } from '../../api/executions'
import type { NodeResult } from '../../types/workflow'
import { useI18n } from '../../i18n'
import { useFlowStore } from '../../store/flowStore'
import { AnomalyChart, CorrelationHeatmap, DistributionChart, StatisticsChart } from '../charts'

interface ResultsPanelProps {
  executionId: string | null
  selectedNodeId: string | null
}

// ── Lineage View ──────────────────────────────────────────────────────────────

function LineageView({ result, nodeId, executionId }: { result: NodeResult; nodeId: string; executionId: string }) {
  const { t } = useI18n()
  const edges = useFlowStore((s) => s.edges)
  const [upstreamColumns, setUpstreamColumns] = useState<string[]>([])
  const [loadingLineage, setLoadingLineage] = useState(false)

  const output = result?.output as Record<string, unknown> | undefined

  // Extract output columns from result
  const dfOutput = output?.dataframe as { columns?: string[] } | undefined
  const metaCols = (output?.metadata as { columns?: { name: string }[] })?.columns
  const outputCols: string[] = dfOutput?.columns ?? metaCols?.map((c) => c.name) ?? []

  // Find upstream node IDs
  const upstreamEdges = edges.filter((e) => e.target === nodeId)
  const upstreamNodeIds = upstreamEdges.map((e) => e.source)

  useEffect(() => {
    if (!executionId || upstreamNodeIds.length === 0) {
      setUpstreamColumns([])
      return
    }

    let cancelled = false
    setLoadingLineage(true)

    Promise.all(
      upstreamNodeIds.map((uid) =>
        executionsApi.getNodeResult(executionId, uid).catch(() => null)
      )
    ).then((results) => {
      if (cancelled) return
      const cols = new Set<string>()
      for (const r of results) {
        if (!r?.output) continue
        const out = r.output as Record<string, unknown>
        const df = out.dataframe as { columns?: string[] } | undefined
        const meta = (out.metadata as { columns?: { name: string }[] })?.columns
        const c = df?.columns ?? meta?.map((m) => m.name) ?? []
        for (const col of c) cols.add(col)
      }
      setUpstreamColumns(Array.from(cols))
      setLoadingLineage(false)
    })

    return () => { cancelled = true }
  }, [executionId, nodeId, upstreamNodeIds.join(',')])

  if (upstreamNodeIds.length === 0 && outputCols.length === 0) {
    return (
      <div className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30 py-4 text-center">
        {t('noUpstreamNodes')}
      </div>
    )
  }

  if (loadingLineage) {
    return <div className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40 py-4 text-center">Loading lineage...</div>
  }

  const inputSet = new Set(upstreamColumns)
  const outputSet = new Set(outputCols)

  const added = outputCols.filter((c) => !inputSet.has(c))
  const removed = upstreamColumns.filter((c) => !outputSet.has(c))
  const kept = outputCols.filter((c) => inputSet.has(c))

  return (
    <div className="text-[11px] space-y-3">
      {/* Summary badges */}
      <div className="flex gap-3 flex-wrap">
        {added.length > 0 && (
          <span className="text-[10px] font-medium bg-[#30D158]/12 text-[#30D158] border border-[#30D158]/20 rounded px-2 py-0.5">
            +{added.length} {t('addedColumns')}
          </span>
        )}
        {removed.length > 0 && (
          <span className="text-[10px] font-medium bg-[#FF453A]/12 text-[#FF453A] border border-[#FF453A]/20 rounded px-2 py-0.5">
            -{removed.length} {t('removedColumns')}
          </span>
        )}
        {kept.length > 0 && (
          <span className="text-[10px] font-medium bg-black/[0.05] dark:bg-white/[0.07] text-[#1d1d1f]/50 dark:text-white/50 border border-black/[0.08] dark:border-white/[0.08] rounded px-2 py-0.5">
            {kept.length} {t('keptColumns')}
          </span>
        )}
      </div>

      {/* Column flow: Input → Output */}
      <div className="flex gap-4">
        {/* Input columns */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold text-[#1d1d1f]/25 dark:text-white/25 uppercase tracking-widest mb-1.5">{t('inputColumns')}</div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {upstreamColumns.length === 0 ? (
              <span className="text-[#1d1d1f]/20 dark:text-white/20">{t('noUpstreamNodes')}</span>
            ) : (
              upstreamColumns.map((col) => (
                <div
                  key={col}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    outputSet.has(col)
                      ? 'text-[#1d1d1f]/50 dark:text-white/50 bg-black/[0.03] dark:bg-white/[0.03]'
                      : 'text-[#FF453A] bg-[#FF453A]/8 line-through'
                  }`}
                >
                  {col}
                </div>
              ))
            )}
          </div>
        </div>

        {/* Arrow */}
        <div className="flex items-center text-[#1d1d1f]/15 dark:text-white/15 text-lg flex-shrink-0 pt-5">
          &rarr;
        </div>

        {/* Output columns */}
        <div className="flex-1 min-w-0">
          <div className="text-[9px] font-semibold text-[#1d1d1f]/25 dark:text-white/25 uppercase tracking-widest mb-1.5">{t('outputColumns')}</div>
          <div className="space-y-0.5 max-h-32 overflow-y-auto">
            {outputCols.length === 0 ? (
              <span className="text-[#1d1d1f]/20 dark:text-white/20">No columns</span>
            ) : (
              outputCols.map((col) => (
                <div
                  key={col}
                  className={`text-[10px] px-1.5 py-0.5 rounded ${
                    !inputSet.has(col)
                      ? 'text-[#30D158] bg-[#30D158]/8 font-medium'
                      : 'text-[#1d1d1f]/50 dark:text-white/50 bg-black/[0.03] dark:bg-white/[0.03]'
                  }`}
                >
                  {col}
                </div>
              ))
            )}
          </div>
        </div>
      </div>
    </div>
  )
}

// ── Results Panel ─────────────────────────────────────────────────────────────

export default function ResultsPanel({ executionId, selectedNodeId }: ResultsPanelProps) {
  const { t } = useI18n()
  const [result, setResult] = useState<NodeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(true)
  const [activeTab, setActiveTab] = useState<'output' | 'lineage'>('output')

  const fetchResult = async () => {
    if (!executionId || !selectedNodeId) return
    setLoading(true)
    setError(null)
    try {
      const data = await executionsApi.getNodeResult(executionId, selectedNodeId)
      setResult(data)
    } catch {
      setError(t('failedToLoadResults'))
    } finally {
      setLoading(false)
    }
  }

  if (!executionId) return null

  const nodeType = result?.node_type
  const output = result?.output as Record<string, unknown> | undefined

  // Determine if this node type has a chart
  const hasChart = nodeType && [
    'anomaly_detection', 'correlation', 'distribution', 'statistics',
    'statistics_chart', 'anomaly_chart', 'correlation_chart', 'distribution_chart',
  ].includes(nodeType)

  const renderChart = () => {
    if (!output || !nodeType) return null

    // Analysis nodes — use raw analysis output
    if (nodeType === 'anomaly_detection' && output.chart_data) {
      return (
        <AnomalyChart
          chartData={output.chart_data as Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }>}
          method={output.method as string}
        />
      )
    }
    if (nodeType === 'correlation' && output.correlation_matrix) {
      return (
        <CorrelationHeatmap
          matrix={output.correlation_matrix as Record<string, Record<string, number>>}
          strongPairs={output.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[]}
          method={output.method as string}
        />
      )
    }
    if (nodeType === 'distribution' && output.distributions) {
      return <DistributionChart distributions={output.distributions as Record<string, never>} />
    }
    if (nodeType === 'statistics' && output.statistics) {
      return <StatisticsChart statistics={output.statistics as Record<string, Record<string, number>>} />
    }

    // Visualization chart nodes — use chart_panel.data
    const panel = output.chart_panel as { type: string; data?: Record<string, unknown> } | undefined
    if (panel?.data) {
      if (nodeType === 'statistics_chart') {
        return <StatisticsChart statistics={panel.data.statistics as Record<string, Record<string, number>>} />
      }
      if (nodeType === 'anomaly_chart') {
        return (
          <AnomalyChart
            chartData={panel.data.chart_data as Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }>}
            method={panel.data.method as string}
          />
        )
      }
      if (nodeType === 'correlation_chart') {
        return (
          <CorrelationHeatmap
            matrix={panel.data.correlation_matrix as Record<string, Record<string, number>>}
            strongPairs={panel.data.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[]}
          />
        )
      }
      if (nodeType === 'distribution_chart') {
        return <DistributionChart distributions={panel.data.distributions as Record<string, never>} />
      }
    }

    return null
  }

  return (
    <div className={`${(hasChart && showChart && result) || (activeTab === 'lineage' && result) ? 'h-[420px]' : 'h-44'} bg-[#F5F5F7] dark:bg-[#111113] border-t border-black/[0.07] dark:border-white/[0.07] overflow-y-auto flex-shrink-0 transition-all`}>
      <div className="flex items-center gap-3 px-4 h-9 border-b border-black/[0.06] dark:border-white/[0.06]">
        <h3 className="text-[10px] font-semibold text-[#1d1d1f]/30 dark:text-white/30 uppercase tracking-widest">{t('nodeOutput')}</h3>
        {selectedNodeId ? (
          <button
            onClick={fetchResult}
            className="text-[11px] bg-black/[0.06] dark:bg-white/[0.07] hover:bg-black/[0.10] dark:hover:bg-white/[0.11] px-2.5 py-0.5 rounded-md text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white transition-all"
          >
            {loading ? t('loadingResult') : t('loadResult')}
          </button>
        ) : (
          <span className="text-[11px] text-[#1d1d1f]/20 dark:text-white/20">{t('selectNodeToInspect')}</span>
        )}

        {/* Tab switcher */}
        {result && (
          <div className="flex gap-0.5 bg-black/[0.05] dark:bg-white/[0.05] rounded-md p-0.5 ml-auto">
            <button
              onClick={() => setActiveTab('output')}
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === 'output'
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1d1d1f] dark:text-white shadow-sm'
                  : 'text-[#1d1d1f]/40 dark:text-white/40'
              }`}
            >
              {t('tabOutput')}
            </button>
            <button
              onClick={() => setActiveTab('lineage')}
              className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
                activeTab === 'lineage'
                  ? 'bg-white dark:bg-[#2C2C2E] text-[#1d1d1f] dark:text-white shadow-sm'
                  : 'text-[#1d1d1f]/40 dark:text-white/40'
              }`}
            >
              {t('tabLineage')}
            </button>
          </div>
        )}

        {/* Chart toggle */}
        {hasChart && result && activeTab === 'output' && (
          <button
            onClick={() => setShowChart((v) => !v)}
            className={`text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              showChart
                ? 'bg-[#0071E3] text-white'
                : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/50 dark:text-white/50'
            }`}
          >
            {showChart ? 'Chart' : 'Chart'}
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        {error && <p className="text-[#FF453A] text-[11px]">{error}</p>}
        {result && activeTab === 'output' && (
          <div className="text-[11px] text-[#1d1d1f]/55 dark:text-white/55 space-y-2">
            {/* Status bar */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span><span className="text-[#1d1d1f]/25 dark:text-white/25">Node:</span> {result.node_id}</span>
              <span><span className="text-[#1d1d1f]/25 dark:text-white/25">Type:</span> {result.node_type}</span>
              <span className={result.status === 'success' ? 'text-[#30D158]' : 'text-[#FF453A]'}>
                {result.status}
              </span>
            </div>

            {/* Error message */}
            {result.status === 'error' && result.error_message && (
              <div className="p-2.5 bg-[#FF453A]/8 border border-[#FF453A]/20 rounded-lg">
                <p className="text-[10px] font-semibold text-[#FF453A] mb-0.5">Hata</p>
                <p className="text-[10px] text-[#FF453A]/80 break-words font-mono">{String(result.error_message)}</p>
              </div>
            )}

            {/* Metrics */}
            {result.metrics && (
              <div className="text-[#1d1d1f]/30 dark:text-white/30">
                {Object.entries(result.metrics).map(([k, v]) => (
                  <span key={k} className="mr-3">{k}: <span className="text-[#1d1d1f]/60 dark:text-white/60">{String(v)}</span></span>
                ))}
              </div>
            )}

            {/* Chart or JSON */}
            {hasChart && showChart ? (
              <div className="pt-1">
                {renderChart()}
              </div>
            ) : (
              output && (
                <pre className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.06] dark:border-white/[0.06] p-2 rounded-lg overflow-x-auto max-h-20">
                  {JSON.stringify(output, null, 2).slice(0, 800)}
                </pre>
              )
            )}
          </div>
        )}

        {result && activeTab === 'lineage' && selectedNodeId && executionId && (
          <LineageView result={result} nodeId={selectedNodeId} executionId={executionId} />
        )}
      </div>
    </div>
  )
}
