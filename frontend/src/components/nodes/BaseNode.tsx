import { memo, type ReactNode } from 'react'
import type { NodeStatus, NodeCategory } from '../../types/workflow'

interface BaseNodeProps {
  label: string
  icon: string
  status: NodeStatus
  color: string   // accent color class (unused now — kept for compat)
  category?: NodeCategory
  children?: ReactNode
  selected?: boolean
  note?: string
}

const statusBorder: Record<NodeStatus, string> = {
  idle:    'border-black/[0.10] dark:border-white/[0.10]',
  running: 'border-[#0071E3]/60 shadow-[0_0_0_3px_rgba(0,113,227,0.12)]',
  success: 'border-[#30D158]/50 shadow-[0_0_0_3px_rgba(48,209,88,0.10)]',
  error:   'border-[#FF453A]/50 shadow-[0_0_0_3px_rgba(255,69,58,0.10)]',
}

const statusDot: Record<NodeStatus, string> = {
  idle:    'bg-black/20 dark:bg-white/20',
  running: 'bg-[#0071E3] animate-pulse',
  success: 'bg-[#30D158]',
  error:   'bg-[#FF453A]',
}

const categoryIconBg: Record<string, string> = {
  source:         'bg-[#0071E3]',
  preparation:    'bg-[#F5A623]',
  transformation: 'bg-[#FF9F0A]',
  analysis:       'bg-[#30D158]',
  visualization:  'bg-[#5E5CE6]',
  ml:             'bg-[#FF6B6B]',
  output:         'bg-[#BF5AF2]',
}

export const BaseNode = memo(function BaseNode({
  label, icon, status, category, children, selected, note,
}: BaseNodeProps) {
  const iconBg = category ? (categoryIconBg[category] ?? 'bg-black/[0.06] dark:bg-white/[0.07]') : 'bg-black/[0.06] dark:bg-white/[0.07]'
  const iconText = category ? 'text-white' : 'text-[#1d1d1f]/50 dark:text-white/50'

  return (
    <div
      className={`
        w-[196px] rounded-2xl border transition-all duration-150
        shadow-[0_4px_20px_rgba(0,0,0,0.10)] dark:shadow-[0_8px_32px_rgba(0,0,0,0.45)]
        ${selected
          ? 'border-[#0071E3] bg-white dark:bg-[#1C1C1E] shadow-[0_0_0_3px_rgba(0,113,227,0.22),0_4px_20px_rgba(0,0,0,0.10)]'
          : `bg-white/95 dark:bg-[#1C1C1E]/95 backdrop-blur-xl ${statusBorder[status]}`}
      `}
    >
      {/* Header */}
      <div className="flex items-center gap-2.5 px-3.5 py-3">
        <span className={`w-7 h-7 rounded-xl flex items-center justify-center text-[12px] font-semibold flex-shrink-0 ${iconBg} ${iconText}`}>
          {icon}
        </span>
        <span className="text-[12px] font-semibold text-[#1d1d1f]/85 dark:text-white/85 truncate flex-1 leading-tight">{label}</span>
        <span className={`w-2 h-2 rounded-full flex-shrink-0 ${statusDot[status]}`} />
      </div>
      {/* Body */}
      {children && (
        <div className="px-3.5 pb-3 text-[11px] text-[#1d1d1f]/35 dark:text-white/35 space-y-0.5 border-t border-black/[0.05] dark:border-white/[0.05] pt-2">
          {children}
        </div>
      )}
      {/* Note */}
      {note && (
        <div className="px-3 pb-2.5 pt-0">
          <div className="text-[10px] text-[#1d1d1f]/55 dark:text-white/55 bg-[#F5A623]/12 dark:bg-[#F5A623]/10 border border-[#F5A623]/25 rounded-lg px-2.5 py-1.5 leading-relaxed">
            📝 {note}
          </div>
        </div>
      )}
    </div>
  )
})

