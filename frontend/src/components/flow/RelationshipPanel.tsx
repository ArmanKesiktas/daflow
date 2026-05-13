import { useState, useMemo, useCallback } from 'react'
import { useFlowStore } from '../../store/flowStore'
import type { NodeData, ColumnMeta } from '../../types/workflow'

interface RelationshipEntity {
  nodeId: string
  label: string
  columns: ColumnMeta[]
}

interface RelationshipEdge {
  sourceNodeId: string
  targetNodeId: string
  joinNodeId: string
  joinType: string
  keyPairs: Array<{ left: string; right: string }>
}

interface RelationshipPanelProps {
  onSelectNode?: (nodeId: string) => void
}

export default function RelationshipPanel({ onSelectNode }: RelationshipPanelProps) {
  const { nodes, edges } = useFlowStore()
  const [hoveredEntity, setHoveredEntity] = useState<string | null>(null)

  const { entities, relationships } = useMemo(() => {
    const entityMap = new Map<string, RelationshipEntity>()
    const rels: RelationshipEdge[] = []

    // Find all source nodes
    for (const node of nodes) {
      if (node.type === 'file_upload' || node.type === 'database_query') {
        const data = node.data as NodeData
        entityMap.set(node.id, {
          nodeId: node.id,
          label: data.label || data.filename as string || 'Source',
          columns: data.columns ?? [],
        })
      }
    }

    // Find all join nodes and trace connections
    for (const node of nodes) {
      if (node.type === 'join_node') {
        const data = node.data as NodeData
        const config = data.config as Record<string, unknown>
        const leftEdge = edges.find(e => e.target === node.id && e.targetHandle === 'left_df')
        const rightEdge = edges.find(e => e.target === node.id && e.targetHandle === 'right_df')

        if (leftEdge && rightEdge) {
          rels.push({
            sourceNodeId: leftEdge.source,
            targetNodeId: rightEdge.source,
            joinNodeId: node.id,
            joinType: (config.how as string) || 'inner',
            keyPairs: (config.keyPairs as Array<{ left: string; right: string }>) || [],
          })
        }
      }
    }

    return { entities: Array.from(entityMap.values()), relationships: rels }
  }, [nodes, edges])

  const handleEntityClick = useCallback((nodeId: string) => {
    onSelectNode?.(nodeId)
  }, [onSelectNode])

  const handleRelClick = useCallback((joinNodeId: string) => {
    onSelectNode?.(joinNodeId)
  }, [onSelectNode])

  if (entities.length === 0) {
    return (
      <div className="p-4 text-center">
        <p className="text-[11px] text-[var(--color-text-muted)]">No data sources in workflow.</p>
      </div>
    )
  }

  return (
    <div className="p-3 space-y-3">
      <h3 className="text-[11px] font-semibold text-[var(--color-text-primary)] uppercase tracking-wider">
        Relationships
      </h3>

      {/* Entity boxes */}
      <div className="space-y-2">
        {entities.map(entity => (
          <div
            key={entity.nodeId}
            className="relative rounded-lg border border-[var(--color-border-default)] bg-[var(--color-secondary)] px-3 py-2 cursor-pointer hover:border-[#0071E3]/50 transition-colors"
            onClick={() => handleEntityClick(entity.nodeId)}
            onMouseEnter={() => setHoveredEntity(entity.nodeId)}
            onMouseLeave={() => setHoveredEntity(null)}
          >
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded bg-[#0071E3]/20 text-[#0071E3] flex items-center justify-center text-[10px] font-bold">
                T
              </span>
              <span className="text-[11px] font-medium text-[var(--color-text-primary)] truncate">
                {entity.label}
              </span>
              <span className="text-[10px] text-[var(--color-text-muted)] ml-auto">
                {entity.columns.length} cols
              </span>
            </div>

            {/* Column tooltip on hover */}
            {hoveredEntity === entity.nodeId && entity.columns.length > 0 && (
              <div className="absolute left-full top-0 ml-2 z-50 bg-[#1C1C1E] text-white rounded-lg px-3 py-2 shadow-lg min-w-[140px]">
                <p className="text-[10px] font-medium mb-1 text-white/70">Columns</p>
                {entity.columns.slice(0, 8).map(col => (
                  <div key={col.name} className="text-[10px] py-0.5 flex justify-between gap-2">
                    <span className="truncate">{col.name}</span>
                    <span className="text-white/50 flex-shrink-0">{col.type}</span>
                  </div>
                ))}
                {entity.columns.length > 8 && (
                  <p className="text-[10px] text-white/40 mt-1">+{entity.columns.length - 8} more</p>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Relationship lines */}
      {relationships.length > 0 && (
        <div className="space-y-1.5">
          <p className="text-[10px] font-medium text-[var(--color-text-muted)] uppercase tracking-wider">Joins</p>
          {relationships.map((rel, i) => {
            const leftEntity = entities.find(e => e.nodeId === rel.sourceNodeId)
            const rightEntity = entities.find(e => e.nodeId === rel.targetNodeId)
            return (
              <div
                key={i}
                className="rounded-lg border border-[var(--color-border-subtle)] px-3 py-2 cursor-pointer hover:border-[#FF9F0A]/50 transition-colors"
                onClick={() => handleRelClick(rel.joinNodeId)}
              >
                <div className="flex items-center gap-1.5 text-[10px]">
                  <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[60px]">
                    {leftEntity?.label || '?'}
                  </span>
                  <span className="px-1.5 py-0.5 rounded bg-[#FF9F0A]/15 text-[#FF9F0A] font-medium text-[9px] uppercase">
                    {rel.joinType}
                  </span>
                  <span className="text-[var(--color-text-primary)] font-medium truncate max-w-[60px]">
                    {rightEntity?.label || '?'}
                  </span>
                </div>
                {rel.keyPairs.length > 0 && (
                  <div className="mt-1 text-[9px] text-[var(--color-text-muted)]">
                    {rel.keyPairs.map(p => `${p.left}=${p.right}`).join(', ')}
                  </div>
                )}
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
