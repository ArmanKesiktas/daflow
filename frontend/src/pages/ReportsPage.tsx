import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { reportsApi } from '../api/executions'
import type { Report } from '../types/workflow'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'

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
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  useEffect(() => {
    reportsApi.list()
      .then(setReports)
      .catch(() => toast.error('Failed to load reports'))
      .finally(() => setLoading(false))
  }, [])

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
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      <header className="sticky top-0 z-50 h-11 bg-[#F5F5F7]/95 dark:bg-[#111113]/95 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] flex items-center px-5 gap-2">
        <button
          onClick={() => navigate('/workflows')}
          className="flex items-center gap-1.5 text-[13px] text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f]/90 dark:hover:text-white/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('backToWorkflowsList')}
        </button>
        <span className="text-[#1d1d1f]/15 dark:text-white/15 text-[12px]">·</span>
        <span className="text-[13px] font-medium text-[#1d1d1f]/80 dark:text-white/80">{t('reports')}</span>
        <div className="flex-1" />
        {/* Language toggle */}
        <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08] mr-1">
          {(['en', 'tr'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                lang === l
                  ? 'bg-[#0071E3] text-white'
                  : 'text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
              }`}
            >
              {l === 'en' ? '🇬🇧' : '🇹🇷'}
            </button>
          ))}
        </div>
        <button
          onClick={toggleTheme}
          title={isDark ? t('switchToLight') : t('switchToDark')}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" />
              <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </header>

      <main className="max-w-3xl mx-auto px-6 py-10">
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1">{t('reports')}</h1>
        <p className="text-[13px] text-[#1d1d1f]/35 dark:text-white/35 mb-5">{t('reportsSubtitle')}</p>

        {/* Filter bar */}
        {!loading && reports.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-none">
            {/* Search */}
            <div className="flex items-center gap-2 flex-1 min-w-[140px] bg-black/[0.04] dark:bg-white/[0.05] rounded-xl px-3 h-8">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#1d1d1f]/30 dark:text-white/30 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Rapor ara...' : 'Search reports...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12px] text-[#1d1d1f] dark:text-white placeholder-[#1d1d1f]/30 dark:placeholder-white/30 outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[#1d1d1f]/30 dark:text-white/30 hover:text-[#1d1d1f]/60 dark:hover:text-white/60">
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            {/* Format filter */}
            <div className="flex rounded-xl overflow-hidden border border-black/[0.07] dark:border-white/[0.07]">
              {(['all', 'json', 'pdf'] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFormatFilter(f)}
                  className={`px-2.5 h-8 text-[11px] font-medium transition-colors ${
                    formatFilter === f
                      ? 'bg-[#0071E3] text-white'
                      : 'text-[#1d1d1f]/50 dark:text-white/50 hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
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
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white border border-black/[0.07] dark:border-white/[0.07] rounded-xl outline-none focus:border-[#0071E3]/50 transition-colors"
            />
            <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[11px]">—</span>
            {/* Date to */}
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title={lang === 'tr' ? 'Bitiş tarihi' : 'To date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white border border-black/[0.07] dark:border-white/[0.07] rounded-xl outline-none focus:border-[#0071E3]/50 transition-colors"
            />
            {/* Clear filters */}
            {(search || formatFilter !== 'all' || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setFormatFilter('all'); setDateFrom(''); setDateTo('') }}
                className="h-8 px-2.5 text-[11px] text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#FF453A] transition-colors rounded-xl hover:bg-[#FF453A]/10"
              >
                {lang === 'tr' ? 'Temizle' : 'Clear'}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <div className="flex justify-center py-20">
            <div className="w-5 h-5 rounded-full border-2 border-black/[0.08] dark:border-white/[0.08] border-t-black/50 dark:border-t-white/50 animate-spin" />
          </div>
        ) : reports.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center text-2xl mx-auto mb-4">📊</div>
            <p className="text-[15px] font-medium text-[#1d1d1f]/40 dark:text-white/40 mb-1">{t('noReportsYet')}</p>
            <p className="text-[13px] text-[#1d1d1f]/20 dark:text-white/20">{t('noReportsDesc')}</p>
          </div>
        ) : filteredReports.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-[#1d1d1f]/30 dark:text-white/30">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredReports.map((r) => (
              <div key={r.id} className="relative">
                <div
                  onClick={() => navigate(`/reports/${r.id}`)}
                  onMouseEnter={() => handleMouseEnter(r.id)}
                  onMouseLeave={handleMouseLeave}
                  className="bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-[#EBEBF0] dark:hover:bg-white/[0.05] transition-colors shadow-sm dark:shadow-none cursor-pointer group"
                >
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center text-base">📊</div>
                    <div>
                      <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{r.title}</h3>
                      <div className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30 mt-0.5 flex gap-3">
                        <span>{r.format.toUpperCase()}</span>
                        <span>{new Date(r.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
                      </div>
                    </div>
                  </div>
                  <svg
                    width="16" height="16" viewBox="0 0 16 16" fill="none"
                    className="text-[#1d1d1f]/25 dark:text-white/25 group-hover:text-[#1d1d1f]/60 dark:group-hover:text-white/60 transition-colors flex-shrink-0"
                  >
                    <path d="M6 4l4 4-4 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>

                {/* Hover tooltip */}
                {hoveredId === r.id && (
                  <div
                    className="absolute left-0 right-0 top-full mt-1.5 z-30 bg-white dark:bg-[#1C1C1E] border border-black/[0.08] dark:border-white/[0.08] rounded-2xl shadow-xl dark:shadow-black/40 p-4 pointer-events-none"
                    onMouseEnter={() => setHoveredId(r.id)}
                    onMouseLeave={handleMouseLeave}
                  >
                    {loadingSummary === r.id ? (
                      <div className="flex items-center justify-center py-3">
                        <div className="w-4 h-4 rounded-full border-2 border-black/[0.08] dark:border-white/[0.08] border-t-[#0071E3] animate-spin" />
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
    </div>
  )
}

function ReportTooltipContent({ summary, lang }: { summary: ReportSummary; lang: string }) {
  const tr = lang === 'tr'
  return (
    <div className="space-y-3">
      {/* Dataset size */}
      {summary.row_count != null && (
        <div className="flex items-center gap-4 text-[12px]">
          <span className="text-[#1d1d1f]/40 dark:text-white/40">{tr ? 'Veri Seti' : 'Dataset'}</span>
          <span className="font-semibold text-[#1d1d1f] dark:text-white font-mono">
            {summary.row_count.toLocaleString()} × {summary.column_count ?? '?'}
          </span>
          {summary.filename && (
            <span className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30 truncate max-w-[140px]">{summary.filename}</span>
          )}
        </div>
      )}

      <div className="grid grid-cols-2 gap-2">
        {/* Anomalies */}
        {summary.anomaly_count != null && (
          <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-0.5">
              {tr ? 'Anomali' : 'Anomalies'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.anomaly_count > 0 ? 'text-[#FF453A]' : 'text-[#30D158]'}`}>
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
            <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-0.5">
              {tr ? 'Eksik Sütun' : 'Missing cols'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.missing_columns > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]'}`}>
              {summary.missing_columns}
            </p>
          </div>
        )}

        {/* Duplicates */}
        {summary.duplicate_count != null && (
          <div className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2">
            <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-0.5">
              {tr ? 'Tekrar' : 'Duplicates'}
            </p>
            <p className={`text-[14px] font-bold font-mono ${summary.duplicate_count > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]'}`}>
              {summary.duplicate_count.toLocaleString()}
            </p>
          </div>
        )}
      </div>

      {/* Top correlations */}
      {(summary.strong_correlations ?? []).length > 0 && (
        <div>
          <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-1.5">
            {tr ? 'Güçlü Korelasyonlar' : 'Strong Correlations'}
          </p>
          <div className="space-y-1">
            {summary.strong_correlations!.map((p, i) => (
              <div key={i} className="flex items-center justify-between text-[11px]">
                <span className="text-[#1d1d1f]/60 dark:text-white/60 truncate">{p.col_a} ↔ {p.col_b}</span>
                <span className={`font-mono font-semibold ml-2 flex-shrink-0 ${Math.abs(p.correlation) > 0.8 ? 'text-[#FF453A]' : 'text-[#FF9F0A]'}`}>
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
