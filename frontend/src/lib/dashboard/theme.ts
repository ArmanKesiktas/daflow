/**
 * Theme palettes and theme application for ECharts options.
 *
 * Pure module: no React, no DOM imports.
 * Idempotent: applyTheme(applyTheme(o, t), t) is deep-equal to applyTheme(o, t).
 *
 * Feature: echarts-dashboard-architecture
 */

import type { EChartsOption, ThemeMode } from './dashboardSchema'

// ── Palette Shape ───────────────────────────────────────────────────────────

export interface ChartPalette {
  background: string
  axisLabel: string
  splitLine: string
  tooltipBackground: string
  tooltipBorder: string
  tooltipText: string
  series: readonly string[]
}

// ── Light Palette ───────────────────────────────────────────────────────────

export const LIGHT_PALETTE: ChartPalette = {
  background: '#FFFFFF',
  axisLabel: '#1F2937',
  splitLine: '#E5E7EB',
  tooltipBackground: '#FFFFFF',
  tooltipBorder: '#E5E7EB',
  tooltipText: '#1F2937',
  series: [
    '#0071E3',
    '#34C759',
    '#BF5AF2',
    '#F5A623',
    '#FF453A',
    '#5AC8FA',
    '#FFD60A',
    '#30D158',
  ],
}

// ── Dark Palette ────────────────────────────────────────────────────────────

export const DARK_PALETTE: ChartPalette = {
  background: '#0B1020',
  axisLabel: '#E5E7EB',
  splitLine: '#1F2937',
  tooltipBackground: '#111827',
  tooltipBorder: '#374151',
  tooltipText: '#E5E7EB',
  series: [
    '#0A84FF',
    '#30D158',
    '#BF5AF2',
    '#FF9F0A',
    '#FF453A',
    '#64D2FF',
    '#FFD60A',
    '#5E5CE6',
  ],
}

// ── Theme Lookup ────────────────────────────────────────────────────────────

export const THEME_PALETTES: Readonly<Record<ThemeMode, ChartPalette>> = {
  light: LIGHT_PALETTE,
  dark: DARK_PALETTE,
}

// ── applyTheme ──────────────────────────────────────────────────────────────

/**
 * Apply theme palette to an ECharts option.
 *
 * Sets backgroundColor, color (series palette), and textStyle.color from the selected palette.
 * Idempotent: running twice with the same theme yields a deep-equal option.
 */
export function applyTheme(option: EChartsOption, theme: ThemeMode): EChartsOption {
  const palette = THEME_PALETTES[theme]
  return {
    ...option,
    backgroundColor: palette.background,
    color: [...palette.series],
    textStyle: {
      ...((option.textStyle as Record<string, unknown>) ?? {}),
      color: palette.axisLabel,
    },
  }
}
