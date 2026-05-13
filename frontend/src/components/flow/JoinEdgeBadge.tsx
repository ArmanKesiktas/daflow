import { useState } from 'react'
import { useFlowStore } from '../../store/flowStore'
import type { NodeData } from '../../types/workflow'

interface JoinEdgeBadgeProps {
  /** The join node ID this edge connects to */
  joinNodeId: string
  /** Position on the edge (CSS) */
  style?: React.CSSProperties
}

const JOIN_TYPE_ICONS: Record<string, string> = {
  inner: '∩',
  left: '⊃',
  right: '⊂',
  outer: '∪',
  cross: '×',
}

/**
 * Small badge displayed on edges connecting to a JoinNode.
 * Shows the join type icon and a tooltip with key columns on hover.
 */
export default function JoinEdgeBadge({ joinNodeId, style }: JoinEdgeBadgeProps) {
  const nodes = useFlowStore(s => s.nodes)
  const [hovered, setHovered] = useState(false)

  const joinNode = nodes.find(n => n.id === joinNodeId)
  if (!joinNode || joinNode.type !== 'join_node') return null

  const data = joinNode.data as NodeData
  const config = data.config as Record<string, unknown>
  const how = (config.how as string) || 'inner'
  const keyPairs = (config.keyPairs as Array<{ left: string; right: string }>) || []
  const icon = JOIN_TYPE_ICONS[how] || '⋈'

  return (
    <div
      className="relative inline-flex"
      style={style}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <span className="w-5 h-5 rounded-full bg-[#FF9F0A]/20 border border-[#FF9F0A]/30 flex items-center justify-center text-[10px] font-bold text-[#FF9F0A] cursor-default">
        {icon}
      </span>

      {/* Tooltip */}
      {hovered && (
        <div className="absolute bottom-full left-1/2 -translate-x-1/2 mb-1 px-2.5 py-1.5 rounded-lg bg-[#1C1C1E] text-white shadow-lg z-50 whitespace-nowrap pointer-events-none">
          <p className="text-[10px] font-medium mb-0.5">{how.toUpperCase()} Join</p>
          {keyPairs.length > 0 ? (
            <div className="space-y-0.5">
              {keyPairs.map((p, i) => (
                <p key={i} className="text-[9px] text-white/70">
                  {p.left} = {p.right}
                </p>
              ))}
            </div>
          ) : (
            <p className="text-[9px] text-white/50">No keys configured</p>
          )}
        </div>
      )}
    </div>
  )
}
