// ── React Flow node/edge types ────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'running' | 'success' | 'error'

export type NodeCategory = 'source' | 'preparation' | 'transformation' | 'analysis' | 'visualization' | 'ml' | 'output'

export interface NodeConfig {
  [key: string]: unknown
}

export interface NodeData extends Record<string, unknown> {
  label: string
  category: NodeCategory
  config: NodeConfig
  status: NodeStatus
  error_message?: string
  resultPreview?: Record<string, unknown>
  // Cache indicator
  cached?: boolean
  // File upload specific
  fileId?: string
  storagePath?: string
  filename?: string
  columns?: ColumnMeta[]
}

export interface ColumnMeta {
  name: string
  type: string
  missing_count?: number
}

// ── Workflow ──────────────────────────────────────────────────────────────────

export interface Workflow {
  id: string
  name: string
  description?: string
  user_id: string
  created_at: string
  updated_at: string
  nodes: FlowNode[]
  edges: FlowEdge[]
  viewport: Viewport
}

export interface WorkflowListItem {
  id: string
  name: string
  description?: string
  node_count: number
  updated_at: string
}

export interface FlowNode {
  id: string
  type: string
  position: { x: number; y: number }
  data: NodeData
}

export interface FlowEdge {
  id: string
  source: string
  target: string
  sourceHandle?: string
  targetHandle?: string
  type?: string
}

export interface Viewport {
  x: number
  y: number
  zoom: number
}

// ── Execution ─────────────────────────────────────────────────────────────────

export interface ExecutionStatus {
  execution_id: string
  workflow_id: string
  status: 'pending' | 'running' | 'success' | 'error'
  started_at?: string
  completed_at?: string
  error_message?: string
  node_statuses: NodeExecutionStatus[]
  result_summary?: Record<string, unknown>
  done?: boolean
}

export interface NodeExecutionStatus {
  node_id: string
  node_type?: string
  status: NodeStatus
  metrics?: Record<string, unknown>
  error_message?: string
  executed_at?: string
}

export interface NodeResult {
  execution_id: string
  node_id: string
  node_type: string
  status: string
  output?: Record<string, unknown>
  metrics?: Record<string, unknown>
  error_message?: string
}

// ── File upload ───────────────────────────────────────────────────────────────

export interface FileUploadResponse {
  file_id: string
  storage_path: string
  filename: string
  size_bytes: number
  row_count: number
  column_count: number
  columns: ColumnMeta[]
  preview: Record<string, unknown>[]
  missing_summary: Record<string, number>
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  execution_id: string
  title: string
  format: string
  storage_path?: string
  created_at: string
}

export interface ReportSection {
  section_type: string
  node_id: string
  node_label?: string
  data: Record<string, unknown>
  content?: string
}

export interface ReportDetail {
  report_id: string
  title: string
  generated_at: string
  workflow_name: string
  metadata: Record<string, unknown>
  sections: ReportSection[]
}
