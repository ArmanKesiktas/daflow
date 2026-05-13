import type { Edge, Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

export type ValidationLevel = 'error' | 'warning'

export interface ValidationIssue {
  level: ValidationLevel
  title: string
  detail: string
  nodeId?: string
}

const SUPPORTED_TYPES = new Set([
  'file_upload',
  'database_query',
  'column_type_detection',
  'missing_value',
  'duplicate_detection',
  'filter_rows',
  'statistics',
  'anomaly_detection',
  'ccsg_sg_anomaly',
  'correlation',
  'distribution',
  'time_series',
  'chunk_processing',
  'mapreduce_aggregation',
  'spark_groupby',
  'large_dataset_profiler',
  'route_node',
  'train_test_split',
  'ml_model',
  'dashboard',
  'report',
  'bar_chart',
  'clustered_bar_chart',
  'stacked_bar_chart',
  'overlapping_bars',
  'horizontal_bar_chart',
  'dumbbell_chart',
  'diverging_bar_chart',
  'small_multiples',
  'line_chart',
  'area_chart',
  'dual_axis_chart',
  'stream_graph',
  'connected_scatter_plot',
  'slope_chart',
  'pie_chart',
  'donut_chart',
  'sunburst',
  'alluvial_diagram',
  'radar_chart',
  'polar_area_chart',
  'scatter_plot',
  'bubble_chart',
  'heatmap',
  'histogram',
  'box_plot',
  'violin_plot',
  'beeswarm_plot',
  'density_heatmap',
  'convex_hull_chart',
  'word_cloud',
  'parallel_coordinates',
  'kpi_card',
  'kpi_grid',
  'stat_card',
  'missing_values_bar',
  'duplicate_rate_card',
  'correlation_network',
  'treemap',
  'dot_map',
  'choropleth_map',
  'bubble_map',
  'cartogram',
  'dorling_cartogram',
  'connection_map',
  'network_diagram',
  'circular_graph',
  'arc_diagram',
  'time_based_network_diagram',
])

const OUTPUT_TYPES = new Set(['dashboard', 'report'])
const CHART_TYPES = new Set([
  'bar_chart', 'clustered_bar_chart', 'stacked_bar_chart', 'overlapping_bars', 'horizontal_bar_chart',
  'dumbbell_chart', 'diverging_bar_chart', 'small_multiples', 'line_chart', 'area_chart',
  'dual_axis_chart', 'stream_graph', 'connected_scatter_plot', 'slope_chart', 'pie_chart',
  'donut_chart', 'sunburst', 'alluvial_diagram', 'radar_chart', 'polar_area_chart', 'scatter_plot', 'bubble_chart',
  'heatmap', 'histogram', 'box_plot', 'violin_plot', 'beeswarm_plot', 'density_heatmap', 'convex_hull_chart',
  'word_cloud', 'parallel_coordinates', 'kpi_card', 'kpi_grid', 'stat_card',
  'missing_values_bar', 'duplicate_rate_card', 'correlation_network', 'treemap',
  'dot_map', 'choropleth_map', 'bubble_map', 'cartogram', 'dorling_cartogram',
  'connection_map', 'network_diagram', 'circular_graph', 'arc_diagram', 'time_based_network_diagram',
])
const SOURCE_TYPES = new Set(['file_upload', 'database_query'])

export function validateWorkflow(nodes: Node<NodeData>[], edges: Edge[]): ValidationIssue[] {
  const issues: ValidationIssue[] = []

  if (nodes.length === 0) {
    return [{
      level: 'error',
      title: 'Workflow is empty',
      detail: 'Add a file upload node or start from a template before running.',
    }]
  }

  const byId = new Map(nodes.map((node) => [node.id, node]))
  const incoming = new Map<string, Edge[]>()
  const outgoing = new Map<string, Edge[]>()

  for (const edge of edges) {
    if (!byId.has(edge.source) || !byId.has(edge.target)) {
      issues.push({
        level: 'error',
        title: 'Broken connection',
        detail: 'A connection references a node that no longer exists.',
      })
      continue
    }
    incoming.set(edge.target, [...(incoming.get(edge.target) ?? []), edge])
    outgoing.set(edge.source, [...(outgoing.get(edge.source) ?? []), edge])
  }

  if (!nodes.some((node) => SOURCE_TYPES.has(node.type ?? ''))) {
    issues.push({
      level: 'error',
      title: 'Missing data source',
      detail: 'Add a File Upload or Database Query node so downstream analysis has data.',
    })
  }

  for (const node of nodes) {
    const label = String(node.data?.label ?? node.type ?? 'Node')
    const config = (node.data?.config ?? {}) as Record<string, unknown>

    if (!SUPPORTED_TYPES.has(node.type ?? '')) {
      issues.push({
        level: 'error',
        title: 'Unsupported node',
        detail: `${label} is not available in the current simplified workflow surface.`,
        nodeId: node.id,
      })
    }

    if (node.type === 'file_upload' && !config.file_id && !config.storage_path && !config.filename) {
      issues.push({
        level: 'error',
        title: 'Dataset not uploaded',
        detail: `${label} needs a CSV, Excel, or Parquet file before running.`,
        nodeId: node.id,
      })
    }

    if (node.type === 'database_query') {
      const mode = String(config.connection_mode ?? 'connector')
      if (mode === 'connector' && !String(config.connector_id ?? '').trim()) {
        issues.push({
          level: 'error',
          title: 'Database connector missing',
          detail: `${label} needs a saved PostgreSQL or Supabase connector.`,
          nodeId: node.id,
        })
      }
      if (mode !== 'connector' && !String(config.connection_string ?? '').trim() && !String(config.host ?? '').trim()) {
        issues.push({
          level: 'error',
          title: 'Database connection missing',
          detail: `${label} needs connection details before running.`,
          nodeId: node.id,
        })
      }
    }

    if (!SOURCE_TYPES.has(node.type ?? '') && (incoming.get(node.id) ?? []).length === 0) {
      issues.push({
        level: 'error',
        title: 'Node has no input',
        detail: `${label} must be connected to an upstream node.`,
        nodeId: node.id,
      })
    }

    if (node.type === 'filter_rows') {
      if (!String(config.column ?? '').trim()) {
        issues.push({
          level: 'error',
          title: 'Filter column missing',
          detail: 'Filter Rows needs a column name.',
          nodeId: node.id,
        })
      }
      if (!String(config.operator ?? '').trim()) {
        issues.push({
          level: 'error',
          title: 'Filter operator missing',
          detail: 'Filter Rows needs an operator.',
          nodeId: node.id,
        })
      }
    }

    if (node.type === 'ml_model' && !String(config.target_column ?? '').trim()) {
      issues.push({
        level: 'error',
        title: 'ML target column missing',
        detail: 'ML Model needs a target column to predict.',
        nodeId: node.id,
      })
    }

    if (node.type === 'time_series' && (!String(config.date_column ?? '').trim() || !String(config.value_column ?? '').trim())) {
      issues.push({
        level: 'error',
        title: 'Time series columns missing',
        detail: 'Time Series needs a date column and a numeric value column.',
        nodeId: node.id,
      })
    }

    if (!OUTPUT_TYPES.has(node.type ?? '') && !CHART_TYPES.has(node.type ?? '') && (outgoing.get(node.id) ?? []).length === 0) {
      issues.push({
        level: 'warning',
        title: 'Node output is unused',
        detail: `${label} runs, but its output is not connected to another node.`,
        nodeId: node.id,
      })
    }
  }

  return issues
}

export function blockingIssues(issues: ValidationIssue[]) {
  return issues.filter((issue) => issue.level === 'error')
}
