import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useWorkspace } from '../WorkspaceContext'
import { useI18n } from '../../../i18n'

export default function ProjectSwitcher() {
  const navigate = useNavigate()
  const { lang } = useI18n()
  const { activeWorkspace, activeWorkspaceId, projects, activeProject, setActiveProjectId } = useWorkspace()
  const [open, setOpen] = useState(false)
  const tr = lang === 'tr'

  if (!activeWorkspaceId) return null

  const selectProject = (id: string | null) => {
    setActiveProjectId(id)
    setOpen(false)
    if (id) navigate(`/workspaces/${activeWorkspaceId}/projects/${id}`)
    else navigate(`/workspaces/${activeWorkspaceId}`)
  }

  return (
    <div className="relative flex items-center gap-1 text-[12px]">
      <span className="text-[#1d1d1f]/25 dark:text-white/25">/</span>
      <button
        onClick={() => setOpen((value) => !value)}
        className="h-8 max-w-[220px] rounded-xl border border-black/[0.08] dark:border-white/[0.08] bg-white/70 dark:bg-white/[0.06] px-3 flex items-center gap-2 font-medium text-[#1d1d1f]/72 dark:text-white/72"
        title={tr ? 'Aktif proje' : 'Active project'}
      >
        <span className="truncate">{activeProject?.name || (tr ? 'Tüm projeler' : 'All projects')}</span>
        <span className="text-[#1d1d1f]/35 dark:text-white/35">⌄</span>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="dropdown-popover dropdown-popover-left absolute left-3 top-10 z-[80] w-72 rounded-2xl border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-[#1C1C1E] shadow-2xl p-2">
            <div className="px-3 py-2 border-b border-black/[0.06] dark:border-white/[0.08]">
              <p className="text-[11px] uppercase tracking-[0.18em] text-[#1d1d1f]/35 dark:text-white/35">{activeWorkspace?.name}</p>
              <p className="mt-1 text-[12px] text-[#1d1d1f]/55 dark:text-white/55">
                {tr ? 'Supabase yolu gibi alan / proje seçimi' : 'Workspace / project path selector'}
              </p>
            </div>
            <button
              onClick={() => selectProject(null)}
              className={`mt-2 w-full h-9 rounded-xl px-3 text-left text-[12px] ${!activeProject ? 'bg-black/[0.06] dark:bg-white/[0.08] font-semibold' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
            >
              {tr ? 'Tüm projeler' : 'All projects'}
            </button>
            <div className="mt-1 max-h-56 overflow-y-auto">
              {projects.map((project) => (
                <button
                  key={project.id}
                  onClick={() => selectProject(project.id)}
                  className={`w-full rounded-xl px-3 py-2 text-left ${project.id === activeProject?.id ? 'bg-black/[0.06] dark:bg-white/[0.08]' : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'}`}
                >
                  <span className="block text-[12px] font-medium truncate">{project.name}</span>
                  <span className="block text-[10px] text-[#1d1d1f]/38 dark:text-white/38">
                    {(project.stats?.datasets ?? 0)} data · {(project.stats?.workflows ?? 0)} workflow
                  </span>
                </button>
              ))}
              {!projects.length && (
                <div className="px-3 py-4 text-[12px] text-[#1d1d1f]/40 dark:text-white/40">
                  {tr ? 'Henüz proje yok.' : 'No projects yet.'}
                </div>
              )}
            </div>
            <button
              onClick={() => {
                setOpen(false)
                navigate(`/workspaces/${activeWorkspaceId}/projects`)
              }}
              className="mt-2 w-full h-9 rounded-xl text-[12px] font-medium text-[#0071E3] hover:bg-[#0071E3]/10"
            >
              {tr ? 'Projeleri yönet' : 'Manage projects'}
            </button>
          </div>
        </>
      )}
    </div>
  )
}
