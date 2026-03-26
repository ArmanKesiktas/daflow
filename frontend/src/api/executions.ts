import api from './client'
import type { ExecutionStatus, NodeResult } from '../types/workflow'

export const executionsApi = {
  getStatus: (execId: string): Promise<ExecutionStatus> =>
    api.get(`/executions/${execId}`).then((r) => r.data),

  getNodeResult: (execId: string, nodeId: string): Promise<NodeResult> =>
    api.get(`/executions/${execId}/results/${nodeId}`).then((r) => r.data),

  list: (workflowId?: string): Promise<ExecutionStatus[]> =>
    api.get('/executions/', { params: { workflow_id: workflowId } }).then((r) => r.data),

  getAiSummary: (execId: string, language = 'English'): Promise<{ insights: string }> =>
    api.post(`/executions/${execId}/ai-summary`, { language }).then((r) => r.data),
}

export const reportsApi = {
  create: (payload: { execution_id: string; title?: string; format?: string }) =>
    api.post('/reports/', payload).then((r) => r.data),

  list: () => api.get('/reports/').then((r) => r.data),

  getJson: (reportId: string) =>
    api.get(`/reports/${reportId}/json`).then((r) => r.data),

  getPdfUrl: (reportId: string) => `/api/reports/${reportId}/pdf`,

  getAiInsights: (reportId: string, language = 'English'): Promise<{ insights: string }> =>
    api.post(`/reports/${reportId}/ai-insights`, { language }).then((r) => r.data),
}

export const dashboardsApi = {
  list: (): Promise<{
    execution_id: string
    workflow_id: string
    workflow_name: string
    title: string
    panel_count: number
    created_at: string
  }[]> => api.get('/dashboards/').then((r) => r.data),
}

export const filesApi = {
  upload: (file: File, onProgress?: (pct: number) => void) => {
    const form = new FormData()
    form.append('file', file)
    return api.post('/files/upload', form, {
      headers: { 'Content-Type': 'multipart/form-data' },
      onUploadProgress: (e) => {
        if (onProgress && e.total) onProgress(Math.round((e.loaded / e.total) * 100))
      },
    }).then((r) => r.data)
  },

  list: () => api.get('/files/').then((r) => r.data),

  delete: (fileId: string) => api.delete(`/files/${fileId}`).then((r) => r.data),

  listSamples: () => api.get('/files/samples').then((r) => r.data),

  loadSample: (sampleId: string) => api.post(`/files/samples/${sampleId}/load`).then((r) => r.data),
}
