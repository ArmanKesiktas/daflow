import { memo } from 'react'
import { NodeResizer, type NodeProps, type Node } from '@xyflow/react'

// ── Types ─────────────────────────────────────────────────────────────────────

export type ProcessAreaColor = 'blue' | 'green' | 'orange' | 'purple' | 'gray'

export interface ProcessAreaData extends Record<string, unknown> {
  title: string
  description: string
  color: ProcessAreaColor
  width: number
  height: number
}

// ── Color palette ─────────────────────────────────────────────────────────────

const colorStyles: Record<ProcessAreaColor, { bg: string; border: string; titleBg: string }> = {
  blue: {
    bg: 'rgba(0, 113, 227, 0.08)',
    border: 'rgba(0, 113, 227, 0.3)',
    titleBg: 'rgba(0, 113, 227, 0.12)',
  },
  green: {
    bg: 'rgba(48, 209, 88, 0.08)',
    border: 'rgba(48, 209, 88, 0.3)',
    titleBg: 'rgba(48, 209, 88, 0.12)',
  },
  orange: {
    bg: 'rgba(255, 159, 10, 0.08)',
    border: 'rgba(255, 159, 10, 0.3)',
    titleBg: 'rgba(255, 159, 10, 0.12)',
  },
  purple: {
    bg: 'rgba(94, 92, 230, 0.08)',
    border: 'rgba(94, 92, 230, 0.3)',
    titleBg: 'rgba(94, 92, 230, 0.12)',
  },
  gray: {
    bg: 'rgba(142, 142, 147, 0.08)',
    border: 'rgba(142, 142, 147, 0.3)',
    titleBg: 'rgba(142, 142, 147, 0.12)',
  },
}

// ── Minimum dimensions ────────────────────────────────────────────────────────

const MIN_WIDTH = 200
const MIN_HEIGHT = 150

// ── Component ─────────────────────────────────────────────────────────────────

export const ProcessAreaNode = memo(function ProcessAreaNode({
  data,
  selected,
}: NodeProps<Node<ProcessAreaData>>) {
  const color = data.color && colorStyles[data.color] ? data.color : 'gray'
  const styles = colorStyles[color]

  return (
    <div
      className="rounded-xl pointer-events-auto w-full h-full"
      style={{
        backgroundColor: styles.bg,
        border: `1.5px dashed ${styles.border}`,
        zIndex: -1,
        position: 'relative',
      }}
    >
      {/* Resize handles — visible when selected */}
      <NodeResizer
        isVisible={selected}
        minWidth={MIN_WIDTH}
        minHeight={MIN_HEIGHT}
        lineStyle={{ borderColor: styles.border, borderWidth: 1 }}
        handleStyle={{
          width: 8,
          height: 8,
          borderRadius: 2,
          backgroundColor: styles.border.replace('0.3)', '0.8)'),
          border: 'none',
        }}
      />

      {/* Title bar — draggable area */}
      <div
        className="drag-handle flex items-center gap-2 px-3 py-2 rounded-t-xl cursor-grab active:cursor-grabbing"
        style={{ backgroundColor: styles.titleBg }}
      >
        <span
          className="text-[12px] font-semibold truncate select-none"
          style={{ color: styles.border.replace('0.3)', '0.9)') }}
        >
          {data.title || 'Process Area'}
        </span>
      </div>

      {/* Description */}
      {data.description && (
        <div className="px-3 py-1.5">
          <span className="text-[11px] text-[var(--color-text-muted)] leading-tight">
            {data.description}
          </span>
        </div>
      )}
    </div>
  )
})
