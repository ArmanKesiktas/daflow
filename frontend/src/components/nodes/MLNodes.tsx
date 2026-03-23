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

function KVRow({ label, value, accent }: { label: string; value: string | number; accent?: string }) {
  return (
    <div className="flex items-center justify-between py-1 border-b border-black/[0.04] dark:border-white/[0.04]">
      <span className="text-[11px] text-[#1d1d1f]/50 dark:text-white/50">{label}</span>
      <span className={`text-[11px] font-medium ml-2 ${accent ?? 'text-[#1d1d1f]/80 dark:text-white/80'}`}>{String(value)}</span>
    </div>
  )
}

function renderTrainTestSplit(output: RawOutput, pos: PopupPos) {
  const s = output.split_summary as Record<string, unknown> | undefined
  if (!s) return null
  return (
    <MLPopup title="Train / Test Split" pos={pos}>
      <KVRow label="Total rows" value={String(s.total_rows ?? '—')} />
      <KVRow label="Train rows" value={String(s.train_rows ?? '—')} accent="text-[#30D158]" />
      <KVRow label="Test rows" value={String(s.test_rows ?? '—')} accent="text-[#0071E3]" />
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
          <KVRow label="Accuracy" value={`${((m.accuracy as number ?? 0) * 100).toFixed(1)}%`} accent="text-[#30D158]" />
          <KVRow label="F1 (weighted)" value={String(m.weighted_f1 ?? '—')} />
        </>
      ) : (
        <>
          <KVRow label="R²" value={String(m.r2 ?? '—')} accent="text-[#30D158]" />
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
          color="bg-[#FF6B6B]"
          category={data.category}
          selected={selected}
          note={data.note ? String(data.note) : undefined}
        >
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

export const TrainTestSplitNode = MLNodeFactory('⊂', renderTrainTestSplit)
export const MLModelNode        = MLNodeFactory('◎', renderMLModel)
