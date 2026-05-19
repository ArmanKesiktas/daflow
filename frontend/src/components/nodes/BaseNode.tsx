import { memo, type ReactNode } from 'react'
import type { NodeStatus, NodeCategory } from '../../types/workflow'
import { NodeContextMenu, type NodeContextMenuProps } from '../flow/NodeContextMenu'

interface BaseNodeProps {
  label: string
  icon: string
  status: NodeStatus
  color: string   // accent color class (unused now — kept for compat)
  category?: NodeCategory
  children?: ReactNode
  selected?: boolean
  note?: string
  error_message?: unknown
  cached?: unknown
  /** When true, node renders at 40% opacity to indicate disabled state */
  disabled?: boolean
  /** Context menu callbacks — when provided and node is selected, three-dot menu appears */
  contextMenu?: NodeContextMenuProps
}

const statusBorder: Record<NodeStatus, string> = {
  idle:    'border-[var(--color-border-default)]',
  pending: 'border-[var(--color-text-muted)] shadow-[0_0_0_3px_rgba(142,142,147,0.10)]',
  running: 'border-primary/60 shadow-[0_0_0_3px_rgba(0,113,227,0.12)]',
  success: 'border-[#30D158] shadow-[0_0_0_4px_rgba(48,209,88,0.20),0_10px_28px_rgba(48,209,88,0.12)]',
  error:   'border-[#FF453A]/50 shadow-[0_0_0_3px_rgba(255,69,58,0.10)]',
  cancelled: 'border-[#FF9F0A]/50 shadow-[0_0_0_3px_rgba(255,159,10,0.10)]',
}

/** Maps node execution status to CSS animation class */
export const statusAnimation: Record<NodeStatus, string> = {
  idle:      '',
  pending:   'animate-node-pulse-blue',
  running:   'animate-node-pulse-blue',
  success:   'animate-node-glow-green',
  error:     'animate-node-glow-red',
  cancelled: 'animate-node-glow-orange',
}

const statusDot: Record<NodeStatus, string> = {
  idle:    'bg-[var(--color-text-muted)]',
  pending: 'bg-[#8E8E93] animate-pulse',
  running: 'bg-[var(--color-primary)] animate-pulse',
  success: 'bg-[#30D158] shadow-[0_0_0_3px_rgba(48,209,88,0.18)]',
  error:   'bg-[#FF453A]',
  cancelled: 'bg-[#FF9F0A]',
}

const categoryIconBg: Record<string, string> = {
  source:      'bg-[#0071E3]',
  preparation: 'bg-[#F5A623]',
  transformation: 'bg-[#FF9F0A]',
  analysis:    'bg-[#30D158]',
  big_data:    'bg-[#00A6A6]',
  utility:     'bg-[#8E8E93]',
  visualization: 'bg-[#5E5CE6]',
  ml:          'bg-[#FF6B6B]',
  output:      'bg-[#BF5AF2]',
}

/** Maps each node category to its CSS shape class (see index.css for definitions) */
export const categoryShapeMap: Record<NodeCategory, string> = {
  source:         'shape-rounded-rect',
  preparation:    'shape-clipped-corner',
  analysis:       'shape-hexagon',
  ml:             'shape-chip',
  visualization:  'shape-wide-card',
  output:         'shape-right-emphasis',
  utility:        'shape-terminal',
  big_data:       'shape-rounded-rect',
  transformation: 'shape-rounded-rect',
}

export const BaseNode = memo(function BaseNode({
  label, icon, status, category, children, selected, note, error_message, cached, disabled, contextMenu,
}: BaseNodeProps) {
  const iconBg = category ? (categoryIconBg[category] ?? 'bg-[var(--color-secondary)]') : 'bg-[var(--color-secondary)]'
  const iconText = category ? 'text-white' : 'text-[var(--color-text-secondary)]'

  const animationClass = statusAnimation[status] ?? ''
  const shapeClass = category ? categoryShapeMap[category] : 'shape-rounded-rect'

  return (
    <div
      className={`
        min-w-[168px] rounded-2xl border bg-[#ffffff]/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl
        shadow-lg dark:shadow-xl transition-all duration-150
        ${shapeClass}
        ${statusBorder[status]}
        ${animationClass}
        ${selected ? 'shadow-[0_0_0_3px_rgba(0,113,227,0.20)] dark:shadow-[0_0_0_3px_rgba(255,255,255,0.12)]' : ''}
        ${disabled ? 'opacity-40' : ''}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2 px-3 py-2.5">
        <span className={`w-6 h-6 rounded-lg flex items-center justify-center text-[11px] font-semibold flex-shrink-0 ${iconBg} ${iconText}`}>
          {icon}
        </span>
        <span className="text-[12px] font-medium text-[#1d1d1f] dark:text-white truncate flex-1 leading-tight">{label}</span>
        {selected && contextMenu ? (
          <NodeContextMenu {...contextMenu} />
        ) : (
          <span className={`w-1.5 h-1.5 rounded-full flex-shrink-0 ${statusDot[status]}`} />
        )}
      </div>
      {/* Body */}
      {Boolean(children || note || error_message || cached) && (
        <div className="px-3 pb-2.5 text-[11px] text-[var(--color-text-muted)] space-y-0.5 border-t border-[var(--color-border-subtle)] pt-2">
          {children}
          {note && <div className="truncate text-[var(--color-text-muted)]">{note}</div>}
          {cached ? <div className="text-[#30D158]">cached</div> : null}
          {error_message ? <div className="truncate text-[#FF453A]">{String(error_message)}</div> : null}
        </div>
      )}
    </div>
  )
})
