/**
 * Chart Option Helpers — pure functions that build ECharts options for each chart type.
 *
 * Pure module: no React, no DOM imports.
 * - Apply theme palette via applyTheme
 * - Use localized strings from messages
 * - Always set tooltip.show = true
 * - Set legend.show from options.showLegend (default true)
 * - Filter null/undefined values from series (omit, do not pass through)
 * - Throw MissingChartFieldError when required input fields are missing
 * - Never assign function-valued formatters; use ECharts string templates
 *
 * Feature: echarts-dashboard-architecture
 */

import type { EChartsOption, LanguageCode, ThemeMode } from './dashboardSchema'
import { applyTheme, THEME_PALETTES } from './theme'
import { getMessage } from './messages'

// ── Errors ──────────────────────────────────────────────────────────────────

export class MissingChartFieldError extends Error {
  readonly field: string
  constructor(field: string, language: LanguageCode = 'en') {
    super(`${getMessage(language, 'missing_field_error')}: ${field}`)
    this.name = 'MissingChartFieldError'
    this.field = field
  }
}

// ── Common Options ──────────────────────────────────────────────────────────

export interface ChartOptionHelperOptions {
  /** Chart title rendered above the canvas. */
  title?: string
  /** Locale for axis labels, legend labels, and tooltip headings. */
  language: LanguageCode
  /** Theme mode; selects from light/dark palette. */
  theme: ThemeMode
  /** Whether the legend is visible. Defaults to true when omitted. */
  showLegend?: boolean
}

// ── Input Shapes ────────────────────────────────────────────────────────────

export interface CategoricalSeriesInput {
  categories: string[]
  series: Array<{ name: string; values: Array<number | null | undefined> }>
}

export interface PieSliceInput {
  slices: Array<{ name: string; value: number | null | undefined }>
}

export interface PointsSeriesInput {
  points: Array<{ x: number; y: number; label?: string } | null | undefined>
}

export interface HeatmapInput {
  xLabels: string[]
  yLabels: string[]
  values: Array<[number, number, number]>
}

export interface GaugeInput {
  value: number
  min?: number
  max?: number
  name?: string
}

export interface RadarInput {
  indicators: Array<{ name: string; max: number }>
  series: Array<{ name: string; values: number[] }>
}

// ── Internal Helpers ────────────────────────────────────────────────────────

function isNotNull<T>(v: T | null | undefined): v is T {
  return v !== null && v !== undefined
}

/** Build the common skeleton (title, tooltip, legend) shared by all chart types. */
function buildSkeleton(opts: ChartOptionHelperOptions, legendData?: string[]): EChartsOption {
  const showLegend = opts.showLegend ?? true
  const palette = THEME_PALETTES[opts.theme]
  return {
    title: opts.title ? { text: opts.title, textStyle: { color: palette.axisLabel } } : undefined,
    tooltip: {
      show: true,
      trigger: 'item',
      backgroundColor: palette.tooltipBackground,
      borderColor: palette.tooltipBorder,
      textStyle: { color: palette.tooltipText },
    },
    legend: {
      show: showLegend,
      data: legendData,
      textStyle: { color: palette.axisLabel },
    },
  }
}

function buildCartesianAxes(opts: ChartOptionHelperOptions, categories: string[]): Pick<EChartsOption, 'xAxis' | 'yAxis'> {
  const palette = THEME_PALETTES[opts.theme]
  return {
    xAxis: {
      type: 'category',
      data: categories,
      axisLabel: { color: palette.axisLabel },
      axisLine: { lineStyle: { color: palette.splitLine } },
      splitLine: { show: false },
    },
    yAxis: {
      type: 'value',
      name: getMessage(opts.language, 'value'),
      axisLabel: { color: palette.axisLabel },
      axisLine: { lineStyle: { color: palette.splitLine } },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
  }
}

function requireCategoricalInput(data: CategoricalSeriesInput, language: LanguageCode): void {
  if (!data || !Array.isArray(data.categories)) {
    throw new MissingChartFieldError('categories', language)
  }
  if (!Array.isArray(data.series)) {
    throw new MissingChartFieldError('series', language)
  }
}

// ── Bar Chart ───────────────────────────────────────────────────────────────

export function createBarChartOption(data: CategoricalSeriesInput, opts: ChartOptionHelperOptions): EChartsOption {
  requireCategoricalInput(data, opts.language)
  const skeleton = buildSkeleton(opts, data.series.map((s) => s.name))
  const axes = buildCartesianAxes(opts, data.categories)

  // For bar: omit null/undefined values entirely (skip those data points)
  const seriesArray = data.series.map((s) => ({
    name: s.name,
    type: 'bar' as const,
    data: s.values.filter(isNotNull),
  }))

  return applyTheme({
    ...skeleton,
    ...axes,
    tooltip: { ...(skeleton.tooltip as object), trigger: 'axis' },
    series: seriesArray,
  }, opts.theme)
}

// ── Line Chart ──────────────────────────────────────────────────────────────

export function createLineChartOption(data: CategoricalSeriesInput, opts: ChartOptionHelperOptions): EChartsOption {
  requireCategoricalInput(data, opts.language)
  const skeleton = buildSkeleton(opts, data.series.map((s) => s.name))
  const axes = buildCartesianAxes(opts, data.categories)

  const seriesArray = data.series.map((s) => ({
    name: s.name,
    type: 'line' as const,
    data: s.values.filter(isNotNull),
    smooth: false,
  }))

  return applyTheme({
    ...skeleton,
    ...axes,
    tooltip: { ...(skeleton.tooltip as object), trigger: 'axis' },
    series: seriesArray,
  }, opts.theme)
}

// ── Area Chart ──────────────────────────────────────────────────────────────

export function createAreaChartOption(data: CategoricalSeriesInput, opts: ChartOptionHelperOptions): EChartsOption {
  requireCategoricalInput(data, opts.language)
  const skeleton = buildSkeleton(opts, data.series.map((s) => s.name))
  const axes = buildCartesianAxes(opts, data.categories)

  const seriesArray = data.series.map((s) => ({
    name: s.name,
    type: 'line' as const,
    areaStyle: {},
    data: s.values.filter(isNotNull),
    smooth: true,
  }))

  return applyTheme({
    ...skeleton,
    ...axes,
    tooltip: { ...(skeleton.tooltip as object), trigger: 'axis' },
    series: seriesArray,
  }, opts.theme)
}

// ── Pie Chart ───────────────────────────────────────────────────────────────

export function createPieChartOption(data: PieSliceInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || !Array.isArray(data.slices)) {
    throw new MissingChartFieldError('slices', opts.language)
  }

  const cleanSlices = data.slices.filter((s) => isNotNull(s.value))
  const skeleton = buildSkeleton(opts, cleanSlices.map((s) => s.name))

  return applyTheme({
    ...skeleton,
    series: [{
      type: 'pie',
      radius: '60%',
      data: cleanSlices.map((s) => ({ name: s.name, value: s.value })),
      label: { color: THEME_PALETTES[opts.theme].axisLabel },
    }],
  }, opts.theme)
}

// ── Donut Chart ─────────────────────────────────────────────────────────────

export function createDonutChartOption(data: PieSliceInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || !Array.isArray(data.slices)) {
    throw new MissingChartFieldError('slices', opts.language)
  }

  const cleanSlices = data.slices.filter((s) => isNotNull(s.value))
  const skeleton = buildSkeleton(opts, cleanSlices.map((s) => s.name))

  return applyTheme({
    ...skeleton,
    series: [{
      type: 'pie',
      radius: ['45%', '70%'],
      data: cleanSlices.map((s) => ({ name: s.name, value: s.value })),
      label: { color: THEME_PALETTES[opts.theme].axisLabel },
    }],
  }, opts.theme)
}

// ── Scatter Chart ───────────────────────────────────────────────────────────

export function createScatterChartOption(data: PointsSeriesInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || !Array.isArray(data.points)) {
    throw new MissingChartFieldError('points', opts.language)
  }

  const cleanPoints = data.points.filter(isNotNull).map((p) => [p.x, p.y])
  const skeleton = buildSkeleton(opts)
  const palette = THEME_PALETTES[opts.theme]

  return applyTheme({
    ...skeleton,
    xAxis: {
      type: 'value',
      axisLabel: { color: palette.axisLabel },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    yAxis: {
      type: 'value',
      name: getMessage(opts.language, 'value'),
      axisLabel: { color: palette.axisLabel },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series: [{
      type: 'scatter',
      data: cleanPoints,
      symbolSize: 8,
    }],
  }, opts.theme)
}

// ── Heatmap Chart ───────────────────────────────────────────────────────────

export function createHeatmapChartOption(data: HeatmapInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || !Array.isArray(data.xLabels)) throw new MissingChartFieldError('xLabels', opts.language)
  if (!Array.isArray(data.yLabels)) throw new MissingChartFieldError('yLabels', opts.language)
  if (!Array.isArray(data.values)) throw new MissingChartFieldError('values', opts.language)

  const skeleton = buildSkeleton(opts)
  const palette = THEME_PALETTES[opts.theme]

  return applyTheme({
    ...skeleton,
    tooltip: { ...(skeleton.tooltip as object), position: 'top' },
    xAxis: { type: 'category', data: data.xLabels, axisLabel: { color: palette.axisLabel } },
    yAxis: { type: 'category', data: data.yLabels, axisLabel: { color: palette.axisLabel } },
    visualMap: {
      min: -1, max: 1, calculable: true, orient: 'horizontal', left: 'center', bottom: 0,
      inRange: { color: ['#FF453A', '#FFFFFF', '#0071E3'] },
      textStyle: { color: palette.axisLabel },
    },
    series: [{
      type: 'heatmap',
      data: data.values,
      label: { show: false },
    }],
  }, opts.theme)
}

// ── Gauge Chart ─────────────────────────────────────────────────────────────

export function createGaugeChartOption(data: GaugeInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || typeof data.value !== 'number') {
    throw new MissingChartFieldError('value', opts.language)
  }

  const skeleton = buildSkeleton(opts)
  const palette = THEME_PALETTES[opts.theme]

  return applyTheme({
    ...skeleton,
    series: [{
      type: 'gauge',
      min: data.min ?? 0,
      max: data.max ?? 100,
      data: [{ value: data.value, name: data.name ?? getMessage(opts.language, 'value') }],
      detail: { color: palette.axisLabel },
      title: { color: palette.axisLabel },
    }],
  }, opts.theme)
}

// ── Radar Chart ─────────────────────────────────────────────────────────────

export function createRadarChartOption(data: RadarInput, opts: ChartOptionHelperOptions): EChartsOption {
  if (!data || !Array.isArray(data.indicators)) throw new MissingChartFieldError('indicators', opts.language)
  if (!Array.isArray(data.series)) throw new MissingChartFieldError('series', opts.language)

  const skeleton = buildSkeleton(opts, data.series.map((s) => s.name))
  const palette = THEME_PALETTES[opts.theme]

  return applyTheme({
    ...skeleton,
    radar: {
      indicator: data.indicators,
      axisName: { color: palette.axisLabel },
      splitLine: { lineStyle: { color: palette.splitLine } },
    },
    series: [{
      type: 'radar',
      data: data.series.map((s) => ({ name: s.name, value: s.values })),
    }],
  }, opts.theme)
}
