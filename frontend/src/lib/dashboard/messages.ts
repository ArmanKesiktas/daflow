/**
 * Localized strings for chart helpers, dashboard, and deprecation fallback.
 *
 * Pure module: no React, no DOM, no i18n hook imports.
 * Helpers and components import from here directly.
 *
 * Feature: echarts-dashboard-architecture
 */

import type { LanguageCode } from './dashboardSchema'

// ── Message Keys ────────────────────────────────────────────────────────────

export type MessageKey =
  // Axis & legend defaults
  | 'value'
  | 'category'
  | 'count'
  | 'percentage'
  // Tooltip headings
  | 'tooltip_value'
  | 'tooltip_total'
  // Empty / error states
  | 'empty_chart'
  | 'render_error'
  // Deprecation fallback
  | 'deprecation_title'
  | 'deprecation_unrecognized_library'
  | 'deprecation_missing_option'
  | 'deprecation_render_error'
  | 'deprecation_schema_error'
  | 'deprecation_chart_id_label'
  // Helper errors
  | 'missing_field_error'

// ── Messages Map ────────────────────────────────────────────────────────────

export const messages: Record<LanguageCode, Record<MessageKey, string>> = {
  en: {
    value: 'Value',
    category: 'Category',
    count: 'Count',
    percentage: 'Percentage',
    tooltip_value: 'Value',
    tooltip_total: 'Total',
    empty_chart: 'No data to display',
    render_error: 'Chart could not be rendered',
    deprecation_title: 'Chart format deprecated',
    deprecation_unrecognized_library: 'This chart uses a legacy format and is no longer rendered. Re-run the workflow to upgrade.',
    deprecation_missing_option: 'This chart is missing its rendering option. Re-run the workflow to regenerate it.',
    deprecation_render_error: 'This chart failed to render. Other charts on the dashboard remain available.',
    deprecation_schema_error: 'This chart entry does not match the dashboard schema and was skipped.',
    deprecation_chart_id_label: 'Chart ID',
    missing_field_error: 'Missing required field',
  },
  tr: {
    value: 'Değer',
    category: 'Kategori',
    count: 'Adet',
    percentage: 'Yüzde',
    tooltip_value: 'Değer',
    tooltip_total: 'Toplam',
    empty_chart: 'Görüntülenecek veri yok',
    render_error: 'Grafik oluşturulamadı',
    deprecation_title: 'Grafik formatı eskimiş',
    deprecation_unrecognized_library: 'Bu grafik eski bir format kullanıyor ve artık çizilmiyor. Workflow\'u yeniden çalıştırarak güncelleyin.',
    deprecation_missing_option: 'Bu grafiğin çizim verisi eksik. Workflow\'u yeniden çalıştırarak yeniden üretin.',
    deprecation_render_error: 'Bu grafik çizilemedi. Dashboard\'daki diğer grafikler kullanılabilir durumda.',
    deprecation_schema_error: 'Bu grafik girdisi dashboard şemasına uymuyor ve atlandı.',
    deprecation_chart_id_label: 'Grafik ID',
    missing_field_error: 'Zorunlu alan eksik',
  },
}

// ── Accessor ────────────────────────────────────────────────────────────────

/** Returns a string for the given language and key. Never returns undefined for known keys. */
export function getMessage(language: LanguageCode, key: MessageKey): string {
  return messages[language][key]
}
