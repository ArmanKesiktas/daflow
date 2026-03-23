import { useEffect, useState } from 'react'
import { useParams } from 'react-router-dom'
import { ReactFlowProvider } from '@xyflow/react'
import FlowCanvas from '../components/flow/FlowCanvas'
import Toolbar from '../components/flow/Toolbar'
import NodePanel from '../components/panels/NodePanel'
import ConfigPanel from '../components/panels/ConfigPanel'
import ResultsPanel from '../components/panels/ResultsPanel'
import { useFlowStore } from '../store/flowStore'
import { useExecutionStore } from '../store/executionStore'
import { useExecutionStream } from '../hooks/useExecutionStream'
import { workflowsApi } from '../api/workflows'
import toast from 'react-hot-toast'
import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

export default function WorkflowEditorPage() {
  const { workflowId } = useParams<{ workflowId: string }>()
  const { loadGraph, setWorkflowId, setWorkflowName } = useFlowStore()
  const { executionId, setExecutionId, reset: resetExecution } = useExecutionStore()
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null)
  const [leftOpen, setLeftOpen] = useState(true)
  const [rightOpen, setRightOpen] = useState(true)

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
    </ReactFlowProvider>
  )
}
