import { useEffect, useState } from 'react'
import toast from 'react-hot-toast'
import { useNavigate, useParams } from 'react-router-dom'
import { workspacesApi } from '../api/workspaces'
import type { WorkspaceProject } from '../types/workflow'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import { LoadingState } from '../components/ui/LoadingState'
import { EmptyState } from '../components/ui/EmptyState'
import { ErrorState } from '../components/ui/ErrorState'
import { useI18n } from '../i18n'

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function apiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown; message?: unknown } } })?.response?.data?.detail
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof detail === 'string' ? detail : typeof message === 'string' ? message : fallback
}

export default function WorkspaceProjectsPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { setActiveWorkspaceId, setActiveProjectId, upsertProject } = useWorkspace()
  const { lang } = useI18n()
  const tr = lang === 'tr'
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [name, setName] = useState('')

  const load = () => {
    if (!workspaceId) return
    setLoading(true)
    setError(null)
    workspacesApi
      .projects(workspaceId)
      .then((data) => {
        setProjects(data)
        setLoading(false)
      })
      .catch(() => {
        setError('Projeler yüklenemedi')
        setLoading(false)
        toast.error('Projeler yüklenemedi')
      })
  }

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
    load()
  }, [workspaceId])

  const create = async () => {
    if (!workspaceId || !name.trim()) return
    const trimmedName = name.trim()
    if (projects.some((project) => normalizeName(project.name) === normalizeName(trimmedName))) {
      toast.error(tr ? 'Bu workspace içinde aynı isimde bir proje zaten var' : 'A project with this name already exists in this workspace')
      return
    }
    try {
      const project = await workspacesApi.createProject(workspaceId, { name: trimmedName })
      setProjects((items) => [project, ...items])
      upsertProject(project)
      setActiveProjectId(project.id, workspaceId)
      setName('')
      toast.success('Proje oluşturuldu')
    } catch (error) {
      toast.error(apiErrorMessage(error, tr ? 'Proje oluşturulamadı' : 'Project could not be created'))
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 pt-6 pb-20">
      {/* Page header */}
      <div className="flex items-start justify-between mb-6">
        <div>
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)]">
            Projects
          </h1>
          <p className="text-[13px] text-[var(--color-text-secondary)] mt-1">
            Workspace içindeki dosya, workflow, dashboard ve raporları proje bazında topla.
          </p>
        </div>
        <div className="flex gap-2">
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            onKeyDown={(e) => e.key === 'Enter' && create()}
            placeholder={tr ? 'Proje adı' : 'Project name'}
            className="h-9 rounded-lg bg-black/[0.04] dark:bg-white/[0.06] border border-[var(--color-border-default)] px-3 text-[13px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] outline-none focus:ring-2 focus:ring-primary/50 transition-colors"
          />
          <button
            onClick={create}
            className="h-9 px-4 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[13px] font-medium transition-all"
          >
            {tr ? 'Oluştur' : 'Create'}
          </button>
        </div>
      </div>

      {/* Content area with loading/error/empty/list states */}
      {loading ? (
        <LoadingState variant="grid" rows={6} message={tr ? 'Projeler yükleniyor...' : 'Loading projects...'} />
      ) : error ? (
        <ErrorState message={error} onRetry={load} />
      ) : projects.length === 0 ? (
        <EmptyState
          icon={
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 12.75V12A2.25 2.25 0 014.5 9.75h15A2.25 2.25 0 0121.75 12v.75m-8.69-6.44l-2.12-2.12a1.5 1.5 0 00-1.061-.44H4.5A2.25 2.25 0 002.25 6v12a2.25 2.25 0 002.25 2.25h15A2.25 2.25 0 0021.75 18V9a2.25 2.25 0 00-2.25-2.25h-5.379a1.5 1.5 0 01-1.06-.44z" />
            </svg>
          }
          title="Henüz proje yok"
          description="Yeni bir proje oluşturarak başlayın."
        />
      ) : (
        <div className="grid md:grid-cols-2 xl:grid-cols-3 gap-3">
          {projects.map((project) => (
            <article
              key={project.id}
              onClick={() => navigate(`/workspaces/${workspaceId}/projects/${project.id}`)}
              className="rounded-lg border border-[var(--color-border-default)] bg-surface p-5 cursor-pointer hover:bg-[var(--color-secondary)] hover:border-[var(--color-border-default)] shadow-sm transition-colors"
            >
              <h2 className="text-[15px] font-semibold text-[var(--color-text-primary)] mb-1">
                {project.name}
              </h2>
              <p className="text-[12px] text-[var(--color-text-muted)] mb-4">
                {project.description || (tr ? 'Açıklama yok' : 'No description')}
              </p>
              <div className="grid grid-cols-4 gap-2">
                <Mini label="Files" value={project.stats?.datasets || 0} />
                <Mini label="Flows" value={project.stats?.workflows || 0} />
                <Mini label="Dash" value={project.stats?.dashboards || 0} />
                <Mini label="Reports" value={project.stats?.reports || 0} />
              </div>
            </article>
          ))}
        </div>
      )}
    </main>
  )
}

function Mini({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg bg-[var(--color-secondary)] p-2 text-center">
      <p className="text-[15px] font-semibold text-[var(--color-text-primary)]">{value}</p>
      <p className="text-[10px] text-[var(--color-text-muted)]">{label}</p>
    </div>
  )
}
