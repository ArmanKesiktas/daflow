import { useCallback } from 'react'
import { useFlowStore } from '../store/flowStore'
import { useExecutionStore } from '../store/executionStore'
import { workflowsApi } from '../api/workflows'
import { useWorkflowSave } from './useWorkflowSave'
import toast from 'react-hot-toast'
import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'
import type { NodeContextMenuProps } from '../components/flow/NodeContextMenu'

/**
 * Provides context menu action callbacks for a given node.
 * Returns a `NodeContextMenuProps` object ready to pass to BaseNode's `contextMenu` prop.
 */
export function useNodeContextMenu(nodeId: string): NodeContextMenuProps {
  const {
    nodes,
    edges,
    workflowId,
    addNode,
    updateNodeData,
    setSelectedNode,
    setNodes,
    setEdges,
  } = useFlowStore()
  const { setExecutionId, reset: resetExecution } = useExecutionStore()
  const { save, saveNow } = useWorkflowSave()

  const node = nodes.find((n) => n.id === nodeId)
  const isDisabled = Boolean(node?.data?.disabled)

  const onConfigure = useCallback(() => {
    setSelectedNode(nodeId)
  }, [nodeId, setSelectedNode])

  const onRename = useCallback(() => {
    const currentLabel = node?.data?.label ?? ''
    const newLabel = window.prompt('Rename node:', currentLabel)
    if (newLabel !== null && newLabel.trim() !== '') {
      updateNodeData(nodeId, { label: newLabel.trim() })
      save()
    }
  }, [node, nodeId, updateNodeData, save])

  const onDuplicate = useCallback(() => {
    if (!node) return
    const clone: Node<NodeData> = {
      id: crypto.randomUUID(),
      type: node.type,
      position: {
        x: node.position.x + 40,
        y: node.position.y + 40,
      },
      data: JSON.parse(JSON.stringify(node.data)) as NodeData,
    }
    // Reset status on the clone
    clone.data.status = 'idle'
    clone.data.resultPreview = undefined
    clone.data.error_message = undefined
    clone.data.cached = undefined
    addNode(clone)
    setSelectedNode(clone.id)
    save()
  }, [node, addNode, setSelectedNode, save])

  const onDisable = useCallback(() => {
    const currentDisabled = Boolean(node?.data?.disabled)
    updateNodeData(nodeId, { disabled: !currentDisabled })
    save()
  }, [node, nodeId, updateNodeData, save])

  const onRun = useCallback(async () => {
    if (!workflowId) {
      toast.error('Save the workflow first before running a node.')
      return
    }
    try {
      // Save current state immediately before running
      await saveNow()
      // Set this node and upstream to pending
      const upstreamIds = getUpstreamNodeIds(nodeId, nodes, edges)
      const targetIds = [nodeId, ...upstreamIds]
      targetIds.forEach((id) => {
        updateNodeData(id, { status: 'pending', error_message: undefined, cached: undefined })
      })
      // Trigger full workflow run (backend handles execution order)
      const res = await workflowsApi.run(workflowId)
      resetExecution()
      setExecutionId(res.execution_id)
      toast.success('Node execution started')
    } catch (error) {
      // Reset statuses on failure
      updateNodeData(nodeId, { status: 'idle' })
      toast.error('Failed to run node')
    }
  }, [workflowId, nodeId, nodes, edges, updateNodeData, saveNow, resetExecution, setExecutionId])

  const onViewOutput = useCallback(() => {
    // Select the node to show its output in the results panel
    setSelectedNode(nodeId)
  }, [nodeId, setSelectedNode])

  const onDelete = useCallback(() => {
    const confirmed = window.confirm(
      `Are you sure you want to delete "${node?.data?.label ?? 'this node'}"? This action cannot be undone.`
    )
    if (!confirmed) return

    const updatedNodes = nodes.filter((n) => n.id !== nodeId)
    const updatedEdges = edges.filter((e) => e.source !== nodeId && e.target !== nodeId)
    setNodes(updatedNodes)
    setEdges(updatedEdges)
    setSelectedNode(null)
    save()
  }, [node, nodeId, nodes, edges, setNodes, setEdges, setSelectedNode, save])

  return {
    onConfigure,
    onRename,
    onDuplicate,
    onDisable,
    onRun,
    onViewOutput,
    onDelete,
    isDisabled,
  }
}

/**
 * Traverses edges backwards to find all upstream node IDs for a given node.
 */
function getUpstreamNodeIds(
  nodeId: string,
  nodes: Node<NodeData>[],
  edges: { source: string; target: string }[]
): string[] {
  const visited = new Set<string>()
  const queue = [nodeId]

  while (queue.length > 0) {
    const current = queue.shift()!
    const incomingEdges = edges.filter((e) => e.target === current)
    for (const edge of incomingEdges) {
      if (!visited.has(edge.source)) {
        visited.add(edge.source)
        queue.push(edge.source)
      }
    }
  }

  return Array.from(visited)
}
