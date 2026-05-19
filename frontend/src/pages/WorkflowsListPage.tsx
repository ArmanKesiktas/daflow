import { useEffect, useMemo, useRef, useState, type DragEvent, type MouseEvent } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { workflowsApi } from '../api/workflows'
import type { WorkflowListItem } from '../types/workflow'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import WorkflowTemplateModal from '../components/WorkflowTemplateModal'
import { onboardingApi } from '../api/platform'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import LoadingState from '../components/ui/LoadingState'

const WORKFLOW_ORDER_KEY = 'daflow_workflow_card_order'

export default function WorkflowsListPage() {
  const [workflows, setWorkflows] = useState<WorkflowListItem[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [creating, setCreating] = useState(false)
  const [search, setSearch] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')
  const [draggedWorkflowId, setDraggedWorkflowId] = useState<string | null>(null)
  const [showTemplates, setShowTemplates] = useState(false)
  const [showOnboarding, setShowOnboarding] = useState(false)
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, t } = useI18n()
  const { activeWorkspaceId, activeWorkspace, activeProjectId, activeProject } = useWorkspace()
  const fetchIdRef = useRef(0)

  const fetchWorkflows = () => {
    const fetchId = fetchIdRef.current + 1
    fetchIdRef.current = fetchId
    setLoading(true)
    setError(null)
    workflowsApi.list(activeWorkspaceId, activeProjectId)
      .then((data) => {
        if (fetchIdRef.current !== fetchId) return
        setWorkflows(Array.isArray(data) ? data : [])
      })
      .catch(() => {
        if (fetchIdRef.current !== fetchId) return
        const msg = lang === 'tr' ? 'Workflow yüklenemedi' : 'Failed to load workflows'
        setError(msg)
        toast.error(msg)
      })
      .finally(() => {
        if (fetchIdRef.current === fetchId) setLoading(false)
      })
  }

  useEffect(() => {
    if (location.pathname === '/workflows' && activeWorkspaceId) {
      navigate(
        activeProjectId
          ? `/workspaces/${activeWorkspaceId}/projects/${activeProjectId}/workflows`
          : `/workspaces/${activeWorkspaceId}/workflows`,
        { replace: true },
      )
    }
  }, [activeProjectId, activeWorkspaceId, location.pathname, navigate])

  useEffect(() => {
    fetchWorkflows()
    onboardingApi.get()
      .then((state) => setShowOnboarding(!state.skipped && (state.completed_steps?.length ?? 0) === 0))
      .catch(() => setShowOnboarding(!localStorage.getItem('daflow_onboarding_done')))
  }, [activeWorkspaceId, activeProjectId])

  const orderedWorkflows = useMemo(() => {
    const order = readWorkflowOrder()
    if (!order.length) return workflows
    const rank = new Map(order.map((id, index) => [id, index]))
    return [...workflows].sort((a, b) => {
      const ai = rank.get(a.id) ?? Number.MAX_SAFE_INTEGER
      const bi = rank.get(b.id) ?? Number.MAX_SAFE_INTEGER
      if (ai !== bi) return ai - bi
      return new Date(b.updated_at).getTime() - new Date(a.updated_at).getTime()
    })
  }, [workflows])

  const filteredWorkflows = useMemo(() => {
    return orderedWorkflows.filter((wf) => {
      if (search && !wf.name.toLowerCase().includes(search.toLowerCase())) return false
      if (dateFrom && new Date(wf.updated_at) < new Date(dateFrom)) return false
      if (dateTo) {
        const to = new Date(dateTo)
        to.setHours(23, 59, 59, 999)
        if (new Date(wf.updated_at) > to) return false
      }
      return true
    })
  }, [orderedWorkflows, search, dateFrom, dateTo])

  const handleCreate = async () => {
    setCreating(true)
    try {
      const wf = await workflowsApi.create({ name: t('newWorkflow'), workspace_id: activeWorkspaceId, project_id: activeProjectId })
      navigate(`/workflows/${wf.id}/edit`)
    } catch {
      toast.error(lang === 'tr' ? 'Workflow oluşturulamadı' : 'Failed to create workflow')
      setCreating(false)
    }
  }

  const dismissOnboarding = async () => {
    setShowOnboarding(false)
    localStorage.setItem('daflow_onboarding_done', '1')
    try {
      await onboardingApi.save({ completed_steps: ['intro'], skipped: true })
    } catch {
      // Local fallback is enough for dev mode.
    }
  }

  const handleDelete = async (id: string, e: MouseEvent) => {
    e.stopPropagation()
    const confirmed = window.confirm(lang === 'tr' ? 'Bu workflow silinecek. Emin misiniz?' : 'This workflow will be deleted. Are you sure?')
    if (!confirmed) return
    try {
      await workflowsApi.delete(id)
      setWorkflows((prev) => prev.filter((w) => w.id !== id))
      toast.success(t('saved'))
    } catch {
      toast.error(lang === 'tr' ? 'Workflow silinemedi' : 'Failed to delete workflow')
    }
  }

  const handleDropWorkflow = (targetId: string, event: DragEvent<HTMLDivElement>) => {
    event.preventDefault()
    if (!draggedWorkflowId || draggedWorkflowId === targetId) return
    const next = [...orderedWorkflows]
    const from = next.findIndex((item) => item.id === draggedWorkflowId)
    const to = next.findIndex((item) => item.id === targetId)
    if (from < 0 || to < 0) return
    const [item] = next.splice(from, 1)
    next.splice(to, 0, item)
    setWorkflows(next)
    localStorage.setItem(WORKFLOW_ORDER_KEY, JSON.stringify(next.map((wf) => wf.id)))
    setDraggedWorkflowId(null)
  }

  return (
    <>
    <main className="max-w-5xl mx-auto px-6 pt-6 pb-20 md:px-6 max-md:px-4">
      {/* Page Header — page-title style left, action button right */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)]">
            {t('workflows')}
          </h1>
          <p className="text-[13px] leading-5 text-[var(--color-text-secondary)] mt-1">
            {t('workflowsSubtitle')}
            {activeWorkspace ? ` · ${activeWorkspace.name}` : ''}
            {activeProject ? ` / ${activeProject.name}` : ''}
          </p>
        </div>
        <div data-tour="workflow-create" className="flex items-center gap-2">
          <button
            onClick={() => setShowTemplates(true)}
            className="text-[13px] px-3 h-8 rounded-lg bg-[var(--color-secondary)] text-[var(--color-text-secondary)] font-medium transition-all hover:opacity-80"
          >
            Templates
          </button>
          <button
            onClick={handleCreate}
            disabled={creating}
            className="text-[13px] px-4 h-8 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium transition-all disabled:opacity-45 disabled:cursor-not-allowed"
          >
            {creating ? t('creating') : t('newWorkflow')}
          </button>
        </div>
      </div>

      {showOnboarding && (
        <section className="mb-6 rounded-3xl border border-primary/20 bg-primary/[0.06] p-5 flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{lang === 'tr' ? 'Daflow\u2019a hızlı başla' : 'Get started with Daflow'}</p>
            <p className="text-[13px] text-[var(--color-text-muted)] mt-1">
              {lang === 'tr' ? 'Template seç, veri yükle, workflow\u2019u çalıştır ve dashboardu aç.' : 'Pick a template, upload data, run the workflow, and open the dashboard.'}
            </p>
          </div>
          <div className="flex gap-2">
            <button onClick={() => setShowTemplates(true)} className="h-8 px-4 rounded-lg bg-[var(--color-primary)] text-white text-[12px] font-medium transition-all hover:bg-[var(--color-primary-hover)]">{lang === 'tr' ? 'Template seç' : 'Pick template'}</button>
            <button onClick={dismissOnboarding} className="h-8 px-3 rounded-lg text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] transition-all">Skip</button>
          </div>
        </section>
      )}

      {!loading && !error && workflows.length > 0 && (
        <div data-tour="workflow-filters" className="flex flex-wrap items-center gap-2 mb-6 p-3 bg-[var(--color-bg-surface)] border border-[var(--color-border-default)] rounded-2xl shadow-sm">
          <div className="flex items-center gap-1.5 flex-1 min-w-[160px] bg-[var(--color-secondary)] rounded-xl px-3 h-8">
            <svg className="w-3.5 h-3.5 text-[var(--color-text-muted)] flex-shrink-0" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="4.5" stroke="currentColor" strokeWidth="1.8"/>
              <path d="M10.5 10.5l3 3" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
            </svg>
            <input
              type="text"
              placeholder={lang === 'tr' ? 'İş akışı ara...' : 'Search workflows...'}
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
            className="h-8 px-2.5 text-[11px] bg-[var(--color-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
          />
          <span className="text-[var(--color-text-muted)] text-[11px]">—</span>
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            title={lang === 'tr' ? 'Bitiş tarihi' : 'To date'}
            className="h-8 px-2.5 text-[11px] bg-[var(--color-secondary)] text-[var(--color-text-primary)] border border-[var(--color-border-default)] rounded-xl outline-none focus:border-primary/50 transition-colors"
          />
          {(search || dateFrom || dateTo) && (
            <button
              onClick={() => { setSearch(''); setDateFrom(''); setDateTo('') }}
              className="h-8 px-2.5 text-[11px] text-[var(--color-text-muted)] hover:text-danger transition-colors rounded-xl hover:bg-danger/10"
            >
              {lang === 'tr' ? 'Temizle' : 'Clear'}
            </button>
          )}
        </div>
      )}

      {/* Loading State */}
      {loading ? (
        <LoadingState
          variant="grid"
          rows={6}
          message={lang === 'tr' ? 'Workflowlar yükleniyor...' : 'Loading workflows...'}
        />
      ) : error ? (
        /* Error State */
        <div className="flex flex-col items-center justify-center py-32 gap-4">
          <div className="w-12 h-12 rounded-full bg-danger/10 flex items-center justify-center">
            <svg className="w-5 h-5 text-[var(--color-danger)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v3.75m-9.303 3.376c-.866 1.5.217 3.374 1.948 3.374h14.71c1.73 0 2.813-1.874 1.948-3.374L13.949 3.378c-.866-1.5-3.032-1.5-3.898 0L2.697 16.126zM12 15.75h.007v.008H12v-.008z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">
              {lang === 'tr' ? 'Yükleme başarısız' : 'Failed to load'}
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              {error}
            </p>
          </div>
          <button
            onClick={fetchWorkflows}
            className="text-[13px] px-4 h-8 rounded-lg bg-[var(--color-secondary)] text-[var(--color-text-secondary)] font-medium transition-all hover:opacity-80"
          >
            {lang === 'tr' ? 'Tekrar dene' : 'Retry'}
          </button>
        </div>
      ) : workflows.length === 0 ? (
        /* Empty State */
        <div data-tour="workflow-list" className="flex flex-col items-center justify-center py-32 gap-5">
          <div className="w-16 h-16 rounded-2xl bg-[var(--color-secondary)] flex items-center justify-center">
            <svg className="w-7 h-7 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
            </svg>
          </div>
          <div className="text-center">
            <p className="text-[15px] font-medium text-[var(--color-text-primary)] mb-1">
              {t('noWorkflowsYet')}
            </p>
            <p className="text-[13px] text-[var(--color-text-muted)]">
              {t('noWorkflowsDesc')}
            </p>
          </div>
          <div className="mt-2 flex items-center gap-2">
            <button
              onClick={() => setShowTemplates(true)}
              className="text-[13px] px-5 h-8 rounded-full bg-[var(--color-secondary)] text-[var(--color-text-secondary)] font-medium transition-all hover:opacity-80"
            >
              Templates
            </button>
            <button
              onClick={handleCreate}
              className="text-[13px] px-5 h-8 rounded-full bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white font-medium transition-all"
            >
              {t('newWorkflow')}
            </button>
          </div>
        </div>
      ) : (
        /* Grid layout: gap-3 (12px), responsive: single column below md, 2 cols at md, 3 cols at lg */
        <div data-tour="workflow-list" className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-3">
          {filteredWorkflows.length === 0 ? (
            <div className="col-span-full text-center py-12">
              <p className="text-[13px] leading-5 text-[var(--color-text-muted)]">{lang === 'tr' ? 'Sonuç bulunamadı.' : 'No results match your filters.'}</p>
            </div>
          ) : filteredWorkflows.map((wf) => (
            <div
              key={wf.id}
              draggable
              onDragStart={() => setDraggedWorkflowId(wf.id)}
              onDragEnd={() => setDraggedWorkflowId(null)}
              onDragOver={(e) => e.preventDefault()}
              onDrop={(e) => handleDropWorkflow(wf.id, e)}
              onClick={() => navigate(`/workflows/${wf.id}/edit`)}
              className={`group relative rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-surface)] shadow-sm hover:border-[var(--color-border-default)] hover:shadow-md p-5 cursor-grab active:cursor-grabbing transition-all ${draggedWorkflowId === wf.id ? 'opacity-55 scale-[0.98]' : ''}`}
            >
              <div className="flex items-center justify-between mb-4">
                <div className="w-9 h-9 rounded-xl bg-primary/10 flex items-center justify-center">
                  <svg className="w-4 h-4 text-[var(--color-primary)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" d="M7.5 14.25v2.25m3-4.5v4.5m3-6.75v6.75m3-9v9M6 20.25h12A2.25 2.25 0 0020.25 18V6A2.25 2.25 0 0018 3.75H6A2.25 2.25 0 003.75 6v12A2.25 2.25 0 006 20.25z" />
                  </svg>
                </div>
                <WorkflowCardMenu
                  workflowId={wf.id}
                  workflowName={wf.name}
                  onDelete={(e) => handleDelete(wf.id, e)}
                  onDuplicate={(e) => { e.stopPropagation(); handleCreate() }}
                  lang={lang}
                />
              </div>
              <h3 className="text-[13px] font-semibold leading-[18px] text-[var(--color-text-primary)] truncate mb-1">{wf.name}</h3>
              {wf.description && (
                <p className="text-[12px] text-[var(--color-text-muted)] truncate mb-3">{wf.description}</p>
              )}
              <div className="flex items-center justify-between text-[11px] text-[var(--color-text-muted)] mt-3 pt-3 border-t border-[var(--color-border-subtle)]">
                <span>{wf.node_count} {t('nodes')}</span>
                <span>{new Date(wf.updated_at).toLocaleDateString(lang === 'tr' ? 'tr-TR' : 'en-US', { month: 'short', day: 'numeric', year: 'numeric' })}</span>
              </div>
            </div>
          ))}
        </div>
      )}
    </main>
    {showTemplates && <WorkflowTemplateModal onClose={() => setShowTemplates(false)} />}
    </>
  )
}

function readWorkflowOrder(): string[] {
  try {
    const raw = localStorage.getItem(WORKFLOW_ORDER_KEY)
    const value = raw ? JSON.parse(raw) : []
    return Array.isArray(value) ? value.map(String) : []
  } catch {
    return []
  }
}

function WorkflowCardMenu({ workflowId, workflowName, onDelete, onDuplicate, lang }: {
  workflowId: string
  workflowName: string
  onDelete: (e: MouseEvent) => void
  onDuplicate: (e: MouseEvent) => void
  lang: string
}) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const tr = lang === 'tr'

  return (
    <div className="relative">
      <button
        onClick={(e) => { e.stopPropagation(); setOpen(!open) }}
        className="w-7 h-7 rounded-lg flex items-center justify-center text-transparent group-hover:text-[var(--color-text-muted)] hover:!text-[var(--color-text-primary)] hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
        aria-label="Workflow actions"
      >
        <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor">
          <circle cx="8" cy="3" r="1.5" />
          <circle cx="8" cy="8" r="1.5" />
          <circle cx="8" cy="13" r="1.5" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={(e) => { e.stopPropagation(); setOpen(false) }} />
          <div className="absolute right-0 top-full mt-1 z-50 min-w-[150px] rounded-xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-xl py-1">
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); navigate(`/workflows/${workflowId}/edit`) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
            >
              {tr ? 'Düzenle' : 'Edit'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDuplicate(e as unknown as MouseEvent) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
            >
              {tr ? 'Kopyala' : 'Duplicate'}
            </button>
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); navigator.clipboard.writeText(window.location.origin + `/workflows/${workflowId}/edit`); toast.success(tr ? 'Link kopyalandı' : 'Link copied') }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors"
            >
              {tr ? 'Paylaş' : 'Share'}
            </button>
            <div className="my-1 border-t border-[var(--color-border-subtle)]" />
            <button
              onClick={(e) => { e.stopPropagation(); setOpen(false); onDelete(e as unknown as MouseEvent) }}
              className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#FF453A] hover:bg-[#FF453A]/[0.08] transition-colors"
            >
              {tr ? 'Sil' : 'Delete'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
