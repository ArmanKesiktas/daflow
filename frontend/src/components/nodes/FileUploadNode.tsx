import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { NodePreview } from './NodePreview'

export const FileUploadNode = memo(function FileUploadNode({
  id, data, selected,
}: NodeProps<Node<NodeData>>) {
  return (
    <NodePreview nodeId={id} data={data}>
      <BaseNode
        label={data.filename ? String(data.filename) : 'File Upload'}
        icon="↑"
        status={data.status}
        color=""
        category={data.category}
        selected={selected}
      >
        {data.filename && (
          <div className="text-[var(--color-text-secondary)] truncate max-w-[160px]">{data.filename}</div>
        )}
        {data.resultPreview && (
          <div className="text-[var(--color-text-muted)]">
            {String((data.resultPreview as { row_count?: number }).row_count ?? '')} rows ·{' '}
            {String((data.resultPreview as { column_count?: number }).column_count ?? '')} cols
          </div>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="dataframe" />
    </NodePreview>
  )
})
