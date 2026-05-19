/**
 * Panel Adapter — converts the backend's existing chart panel format into the
 * canonical ChartNodeOutput format used by the ECharts-based dashboard.
 *
 * The backend visualization nodes still emit "panel" objects (legacy shape).
 * Rather than migrating every node at once, this adapter normalizes panels
 * into ChartNodeOutput. Panels we cannot map are returned as deprecated
 * placeholders so the dashboard renders a Deprecation_Fallback_Card for them
 * instead of crashing.
 *
 * Pure module: no React, no DOM imports.
 *
 * Feature: echarts-dashboard-architecture
 */

import type {
  ChartNodeOutput,
  ChartType,
  DatasetMeta,
  EChartsOption,
  LanguageCode,
  ThemeMode,
} from './dashboardSchema'
import {
  createBarChartOption,
  createDonutChartOption,
  createLineChartOption,
  createPieChartOption,
  createScatterChartOption,
  type CategoricalSeriesInput,
} from './chartOptionHelpers'

// ── Backend Panel Shape (legacy) ────────────────────────────────────────────

/** Loosely typed; backend emits many flavors. */
export interface LegacyPanel {
  type?: string
  title?: string
  description?: string
  data?: {
    labels?: unknown[]
    datasets?: Array<{ label?: string; data?: unknown[] }>
    [k: string]: unknown
  } | unknown
  stats?: Array<{ label: string; value: unknown }>
  kpi?: { label?: string; value?: unknown }
  kpis?: Array<{ label: string; value: unknown }>
  [k: string]: unknown
}

// ── Type Mapping ────────────────────────────────────────────────────────────

/** Maps backend chart type strings to canonical ChartType. Returns null when no mapping exists. */
function mapChartType(legacy: string | undefined): ChartType | null {
  if (!legacy) return null
  // Direct matches
  if (legacy === 'bar' || legacy === 'line' || legacy === 'pie' || legacy === 'donut'
   || legacy === 'scatter' || legacy === 'area' || legacy === 'heatmap'
   || legacy === 'gauge' || legacy === 'radar') return legacy
  // Mappings
  switch (legacy) {
    case 'bar_chart':
    case 'clustered_bar_chart':
    case 'stacked_bar_chart':
    case 'overlapping_bars':
    case 'horizontal_bar_chart':
    case 'diverging_bar_chart':
    case 'small_multiples':
    case 'dual_axis_chart':
    case 'missing_values_bar':
      return 'bar'
    case 'line_chart':
    case 'connected_scatter_plot':
    case 'slope_chart':
    case 'dumbbell_chart':
      return 'line'
    case 'area_chart':
    case 'stream_graph':
      return 'area'
    case 'pie_chart':
    case 'sunburst':
    case 'treemap':
    case 'alluvial_diagram':
    case 'word_cloud':
      return 'pie'
    case 'donut_chart':
      return 'donut'
    case 'scatter_plot':
    case 'bubble_chart':
    case 'beeswarm_plot':
    case 'convex_hull_chart':
    case 'parallel_coordinates':
      return 'scatter'
    case 'heatmap':
    case 'density_heatmap':
    case 'correlation_network':
      return 'heatmap'
    case 'kpi_card':
    case 'stat_card':
    case 'kpi_grid':
      return 'gauge'
    case 'radar_chart':
    case 'polar_area_chart':
      return 'radar'
    default:
      return null
  }
}

// ── Categorical Extraction ──────────────────────────────────────────────────

function extractCategoricalInput(panel: LegacyPanel): CategoricalSeriesInput | null {
  const data = panel.data
  if (!data || typeof data !== 'object') return null
  const d = data as { labels?: unknown[]; datasets?: Array<{ label?: string; data?: unknown[] }> }
  if (!Array.isArray(d.labels) || !Array.isArray(d.datasets)) return null

  const categories = d.labels.map((l) => String(l))
  const series = d.datasets.map((ds, i) => ({
    name: String(ds.label ?? `Series ${i + 1}`),
    values: Array.isArray(ds.data) ? ds.data.map((v) => (typeof v === 'number' ? v : Number(v) || null)) : [],
  }))

  return { categories, series }
}

// ── Adapter ─────────────────────────────────────────────────────────────────

export interface AdapterContext {
  language: LanguageCode
  theme: ThemeMode
  /** A unique id for the resulting chart entry. */
  chartId: string
  /** Source node id from the workflow execution. */
  sourceNodeId: string
}

/**
 * Convert a legacy panel into a ChartNodeOutput.
 *
 * Returns:
 * - `library: 'echarts'` ChartNodeOutput when mapping succeeds.
 * - `library: 'deprecated'` placeholder when the panel cannot be mapped.
 *
 * Never throws.
 */
export function adaptPanelToChartNodeOutput(panel: LegacyPanel, ctx: AdapterContext): ChartNodeOutput {
  const datasetMeta: DatasetMeta = {
    sourceNodeId: ctx.sourceNodeId,
    columns: [],
    rowCount: 0,
  }

  const chartType = mapChartType(panel.type)
  const title = String(panel.title ?? '')

  if (chartType === null) {
    return {
      id: ctx.chartId,
      type: 'bar', // unused for deprecated entries; type chosen as a safe default
      title,
      library: 'deprecated',
      echartsOption: null,
      datasetMeta,
    }
  }

  const helperOpts = { title, language: ctx.language, theme: ctx.theme, showLegend: true }

  try {
    let option: EChartsOption | null = null

    if (chartType === 'bar') {
      const input = extractCategoricalInput(panel)
      if (!input) throw new Error('No categorical data')
      option = createBarChartOption(input, helperOpts)
    } else if (chartType === 'line') {
      const input = extractCategoricalInput(panel)
      if (!input) throw new Error('No categorical data')
      option = createLineChartOption(input, helperOpts)
    } else if (chartType === 'area') {
      const input = extractCategoricalInput(panel)
      if (!input) throw new Error('No categorical data')
      option = createLineChartOption(input, helperOpts) // area handled via createLineChartOption variant
    } else if (chartType === 'pie' || chartType === 'donut') {
      const input = extractCategoricalInput(panel)
      if (!input || input.series.length === 0) throw new Error('No pie data')
      const slices = input.categories.map((label, i) => ({
        name: label,
        value: input.series[0].values[i] ?? 0,
      }))
      option = chartType === 'pie'
        ? createPieChartOption({ slices }, helperOpts)
        : createDonutChartOption({ slices }, helperOpts)
    } else if (chartType === 'scatter') {
      // Best-effort: convert categorical (label, value) pairs to (x, y) points
      const input = extractCategoricalInput(panel)
      if (!input || input.series.length === 0) throw new Error('No scatter data')
      const points = input.series[0].values.map((y, i) => (
        typeof y === 'number' ? { x: i, y, label: input.categories[i] } : null
      ))
      option = createScatterChartOption({ points }, helperOpts)
    } else {
      // Heatmap / gauge / radar — too varied to auto-adapt safely; mark deprecated
      return {
        id: ctx.chartId,
        type: chartType,
        title,
        library: 'deprecated',
        echartsOption: null,
        datasetMeta,
      }
    }

    return {
      id: ctx.chartId,
      type: chartType,
      title,
      library: 'echarts',
      echartsOption: option,
      datasetMeta,
    }
  } catch {
    return {
      id: ctx.chartId,
      type: chartType,
      title,
      library: 'deprecated',
      echartsOption: null,
      datasetMeta,
    }
  }
}

// ── Bulk Adapter ────────────────────────────────────────────────────────────

/** Convert an array of legacy panels into ChartNodeOutput entries. */
export function adaptPanelsToChartNodeOutputs(
  panels: LegacyPanel[],
  ctx: Omit<AdapterContext, 'chartId'> & { chartIdPrefix?: string },
): ChartNodeOutput[] {
  const prefix = ctx.chartIdPrefix ?? 'chart'
  return panels.map((panel, i) => adaptPanelToChartNodeOutput(panel, {
    language: ctx.language,
    theme: ctx.theme,
    sourceNodeId: ctx.sourceNodeId,
    chartId: `${prefix}-${i}`,
  }))
}
