import { useState, useCallback } from 'react'
import { previewJoin, type JoinPreviewRequest, type JoinPreviewResponse } from '../../api/join'

interface JoinPreviewTableProps {
  leftData: Record<string, unknown>[] | null
  rightData: Record<string, unknown>[] | null
  how: string
  keyPairs: Array<{ left: string; right: string }>
  suffixes: [string, string]
  canPreview: boolean
}

export default function JoinPreviewTable({
  leftData,
  rightData,
  how,
  keyPairs,
  suffixes,
  canPreview,
}: JoinPreviewTableProps) {
  const [result, setResult] = useState<JoinPreviewResponse | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const handlePreview = useCallback(async () => {
    if (!leftData || !rightData) return
    setLoading(true)
    setError(null)
    setResult(null)

    const request: JoinPreviewRequest = {
      left_data: leftData.slice(0, 1000),
      right_data: rightData.slice(0, 1000),
      how,
      left_on: keyPairs.map(p => p.left),
      right_on: keyPairs.map(p => p.right),
      suffixes,
    }

    try {
      const response = await previewJoin(request)
      setResult(response)
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Preview failed')
    } finally {
      setLoading(false)
    }
  }, [leftData, rightData, how, keyPairs, suffixes])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between">
        <label className="text-[11px] text-[var(--color-text-muted)] font-medium">Preview</label>
        <button
          onClick={handlePreview}
          disabled={!canPreview || loading}
          className="h-6 px-3 rounded-md bg-[#0071E3] text-white text-[10px] font-medium disabled:opacity-40 hover:bg-[#0071E3]/90 transition-colors"
        >
          {loading ? 'Loading…' : 'Preview'}
        </button>
      </div>

      {/* Loading spinner */}
      {loading && (
        <div className="flex items-center justify-center py-4">
          <span className="w-4 h-4 rounded-full border-2 border-[#0071E3]/20 border-t-[#0071E3] animate-spin" />
        </div>
      )}

      {/* Error message */}
      {error && (
        <div className="rounded-lg bg-[#FF453A]/10 border border-[#FF453A]/20 px-3 py-2 text-[10.5px] text-[#FF453A]">
          {error}
        </div>
      )}

      {/* Result table */}
      {result && !loading && (
        <div className="rounded-lg border border-[var(--color-border-default)] overflow-hidden">
          <div className="px-3 py-1.5 bg-[var(--color-secondary)] border-b border-[var(--color-border-subtle)]">
            <span className="text-[10px] text-[var(--color-text-muted)]">
              {result.total_rows} total rows{result.rows.length > 0 ? ` (showing ${result.rows.length})` : ''}
            </span>
          </div>
          {result.rows.length > 0 ? (
            <div className="overflow-x-auto max-h-48">
              <table className="w-full text-[10px]">
                <thead>
                  <tr className="border-b border-[var(--color-border-subtle)]">
                    {result.columns.map(col => (
                      <th key={col} className="px-2 py-1 text-left font-medium text-[var(--color-text-secondary)] whitespace-nowrap">
                        {col}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {result.rows.map((row, i) => (
                    <tr key={i} className="border-b border-[var(--color-border-subtle)] last:border-0">
                      {result.columns.map(col => (
                        <td key={col} className="px-2 py-1 text-[var(--color-text-primary)] whitespace-nowrap max-w-[120px] truncate">
                          {row[col] == null ? <span className="text-[var(--color-text-muted)] italic">null</span> : String(row[col])}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="px-3 py-3 text-[10.5px] text-[var(--color-text-muted)] text-center">
              {result.message || 'Join produced no rows.'}
            </div>
          )}
        </div>
      )}

      {/* Hint when preview not available */}
      {!canPreview && !result && !loading && !error && (
        <div className="text-[10px] text-[var(--color-text-muted)]">
          Connect both sources and configure at least one key pair to preview.
        </div>
      )}
    </div>
  )
}
