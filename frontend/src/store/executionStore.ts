import { create } from 'zustand'
import type { ExecutionStatus, NodeStatus } from '../types/workflow'

interface ExecutionState {
  executionId: string | null
  status: ExecutionStatus | null
  nodeStatuses: Record<string, NodeStatus>
  isRunning: boolean
  error: string | null

  setExecutionId: (id: string | null) => void
  setStatus: (status: ExecutionStatus) => void
  updateNodeStatus: (nodeId: string, status: NodeStatus) => void
  setRunning: (v: boolean) => void
  setError: (msg: string | null) => void
  reset: () => void
}

export const useExecutionStore = create<ExecutionState>((set) => ({
  executionId: null,
  status: null,
  nodeStatuses: {},
  isRunning: false,
  error: null,

  setExecutionId: (id) => set({ executionId: id }),

  setStatus: (status) => {
    const nodeStatuses: Record<string, NodeStatus> = {}
    for (const ns of status.node_statuses || []) {
      nodeStatuses[ns.node_id] = ns.status
    }
    set({ status, nodeStatuses, isRunning: status.status === 'running' })
  },

  updateNodeStatus: (nodeId, status) =>
    set((s) => ({ nodeStatuses: { ...s.nodeStatuses, [nodeId]: status } })),

  setRunning: (v) => set({ isRunning: v }),
  setError: (msg) => set({ error: msg }),

  reset: () =>
    set({ executionId: null, status: null, nodeStatuses: {}, isRunning: false, error: null }),
}))
