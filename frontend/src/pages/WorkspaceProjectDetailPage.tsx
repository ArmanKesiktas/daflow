import { useEffect, useMemo, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { workspacesApi } from '../api/workspaces'
import PageHeader from '../components/ui/PageHeader'
import ActivityFeed from '../features/workspaces/components/ActivityFeed'
import CommentsPanel from '../features/workspaces/components/CommentsPanel'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import { useI18n } from '../i18n'
import type { WorkspaceActivity, WorkspaceProject } from '../types/workflow'

export default function WorkspaceProjectDetailPage() {
  const { workspaceId, projectId } = useParams()
  const navigate = useNavigate()
  const { lang } = useI18n()
  const { activeWorkspace, setActiveWorkspaceId, setActiveProjectId } = useWorkspace()
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [activity, setActivity] = useState<WorkspaceActivity[]>([])
  const tr = lang === 'tr'

  useEffect(() => {
    if (!workspaceId || !projectId) return
    setActiveWorkspaceId(workspaceId)
    setActiveProjectId(projectId, workspaceId)
    workspacesApi.projects(workspaceId).then(setProjects).catch(() => setProjects([]))
    workspacesApi.activity(workspaceId).then(setActivity).catch(() => setActivity([]))
  }, [workspaceId, projectId, setActiveWorkspaceId, setActiveProjectId])

  const project = useMemo(
    () => projects.find((item) => item.id === projectId) ?? null,
    [projectId, projects],
  )

  if (!workspaceId || !projectId) return null

  const cards = [
    { label: tr ? 'Veri' : 'Data', value: project?.stats?.datasets ?? 0, href: `/workspaces/${workspaceId}/projects/${projectId}/files` },
    { label: tr ? 'Workflow' : 'Workflows', value: project?.stats?.workflows ?? 0, href: `/workspaces/${workspaceId}/projects/${projectId}/workflows` },
    { label: tr ? 'Dashboard' : 'Dashboards', value: project?.stats?.dashboards ?? 0, href: `/workspaces/${workspaceId}/projects/${projectId}/dashboards` },
    { label: tr ? 'Rapor' : 'Reports', value: project?.stats?.reports ?? 0, href: `/workspaces/${workspaceId}/projects/${projectId}/reports` },
  ]
  const filteredActivity = activity.filter((item) => {
    const meta = item.metadata || {}
    return item.entity_id === projectId || meta.project_id === projectId || meta.projectId === projectId
  })

  return (
    <main className="max-w-6xl mx-auto px-6 pt-6 pb-8">
      <PageHeader
        title={project?.name || (tr ? 'Proje' : 'Project')}
        subtitle={project?.description || (tr
          ? 'Bu proje seçiliyken veri, workflow, dashboard ve rapor listeleri otomatik olarak bu proje ile filtrelenir.'
          : 'When this project is selected, data, workflow, dashboard and report lists are automatically filtered by this project.')}
        backTo={`/workspaces/${workspaceId}`}
        actions={
          <button
            onClick={() => {
              setActiveProjectId(projectId, workspaceId)
              navigate(`/workspaces/${workspaceId}/projects/${projectId}/workflows`)
            }}
            className="h-9 rounded-lg bg-primary px-4 text-[13px] font-medium text-white hover:bg-primary-hover transition-colors"
          >
            {tr ? 'Bu projede workflow aç' : 'Open workflows in this project'}
          </button>
        }
      />

      <div className="grid gap-3 md:grid-cols-4 mb-6">
        {cards.map((card) => (
          <button
            key={card.label}
            onClick={() => {
              setActiveProjectId(projectId, workspaceId)
              navigate(card.href)
            }}
            className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4 text-left hover:bg-black/[0.02] dark:hover:bg-white/[0.04] transition-colors"
          >
            <p className="text-2xl font-semibold tracking-tight text-[var(--color-text-primary)]">{card.value}</p>
            <p className="mt-1 text-xs text-[var(--color-text-secondary)]">{card.label}</p>
          </button>
        ))}
      </div>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_360px]">
        <section id="activity" className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4 scroll-mt-20">
          <h2 className="mb-3 text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">{tr ? 'Proje Aktivitesi' : 'Project Activity'}</h2>
          <ActivityFeed items={filteredActivity.length ? filteredActivity : activity.slice(0, 8)} />
        </section>
        <div id="comments" className="scroll-mt-20">
          <CommentsPanel workspaceId={workspaceId} entityType="workflow" entityId={projectId} />
        </div>
      </div>
    </main>
  )
}
