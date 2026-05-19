import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import { useNodeContextMenu } from '../../hooks/useNodeContextMenu'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'

type PopupPos = { top: number; left: number }
type RawOutput = Record<string, unknown>

function TransformPopup({ title, pos, children }: { title: string; pos: PopupPos; children: React.ReactNode }) {
  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-80 bg-[#ffffff] dark:bg-[#1C1C1E] rounded-2xl border border-[var(--color-border-default)] shadow-2xl p-4 pointer-events-none -translate-y-1/2"
    >
      <h4 className="text-[12px] font-semibold text-[var(--color-text-primary)] mb-3">{title}</h4>
      <div className="max-h-60 overflow-hidden">
        {children}
      </div>
    </div>,
    document.body,
  )
}

function PopupState({ state }: { state: 'loading' | 'empty' | string }) {
  if (state === 'loading') {
    return (
      <div className="h-20 flex flex-col items-center justify-center gap-2 text-[var(--color-text-muted)]">
        <span className="w-5 h-5 rounded-full border-2 border-primary/20 border-t-primary animate-spin" />
        <span className="text-[11px]">Loading preview...</span>
      </div>
    )
  }
  return (
    <div className={`rounded-lg px-3 py-2 text-[11px] ${
      state === 'empty'
        ? 'bg-[var(--color-secondary)] text-[var(--color-text-muted)]'
        : 'bg-danger/10 border border-danger/20 text-danger'
    }`}>
      {state === 'empty' ? 'No preview data was returned for this node yet.' : state}
    </div>
  )
}

function KVRow({ label, value }: { label: string; value: string | number }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--color-border-subtle)]">
      <span className="text-[11px] text-[var(--color-text-secondary)]">{label}</span>
      <span className="text-[11px] font-medium text-[var(--color-text-primary)]">{String(value)}</span>
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
        <div key={col} className="py-0.5 text-[11px] text-[var(--color-text-secondary)]">{col}</div>
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
    const contextMenu = useNodeContextMenu(id)
    const method = (data.config as { method?: string }).method

    const [nodeOutput, setNodeOutput] = useState<RawOutput | null>(null)
    const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
    const [loading, setLoading] = useState(false)
    const [previewError, setPreviewError] = useState<string | null>(null)
    const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
    const nodeRef = useRef<HTMLDivElement>(null)

    const handleMouseEnter = useCallback(async () => {
      if (!executionId || data.status !== 'success' || !renderPopup) return
      if (nodeRef.current) {
        const rect = nodeRef.current.getBoundingClientRect()
        setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
      }
      setLoading(true)
      setPreviewError(null)
      setNodeOutput(null)
      timerRef.current = setTimeout(async () => {
        try {
          const result = await executionsApi.getNodeResult(executionId, id)
          if (result.output) setNodeOutput(result.output as RawOutput)
          else setPreviewError(result.error_message || 'Preview could not be loaded.')
        } catch (exc) {
          setPreviewError(exc instanceof Error ? exc.message : 'Preview could not be loaded.')
        } finally {
          setLoading(false)
        }
      }, 300)
    }, [executionId, data.status, id])

    const handleMouseLeave = useCallback(() => {
      if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
      setNodeOutput(null)
      setPopupPos(null)
      setLoading(false)
      setPreviewError(null)
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
          disabled={Boolean(data.disabled)}
          note={data.note ? String(data.note) : undefined}
          error_message={data.error_message}
          cached={data.cached}
          contextMenu={contextMenu}
        >
          {method && <span className="text-[var(--color-text-muted)] capitalize">{method}</span>}
          {data.status === 'success' && renderPopup && (
            <span className="text-[var(--color-text-muted)] text-[10px]">Hover to preview</span>
          )}
        </BaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" />
        {popupPos && renderPopup && (
          loading ? (
            <TransformPopup title={data.label} pos={popupPos}><PopupState state="loading" /></TransformPopup>
          ) : previewError ? (
            <TransformPopup title={data.label} pos={popupPos}><PopupState state={previewError} /></TransformPopup>
          ) : nodeOutput ? (
            renderPopup(nodeOutput, popupPos) ?? <TransformPopup title={data.label} pos={popupPos}><PopupState state="empty" /></TransformPopup>
          ) : (
            <TransformPopup title={data.label} pos={popupPos}><PopupState state="empty" /></TransformPopup>
          )
        )}
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

// ── Join node ──────────────────────────────────────────────────────────────────

export const JoinNode = memo(function JoinNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const executionId = useExecutionStore((s) => s.executionId)
  const contextMenu = useNodeContextMenu(id)
  const [nodeOutput, setNodeOutput] = useState<RawOutput | null>(null)
  const [popupPos, setPopupPos] = useState<PopupPos | null>(null)
  const [loading, setLoading] = useState(false)
  const [previewError, setPreviewError] = useState<string | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const handleMouseEnter = useCallback(async () => {
    if (!executionId || data.status !== 'success') return
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
    }
    setLoading(true)
    setPreviewError(null)
    setNodeOutput(null)
    timerRef.current = setTimeout(async () => {
      try {
        const result = await executionsApi.getNodeResult(executionId, id)
        if (result.output) setNodeOutput(result.output as RawOutput)
        else setPreviewError(result.error_message || 'Preview could not be loaded.')
      } catch (exc) {
        setPreviewError(exc instanceof Error ? exc.message : 'Preview could not be loaded.')
      } finally {
        setLoading(false)
      }
    }, 300)
  }, [executionId, data.status, id])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setNodeOutput(null)
    setPopupPos(null)
    setLoading(false)
    setPreviewError(null)
  }, [])

  return (
    <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave} style={{ position: 'relative' }}>
      <Handle type="target" position={Position.Left} id="left_df" style={{ top: '35%' }} />
      <Handle type="target" position={Position.Left} id="right_df" style={{ top: '65%' }} />
      <span className="absolute text-[9px] font-bold text-[var(--color-text-muted)]" style={{ left: '8px', top: '28%' }}>L</span>
      <span className="absolute text-[9px] font-bold text-[var(--color-text-muted)]" style={{ left: '8px', top: '58%' }}>R</span>
      <BaseNode
        label={data.label}
        icon="⋈"
        status={data.status}
        color="bg-[#FF9F0A]"
        category={data.category}
        selected={selected}
        disabled={Boolean(data.disabled)}
        note={data.note ? String(data.note) : undefined}
        error_message={data.error_message}
        contextMenu={contextMenu}
      >
        <span className="text-[var(--color-text-muted)] text-[10px]">Left / Right inputs</span>
        {data.status === 'success' && (
          <span className="text-[var(--color-text-muted)] text-[10px]">Hover to preview</span>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="dataframe" />
      {popupPos && (
        loading ? (
          <TransformPopup title={data.label} pos={popupPos}><PopupState state="loading" /></TransformPopup>
        ) : previewError ? (
          <TransformPopup title={data.label} pos={popupPos}><PopupState state={previewError} /></TransformPopup>
        ) : nodeOutput ? (
          renderJoin(nodeOutput, popupPos) ?? <TransformPopup title={data.label} pos={popupPos}><PopupState state="empty" /></TransformPopup>
        ) : (
          <TransformPopup title={data.label} pos={popupPos}><PopupState state="empty" /></TransformPopup>
        )
      )}
    </div>
  )
})
