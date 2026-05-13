import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '../api/executions'
import type { Report } from '../types/workflow'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import LoadingState from '../components/ui/LoadingState'
import EmptyState from '../components/ui/EmptyState'

interface ReportSummary {
  row_count?: number
  column_count?: number
  filename?: string
  anomaly_count?: number
  anomaly_rate?: number
  strong_correlations?: { col_a: string; col_b: string; correlation: number }[]
  missing_columns?: number
  duplicate_count?: number
}

function buildSummary(reportData: Record<string, unknown>): ReportSummary {
  const meta = (reportData?.metadata as Record<string, unknown>) ?? {}
  const sections = (reportData?.sections as { section_type: string; data: Record<string, unknown> }[]) ?? []
  const summary: ReportSummary = {
    row_count: meta.row_count as number,
    column_count: meta.column_count as number,
    filename: meta.filename as string,
  }
  for (const sec of sections) {
    if (sec.section_type === 'anomaly_detection' && sec.data) {
      summary.anomaly_count = sec.data.anomaly_count as number
      summary.anomaly_rate = sec.data.anomaly_rate as number
    }
    if (sec.section_type === 'correlation' && sec.data) {
      const pairs = sec.data.strong_pairs as { col_a: string; col_b: string; correlation: number }[] | undefined
      summary.strong_correlations = pairs?.slice(0, 3)
    }
    if (sec.section_type === 'missing_value' && sec.data) {
      const cols = Object.values(sec.data as Record<string, { missing_count?: number }>)
      summary.missing_columns = cols.filter((c) => (c?.missing_count ?? 0) > 0).length
    }
    if (sec.section_type === 'duplicate_detection' && sec.data) {
      summary.duplicate_count = sec.data.duplicate_count as number
    }
  }
  return summary
}

export default function ReportsPage() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)
  const [hoveredId, setHoveredId] = useState<string | null>(null)
  const [summaries, setSummaries] = useState<Record<string, ReportSummary>>({})
  const [loadingSummary, setLoadingSummary] = useState<string | null>(null)
  const hoverTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [formatFilter, setFormatFilter] = useState<'all' | 'json' | 'pdf'>('all')
  const navigate = useNavigate()
  const { lang, t } = useI18n()
  const { activeWorkspaceId, activeWorkspace, activeProjectId, activeProject } = useWorkspace()

  useEffect(() => {
    setLoading(true)
    reportsApi.list(activeWorkspaceId, activeProjectId)
      .then(setReports)
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [activeWorkspaceId, activeProjectId])

  const filteredReports = useMemo(() => {
    return reports.filter((r) => {
      if (search && !r.title.toLowerCase().includes(search.toLowerCase())) return false
      if (formatFilter !== 'all' && r.format !== formatFilter) return false
      if (dateFrom) {
        const from = new Date(dateFrom)
        if (new Date(r.created_at) < from) return false
      }
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(r.created_at) > to) return false
      }
      return true
    })
  }, [reports, search, formatFilter, dateFrom, dateTo])

  const handleMouseEnter = (reportId: string) => {
    hoverTimerRef.current = setTimeout(async () => {
      setHoveredId(reportId)
      if (!summaries[reportId]) {
        setLoadingSummary(reportId)
        try {
          const data = await reportsApi.getJson(reportId)
          setSummaries((prev) => ({ ...prev, [reportId]: buildSummary(data) }))
        } catch {
          // ignore
        } finally {
          setLoadingSummary(null)
        }
      }
    }, 400)
  }

  const handleMouseLeave = () => {
    if (hoverTimerRef.current) clearTimeout(hoverTimerRef.current)
    setHoveredId(null)
  }

  return (
      <main className="max-w-5xl mx-auto px-6 pt-6 pb-20">
        <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)] mb-1">{t('reports')}</h1>
        <p className="text-[13px] text-[var(--color-text-secondary)] mb-6">
          {t('reportsSubtitle')}
          {activeWorkspace ? ` · ${activeWorkspace.name}` : ''}
          {activeProject ? ` / ${activeProject.name}` : ''}
        </p>

        {/* Filter bar */}
        {!loading && reports.length > 0 && (
          <div data-tour="report-visibility" className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-surface border border-[var(--color-border-default)] rounded-2xl shadow-sm">
            {/* Search */}
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-black/[0.04] dark:bg-white/[0.05] rounded-xl px-3 h-8">
              <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Rapor ara...' : 'Search reports...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} aria-label="Clear search" className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            {/* Format filter */}
            <div className="flex rounded-xl overflow-hidden border border-[var(--color-border-default)]">
              {(['all', 'json', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={`px-2.5 h-8 text-[11px] font-medium transition-colors ${
                    formatFilter === f
                      ? 'bg-primary text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
                  }`}
                >
                  {f === 'all' ? (lang === 'tr' ? 'Tümü' : 'All') : f.toUpperCase()}
                </button>
              ))}
            </div>
            {/* Date from */}
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title={lang === 'tr' ? 'Başlangıç tarihi' : 'From date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
            />
            <span className="text-[var(--color-text-muted)] text-[11px]">—</span>
            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title={lang === 'tr' ? 'Bitiş tarihi' : 'To date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
            />
            {/* Clear filters */}
            {(search || formatFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setFormatFilter('all'); setDateFrom(''); setDateTo('') }}
                className="h-8 px-2.5 text-[11px] text-[var(--color-text-secondary)] hover:text-danger transition-colors rounded-xl hover:bg-danger/10"
              >
                {lang === 'tr' ? 'Temizle' : 'Clear'}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <LoadingState message={lang === 'tr' ? 'Raporlar yükleniyor...' : 'Loading reports...'} />
        ) : reports.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
            title={t('noReportsYet')}
            description={t('noReportsDesc')}
          />
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] text-[var(--color-text-muted)]">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <div data-tour="reports-list" className="space-y-3">
            {filteredReports.map((r) => (
              <div key={r.id} className="relative">
                <div
                  data-tour="report-export"
                  onClick={() => navigate(`/reports/${r.id}`)}
                  onMouseEnter={() => handleMouseEnter(r.id)}
                  onMouseLeave={handleMouseLeave}
                  className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm px-5 py-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] border border-[var(--color-border-default)] flex items-center justify-center">
                      <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                      </svg>
                    </div>
                    <div>
                      <h3 className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-primary)]">{r.title}</h3>
                      <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 flex gap-3">
                        <span>{r.format.toUpperCase()}</span>
                        <span>{new Date(r.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>
                  <svg
                    className="w-4 h-4 text-[var(--color-text-muted)] group-hover:text-[var(--color-text-secondary)] transition-colors flex-shrink-0"
                    viewBox="0 0 16 16" fill="none"
                  >
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Hover tooltip */}
                {hoveredId === r.id && (
                  <div
                    className="dropdown-popover absolute left-0 right-0 top-full mt-1.5 z-30 bg-surface border border-[var(--color-border-default)] rounded-2xl shadow-xl p-4 pointer-events-none"
                    onMouseEnter={() => setHoveredId(r.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {loadingSummary === r.id ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border-default)] border-t-primary animate-spin" />
                      </div>
                    ) : summaries[r.id] ? (
                      <ReportTooltipContent summary={summaries[r.id]} lang={lang} />
                    ) : null}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>
  )
}

function ReportTooltipContent({ summary, lang }: { summary: ReportSummary; lang: string }) {
  const tr = lang === 'tr'
  return (
    <div className="space-y-3">
      {/* Dataset size */}
      {summary.row_count != null && (
        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-[var(--color-text-secondary)]">{tr ? 'Veri Seti' : 'Dataset'}</span>
          <span className="font-semibold text-[var(--color-text-primary)] font-mono">
            {summary.row_count.toLocaleString()} × {summary.column_count ?? '?'}
          </span>
          {summary.filename && (
            <span className="text-[11px] text-[var(--color-text-muted)] truncate max-w-[140px]">{summary.filename}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Anomalies */}
        {summary.anomaly_count != null && (
          <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
              {tr ? 'Anomali' : 'Anomalies'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.anomaly_count > 0 ? 'text-danger' : 'text-success'}`}>
              {summary.anomaly_count.toLocaleString()}
              {summary.anomaly_rate != null && (
                <span className="text-[10px] font-normal ml-1 opacity-60">
                  ({(Number(summary.anomaly_rate) * 100).toFixed(1)}%)
                </span>
              )}
            </p>
          </div>
        )}

        {/* Missing columns */}
        {summary.missing_columns != null && (
          <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
              {tr ? 'Eksik Sütun' : 'Missing cols'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.missing_columns > 0 ? 'text-warning' : 'text-success'}`}>
              {summary.missing_columns}
            </p>
          </div>
        )}

        {/* Duplicates */}
        {summary.duplicate_count != null && (
          <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-0.5">
              {tr ? 'Tekrar' : 'Duplicates'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.duplicate_count > 0 ? 'text-warning' : 'text-success'}`}>
              {summary.duplicate_count.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Top correlations */}
      {(summary.strong_correlations ?? []).length > 0 && (
        <div>
          <p className="text-[10px] text-[var(--color-text-muted)] uppercase tracking-wider mb-1.5">
            {tr ? 'Güçlü Korelasyonlar' : 'Strong Correlations'}
          </p>
          <div className="space-y-1">
            {summary.strong_correlations!.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-[var(--color-text-secondary)] truncate">{p.col_a} ↔ {p.col_b}</span>
                <span className={`font-mono font-semibold ml-2 flex-shrink-0 ${Math.abs(p.correlation) > 0.8 ? 'text-danger' : 'text-warning'}`}>
                  {p.correlation.toFixed(3)}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  )
}
