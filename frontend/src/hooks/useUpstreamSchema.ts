import { useFlowStore } from '../store/flowStore'
import type { NodeData, ColumnMeta } from '../types/workflow'

/**
 * Returns the column schema from the upstream node connected to a specific handle.
 * Returns null if no node is connected or the connected node has no columns.
 */
export function useUpstreamSchema(nodeId: string, handleId: string): ColumnMeta[] | null {
  const nodes = useFlowStore((s) => s.nodes)
  const edges = useFlowStore((s) => s.edges)

  // Find edge targeting this node on the specified handle
  const incomingEdge = edges.find(
    (e) => e.target === nodeId && e.targetHandle === handleId
  )
  if (!incomingEdge) return null

  // Get the source node
  const sourceNode = nodes.find((n) => n.id === incomingEdge.source)
  if (!sourceNode) return null

  // Return columns from source node data
  const data = sourceNode.data as NodeData
  return data.columns ?? null
}
