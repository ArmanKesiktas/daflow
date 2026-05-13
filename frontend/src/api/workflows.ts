import api from './client'
import type { Workflow, WorkflowListItem, WorkflowVersion } from '../types/workflow'

export const workflowsApi = {
  list: (workspaceId?: string | null, projectId?: string | null): Promise<WorkflowListItem[]> =>
    api.get('/workflows/', { params: { workspace_id: workspaceId || undefined, project_id: projectId || undefined } }).then((r) => r.data),

  get: (id: string): Promise<Workflow> =>
    api.get(`/workflows/${id}`).then((r) => r.data),

  create: (payload: { name: string; description?: string; workspace_id?: string | null; project_id?: string | null }): Promise<Workflow> =>
    api.post('/workflows/', payload).then((r) => r.data),

  save: (id: string, graph: { nodes: unknown[]; edges: unknown[]; viewport: unknown; name?: string }): Promise<Workflow> =>
    api.put(`/workflows/${id}`, graph).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/workflows/${id}`).then((r) => r.data),

  run: (id: string): Promise<{ execution_id: string; status: string }> =>
    api.post(`/executions/workflows/${id}/run`).then((r) => r.data),

  listShares: (workflowId: string) =>
    api.get(`/workflows/${workflowId}/shares`).then((r) => r.data),

  share: (workflowId: string, payload: { email: string; permission: 'view' | 'edit'; expiration: '24h' | '7d' | 'never' }) =>
    api.post(`/workflows/${workflowId}/shares`, payload).then((r) => r.data),

  revokeShare: (workflowId: string, shareId: string) =>
    api.delete(`/workflows/${workflowId}/shares/${shareId}`).then((r) => r.data),

  sharedWithMe: (): Promise<WorkflowListItem[]> =>
    api.get('/workflows/shared-with-me').then((r) => r.data),

  fork: (id: string, name?: string): Promise<{ id: string; name: string }> =>
    api.post(`/workflows/${id}/fork`, { name }).then((r) => r.data),

  versions: (id: string): Promise<WorkflowVersion[]> =>
    api.get(`/workflows/${id}/versions`).then((r) => r.data),

  checkpoint: (id: string, name?: string): Promise<WorkflowVersion> =>
    api.post(`/workflows/${id}/versions`, { name }).then((r) => r.data),

  restore: (id: string, versionId: string): Promise<Workflow> =>
    api.post(`/workflows/${id}/restore/${versionId}`).then((r) => r.data),
}
