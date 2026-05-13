import { useEffect, useState, useCallback } from 'react'
import { useFlowStore } from '../../store/flowStore'
import type { NodeData } from '../../types/workflow'
import type { Node, Edge } from '@xyflow/react'

/**
 * Floating tooltip that appears when a second data source is added to the canvas.
 * Offers to connect the two sources via a new Join node.
 * Auto-dismisses after 8 seconds.
 */
export default function SmartSourceSuggestion() {
  const { nodes, edges, addNode, setEdges } = useFlowStore()
  const [visible, setVisible] = useState(false)
  const [dismissed, setDismissed] = useState<Set<string>>(new Set())
  const [targetPair, setTargetPair] = useState<{ source1: string; source2: string } | null>(null)

  // Detect when a second source node exists without a downstream join
  useEffect(() => {
    const sourceNodes = nodes.filter(
      n => n.type === 'file_upload' || n.type === 'database_query'
    )

    if (sourceNodes.length < 2) {
      setVisible(false)
      return
    }

    // Find pairs of source nodes not already connected to a join
    const joinNodes = nodes.filter(n => n.type === 'join_node')
    const connectedSources = new Set<string>()
    for (const jn of joinNodes) {
      const leftEdge = edges.find(e => e.target === jn.id && e.targetHandle === 'left_df')
      const rightEdge = edges.find(e => e.target === jn.id && e.targetHandle === 'right_df')
      if (leftEdge) connectedSources.add(leftEdge.source)
      if (rightEdge) connectedSources.add(rightEdge.source)
    }

    const unconnected = sourceNodes.filter(n => !connectedSources.has(n.id))
    if (unconnected.length >= 2) {
      const pairKey = `${unconnected[0].id}::${unconnected[1].id}`
      if (!dismissed.has(pairKey)) {
        setTargetPair({ source1: unconnected[0].id, source2: unconnected[1].id })
        setVisible(true)
      }
    } else {
      setVisible(false)
    }
  }, [nodes, edges, dismissed])

  // Auto-dismiss after 8 seconds
  useEffect(() => {
    if (!visible) return
    const timer = setTimeout(() => setVisible(false), 8000)
    return () => clearTimeout(timer)
  }, [visible])

  const handleDismiss = useCallback(() => {
    if (targetPair) {
      setDismissed(prev => new Set(prev).add(`${targetPair.source1}::${targetPair.source2}`))
    }
    setVisible(false)
  }, [targetPair])

  const handleAccept = useCallback(() => {
    if (!targetPair) return

    const source1 = nodes.find(n => n.id === targetPair.source1)
    const source2 = nodes.find(n => n.id === targetPair.source2)
    if (!source1 || !source2) return

    const midX = (source1.position.x + source2.position.x) / 2 + 260
    const midY = (source1.position.y + source2.position.y) / 2

    const joinNode: Node<NodeData> = {
      id: crypto.randomUUID(),
      type: 'join_node',
      position: { x: midX, y: midY },
      data: {
        label: 'Join',
        category: 'transformation',
        config: { how: 'inner', keyPairs: [], suffixes: ['_x', '_y'], dismissedSuggestions: [] },
        status: 'idle',
      },
    }

    const newEdges: Edge[] = [
      { id: crypto.randomUUID(), source: targetPair.source1, target: joinNode.id, sourceHandle: 'dataframe', targetHandle: 'left_df', type: 'smoothstep' },
      { id: crypto.randomUUID(), source: targetPair.source2, target: joinNode.id, sourceHandle: 'dataframe', targetHandle: 'right_df', type: 'smoothstep' },
    ]

    addNode(joinNode)
    setEdges([...edges, ...newEdges])
    setVisible(false)
  }, [targetPair, nodes, edges, addNode, setEdges])

  if (!visible || !targetPair) return null

  const source2Node = nodes.find(n => n.id === targetPair.source2)
  if (!source2Node) return null

  return (
    <div
      className="absolute z-50 pointer-events-auto"
      style={{
        left: source2Node.position.x + 180,
        top: source2Node.position.y - 10,
      }}
    >
      <div className="bg-[#ffffff] dark:bg-[#1C1C1E] rounded-xl border border-[var(--color-border-default)] shadow-lg px-3 py-2.5 max-w-[200px]">
        <p className="text-[11px] text-[var(--color-text-primary)] font-medium mb-2">
          Connect these sources with a Join?
        </p>
        <div className="flex items-center gap-2">
          <button
            onClick={handleAccept}
            className="h-6 px-3 rounded-md bg-[#0071E3] text-white text-[10px] font-medium hover:bg-[#0071E3]/90 transition-colors"
          >
            Join
          </button>
          <button
            onClick={handleDismiss}
            className="h-6 px-3 rounded-md bg-[var(--color-secondary)] text-[var(--color-text-muted)] text-[10px] font-medium hover:text-[var(--color-text-primary)] transition-colors"
          >
            Dismiss
          </button>
        </div>
      </div>
    </div>
  )
}
