import { useCallback, useMemo, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import {
  ReactFlow,
  Background,
  BackgroundVariant,
  Controls,
  MiniMap,
  type Node,
  type Edge,
  type ReactFlowInstance,
} from '@xyflow/react'
import { useFlowStore } from '../../store/flowStore'
import { nodeTypes } from '../nodes/nodeTypes'
import { useWorkflowSave } from '../../hooks/useWorkflowSave'
import type { NodeData } from '../../types/workflow'
import { NODE_DEFINITIONS, type NodeDefinition } from '../panels/NodePanel'
const uuid = () => crypto.randomUUID()

interface FlowCanvasProps {
  onNodeSelect: (nodeId: string | null) => void
}

interface ContextMenu {
  nodeId: string
  x: number
  y: number
}

interface PendingNode {
  def: NodeDefinition
  position: { x: number; y: number }
}

function NodePreviewModal({
  pending,
  onAdd,
  onClose,
}: {
  pending: PendingNode
  onAdd: () => void
  onClose: () => void
}) {
  const sample = pending.def.category === 'source'
    ? '{ rows: 500, columns: 23, preview: [...] }'
    : pending.def.category === 'visualization'
      ? '{ chart_panel: { type, title, data } }'
      : pending.def.category === 'output'
        ? '{ dashboard_config | report }'
        : '{ dataframe, summary, metrics }'

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-md mx-4 rounded-2xl border border-[var(--color-border-default)] bg-surface shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border-subtle)]">
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-primary/10 text-primary flex items-center justify-center text-[14px] font-semibold">
              {pending.def.label.slice(0, 1)}
            </div>
            <div className="min-w-0">
              <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{pending.def.label}</p>
              <p className="text-[12px] leading-relaxed text-[var(--color-text-muted)] mt-1">{pending.def.description}</p>
            </div>
          </div>
        </div>
        <div className="p-5 space-y-3">
          <div className="grid grid-cols-2 gap-2">
            <InfoPill label="Input" value={pending.def.category === 'source' ? 'None' : 'Upstream data'} />
            <InfoPill label="Output" value={pending.def.category === 'output' ? 'Dashboard/report' : 'Data + result'} />
          </div>
          <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-3">
            <p className="text-[10px] uppercase tracking-[0.14em] text-[var(--color-text-muted)] mb-2">Sample output</p>
            <code className="block text-[11px] text-[var(--color-text-secondary)] whitespace-pre-wrap">{sample}</code>
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--color-border-subtle)] flex justify-end gap-2">
          <button onClick={onClose} className="h-8 px-4 rounded-lg text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-secondary)] transition-colors">Cancel</button>
          <button onClick={onAdd} className="h-8 px-4 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary-hover transition-colors">Add node</button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

function InfoPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-3">
      <p className="text-[10px] uppercase tracking-[0.12em] text-[var(--color-text-muted)]">{label}</p>
      <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">{value}</p>
    </div>
  )
}

function NodeContextMenu({
  menu,
  onNote,
  onClearNote,
  onClose,
  hasNote,
}: {
  menu: ContextMenu
  onNote: () => void
  onClearNote: () => void
  onClose: () => void
  hasNote: boolean
}) {
  return createPortal(
    <>
      <div className="fixed inset-0 z-40" onClick={onClose} />
      <div
        style={{ position: 'fixed', top: menu.y, left: menu.x, zIndex: 50 }}
        className="dropdown-popover dropdown-popover-left bg-surface border border-[var(--color-border-default)] rounded-[10px] backdrop-blur-[12px] shadow-xl py-1 min-w-[160px] overflow-hidden"
      >
        <button
          onClick={() => { onNote(); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors text-left"
        >
          <span className="w-4 text-center">N</span>
          {hasNote ? 'Edit Note' : 'Add Note'}
        </button>
        {hasNote && (
          <button
            onClick={() => { onClearNote(); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-danger hover:bg-danger/[0.08] transition-colors text-left"
          >
            <span className="w-4 text-center">x</span>
            Clear Note
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}

function NoteModal({
  initialNote,
  onSave,
  onClose,
}: {
  initialNote: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initialNote)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-surface rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-sm mx-4 p-5">
        <h3 className="text-[14px] font-semibold text-[var(--color-text-primary)] mb-3">Node Note</h3>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note..."
          rows={4}
          className="w-full bg-[var(--color-secondary)] border border-[var(--color-border-default)] rounded-xl px-3 py-2.5 text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] resize-none focus:outline-none focus:border-primary/50 transition-colors"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-secondary)] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(text); onClose() }}
            className="px-4 h-8 rounded-lg text-[12px] font-medium bg-primary hover:bg-primary-hover text-white transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

export default function FlowCanvas({ onNodeSelect }: FlowCanvasProps) {
  const {
    nodes, edges, selectedNodeId, setRfInstance,
    onNodesChange, onEdgesChange, onConnect,
    setViewport, setSelectedNode, addNode, updateNodeData,
  } = useFlowStore()
  const { save } = useWorkflowSave()
  const isDark = document.documentElement.classList.contains('dark')
  const rfRef = useRef<ReactFlowInstance<Node<NodeData>, Edge> | null>(null)
  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [noteModal, setNoteModal] = useState<{ nodeId: string; note: string } | null>(null)
  const [pendingNode, setPendingNode] = useState<PendingNode | null>(null)

  const commitNode = useCallback((pending: PendingNode) => {
    const newNode: Node<NodeData> = {
      id: uuid(),
      type: pending.def.type,
      position: pending.position,
      data: {
        label: pending.def.label,
        category: pending.def.category,
        config: { ...pending.def.defaultConfig },
        status: 'idle',
      },
    }
    addNode(newNode)
    save()
  }, [addNode, save])

  // Drag-and-drop from node panel
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/dataflow-node')
      if (!nodeType || !rfRef.current) return

      const def: NodeDefinition | undefined = NODE_DEFINITIONS.find((d) => d.type === nodeType)
      if (!def) return

      const position = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })

      setPendingNode({ def, position })
    },
    [],
  )

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      setSelectedNode(node.id)
      onNodeSelect(node.id)
    },
    [setSelectedNode, onNodeSelect],
  )

  const onPaneClick = useCallback(() => {
    setSelectedNode(null)
    onNodeSelect(null)
    setContextMenu(null)
  }, [setSelectedNode, onNodeSelect])

  const onNodeContextMenu = useCallback((e: React.MouseEvent, node: Node) => {
    e.preventDefault()
    e.stopPropagation()
    setSelectedNode(node.id)
    onNodeSelect(node.id)
    setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY })
  }, [onNodeSelect, setSelectedNode])

  const defaultEdgeOptions = {
    style: {
      strokeWidth: 2,
      stroke: isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)',
    },
    selectedStyle: {
      stroke: '#FF453A',
      strokeWidth: 2.5,
    },
  }

  const visualEdges = useMemo<Edge[]>(() => {
    const statusByNodeId = new Map(nodes.map((node) => [node.id, node.data.status]))
    const baseStroke = isDark ? 'rgba(255,255,255,0.25)' : 'rgba(0,0,0,0.20)'

    return edges.map((edge) => {
      const sourceStatus = statusByNodeId.get(edge.source)
      const targetStatus = statusByNodeId.get(edge.target)
      const connectedToSelected = Boolean(
        selectedNodeId && (edge.source === selectedNodeId || edge.target === selectedNodeId),
      )
      const failed = sourceStatus === 'error' || targetStatus === 'error'
      const cancelled = sourceStatus === 'cancelled' || targetStatus === 'cancelled'
      const running = sourceStatus === 'running' || targetStatus === 'running'
      const pending = sourceStatus === 'pending' || targetStatus === 'pending'
      const complete = sourceStatus === 'success' && targetStatus === 'success'
      const active = running || pending

      const stroke = failed
        ? '#FF453A'
        : cancelled
          ? '#8E8E93'
          : active
            ? '#0071E3'
            : connectedToSelected
              ? '#FF9F0A'
              : complete
                ? '#30D158'
                : baseStroke

      return {
        ...edge,
        animated: active || connectedToSelected || Boolean(edge.animated),
        style: {
          ...edge.style,
          stroke,
          strokeWidth: complete ? 3.2 : active || connectedToSelected ? 3 : failed ? 2.5 : 2,
          opacity: active || connectedToSelected || complete || failed ? 1 : 0.75,
          strokeDasharray: active ? '7 5' : connectedToSelected ? '5 5' : undefined,
        },
      }
    })
  }, [edges, isDark, nodes, selectedNodeId])

  const contextNode = contextMenu ? nodes.find((node) => node.id === contextMenu.nodeId) : null
  const hasNote = Boolean((contextNode?.data as NodeData | undefined)?.note)

  return (
    <>
      <ReactFlow
        data-tour="flow-canvas"
        nodes={nodes}
        edges={visualEdges}
        onNodesChange={(changes) => { onNodesChange(changes); save() }}
        onEdgesChange={(changes) => {
          onEdgesChange(changes)
          const hasDelete = changes.some((c) => c.type === 'remove')
          if (hasDelete) save()
        }}
        onConnect={(conn) => { onConnect(conn); save() }}
        onNodeClick={onNodeClick}
        onPaneClick={onPaneClick}
        onNodeContextMenu={onNodeContextMenu}
        onMoveEnd={(_, vp) => setViewport(vp)}
        onInit={(instance) => { rfRef.current = instance; setRfInstance(instance) }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        fitViewOptions={{ padding: 0.28, maxZoom: 0.82 }}
        className={isDark ? 'bg-page-bg' : 'bg-page-bg'}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? 'rgba(255,255,255,0.08)' : 'rgba(0,0,0,0.25)'}
        />
        <Controls className="!bg-[var(--color-bg-surface)]/85 dark:!bg-[var(--color-bg-surface)]/90 !border !border-[var(--color-border-default)] !rounded-[10px] !backdrop-blur-[12px] !shadow-md" />
        <MiniMap
          className="!bg-[#ffffff] dark:!bg-[#1C1C1E] !border-[var(--color-border-default)] rounded-[10px]"
          nodeColor={isDark ? 'rgba(0,113,227,0.6)' : 'rgba(0,113,227,0.5)'}
          maskColor={isDark ? 'rgba(0,0,0,0.5)' : 'rgba(242,242,247,0.7)'}
        />
      </ReactFlow>

      {contextMenu && (
        <NodeContextMenu
          menu={contextMenu}
          hasNote={hasNote}
          onNote={() => {
            const note = String((contextNode?.data as NodeData | undefined)?.note ?? '')
            setNoteModal({ nodeId: contextMenu.nodeId, note })
          }}
          onClearNote={() => {
            updateNodeData(contextMenu.nodeId, { note: '' })
            save()
          }}
          onClose={() => setContextMenu(null)}
        />
      )}

      {noteModal && (
        <NoteModal
          initialNote={noteModal.note}
          onSave={(text) => {
            updateNodeData(noteModal.nodeId, { note: text })
            save()
          }}
          onClose={() => setNoteModal(null)}
        />
      )}

      {pendingNode && (
        <NodePreviewModal
          pending={pendingNode}
          onAdd={() => {
            commitNode(pendingNode)
            setPendingNode(null)
          }}
          onClose={() => setPendingNode(null)}
        />
      )}
    </>
  )
}
