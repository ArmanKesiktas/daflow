import { useCallback, useMemo } from 'react'
import { useFlowStore } from '../../store/flowStore'
import { useUpstreamSchema } from '../../hooks/useUpstreamSchema'
import { suggestJoinKeys } from '../../utils/joinSuggestions'
import JoinTypeSelector from './JoinTypeSelector'
import JoinKeyPairList from './JoinKeyPairList'
import JoinPreviewTable from './JoinPreviewTable'
import type { NodeData } from '../../types/workflow'

interface JoinConfigPanelProps {
  nodeId: string
  config: Record<string, unknown>
  onConfigChange: (key: string, value: unknown) => void
}

export default function JoinConfigPanel({ nodeId, config, onConfigChange }: JoinConfigPanelProps) {
  const { nodes, edges, addNode, setEdges } = useFlowStore()
  const leftSchema = useUpstreamSchema(nodeId, 'left_df')
  const rightSchema = useUpstreamSchema(nodeId, 'right_df')

  const how = (config.how as string) || 'inner'
  const keyPairs = (config.keyPairs as Array<{ left: string; right: string }>) || []
  const suffixes = (config.suffixes as [string, string]) || ['_x', '_y']
  const dismissedSuggestions = (config.dismissedSuggestions as Array<{ left: string; right: string }>) || []

  // Auto-suggest
  const suggestions = useMemo(() => {
    if (!leftSchema || !rightSchema) return []
    return suggestJoinKeys(leftSchema, rightSchema, dismissedSuggestions)
  }, [leftSchema, rightSchema, dismissedSuggestions])

  // Get preview data from upstream nodes
  const leftPreviewData = useMemo(() => {
    const edge = edges.find(e => e.target === nodeId && e.targetHandle === 'left_df')
    if (!edge) return null
    const sourceNode = nodes.find(n => n.id === edge.source)
    if (!sourceNode) return null
    const data = sourceNode.data as NodeData
    const preview = data.resultPreview?.preview as Record<string, unknown>[] | undefined
    return preview ?? null
  }, [nodes, edges, nodeId])

  const rightPreviewData = useMemo(() => {
    const edge = edges.find(e => e.target === nodeId && e.targetHandle === 'right_df')
    if (!edge) return null
    const sourceNode = nodes.find(n => n.id === edge.source)
    if (!sourceNode) return null
    const data = sourceNode.data as NodeData
    const preview = data.resultPreview?.preview as Record<string, unknown>[] | undefined
    return preview ?? null
  }, [nodes, edges, nodeId])

  const handleTypeChange = useCallback((type: string) => {
    onConfigChange('how', type)
  }, [onConfigChange])

  const handleAddKeyPair = useCallback(() => {
    onConfigChange('keyPairs', [...keyPairs, { left: '', right: '' }])
  }, [keyPairs, onConfigChange])

  const handleRemoveKeyPair = useCallback((index: number) => {
    onConfigChange('keyPairs', keyPairs.filter((_, i) => i !== index))
  }, [keyPairs, onConfigChange])

  const handleChangeKeyPair = useCallback((index: number, side: 'left' | 'right', value: string) => {
    const updated = keyPairs.map((pair, i) =>
      i === index ? { ...pair, [side]: value } : pair
    )
    onConfigChange('keyPairs', updated)
  }, [keyPairs, onConfigChange])

  const handleAcceptSuggestion = useCallback((left: string, right: string) => {
    onConfigChange('keyPairs', [...keyPairs, { left, right }])
  }, [keyPairs, onConfigChange])

  const handleDismissSuggestion = useCallback((left: string, right: string) => {
    onConfigChange('dismissedSuggestions', [...dismissedSuggestions, { left, right }])
  }, [dismissedSuggestions, onConfigChange])

  const handleAddAnotherTable = useCallback(() => {
    const currentNode = nodes.find(n => n.id === nodeId)
    if (!currentNode) return

    const rightEdge = edges.find(e => e.target === nodeId && e.targetHandle === 'right_df')

    if (!rightEdge) {
      // No right source — add a file upload node connected to right_df
      const newNode = {
        id: crypto.randomUUID(),
        type: 'file_upload',
        position: { x: currentNode.position.x - 260, y: currentNode.position.y + 80 },
        data: {
          label: 'File Upload',
          category: 'source' as const,
          config: {},
          status: 'idle' as const,
        },
      }
      const newEdge = {
        id: crypto.randomUUID(),
        source: newNode.id,
        target: nodeId,
        sourceHandle: 'dataframe',
        targetHandle: 'right_df',
        type: 'smoothstep',
      }
      addNode(newNode)
      setEdges([...edges, newEdge])
    } else {
      // Right is connected — chain a new join node after current
      const newJoinNode = {
        id: crypto.randomUUID(),
        type: 'join_node',
        position: { x: currentNode.position.x + 280, y: currentNode.position.y },
        data: {
          label: 'Join',
          category: 'transformation' as const,
          config: { how: 'inner', keyPairs: [], suffixes: ['_x', '_y'], dismissedSuggestions: [] },
          status: 'idle' as const,
        },
      }
      const newFileNode = {
        id: crypto.randomUUID(),
        type: 'file_upload',
        position: { x: currentNode.position.x + 280, y: currentNode.position.y + 120 },
        data: {
          label: 'File Upload',
          category: 'source' as const,
          config: {},
          status: 'idle' as const,
        },
      }

      // Remove existing outgoing edge from current join if any
      const outEdge = edges.find(e => e.source === nodeId && e.sourceHandle === 'dataframe')
      const filteredEdges = outEdge ? edges.filter(e => e.id !== outEdge.id) : [...edges]

      const newEdges = [
        ...filteredEdges,
        { id: crypto.randomUUID(), source: nodeId, target: newJoinNode.id, sourceHandle: 'dataframe', targetHandle: 'left_df', type: 'smoothstep' },
        { id: crypto.randomUUID(), source: newFileNode.id, target: newJoinNode.id, sourceHandle: 'dataframe', targetHandle: 'right_df', type: 'smoothstep' },
      ]

      // Reconnect old downstream if existed
      if (outEdge) {
        newEdges.push({ id: crypto.randomUUID(), source: newJoinNode.id, target: outEdge.target, sourceHandle: 'dataframe', targetHandle: outEdge.targetHandle || 'dataframe', type: 'smoothstep' })
      }

      addNode(newJoinNode)
      addNode(newFileNode)
      setEdges(newEdges)
    }
  }, [nodes, edges, nodeId, addNode, setEdges])

  const canPreview = useMemo(() => {
    if (how === 'cross') return !!leftPreviewData && !!rightPreviewData
    return !!leftPreviewData && !!rightPreviewData && keyPairs.length > 0 && keyPairs.every(p => p.left && p.right)
  }, [how, leftPreviewData, rightPreviewData, keyPairs])

  return (
    <div className="space-y-4">
      {/* Connection status */}
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${leftSchema ? 'bg-[#30D158]' : 'bg-[var(--color-text-muted)]'}`} />
        <span className="text-[10px] text-[var(--color-text-secondary)]">Left: {leftSchema ? `${leftSchema.length} columns` : 'not connected'}</span>
      </div>
      <div className="flex items-center gap-2">
        <span className={`w-2 h-2 rounded-full ${rightSchema ? 'bg-[#30D158]' : 'bg-[var(--color-text-muted)]'}`} />
        <span className="text-[10px] text-[var(--color-text-secondary)]">Right: {rightSchema ? `${rightSchema.length} columns` : 'not connected'}</span>
      </div>

      {/* Join type selector */}
      <JoinTypeSelector
        value={how as 'inner' | 'left' | 'right' | 'outer' | 'cross'}
        onChange={handleTypeChange}
      />

      {/* Auto-suggest banner */}
      {suggestions.length > 0 && keyPairs.length === 0 && (
        <div className="rounded-lg bg-[#0071E3]/10 border border-[#0071E3]/20 px-3 py-2 space-y-1.5">
          <p className="text-[10px] font-medium text-[#0071E3]">Suggested key pairs</p>
          {suggestions.slice(0, 3).map((s, i) => (
            <div key={i} className="flex items-center justify-between">
              <span className="text-[10px] text-[var(--color-text-secondary)]">
                {s.left} = {s.right}
                <span className="ml-1 text-[var(--color-text-muted)]">({s.confidence})</span>
              </span>
              <div className="flex gap-1">
                <button
                  onClick={() => handleAcceptSuggestion(s.left, s.right)}
                  className="text-[10px] text-[#0071E3] hover:underline"
                >
                  Use
                </button>
                <button
                  onClick={() => handleDismissSuggestion(s.left, s.right)}
                  className="text-[10px] text-[var(--color-text-muted)] hover:text-[#FF453A]"
                >
                  ✕
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Key pair list */}
      <JoinKeyPairList
        keyPairs={keyPairs}
        leftSchema={leftSchema}
        rightSchema={rightSchema}
        joinType={how}
        onAdd={handleAddKeyPair}
        onRemove={handleRemoveKeyPair}
        onChange={handleChangeKeyPair}
      />

      {/* Preview */}
      <JoinPreviewTable
        leftData={leftPreviewData}
        rightData={rightPreviewData}
        how={how}
        keyPairs={keyPairs}
        suffixes={suffixes}
        canPreview={canPreview}
      />

      {/* Add another table */}
      <button
        onClick={handleAddAnotherTable}
        className="w-full h-8 rounded-lg border border-dashed border-[var(--color-border-default)] text-[11px] font-medium text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:border-[var(--color-text-muted)] transition-colors"
      >
        + Add another table
      </button>
    </div>
  )
}
