import { create } from 'zustand'
import {
  addEdge,
  applyEdgeChanges,
  applyNodeChanges,
  type Connection,
  type Edge,
  type EdgeChange,
  type Node,
  type NodeChange,
  type Viewport,
} from '@xyflow/react'
import type { NodeData } from '../types/workflow'

interface HistoryEntry { nodes: Node<NodeData>[]; edges: Edge[] }

interface FlowState {
  nodes: Node<NodeData>[]
  edges: Edge[]
  viewport: Viewport
  selectedNodeId: string | null
  workflowId: string | null
  workflowName: string
  past: HistoryEntry[]
  future: HistoryEntry[]

  // Actions
  setNodes: (nodes: Node<NodeData>[]) => void
  setEdges: (edges: Edge[]) => void
  setViewport: (vp: Viewport) => void
  onNodesChange: (changes: NodeChange[]) => void
  onEdgesChange: (changes: EdgeChange[]) => void
  onConnect: (connection: Connection) => void
  addNode: (node: Node<NodeData>) => void
  updateNodeData: (nodeId: string, patch: Partial<NodeData>) => void
  setSelectedNode: (id: string | null) => void
  setWorkflowId: (id: string | null) => void
  setWorkflowName: (name: string) => void
  loadGraph: (nodes: Node<NodeData>[], edges: Edge[], viewport: Viewport) => void
  reset: () => void
  undo: () => void
  redo: () => void
}

const MAX_HISTORY = 50

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 1 },
  selectedNodeId: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  past: [],
  future: [],

  setNodes: (nodes) => set({ nodes }),
  setEdges: (edges) => set({ edges }),
  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) => {
    const { nodes, edges, past } = get()
    const hasRemove = changes.some((c) => c.type === 'remove')
    const hasDragEnd = changes.some((c) => c.type === 'position' && (c as { dragging?: boolean }).dragging === false)
    if (hasRemove || hasDragEnd) {
      set({ past: [...past, { nodes, edges }].slice(-MAX_HISTORY), future: [] })
    }
    set({ nodes: applyNodeChanges(changes, get().nodes) as Node<NodeData>[] })
  },

  onEdgesChange: (changes) => {
    const { nodes, edges, past } = get()
    const hasRemove = changes.some((c) => c.type === 'remove')
    if (hasRemove) {
      set({ past: [...past, { nodes, edges }].slice(-MAX_HISTORY), future: [] })
    }
    set({ edges: applyEdgeChanges(changes, get().edges) })
  },

  onConnect: (connection) => {
    const { nodes, edges, past } = get()
    set({
      past: [...past, { nodes, edges }].slice(-MAX_HISTORY),
      future: [],
      edges: addEdge({ ...connection, type: 'smoothstep' }, get().edges),
    })
  },

  addNode: (node) => {
    const { nodes, edges, past } = get()
    set({
      past: [...past, { nodes, edges }].slice(-MAX_HISTORY),
      future: [],
      nodes: [...get().nodes, node],
    })
  },

  updateNodeData: (nodeId, patch) =>
    set({
      nodes: get().nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    }),

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),

  loadGraph: (nodes, edges, viewport) => {
    const normalized = edges.map(e => ({
      ...e,
      sourceHandle: e.sourceHandle === 'report_data' || e.sourceHandle === 'insights'
        ? e.sourceHandle
        : 'dataframe',
      targetHandle: e.targetHandle === 'report_data'
        ? 'report_data'
        : 'dataframe',
    }))
    set({ nodes, edges: normalized, viewport, past: [], future: [] })
  },

  reset: () =>
    set({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 1 },
      selectedNodeId: null,
      past: [],
      future: [],
    }),

  undo: () => {
    const { past, nodes, edges, future } = get()
    if (past.length === 0) return
    const prev = past[past.length - 1]
    set({
      past: past.slice(0, -1),
      nodes: prev.nodes,
      edges: prev.edges,
      future: [{ nodes, edges }, ...future].slice(0, MAX_HISTORY),
    })
  },

  redo: () => {
    const { future, nodes, edges, past } = get()
    if (future.length === 0) return
    const next = future[0]
    set({
      future: future.slice(1),
      nodes: next.nodes,
      edges: next.edges,
      past: [...past, { nodes, edges }].slice(-MAX_HISTORY),
    })
  },
}))
