import { useEffect, useState } from 'react'
import { executionsApi } from '../api/executions'
import { useExecutionStore } from '../store/executionStore'
import type { ExecutionStatus } from '../types/workflow'

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
    success: 'bg-[#30D158]/15 text-[#30D158]',
    error:   'bg-[#FF453A]/15 text-[#FF453A]',
    running: 'bg-[#0071E3]/15 text-[#0071E3]',
    pending: 'bg-black/[0.06] dark:bg-white/[0.08] text-[#1d1d1f]/50 dark:text-white/50',
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

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={onClose} />
      <div className="relative bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl w-full max-w-lg mx-4 overflow-hidden">
        {/* Header */}
        <div className="px-6 pt-5 pb-4 border-b border-black/[0.06] dark:border-white/[0.06] flex items-center justify-between">
          <div>
            <h2 className="text-[15px] font-semibold text-[#1d1d1f] dark:text-white">Execution History</h2>
            <p className="text-[12px] text-[#1d1d1f]/40 dark:text-white/40 mt-0.5">Past runs for this workflow</p>
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center text-[#1d1d1f]/30 dark:text-white/30 hover:bg-black/[0.07] dark:hover:bg-white/[0.08] transition-colors"
          >
            <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
              <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="max-h-96 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12 gap-2 text-[#1d1d1f]/30 dark:text-white/30 text-[13px]">
              <span className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black/60 dark:border-t-white/60 rounded-full animate-spin" />
              Loading…
            </div>
          ) : executions.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2">
              <span className="text-3xl opacity-10">⏱</span>
              <p className="text-[13px] text-[#1d1d1f]/30 dark:text-white/30">No executions yet</p>
            </div>
          ) : (
            <div className="divide-y divide-black/[0.05] dark:divide-white/[0.05]">
              {executions.map((exec, i) => {
                const nodeCount = exec.node_statuses?.length ?? 0
                const successCount = exec.node_statuses?.filter(n => n.status === 'success').length ?? 0
                return (
                  <div key={exec.execution_id} className="flex items-center gap-4 px-5 py-3.5 hover:bg-black/[0.02] dark:hover:bg-white/[0.02] transition-colors">
                    <div className="text-[11px] font-medium text-[#1d1d1f]/25 dark:text-white/25 w-5 text-center">{i + 1}</div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <StatusBadge status={exec.status} />
                        <span className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40">
                          {exec.started_at ? new Date(exec.started_at).toLocaleString() : '—'}
                        </span>
                      </div>
                      <div className="flex items-center gap-3 text-[11px] text-[#1d1d1f]/30 dark:text-white/30">
                        <span>⏱ {duration(exec.started_at, exec.completed_at)}</span>
                        {nodeCount > 0 && <span>◈ {successCount}/{nodeCount} nodes</span>}
                        {exec.error_message && (
                          <span className="text-[#FF453A]/70 truncate max-w-[160px]">{exec.error_message}</span>
                        )}
                      </div>
                    </div>
                    <button
                      onClick={() => handleLoad(exec)}
                      className="text-[11px] font-medium px-3 h-7 rounded-lg bg-[#0071E3]/10 text-[#0071E3] hover:bg-[#0071E3]/20 transition-colors flex-shrink-0"
                    >
                      Load
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
