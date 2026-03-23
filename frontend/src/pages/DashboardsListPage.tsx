import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { dashboardsApi } from '../api/executions'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'

interface DashboardItem {
  execution_id: string
  workflow_id: string
  workflow_name: string
  title: string
  panel_count: number
  created_at: string
}

export default function DashboardsListPage() {
  const [dashboards, setDashboards] = useState<DashboardItem[]>([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  useEffect(() => {
    dashboardsApi.list()
      .then(setDashboards)
      .catch(() => toast.error('Failed to load dashboards'))
      .finally(() => setLoading(false))
  }, [])

  const filteredDashboards = useMemo(() => {
    return dashboards.filter((d) => {
      const q = search.toLowerCase()
      if (q && !d.title.toLowerCase().includes(q) && !d.workflow_name.toLowerCase().includes(q)) return false
      if (dateFrom && new Date(d.created_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(d.created_at) > to) return false
      }
      return true
    })
  }, [dashboards, search, dateFrom, dateTo])

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
        <span className="text-[13px] font-medium text-[#1d1d1f]/80 dark:text-white/80">
          {lang === 'tr' ? 'Dashboardlar' : 'Dashboards'}
        </span>
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
        <h1 className="text-[22px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1">
          {lang === 'tr' ? 'Dashboardlar' : 'Dashboards'}
        </h1>
        <p className="text-[13px] text-[#1d1d1f]/35 dark:text-white/35 mb-5">
          {lang === 'tr'
            ? 'Başarıyla çalıştırılan workflow\'lardan oluşturulan dashboardlar.'
            : 'Dashboards generated from successfully executed workflows.'}
        </p>

        {/* Filter bar */}
        {!loading && dashboards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 flex-1 min-w-[140px] bg-black/[0.04] dark:bg-white/[0.05] rounded-xl px-3 h-8">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#1d1d1f]/30 dark:text-white/30 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Dashboard ara...' : 'Search dashboards...'}
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
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title={lang === 'tr' ? 'Başlangıç tarihi' : 'From date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white border border-black/[0.07] dark:border-white/[0.07] rounded-xl outline-none focus:border-[#0071E3]/50 transition-colors"
            />
            <span className="text-[#1d1d1f]/20 dark:text-white/20 text-[11px]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title={lang === 'tr' ? 'Bitiş tarihi' : 'To date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[#1d1d1f] dark:text-white border border-black/[0.07] dark:border-white/[0.07] rounded-xl outline-none focus:border-[#0071E3]/50 transition-colors"
            />
            {(search || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
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
        ) : dashboards.length === 0 ? (
          <div className="text-center py-24">
            <div className="w-14 h-14 rounded-2xl bg-black/[0.04] dark:bg-white/[0.04] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center text-2xl mx-auto mb-4">
              📈
            </div>
            <p className="text-[15px] font-medium text-[#1d1d1f]/40 dark:text-white/40 mb-1">
              {lang === 'tr' ? 'Henüz dashboard yok' : 'No dashboards yet'}
            </p>
            <p className="text-[13px] text-[#1d1d1f]/20 dark:text-white/20">
              {lang === 'tr'
                ? 'Bir workflow\'a Dashboard node ekleyip çalıştırın.'
                : 'Add a Dashboard node to a workflow and run it.'}
            </p>
          </div>
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[14px] text-[#1d1d1f]/30 dark:text-white/30">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-2">
            {filteredDashboards.map((d) => (
              <div
                key={d.execution_id}
                onClick={() => navigate(`/dashboard/${d.execution_id}`)}
                className="bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl px-5 py-4 flex items-center justify-between hover:bg-[#EBEBF0] dark:hover:bg-white/[0.05] transition-colors shadow-sm dark:shadow-none cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] border border-black/[0.07] dark:border-white/[0.07] flex items-center justify-center text-base">
                    📈
                  </div>
                  <div>
                    <h3 className="text-[14px] font-medium text-[#1d1d1f] dark:text-white">{d.title}</h3>
                    <div className="text-[11px] text-[#1d1d1f]/30 dark:text-white/30 mt-0.5 flex gap-3">
                      <span>{d.workflow_name}</span>
                      <span>
                        {d.panel_count} {lang === 'tr' ? 'panel' : 'panels'}
                      </span>
                      <span>{new Date(d.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
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
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
