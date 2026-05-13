import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import { NodePreview } from './NodePreview'
import type { NodeData, NodeStatus } from '../../types/workflow'

const statusBorder: Record<NodeStatus, string> = {
  idle: 'border-[var(--color-border-default)]',
  pending: 'border-[#FF9F0A]/70 shadow-[0_0_0_3px_rgba(255,159,10,0.12)]',
  running: 'border-primary/75 shadow-[0_0_0_3px_rgba(0,113,227,0.14)]',
  success: 'border-[#30D158] shadow-[0_0_0_4px_rgba(48,209,88,0.20),0_10px_28px_rgba(48,209,88,0.12)]',
  error: 'border-[#FF453A]/70 shadow-[0_0_0_3px_rgba(255,69,58,0.10)]',
  cancelled: 'border-[#8E8E93]/60 shadow-[0_0_0_3px_rgba(142,142,147,0.10)]',
}

const statusDot: Record<NodeStatus, string> = {
  idle: 'bg-[var(--color-text-muted)]',
  pending: 'bg-[#FF9F0A] animate-pulse',
  running: 'bg-[var(--color-primary)] animate-pulse',
  success: 'bg-[#30D158] shadow-[0_0_0_3px_rgba(48,209,88,0.18)]',
  error: 'bg-[#FF453A]',
  cancelled: 'bg-[#8E8E93]',
}

export const RouteNode = memo(function RouteNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  return (
    <NodePreview nodeId={id} data={data}>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <div
        title={data.label}
        className={`
          relative w-14 h-14 border bg-[#ffffff]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl
          shadow-lg dark:shadow-xl
          flex items-center justify-center transition-all duration-150
          ${statusBorder[data.status]}
          ${selected ? 'outline outline-2 outline-primary/35 outline-offset-2' : ''}
        `}
      >
        <span className="text-[15px] font-semibold text-[var(--color-text-secondary)]">R</span>
        <span className={`absolute right-1.5 top-1.5 w-1.5 h-1.5 rounded-full ${statusDot[data.status]}`} />
        {Boolean(data.error_message) && (
          <span className="absolute -bottom-1 -right-1 w-3 h-3 rounded-full bg-[#FF453A] text-white text-[8px] flex items-center justify-center">
            !
          </span>
        )}
      </div>
      <Handle type="source" position={Position.Right} id="dataframe" />
    </NodePreview>
  )
})
