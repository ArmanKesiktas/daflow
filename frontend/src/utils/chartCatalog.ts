import type { Node } from '@xyflow/react'
import type { NodeData } from '../types/workflow'

export interface ChartDefinition {
  type: string
  label: string
  icon: string
  family: 'comparison' | 'trend' | 'composition' | 'distribution' | 'relationship' | 'summary' | 'map' | 'network'
  input: 'statistics' | 'anomaly_summary' | 'correlation_matrix' | 'distributions' | 'missing_summary' | 'duplicate_summary' | 'type_summary' | 'dataframe'
  description: string
}

export const CHART_DEFINITIONS: ChartDefinition[] = [
  { type: 'bar_chart', label: 'Bar', icon: '▥', family: 'comparison', input: 'statistics', description: 'Compare values across columns' },
  { type: 'clustered_bar_chart', label: 'Clustered Bar', icon: '▥', family: 'comparison', input: 'statistics', description: 'Grouped comparison across categories' },
  { type: 'stacked_bar_chart', label: 'Stacked Bar', icon: '▦', family: 'comparison', input: 'statistics', description: 'Stacked contribution comparison' },
  { type: 'overlapping_bars', label: 'Overlapping Bars', icon: '▧', family: 'comparison', input: 'statistics', description: 'Compare two overlapping values' },
  { type: 'horizontal_bar_chart', label: 'Horizontal Bar', icon: '▤', family: 'comparison', input: 'statistics', description: 'Compare long labels cleanly' },
  { type: 'dumbbell_chart', label: 'Dumbbell', icon: '↔', family: 'comparison', input: 'statistics', description: 'Show distance between two measures' },
  { type: 'diverging_bar_chart', label: 'Diverging Bar', icon: '⇄', family: 'comparison', input: 'statistics', description: 'Compare values around a midpoint' },
  { type: 'small_multiples', label: 'Small Multiples', icon: '▦', family: 'comparison', input: 'statistics', description: 'Repeat compact charts by group' },
  { type: 'line_chart', label: 'Line', icon: '⌁', family: 'trend', input: 'dataframe', description: 'Show trends over ordered values' },
  { type: 'area_chart', label: 'Area', icon: '▰', family: 'trend', input: 'dataframe', description: 'Trend with filled magnitude' },
  { type: 'dual_axis_chart', label: 'Dual Axis', icon: '∥', family: 'trend', input: 'statistics', description: 'Compare two metrics on one trend view' },
  { type: 'stream_graph', label: 'Stream Graph', icon: '≈', family: 'trend', input: 'distributions', description: 'Layered evolution over time' },
  { type: 'connected_scatter_plot', label: 'Connected Scatter', icon: '⤳', family: 'trend', input: 'anomaly_summary', description: 'Scatter points connected by order' },
  { type: 'slope_chart', label: 'Slope Chart', icon: '╱', family: 'trend', input: 'statistics', description: 'Compare start and end values' },
  { type: 'pie_chart', label: 'Pie', icon: '◔', family: 'composition', input: 'type_summary', description: 'Simple part-to-whole view' },
  { type: 'donut_chart', label: 'Donut', icon: '◉', family: 'composition', input: 'type_summary', description: 'Compact composition chart' },
  { type: 'sunburst', label: 'Sunburst', icon: '☼', family: 'composition', input: 'type_summary', description: 'Hierarchical part-to-whole rings' },
  { type: 'alluvial_diagram', label: 'Alluvial', icon: '≋', family: 'composition', input: 'type_summary', description: 'Flow between categorical groups' },
  { type: 'radar_chart', label: 'Radar', icon: '✶', family: 'summary', input: 'statistics', description: 'Compare multiple metrics' },
  { type: 'polar_area_chart', label: 'Polar Area', icon: '✺', family: 'composition', input: 'statistics', description: 'Circular magnitude comparison' },
  { type: 'scatter_plot', label: 'Scatter', icon: '⠿', family: 'relationship', input: 'anomaly_summary', description: 'Show points and outliers' },
  { type: 'bubble_chart', label: 'Bubble', icon: '●', family: 'relationship', input: 'dataframe', description: 'Relationship with size encoding' },
  { type: 'heatmap', label: 'Heatmap', icon: '▦', family: 'relationship', input: 'correlation_matrix', description: 'Matrix intensity view' },
  { type: 'histogram', label: 'Histogram', icon: '▥', family: 'distribution', input: 'distributions', description: 'Numeric distribution bins' },
  { type: 'box_plot', label: 'Box Plot', icon: '╫', family: 'distribution', input: 'statistics', description: 'Spread and outlier summary' },
  { type: 'violin_plot', label: 'Violin', icon: '◊', family: 'distribution', input: 'distributions', description: 'Distribution shape comparison' },
  { type: 'beeswarm_plot', label: 'Beeswarm', icon: '⠿', family: 'distribution', input: 'distributions', description: 'Individual points along a distribution' },
  { type: 'density_heatmap', label: 'Density Heatmap', icon: '▩', family: 'distribution', input: 'distributions', description: 'Density intensity over binned values' },
  { type: 'convex_hull_chart', label: 'Convex Hull', icon: '⬡', family: 'distribution', input: 'anomaly_summary', description: 'Group boundary around point clouds' },
  { type: 'word_cloud', label: 'Word Cloud', icon: 'Aa', family: 'distribution', input: 'type_summary', description: 'Term frequency emphasis' },
  { type: 'parallel_coordinates', label: 'Parallel Coordinates', icon: '╫', family: 'relationship', input: 'statistics', description: 'Compare multivariate profiles' },
  { type: 'kpi_card', label: 'KPI Card', icon: '▢', family: 'summary', input: 'statistics', description: 'Single focused KPI from a selected metric' },
  { type: 'kpi_grid', label: 'KPI Grid', icon: '#', family: 'summary', input: 'statistics', description: 'Metric cards from statistics' },
  { type: 'stat_card', label: 'Stat Card', icon: '□', family: 'summary', input: 'anomaly_summary', description: 'Focused metric card' },
  { type: 'missing_values_bar', label: 'Missing Bar', icon: '!', family: 'comparison', input: 'missing_summary', description: 'Missing percentage by column' },
  { type: 'duplicate_rate_card', label: 'Duplicate Card', icon: '≡', family: 'summary', input: 'duplicate_summary', description: 'Duplicate row summary' },
  { type: 'correlation_network', label: 'Correlation Network', icon: '⌬', family: 'relationship', input: 'correlation_matrix', description: 'Strong pair network summary' },
  { type: 'treemap', label: 'Treemap', icon: '▣', family: 'composition', input: 'type_summary', description: 'Part-to-whole blocks' },
  { type: 'dot_map', label: 'Dot Map', icon: '·', family: 'map', input: 'dataframe', description: 'Point locations over a map plane' },
  { type: 'choropleth_map', label: 'Choropleth Map', icon: '▧', family: 'map', input: 'dataframe', description: 'Region intensity map' },
  { type: 'bubble_map', label: 'Bubble Map', icon: '◌', family: 'map', input: 'dataframe', description: 'Sized markers over a map plane' },
  { type: 'cartogram', label: 'Cartogram', icon: '▱', family: 'map', input: 'dataframe', description: 'Map regions scaled by value' },
  { type: 'dorling_cartogram', label: 'Dorling Cartogram', icon: '●', family: 'map', input: 'dataframe', description: 'Circle cartogram for regional values' },
  { type: 'connection_map', label: 'Connection Map', icon: '⇢', family: 'map', input: 'correlation_matrix', description: 'Show flows or links between places/entities' },
  { type: 'network_diagram', label: 'Network Diagram', icon: '⌬', family: 'network', input: 'correlation_matrix', description: 'Node-link relationship diagram' },
  { type: 'circular_graph', label: 'Circular Graph', icon: '◌', family: 'network', input: 'correlation_matrix', description: 'Relationships arranged around a circle' },
  { type: 'arc_diagram', label: 'Arc Diagram', icon: '⌒', family: 'network', input: 'correlation_matrix', description: 'Links drawn as arcs over ordered nodes' },
  { type: 'time_based_network_diagram', label: 'Time-based Network', icon: '⏱', family: 'network', input: 'correlation_matrix', description: 'Network links with temporal ordering' },
]

const CHART_BY_INPUT: Record<string, string[]> = {
  statistics: ['kpi_card', 'kpi_grid', 'bar_chart', 'clustered_bar_chart', 'horizontal_bar_chart', 'dumbbell_chart', 'radar_chart', 'box_plot', 'polar_area_chart', 'parallel_coordinates'],
  anomaly_detection: ['scatter_plot', 'connected_scatter_plot', 'convex_hull_chart', 'stat_card', 'line_chart'],
  ccsg_sg_anomaly: ['scatter_plot', 'connected_scatter_plot', 'line_chart', 'stat_card'],
  correlation: ['heatmap', 'correlation_network', 'network_diagram', 'connection_map', 'circular_graph', 'arc_diagram'],
  distribution: ['histogram', 'violin_plot', 'beeswarm_plot', 'density_heatmap', 'stream_graph', 'area_chart'],
  missing_value: ['missing_values_bar', 'bar_chart'],
  duplicate_detection: ['duplicate_rate_card', 'stat_card'],
  column_type_detection: ['donut_chart', 'pie_chart', 'treemap', 'sunburst', 'alluvial_diagram', 'word_cloud'],
  file_upload: ['kpi_card', 'kpi_grid'],
}

export function recommendCharts(nodes: Node<NodeData>[]) {
  const scores = new Map<string, number>()
  for (const node of nodes) {
    const candidates = CHART_BY_INPUT[node.type ?? ''] ?? []
    const categoryWeight = node.data.category === 'analysis' ? 4 : node.data.category === 'preparation' ? 3 : 1
    candidates.forEach((type, index) => {
      scores.set(type, (scores.get(type) ?? 0) + categoryWeight + Math.max(0, 3 - index))
    })
  }

  return [...CHART_DEFINITIONS]
    .map((chart) => ({ ...chart, score: scores.get(chart.type) ?? 0 }))
    .filter((chart) => chart.score > 0)
    .sort((a, b) => b.score - a.score || a.label.localeCompare(b.label))
}

export function chartDefinition(type: string) {
  return CHART_DEFINITIONS.find((chart) => chart.type === type)
}
