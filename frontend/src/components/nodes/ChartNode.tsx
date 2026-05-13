import { memo } from 'react'
import { Handle, Position, type Node, type NodeProps } from '@xyflow/react'
import type { NodeData } from '../../types/workflow'
import { BaseNode } from './BaseNode'
import { NodePreview } from './NodePreview'
import { chartDefinition } from '../../utils/chartCatalog'

export const ChartNode = memo(function ChartNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const config = data.config as { chart_type?: string; title?: string }
  const chartType = config.chart_type || id
  const chart = chartDefinition(chartType)

  return (
    <NodePreview nodeId={id} data={data}>
      <Handle type="target" position={Position.Left} id="dataframe" />
      <BaseNode
        label={config.title || chart?.label || data.label}
        icon={chart?.icon || '▥'}
        status={data.status}
        color="bg-[#5E5CE6]"
        category="visualization"
        selected={selected}
      >
        <span className="capitalize">{chart?.family ?? 'chart'}</span>
        <span className="text-[var(--color-text-muted)] text-[10px]">{chart?.description ?? chartType}</span>
      </BaseNode>
      <Handle type="source" position={Position.Right} id="chart_panel" />
    </NodePreview>
  )
})
