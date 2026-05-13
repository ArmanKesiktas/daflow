import { useEffect, useRef } from 'react'
import { useExecutionStore } from '../store/executionStore'
import { useFlowStore } from '../store/flowStore'
import type { ExecutionStatus, NodeStatus } from '../types/workflow'

/**
 * Opens a Server-Sent Events connection to stream real-time execution status.
 * Updates the execution store and flow node statuses as events arrive.
 */
export function useExecutionStream(executionId: string | null) {
  const { setStatus, setRunning, setError } = useExecutionStore()
  const { updateNodeData } = useFlowStore()
  const esRef = useRef<EventSource | null>(null)

  useEffect(() => {
    if (!executionId) return

    const token = localStorage.getItem('access_token')
    const url = `/api/executions/${executionId}/stream${token ? `?token=${token}` : ''}`
    const es = new EventSource(url)
    esRef.current = es

    setRunning(true)

    es.onmessage = (event) => {
      try {
        const data: ExecutionStatus = JSON.parse(event.data)
        setStatus(data)

        // Sync node visual statuses in React Flow canvas.
        for (const ns of data.node_statuses || []) {
          updateNodeData(ns.node_id, {
            status: ns.status as NodeStatus,
            error_message: ns.error_message ?? undefined,
            cached: ns.metrics?.cached === true ? true : undefined,
          })
        }

        if (data.done || data.status === 'success' || data.status === 'error' || data.status === 'cancelled') {
          setRunning(false)
          es.close()
        }
      } catch (_) {
        // ignore parse errors
      }
    }

    es.onerror = () => {
      setRunning(false)
      setError('Connection lost during execution stream')
      es.close()
    }

    return () => {
      es.close()
      esRef.current = null
    }
  }, [executionId])
}
