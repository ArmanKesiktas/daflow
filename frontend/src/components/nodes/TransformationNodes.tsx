import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'

type PopupPos = { top: number; left: number }
type RawOutput = Record<string, unknown>

function TransformPopup({ title, pos, children }: { title: string; pos: PopupPos; children: React.ReactNode }) {
  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-80 bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-4 pointer-events-none -translate-y-1/2"
    >
      <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white mb-3">{title}</h4>
      <div className="max-h-60 overflow-hidden">
        {children}
      </div>
    </div>,
    document.body,
  )
}

function KVRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
      <span className="text-[11px] text-[#1d1d1f]/50 dark:text-white/50">{label}</span>
      <span className="text-[11px] font-medium text-[#1d1d1f]/80 dark:text-white/80">{String(value)}</span>
    </div>
  )
}

function renderNormalize(output: RawOutput, pos: PopupPos) {
  const s = output.normalize_summary as Record<string, unknown> | undefined
  if (!s) return null
  const cols = (s.columns_normalised as string[]) ?? []
  return (
    <TransformPopup title="Normalize" pos={pos}>
      <KVRow label="Method" value={String(s.method ?? '—')} />
      <KVRow label="Columns" value={cols.length > 0 ? cols.slice(0, 4).join(', ') + (cols.length > 4 ? '…' : '') : 'All numeric'} />
      <KVRow label="Columns processed" value={cols.length} />
    </TransformPopup>
  )
}

function renderEncode(output: RawOutput, pos: PopupPos) {
  const s = output.encode_summary as Record<string, unknown> | undefined
  if (!s) return null
  const method = String(s.method ?? '—')
  const cols = (s.encoded_columns as string[]) ?? []
  const newCols = (s.new_columns as string[]) ?? []
  return (
    <TransformPopup title="Encode" pos={pos}>
      <KVRow label="Method" value={method} />
      <KVRow label="Columns encoded" value={cols.length} />
      {method === 'onehot' && <KVRow label="New columns created" value={newCols.length} />}
      {cols.slice(0, 5).map((col) => (
        <div key={col} className="py-0.5 text-[11px] text-[#1d1d1f]/60 dark:text-white/60">{col}</div>
      ))}
    </TransformPopup>
  )
}

function renderPivot(output: RawOutput, pos: PopupPos) {
  const s = output.pivot_summary as Record<string, unknown> | undefined
  if (!s) return null
  const shape = (s.output_shape as number[]) ?? [0, 0]
  return (
    <TransformPopup title="Pivot Table" pos={pos}>
      <KVRow label="Index" value={String(s.index ?? '—')} />
      <KVRow label="Columns" value={String(s.columns ?? '—')} />
      <KVRow label="Values" value={String(s.values ?? '—')} />
      <KVRow label="Aggregation" value={String(s.aggfunc ?? '—')} />
      <KVRow label="Output shape" value={`${shape[0]} × ${shape[1]}`} />
    </TransformPopup>
  )
}

function renderGroupBy(output: RawOutput, pos: PopupPos) {
  const s = output.group_by_summary as Record<string, unknown> | undefined
  if (!s) return null
  const groupCols = (s.group_by_columns as string[]) ?? []
  return (
    <TransformPopup title="Group By" pos={pos}>
      <KVRow label="Group columns" value={groupCols.join(', ') || '—'} />
      <KVRow label="Input rows" value={String(s.input_rows ?? '—')} />
      <KVRow label="Output groups" value={String(s.output_rows ?? '—')} />
    </TransformPopup>
  )
}

function renderColumnOps(output: RawOutput, pos: PopupPos) {
  const s = output.column_ops_summary as Record<string, unknown> | undefined
  if (!s) return null
  return (
    <TransformPopup title="Column Ops" pos={pos}>
      <KVRow label="Operation" value={String(s.operation ?? '—')} />
      <KVRow label="Cols before" value={String(s.cols_before ?? '—')} />
      <KVRow label="Cols after" value={String(s.cols_after ?? '—')} />
    </TransformPopup>
  )
}

function renderCustomPython(output: RawOutput, pos: PopupPos) {
  const s = output.custom_python_summary as Record<string, unknown> | undefined
  if (!s) return null
  const inShape  = (s.input_shape  as number[]) ?? [0, 0]
  const outShape = (s.output_shape as number[]) ?? [0, 0]
  return (
    <TransformPopup title="Custom Python" pos={pos}>
      <KVRow label="Input shape"  value={`${inShape[0]} × ${inShape[1]}`} />
      <KVRow label="Output shape" value={`${outShape[0]} × ${outShape[1]}`} />
      <KVRow label="Code lines"   value={String(s.code_lines ?? '—')} />
    </TransformPopup>
  )
}

function renderJoin(output: RawOutput, pos: PopupPos) {
  const s = output.join_summary as Record<string, unknown> | undefined
  if (!s) return null
  return (
    <TransformPopup title="Join" pos={pos}>
      <KVRow label="How" value={String(s.how ?? '—')} />
      <KVRow label="Join key" value={String(s.on ?? s.left_on ?? '—')} />
      <KVRow label="Left rows" value={String(s.left_rows ?? '—')} />
      <KVRow label="Right rows" value={String(s.right_rows ?? '—')} />
      <KVRow label="Output rows" value={String(s.output_rows ?? '—')} />
    </TransformPopup>
  )
}

type PopupRender = (output: RawOutput, pos: PopupPos) => React.ReactNode

function TransformNodeFactory(icon: string, renderPopup?: PopupRender) {
  return memo(function TransformNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const executionId = useExecutionStore((s) => s.executionId)
    const method = (data.config as { method?: string }).method

    const [nodeOutput, setNodeOutput] = useState<RawOutput | null>(null)
    const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const nodeRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = useCallback(async () => {
      if (!executionId || data.status !== 'success' || !renderPopup) return
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect()
        setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
      }
      timerRef.current = setTimeout(async () => {
        try {
          const result = await executionsApi.getNodeResult(executionId, id)
          if (result.output) setNodeOutput(result.output as RawOutput)
        } catch { /* silent */ }
      }, 300)
    }, [executionId, data.status, id])

    const handleMouseLeave = useCallback(() => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setNodeOutput(null)
      setPopupPos(null)
    }, [])

    return (
      <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
        <Handle type="target" position={Position.Left} id="dataframe" />
        <BaseNode
          label={data.label}
          icon={icon}
          status={data.status}
          color="bg-[#FF9F0A]"
          category={data.category}
          selected={selected}
          note={data.note ? String(data.note) : undefined}
          error_message={data.error_message}
          cached={data.cached}
        >
          {method && <span className="text-[#1d1d1f]/40 dark:text-white/40 capitalize">{method}</span>}
          {data.status === 'success' && renderPopup && (
            <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[10px]">Hover to preview</span>
          )}
        </BaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" />
        {nodeOutput && popupPos && renderPopup && renderPopup(nodeOutput, popupPos)}
      </div>
    )
  })
}

export const NormalizeNode    = TransformNodeFactory('⊞', renderNormalize)
export const EncodeNode       = TransformNodeFactory('⌘', renderEncode)
export const PivotNode        = TransformNodeFactory('⊛', renderPivot)
export const GroupByNode      = TransformNodeFactory('≡', renderGroupBy)
export const ColumnOpsNode    = TransformNodeFactory('✦', renderColumnOps)
export const CustomPythonNode = TransformNodeFactory('λ', renderCustomPython)

// ── Join node (dual inputs) ────────────────────────────────────────────────────

export const JoinNode = memo(function JoinNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const executionId = useExecutionStore((s) => s.executionId)
  const [nodeOutput, setNodeOutput] = useState<RawOutput | null>(null)
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(async () => {
    if (!executionId || data.status !== 'success') return
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
    }
    timerRef.current = setTimeout(async () => {
      try {
        const result = await executionsApi.getNodeResult(executionId, id)
        if (result.output) setNodeOutput(result.output as RawOutput)
      } catch { /* silent */ }
    }, 300)
  }, [executionId, data.status, id])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setNodeOutput(null)
    setPopupPos(null)
  }, [])

  return (
    <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ position: 'relative' }}>
      {/* Two target handles stacked vertically */}
      <Handle type="target" position={Position.Left} id="left_df" style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="right_df" style={{ top: '65%' }} />
      <BaseNode
        label={data.label}
        icon="⋈"
        status={data.status}
        color="bg-[#FF9F0A]"
        category={data.category}
        selected={selected}
        note={data.note ? String(data.note) : undefined}
        error_message={data.error_message}
      >
        <span className="text-[#1d1d1f]/30 dark:text-white/30 text-[10px]">Left · Right</span>
        {data.status === 'success' && (
          <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[10px]">Hover to preview</span>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="dataframe" />
      {nodeOutput && popupPos && renderJoin(nodeOutput, popupPos)}
    </div>
  )
})
