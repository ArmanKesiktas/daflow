import api from './client'
import type {
  Workspace,
  WorkspaceActivity,
  WorkspaceComment,
  WorkspaceInvitation,
  WorkspaceMember,
  WorkspaceProject,
  WorkspaceRole,
} from '../types/workflow'

export const workspacesApi = {
  list: (): Promise<Workspace[]> => api.get('/workspaces').then((r) => r.data),
  create: (payload: { name: string; description?: string }): Promise<Workspace> =>
    api.post('/workspaces', payload).then((r) => r.data),
  get: (workspaceId: string): Promise<Workspace> =>
    api.get(`/workspaces/${workspaceId}`).then((r) => r.data),
  update: (workspaceId: string, payload: Partial<Workspace>): Promise<Workspace> =>
    api.patch(`/workspaces/${workspaceId}`, payload).then((r) => r.data),
  remove: (workspaceId: string) => api.delete(`/workspaces/${workspaceId}`).then((r) => r.data),

  members: (workspaceId: string): Promise<WorkspaceMember[]> =>
    api.get(`/workspaces/${workspaceId}/members`).then((r) => r.data),
  invite: (workspaceId: string, payload: { email: string; role: Exclude<WorkspaceRole, 'owner'>; expiration?: '24h' | '7d' | 'never' }): Promise<WorkspaceInvitation> =>
    api.post(`/workspaces/${workspaceId}/invitations`, payload).then((r) => r.data),
  updateRole: (workspaceId: string, memberId: string, role: WorkspaceRole): Promise<WorkspaceMember> =>
    api.patch(`/workspaces/${workspaceId}/members/${memberId}/role`, { role }).then((r) => r.data),
  removeMember: (workspaceId: string, memberId: string) =>
    api.delete(`/workspaces/${workspaceId}/members/${memberId}`).then((r) => r.data),
  invitation: (token: string): Promise<WorkspaceInvitation & { workspace?: Workspace }> =>
    api.get(`/invitations/${token}`).then((r) => r.data),
  acceptInvitation: (token: string): Promise<{ accepted: boolean; workspace_id: string }> =>
    api.post(`/invitations/${token}/accept`).then((r) => r.data),

  projects: (workspaceId: string): Promise<WorkspaceProject[]> =>
    api.get(`/workspaces/${workspaceId}/projects`).then((r) => r.data),
  createProject: (workspaceId: string, payload: { name: string; description?: string }): Promise<WorkspaceProject> =>
    api.post(`/workspaces/${workspaceId}/projects`, payload).then((r) => r.data),
  updateProject: (projectId: string, payload: Partial<WorkspaceProject>): Promise<WorkspaceProject> =>
    api.patch(`/projects/${projectId}`, payload).then((r) => r.data),
  deleteProject: (projectId: string) => api.delete(`/projects/${projectId}`).then((r) => r.data),

  activity: (workspaceId: string): Promise<WorkspaceActivity[]> =>
    api.get(`/workspaces/${workspaceId}/activity`).then((r) => r.data),
  comments: (workspaceId: string, params?: { entity_type?: string; entity_id?: string }): Promise<WorkspaceComment[]> =>
    api.get(`/workspaces/${workspaceId}/comments`, { params }).then((r) => r.data),
  createComment: (workspaceId: string, payload: Partial<WorkspaceComment> & { content: string; entity_type: string; entity_id: string }): Promise<WorkspaceComment> =>
    api.post(`/workspaces/${workspaceId}/comments`, payload).then((r) => r.data),
  updateComment: (commentId: string, payload: Partial<WorkspaceComment>): Promise<WorkspaceComment> =>
    api.patch(`/comments/${commentId}`, payload).then((r) => r.data),
  deleteComment: (commentId: string) => api.delete(`/comments/${commentId}`).then((r) => r.data),
}
