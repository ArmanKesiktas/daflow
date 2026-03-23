import { useEffect, useMemo, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import type { WorkflowListItem } from '../types/workflow'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'
import WorkflowTemplateModal from '../components/WorkflowTemplateModal'

export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [showTemplateModal, setShowTemplateModal] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
  const { lang, setLang, t } = useI18n()

  useEffect(() => {
    workflowsApi.list()
      .then(setWorkflows)
      .catch(() => toast.error('Failed to load workflows'))
      .finally(() => setLoading(false))
  }, [])

  const filteredWorkflows = useMemo(() => {
    return workflows.filter((wf) => {
      if (search && !wf.name.toLowerCase().includes(search.toLowerCase())) return false
      if (dateFrom && new Date(wf.updated_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(wf.updated_at) > to) return false
      }
      return true
    })
  }, [workflows, search, dateFrom, dateTo])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const wf = await workflowsApi.create({ name: t('newWorkflow') })
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error('Failed to create workflow')
      setCreating(false)
    }
  }

  const handleDelete = async (id: string, e: React.MouseEvent) => {
    e.stopPropagation()
    await workflowsApi.delete(id)
    setWorkflows((prev) => prev.filter((w) => w.id !== id))
    toast.success(t('saved'))
  }

  return (
    <>
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      {/* Nav */}
      <nav className="h-11 flex items-center justify-between px-6 border-b border-black/[0.06] dark:border-white/[0.06] bg-[#F5F5F7]/90 dark:bg-[#111113]/90 backdrop-blur-xl sticky top-0 z-10">
        <span className="text-sm font-semibold tracking-tight text-[#1d1d1f] dark:text-white">{t('appName')}</span>
        <div className="flex items-center gap-2">
          {/* Language toggle */}
          <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
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
          {/* Theme toggle */}
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
          <button
            onClick={() => navigate('/reports')}
            className="text-[13px] px-3 h-7 rounded-md text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
          >
            {t('reports')}
          </button>
          <button
            onClick={() => navigate('/dashboards')}
            className="text-[13px] px-3 h-7 rounded-md text-[#1d1d1f]/60 dark:text-white/60 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
          >
            {lang === 'tr' ? 'Dashboardlar' : 'Dashboards'}
          </button>
          <button
            onClick={() => setShowTemplateModal(true)}
            disabled={creating}
            className="text-[13px] px-4 h-7 rounded-md bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium transition-all disabled:opacity-50"
          >
            {creating ? t('creating') : t('newWorkflow')}
          </button>
        </div>
      </nav>

      <main className="max-w-5xl mx-auto px-6 pt-14 pb-20">
        <h1 className="text-[28px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-1">{t('workflows')}</h1>
        <p className="text-[15px] text-[#1d1d1f]/40 dark:text-white/40 mb-6">{t('workflowsSubtitle')}</p>

        {/* Filter bar */}
        {!loading && workflows.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-white dark:bg-white/[0.03] border border-black/[0.07] dark:border-white/[0.07] rounded-2xl shadow-sm dark:shadow-none">
            <div className="flex items-center gap-2 flex-1 min-w-[160px] bg-black/[0.04] dark:bg-white/[0.05] rounded-xl px-3 h-8">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none" className="text-[#1d1d1f]/30 dark:text-white/30 flex-shrink-0">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.5"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={lang === 'tr' ? 'İş akışı ara...' : 'Search workflows...'}
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
          <div className="flex items-center gap-2 text-[#1d1d1f]/30 dark:text-white/30 text-sm">
            <span className="w-4 h-4 border-2 border-black/20 dark:border-white/20 border-t-black/60 dark:border-t-white/60 rounded-full animate-spin" />
            {t('loading')}
          </div>
        ) : workflows.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-32 gap-5">
            <div className="w-16 h-16 rounded-2xl bg-black/[0.05] dark:bg-white/[0.06] flex items-center justify-center">
              <svg className="w-7 h-7 text-[#1d1d1f]/30 dark:text-white/30" fill="none" stroke="currentColor" strokeWidth={1.5} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zm0 9.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zm9.75-9.75A2.25 2.25 0 0115.75 3.75H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zm0 9.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
              </svg>
            </div>
            <div className="text-center">
              <p className="text-[17px] font-medium text-[#1d1d1f]/80 dark:text-white/80 mb-1">{t('noWorkflowsYet')}</p>
              <p className="text-[14px] text-[#1d1d1f]/35 dark:text-white/35">{t('noWorkflowsDesc')}</p>
            </div>
            <button
              onClick={() => setShowTemplateModal(true)}
              className="mt-2 text-[13px] px-5 h-8 rounded-full bg-[#0071E3] hover:bg-[#0077ED] text-white font-medium transition-all"
            >
              {t('newWorkflow')}
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {filteredWorkflows.length === 0 ? (
              <div className="col-span-full text-center py-12">
                <p className="text-[14px] text-[#1d1d1f]/30 dark:text-white/30">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
              </div>
            ) : filteredWorkflows.map((wf) => (
              <div
                key={wf.id}
                onClick={() => navigate(`/workflows/${wf.id}/edit`)}
                className="group relative bg-white dark:bg-white/[0.04] hover:bg-[#EBEBF0] dark:hover:bg-white/[0.07] border border-black/[0.08] dark:border-white/[0.08] hover:border-black/[0.14] dark:hover:border-white/[0.14] rounded-2xl p-5 cursor-pointer transition-all shadow-sm dark:shadow-none"
              >
                <div className="flex items-center justify-between mb-4">
                  <div className="w-9 h-9 rounded-xl bg-[#0071E3]/10 dark:bg-[#0071E3]/15 flex items-center justify-center">
                    <svg className="w-4 h-4 text-[#0071E3]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                    </svg>
                  </div>
                  <button
                    onClick={(e) => handleDelete(wf.id, e)}
                    title={t('deleteWorkflow')}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-transparent group-hover:text-[#1d1d1f]/30 dark:group-hover:text-white/30 hover:!text-red-500 dark:hover:!text-red-400 hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
                  >
                    <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                    </svg>
                  </button>
                </div>
                <h3 className="text-[15px] font-medium text-[#1d1d1f] dark:text-white truncate mb-1">{wf.name}</h3>
                {wf.description && (
                  <p className="text-[12px] text-[#1d1d1f]/35 dark:text-white/35 truncate mb-3">{wf.description}</p>
                )}
                <div className="flex items-center justify-between text-[11px] text-[#1d1d1f]/25 dark:text-white/25 mt-3 pt-3 border-t border-black/[0.05] dark:border-white/[0.05]">
                  <span>{wf.node_count} {t('nodes')}</span>
                  <span>{new Date(wf.updated_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>
    </div>
    {showTemplateModal && <WorkflowTemplateModal onClose={() => setShowTemplateModal(false)} />}
    </>
  )
}
