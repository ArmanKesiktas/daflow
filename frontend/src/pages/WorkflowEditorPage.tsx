import { useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from '../components/flow/FlowCanvas'
import Toolbar from '../components/flow/Toolbar'
import NodePanel from '../components/panels/NodePanel'
import ConfigPanel from '../components/panels/ConfigPanel'
import ResultsPanel from '../components/panels/ResultsPanel'
import AIInsightsModal from '../components/AIInsightsModal'
import { useFlowStore } from '../store/flowStore'
import { useExecutionStore } from '../store/executionStore'
import { useExecutionStream } from '../hooks/useExecutionStream'
import { workflowsApi } from '../api/workflows'
import { executionsApi } from '../api/executions'
import toast from 'react-hot-toast'
import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

export default function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>()
  const { nodes, loadGraph, setWorkflowId, setWorkflowName } = useFlowStore()
  const { executionId, isRunning, status, setExecutionId, reset: resetExecution } = useExecutionStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

  // AI Insights modal state
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const prevRunningRef = useRef(false)

  // Stream execution status via SSE
  useExecutionStream(executionId)

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

  // Auto-show AI Insights modal when execution completes and an ai_insights node exists
  useEffect(() => {
    const wasRunning = prevRunningRef.current
    prevRunningRef.current = isRunning

    // Transition: running → stopped (done / success / error)
    if (wasRunning && !isRunning && executionId && status?.status === 'success') {
      const aiNode = nodes.find((n) => n.data?.node_type === 'ai_insights')
      if (!aiNode) return

      executionsApi.getNodeResult(executionId, aiNode.id)
        .then((result) => {
          const insights = (result?.output as Record<string, unknown>)?.insights
          if (typeof insights === 'string' && insights.trim()) {
            setAiInsights(insights)
          }
        })
        .catch(() => {/* silently ignore */})
    }
  }, [isRunning, executionId, status, nodes])

  const handleRunComplete = (execId: string) => {
    resetExecution()
    setExecutionId(execId)
  }

  return (
    <ReactFlowProvider>
      <div className="flex flex-col h-screen bg-[#F5F5F7] dark:bg-[#111113]">
        <Toolbar onRunComplete={handleRunComplete} />

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

      {/* AI Insights modal — shown automatically when execution completes */}
      {aiInsights && (
        <AIInsightsModal
          insights={aiInsights}
          onClose={() => setAiInsights(null)}
        />
      )}
    </ReactFlowProvider>
  )
}
