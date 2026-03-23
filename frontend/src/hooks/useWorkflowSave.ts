import { useCallback, useRef } from 'react'
import { useReactFlow } from '@xyflow/react'
import { useFlowStore } from '../store/flowStore'
import { workflowsApi } from '../api/workflows'
import toast from 'react-hot-toast'

/**
 * Hook that saves the current workflow graph to the backend.
 * Debounced — call save() freely; it won't fire more than once per 1.5s.
 */
export function useWorkflowSave() {
  const { getNodes, getEdges, getViewport } = useReactFlow()
  const { workflowId, workflowName } = useFlowStore()
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const saveNow = useCallback(async () => {
    if (!workflowId) return
    try {
      const nodes = getNodes()
      const edges = getEdges()
      const viewport = getViewport()
      await workflowsApi.save(workflowId, {
        name: workflowName,
        nodes: nodes as unknown[],
        edges: edges as unknown[],
        viewport,
      })
    } catch {
      toast.error('Failed to save workflow')
    }
  }, [workflowId, workflowName, getNodes, getEdges, getViewport])

  const save = useCallback(() => {
    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(saveNow, 1500)
  }, [saveNow])

  return { save, saveNow }
}
