import { memo } from 'react'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { ConnectedBaseNode } from './ConnectedBaseNode'
import { NodePreview } from './NodePreview'
import type { NodeData } from '../../types/workflow'

function BigDataNodeFactory(icon: string, summaryHandle: string) {
  return memo(function BigDataNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const config = data.config as Record<string, unknown>
    const detail =
      config.chunk_size ? `chunk ${config.chunk_size}` :
      config.aggregation ? String(config.aggregation) :
      config.reducer ? String(config.reducer) :
      config.sample_size ? `sample ${config.sample_size}` :
      undefined

    return (
      <NodePreview nodeId={id} data={data}>
        <Handle type="target" position={Position.Left} id="dataframe" />
        <ConnectedBaseNode
          nodeId={id}
          label={data.label}
          icon={icon}
          status={data.status}
          color=""
          category={data.category}
          selected={selected}
          disabled={Boolean(data.disabled)}
        >
          {detail && <span className="text-[var(--color-text-muted)]">{detail}</span>}
        </ConnectedBaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" style={{ top: '38%' }} />
        <Handle type="source" position={Position.Right} id={summaryHandle} style={{ top: '64%' }} />
      </NodePreview>
    )
  })
}

export const ChunkProcessingNode = BigDataNodeFactory('▤', 'chunk_summary')
export const MapReduceAggregationNode = BigDataNodeFactory('Σ', 'mapreduce_summary')
export const SparkGroupByNode = BigDataNodeFactory('S', 'spark_groupby_summary')
export const LargeDatasetProfilerNode = BigDataNodeFactory('LP', 'profiler_summary')
