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
import type { NodeCategory, NodeData } from '../../types/workflow'
import { CATEGORIES, NODE_DEFINITIONS, type NodeDefinition } from '../panels/NodePanel'
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

interface PendingCategoryNode {
  category: NodeCategory
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

function CategoryNodeModal({
  pending,
  onAdd,
  onClose,
}: {
  pending: PendingCategoryNode
  onAdd: (selectedTypes: string[]) => void
  onClose: () => void
}) {
  const defs = NODE_DEFINITIONS.filter((def) => def.category === pending.category)
  const [selected, setSelected] = useState<string[]>(() => defs[0] ? [defs[0].type] : [])
  const meta = CATEGORIES.find((category) => category.key === pending.category)

  const toggle = (type: string) => {
    setSelected((current) => (
      current.includes(type)
        ? current.filter((item) => item !== type)
        : [...current, type]
    ))
  }

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/35 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-lg mx-4 rounded-2xl border border-[var(--color-border-default)] bg-surface shadow-2xl overflow-hidden">
        <div className="p-5 border-b border-[var(--color-border-subtle)]">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">Configure category node</p>
          <h3 className="mt-1 text-[17px] font-semibold text-[var(--color-text-primary)]">
            {categoryTitle(pending.category)} Node
          </h3>
          <p className="mt-1 text-[12px] leading-relaxed text-[var(--color-text-secondary)]">
            Select one or more operations. They will run inside a single canvas node in the order shown.
          </p>
        </div>
        <div className="p-4 max-h-[430px] overflow-y-auto">
          <div className="grid grid-cols-1 gap-2">
            {defs.map((def) => {
              const checked = selected.includes(def.type)
              return (
                <label
                  key={def.type}
                  className={`flex items-center gap-3 rounded-xl px-3 py-3 cursor-pointer transition-colors ${
                    checked
                      ? 'bg-primary/[0.12] text-primary'
                      : 'hover:bg-primary/[0.07] text-[var(--color-text-primary)]'
                  }`}
                >
                  <input
                    type="checkbox"
                    checked={checked}
                    onChange={() => toggle(def.type)}
                    className="sr-only"
                  />
                  <span className={`w-5 h-5 rounded-md flex items-center justify-center flex-shrink-0 transition-colors ${
                    checked ? 'bg-primary text-white' : 'bg-[var(--color-secondary)] text-transparent'
                  }`}>
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24" aria-hidden="true">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
                    </svg>
                  </span>
                  <span className="min-w-0 flex-1">
                    <span className="flex items-center gap-2">
                      <span className={`w-7 h-7 rounded-lg flex items-center justify-center text-[10px] font-semibold ${
                        checked ? 'bg-white/70 dark:bg-white/12 text-primary' : 'bg-primary/10 text-primary'
                      }`}>{def.icon}</span>
                      <span className={`text-[13px] font-semibold ${checked ? 'text-primary' : 'text-[var(--color-text-primary)]'}`}>{def.label}</span>
                    </span>
                    <span className={`mt-1 block text-[11px] leading-relaxed ${checked ? 'text-primary/75 dark:text-primary/80' : 'text-[var(--color-text-muted)]'}`}>{def.description}</span>
                  </span>
                </label>
              )
            })}
          </div>
        </div>
        <div className="px-5 py-4 border-t border-[var(--color-border-subtle)] flex items-center justify-between gap-2">
          <span className={`text-[11px] font-semibold ${meta?.accent ?? 'text-[var(--color-text-muted)]'}`}>
            {selected.length} selected
          </span>
          <div className="flex justify-end gap-2">
            <button onClick={onClose} className="h-8 px-4 rounded-lg text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-secondary)] transition-colors">Cancel</button>
            <button
              onClick={() => onAdd(selected)}
              disabled={selected.length === 0}
              className="h-8 px-4 rounded-lg bg-primary text-white text-[12px] font-medium hover:bg-primary-hover transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
            >
              Add node
            </button>
          </div>
        </div>
      </div>
    </div>,
    document.body,
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
  const [pendingCategoryNode, setPendingCategoryNode] = useState<PendingCategoryNode | null>(null)

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
    setSelectedNode(newNode.id)
    onNodeSelect(newNode.id)
    save()
  }, [addNode, setSelectedNode, onNodeSelect, save])

  const commitCategoryNode = useCallback((pending: PendingCategoryNode, selectedTypes: string[]) => {
    const defs = selectedTypes
      .map((type) => NODE_DEFINITIONS.find((def) => def.type === type))
      .filter((def): def is NodeDefinition => Boolean(def))
    if (!defs.length) return

    const first = defs[0]
    const newNode: Node<NodeData> = {
      id: uuid(),
      type: 'category_node',
      position: pending.position,
      data: {
        label: categoryTitle(pending.category),
        category: pending.category,
        config: {
          ...first.defaultConfig,
          node_category: pending.category,
          operations: defs.map((def) => ({
            type: def.type,
            label: def.label,
            config: { ...def.defaultConfig },
          })),
        },
        status: 'idle',
      },
    }
    addNode(newNode)
    setSelectedNode(newNode.id)
    onNodeSelect(newNode.id)
    save()
  }, [addNode, setSelectedNode, onNodeSelect, save])

  // Drag-and-drop from node panel
  const onDragOver = useCallback((e: React.DragEvent) => {
    e.preventDefault()
    e.dataTransfer.dropEffect = 'move'
  }, [])

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault()
      const nodeType = e.dataTransfer.getData('application/dataflow-node')
      const category = e.dataTransfer.getData('application/dataflow-category') as NodeCategory
      if (!rfRef.current) return

      if (category) {
        const position = rfRef.current.screenToFlowPosition({ x: e.clientX, y: e.clientY })
        setPendingCategoryNode({ category, position })
        return
      }

      if (!nodeType) return

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

  const onNodeDoubleClick = useCallback(
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
        onNodeDoubleClick={onNodeDoubleClick}
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
      {pendingCategoryNode && (
        <CategoryNodeModal
          pending={pendingCategoryNode}
          onAdd={(selectedTypes) => {
            commitCategoryNode(pendingCategoryNode, selectedTypes)
            setPendingCategoryNode(null)
          }}
          onClose={() => setPendingCategoryNode(null)}
        />
      )}
    </>
  )
}

function categoryTitle(category: NodeCategory) {
  if (category === 'source') return 'Data Source'
  if (category === 'preparation') return 'Preparation'
  if (category === 'analysis') return 'Analysis'
  if (category === 'big_data') return 'Big Data'
  if (category === 'utility') return 'Utility'
  if (category === 'visualization') return 'Charts'
  if (category === 'ml') return 'Machine Learning'
  if (category === 'output') return 'Output'
  return 'Node'
}
