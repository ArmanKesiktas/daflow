import api from './client'

export interface JoinPreviewRequest {
  left_data: Record<string, unknown>[]
  right_data: Record<string, unknown>[]
  how: string
  left_on: string[]
  right_on: string[]
  suffixes: [string, string]
}

export interface JoinPreviewResponse {
  rows: Record<string, unknown>[]
  columns: string[]
  total_rows: number
  message?: string
}

export async function previewJoin(request: JoinPreviewRequest): Promise<JoinPreviewResponse> {
  const response = await api.post<JoinPreviewResponse>('/join/preview', request)
  return response.data
}
