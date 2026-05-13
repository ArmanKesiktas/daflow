import { useEffect, useState } from 'react'
import { executionsApi } from '../api/executions'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionCompare, ExecutionStatus } from '../types/workflow'

interface Props {
  workflowId: string | null
  onClose: () => void
}

function duration(start?: string, end?: string): string {
  if (!start) return '—'
  const s = new Date(start).getTime()
  const e = end ? new Date(end).getTime() : Date.now()
  const ms = e - s
  if (ms < 1000) return `${ms}ms`
  if (ms < 60000) return `${(ms / 1000).toFixed(1)}s`
  return `${Math.floor(ms / 60000)}m ${Math.round((ms % 60000) / 1000)}s`
}

function StatusBadge({ status }: { status: string }) {
  const styles: Record<string, string> = {
    success: 'bg-success/15 text-success',
    error:   'bg-danger/15 text-danger',
    running: 'bg-primary/15 text-primary',
    pending: 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]',
  }
  return (
    <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${styles[status] ?? styles.pending}`}>
      {status}
    </span>
  )
}

export default function HistoryModal({ workflowId, onClose }: Props) {
  const [executions, setExecutions] = useState<ExecutionStatus[]>([])
  const [loading, setLoading] = useState(true)
  const [compareBase, setCompareBase] = useState<string | null>(null)
  const [compareResult, setCompareResult] = useState<ExecutionCompare | null>(null)
  const setExecutionId = useExecutionStore((s) => s.setExecutionId)
  const setStatus = useExecutionStore((s) => s.setStatus)

  useEffect(() => {
    if (!workflowId) return
    executionsApi.list(workflowId)
      .then((data) => setExecutions([...data].reverse())) // newest first
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [workflowId])

  const handleLoad = (exec: ExecutionStatus) => {
    setExecutionId(exec.execution_id)
    setStatus(exec)
    onClose()
  }

  const handleCompare = async (execId: string) => {
    if (!compareBase) {
      setCompareBase(execId)
      return
    }
    if (compareBase === execId) {
      setCompareBase(null)
      return
    }
    try {
      setCompareResult(await executionsApi.compare(compareBase, execId))
      setCompareBase(null)
    } catch {
      setCompareBase(null)
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div
        role="dialog"
        aria-modal="true"
        aria-labelledby="history-modal-title"
        className="relative bg-surface rounded-2xl border border-[var(--color-border-default)] shadow-2xl w-full max-w-lg mx-4 overflow-hidden"
      >
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-[var(--color-border-subtle)] flex items-center justify-between">
          <div>
            <h2 id="history-modal-title" className="text-[15px] font-semibold text-[var(--color-text-primary)]">Execution History</h2>
            <p className="text-[12px] text-[var(--color-text-muted)] mt-0.5">Past runs for this workflow</p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-full flex items-center justify-center text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] transition-colors"
          >
            <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto">
          {compareResult && (
            <div className="m-4 rounded-2xl bg-primary/[0.06] border border-primary/20 p-4">
              <div className="flex items-center justify-between mb-2">
                <p className="text-[13px] font-semibold text-[var(--color-text-primary)]">Run comparison</p>
                <button onClick={() => setCompareResult(null)} className="text-[11px] text-primary">Clear</button>
              </div>
              <div className="grid grid-cols-3 gap-2 text-[11px]">
                <Metric label="Duration Δ" value={`${compareResult.diff.duration_delta_seconds.toFixed(1)}s`} />
                <Metric label="Nodes Δ" value={String(compareResult.diff.node_count_delta)} />
                <Metric label="Errors Δ" value={String(compareResult.diff.error_delta)} />
              </div>
            </div>
          )}
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[var(--color-text-muted)] text-[13px]">
              <span className="w-4 h-4 border-2 border-[var(--color-border-default)] border-t-[var(--color-text-secondary)] rounded-full animate-spin" />
              Loading…
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-3xl opacity-10">⏱</span>
              <p className="text-[13px] text-[var(--color-text-muted)]">No executions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-[var(--color-border-subtle)]">
              {executions.map((exec, i) => {
                const nodeCount = exec.node_statuses?.length ?? 0
                const successCount = exec.node_statuses?.filter(n => n.status === 'success').length ?? 0
                return (
                  <div key={exec.execution_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-[var(--color-secondary)]/50 transition-colors">
                    <div className="text-[11px] font-medium text-[var(--color-text-muted)] w-5 text-center">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={exec.status} />
                        <span className="text-[11px] text-[var(--color-text-muted)]">
                          {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[var(--color-text-muted)]">
                        <span>⏱ {duration(exec.started_at, exec.completed_at)}</span>
                        {nodeCount > 0 && <span>◈ {successCount}/{nodeCount} nodes</span>}
                        {exec.error_message && (
                          <span className="text-danger/70 truncate max-w-[160px]">{exec.error_message}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoad(exec)}
                      className="text-[11px] font-medium px-3 h-7 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors flex-shrink-0"
                    >
                      Load
                    </button>
                    <button
                      onClick={() => handleCompare(exec.execution_id)}
                      className={`text-[11px] font-medium px-3 h-7 rounded-lg transition-colors flex-shrink-0 ${compareBase === exec.execution_id ? 'bg-warning/15 text-warning' : 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'}`}
                    >
                      {compareBase ? 'Pick' : 'Compare'}
                    </button>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function Metric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-xl bg-surface/70 p-3">
      <p className="text-[var(--color-text-muted)]">{label}</p>
      <p className="text-[14px] font-semibold text-[var(--color-text-primary)] mt-1">{value}</p>
    </div>
  )
}
