import { useEffect, useMemo, useState, type ReactNode } from 'react'
import { useLocation, useNavigate, useParams } from 'react-router-dom'
import BrandLogo from '../../../components/BrandLogo'
import NotificationCenter from '../../../components/NotificationCenter'
import PageTour from '../../../components/PageTour'
import ProfileMenu from '../../../components/ProfileMenu'
import ThemeToggle from '../../../components/ThemeToggle'
import { useI18n } from '../../../i18n'
import { useWorkspace } from '../WorkspaceContext'
import ProjectSwitcher from './ProjectSwitcher'
import WorkspaceSwitcher from './WorkspaceSwitcher'

interface WorkspaceShellProps {
  children: ReactNode
}

interface NavItem {
  label: string
  path: string
  icon: ReactNode
  active?: boolean
  onClick?: () => void
}

interface CommandItem {
  label: string
  detail: string
  path: string
  icon: ReactNode
  keywords: string[]
}

export default function WorkspaceShell({ children }: WorkspaceShellProps) {
  const navigate = useNavigate()
  const location = useLocation()
  const { workspaceId, projectId } = useParams()
  const { lang, setLang } = useI18n()
  const {
    activeWorkspace,
    activeWorkspaceId,
    projects,
    activeProject,
    setActiveWorkspaceId,
    setActiveProjectId,
  } = useWorkspace()
  const [sidebarOpen, setSidebarOpen] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => localStorage.getItem('daflow.workspaceSidebarCollapsed') === '1')
  const [command, setCommand] = useState('')
  const [commandFocused, setCommandFocused] = useState(false)
  const [commandIndex, setCommandIndex] = useState(0)
  const tr = lang === 'tr'

  useEffect(() => {
    if (workspaceId) setActiveWorkspaceId(workspaceId)
  }, [workspaceId, setActiveWorkspaceId])

  useEffect(() => {
    if (!workspaceId) return
    if (projectId) {
      setActiveProjectId(projectId, workspaceId)
      return
    }
    if (location.pathname === `/workspaces/${workspaceId}` || location.pathname === `/workspaces/${workspaceId}/projects`) {
      setActiveProjectId(null, workspaceId)
    }
  }, [location.pathname, projectId, setActiveProjectId, workspaceId])

  const selectedProject = useMemo(
    () => projects.find((project) => project.id === projectId) ?? activeProject,
    [activeProject, projectId, projects],
  )

  const baseWorkspaceId = workspaceId || activeWorkspaceId
  const overviewPath = baseWorkspaceId ? `/workspaces/${baseWorkspaceId}` : '/workflows'
  const projectsPath = baseWorkspaceId ? `/workspaces/${baseWorkspaceId}/projects` : '/workflows'
  const membersPath = baseWorkspaceId ? `/workspaces/${baseWorkspaceId}/members` : '/workflows'
  const workspaceBasePath = baseWorkspaceId ? `/workspaces/${baseWorkspaceId}` : ''
  const selectedProjectBasePath = baseWorkspaceId && selectedProject ? `/workspaces/${baseWorkspaceId}/projects/${selectedProject.id}` : ''

  const toggleSidebarCollapsed = () => {
    setSidebarCollapsed((value) => {
      const next = !value
      localStorage.setItem('daflow.workspaceSidebarCollapsed', next ? '1' : '0')
      return next
    })
  }

  const commands: CommandItem[] = [
    {
      label: tr ? 'Dosyalar' : 'Files',
      detail: selectedProject ? selectedProject.name : (tr ? 'Aktif workspace verileri' : 'Active workspace data'),
      path: selectedProjectBasePath ? `${selectedProjectBasePath}/files` : workspaceBasePath ? `${workspaceBasePath}/files` : '/datasets',
      icon: <DatabaseIcon />,
      keywords: ['dataset', 'datasets', 'data', 'file', 'files', 'veri', 'dosya', 'dosyalar'],
    },
    {
      label: tr ? 'Workflowlar' : 'Workflows',
      detail: selectedProject ? selectedProject.name : (tr ? 'İş akışı listesi' : 'Workflow list'),
      path: selectedProjectBasePath ? `${selectedProjectBasePath}/workflows` : workspaceBasePath ? `${workspaceBasePath}/workflows` : '/workflows',
      icon: <FlowIcon />,
      keywords: ['workflow', 'workflows', 'flow', 'akış', 'akis', 'iş akışı', 'is akisi'],
    },
    {
      label: tr ? 'Dashboardlar' : 'Dashboards',
      detail: selectedProject ? selectedProject.name : (tr ? 'Görsel çıktılar' : 'Visual outputs'),
      path: selectedProjectBasePath ? `${selectedProjectBasePath}/dashboards` : workspaceBasePath ? `${workspaceBasePath}/dashboards` : '/dashboards',
      icon: <DashboardIcon />,
      keywords: ['dashboard', 'dashboards', 'panel', 'paneller', 'gösterge', 'gosterge'],
    },
    {
      label: tr ? 'Raporlar' : 'Reports',
      detail: selectedProject ? selectedProject.name : (tr ? 'Rapor çıktıları' : 'Report outputs'),
      path: selectedProjectBasePath ? `${selectedProjectBasePath}/reports` : workspaceBasePath ? `${workspaceBasePath}/reports` : '/reports',
      icon: <ReportIcon />,
      keywords: ['report', 'reports', 'rep', 'rapor', 'raporlar'],
    },
    {
      label: tr ? 'Projeler' : 'Projects',
      detail: tr ? 'Workspace proje listesi' : 'Workspace project list',
      path: projectsPath,
      icon: <FolderIcon />,
      keywords: ['project', 'projects', 'proje', 'projeler'],
    },
    {
      label: tr ? 'Üyeler ve Roller' : 'Members & Roles',
      detail: tr ? 'Takım erişim yönetimi' : 'Team access management',
      path: membersPath,
      icon: <MembersIcon />,
      keywords: ['member', 'members', 'team', 'role', 'roles', 'üye', 'uye', 'takım', 'takim', 'rol'],
    },
    {
      label: tr ? 'Workspace Ayarları' : 'Workspace Settings',
      detail: tr ? 'Alan ayarları ve silme' : 'Workspace settings and delete',
      path: `${overviewPath}#workspace-settings`,
      icon: <SettingsIcon />,
      keywords: ['settings', 'setting', 'ayar', 'ayarlar', 'delete', 'sil'],
    },
  ]

  const commandResults = useMemo(() => {
    const value = command.trim().toLowerCase()
    if (!value) return commands.slice(0, 5)
    return commands
      .map((item) => {
        const label = item.label.toLowerCase()
        const detail = item.detail.toLowerCase()
        const keywordMatch = item.keywords.some((keyword) => keyword.toLowerCase().includes(value) || value.includes(keyword.toLowerCase()))
        const labelMatch = label.includes(value)
        const detailMatch = detail.includes(value)
        const score = label.startsWith(value) ? 4 : labelMatch ? 3 : keywordMatch ? 2 : detailMatch ? 1 : 0
        return { item, score }
      })
      .filter((entry) => entry.score > 0)
      .sort((a, b) => b.score - a.score || a.item.label.localeCompare(b.item.label))
      .map((entry) => entry.item)
      .slice(0, 6)
  }, [command, commands])

  useEffect(() => {
    setCommandIndex(0)
  }, [command])

  const runCommand = (item = commandResults[commandIndex] || commandResults[0]) => {
    if (!item) return
    navigate(item.path)
    setCommand('')
    setCommandFocused(false)
    setSidebarOpen(false)
  }

  const projectItems: NavItem[] = selectedProject ? [
    {
      label: tr ? 'Dosyalar' : 'Files',
      path: `${selectedProjectBasePath}/files`,
      icon: <DatabaseIcon />,
      onClick: () => setActiveProjectId(selectedProject.id, baseWorkspaceId),
    },
    {
      label: tr ? 'Workflowlar' : 'Workflows',
      path: `${selectedProjectBasePath}/workflows`,
      icon: <FlowIcon />,
      onClick: () => setActiveProjectId(selectedProject.id, baseWorkspaceId),
    },
    {
      label: tr ? 'Dashboardlar' : 'Dashboards',
      path: `${selectedProjectBasePath}/dashboards`,
      icon: <DashboardIcon />,
      onClick: () => setActiveProjectId(selectedProject.id, baseWorkspaceId),
    },
    {
      label: tr ? 'Raporlar' : 'Reports',
      path: `${selectedProjectBasePath}/reports`,
      icon: <ReportIcon />,
      onClick: () => setActiveProjectId(selectedProject.id, baseWorkspaceId),
    },
    {
      label: tr ? 'Yorumlar' : 'Comments',
      path: `${overviewPath}/projects/${selectedProject.id}#comments`,
      icon: <CommentIcon />,
    },
    {
      label: tr ? 'Aktivite' : 'Activity',
      path: `${overviewPath}/projects/${selectedProject.id}#activity`,
      icon: <ActivityIcon />,
    },
  ] : []

  const sidebar = (collapsed: boolean) => (
    <WorkspaceSidebar
      tr={tr}
      collapsed={collapsed}
      workspaceId={baseWorkspaceId}
      activePath={location.pathname}
      projects={projects}
      selectedProjectId={selectedProject?.id ?? null}
      overviewPath={overviewPath}
      projectsPath={projectsPath}
      membersPath={membersPath}
      projectItems={projectItems}
      onClose={() => setSidebarOpen(false)}
      onToggleCollapsed={toggleSidebarCollapsed}
      onSelectProject={(id) => {
        if (!baseWorkspaceId) return
        setActiveProjectId(id, baseWorkspaceId)
        navigate(`/workspaces/${baseWorkspaceId}/projects/${id}`)
        setSidebarOpen(false)
      }}
      onNavigate={(path) => {
        navigate(path)
        setSidebarOpen(false)
      }}
    />
  )

  return (
    <div className="min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-primary)] font-sans">
      <header className="sticky top-0 z-50 h-12 border-b border-[var(--color-border-default)] bg-[var(--color-bg-page)]/92 dark:bg-[var(--color-bg-page)]/92 backdrop-blur-xl">
        <div className="h-full px-4 lg:px-5 flex items-center justify-between gap-3">
          <div className="min-w-0 flex items-center gap-2.5">
            <button
              onClick={() => setSidebarOpen(true)}
              className="lg:hidden w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
              aria-label={tr ? 'Menüyü aç' : 'Open menu'}
            >
              <MenuIcon />
            </button>
            <button
              onClick={() => navigate('/')}
              className="hidden sm:inline-flex items-center text-[var(--color-text-primary)]"
              aria-label="Daflow"
            >
              <BrandLogo size="sm" />
            </button>
            <span className="hidden sm:block h-5 w-px bg-[var(--color-border-default)]" />
            <WorkspaceSwitcher />
            <ProjectSwitcher />
          </div>

          <div className="hidden md:flex flex-1 max-w-md items-center">
            <div className="relative w-full">
              <SearchIcon />
              <input
                value={command}
                onChange={(event) => setCommand(event.target.value)}
                onFocus={() => setCommandFocused(true)}
                onBlur={() => window.setTimeout(() => setCommandFocused(false), 120)}
                onKeyDown={(event) => {
                  if (event.key === 'ArrowDown') {
                    event.preventDefault()
                    setCommandIndex((index) => Math.min(index + 1, Math.max(commandResults.length - 1, 0)))
                  }
                  if (event.key === 'ArrowUp') {
                    event.preventDefault()
                    setCommandIndex((index) => Math.max(index - 1, 0))
                  }
                  if (event.key === 'Enter') {
                    event.preventDefault()
                    runCommand()
                  }
                  if (event.key === 'Escape') setCommandFocused(false)
                }}
                placeholder={tr ? 'Ara veya komut yaz...' : 'Search or type a command...'}
                className="h-8 w-full rounded-xl border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/70 dark:bg-white/[0.055] pl-8 pr-3 text-[12px] outline-none placeholder:text-[var(--color-text-muted)] focus:border-primary/35"
              />
              {commandFocused && commandResults.length > 0 && (
                <div className="dropdown-popover absolute left-0 right-0 top-10 z-[90] rounded-2xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-2xl overflow-hidden p-1">
                  {commandResults.map((item, index) => (
                    <button
                      key={item.label}
                      onMouseDown={(event) => {
                        event.preventDefault()
                        runCommand(item)
                      }}
                      className={`w-full rounded-xl px-3 py-2.5 flex items-center gap-3 text-left transition-colors ${
                        index === commandIndex
                          ? 'bg-black/[0.06] dark:bg-white/[0.08]'
                          : 'hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="w-7 h-7 rounded-xl bg-black/[0.04] dark:bg-white/[0.06] flex items-center justify-center text-[var(--color-text-secondary)] [&_svg]:w-4 [&_svg]:h-4">
                        {item.icon}
                      </span>
                      <span className="min-w-0 flex-1">
                        <span className="block text-[12px] font-semibold text-[var(--color-text-primary)] truncate">{item.label}</span>
                        <span className="block text-[10px] text-[var(--color-text-muted)] truncate">{item.detail}</span>
                      </span>
                      <span className="text-[10px] text-[var(--color-text-muted)]">↵</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>

          <div className="shrink-0 flex items-center gap-2">
            <div className="hidden sm:flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
              {(['en', 'tr'] as const).map((nextLang) => (
                <button
                  key={nextLang}
                  onClick={() => setLang(nextLang)}
                  className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                    lang === nextLang
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
                  }`}
                >
                  {nextLang === 'en' ? 'EN' : 'TR'}
                </button>
              ))}
            </div>
            <ThemeToggle title={tr ? 'Tema' : 'Theme'} />
            <NotificationCenter />
            <ProfileMenu />
          </div>
        </div>
      </header>

      <div className="flex">
        <aside className={`hidden lg:block sticky top-12 h-[calc(100vh-3rem)] shrink-0 border-r border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/62 dark:bg-white/[0.025] backdrop-blur-xl overflow-y-auto transition-all duration-200 ${sidebarCollapsed ? 'w-14' : 'w-[240px]'}`}>
          {sidebar(sidebarCollapsed)}
        </aside>
        {sidebarOpen && (
          <div className="fixed inset-0 z-[70] lg:hidden">
            <div className="absolute inset-0 bg-black/30 backdrop-blur-sm" onClick={() => setSidebarOpen(false)} />
            <aside className="relative h-full w-[300px] max-w-[86vw] border-r border-[var(--color-border-default)] bg-[var(--color-bg-page)] shadow-2xl overflow-y-auto">
              {sidebar(false)}
            </aside>
          </div>
        )}
        <section className="min-w-0 flex-1">
          {children}
        </section>
      </div>
      <PageTour />
    </div>
  )
}

function WorkspaceSidebar({
  tr,
  collapsed,
  workspaceId,
  activePath,
  projects,
  selectedProjectId,
  overviewPath,
  projectsPath,
  membersPath,
  projectItems,
  onClose,
  onToggleCollapsed,
  onSelectProject,
  onNavigate,
}: {
  tr: boolean
  collapsed: boolean
  workspaceId: string | null
  activePath: string
  projects: { id: string; name: string; description?: string | null; stats?: { workflows?: number; datasets?: number } }[]
  selectedProjectId: string | null
  overviewPath: string
  projectsPath: string
  membersPath: string
  projectItems: NavItem[]
  onClose: () => void
  onToggleCollapsed: () => void
  onSelectProject: (id: string) => void
  onNavigate: (path: string) => void
}) {
  const settingsPath = workspaceId ? `/workspaces/${workspaceId}#workspace-settings` : overviewPath

  return (
    <nav className={`${collapsed ? 'p-2' : 'p-3'} relative group/sidebar min-h-full`}>
      <div className="lg:hidden mb-3 flex items-center justify-between">
        <BrandLogo size="sm" />
        <button onClick={onClose} className="w-8 h-8 rounded-xl flex items-center justify-center hover:bg-black/[0.04] dark:hover:bg-white/[0.06]">
          <CloseIcon />
        </button>
      </div>
      <div className="hidden lg:flex absolute right-1 top-1/2 z-20 -translate-y-1/2 opacity-0 group-hover/sidebar:opacity-100 focus-within:opacity-100 transition-opacity">
        <button
          onClick={onToggleCollapsed}
          className="w-7 h-12 rounded-full border border-[var(--color-border-default)] bg-[var(--color-bg-surface)]/80 dark:bg-[var(--color-bg-surface)]/90 backdrop-blur-xl shadow-sm flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-bg-surface)] transition-colors"
          title={collapsed ? (tr ? 'Sidebar aç' : 'Expand sidebar') : (tr ? 'Sidebar kapat' : 'Collapse sidebar')}
        >
          {collapsed ? <ExpandIcon /> : <CollapseIcon />}
        </button>
      </div>

      <SidebarButton
        label={tr ? 'Workspace Özeti' : 'Workspace Overview'}
        icon={<HomeIcon />}
        active={activePath === overviewPath}
        onClick={() => onNavigate(overviewPath)}
        collapsed={collapsed}
      />

      {!collapsed && <div className="mt-5 mb-2 flex items-center justify-between px-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {tr ? 'Projeler' : 'Projects'}
        </p>
        <button
          onClick={() => onNavigate(projectsPath)}
          className="text-[11px] text-[var(--color-text-secondary)] hover:text-[var(--color-primary)]"
        >
          {tr ? 'Yönet' : 'Manage'}
        </button>
      </div>}

      <div className={`space-y-1 ${collapsed ? 'mt-3' : ''}`}>
        <SidebarButton
          label={tr ? 'Tüm projeler' : 'All projects'}
          icon={<FolderIcon />}
          active={activePath === projectsPath}
          onClick={() => onNavigate(projectsPath)}
          collapsed={collapsed}
        />
        {projects.map((project) => (
          <button
            key={project.id}
            onClick={() => onSelectProject(project.id)}
            title={project.name}
            className={`w-full rounded-2xl text-left transition-all duration-200 ${collapsed ? 'h-10 px-0 flex items-center justify-center' : 'px-3 py-2.5'} ${
              project.id === selectedProjectId
                ? 'bg-primary/10 text-[#0057B8] dark:text-[#80BFFF] border border-primary/15'
                : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] border border-transparent'
            }`}
          >
            <span className={`flex items-center ${collapsed ? 'justify-center' : 'gap-2'}`}>
              <span className="w-5 h-5 flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4">
                <FolderIcon />
              </span>
              {!collapsed && <span className="min-w-0 flex-1">
                <span className="block text-[12px] font-semibold truncate">{project.name}</span>
                <span className="block text-[10px] opacity-45 truncate">
                  {(project.stats?.datasets ?? 0)} data · {(project.stats?.workflows ?? 0)} workflow
                </span>
              </span>}
            </span>
          </button>
        ))}
        {!projects.length && !collapsed && (
          <button
            onClick={() => onNavigate(projectsPath)}
            className="w-full rounded-2xl border border-dashed border-[var(--color-border-default)] px-3 py-4 text-[12px] text-[var(--color-text-muted)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]"
          >
            {tr ? 'İlk projeyi oluştur' : 'Create first project'}
          </button>
        )}
      </div>

      {projectItems.length > 0 && (
        <>
          {!collapsed && <div className="mt-5 mb-2 px-2">
            <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
              {tr ? 'Seçili Proje' : 'Selected Project'}
            </p>
          </div>}
          <div className={`space-y-1 rounded-3xl border border-[var(--color-border-subtle)] bg-[var(--color-bg-surface)]/70 dark:bg-white/[0.035] p-1.5 ${collapsed ? 'mt-4' : ''}`}>
            {projectItems.map((item) => (
              <SidebarButton
                key={item.label}
                label={item.label}
                icon={item.icon}
                active={activePath === item.path}
                collapsed={collapsed}
                onClick={() => {
                  item.onClick?.()
                  onNavigate(item.path)
                }}
              />
            ))}
          </div>
        </>
      )}

      {!collapsed && <div className="mt-5 mb-2 px-2">
        <p className="text-[10px] font-semibold uppercase tracking-[0.18em] text-[var(--color-text-muted)]">
          {tr ? 'Ekip' : 'Team'}
        </p>
      </div>}
      <div className={`space-y-1 ${collapsed ? 'mt-4' : ''}`}>
        <SidebarButton
          label={tr ? 'Üyeler ve Roller' : 'Members & Roles'}
          icon={<MembersIcon />}
          active={activePath === membersPath}
          onClick={() => onNavigate(membersPath)}
          collapsed={collapsed}
        />
        <SidebarButton
          label={tr ? 'Workspace Ayarları' : 'Workspace Settings'}
          icon={<SettingsIcon />}
          active={false}
          onClick={() => onNavigate(settingsPath)}
          collapsed={collapsed}
        />
      </div>
    </nav>
  )
}

function SidebarButton({ label, icon, active, collapsed, onClick }: { label: string; icon: ReactNode; active: boolean; collapsed: boolean; onClick: () => void }) {
  return (
    <button
      onClick={onClick}
      title={collapsed ? label : undefined}
      className={`w-full h-8 rounded-lg flex items-center text-left text-[12px] transition-all duration-200 ${collapsed ? 'justify-center px-0' : 'gap-2.5 px-3'} ${
        active
          ? 'bg-black/[0.08] dark:bg-white/[0.10] text-[var(--color-text-primary)] font-medium'
          : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06]'
      }`}
    >
      <span className="w-5 h-5 flex items-center justify-center shrink-0 [&_svg]:w-4 [&_svg]:h-4">{icon}</span>
      {!collapsed && <span className="truncate">{label}</span>}
    </button>
  )
}

function MenuIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M4 7h16M4 12h16M4 17h16" /></svg>
}

function CloseIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" d="M6 6l12 12M18 6 6 18" /></svg>
}

function CollapseIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M15 5 8 12l7 7" /></svg>
}

function ExpandIcon() {
  return <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m9 5 7 7-7 7" /></svg>
}

function SearchIcon() {
  return <svg className="absolute left-3 top-1/2 w-3.5 h-3.5 -translate-y-1/2 text-[var(--color-text-muted)]" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="m21 21-4.3-4.3M10.5 18a7.5 7.5 0 1 1 0-15 7.5 7.5 0 0 1 0 15Z" /></svg>
}

function HomeIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 10.5 12 4l8 6.5V20H5a1 1 0 0 1-1-1v-8.5Z" /><path strokeLinecap="round" d="M9 20v-6h6v6" /></svg>
}

function FolderIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M3.5 7.5A2.5 2.5 0 0 1 6 5h4l2 2h6A2.5 2.5 0 0 1 20.5 9.5v7A2.5 2.5 0 0 1 18 19H6a2.5 2.5 0 0 1-2.5-2.5v-9Z" /></svg>
}

function DatabaseIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 7c0-1.7 3.1-3 7-3s7 1.3 7 3-3.1 3-7 3-7-1.3-7-3Zm0 0v5c0 1.7 3.1 3 7 3s7-1.3 7-3V7M5 12v5c0 1.7 3.1 3 7 3s7-1.3 7-3v-5" /></svg>
}

function FlowIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 7h4m2 0h4M7 17h4m2 0h4M11 7c1.5 0 2 .9 2 2.3v5.4c0 1.4.5 2.3 2 2.3" /><circle cx="5" cy="7" r="2" /><circle cx="19" cy="7" r="2" /><circle cx="5" cy="17" r="2" /><circle cx="19" cy="17" r="2" /></svg>
}

function DashboardIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 5h16v14H4zM8 15V9m4 6v-3m4 3V8" /></svg>
}

function ReportIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M7 3h7l5 5v13H7zM14 3v5h5M10 13h6M10 17h6M10 9h2" /></svg>
}

function CommentIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M5 6.5A3.5 3.5 0 0 1 8.5 3h7A3.5 3.5 0 0 1 19 6.5v5A3.5 3.5 0 0 1 15.5 15H11l-5 5v-5.5A3.5 3.5 0 0 1 5 12V6.5Z" /></svg>
}

function ActivityIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M4 19h16M7 16V8m5 8V5m5 11v-6" /></svg>
}

function MembersIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M16 11a4 4 0 1 0-8 0 4 4 0 0 0 8 0ZM4 21a8 8 0 0 1 16 0" /></svg>
}

function SettingsIcon() {
  return <svg fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" d="M12 8.5a3.5 3.5 0 1 0 0 7 3.5 3.5 0 0 0 0-7Z" /><path strokeLinecap="round" strokeLinejoin="round" d="M19.4 15a1.8 1.8 0 0 0 .36 2l.04.04a2 2 0 0 1-2.83 2.83l-.04-.04a1.8 1.8 0 0 0-2-.36 1.8 1.8 0 0 0-1.1 1.65V21a2 2 0 0 1-4 0v-.06a1.8 1.8 0 0 0-1.1-1.65 1.8 1.8 0 0 0-2 .36l-.04.04a2 2 0 0 1-2.83-2.83l.04-.04a1.8 1.8 0 0 0 .36-2 1.8 1.8 0 0 0-1.65-1.1H2.5a2 2 0 0 1 0-4h.06a1.8 1.8 0 0 0 1.65-1.1 1.8 1.8 0 0 0-.36-2l-.04-.04A2 2 0 0 1 6.64 3.7l.04.04a1.8 1.8 0 0 0 2 .36 1.8 1.8 0 0 0 1.1-1.65V2.4a2 2 0 0 1 4 0v.06a1.8 1.8 0 0 0 1.1 1.65 1.8 1.8 0 0 0 2-.36l.04-.04a2 2 0 0 1 2.83 2.83l-.04.04a1.8 1.8 0 0 0-.36 2 1.8 1.8 0 0 0 1.65 1.1h.06a2 2 0 0 1 0 4h-.06A1.8 1.8 0 0 0 19.4 15Z" /></svg>
}
