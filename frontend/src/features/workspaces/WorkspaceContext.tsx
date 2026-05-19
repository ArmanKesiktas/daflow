import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from 'react'
import toast from 'react-hot-toast'
import { workspacesApi } from '../../api/workspaces'
import type { Workspace, WorkspaceProject } from '../../types/workflow'
import { useAuth } from '../../auth/AuthProvider'

interface WorkspaceContextValue {
  workspaces: Workspace[]
  activeWorkspace: Workspace | null
  activeWorkspaceId: string | null
  projects: WorkspaceProject[]
  activeProject: WorkspaceProject | null
  activeProjectId: string | null
  loading: boolean
  refresh: () => Promise<void>
  setActiveWorkspaceId: (id: string | null) => void
  setActiveProjectId: (id: string | null, workspaceId?: string | null) => void
  refreshProjects: () => Promise<void>
  upsertProject: (project: WorkspaceProject) => void
  createWorkspace: (name: string, description?: string) => Promise<Workspace | null>
}

const WorkspaceContext = createContext<WorkspaceContextValue | null>(null)
const STORAGE_KEY = 'daflow.activeWorkspaceId'
const PROJECT_STORAGE_KEY = 'daflow.activeProjectByWorkspace'

function normalizeName(value: string) {
  return value.trim().toLocaleLowerCase().replace(/\s+/g, ' ')
}

function apiErrorMessage(error: unknown, fallback: string) {
  const detail = (error as { response?: { data?: { detail?: unknown; message?: unknown } } })?.response?.data?.detail
  const message = (error as { response?: { data?: { message?: unknown } } })?.response?.data?.message
  return typeof detail === 'string' ? detail : typeof message === 'string' ? message : fallback
}

export function WorkspaceProvider({ children }: { children: ReactNode }) {
  const { isAuthenticated } = useAuth()
  const [workspaces, setWorkspaces] = useState<Workspace[]>([])
  const [activeWorkspaceId, setActiveWorkspaceIdState] = useState<string | null>(() => localStorage.getItem(STORAGE_KEY))
  const [projectByWorkspace, setProjectByWorkspace] = useState<Record<string, string | null>>(() => {
    try {
      return JSON.parse(localStorage.getItem(PROJECT_STORAGE_KEY) || '{}')
    } catch {
      return {}
    }
  })
  const [projects, setProjects] = useState<WorkspaceProject[]>([])
  const [loading, setLoading] = useState(false)

  const setActiveWorkspaceId = useCallback((id: string | null) => {
    setActiveWorkspaceIdState(id)
    if (id) localStorage.setItem(STORAGE_KEY, id)
    else localStorage.removeItem(STORAGE_KEY)
  }, [])

  const setActiveProjectId = useCallback((id: string | null, explicitWorkspaceId?: string | null) => {
    const workspaceId = explicitWorkspaceId || activeWorkspaceId || localStorage.getItem(STORAGE_KEY)
    if (!workspaceId) return
    setProjectByWorkspace((current) => {
      const next = { ...current, [workspaceId]: id }
      localStorage.setItem(PROJECT_STORAGE_KEY, JSON.stringify(next))
      return next
    })
  }, [activeWorkspaceId])

  const refresh = useCallback(async () => {
    if (!isAuthenticated) {
      setWorkspaces([])
      setActiveWorkspaceIdState(null)
      return
    }
    setLoading(true)
    try {
      const items = await workspacesApi.list()
      setWorkspaces(items)
      const stored = localStorage.getItem(STORAGE_KEY)
      const next = (stored && items.some((item) => item.id === stored) ? stored : items[0]?.id) || null
      if (next) setActiveWorkspaceId(next)
    } catch {
      toast.error('Workspace listesi yüklenemedi')
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, setActiveWorkspaceId])

  useEffect(() => {
    void refresh()
  }, [refresh])

  const refreshProjects = useCallback(async () => {
    if (!activeWorkspaceId || !workspaces.some((workspace) => workspace.id === activeWorkspaceId)) {
      setProjects([])
      return
    }
    try {
      const items = await workspacesApi.projects(activeWorkspaceId)
      setProjects(items)
      const selected = projectByWorkspace[activeWorkspaceId]
      if (selected && !items.some((item) => item.id === selected)) {
        setActiveProjectId(null)
      }
    } catch {
      setProjects([])
    }
  }, [activeWorkspaceId, projectByWorkspace, setActiveProjectId, workspaces])

  useEffect(() => {
    void refreshProjects()
  }, [refreshProjects])

  const upsertProject = useCallback((project: WorkspaceProject) => {
    setProjects((items) => [project, ...items.filter((item) => item.id !== project.id)])
  }, [])

  const createWorkspace = useCallback(async (name: string, description?: string) => {
    const trimmedName = name.trim()
    if (!trimmedName) return null
    if (workspaces.some((workspace) => normalizeName(workspace.name) === normalizeName(trimmedName))) {
      toast.error('Bu isimde bir workspace zaten var')
      return null
    }
    try {
      const workspace = await workspacesApi.create({ name: trimmedName, description })
      if (workspace.storage_ready === false) {
        setWorkspaces([workspace])
        setActiveWorkspaceId(workspace.id)
        toast.error('Workspace tabloları Supabase’e uygulanmadı; kişisel alan kullanılacak')
        return null
      }
      setWorkspaces((items) => [workspace, ...items])
      setActiveWorkspaceId(workspace.id)
      return workspace
    } catch (error) {
      toast.error(apiErrorMessage(error, 'Workspace oluşturulamadı'))
      return null
    }
  }, [setActiveWorkspaceId, workspaces])

  const activeWorkspace = useMemo(
    () => workspaces.find((workspace) => workspace.id === activeWorkspaceId) ?? workspaces[0] ?? null,
    [activeWorkspaceId, workspaces],
  )
  const activeProjectId = activeWorkspace?.id ? projectByWorkspace[activeWorkspace.id] ?? null : null
  const activeProject = useMemo(
    () => projects.find((project) => project.id === activeProjectId) ?? null,
    [activeProjectId, projects],
  )

  return (
    <WorkspaceContext.Provider value={{ workspaces, activeWorkspace, activeWorkspaceId: activeWorkspace?.id ?? null, projects, activeProject, activeProjectId, loading, refresh, setActiveWorkspaceId, setActiveProjectId, refreshProjects, upsertProject, createWorkspace }}>
      {children}
    </WorkspaceContext.Provider>
  )
}

export function useWorkspace() {
  const value = useContext(WorkspaceContext)
  if (!value) throw new Error('useWorkspace must be used inside WorkspaceProvider')
  return value
}
