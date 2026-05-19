/**
 * DashboardDefinition Round-Trip Serializer.
 *
 * Pure module: no React, no DOM imports.
 *
 * Canonical persistence path for DashboardDefinition values written to and read
 * from storage. Anywhere the dashboard is written or read, it goes through these
 * two functions.
 *
 * Feature: echarts-dashboard-architecture
 */

import type { DashboardDefinition } from './dashboardSchema'
import { validateDashboardDefinition, type ValidationError } from './dashboardValidator'

// ── Result Types ────────────────────────────────────────────────────────────

export interface ParseSyntaxError {
  kind: 'syntax'
  /** Index in the input string where the syntax error was detected. */
  position: number
  message: string
}

export type ParseResult =
  | { ok: true; value: DashboardDefinition; deprecatedChartIds: string[] }
  | { ok: false; error: ParseSyntaxError | ValidationError[] }

// ── Serialize ───────────────────────────────────────────────────────────────

/** Serialize a DashboardDefinition to a JSON string. */
export function serializeDashboardDefinition(def: DashboardDefinition): string {
  return JSON.stringify(def)
}

// ── Parse ───────────────────────────────────────────────────────────────────

/**
 * Parse a JSON string into a DashboardDefinition.
 *
 * - Returns { ok: false, error: { kind: 'syntax', ... } } when the string is not valid JSON.
 * - Returns { ok: false, error: ValidationError[] } when the JSON parses but the schema is invalid.
 * - Returns { ok: true, value, deprecatedChartIds } when the JSON parses and validates.
 */
export function parseDashboardDefinition(json: string): ParseResult {
  let parsed: unknown
  try {
    parsed = JSON.parse(json)
  } catch (err) {
    const message = err instanceof Error ? err.message : 'Invalid JSON'
    // Best-effort position extraction from V8/SpiderMonkey error messages
    const match = /position (\d+)/i.exec(message)
    const position = match ? parseInt(match[1], 10) : 0
    return {
      ok: false,
      error: { kind: 'syntax', position, message },
    }
  }

  const result = validateDashboardDefinition(parsed)
  if (!result.valid) {
    return { ok: false, error: result.errors }
  }
  return { ok: true, value: result.value, deprecatedChartIds: result.deprecatedChartIds }
}
