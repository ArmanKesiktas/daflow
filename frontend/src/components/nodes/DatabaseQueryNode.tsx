import { memo, useState, useRef, useCallback } from 'react'
import { createPortal } from 'react-dom'
import { Handle, Position, type NodeProps, type Node } from '@xyflow/react'
import { BaseNode } from './BaseNode'
import type { NodeData } from '../../types/workflow'
import { executionsApi } from '../../api/executions'
import { useExecutionStore } from '../../store/executionStore'

interface ColMeta { name: string; dtype: string; missing_count: number; unique_count: number }
interface PreviewData {
  metadata: { row_count: number; column_count: number; columns: ColMeta[] }
  preview_rows: Record<string, string>[]
}

const DB_ICONS: Record<string, string> = {
  postgresql: '🐘',
  mysql:      '🐬',
  sqlite:     '🗄',
}

function DataPreviewPopup({ data, pos }: { data: PreviewData; pos: { top: number; left: number } }) {
  const cols = data.metadata.columns.slice(0, 6)
  const rows = data.preview_rows.slice(0, 5)

  return createPortal(
    <div
      style={{ position: 'fixed', top: pos.top, left: pos.left, zIndex: 9999 }}
      className="w-[520px] bg-white dark:bg-[#1C1C1E] rounded-2xl border border-black/[0.08] dark:border-white/[0.08] shadow-2xl p-4 pointer-events-none -translate-y-1/2"
    >
      <div className="flex items-center justify-between mb-3">
        <h4 className="text-[12px] font-semibold text-[#1d1d1f] dark:text-white">Query Result Preview</h4>
        <span className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40">
          {data.metadata.row_count.toLocaleString()} rows · {data.metadata.column_count} columns
        </span>
      </div>

      <div className="mb-3">
        <div className="text-[10px] font-semibold text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-1.5">Schema</div>
        <div className="overflow-auto max-h-24">
          <table className="w-full text-[10px]">
            <thead>
              <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
                <th className="text-left pb-1 font-medium text-[#1d1d1f]/45 dark:text-white/45">Column</th>
                <th className="text-left pb-1 font-medium text-[#1d1d1f]/45 dark:text-white/45">Type</th>
                <th className="text-right pb-1 font-medium text-[#1d1d1f]/45 dark:text-white/45">Missing</th>
                <th className="text-right pb-1 font-medium text-[#1d1d1f]/45 dark:text-white/45">Unique</th>
              </tr>
            </thead>
            <tbody>
              {data.metadata.columns.slice(0, 10).map((col) => (
                <tr key={col.name} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                  <td className="py-0.5 text-[#1d1d1f]/80 dark:text-white/80 truncate max-w-[140px]">{col.name}</td>
                  <td className="py-0.5 text-[#1d1d1f]/40 dark:text-white/40 font-mono">{col.dtype}</td>
                  <td className="py-0.5 text-right text-[#1d1d1f]/40 dark:text-white/40">{col.missing_count}</td>
                  <td className="py-0.5 text-right text-[#1d1d1f]/40 dark:text-white/40">{col.unique_count}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {rows.length > 0 && cols.length > 0 && (
        <div>
          <div className="text-[10px] font-semibold text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-1.5">
            First {rows.length} rows
          </div>
          <div className="overflow-auto max-h-28">
            <table className="w-full text-[10px]">
              <thead>
                <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
                  {cols.map((c) => (
                    <th key={c.name} className="text-left pb-1 font-medium text-[#1d1d1f]/45 dark:text-white/45 truncate max-w-[80px] pr-2">{c.name}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {rows.map((row, i) => (
                  <tr key={i} className="border-b border-black/[0.03] dark:border-white/[0.03]">
                    {cols.map((c) => (
                      <td key={c.name} className="py-0.5 text-[#1d1d1f]/70 dark:text-white/70 truncate max-w-[80px] pr-2">{row[c.name] ?? ''}</td>
                    ))}
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>,
    document.body,
  )
}

export const DatabaseQueryNode = memo(function DatabaseQueryNode({ id, data, selected }: NodeProps<Node<NodeData>>) {
  const cfg = (data.config ?? {}) as Record<string, unknown>
  const executionId = useExecutionStore((s) => s.executionId)
  const [preview, setPreview] = useState<PreviewData | null>(null)
  const [popupPos, setPopupPos] = useState<{ top: number; left: number } | null>(null)
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const nodeRef = useRef<HTMLDivElement>(null)

  const dbType = String(cfg.db_type ?? 'postgresql')
  const dbIcon = DB_ICONS[dbType] ?? '🗄'
  const queryPreview = String(cfg.query ?? '').slice(0, 40).replace(/\s+/g, ' ').trim()
  const useSSH = Boolean(cfg.use_ssh_tunnel)

  const handleMouseEnter = useCallback(async () => {
    if (!executionId || data.status !== 'success') return
    if (nodeRef.current) {
      const rect = nodeRef.current.getBoundingClientRect()
      setPopupPos({ top: rect.top + rect.height / 2, left: rect.right + 12 })
    }
    timerRef.current = setTimeout(async () => {
      try {
        const result = await executionsApi.getNodeResult(executionId, id)
        const meta = result.output?.metadata as PreviewData['metadata'] | undefined
        if (meta) {
          setPreview({ metadata: meta, preview_rows: (result.output?.preview_rows as Record<string, string>[]) ?? [] })
        }
      } catch { /* silent */ }
    }, 300)
  }, [executionId, data.status, id])

  const handleMouseLeave = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    setPreview(null)
    setPopupPos(null)
  }, [])

  return (
    <div ref={nodeRef} onMouseEnter={handleMouseEnter} onMouseLeave={handleMouseLeave}>
      <BaseNode
        label="Database Query"
        icon={dbIcon}
        status={data.status}
        color=""
        category={data.category}
        selected={selected}
        note={data.note ? String(data.note) : undefined}
      >
        <span className="flex items-center gap-1.5">
          <span className="text-[#1d1d1f]/50 dark:text-white/50 capitalize">{dbType}</span>
          {useSSH && <span className="text-[10px] bg-[#FF9F0A]/15 text-[#FF9F0A] px-1.5 py-0.5 rounded-md font-medium">SSH</span>}
        </span>
        {queryPreview && (
          <span className="font-mono text-[10px] text-[#1d1d1f]/35 dark:text-white/35 truncate">{queryPreview}…</span>
        )}
        {data.status === 'success' && (
          <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[10px]">Hover to preview</span>
        )}
      </BaseNode>
      <Handle type="source" position={Position.Right} id="dataframe" />
      {preview && popupPos && <DataPreviewPopup data={preview} pos={popupPos} />}
    </div>
  )
})
