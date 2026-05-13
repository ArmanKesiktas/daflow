import { useState } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { useI18n } from '../i18n'
import ProfileMenu from './ProfileMenu'
import WorkspaceSwitcher from '../features/workspaces/components/WorkspaceSwitcher'
import ProjectSwitcher from '../features/workspaces/components/ProjectSwitcher'
import { useWorkspace } from '../features/workspaces/WorkspaceContext'
import NotificationCenter from './NotificationCenter'
import BrandLogo from './BrandLogo'
import ThemeToggle from './ThemeToggle'

interface NavItem {
  label: string
  path: string
  active?: boolean
}

function NavDropdown({ label, items }: { label: string; items: NavItem[] }) {
  const [open, setOpen] = useState(false)
  const navigate = useNavigate()
  const active = items.some((item) => item.active)
  return (
    <div className="relative">
      <button
        onClick={() => setOpen((value) => !value)}
        className={`h-7 px-3 rounded-lg text-[12px] inline-flex items-center gap-1.5 transition-colors ${
          active
            ? 'bg-black/[0.08] dark:bg-white/[0.10] text-[var(--color-text-primary)] font-medium'
            : 'text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
        }`}
      >
        {label}
        <svg className="w-3 h-3" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" d="M6 9l6 6 6-6" />
        </svg>
      </button>
      {open && (
        <>
          <div className="fixed inset-0 z-40" onClick={() => setOpen(false)} />
          <div className="dropdown-popover dropdown-popover-left absolute left-0 top-9 z-50 min-w-44 rounded-xl border border-[var(--color-border-default)] bg-[#ffffff] dark:bg-[#1C1C1E] shadow-xl p-1">
            {items.map((item) => (
              <button
                key={item.path}
                onClick={() => {
                  setOpen(false)
                  navigate(item.path)
                }}
                className={`w-full text-left h-8 px-3 rounded-lg text-[12px] transition-colors ${
                  item.active
                    ? 'bg-black/[0.08] dark:bg-white/[0.10] text-[var(--color-text-primary)] font-medium'
                    : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {item.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  )
}

export default function Navbar() {
  const navigate = useNavigate()
  const location = useLocation()
  const { lang, setLang, t } = useI18n()
  const { activeWorkspaceId, activeProjectId } = useWorkspace()
  const tr = lang === 'tr'
  const projectBasePath = activeWorkspaceId && activeProjectId ? `/workspaces/${activeWorkspaceId}/projects/${activeProjectId}` : ''
  const workspaceBasePath = activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : ''
  const isSettingsRoute = location.pathname.startsWith('/settings')

  const goBack = () => {
    if (window.history.length > 1) {
      navigate(-1)
    } else if (activeWorkspaceId) {
      navigate(`/workspaces/${activeWorkspaceId}`)
    } else {
      navigate('/workflows')
    }
  }

  const workspaceItems: NavItem[] = activeWorkspaceId ? [
    { label: tr ? 'Alan' : 'Workspace', path: `/workspaces/${activeWorkspaceId}`, active: location.pathname === `/workspaces/${activeWorkspaceId}` },
    { label: tr ? 'Üyeler' : 'Members', path: `/workspaces/${activeWorkspaceId}/members`, active: location.pathname.endsWith('/members') },
    { label: tr ? 'Projeler' : 'Projects', path: `/workspaces/${activeWorkspaceId}/projects`, active: location.pathname.includes('/projects') },
  ] : [{ label: tr ? 'İş akışları' : 'Workflows', path: '/workflows', active: location.pathname === '/workflows' }]

  const workflowItems: NavItem[] = [
    { label: tr ? 'Workflowlar' : 'Workflows', path: projectBasePath ? `${projectBasePath}/workflows` : workspaceBasePath ? `${workspaceBasePath}/workflows` : '/workflows', active: location.pathname === '/workflows' || location.pathname.endsWith('/workflows') },
    { label: tr ? 'Benimle Paylaşılan' : 'Shared With Me', path: '/shared-with-me', active: location.pathname === '/shared-with-me' },
  ]
  const dataItems: NavItem[] = [
    { label: tr ? 'Veriler' : 'Datasets', path: projectBasePath ? `${projectBasePath}/files` : workspaceBasePath ? `${workspaceBasePath}/files` : '/datasets', active: location.pathname.startsWith('/datasets') || location.pathname.endsWith('/files') || location.pathname.endsWith('/datasets') },
  ]
  const outputItems: NavItem[] = [
    { label: t('reports'), path: projectBasePath ? `${projectBasePath}/reports` : workspaceBasePath ? `${workspaceBasePath}/reports` : '/reports', active: location.pathname.startsWith('/reports') || location.pathname.endsWith('/reports') },
    { label: tr ? 'Dashboardlar' : 'Dashboards', path: projectBasePath ? `${projectBasePath}/dashboards` : workspaceBasePath ? `${workspaceBasePath}/dashboards` : '/dashboards', active: location.pathname.startsWith('/dashboard') || location.pathname.startsWith('/dashboards') || location.pathname.endsWith('/dashboards') },
  ]
  const helpItems: NavItem[] = [
    { label: tr ? 'Nasıl kullanılır' : 'How to use', path: '/help', active: location.pathname.startsWith('/help') },
    { label: tr ? 'Makaleler' : 'Articles', path: '/articles', active: location.pathname.startsWith('/articles') },
    { label: tr ? 'Daflow hakkında' : 'About Daflow', path: '/about', active: location.pathname.startsWith('/about') },
    { label: 'Blog', path: '/blog', active: location.pathname.startsWith('/blog') },
    { label: tr ? 'Güncellemeler' : 'Updates', path: '/updates', active: location.pathname.startsWith('/updates') },
  ]

  return (
    <nav className="h-11 flex items-center justify-between px-4 border-b border-[var(--color-border-default)] bg-[var(--color-bg-elevated)] backdrop-blur-[20px] sticky top-0 z-50">
      <div className="flex items-center gap-3">
        {isSettingsRoute ? (
          <button
            onClick={goBack}
            className="w-8 h-8 rounded-lg inline-flex items-center justify-center text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-colors"
            aria-label={tr ? 'Geri' : 'Back'}
            title={tr ? 'Geri' : 'Back'}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M15 19l-7-7 7-7" />
            </svg>
          </button>
        ) : (
          <button
            onClick={() => navigate('/')}
            className="inline-flex items-center text-[var(--color-text-primary)]"
            aria-label={t('appName')}
          >
            <BrandLogo size="sm" />
          </button>
        )}
        <WorkspaceSwitcher />
        <ProjectSwitcher />
        {!isSettingsRoute && (
          <div className="flex items-center gap-1">
            <NavDropdown label={tr ? 'Alan' : 'Workspace'} items={workspaceItems} />
            <NavDropdown label={tr ? 'Workflow' : 'Workflows'} items={workflowItems} />
            <NavDropdown label={tr ? 'Veri' : 'Data'} items={dataItems} />
            <NavDropdown label={tr ? 'Çıktılar' : 'Outputs'} items={outputItems} />
            <NavDropdown label={tr ? 'Yardım' : 'Help'} items={helpItems} />
          </div>
        )}
      </div>
      <div className="flex items-center gap-2">
        <div className="flex rounded-lg overflow-hidden border border-[var(--color-border-default)]">
          {(['en', 'tr'] as const).map((l) => (
            <button
              key={l}
              onClick={() => setLang(l)}
              className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                lang === l
                  ? 'bg-[var(--color-primary)] text-white'
                  : 'text-[var(--color-text-secondary)] hover:bg-black/[0.05] dark:hover:bg-white/[0.05]'
              }`}
            >
              {l === 'en' ? 'EN' : 'TR'}
            </button>
          ))}
        </div>
        <ThemeToggle title={tr ? 'Tema' : 'Theme'} />
        <NotificationCenter />
        <ProfileMenu />
      </div>
    </nav>
  )
}
