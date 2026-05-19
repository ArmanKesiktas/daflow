import api from './client'
import type {
  DataConnector,
  DatasetFolder,
  DatasetTag,
  FriendlyError,
  NotificationItem,
  OnboardingState,
  PublishLink,
  UserPreferences,
  WorkflowSchedule,
  WorkflowTemplate,
  WorkflowValidationResult,
} from '../types/workflow'

export const templatesApi = {
  list: (): Promise<WorkflowTemplate[]> => api.get('/templates/').then((r) => r.data),
  create: (payload: { title: string; category?: string; description?: string; graph_data: unknown; required_columns?: unknown[]; is_public?: boolean }): Promise<WorkflowTemplate> =>
    api.post('/templates/', payload).then((r) => r.data),
  createWorkflow: (templateId: string, name?: string, workspaceId?: string | null, projectId?: string | null): Promise<{ id: string; name: string }> =>
    api.post(`/templates/${templateId}/create-workflow`, {
      name,
      workspace_id: workspaceId,
      project_id: projectId,
    }).then((r) => r.data),
  favorite: (templateId: string) => api.post(`/templates/${templateId}/favorite`).then((r) => r.data),
  unfavorite: (templateId: string) => api.delete(`/templates/${templateId}/favorite`).then((r) => r.data),
  rate: (templateId: string, rating: number) => api.post(`/templates/${templateId}/rating`, { rating }).then((r) => r.data),
  validateDataset: (templateId: string, columns: unknown[]): Promise<WorkflowValidationResult> =>
    api.post(`/templates/${templateId}/validate-dataset`, { columns }).then((r) => r.data),
}

export const aiApi = {
  suggestAnalysis: (payload: { columns: unknown[]; language: string }) =>
    api.post('/ai/suggest-analysis', payload).then((r) => r.data),
  explainError: (message: string, language: string): Promise<FriendlyError> =>
    api.post('/ai/explain-error', { message, language }).then((r) => r.data),
}

export const onboardingApi = {
  get: (): Promise<OnboardingState> => api.get('/onboarding/').then((r) => r.data),
  save: (payload: Partial<OnboardingState>): Promise<OnboardingState> =>
    api.post('/onboarding/', payload).then((r) => r.data),
}

export const profileApi = {
  getPreferences: (): Promise<UserPreferences> => api.get('/profile/preferences').then((r) => r.data),
  updatePreferences: (payload: Partial<UserPreferences>): Promise<UserPreferences> =>
    api.patch('/profile/preferences', payload).then((r) => r.data),
}

export const notificationsApi = {
  list: (): Promise<NotificationItem[]> => api.get('/notifications').then((r) => r.data),
  markRead: (id: string): Promise<NotificationItem> => api.patch(`/notifications/${id}/read`).then((r) => r.data),
  markAllRead: (): Promise<{ ok: boolean }> => api.post('/notifications/read-all').then((r) => r.data),
}

export const schedulesApi = {
  list: (workflowId: string): Promise<WorkflowSchedule[]> => api.get(`/workflows/${workflowId}/schedules`).then((r) => r.data),
  create: (workflowId: string, payload: Partial<WorkflowSchedule>): Promise<WorkflowSchedule> =>
    api.post(`/workflows/${workflowId}/schedules`, payload).then((r) => r.data),
  update: (workflowId: string, scheduleId: string, payload: Partial<WorkflowSchedule>): Promise<WorkflowSchedule> =>
    api.patch(`/workflows/${workflowId}/schedules/${scheduleId}`, payload).then((r) => r.data),
  remove: (workflowId: string, scheduleId: string) => api.delete(`/workflows/${workflowId}/schedules/${scheduleId}`).then((r) => r.data),
}

export const validationApi = {
  workflow: (workflowId: string): Promise<WorkflowValidationResult> =>
    api.post(`/workflows/${workflowId}/validate`).then((r) => r.data),
}

export const publishApi = {
  dashboard: (executionId: string, payload: { enabled?: boolean; allow_export?: boolean; expires_at?: string | null }): Promise<PublishLink> =>
    api.post(`/dashboards/${executionId}/publish`, payload).then((r) => r.data),
  report: (reportId: string, payload: { enabled?: boolean; allow_export?: boolean; expires_at?: string | null }): Promise<PublishLink> =>
    api.post(`/reports/${reportId}/publish`, payload).then((r) => r.data),
  update: (linkId: string, payload: Partial<PublishLink>): Promise<PublishLink> =>
    api.patch(`/publish-links/${linkId}`, payload).then((r) => r.data),
  publicDashboard: (token: string) => api.get(`/public/dashboards/${token}`).then((r) => r.data),
  publicReport: (token: string) => api.get(`/public/reports/${token}`).then((r) => r.data),
}

export const connectorsApi = {
  list: (): Promise<DataConnector[]> => api.get('/connectors').then((r) => r.data),
  create: (payload: Partial<DataConnector>): Promise<DataConnector> => api.post('/connectors', payload).then((r) => r.data),
  update: (id: string, payload: Partial<DataConnector>): Promise<DataConnector> => api.patch(`/connectors/${id}`, payload).then((r) => r.data),
  remove: (id: string) => api.delete(`/connectors/${id}`).then((r) => r.data),
  test: (id: string): Promise<{ ok: boolean; error?: string; row_count?: number; column_count?: number; columns?: string[] }> =>
    api.post(`/connectors/${id}/test`).then((r) => r.data),
  sync: (id: string, payload?: { workspace_id?: string | null; project_id?: string | null }): Promise<{ ok: boolean; file_id: string; row_count: number; column_count: number }> =>
    api.post(`/connectors/${id}/sync`, payload || {}).then((r) => r.data),
}

export const datasetOrgApi = {
  folders: (): Promise<DatasetFolder[]> => api.get('/dataset-folders').then((r) => r.data),
  createFolder: (payload: Partial<DatasetFolder>): Promise<DatasetFolder> => api.post('/dataset-folders', payload).then((r) => r.data),
  updateFolder: (id: string, payload: Partial<DatasetFolder>): Promise<DatasetFolder> => api.patch(`/dataset-folders/${id}`, payload).then((r) => r.data),
  deleteFolder: (id: string) => api.delete(`/dataset-folders/${id}`).then((r) => r.data),
  tags: (): Promise<DatasetTag[]> => api.get('/dataset-tags').then((r) => r.data),
  createTag: (payload: Partial<DatasetTag>): Promise<DatasetTag> => api.post('/dataset-tags', payload).then((r) => r.data),
  updateTag: (id: string, payload: Partial<DatasetTag>): Promise<DatasetTag> => api.patch(`/dataset-tags/${id}`, payload).then((r) => r.data),
  deleteTag: (id: string) => api.delete(`/dataset-tags/${id}`).then((r) => r.data),
  updateFile: (fileId: string, payload: { folder_id?: string | null; tag_ids?: string[] }) =>
    api.patch(`/files/${fileId}/organization`, payload).then((r) => r.data),
}
