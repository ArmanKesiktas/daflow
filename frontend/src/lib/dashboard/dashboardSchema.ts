/**
 * DashboardDefinition Schema — canonical types for the ECharts-only dashboard architecture.
 *
 * Pure module: no React, no DOM, no echarts runtime imports (type-only is fine).
 * The mobile client (out of scope) will reuse this schema unchanged.
 *
 * Feature: echarts-dashboard-architecture
 */

// ── Vocabulary ──────────────────────────────────────────────────────────────

/** Fixed chart-type vocabulary. Adding a type requires updating this union and helpers. */
export type ChartType =
  | 'bar'
  | 'line'
  | 'pie'
  | 'donut'
  | 'scatter'
  | 'area'
  | 'heatmap'
  | 'gauge'
  | 'radar'

export const CHART_TYPES: readonly ChartType[] = [
  'bar', 'line', 'pie', 'donut', 'scatter', 'area', 'heatmap', 'gauge', 'radar',
]

/** A library marker. 'echarts' is the only renderable library. 'deprecated' is a placeholder. */
export type ChartLibrary = 'echarts' | 'deprecated'

/** Dashboard schema version. Bumped on breaking shape changes. */
export type DashboardSchemaVersion = 1
export const DASHBOARD_SCHEMA_VERSION: DashboardSchemaVersion = 1

/** UI language code. */
export type LanguageCode = 'en' | 'tr'

/** Theme mode for chart palettes. */
export type ThemeMode = 'light' | 'dark'

// ── ECharts Option (structurally typed) ─────────────────────────────────────

/**
 * Minimal subset of an ECharts option that the validator inspects.
 * The full ECharts option type is wide; we only structurally validate
 * that it is a JSON object containing a series field.
 */
export type EChartsOption = Record<string, unknown> & {
  series?: unknown[]
}

// ── Dataset Metadata ────────────────────────────────────────────────────────

/** Dataset metadata accompanying a chart output. */
export interface DatasetMeta {
  /** Workflow node id of the dataset that produced this chart's input. */
  sourceNodeId: string
  /** Column names in the source dataset, in order. */
  columns: string[]
  /** Number of rows in the source dataset. May be 0. */
  rowCount: number
}

// ── Chart Node Output ───────────────────────────────────────────────────────

/** The canonical output of every chart node. */
export interface ChartNodeOutput {
  /** Unique id within a workflow execution. */
  id: string
  /** Chart type. Used for routing helpers and for analytics. */
  type: ChartType
  /** Human-readable title. */
  title: string
  /** Always 'echarts' for renderable outputs; 'deprecated' for placeholders. */
  library: ChartLibrary
  /** ECharts option object. JSON-serializable. Required when library === 'echarts'. */
  echartsOption: EChartsOption | null
  /** Dataset metadata. */
  datasetMeta: DatasetMeta
}

// ── Dashboard Layout & Filters ──────────────────────────────────────────────

/** A single grid placement. */
export interface DashboardLayoutItem {
  /** References ChartNodeOutput.id. */
  chartId: string
  /** Grid column origin (0-indexed, in 12-col grid). */
  x: number
  /** Grid row origin (0-indexed). */
  y: number
  /** Width in grid columns (1-12). */
  w: number
  /** Height in grid rows. */
  h: number
}

/** Filter declaration kept portable: serializable, no callbacks. */
export interface DashboardFilter {
  column: string
  /** UI control hint. */
  kind: 'multi_select' | 'range' | 'date_range' | 'boolean'
  label: string
}

// ── Dashboard Definition (top-level persisted shape) ────────────────────────

/** Top-level persisted dashboard. */
export interface DashboardDefinition {
  title: string
  language: LanguageCode
  layout: DashboardLayoutItem[]
  charts: ChartNodeOutput[]
  filters: DashboardFilter[]
  datasetMeta: DatasetMeta
  /** Schema version. Bumped on breaking shape changes. */
  schemaVersion: DashboardSchemaVersion
  /** ISO-8601 timestamp produced by the dashboard node. */
  generatedAt: string
}

// ── Helper Type Guards ──────────────────────────────────────────────────────

export function isChartType(value: unknown): value is ChartType {
  return typeof value === 'string' && CHART_TYPES.includes(value as ChartType)
}

export function isChartLibrary(value: unknown): value is ChartLibrary {
  return value === 'echarts' || value === 'deprecated'
}

export function isLanguageCode(value: unknown): value is LanguageCode {
  return value === 'en' || value === 'tr'
}
