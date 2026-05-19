import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { dashboardsApi } from '../api/executions'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import { LoadingState } from '../components/ui/LoadingState'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'

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
  const [error, setError] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const navigate = useNavigate()
  const { workspaceId: routeWorkspaceId, projectId: routeProjectId } = useParams()
  const { lang } = useI18n()
  const { activeWorkspaceId, activeWorkspace, activeProject } = useWorkspace()
  const effectiveWorkspaceId = routeWorkspaceId || activeWorkspaceId
  const effectiveProjectId = routeProjectId || null
  const visibleProject = routeProjectId ? activeProject : null

  const fetchDashboards = () => {
    setLoading(true)
    setError(false)
    dashboardsApi.list(effectiveWorkspaceId, effectiveProjectId)
      .then(setDashboards)
      .catch(() => {
        setError(true)
        toast.error('Failed to load dashboards')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => {
    fetchDashboards()
  }, [effectiveWorkspaceId, effectiveProjectId])

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
      <main className="max-w-5xl mx-auto px-6 pt-6 pb-20">
        <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)] mb-1">
          {lang === 'tr' ? 'Dashboardlar' : 'Dashboards'}
        </h1>
        <p className="text-[13px] leading-5 text-[var(--color-text-secondary)] mb-6">
          {lang === 'tr'
            ? 'Başarıyla çalıştırılan workflow\'lardan oluşturulan dashboardlar.'
            : 'Dashboards generated from successfully executed workflows.'}
          {activeWorkspace ? ` · ${activeWorkspace.name}` : ''}
          {visibleProject ? ` / ${visibleProject.name}` : ''}
        </p>

        {/* Filter bar */}
        {!loading && !error && dashboards.length > 0 && (
          <div className="flex flex-wrap items-center gap-2 mb-5 p-3 bg-surface border border-[var(--color-border-default)] rounded-2xl shadow-sm">
            <div className="flex items-center gap-1.5 flex-1 min-w-[140px] bg-black/[0.04] dark:bg-white/[0.05] rounded-xl px-3 h-8">
              <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" viewBox="0 0 16 16" fill="none">
                <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
                <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
              </svg>
              <input
                type="text"
                placeholder={lang === 'tr' ? 'Dashboard ara...' : 'Search dashboards...'}
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="flex-1 bg-transparent text-[12px] text-[var(--color-text-primary)] placeholder-[var(--color-text-muted)] outline-none"
              />
              {search && (
                <button onClick={() => setSearch('')} className="text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]">
                  <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none"><path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                </button>
              )}
            </div>
            <input
              type="date"
              value={dateFrom}
              onChange={(e) => setDateFrom(e.target.value)}
              title={lang === 'tr' ? 'Başlangıç tarihi' : 'From date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
            />
            <span className="text-[var(--color-text-muted)] text-[11px]">—</span>
            <input
              type="date"
              value={dateTo}
              onChange={(e) => setDateTo(e.target.value)}
              title={lang === 'tr' ? 'Bitiş tarihi' : 'To date'}
              className="h-8 px-2.5 text-[11px] bg-black/[0.04] dark:bg-white/[0.05] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
            />
            {(search || dateFrom || dateTo) && (
              <button
                onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
                className="h-8 px-2.5 text-[11px] text-[var(--color-text-secondary)] hover:text-danger transition-colors rounded-xl hover:bg-danger/10"
              >
                {lang === 'tr' ? 'Temizle' : 'Clear'}
              </button>
            )}
          </div>
        )}

        {loading ? (
          <LoadingState message={lang === 'tr' ? 'Yükleniyor...' : 'Loading...'} />
        ) : error ? (
          <ErrorState
            title={lang === 'tr' ? 'Yükleme başarısız' : 'Failed to load'}
            message={lang === 'tr' ? 'Dashboardlar yüklenirken bir hata oluştu.' : 'An error occurred while loading dashboards.'}
            onRetry={fetchDashboards}
          />
        ) : dashboards.length === 0 ? (
          <EmptyState
            icon={
              <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
              </svg>
            }
            title={lang === 'tr' ? 'Henüz dashboard yok' : 'No dashboards yet'}
            description={lang === 'tr'
              ? 'Bir workflow\'a Dashboard node ekleyip çalıştırın.'
              : 'Add a Dashboard node to a workflow and run it.'}
          />
        ) : filteredDashboards.length === 0 ? (
          <div className="text-center py-16">
            <p className="text-[13px] leading-5 text-[var(--color-text-muted)]">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
          </div>
        ) : (
          <div className="space-y-3">
            {filteredDashboards.map((d) => (
              <div
                key={d.execution_id}
                onClick={() => navigate(`/dashboard/${d.execution_id}`)}
                className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm px-5 py-4 flex items-center justify-between hover:bg-black/[0.02] dark:hover:bg-white/[0.05] transition-colors cursor-pointer group"
              >
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-xl bg-black/[0.05] dark:bg-white/[0.06] border border-[var(--color-border-default)] flex items-center justify-center">
                    <svg className="w-4 h-4 text-[var(--color-text-secondary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-primary)]">{d.title}</h3>
                    <div className="text-[11px] text-[var(--color-text-muted)] mt-0.5 flex gap-3">
                      <span>{d.workflow_name}</span>
                      <span>
                        {d.panel_count} {lang === 'tr' ? 'panel' : 'panels'}
                      </span>
                      <span>{new Date(d.created_at).toLocaleString(lang === 'tr' ? 'tr-TR' : 'en-US')}</span>
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
            ))}
          </div>
        )}
      </main>
  )
}
