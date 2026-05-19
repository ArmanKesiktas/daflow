/**
 * DashboardDefinition Schema Validator.
 *
 * Pure module: no React, no DOM imports.
 *
 * Walks the structure top-down, checks required fields, types, and that every
 * chart.type is in the ChartType union. Detects non-portable values (functions,
 * symbols, class instances) and reports them as 'non_portable_value'. Enforces
 * the layout/charts bijection. Treats library !== 'echarts' as a deprecated
 * entry without invalidating the whole definition.
 *
 * Feature: echarts-dashboard-architecture
 */

import type {
  ChartLibrary,
  ChartNodeOutput,
  DashboardDefinition,
  DashboardLayoutItem,
  DatasetMeta,
} from './dashboardSchema'
import { CHART_TYPES, isChartLibrary, isChartType, isLanguageCode } from './dashboardSchema'

// ── Result Types ────────────────────────────────────────────────────────────

export type ValidationResult =
  | { valid: true; value: DashboardDefinition; deprecatedChartIds: string[] }
  | { valid: false; errors: ValidationError[] }

export interface ValidationError {
  /** JSON-pointer-style path, e.g., "/charts/2/echartsOption". */
  path: string
  /** Human-readable description. */
  message: string
  /** Machine code for downstream handling. */
  code: 'missing_field' | 'wrong_type' | 'unknown_chart_type' | 'non_portable_value'
}

// ── Error Builders ──────────────────────────────────────────────────────────

function missing(path: string, field: string): ValidationError {
  return { path, code: 'missing_field', message: `Missing required field: ${field}` }
}

function wrongType(path: string, expected: string, actual: string): ValidationError {
  return { path, code: 'wrong_type', message: `Expected ${expected}, got ${actual}` }
}

function unknownChartType(path: string, value: unknown): ValidationError {
  return {
    path,
    code: 'unknown_chart_type',
    message: `Unknown chart type "${String(value)}". Allowed: ${CHART_TYPES.join(', ')}`,
  }
}

function nonPortable(path: string, kind: string): ValidationError {
  return {
    path,
    code: 'non_portable_value',
    message: `Non-portable value at this path (${kind}). Functions, symbols, and class instances are not allowed.`,
  }
}

// ── Portability Scan ────────────────────────────────────────────────────────

/**
 * Recursively check that no value is a function, symbol, DOM node, or class instance.
 * Plain objects and arrays are allowed; primitive values are allowed.
 */
function scanPortability(value: unknown, path: string, errors: ValidationError[]): void {
  if (value === null || value === undefined) return
  const t = typeof value
  if (t === 'function') {
    errors.push(nonPortable(path, 'function'))
    return
  }
  if (t === 'symbol') {
    errors.push(nonPortable(path, 'symbol'))
    return
  }
  if (t !== 'object') return // primitives are fine

  if (Array.isArray(value)) {
    value.forEach((item, i) => scanPortability(item, `${path}/${i}`, errors))
    return
  }

  // Plain object check: prototype must be Object.prototype or null
  const proto = Object.getPrototypeOf(value as object)
  if (proto !== Object.prototype && proto !== null) {
    errors.push(nonPortable(path, 'class instance or DOM node'))
    return
  }

  for (const [key, child] of Object.entries(value as Record<string, unknown>)) {
    scanPortability(child, `${path}/${key}`, errors)
  }
}

// ── Field Validators ────────────────────────────────────────────────────────

function validateDatasetMeta(value: unknown, path: string, errors: ValidationError[]): value is DatasetMeta {
  if (typeof value !== 'object' || value === null) {
    errors.push(wrongType(path, 'object', typeof value))
    return false
  }
  const m = value as Record<string, unknown>
  let ok = true
  if (typeof m.sourceNodeId !== 'string') {
    errors.push(missing(`${path}/sourceNodeId`, 'sourceNodeId'))
    ok = false
  }
  if (!Array.isArray(m.columns)) {
    errors.push(missing(`${path}/columns`, 'columns'))
    ok = false
  }
  if (typeof m.rowCount !== 'number') {
    errors.push(missing(`${path}/rowCount`, 'rowCount'))
    ok = false
  }
  return ok
}

function validateChartEntry(
  value: unknown,
  index: number,
  errors: ValidationError[],
  deprecatedIds: string[],
): value is ChartNodeOutput {
  const path = `/charts/${index}`
  if (typeof value !== 'object' || value === null) {
    errors.push(wrongType(path, 'object', typeof value))
    return false
  }
  const c = value as Record<string, unknown>
  let ok = true

  if (typeof c.id !== 'string') {
    errors.push(missing(`${path}/id`, 'id'))
    ok = false
  }
  if (typeof c.title !== 'string') {
    errors.push(missing(`${path}/title`, 'title'))
    ok = false
  }
  if (!isChartLibrary(c.library)) {
    errors.push(wrongType(`${path}/library`, "'echarts' | 'deprecated'", typeof c.library))
    ok = false
  }
  if (!isChartType(c.type)) {
    errors.push(unknownChartType(`${path}/type`, c.type))
    ok = false
  }

  // datasetMeta required
  if (!validateDatasetMeta(c.datasetMeta, `${path}/datasetMeta`, errors)) ok = false

  // echartsOption: required object when library='echarts', null when library='deprecated'
  const library = c.library as ChartLibrary | undefined
  if (library === 'echarts') {
    if (typeof c.echartsOption !== 'object' || c.echartsOption === null) {
      errors.push(missing(`${path}/echartsOption`, 'echartsOption'))
      ok = false
    }
  } else if (library === 'deprecated') {
    if (typeof c.id === 'string') {
      deprecatedIds.push(c.id)
    }
    // echartsOption may be null for deprecated entries; do not require it
  }

  return ok
}

function validateLayoutItem(value: unknown, index: number, errors: ValidationError[]): value is DashboardLayoutItem {
  const path = `/layout/${index}`
  if (typeof value !== 'object' || value === null) {
    errors.push(wrongType(path, 'object', typeof value))
    return false
  }
  const l = value as Record<string, unknown>
  let ok = true
  if (typeof l.chartId !== 'string') {
    errors.push(missing(`${path}/chartId`, 'chartId'))
    ok = false
  }
  for (const f of ['x', 'y', 'w', 'h'] as const) {
    if (typeof l[f] !== 'number') {
      errors.push(missing(`${path}/${f}`, f))
      ok = false
    }
  }
  return ok
}

// ── Main Validator ──────────────────────────────────────────────────────────

/** Validate a value against the DashboardDefinition schema. */
export function validateDashboardDefinition(value: unknown): ValidationResult {
  const errors: ValidationError[] = []
  const deprecatedChartIds: string[] = []

  if (typeof value !== 'object' || value === null) {
    errors.push(wrongType('', 'object', typeof value))
    return { valid: false, errors }
  }

  const def = value as Record<string, unknown>

  // Top-level fields
  if (typeof def.title !== 'string') errors.push(missing('/title', 'title'))
  if (!isLanguageCode(def.language)) errors.push(wrongType('/language', "'en' | 'tr'", typeof def.language))
  if (def.schemaVersion !== 1) errors.push(wrongType('/schemaVersion', '1', String(def.schemaVersion)))
  if (typeof def.generatedAt !== 'string') errors.push(missing('/generatedAt', 'generatedAt'))

  // datasetMeta
  if (def.datasetMeta === undefined) {
    errors.push(missing('/datasetMeta', 'datasetMeta'))
  } else {
    validateDatasetMeta(def.datasetMeta, '/datasetMeta', errors)
  }

  // filters (array, may be empty)
  if (!Array.isArray(def.filters)) {
    errors.push(missing('/filters', 'filters'))
  }

  // charts
  if (!Array.isArray(def.charts)) {
    errors.push(missing('/charts', 'charts'))
    return { valid: false, errors }
  }
  const charts = def.charts
  charts.forEach((c, i) => validateChartEntry(c, i, errors, deprecatedChartIds))

  // layout
  if (!Array.isArray(def.layout)) {
    errors.push(missing('/layout', 'layout'))
    return { valid: false, errors }
  }
  const layout = def.layout
  layout.forEach((item, i) => validateLayoutItem(item, i, errors))

  // Bijection: every chart.id matches a layout.chartId and vice versa
  const chartIds = new Set<string>()
  for (const c of charts) {
    const id = (c as { id?: unknown })?.id
    if (typeof id === 'string') chartIds.add(id)
  }
  const layoutChartIds = new Set<string>()
  for (const l of layout) {
    const id = (l as { chartId?: unknown })?.chartId
    if (typeof id === 'string') layoutChartIds.add(id)
  }

  for (const id of chartIds) {
    if (!layoutChartIds.has(id)) {
      errors.push({
        path: '/layout',
        code: 'missing_field',
        message: `No layout entry for chart id "${id}"`,
      })
    }
  }
  for (const id of layoutChartIds) {
    if (!chartIds.has(id)) {
      errors.push({
        path: '/charts',
        code: 'missing_field',
        message: `No chart entry for layout chartId "${id}"`,
      })
    }
  }

  // Portability scan
  scanPortability(def, '', errors)

  if (errors.length > 0) {
    return { valid: false, errors }
  }

  return {
    valid: true,
    value: def as unknown as DashboardDefinition,
    deprecatedChartIds,
  }
}
