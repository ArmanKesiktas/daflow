import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'
import { AnomalyChart, CorrelationHeatmap, DistributionChart, StatisticsChart } from '../charts'
import '../charts/chartSetup'

// ── Chart popup renderer ──────────────────────────────────────────────────────

interface ChartPanelData {
  type: string
  title: string
  data?: Record<string, unknown>
  kpis?: { label: string; value: string | number }[]
}

interface PopupPos { top: number; left: number }

function ChartPopup({ panel, pos }: { panel: ChartPanelData; pos: PopupPos }) {
  const renderContent = () => {
    switch (panel.type) {
      case 'statistics_chart_panel': {
        const stats = panel.data?.statistics as Record<string, Record<string, number>> | undefined
        if (!stats) return <p className="text-[11px] opacity-40">No data</p>
        return <StatisticsChart statistics={stats} />
      }
      case 'anomaly_chart_panel': {
        const chartData = panel.data?.chart_data as Record<string, { indices: number[]; values: (number | null)[]; is_anomaly: boolean[] }> | undefined
        if (!chartData) return <p className="text-[11px] opacity-40">No data</p>
        return <AnomalyChart chartData={chartData} method={panel.data?.method as string} />
      }
      case 'correlation_chart_panel': {
        const matrix = panel.data?.correlation_matrix as Record<string, Record<string, number>> | undefined
        if (!matrix) return <p className="text-[11px] opacity-40">No data</p>
        return (
          <CorrelationHeatmap
            matrix={matrix}
            strongPairs={panel.data?.strong_pairs as { col_a: string; col_b: string; correlation: number; direction: string }[]}
          />
        )
      }
      case 'distribution_chart_panel': {
        const dists = panel.data?.distributions as Record<string, { histogram: { counts: number[]; bin_centers: number[]; bin_edges: number[] }; kde: { x: number[]; y: number[] }; skewness: number; kurtosis: number; skewness_label: string }> | undefined
        if (!dists) return <p className="text-[11px] opacity-40">No data</p>
        return <DistributionChart distributions={dists} />
      }
      default:
        return <pre className="text-[10px] opacity-40 max-h-32 overflow-auto">{JSON.stringify(panel.data, null, 2)}</pre>
    }
  }

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-96 bg-[#ffffff] dark:bg-[#1C1C1E] rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-4 pointer-events-none -translate-y-1/2"
    >
      <h4 className="text-[12px] font-semibold text-[var(--color-text-primary)] mb-3">{panel.title}</h4>
      <div className="max-h-64 overflow-hidden">
        {renderContent()}
      </div>
    </div>,
    document.body
  )
}

// ── Visualization node factory ────────────────────────────────────────────────

function VisualizationNodeFactory(icon: string) {
  return memo(function VisualizationNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const executionId = useExecutionStore((s) => s.executionId)
    const nodeStatus = data.status

    const [popup, setPopup] = useState<ChartPanelData | null>(null)
    const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
    const [loading, setLoading] = useState(false)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const nodeRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = useCallback(async () => {
      if (!executionId || nodeStatus !== 'success') return

      // Capture position immediately so popup appears in right place
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect()
        setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
      }

      timerRef.current = setTimeout(async () => {
        setLoading(true)
        try {
          const result = await executionsApi.getNodeResult(executionId, id)
          const panel = result.output?.chart_panel as ChartPanelData | undefined
          if (panel) setPopup(panel)
        } catch {
          // silently fail — no popup
        } finally {
          setLoading(false)
        }
      }, 300)
    }, [executionId, nodeStatus, id])

    const handleMouseLeave = useCallback(() => {
      if (timerRef.current) {
        clearTimeout(timerRef.current)
        timerRef.current = null
      }
      setPopup(null)
      setPopupPos(null)
      setLoading(false)
    }, [])

    return (
      <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <Handle type="target" position={Position.Left} id="dataframe" />
        <BaseNode
          label={data.label}
          icon={icon}
          status={data.status}
          color="bg-[#5E5CE6]"
          category="visualization"
          selected={selected}
          note={data.note ? String(data.note) : undefined}
          error_message={data.error_message}
          cached={data.cached}
        >
          {loading && (
            <span className="text-[#5E5CE6] text-[10px]">Loading…</span>
          )}
          {nodeStatus === 'success' && !loading && (
            <span className="text-[var(--color-text-muted)] text-[10px]">Hover to preview</span>
          )}
        </BaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" />
        {popup && popupPos && <ChartPopup panel={popup} pos={popupPos} />}
      </div>
    )
  })
}

export const StatisticsChartNode   = VisualizationNodeFactory('σ')
export const AnomalyChartNode      = VisualizationNodeFactory('△')
export const CorrelationChartNode  = VisualizationNodeFactory('ρ')
export const DistributionChartNode = VisualizationNodeFactory('∿')
