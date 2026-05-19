import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { ConnectedBaseNode } from './ConnectedBaseNode'
import { NodePreview } from './NodePreview'
import type { NodeData } from '../../types/workflow'

type Operation = {
  type: string
  label?: string
}

export const CategoryNode = memo(function CategoryNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const config = data.config as { operations?: Operation[]; node_category?: string }
  const operations = Array.isArray(config.operations) ? config.operations : []
  const isSource = data.category === 'source'
  const summary = operations.length
    ? operations.map((operation) => operation.label || operation.type.replace(/_/g, ' ')).join(' + ')
    : 'No operation selected'

  return (
    <NodePreview nodeId={id} data={data}>
      {!isSource && <Handle type="target" position={Position.Left} id="dataframe" />}
      <ConnectedBaseNode
        nodeId={id}
        label={data.label}
        icon={categoryIcon(data.category)}
        status={data.status}
        color=""
        category={data.category}
        selected={selected}
        disabled={Boolean(data.disabled)}
      >
        <span className="text-[var(--color-text-muted)]">{operations.length} selected</span>
        <span className="text-[10px] text-[var(--color-text-muted)] truncate max-w-[180px]">{summary}</span>
      </ConnectedBaseNode>
      <Handle type="source" position={Position.Right} id={data.category === 'visualization' ? 'chart_panels' : 'dataframe'} />
    </NodePreview>
  )
})

function categoryIcon(category?: string) {
  if (category === 'source') return 'S'
  if (category === 'preparation') return 'P'
  if (category === 'analysis') return 'A'
  if (category === 'big_data') return 'BD'
  if (category === 'utility') return 'U'
  if (category === 'visualization') return 'C'
  if (category === 'ml') return 'ML'
  if (category === 'output') return 'O'
  return 'N'
}
