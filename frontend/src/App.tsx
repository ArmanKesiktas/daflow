import { Routes, Route, Navigate } from 'react-router-dom'
import WorkflowEditorPage from './pages/WorkflowEditorPage'
import WorkflowsListPage from './pages/WorkflowsListPage'
import ReportsPage from './pages/ReportsPage'
import ReportDetailPage from './pages/ReportDetailPage'
import DashboardPage from './pages/DashboardPage'
import DashboardsListPage from './pages/DashboardsListPage'

export default function App() {
  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white font-sans">
      <Routes>
        <Route path="/" element={<Navigate to="/workflows" replace />} />
        <Route path="/workflows" element={<WorkflowsListPage />} />
        <Route path="/workflows/:workflowId/edit" element={<WorkflowEditorPage />} />
        <Route path="/dashboard/:executionId" element={<DashboardPage />} />
        <Route path="/dashboards" element={<DashboardsListPage />} />
        <Route path="/reports" element={<ReportsPage />} />
        <Route path="/reports/:reportId" element={<ReportDetailPage />} />
      </Routes>
    </div>
  )
}

