import { useEffect, useMemo, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from '../components/flow/FlowCanvas'
import Toolbar from '../components/flow/Toolbar'
import NodePanel from '../components/panels/NodePanel'
import ConfigPanel from '../components/panels/ConfigPanel'
import ResultsPanel from '../components/panels/ResultsPanel'
import PageTour from '../components/PageTour'
import { useFlowStore } from '../store/flowStore'
import { useExecutionStore } from '../store/executionStore'
import { useExecutionStream } from '../hooks/useExecutionStream'
import { workflowsApi } from '../api/workflows'
import { createWorkflowTemplates, type WorkflowTemplate } from '../utils/workflowTemplates'
import { useI18n } from '../i18n'
import toast from 'react-hot-toast'
import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

export default function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>()
  const { loadGraph, setWorkflowId, setWorkflowName, undo, redo } = useFlowStore()
  const { executionId, setExecutionId, reset: resetExecution } = useExecutionStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)
  const [showTemplates, setShowTemplates] = useState(false)

  // Stream execution status via SSE
  useExecutionStream(executionId)

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null
      if (target && ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName)) return
      if (!(event.metaKey || event.ctrlKey)) return
      const key = event.key.toLowerCase()
      if (key === 'z' && !event.shiftKey) {
        event.preventDefault()
        undo()
      }
      if (key === 'y' || (key === 'z' && event.shiftKey)) {
        event.preventDefault()
        redo()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [undo, redo])

  // Load workflow on mount
  useEffect(() => {
    if (!workflowId) return
    setWorkflowId(workflowId)
    workflowsApi.get(workflowId).then((wf) => {
      setWorkflowName(wf.name)
      loadGraph(wf.nodes as Node<NodeData>[], wf.edges as any, wf.viewport)
    }).catch(() => {
      toast.error('Failed to load workflow')
    })
  }, [workflowId])

  const handleRunComplete = (execId: string) => {
    resetExecution()
    setExecutionId(execId)
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-[#F5F5F7] dark:bg-[#111113]">
        <Toolbar onRunComplete={handleRunComplete} onOpenTemplates={() => setShowTemplates(true)} />

        <div className="flex flex-1 overflow-hidden">
          {/* Left: Node palette */}
          <NodePanel collapsed={!leftOpen} onToggle={() => setLeftOpen((v) => !v)} />

          {/* Center: Flow canvas */}
          <div className="flex-1 flex flex-col overflow-hidden">
            <div className="flex-1">
              <FlowCanvas onNodeSelect={setSelectedNodeId} />
            </div>
            {/* Bottom: Results panel */}
            <ResultsPanel executionId={executionId} selectedNodeId={selectedNodeId} />
          </div>

          {/* Right: Config panel */}
          <ConfigPanel nodeId={selectedNodeId} collapsed={!rightOpen} onToggle={() => setRightOpen((v) => !v)} />
        </div>
      </div>
      {showTemplates && <TemplatePickerModal onClose={() => setShowTemplates(false)} />}
      <PageTour />
    </ReactFlowProvider>
  )
}

function TemplatePickerModal({ onClose }: { onClose: () => void }) {
  const templates = useMemo(() => createWorkflowTemplates(), [])
  const [selectedId, setSelectedId] = useState(templates[0]?.id ?? '')
  const [applying, setApplying] = useState(false)
  const { workflowId, loadGraph, setWorkflowName } = useFlowStore()
  const { lang } = useI18n()
  const tr = lang === 'tr'

  const selected = templates.find((template) => template.id === selectedId) ?? templates[0]

  const applyTemplate = async () => {
    if (!selected || !workflowId) return
    setApplying(true)
    loadGraph(selected.nodes, selected.edges, selected.viewport)
    setWorkflowName(selected.name)
    try {
      await workflowsApi.save(workflowId, {
        name: selected.name,
        nodes: selected.nodes,
        edges: selected.edges,
        viewport: selected.viewport,
      })
      toast.success(tr ? 'Template uygulandı' : 'Template applied')
      onClose()
    } catch {
      toast.error(tr ? 'Template uygulanamadı' : 'Failed to apply template')
      setApplying(false)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative w-full max-w-2xl mx-4 rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-white dark:bg-[#1C1C1E] shadow-2xl overflow-hidden">
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06]">
          <h2 className="text-[17px] font-semibold text-[#1d1d1f] dark:text-white">{tr ? 'Şablonlar' : 'Templates'}</h2>
          <p className="text-[12px] text-[#1d1d1f]/40 dark:text-white/40 mt-1">
            {tr ? 'Mevcut canvas\'a hazır bir workflow uygulayın. Bu, mevcut grafiği değiştirir.' : 'Apply a ready workflow to the current canvas. This replaces the current graph.'}
          </p>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 p-4 max-h-[420px] overflow-y-auto">
          {templates.map((template: WorkflowTemplate) => (
            <button
              key={template.id}
              onClick={() => setSelectedId(template.id)}
              className={`flex items-start gap-3 rounded-xl border p-3 text-left transition-all ${
                selectedId === template.id
                  ? 'border-[#0071E3] bg-[#0071E3]/10'
                  : 'border-black/[0.07] dark:border-white/[0.08] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
              }`}
            >
              <span className={`w-8 h-8 rounded-lg ${template.accent} text-white flex items-center justify-center text-[13px] font-semibold flex-shrink-0`}>
                {template.icon}
              </span>
              <span className="min-w-0">
                <span className="block text-[13px] font-medium text-[#1d1d1f] dark:text-white">{template.name}</span>
                <span className="block text-[11px] leading-snug text-[#1d1d1f]/40 dark:text-white/40 mt-0.5">{template.description}</span>
                <span className="block text-[10px] text-[#1d1d1f]/25 dark:text-white/25 mt-2">{template.nodes.length} nodes</span>
              </span>
            </button>
          ))}
        </div>
        <div className="px-6 py-4 border-t border-black/[0.06] dark:border-white/[0.06] flex items-center justify-end gap-2">
          <button
            onClick={onClose}
            className="h-8 px-4 rounded-lg text-[12px] text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.06] dark:hover:bg-white/[0.07]"
          >
            {tr ? 'İptal' : 'Cancel'}
          </button>
          <button
            onClick={applyTemplate}
            disabled={applying || !selected}
            className="h-8 px-5 rounded-lg text-[12px] font-medium bg-[#0071E3] hover:bg-[#0077ED] text-white disabled:opacity-50"
          >
            {applying ? (tr ? 'Uygulanıyor...' : 'Applying...') : (tr ? 'Şablonu Uygula' : 'Apply Template')}
          </button>
        </div>
      </div>
    </div>
  )
}
