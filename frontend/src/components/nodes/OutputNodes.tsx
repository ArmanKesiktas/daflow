import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { ConnectedBaseNode } from './ConnectedBaseNode'
import type { NodeData } from '../../types/workflow'
import { useExecutionStore } from '../../store/executionStore'
import { NodePreview } from './NodePreview'

export const ReportNode = memo(function ReportNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const title = (data.config as { title?: string }).title || 'Report'
  return (
    <NodePreview nodeId={id} data={data}>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <Handle type="target" position={Position.Left} id="statistics" style={{ top: '60%' }} />
      <ConnectedBaseNode nodeId={id} label={title} icon="⊡" status={data.status} color="" category={data.category} selected={selected} disabled={Boolean(data.disabled)}>
        <span>Generates structured PDF report</span>
        {data.status === 'success' && (
          <span className="text-[#30D158]">Report ready</span>
        )}
      </ConnectedBaseNode>
      <Handle type="source" position={Position.Right} id="report_data" />
    </NodePreview>
  )
})

export const AIInsightsNode = memo(function AIInsightsNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const provider = (data.config as { provider?: string }).provider || 'gemini'
  return (
    <NodePreview nodeId={id} data={data}>
      <Handle type="target" position={Position.Left} id="report_data" />
      <Handle type="target" position={Position.Left} id="dataframe" style={{ top: '70%' }} />
      <ConnectedBaseNode
        nodeId={id}
        label="AI Insights"
        icon="◈"
        status={data.status}
        color=""
        category={data.category}
        selected={selected}
        disabled={Boolean(data.disabled)}
      >
        <span className="capitalize">Provider: {provider}</span>
        {data.status === 'success' && (
          <span className="text-[#30D158]">Insights generated</span>
        )}
      </ConnectedBaseNode>
      <Handle type="source" position={Position.Right} id="insights" />
    </NodePreview>
  )
})

export const DashboardNode = memo(function DashboardNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const title = (data.config as { title?: string }).title || 'Dashboard'
  const executionId = useExecutionStore((s) => s.executionId)
  const navigate = useNavigate()
  return (
    <NodePreview nodeId={id} data={data}>
      <Handle type="target" position={Position.Left} id="dataframe" style={{ top: '18%' }} />
      <Handle type="target" position={Position.Left} id="statistics"      style={{ top: '34%' }} />
      <Handle type="target" position={Position.Left} id="anomaly_summary"  style={{ top: '50%' }} />
      <Handle type="target" position={Position.Left} id="correlation_matrix" style={{ top: '66%' }} />
      <Handle type="target" position={Position.Left} id="distributions"   style={{ top: '82%' }} />
      <ConnectedBaseNode nodeId={id} label={title} icon="⊞" status={data.status} color="" category={data.category} selected={selected} disabled={Boolean(data.disabled)}>
        <span>Modular analysis dashboard</span>
        {data.status === 'success' && (
          <>
            <span className="text-[#30D158]">Dashboard ready</span>
            {executionId && (
              <button
                onClick={(e) => {
                  e.stopPropagation()
                  navigate(`/dashboard/${executionId}`)
                }}
                className="mt-1 px-2 py-0.5 text-[10px] font-medium bg-[var(--color-primary)] text-white rounded-md hover:bg-[var(--color-primary-hover)] transition-colors"
              >
                Open Dashboard ↗
              </button>
            )}
          </>
        )}
      </ConnectedBaseNode>
    </NodePreview>
  )
})
