import api from './client'
import type { Workflow, WorkflowListItem } from '../types/workflow'

export const workflowsApi = {
  list: (): Promise<WorkflowListItem[]> =>
    api.get('/workflows/').then((r) => r.data),

  get: (id: string): Promise<Workflow> =>
    api.get(`/workflows/${id}`).then((r) => r.data),

  create: (payload: { name: string; description?: string }): Promise<Workflow> =>
    api.post('/workflows/', payload).then((r) => r.data),

  save: (id: string, graph: { nodes: unknown[]; edges: unknown[]; viewport: unknown; name?: string }): Promise<Workflow> =>
    api.put(`/workflows/${id}`, graph).then((r) => r.data),

  delete: (id: string): Promise<void> =>
    api.delete(`/workflows/${id}`).then((r) => r.data),

  run: (id: string): Promise<{ execution_id: string; status: string }> =>
    api.post(`/executions/workflows/${id}/run`).then((r) => r.data),
}
