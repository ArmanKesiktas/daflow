import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { useNavigate } from 'react-router-dom'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { useExecutionStore } from '../../store/executionStore'

export const ReportNode = memo(function ReportNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const title = (data.config as { title?: string }).title || 'Report'
  return (
    <>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <BaseNode label={title} icon="⊡" status={data.status} color="" category={data.category} selected={selected} note={data.note ? String(data.note) : undefined} error_message={data.error_message} cached={data.cached}>
        <span>Generates structured PDF report</span>
        {data.status === 'success' && (
          <span className="text-[#30D158]">Report ready</span>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="report_data" />
    </>
  )
})

export const AIInsightsNode = memo(function AIInsightsNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const provider = (data.config as { provider?: string }).provider || 'gemini'
  return (
    <>
      <Handle type="target" position={Position.Left} id="report_data" />
      <BaseNode
        label="AI Insights"
        icon="◈"
        status={data.status}
        color=""
        category={data.category}
        selected={selected}
        error_message={data.error_message}
        cached={data.cached}
      >
        <span className="capitalize">Provider: {provider}</span>
        {data.status === 'success' && (
          <span className="text-[#30D158]">Insights generated</span>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="insights" />
    </>
  )
})

export const DataExportNode = memo(function DataExportNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const fmt = (data.config as { format?: string }).format || 'csv'
  return (
    <>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <BaseNode label={data.label} icon="↓" status={data.status} color="" category={data.category} selected={selected} note={data.note ? String(data.note) : undefined} error_message={data.error_message} cached={data.cached}>
        <span className="uppercase text-[10px] font-semibold">{fmt}</span>
        {data.status === 'success' && (
          <span className="text-[#30D158]">Export ready</span>
        )}
      </BaseNode>
    </>
  )
})

export const DashboardNode = memo(function DashboardNode({ data, selected }: NodeProps<Node<NodeData>>) {
  const title = (data.config as { title?: string }).title || 'Dashboard'
  const executionId = useExecutionStore((s) => s.executionId)
  const navigate = useNavigate()
  return (
    <>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <BaseNode label={title} icon="⊞" status={data.status} color="" category={data.category} selected={selected} error_message={data.error_message} cached={data.cached}>
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
                className="mt-1 px-2 py-0.5 text-[10px] font-medium bg-[#0071E3] text-white rounded-md hover:bg-[#0077ED] transition-colors"
              >
                Open Dashboard ↗
              </button>
            )}
          </>
        )}
      </BaseNode>
    </>
  )
})
