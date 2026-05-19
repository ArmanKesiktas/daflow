import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { ConnectedBaseNode } from './ConnectedBaseNode'
import type { NodeData } from '../../types/workflow'
import { NodePreview } from './NodePreview'

/** Reusable analysis node with configurable extra source handles */
function AnalysisNodeFactory(icon: string, color: string, extraHandles: string[] = []) {
  return memo(function AnalysisNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const method = (data.config as { method?: string }).method
    const total = 1 + extraHandles.length // dataframe + extras
    return (
      <NodePreview nodeId={id} data={data}>
        <Handle type="target" position={Position.Left} id="dataframe" />
        <ConnectedBaseNode
          nodeId={id}
          label={data.label}
          icon={icon}
          status={data.status}
          color={color}
          category={data.category}
          selected={selected}
          disabled={Boolean(data.disabled)}
        >
          {method && <span className="text-[var(--color-text-muted)] capitalize">{method}</span>}
          {data.resultPreview && (
            <span className="text-[var(--color-text-muted)] text-[10px]">
              {JSON.stringify(data.resultPreview).slice(0, 60)}…
            </span>
          )}
        </ConnectedBaseNode>
        {/* dataframe always at top */}
        <Handle
          type="source"
          position={Position.Right}
          id="dataframe"
          style={{ top: `${(1 / (total + 1)) * 100}%` }}
        />
        {/* extra named handles evenly spaced below */}
        {extraHandles.map((id, i) => (
          <Handle
            key={id}
            type="source"
            position={Position.Right}
            id={id}
            style={{ top: `${((i + 2) / (total + 1)) * 100}%` }}
          />
        ))}
      </NodePreview>
    )
  })
}

export const ColumnTypeDetectionNode = AnalysisNodeFactory('T',  'bg-orange-500', ['column_types'])
export const MissingValueNode        = AnalysisNodeFactory('○',  'bg-orange-500', ['missing_summary'])
export const DuplicateDetectionNode  = AnalysisNodeFactory('⊟',  'bg-orange-500', ['duplicate_summary'])
export const FilterRowsNode          = AnalysisNodeFactory('⊃',  'bg-orange-500')
export const StatisticsNode          = AnalysisNodeFactory('σ',  'bg-green-500',  ['statistics'])
export const AnomalyDetectionNode    = AnalysisNodeFactory('△',  'bg-green-500',  ['anomaly_summary'])
export const CCSGSGAnomalyNode       = AnalysisNodeFactory('C',  'bg-green-500',  ['anomaly_summary'])
export const CorrelationNode         = AnalysisNodeFactory('ρ',  'bg-green-500',  ['correlation_matrix'])
export const DistributionNode        = AnalysisNodeFactory('∿',  'bg-green-500',  ['distributions'])
