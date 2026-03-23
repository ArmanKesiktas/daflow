import { useState } from 'react'
import { executionsApi } from '../../api/executions'
import type { NodeResult } from '../../types/workflow'
import { useI18n } from '../../i18n'
import { AnomalyChart, CorrelationHeatmap, DistributionChart, StatisticsChart } from '../charts'

interface ResultsPanelProps {
  executionId: string | null
  selectedNodeId: string | null
}

export default function ResultsPanel({ executionId, selectedNodeId }: ResultsPanelProps) {
  const { t } = useI18n()
  const [result, setResult] = useState<NodeResult | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [showChart, setShowChart] = useState(true)

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
    <div className={`${hasChart && showChart && result ? 'h-[420px]' : 'h-44'} bg-[#F5F5F7] dark:bg-[#111113] border-t border-black/[0.07] dark:border-white/[0.07] overflow-y-auto flex-shrink-0 transition-all`}>
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

        {/* Chart toggle */}
        {hasChart && result && (
          <button
            onClick={() => setShowChart((v) => !v)}
            className={`ml-auto text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              showChart
                ? 'bg-[#0071E3] text-white'
                : 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/50 dark:text-white/50'
            }`}
          >
            {showChart ? '📊 Chart' : '📊 Chart'}
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        {error && <p className="text-[#FF453A] text-[11px]">{error}</p>}
        {result && (
          <div className="text-[11px] text-[#1d1d1f]/55 dark:text-white/55 space-y-2">
            {/* Status bar */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span><span className="text-[#1d1d1f]/25 dark:text-white/25">Node:</span> {result.node_id}</span>
              <span><span className="text-[#1d1d1f]/25 dark:text-white/25">Type:</span> {result.node_type}</span>
              <span className={result.status === 'success' ? 'text-[#30D158]' : 'text-[#FF453A]'}>
                {result.status}
              </span>
            </div>

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
      </div>
    </div>
  )
}
