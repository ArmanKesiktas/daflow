// ── React Flow node/edge types ────────────────────────────────────────────────

export type NodeStatus = 'idle' | 'pending' | 'running' | 'success' | 'error' | 'cancelled'

export type NodeCategory = 'source' | 'preparation' | 'transformation' | 'analysis' | 'big_data' | 'utility' | 'visualization' | 'ml' | 'output'

export interface NodeConfig {
  [key: string]: unknown
}

export interface NodeData extends Record<string, unknown> {
  label: string
  category: NodeCategory
  config: NodeConfig
  status: NodeStatus
  resultPreview?: Record<string, unknown>
  /** When true, node is skipped during execution and rendered at 40% opacity */
  disabled?: boolean
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
  workspace_id?: string | null
  project_id?: string | null
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
  share_id?: string
  permission?: 'view' | 'edit'
  expires_at?: string | null
  created_at?: string
  workspace_id?: string | null
  project_id?: string | null
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
  status: 'pending' | 'running' | 'success' | 'error' | 'cancelled'
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

export interface DatasetDetail {
  id: string
  filename: string
  size_bytes: number
  row_count: number
  column_count: number
  columns: ColumnMeta[]
  preview: Record<string, unknown>[]
  missing_summary: Record<string, number>
  is_owner: boolean
  created_at?: string
}

export interface DatasetListItem {
  id: string
  filename: string
  size_bytes: number
  row_count: number
  column_count: number
  columns_meta?: ColumnMeta[]
  folder_id?: string | null
  workspace_id?: string | null
  project_id?: string | null
  created_at: string
}

export type WorkspaceRole = 'owner' | 'admin' | 'analyst' | 'viewer' | 'guest'

export interface Workspace {
  id: string
  name: string
  slug?: string
  description?: string | null
  owner_id?: string
  avatar_url?: string | null
  role?: WorkspaceRole
  storage_ready?: boolean
  stats?: { datasets: number; workflows: number; dashboards: number; reports: number; members: number }
  created_at?: string
  updated_at?: string
}

export interface WorkspaceMember {
  id: string
  workspace_id: string
  user_id: string
  email?: string | null
  role: WorkspaceRole
  status: 'active' | 'invited' | 'removed'
  joined_at?: string
  created_at?: string
}

export interface WorkspaceInvitation {
  id: string
  workspace_id: string
  email: string
  role: Exclude<WorkspaceRole, 'owner'>
  token: string
  accept_url?: string
  expires_at?: string | null
  accepted_at?: string | null
  created_at?: string
}

export interface WorkspaceProject {
  id: string
  workspace_id: string
  name: string
  description?: string | null
  stats?: { datasets: number; workflows: number; dashboards: number; reports: number }
  created_at?: string
  updated_at?: string
}

export interface WorkspaceActivity {
  id: string
  workspace_id: string
  actor_id?: string
  action: string
  entity_type?: string
  entity_id?: string
  metadata?: Record<string, unknown>
  created_at: string
}

export interface WorkspaceComment {
  id: string
  workspace_id: string
  project_id?: string | null
  entity_type: 'file' | 'workflow' | 'dashboard' | 'report' | 'node'
  entity_id: string
  node_id?: string | null
  content: string
  created_by?: string
  resolved: boolean
  created_at: string
  updated_at?: string
}

export interface WorkflowVersion {
  id: string
  workflow_id: string
  user_id: string
  name: string
  graph_data: { nodes?: FlowNode[]; edges?: FlowEdge[]; viewport?: Viewport }
  version_number: number
  created_at: string
}

export interface WorkflowTemplate {
  id: string
  owner_id?: string | null
  category: string
  title: string
  name?: string
  description?: string
  icon?: string
  graph_data: { nodes: FlowNode[]; edges: FlowEdge[]; viewport: Viewport }
  required_columns: unknown[]
  is_public: boolean
  is_favorite?: boolean
  favorite_count?: number
  rating_average?: number
  rating_count?: number
  my_rating?: number
}

export interface WorkflowSchedule {
  id: string
  workflow_id: string
  user_id: string
  frequency: 'continuous' | 'hourly' | 'daily' | 'weekly'
  time_of_day?: string
  timezone: string
  is_active: boolean
  last_run_at?: string
  next_run_at?: string
  last_execution_id?: string
  created_at?: string
  updated_at?: string
}

export interface PublishLink {
  id: string
  resource_type: 'dashboard' | 'report'
  resource_id: string
  token: string
  enabled: boolean
  allow_export: boolean
  expires_at?: string | null
  url: string
}

export interface DataConnector {
  id: string
  type: 'google_sheets' | 'public_url' | 'rest_json' | 'supabase_table' | 'postgres'
  name: string
  config_json: Record<string, unknown>
  status: string
  last_synced_file_id?: string
  last_synced_at?: string
}

export interface DatasetFolder {
  id: string
  name: string
  color: string
}

export interface DatasetTag {
  id: string
  name: string
  color: string
  dataset_ids?: string[]
}

export interface WorkflowValidationIssue {
  code: string
  message: string
  node_id?: string | null
}

export interface WorkflowValidationResult {
  valid: boolean
  errors: WorkflowValidationIssue[]
  warnings: WorkflowValidationIssue[]
  suggestions: WorkflowValidationIssue[]
}

export interface ExecutionCompareSide {
  execution_id: string
  workflow_id: string
  status: string
  created_at?: string
  started_at?: string
  completed_at?: string
  duration_seconds: number
  node_count: number
  error_count: number
  success_count: number
}

export interface ExecutionCompare {
  left: ExecutionCompareSide
  right: ExecutionCompareSide
  diff: {
    status_changed: boolean
    duration_delta_seconds: number
    node_count_delta: number
    error_delta: number
  }
}

export interface FriendlyError {
  provider: 'rules' | 'ai'
  explanation: string
}

export interface OnboardingState {
  user_id: string
  completed_steps: string[]
  skipped: boolean
  created_at?: string
  updated_at?: string
}

export type PageTourKey = 'workflows' | 'workflowEditor' | 'dashboard' | 'reports' | 'datasets' | 'workspace' | 'members' | 'settings' | 'help'

export interface UserPreferences {
  user_id: string
  display_name?: string | null
  language: 'tr' | 'en'
  theme: 'dark' | 'light'
  notification_settings: {
    workspace?: boolean
    comments?: boolean
    roles?: boolean
  }
  completed_tours: string[]
}

export interface NotificationItem {
  id: string
  user_id: string
  workspace_id?: string | null
  actor_id?: string | null
  action: string
  title: string
  body?: string | null
  metadata?: Record<string, unknown>
  read_at?: string | null
  created_at: string
}

// ── Reports ───────────────────────────────────────────────────────────────────

export interface Report {
  id: string
  execution_id: string
  title: string
  format: string
  workspace_id?: string | null
  project_id?: string | null
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
