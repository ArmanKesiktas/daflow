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
  type ReactFlowInstance,
} from '@xyflow/react'
import type { NodeData } from '../types/workflow'

interface FlowSnapshot {
  nodes: Node<NodeData>[]
  edges: Edge[]
}

interface FlowState {
  nodes: Node<NodeData>[]
  edges: Edge[]
  viewport: Viewport
  selectedNodeId: string | null
  workflowId: string | null
  workflowName: string
  past: FlowSnapshot[]
  future: FlowSnapshot[]
  rfInstance: ReactFlowInstance<Node<NodeData>, Edge> | null

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
  setRfInstance: (instance: ReactFlowInstance<Node<NodeData>, Edge> | null) => void
  loadGraph: (nodes: Node<NodeData>[], edges: Edge[], viewport: Viewport) => void
  undo: () => void
  redo: () => void
  reset: () => void
}

export const useFlowStore = create<FlowState>((set, get) => ({
  nodes: [],
  edges: [],
  viewport: { x: 0, y: 0, zoom: 0.82 },
  selectedNodeId: null,
  workflowId: null,
  workflowName: 'Untitled Workflow',
  past: [],
  future: [],
  rfInstance: null,

  setNodes: (nodes) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      nodes,
    })
  },
  setEdges: (edges) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      edges,
    })
  },
  setViewport: (viewport) => set({ viewport }),

  onNodesChange: (changes) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      nodes: applyNodeChanges(changes, current.nodes) as Node<NodeData>[],
    })
  },

  onEdgesChange: (changes) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      edges: applyEdgeChanges(changes, current.edges),
    })
  },

  onConnect: (connection) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      edges: addEdge({ ...connection, type: 'smoothstep' }, current.edges),
    })
  },

  addNode: (node) => {
    const current = get()
    set({
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: [],
      nodes: [...current.nodes, node],
    })
  },

  updateNodeData: (nodeId, patch) => {
    const current = get()
    const patchKeys = Object.keys(patch)
    const transientOnly = patchKeys.length > 0 && patchKeys.every((key) =>
      ['status', 'resultPreview', 'error_message', 'cached'].includes(key)
    )
    set({
      past: transientOnly ? current.past : [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: transientOnly ? current.future : [],
      nodes: current.nodes.map((n) =>
        n.id === nodeId ? { ...n, data: { ...n.data, ...patch } } : n
      ),
    })
  },

  setSelectedNode: (id) => set({ selectedNodeId: id }),
  setWorkflowId: (id) => set({ workflowId: id }),
  setWorkflowName: (name) => set({ workflowName: name }),
  setRfInstance: (instance) => set({ rfInstance: instance }),

  loadGraph: (nodes, edges, viewport) => {
    const rf = get().rfInstance
    set({ nodes, edges, viewport, past: [], future: [] })
    if (rf) setTimeout(() => rf.fitView({ duration: 300, padding: 0.28, maxZoom: 0.82 }), 50)
  },

  undo: () => {
    const current = get()
    const previous = current.past[current.past.length - 1]
    if (!previous) return
    set({
      nodes: previous.nodes,
      edges: previous.edges,
      past: current.past.slice(0, -1),
      future: [{ nodes: current.nodes, edges: current.edges }, ...current.future],
    })
  },

  redo: () => {
    const current = get()
    const next = current.future[0]
    if (!next) return
    set({
      nodes: next.nodes,
      edges: next.edges,
      past: [...current.past, { nodes: current.nodes, edges: current.edges }],
      future: current.future.slice(1),
    })
  },

  reset: () =>
    set({
      nodes: [],
      edges: [],
      viewport: { x: 0, y: 0, zoom: 0.82 },
      selectedNodeId: null,
      past: [],
      future: [],
    }),
}))
