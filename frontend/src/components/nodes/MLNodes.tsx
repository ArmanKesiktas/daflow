import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'

type PopupPos = { top: number; left: number }
type RawOutput = Record<string, unknown>

function MLPopup({ title, pos, children }: { title: string; pos: PopupPos; children: React.ReactNode }) {
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

function KVRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-[var(--color-border-subtle)]">
      <span className="text-[11px] text-[var(--color-text-secondary)]">{label}</span>
      <span className={`text-[11px] font-medium ml-2 ${accent ?? 'text-[var(--color-text-primary)]'}`}>{String(value)}</span>
    </div>
  )
}

function renderTrainTestSplit(output: RawOutput, pos: PopupPos) {
  const s = output.split_summary as Record<string, unknown> | undefined
  if (!s) return null
  return (
    <MLPopup title="Train / Test Split" pos={pos}>
      <KVRow label="Total rows" value={String(s.total_rows ?? '—')} />
      <KVRow label="Train rows" value={String(s.train_rows ?? '—')} accent="text-success" />
      <KVRow label="Test rows" value={String(s.test_rows ?? '—')} accent="text-primary" />
      <KVRow label="Test size" value={`${s.test_size != null ? Math.round((s.test_size as number) * 100) : '—'}%`} />
      {Boolean(s.stratify_column) && <KVRow label="Stratify by" value={String(s.stratify_column)} />}
    </MLPopup>
  )
}

function renderMLModel(output: RawOutput, pos: PopupPos) {
  const m = output.ml_metrics as Record<string, unknown> | undefined
  if (!m) return null
  const isClassification = m.task_type === 'classification'
  return (
    <MLPopup title="ML Model" pos={pos}>
      <KVRow label="Algorithm" value={String(m.algorithm ?? '—')} />
      <KVRow label="Task" value={String(m.task_type ?? '—')} />
      <KVRow label="Train samples" value={String(m.train_samples ?? '—')} />
      <KVRow label="Test samples" value={String(m.test_samples ?? '—')} />
      {isClassification ? (
        <>
          <KVRow label="Accuracy" value={`${((m.accuracy as number ?? 0) * 100).toFixed(1)}%`} accent="text-success" />
          <KVRow label="F1 (weighted)" value={String(m.weighted_f1 ?? '—')} />
        </>
      ) : (
        <>
          <KVRow label="R²" value={String(m.r2 ?? '—')} accent="text-success" />
          <KVRow label="RMSE" value={String(m.rmse ?? '—')} />
          <KVRow label="MAE" value={String(m.mae ?? '—')} />
        </>
      )}
    </MLPopup>
  )
}

function MLNodeFactory(icon: string, renderPopup?: (output: RawOutput, pos: PopupPos) => React.ReactNode) {
  return memo(function MLNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
    const executionId = useExecutionStore((s) => s.executionId)
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
          color="bg-[#FF6B6B]"
          category={data.category}
          selected={selected}
          note={data.note ? String(data.note) : undefined}
          error_message={data.error_message}
          cached={data.cached}
        >
          {data.status === 'success' && renderPopup && (
            <span className="text-[var(--color-text-muted)] text-[10px]">Hover to preview</span>
          )}
        </BaseNode>
        <Handle type="source" position={Position.Right} id="dataframe" />
        {popupPos && renderPopup && (
          loading ? (
            <MLPopup title={data.label} pos={popupPos}><PopupState state="loading" /></MLPopup>
          ) : previewError ? (
            <MLPopup title={data.label} pos={popupPos}><PopupState state={previewError} /></MLPopup>
          ) : nodeOutput ? (
            renderPopup(nodeOutput, popupPos) ?? <MLPopup title={data.label} pos={popupPos}><PopupState state="empty" /></MLPopup>
          ) : (
            <MLPopup title={data.label} pos={popupPos}><PopupState state="empty" /></MLPopup>
          )
        )}
      </div>
    )
  })
}

export const TrainTestSplitNode = MLNodeFactory('⊂', renderTrainTestSplit)
export const MLModelNode        = MLNodeFactory('◎', renderMLModel)
