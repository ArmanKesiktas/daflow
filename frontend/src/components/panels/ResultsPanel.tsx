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
  const hasChart = nodeType && ['anomaly_detection', 'correlation', 'distribution', 'statistics'].includes(nodeType)

  const renderChart = () => {
    if (!output || !nodeType) return null

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

    return null
  }

  return (
    <div className={`${hasChart && showChart && result ? 'h-[420px]' : 'h-44'} bg-page-bg border-t border-[var(--color-border-default)] overflow-y-auto flex-shrink-0 transition-all`}>
      <div className="flex items-center gap-3 px-4 h-9 border-b border-[var(--color-border-subtle)]">
        <h3 className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest">{t('nodeOutput')}</h3>
        {selectedNodeId ? (
          <button
            onClick={fetchResult}
            className="text-[11px] bg-[var(--color-secondary)] hover:bg-[var(--color-border-default)] px-2.5 py-0.5 rounded-md text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-all"
          >
            {loading ? t('loadingResult') : t('loadResult')}
          </button>
        ) : (
          <span className="text-[11px] text-[var(--color-text-muted)]">{t('selectNodeToInspect')}</span>
        )}

        {/* Chart toggle */}
        {hasChart && result && (
          <button
            onClick={() => setShowChart((v) => !v)}
            className={`ml-auto text-[10px] px-2 py-0.5 rounded font-medium transition-colors ${
              showChart
                ? 'bg-[var(--color-primary)] text-white'
                : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'
            }`}
          >
            {showChart ? '📊 Chart' : '📊 Chart'}
          </button>
        )}
      </div>

      <div className="px-4 py-2">
        {error && <p className="text-danger text-[11px]">{error}</p>}
        {result && (
          <div className="text-[11px] text-[var(--color-text-secondary)] space-y-2">
            {/* Status bar */}
            <div className="flex flex-wrap gap-x-4 gap-y-0.5">
              <span><span className="text-[var(--color-text-muted)]">Node:</span> {result.node_id}</span>
              <span><span className="text-[var(--color-text-muted)]">Type:</span> {result.node_type}</span>
              <span className={result.status === 'success' ? 'text-success' : 'text-danger'}>
                {result.status}
              </span>
            </div>

            {/* Metrics */}
            {result.metrics && (
              <div className="text-[var(--color-text-muted)]">
                {Object.entries(result.metrics).map(([k, v]) => (
                  <span key={k} className="mr-3">{k}: <span className="text-[var(--color-text-secondary)]">{String(v)}</span></span>
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
                <pre className="text-[10px] text-[var(--color-text-muted)] bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-2 rounded-lg overflow-x-auto max-h-20">
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
