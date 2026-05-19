import { lazy, Suspense, useEffect } from 'react'
import { Routes, Route, Navigate, useNavigate } from 'react-router-dom'
import { useAuth } from './auth/AuthProvider'
import ProtectedRoute from './auth/ProtectedRoute'
import Layout from './components/Layout'
import WorkflowsListPage from './pages/WorkflowsListPage'
import ReportsPage from './pages/ReportsPage'
import DashboardsListPage from './pages/DashboardsListPage'
import DatasetDetailPage from './pages/DatasetDetailPage'
import DatasetsPage from './pages/DatasetsPage'
import SharedWithMePage from './pages/SharedWithMePage'
import PricingPage from './pages/PricingPage'
import AuthPage from './pages/AuthPage'
import ResetPasswordPage from './pages/ResetPasswordPage'
import PublicDashboardPage from './pages/PublicDashboardPage'
import PublicReportPage from './pages/PublicReportPage'
import WorkspaceDashboardPage from './pages/WorkspaceDashboardPage'
import WorkspaceMembersPage from './pages/WorkspaceMembersPage'
import WorkspaceProjectsPage from './pages/WorkspaceProjectsPage'
import WorkspaceProjectDetailPage from './pages/WorkspaceProjectDetailPage'
import InvitationPage from './pages/InvitationPage'
import HelpPage from './pages/HelpPage'
import NotFoundPage from './pages/NotFoundPage'
import SettingsPage from './pages/SettingsPage'
import MarketingInfoPage from './pages/MarketingInfoPage'
import { useWorkspace } from './features/workspaces/WorkspaceContext'
import WorkspaceShell from './features/workspaces/components/WorkspaceShell'

// Lazy-loaded heavy pages for code splitting
const WorkflowEditorPage = lazy(() => import('./pages/WorkflowEditorPage'))
const DashboardPage = lazy(() => import('./pages/DashboardPage'))
const ReportDetailPage = lazy(() => import('./pages/ReportDetailPage'))
const LandingPage = lazy(() => import('./pages/LandingPage'))

export default function App() {
  const { isAuthenticated } = useAuth()
  const { activeWorkspaceId } = useWorkspace()
  const navigate = useNavigate()
  const homePath = activeWorkspaceId ? `/workspaces/${activeWorkspaceId}` : '/workflows'

  useEffect(() => {
    if (window.location.pathname === '/reset-password') return
    const hash = window.location.hash.replace(/^#/, '')
    if (!hash) return
    const params = new URLSearchParams(hash)
    if (params.get('access_token') && params.get('type') === 'recovery') {
      navigate(`/reset-password#${hash}`, { replace: true })
    }
  }, [navigate])

  return (
    <Suspense fallback={<div className="min-h-screen flex items-center justify-center"><span className="w-6 h-6 border-2 border-[var(--color-border-default)] border-t-[#0071E3] rounded-full animate-spin" /></div>}>
    <Routes>
      <Route path="/" element={<LandingPage />} />
      <Route path="/pricing" element={<PricingPage />} />
      <Route path="/login" element={isAuthenticated ? <Navigate to={homePath} replace /> : <AuthPage />} />
      <Route path="/auth" element={<Navigate to="/login" replace />} />
      <Route path="/reset-password" element={<ResetPasswordPage />} />
      <Route path="/about" element={<MarketingInfoPage kind="about" />} />
      <Route path="/blog" element={<MarketingInfoPage kind="blog" />} />
      <Route path="/updates" element={<MarketingInfoPage kind="updates" />} />
      <Route path="/public/dashboards/:token" element={<PublicDashboardPage />} />
      <Route path="/public/reports/:token" element={<PublicReportPage />} />
      <Route path="/invitations/:token" element={<ProtectedRoute><Layout><InvitationPage /></Layout></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId" element={<ProtectedRoute><WorkspaceShell><WorkspaceDashboardPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/members" element={<ProtectedRoute><WorkspaceShell><WorkspaceMembersPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects" element={<ProtectedRoute><WorkspaceShell><WorkspaceProjectsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/files" element={<ProtectedRoute><WorkspaceShell><DatasetsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/datasets" element={<ProtectedRoute><WorkspaceShell><DatasetsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/workflows" element={<ProtectedRoute><WorkspaceShell><WorkflowsListPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/dashboards" element={<ProtectedRoute><WorkspaceShell><DashboardsListPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/reports" element={<ProtectedRoute><WorkspaceShell><ReportsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId" element={<ProtectedRoute><WorkspaceShell><WorkspaceProjectDetailPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId/files" element={<ProtectedRoute><WorkspaceShell><DatasetsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId/datasets" element={<ProtectedRoute><WorkspaceShell><DatasetsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId/workflows" element={<ProtectedRoute><WorkspaceShell><WorkflowsListPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId/dashboards" element={<ProtectedRoute><WorkspaceShell><DashboardsListPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workspaces/:workspaceId/projects/:projectId/reports" element={<ProtectedRoute><WorkspaceShell><ReportsPage /></WorkspaceShell></ProtectedRoute>} />
      <Route path="/workflows" element={<ProtectedRoute><Layout><WorkflowsListPage /></Layout></ProtectedRoute>} />
      <Route path="/workflows/:workflowId/edit" element={<ProtectedRoute><WorkflowEditorPage /></ProtectedRoute>} />
      <Route path="/dashboard/:executionId" element={<ProtectedRoute><Layout><DashboardPage /></Layout></ProtectedRoute>} />
      <Route path="/dashboards" element={<ProtectedRoute><Layout><DashboardsListPage /></Layout></ProtectedRoute>} />
      <Route path="/datasets/:fileId" element={<ProtectedRoute><Layout><DatasetDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/datasets" element={<ProtectedRoute><Layout><DatasetsPage /></Layout></ProtectedRoute>} />
      <Route path="/shared-with-me" element={<ProtectedRoute><Layout><SharedWithMePage /></Layout></ProtectedRoute>} />
      <Route path="/reports" element={<ProtectedRoute><Layout><ReportsPage /></Layout></ProtectedRoute>} />
      <Route path="/reports/:reportId" element={<ProtectedRoute><Layout><ReportDetailPage /></Layout></ProtectedRoute>} />
      <Route path="/help" element={<ProtectedRoute><Layout><HelpPage /></Layout></ProtectedRoute>} />
      <Route path="/articles" element={<ProtectedRoute><Layout><HelpPage /></Layout></ProtectedRoute>} />
      <Route path="/settings" element={<ProtectedRoute><Layout><SettingsPage /></Layout></ProtectedRoute>} />
      <Route path="*" element={<NotFoundPage />} />
    </Routes>
    </Suspense>
  )
}
