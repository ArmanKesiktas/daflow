import { useEffect, useState, type ReactNode } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { workspacesApi } from '../api/workspaces'
import type { Workspace, WorkspaceActivity, WorkspaceMember, WorkspaceProject, WorkspaceRole } from '../types/workflow'
import ActivityFeed from '../features/workspaces/components/ActivityFeed'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import { useI18n } from '../i18n'
import toast from 'react-hot-toast'

export default function WorkspaceDashboardPage() {
  const { workspaceId } = useParams()
  const navigate = useNavigate()
  const { setActiveWorkspaceId, refresh } = useWorkspace()
  const { lang } = useI18n()
  const [workspace, setWorkspace] = useState<Workspace | null>(null)
  const [activity, setActivity] = useState<WorkspaceActivity[]>([])
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [members, setMembers] = useState<WorkspaceMember[]>([])
  const [loading, setLoading] = useState(true)
  const [confirmDelete, setConfirmDelete] = useState(false)

  useEffect(() => {
    if (!workspaceId) return
    setActiveWorkspaceId(workspaceId)
    setLoading(true)
    Promise.all([
      workspacesApi.get(workspaceId).then(setWorkspace),
      workspacesApi.activity(workspaceId).then(setActivity).catch(() => setActivity([])),
      workspacesApi.projects(workspaceId).then(setProjects).catch(() => setProjects([])),
      workspacesApi.members(workspaceId).then(setMembers).catch(() => setMembers([])),
    ]).finally(() => setLoading(false))
  }, [workspaceId, setActiveWorkspaceId])

  if (loading) return <main className="max-w-6xl mx-auto p-8 text-[13px] text-[var(--color-text-muted)]">Loading workspace...</main>
  if (!workspace) return <main className="max-w-6xl mx-auto p-8 text-[var(--color-text-primary)]">Workspace not found</main>
  const tr = lang === 'tr'
  const stats = workspace.stats || { datasets: 0, workflows: 0, dashboards: 0, reports: 0, members: 0 }
  const canDelete = workspace.role === 'owner'

  const deleteWorkspace = async () => {
    if (!workspace.id) return
    try {
      await workspacesApi.remove(workspace.id)
      toast.success(tr ? 'Workspace silindi' : 'Workspace deleted')
      setActiveWorkspaceId(null)
      await refresh()
      navigate('/workflows')
    } catch {
      toast.error(tr ? 'Workspace silinemedi' : 'Workspace could not be deleted')
    }
  }

  return (
    <main className="max-w-6xl mx-auto px-6 pt-6 pb-8">
      <div className="flex items-start justify-between gap-4 mb-6">
        <div>
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)] mb-1">{workspace.name}</h1>
          <p className="text-[15px] leading-[22px] text-[var(--color-text-muted)]">{workspace.description || 'Veri analiz çalışma alanı.'}</p>
        </div>
        <span className="h-8 px-3 rounded-full bg-surface border border-[var(--color-border-default)] inline-flex items-center text-[12px] text-[var(--color-text-secondary)]">
          {workspace.role || 'member'}
        </span>
      </div>

      <section data-tour="workspace-stats" className="grid grid-cols-2 md:grid-cols-5 gap-3 mb-6">
        <Stat label="Datasets" value={stats.datasets} icon={<DatasetIcon />} />
        <Stat label="Workflows" value={stats.workflows} icon={<WorkflowIcon />} />
        <Stat label="Dashboards" value={stats.dashboards} icon={<DashboardIcon />} />
        <Stat label="Reports" value={stats.reports} icon={<ReportIcon />} />
        <Stat label="Members" value={stats.members} icon={<MembersIcon />} />
      </section>

      <ProjectMemberMap projects={projects} members={members} tr={tr} onOpenProjects={() => navigate(`/workspaces/${workspace.id}/projects`)} />

      <section className="grid lg:grid-cols-[1fr_360px] gap-5 items-start">
        <div className="space-y-4">
          <div data-tour="workspace-actions" className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4">
            <div className="flex items-start justify-between gap-3 mb-4">
              <div>
                <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">{tr ? 'Hızlı başlangıç' : 'Quick start'}</h2>
                <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                  {tr ? 'Bu workspace içinde en sık yapılan işlemler.' : 'Common actions for this workspace.'}
                </p>
              </div>
              <span className="text-[10px] px-2 h-6 rounded-full bg-[var(--color-secondary)] text-[var(--color-text-secondary)] inline-flex items-center">
                {workspace.role || 'member'}
              </span>
            </div>
            <div className="grid sm:grid-cols-3 gap-2">
              <QuickAction icon={<DatasetIcon />} label={tr ? 'Veri yükle' : 'Upload dataset'} detail={tr ? 'CSV / Excel ekle' : 'Add CSV / Excel'} onClick={() => navigate(`/workspaces/${workspace.id}/files`)} />
              <QuickAction icon={<WorkflowIcon />} label={tr ? 'Workflow oluştur' : 'Create workflow'} detail={tr ? 'Canvas aç' : 'Open canvas'} onClick={() => navigate(`/workspaces/${workspace.id}/workflows`)} />
              <QuickAction icon={<DashboardIcon />} label={tr ? 'Dashboard aç' : 'Open dashboards'} detail={tr ? 'Çıktıları gör' : 'Review outputs'} onClick={() => navigate(`/workspaces/${workspace.id}/dashboards`)} />
            </div>
          </div>

          <div className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4">
            <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)] mb-3">{tr ? 'Workspace durumu' : 'Workspace status'}</h2>
            <div className="grid sm:grid-cols-3 gap-2">
              <StatusPill label={tr ? 'Aktif proje' : 'Active project'} value={String(projects.length)} />
              <StatusPill label={tr ? 'Aktif üye' : 'Active members'} value={String(members.filter((member) => member.status === 'active').length)} />
              <StatusPill label={tr ? 'Son aktivite' : 'Latest activity'} value={activity[0] ? new Date(activity[0].created_at).toLocaleDateString() : '-'} />
            </div>
            <div className="mt-4 grid sm:grid-cols-2 gap-2">
              {projects.slice(0, 2).map((project) => (
                <button
                  key={project.id}
                  onClick={() => navigate(`/workspaces/${workspace.id}/projects/${project.id}`)}
                  className="text-left rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-secondary)] p-3 hover:bg-[var(--color-border-default)] transition-colors"
                >
                  <p className="text-[13px] font-semibold truncate text-[var(--color-text-primary)]">{project.name}</p>
                  <p className="mt-1 text-[11px] text-[var(--color-text-muted)]">
                    {(project.stats?.workflows ?? 0)} workflow · {(project.stats?.dashboards ?? 0)} dashboard
                  </p>
                </button>
              ))}
              {!projects.length && (
                <button
                  onClick={() => navigate(`/workspaces/${workspace.id}/projects`)}
                  className="sm:col-span-2 rounded-lg border border-dashed border-[var(--color-border-default)] p-4 text-[12px] text-[var(--color-text-muted)] hover:bg-[var(--color-secondary)] transition-colors"
                >
                  {tr ? 'İlk projeyi oluştur' : 'Create the first project'}
                </button>
              )}
            </div>
          </div>
        </div>
        <div className="min-w-0">
          <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)] mb-3">Recent activity</h2>
          <div className="max-h-[520px] overflow-y-auto pr-1">
            <ActivityFeed items={activity.slice(0, 8)} />
          </div>
        </div>
      </section>

      {canDelete && (
        <section id="workspace-settings" data-tour="workspace-danger" className="mt-6 rounded-lg border border-danger/20 bg-danger/[0.04] p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">{tr ? 'Workspace sil' : 'Delete workspace'}</h2>
              <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
                {tr ? 'Bu işlem workspace içindeki bağlı kayıtları etkileyebilir. Silmeden önce emin olun.' : 'This can affect records attached to the workspace. Confirm before deleting.'}
              </p>
            </div>
            <button onClick={() => setConfirmDelete(true)} className="h-9 px-4 rounded-xl bg-danger/10 text-danger text-[13px] font-medium hover:bg-danger/15">
              {tr ? 'Sil' : 'Delete'}
            </button>
          </div>
        </section>
      )}

      {confirmDelete && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm" onClick={() => setConfirmDelete(false)} />
          <div className="relative w-full max-w-sm mx-4 rounded-lg bg-surface border border-[var(--color-border-default)] p-4 shadow-xl">
            <h3 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">{tr ? 'Emin misiniz?' : 'Are you sure?'}</h3>
            <p className="mt-2 text-[13px] text-[var(--color-text-secondary)]">{tr ? 'Workspace silme işlemi geri alınamaz.' : 'Deleting a workspace cannot be undone.'}</p>
            <div className="mt-5 flex justify-end gap-2">
              <button onClick={() => setConfirmDelete(false)} className="h-9 px-4 rounded-xl bg-[var(--color-secondary)] text-[13px] text-[var(--color-text-primary)]">{tr ? 'Vazgeç' : 'Cancel'}</button>
              <button onClick={deleteWorkspace} className="h-9 px-4 rounded-xl bg-danger text-white text-[13px] font-medium">{tr ? 'Sil' : 'Delete'}</button>
            </div>
          </div>
        </div>
      )}
    </main>
  )
}

function ProjectMemberMap({
  projects,
  members,
  tr,
  onOpenProjects,
}: {
  projects: WorkspaceProject[]
  members: WorkspaceMember[]
  tr: boolean
  onOpenProjects: () => void
}) {
  const activeMembers = members.filter((member) => member.status === 'active')
  const visibleProjects = projects.slice(0, 6)
  return (
    <section className="mb-6 rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4">
      <div className="flex items-start justify-between gap-4 mb-5">
        <div>
          <h2 className="text-[15px] font-semibold leading-[22px] text-[var(--color-text-primary)]">
            {tr ? 'Proje / Üye Haritası' : 'Project / Member Map'}
          </h2>
          <p className="mt-1 text-[12px] text-[var(--color-text-secondary)]">
            {tr
              ? 'Projeler workspace üyeleriyle birlikte gösterilir. Rol, o projedeki genel erişim seviyesini belirler.'
              : 'Projects are shown with workspace members. Each role defines the general access level for that project.'}
          </p>
        </div>
        <button onClick={onOpenProjects} className="h-8 px-3 rounded-xl bg-[var(--color-secondary)] text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-colors">
          {tr ? 'Projeleri yönet' : 'Manage projects'}
        </button>
      </div>

      {visibleProjects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[var(--color-border-default)] p-8 text-center text-[13px] text-[var(--color-text-muted)]">
          {tr ? 'Henüz proje yok. Proje oluşturunca burada proje haritası görünecek.' : 'No projects yet. Create a project to see the project map here.'}
        </div>
      ) : (
        <div className="grid lg:grid-cols-2 gap-3">
          {visibleProjects.map((project) => (
            <ProjectCard key={project.id} project={project} members={activeMembers} tr={tr} workspaceId={projects[0] ? undefined : undefined} />
          ))}
        </div>
      )}
    </section>
  )
}

function ProjectCard({ project, members, tr }: { project: WorkspaceProject; members: WorkspaceMember[]; tr: boolean; workspaceId?: string }) {
  const [menuOpen, setMenuOpen] = useState(false)
  const navigate = useNavigate()
  const { lang } = useI18n()

  return (
    <article className="group relative rounded-lg border border-[var(--color-border-subtle)] bg-[var(--color-secondary)] p-4 hover:border-[var(--color-border-default)] transition-colors">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <h3 className="text-[13px] font-semibold truncate text-[var(--color-text-primary)]">{project.name}</h3>
          <p className="mt-1 text-[11px] text-[var(--color-text-muted)] truncate">{project.description || (tr ? 'Proje açıklaması yok' : 'No project description')}</p>
        </div>
        <div className="flex items-center gap-1.5 shrink-0">
          <span className="text-[10px] px-2 h-6 rounded-full bg-surface border border-[var(--color-border-subtle)] text-[var(--color-text-secondary)] inline-flex items-center">
            {(project.stats?.workflows ?? 0)} WF
          </span>
          {/* Three-dot menu — visible on hover */}
          <div className="relative">
            <button
              onClick={(e) => { e.stopPropagation(); setMenuOpen(!menuOpen) }}
              className="w-6 h-6 rounded-md flex items-center justify-center opacity-0 group-hover:opacity-100 hover:bg-black/[0.06] dark:hover:bg-white/[0.08] transition-all"
              aria-label="Project actions"
            >
              <svg width="12" height="12" viewBox="0 0 16 16" fill="currentColor" className="text-[var(--color-text-muted)]">
                <circle cx="8" cy="3" r="1.5" />
                <circle cx="8" cy="8" r="1.5" />
                <circle cx="8" cy="13" r="1.5" />
              </svg>
            </button>
            {menuOpen && (
              <>
                <div className="fixed inset-0 z-40" onClick={() => setMenuOpen(false)} />
                <div className="absolute right-0 top-full mt-1 z-50 min-w-[140px] rounded-xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-xl py-1">
                  <button onClick={() => { setMenuOpen(false); navigate(`/workspaces/${project.workspace_id}/projects/${project.id}`) }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors">
                    {tr ? 'Aç' : 'Open'}
                  </button>
                  <button onClick={() => { setMenuOpen(false); toast.success(tr ? 'Paylaşım linki kopyalandı' : 'Share link copied'); navigator.clipboard.writeText(window.location.origin + `/workspaces/${project.workspace_id}/projects/${project.id}`) }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[var(--color-text-primary)] hover:bg-[var(--color-secondary)] transition-colors">
                    {tr ? 'Paylaş' : 'Share'}
                  </button>
                  <button onClick={() => { setMenuOpen(false); toast.success(tr ? 'Proje silme henüz desteklenmiyor' : 'Project deletion not yet supported') }} className="w-full flex items-center gap-2 px-3 py-2 text-[12px] text-[#FF453A] hover:bg-[#FF453A]/[0.08] transition-colors">
                    {tr ? 'Sil' : 'Delete'}
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      </div>
      <div className="mt-4 flex flex-wrap gap-1.5">
        {members.slice(0, 7).map((member) => (
          <MemberChip key={`${project.id}-${member.id}`} member={member} />
        ))}
        {members.length > 7 && (
          <span className="h-7 px-2 rounded-full bg-surface border border-[var(--color-border-subtle)] text-[11px] text-[var(--color-text-secondary)] inline-flex items-center">
            +{members.length - 7}
          </span>
        )}
        {members.length === 0 && (
          <span className="text-[12px] text-[var(--color-text-muted)]">{tr ? 'Aktif üye yok' : 'No active members'}</span>
        )}
      </div>
    </article>
  )
}

function MemberChip({ member }: { member: WorkspaceMember }) {
  const name = member.email || member.user_id
  return (
    <span className="h-7 max-w-[190px] rounded-full bg-surface border border-[var(--color-border-subtle)] px-2 inline-flex items-center gap-1.5">
      <span className="w-4 h-4 rounded-full bg-[var(--color-secondary)] text-[9px] font-semibold flex items-center justify-center shrink-0 text-[var(--color-text-primary)]">
        {name.slice(0, 1).toUpperCase()}
      </span>
      <span className="text-[11px] truncate text-[var(--color-text-primary)]">{name}</span>
      <span className={`text-[9px] px-1.5 py-0.5 rounded-full ${roleTone(member.role)}`}>{member.role}</span>
    </span>
  )
}

function roleTone(role: WorkspaceRole) {
  switch (role) {
    case 'owner':
      return 'bg-warning/12 text-warning'
    case 'admin':
      return 'bg-info/12 text-info'
    case 'analyst':
      return 'bg-success/12 text-success'
    case 'viewer':
      return 'bg-primary/10 text-primary'
    case 'guest':
      return 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'
    default:
      return 'bg-[var(--color-secondary)] text-[var(--color-text-secondary)]'
  }
}

function QuickAction({ icon, label, detail, onClick }: { icon: ReactNode; label: string; detail: string; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      className="h-20 rounded-lg border border-[var(--color-border-default)] bg-[var(--color-secondary)] px-3 text-left hover:bg-[var(--color-border-default)] transition-colors"
    >
      <span className="flex items-center gap-2">
        <span className="w-7 h-7 flex items-center justify-center text-[var(--color-text-primary)] [&_svg]:w-5 [&_svg]:h-5">{icon}</span>
        <span className="min-w-0">
          <span className="block text-[13px] font-semibold text-[var(--color-text-primary)] truncate">{label}</span>
          <span className="block mt-0.5 text-[11px] text-[var(--color-text-muted)] truncate">{detail}</span>
        </span>
      </span>
    </button>
  )
}

function StatusPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-lg bg-[var(--color-secondary)] border border-[var(--color-border-subtle)] p-3">
      <p className="text-[10px] text-[var(--color-text-muted)] truncate">{label}</p>
      <p className="mt-1 text-[15px] font-semibold text-[var(--color-text-primary)] truncate">{value}</p>
    </div>
  )
}

function Stat({ label, value, icon }: { label: string; value: number; icon: ReactNode }) {
  return (
    <div className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm p-4">
      <div className="flex items-center justify-between gap-3">
        <p className="text-[12px] text-[var(--color-text-secondary)]">{label}</p>
        <span className="w-8 h-8 rounded-xl flex items-center justify-center text-[var(--color-text-primary)]">
          {icon}
        </span>
      </div>
      <p className="text-2xl font-semibold mt-1 text-[var(--color-text-primary)]">{value}</p>
    </div>
  )
}

function DatasetIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 7c0-2 3.6-3.5 8-3.5S20 5 20 7s-3.6 3.5-8 3.5S4 9 4 7Zm0 0v5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5V7M4 12v5c0 2 3.6 3.5 8 3.5s8-1.5 8-3.5v-5" /></svg>
}

function WorkflowIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M6 7h5m2 0h5M6 17h5m2 0h5M11 7c1.5 0 2 1 2 2.5v5c0 1.5.5 2.5 2 2.5" /><circle cx="4" cy="7" r="2" /><circle cx="20" cy="7" r="2" /><circle cx="4" cy="17" r="2" /><circle cx="20" cy="17" r="2" /></svg>
}

function DashboardIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 15V9m4 6v-3m4 3V8" /></svg>
}

function ReportIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6M10 9h2" /></svg>
}

function MembersIcon() {
  return <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 10-8 0 4 4 0 008 0ZM4 21a8 8 0 0116 0M18 8a3 3 0 012 5M2 21a6 6 0 016-6" /></svg>
}
