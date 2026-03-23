import { useCallback, useEffect, useRef, useState } from 'react'
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

// ── Node context menu ─────────────────────────────────────────────────────────

interface ContextMenu { nodeId: string; x: number; y: number }

function NodeContextMenu({
  menu, onNote, onClearNote, onClose, hasNote,
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
        className="bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-xl shadow-xl py-1 min-w-[160px] overflow-hidden"
      >
        <button
          onClick={() => { onNote(); onClose() }}
          className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#1d1d1f]/80 dark:text-white/80 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors text-left"
        >
          <span>📝</span>
          {hasNote ? 'Edit Note' : 'Add Note'}
        </button>
        {hasNote && (
          <button
            onClick={() => { onClearNote(); onClose() }}
            className="w-full flex items-center gap-2.5 px-3 py-2 text-[12px] text-[#FF453A] hover:bg-[#FF453A]/[0.08] transition-colors text-left"
          >
            <span>🗑</span>
            Clear Note
          </button>
        )}
      </div>
    </>,
    document.body,
  )
}

// ── Note editor modal ─────────────────────────────────────────────────────────

function NoteModal({
  nodeId, initialNote, onSave, onClose,
}: {
  nodeId: string
  initialNote: string
  onSave: (note: string) => void
  onClose: () => void
}) {
  const [text, setText] = useState(initialNote)
  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl w-full max-w-sm mx-4 p-5">
        <h3 className="text-[14px] font-semibold text-[#1d1d1f] dark:text-white mb-3">Node Note</h3>
        <textarea
          autoFocus
          value={text}
          onChange={(e) => setText(e.target.value)}
          placeholder="Add a note…"
          rows={4}
          className="w-full bg-black/[0.04] dark:bg-white/[0.05] border border-black/[0.08] dark:border-white/[0.08] rounded-xl px-3 py-2.5 text-[12px] text-[#1d1d1f] dark:text-white placeholder-[#1d1d1f]/25 dark:placeholder-white/25 resize-none focus:outline-none focus:border-[#0071E3]/50 transition-colors"
        />
        <div className="flex justify-end gap-2 mt-3">
          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg text-[12px] text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={() => { onSave(text); onClose() }}
            className="px-4 h-8 rounded-lg text-[12px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white transition-colors"
          >
            Save
          </button>
        </div>
      </div>
    </div>,
    document.body,
  )
}

// ── Main canvas ───────────────────────────────────────────────────────────────

export default function FlowCanvas({ onNodeSelect }: FlowCanvasProps) {
  const {
    nodes, edges,
    onNodesChange, onEdgesChange, onConnect,
    setViewport, setSelectedNode, addNode, updateNodeData,
    undo, redo, past, future,
  } = useFlowStore()
  const { save } = useWorkflowSave()
  const isDark = document.documentElement.classList.contains('dark')
  const rfRef = useRef<ReactFlowInstance<Node<NodeData>, Edge> | null>(null)

  const [contextMenu, setContextMenu] = useState<ContextMenu | null>(null)
  const [noteModal, setNoteModal] = useState<{ nodeId: string; note: string } | null>(null)

  // Keyboard shortcuts: Ctrl+Z = undo, Ctrl+Y / Ctrl+Shift+Z = redo
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      const ctrl = e.ctrlKey || e.metaKey
      if (!ctrl) return
      if (e.key === 'z' && !e.shiftKey) { e.preventDefault(); undo(); save() }
      if (e.key === 'y' || (e.key === 'z' && e.shiftKey)) { e.preventDefault(); redo(); save() }
    }
    document.addEventListener('keydown', handler)
    return () => document.removeEventListener('keydown', handler)
  }, [undo, redo, save])

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

      const newNode: Node<NodeData> = {
        id: uuid(),
        type: nodeType,
        position,
        data: {
          label: def.label,
          category: def.category,
          config: { ...def.defaultConfig },
          status: 'idle',
        },
      }
      addNode(newNode)
      save()
    },
    [addNode, save],
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
    setContextMenu({ nodeId: node.id, x: e.clientX, y: e.clientY })
  }, [])

  const defaultEdgeOptions = {
    style: {
      strokeWidth: 2,
      stroke: isDark ? 'rgba(255,255,255,0.18)' : 'rgba(0,0,0,0.22)',
    },
  }

  const contextNode = contextMenu ? nodes.find((n) => n.id === contextMenu.nodeId) : null
  const hasNote = Boolean((contextNode?.data as NodeData | undefined)?.note)

  return (
    <>
      <ReactFlow
        nodes={nodes}
        edges={edges}
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
        onInit={(instance) => { rfRef.current = instance }}
        onDragOver={onDragOver}
        onDrop={onDrop}
        nodeTypes={nodeTypes}
        deleteKeyCode={['Delete', 'Backspace']}
        defaultEdgeOptions={defaultEdgeOptions}
        snapToGrid
        snapGrid={[16, 16]}
        fitView
        className={isDark ? 'bg-[#111113]' : 'bg-[#F2F2F7]'}
      >
        <Background
          variant={BackgroundVariant.Dots}
          gap={24}
          size={1.5}
          color={isDark ? 'rgba(255,255,255,0.22)' : 'rgba(0,0,0,0.25)'}
        />
        <Controls className="!bg-transparent" />
        <MiniMap
          className={isDark ? '!bg-[#1C1C1E] !border-white/[0.08] rounded-xl' : '!bg-white !border-black/[0.08] rounded-xl'}
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
          nodeId={noteModal.nodeId}
          initialNote={noteModal.note}
          onSave={(text) => {
            updateNodeData(noteModal.nodeId, { note: text })
            save()
          }}
          onClose={() => setNoteModal(null)}
        />
      )}
    </>
  )
}
