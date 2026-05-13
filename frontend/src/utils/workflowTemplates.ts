import type { Edge, Node, Viewport } from '@xyflow/react'
import type { NodeCategory, NodeData } from '../types/workflow'

export interface WorkflowTemplate {
  id: string
  name: string
  description: string
  icon: string
  accent: string
  nodes: Node<NodeData>[]
  edges: Edge[]
  viewport: Viewport
}

const uuid = () => crypto.randomUUID()

function makeNode(
  type: string,
  label: string,
  category: NodeCategory,
  x: number,
  y: number,
  config: Record<string, unknown> = {},
): Node<NodeData> {
  return {
    id: uuid(),
    type,
    position: { x, y },
    data: { label, category, config, status: 'idle' },
  }
}

function makeEdge(source: Node<NodeData>, target: Node<NodeData>, sourceHandle = 'dataframe', targetHandle = 'dataframe'): Edge {
  return {
    id: uuid(),
    source: source.id,
    target: target.id,
    sourceHandle,
    targetHandle,
    type: 'smoothstep',
  }
}

export function createWorkflowTemplates(): WorkflowTemplate[] {
  const quickFile = makeNode('file_upload', 'File Upload', 'source', 80, 160)
  const quickStats = makeNode('statistics', 'Statistics', 'analysis', 340, 80)
  const quickDist = makeNode('distribution', 'Distribution', 'analysis', 340, 240, { bins: 20 })
  const quickDash = makeNode('dashboard', 'Dashboard', 'output', 620, 160, { title: 'Quick EDA Dashboard' })

  const anomalyFile = makeNode('file_upload', 'File Upload', 'source', 80, 200)
  const anomalyMissing = makeNode('missing_value', 'Missing Values', 'preparation', 320, 120, { strategy: 'fill_median' })
  const anomalyDetect = makeNode('anomaly_detection', 'Anomaly Detection', 'analysis', 560, 120, { method: 'iqr', iqr_multiplier: 1.5 })
  const anomalyStats = makeNode('statistics', 'Statistics', 'analysis', 560, 280)
  const anomalyDash = makeNode('dashboard', 'Dashboard', 'output', 820, 200, { title: 'Anomaly Dashboard' })

  const fullFile = makeNode('file_upload', 'File Upload', 'source', 80, 300)
  const fullTypes = makeNode('column_type_detection', 'Column Types', 'preparation', 320, 80)
  const fullMissing = makeNode('missing_value', 'Missing Values', 'preparation', 320, 220, { strategy: 'fill_median' })
  const fullDuplicates = makeNode('duplicate_detection', 'Duplicates', 'preparation', 320, 360)
  const fullStats = makeNode('statistics', 'Statistics', 'analysis', 580, 80)
  const fullAnomaly = makeNode('anomaly_detection', 'Anomaly Detection', 'analysis', 580, 220, { method: 'iqr' })
  const fullCorrelation = makeNode('correlation', 'Correlation', 'analysis', 580, 360, { method: 'pearson', threshold: 0.7 })
  const fullDistribution = makeNode('distribution', 'Distribution', 'analysis', 580, 500, { bins: 20 })
  const fullReport = makeNode('report', 'Report', 'output', 860, 260, { title: 'Full Analysis Report' })

  const qualityFile = makeNode('file_upload', 'File Upload', 'source', 80, 220)
  const qualityTypes = makeNode('column_type_detection', 'Column Types', 'preparation', 320, 80)
  const qualityMissing = makeNode('missing_value', 'Missing Values', 'preparation', 320, 220, { strategy: 'report_only' })
  const qualityDuplicates = makeNode('duplicate_detection', 'Duplicates', 'preparation', 320, 360, { drop: false })
  const qualityReport = makeNode('report', 'Data Quality Report', 'output', 600, 220, { title: 'Data Quality Report' })

  const relationFile = makeNode('file_upload', 'File Upload', 'source', 80, 190)
  const relationStats = makeNode('statistics', 'Statistics', 'analysis', 320, 90)
  const relationCorrelation = makeNode('correlation', 'Correlation', 'analysis', 320, 250, { method: 'pearson', threshold: 0.65 })
  const relationHeat = makeNode('heatmap', 'Heatmap', 'visualization', 580, 170, { chart_type: 'heatmap', title: 'Correlation Heatmap' })
  const relationDashboard = makeNode('dashboard', 'Relationship Dashboard', 'output', 820, 170, { title: 'Relationship Dashboard' })

  const mlFile = makeNode('file_upload', 'File Upload', 'source', 80, 220)
  const mlMissing = makeNode('missing_value', 'Missing Values', 'preparation', 320, 140, { strategy: 'fill_median' })
  const mlSplit = makeNode('train_test_split', 'Train/Test Split', 'ml', 560, 140, { test_size: 0.2, random_state: 42 })
  const mlModel = makeNode('ml_model', 'ML Model', 'ml', 800, 140, { task_type: 'classification', algorithm: 'random_forest_classifier', target_column: '' })
  const mlDashboard = makeNode('dashboard', 'Model Dashboard', 'output', 1040, 140, { title: 'Model Performance Dashboard' })

  const chartFile = makeNode('file_upload', 'File Upload', 'source', 80, 260)
  const chartStats = makeNode('statistics', 'Statistics', 'analysis', 320, 80)
  const chartDistribution = makeNode('distribution', 'Distribution', 'analysis', 320, 240, { bins: 24 })
  const chartTypes = makeNode('column_type_detection', 'Column Types', 'preparation', 320, 400)
  const chartBar = makeNode('bar_chart', 'Bar Chart', 'visualization', 600, 80, { chart_type: 'bar_chart', title: 'Metrics by Column' })
  const chartHistogram = makeNode('histogram', 'Histogram', 'visualization', 600, 240, { chart_type: 'histogram', title: 'Distribution Histogram' })
  const chartDonut = makeNode('donut_chart', 'Donut Chart', 'visualization', 600, 400, { chart_type: 'donut_chart', title: 'Column Type Mix' })
  const chartDashboard = makeNode('dashboard', 'Chart Dashboard', 'output', 860, 240, {
    title: 'Chart Gallery Dashboard',
    charts: [
      { type: 'bar_chart', title: 'Metrics by Column' },
      { type: 'histogram', title: 'Distribution Histogram' },
      { type: 'donut_chart', title: 'Column Type Mix' },
    ],
  })

  const timeFile = makeNode('file_upload', 'File Upload', 'source', 80, 200)
  const timeTypes = makeNode('column_type_detection', 'Column Types', 'preparation', 320, 120)
  const timeSeries = makeNode('time_series', 'Time Series', 'analysis', 560, 120, { date_column: '', value_column: '', window: 7 })
  const timeLine = makeNode('line_chart', 'Line Chart', 'visualization', 800, 120, { chart_type: 'line_chart', title: 'Trend Line' })
  const timeDashboard = makeNode('dashboard', 'Trend Dashboard', 'output', 1040, 120, { title: 'Trend Dashboard' })

  const bigFile = makeNode('file_upload', 'File Upload', 'source', 80, 260)
  const bigProfile = makeNode('large_dataset_profiler', 'Large Dataset Profiler', 'big_data', 340, 120, { sample_size: 5000 })
  const bigChunk = makeNode('chunk_processing', 'Chunk Processing', 'big_data', 340, 280, { chunk_size: 10000 })
  const bigMapReduce = makeNode('mapreduce_aggregation', 'MapReduce Aggregation', 'big_data', 620, 200, { chunk_size: 10000, reducer: 'sum' })
  const bigDashboard = makeNode('dashboard', 'Big Data Dashboard', 'output', 900, 200, { title: 'Big Data Processing Dashboard' })
  const bigReport = makeNode('report', 'Big Data Report', 'output', 900, 360, { title: 'Big Data Processing Report' })

  return [
    {
      id: 'quick_eda',
      name: 'Quick EDA',
      description: 'File upload, statistics, distribution, and dashboard.',
      icon: '∿',
      accent: 'bg-[#0071E3]',
      nodes: [quickFile, quickStats, quickDist, quickDash],
      edges: [makeEdge(quickFile, quickStats), makeEdge(quickFile, quickDist), makeEdge(quickStats, quickDash), makeEdge(quickDist, quickDash)],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'anomaly_pipeline',
      name: 'Anomaly Pipeline',
      description: 'Missing-value handling, outlier detection, stats, and dashboard.',
      icon: '△',
      accent: 'bg-[#FF453A]',
      nodes: [anomalyFile, anomalyMissing, anomalyDetect, anomalyStats, anomalyDash],
      edges: [
        makeEdge(anomalyFile, anomalyMissing),
        makeEdge(anomalyMissing, anomalyDetect),
        makeEdge(anomalyMissing, anomalyStats),
        makeEdge(anomalyDetect, anomalyDash),
        makeEdge(anomalyStats, anomalyDash),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'full_analysis',
      name: 'Full Analysis',
      description: 'Quality checks, core analysis, and report.',
      icon: 'σ',
      accent: 'bg-[#30D158]',
      nodes: [fullFile, fullTypes, fullMissing, fullDuplicates, fullStats, fullAnomaly, fullCorrelation, fullDistribution, fullReport],
      edges: [
        makeEdge(fullFile, fullTypes),
        makeEdge(fullFile, fullMissing),
        makeEdge(fullFile, fullDuplicates),
        makeEdge(fullMissing, fullStats),
        makeEdge(fullMissing, fullAnomaly),
        makeEdge(fullMissing, fullCorrelation),
        makeEdge(fullMissing, fullDistribution),
        makeEdge(fullStats, fullReport),
        makeEdge(fullAnomaly, fullReport),
        makeEdge(fullCorrelation, fullReport),
        makeEdge(fullDistribution, fullReport),
      ],
      viewport: { x: 0, y: 0, zoom: 0.85 },
    },
    {
      id: 'data_quality',
      name: 'Data Quality',
      description: 'Column types, missing values, duplicates, and a quality report.',
      icon: '⊘',
      accent: 'bg-[#F5A623]',
      nodes: [qualityFile, qualityTypes, qualityMissing, qualityDuplicates, qualityReport],
      edges: [
        makeEdge(qualityFile, qualityTypes),
        makeEdge(qualityFile, qualityMissing),
        makeEdge(qualityFile, qualityDuplicates),
        makeEdge(qualityTypes, qualityReport),
        makeEdge(qualityMissing, qualityReport),
        makeEdge(qualityDuplicates, qualityReport),
      ],
      viewport: { x: 0, y: 0, zoom: 1 },
    },
    {
      id: 'relationship_map',
      name: 'Relationship Map',
      description: 'Statistics, correlations, heatmap chart, and dashboard.',
      icon: 'ρ',
      accent: 'bg-[#5E5CE6]',
      nodes: [relationFile, relationStats, relationCorrelation, relationHeat, relationDashboard],
      edges: [
        makeEdge(relationFile, relationStats),
        makeEdge(relationFile, relationCorrelation),
        makeEdge(relationCorrelation, relationHeat),
        makeEdge(relationStats, relationDashboard),
        makeEdge(relationCorrelation, relationDashboard),
        makeEdge(relationHeat, relationDashboard, 'chart_panel'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.95 },
    },
    {
      id: 'ml_starter',
      name: 'ML Starter',
      description: 'Clean data, split train/test, train a model, and inspect metrics.',
      icon: '◎',
      accent: 'bg-[#FF6B6B]',
      nodes: [mlFile, mlMissing, mlSplit, mlModel, mlDashboard],
      edges: [
        makeEdge(mlFile, mlMissing),
        makeEdge(mlMissing, mlSplit),
        makeEdge(mlSplit, mlModel),
        makeEdge(mlModel, mlDashboard),
      ],
      viewport: { x: 0, y: 0, zoom: 0.95 },
    },
    {
      id: 'chart_gallery',
      name: 'Chart Gallery',
      description: 'Build a dashboard with bar, histogram, and donut chart panels.',
      icon: '▥',
      accent: 'bg-[#5E5CE6]',
      nodes: [chartFile, chartStats, chartDistribution, chartTypes, chartBar, chartHistogram, chartDonut, chartDashboard],
      edges: [
        makeEdge(chartFile, chartStats),
        makeEdge(chartFile, chartDistribution),
        makeEdge(chartFile, chartTypes),
        makeEdge(chartStats, chartBar),
        makeEdge(chartDistribution, chartHistogram),
        makeEdge(chartTypes, chartDonut),
        makeEdge(chartBar, chartDashboard, 'chart_panel'),
        makeEdge(chartHistogram, chartDashboard, 'chart_panel'),
        makeEdge(chartDonut, chartDashboard, 'chart_panel'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.82 },
    },
    {
      id: 'time_series',
      name: 'Time Series',
      description: 'Detect date columns, calculate rolling trend, and chart it.',
      icon: '~',
      accent: 'bg-[#30D158]',
      nodes: [timeFile, timeTypes, timeSeries, timeLine, timeDashboard],
      edges: [
        makeEdge(timeFile, timeTypes),
        makeEdge(timeFile, timeSeries),
        makeEdge(timeSeries, timeLine),
        makeEdge(timeSeries, timeDashboard),
        makeEdge(timeLine, timeDashboard, 'chart_panel'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.95 },
    },
    {
      id: 'big_data_processing',
      name: 'Big Data Processing',
      description: 'Profiler, chunk processing, MapReduce aggregation, dashboard, and report.',
      icon: 'BD',
      accent: 'bg-[#00A6A6]',
      nodes: [bigFile, bigProfile, bigChunk, bigMapReduce, bigDashboard, bigReport],
      edges: [
        makeEdge(bigFile, bigProfile),
        makeEdge(bigFile, bigChunk),
        makeEdge(bigChunk, bigMapReduce),
        makeEdge(bigProfile, bigDashboard, 'profiler_summary'),
        makeEdge(bigMapReduce, bigDashboard, 'mapreduce_summary'),
        makeEdge(bigProfile, bigReport, 'profiler_summary'),
        makeEdge(bigMapReduce, bigReport, 'mapreduce_summary'),
      ],
      viewport: { x: 0, y: 0, zoom: 0.82 },
    },
  ]
}
