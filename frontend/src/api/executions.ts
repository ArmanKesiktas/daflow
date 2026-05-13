import api from './client'
import type { DatasetDetail, DatasetListItem, ExecutionCompare, ExecutionStatus, NodeResult } from '../types/workflow'

export const executionsApi = {
  getStatus: (execId: string): Promise<ExecutionStatus> =>
    api.get(`/executions/${execId}`).then((r) => r.data),

  getNodeResult: (execId: string, nodeId: string): Promise<NodeResult> =>
    api.get(`/executions/${execId}/results/${nodeId}`).then((r) => r.data),

  list: (workflowId?: string): Promise<ExecutionStatus[]> =>
    api.get('/executions/', { params: { workflow_id: workflowId } }).then((r) => r.data),

  getAiSummary: (execId: string, language = 'English'): Promise<{ insights: string }> =>
    api.post(`/executions/${execId}/ai-summary`, { language }).then((r) => r.data),

  cancel: (execId: string): Promise<{ execution_id: string; status: string }> =>
    api.post(`/executions/${execId}/cancel`).then((r) => r.data),

  getExportPermission: (execId: string): Promise<{ allowed: boolean; reason?: string; denied?: { dataset_id: string; reason: string }[] }> =>
    api.get(`/executions/${execId}/export-permission`).then((r) => r.data),

  compare: (execId: string, otherId: string): Promise<ExecutionCompare> =>
    api.get(`/executions/${execId}/compare/${otherId}`).then((r) => r.data),
}

export const reportsApi = {
  create: (payload: { execution_id: string; title?: string; format?: string }) =>
    api.post('/reports/', payload).then((r) => r.data),

  list: (workspaceId?: string | null, projectId?: string | null) =>
    api.get('/reports/', { params: { workspace_id: workspaceId || undefined, project_id: projectId || undefined } }).then((r) => r.data),

  getJson: (reportId: string) =>
    api.get(`/reports/${reportId}/json`).then((r) => r.data),

  getPdfUrl: (reportId: string) => `/api/reports/${reportId}/pdf`,

  getExportPermission: (reportId: string): Promise<{ allowed: boolean; reason?: string }> =>
    api.get(`/reports/${reportId}/export-permission`).then((r) => r.data),

  getAiInsights: (reportId: string, language = 'English'): Promise<{ insights: string }> =>
    api.post(`/reports/${reportId}/ai-insights`, { language }).then((r) => r.data),

}

export const dashboardsApi = {
  list: (workspaceId?: string | null, projectId?: string | null): Promise<{
    execution_id: string
    workflow_id: string
    workflow_name: string
    title: string
    panel_count: number
    created_at: string
  }[]> => api.get('/dashboards/', { params: { workspace_id: workspaceId || undefined, project_id: projectId || undefined } }).then((r) => r.data),

}

export const filesApi = {
  upload: (file: File, onProgress?: (pct: number) => void, workspaceId?: string | null, projectId?: string | null) => {
    const form = new FormData()
    form.append('file', file)
    if (workspaceId) form.append('workspace_id', workspaceId)
    if (projectId) form.append('project_id', projectId)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then((r) => r.data)
  },

  list: (workspaceId?: string | null, projectId?: string | null): Promise<DatasetListItem[]> =>
    api.get('/files/', { params: { workspace_id: workspaceId || undefined, project_id: projectId || undefined } }).then((r) => r.data),

  samples: () => api.get('/files/samples').then((r) => r.data),

  detail: (fileId: string): Promise<DatasetDetail> =>
    api.get(`/files/${fileId}`).then((r) => r.data),

  rename: (fileId: string, filename: string) =>
    api.patch(`/files/${fileId}`, { filename }).then((r) => r.data),

  createWorkflow: (fileId: string, name?: string): Promise<{ id: string; name: string }> =>
    api.post(`/files/${fileId}/create-workflow`, { name }).then((r) => r.data),

  delete: (fileId: string) => api.delete(`/files/${fileId}`).then((r) => r.data),

  downloadUrl: (fileId: string) => `/api/files/${fileId}/download`,
}
