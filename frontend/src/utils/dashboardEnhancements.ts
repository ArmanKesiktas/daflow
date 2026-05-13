export type DashboardLang = 'en' | 'tr'

export type FilterType = 'multi_select' | 'range' | 'date_range' | 'boolean'

export interface DashboardColumnMeta {
  name: string
  dtype?: string
  semantic_type?: 'numeric' | 'categorical' | 'text' | 'datetime' | 'boolean' | string
  unique_count?: number
  missing_count?: number
}

export interface DashboardFilterDefinition {
  column: string
  label: string
  type: FilterType
}

export interface DashboardFilterState {
  selected?: string[]
  min?: number
  max?: number
  start?: string
  end?: string
  bool?: 'true' | 'false' | ''
}

export interface DashboardPanelLayout {
  x: number
  y: number
  w: number
  h: number
}

export interface EnhancedPanel {
  id?: string
  type: string
  title: string
  description?: string
  layout?: DashboardPanelLayout
  data?: Record<string, unknown>
  kpis?: { label: string; value: number | string }[]
  stats?: { label: string; value: number | string }[]
  strong_pairs?: { col_a: string; col_b: string; correlation: number; direction: string }[]
  column?: string
  skewness?: number
  kurtosis?: number
  skewness_label?: string
}

export interface DashboardPageModel {
  pageNumber: number
  title: string
  charts: EnhancedPanel[]
}

export interface DashboardSourceData {
  records?: Record<string, unknown>[]
  columns?: DashboardColumnMeta[]
  row_count?: number
  sampled_rows?: number
}

const TR_METRIC: Record<string, string> = {
  mean: 'Ortalama',
  std: 'Standart Sapma',
  skewness: 'Çarpıklık',
  count: 'Sayı',
  min: 'Minimum',
  max: 'Maksimum',
  sales: 'Satış',
  revenue: 'Gelir',
  category: 'Kategori',
  date: 'Tarih',
  month: 'Ay',
}

const EN_METRIC: Record<string, string> = {
  mean: 'Mean',
  std: 'Std Dev',
  skewness: 'Skewness',
  count: 'Count',
  min: 'Minimum',
  max: 'Maximum',
}

export function inferFilterDefinitions(source?: DashboardSourceData): DashboardFilterDefinition[] {
  return (source?.columns ?? []).map((column) => {
    const semantic = column.semantic_type
    const type: FilterType =
      semantic === 'numeric' ? 'range' :
      semantic === 'datetime' ? 'date_range' :
      semantic === 'boolean' ? 'boolean' :
      'multi_select'
    return { column: column.name, label: humanLabel(column.name, 'tr'), type }
  })
}

export function humanLabel(value: string, lang: DashboardLang) {
  const cleaned = value.replace(/[_-]+/g, ' ').replace(/\s+/g, ' ').trim()
  const words = cleaned.split(' ').filter(Boolean)
  return words.map((word) => {
    const key = word.toLowerCase()
    const mapped = lang === 'tr' ? TR_METRIC[key] : EN_METRIC[key]
    return mapped ?? word.charAt(0).toUpperCase() + word.slice(1)
  }).join(' ')
}

export function professionalTitle(panel: EnhancedPanel, lang: DashboardLang) {
  const raw = panel.title || panel.type
  const normalized = raw.replace(/[%()]/g, '').replace(/[:]+/g, ' ').trim()
  const lower = normalized.toLowerCase()
  if (lang === 'tr') {
    if (panel.type === 'histogram') return `${humanLabel(panel.column || normalized.replace(/^distribution\s*/i, ''), 'tr')} Dağılımı`
    if (panel.type === 'heatmap') return 'Korelasyon Matrisi'
    if (panel.type === 'donut_chart' || panel.type === 'pie_chart') return lower.includes('column') ? 'Sütun Tipi Dağılımı' : `${humanLabel(normalized, 'tr')} Dağılımı`
    if (panel.type === 'bar_chart' && lower.includes('missing')) return 'Sütunlara Göre Eksik Veri Oranı'
    if (panel.type === 'stat_card' && lower.includes('duplicate')) return 'Tekrar Eden Kayıt Özeti'
    if (panel.type === 'stat_card' && lower.includes('anomaly')) return 'Anomali Tespiti Özeti'
    if (panel.type === 'kpi_card' || panel.type === 'kpi_grid') return 'Temel Performans Göstergeleri'
  }
  if (panel.type === 'histogram') return `${humanLabel(panel.column || normalized.replace(/^distribution\s*/i, ''), 'en')} Distribution`
  if (panel.type === 'heatmap') return 'Correlation Matrix'
  if (panel.type === 'donut_chart' || panel.type === 'pie_chart') return lower.includes('column') ? 'Column Type Distribution' : `${humanLabel(normalized, 'en')} Distribution`
  if (panel.type === 'bar_chart' && lower.includes('missing')) return 'Missing Data Rate by Column'
  if (panel.type === 'stat_card' && lower.includes('duplicate')) return 'Duplicate Records Summary'
  if (panel.type === 'stat_card' && lower.includes('anomaly')) return 'Anomaly Detection Summary'
  if (panel.type === 'kpi_card' || panel.type === 'kpi_grid') return 'Key Performance Indicators'
  return humanLabel(normalized, lang)
}

export function professionalDescription(panel: EnhancedPanel, lang: DashboardLang) {
  if (panel.description && !panel.description.toLowerCase().includes('generated from workflow')) {
    return panel.description
  }
  const tr = {
    histogram: 'Seçili veri üzerinde değerlerin dağılımını ve yoğunluk bölgelerini gösterir.',
    heatmap: 'Sayısal kolonlar arasındaki ilişkinin gücünü karşılaştırır.',
    donut_chart: 'Kategorilerin toplam içindeki payını özetler.',
    bar_chart: 'Kolonlar veya kategoriler arasındaki farkları karşılaştırır.',
    kpi_card: 'Tek bir önemli metriği hızlı karar vermek için öne çıkarır.',
    kpi_grid: 'Filtrelenmiş veri için temel metrikleri hızlıca özetler.',
    stat_card: 'Önemli sonuçları ve sayısal özetleri sunuma uygun şekilde gösterir.',
  } as Record<string, string>
  const en = {
    histogram: 'Shows the distribution and concentration of values in the selected data.',
    heatmap: 'Compares relationship strength between numeric columns.',
    donut_chart: 'Summarizes category share within the total.',
    bar_chart: 'Compares differences across columns or categories.',
    kpi_card: 'Highlights one important metric for quick decisions.',
    kpi_grid: 'Summarizes key metrics for the filtered dataset.',
    stat_card: 'Presents important findings and numeric summaries for review.',
  } as Record<string, string>
  return (lang === 'tr' ? tr : en)[panel.type] ?? (lang === 'tr' ? 'Workflow sonuçlarından oluşturulan grafik.' : 'Chart generated from workflow results.')
}

export function applyFilters(records: Record<string, unknown>[], filters: Record<string, DashboardFilterState>) {
  const active = Object.entries(filters).filter(([, state]) => hasFilterValue(state))
  if (active.length === 0) return records
  return records.filter((row) => active.every(([column, state]) => matchesFilter(row[column], state)))
}

export function hasFilterValue(state?: DashboardFilterState) {
  return Boolean(
    state &&
    ((state.selected?.length ?? 0) > 0 || state.min != null || state.max != null || state.start || state.end || state.bool)
  )
}

function matchesFilter(value: unknown, state: DashboardFilterState) {
  if ((state.selected?.length ?? 0) > 0) return state.selected!.includes(String(value))
  if (state.min != null || state.max != null) {
    const n = Number(value)
    if (Number.isNaN(n)) return false
    if (state.min != null && n < state.min) return false
    if (state.max != null && n > state.max) return false
  }
  if (state.start || state.end) {
    const time = new Date(String(value)).getTime()
    if (Number.isNaN(time)) return false
    if (state.start && time < new Date(state.start).getTime()) return false
    if (state.end && time > new Date(state.end).getTime()) return false
  }
  if (state.bool) return String(value).toLowerCase() === state.bool
  return true
}

export function uniqueValues(records: Record<string, unknown>[], column: string) {
  return [...new Set(records.map((row) => row[column]).filter((value) => value != null).map(String))]
    .sort((a, b) => a.localeCompare(b))
    .slice(0, 80)
}

export function numericExtent(records: Record<string, unknown>[], column: string) {
  let min = Number.POSITIVE_INFINITY
  let max = Number.NEGATIVE_INFINITY
  for (const row of records) {
    const n = Number(row[column])
    if (Number.isNaN(n)) continue
    min = Math.min(min, n)
    max = Math.max(max, n)
  }
  return Number.isFinite(min) ? { min, max } : null
}

export function enhancePanelForRows(panel: EnhancedPanel, records: Record<string, unknown>[], columns: DashboardColumnMeta[], lang: DashboardLang): EnhancedPanel {
  if (records.length === 0) return panel
  if (panel.type === 'kpi_grid') return buildKpiPanel(panel, records, columns, lang)
  if (panel.type === 'histogram') return buildHistogramPanel(panel, records, columns, lang)
  if (panel.type === 'donut_chart' || panel.type === 'pie_chart') return buildDonutPanel(panel, records, columns, lang)
  if (panel.type === 'bar_chart' && panel.title.toLowerCase().includes('missing')) return buildMissingPanel(panel, records, columns, lang)
  return panel
}

function numericColumns(columns: DashboardColumnMeta[]) {
  return columns.filter((column) => column.semantic_type === 'numeric').map((column) => column.name)
}

function categoricalColumns(columns: DashboardColumnMeta[]) {
  return columns.filter((column) => column.semantic_type !== 'numeric' && column.semantic_type !== 'datetime').map((column) => column.name)
}

function buildKpiPanel(panel: EnhancedPanel, records: Record<string, unknown>[], columns: DashboardColumnMeta[], lang: DashboardLang): EnhancedPanel {
  const kpis = numericColumns(columns).slice(0, 4).flatMap((column) => {
    const values = records.map((row) => Number(row[column])).filter((value) => !Number.isNaN(value))
    if (values.length === 0) return []
    const sum = values.reduce((acc, value) => acc + value, 0)
    const mean = sum / values.length
    const min = Math.min(...values)
    return [
      { label: `${humanLabel(column, lang)} ${lang === 'tr' ? 'Ortalama' : 'Mean'}`, value: round(mean) },
      { label: `${humanLabel(column, lang)} ${lang === 'tr' ? 'Minimum' : 'Min'}`, value: round(min) },
    ]
  })
  return { ...panel, kpis: kpis.slice(0, 12) }
}

function buildHistogramPanel(panel: EnhancedPanel, records: Record<string, unknown>[], columns: DashboardColumnMeta[], lang: DashboardLang): EnhancedPanel {
  const column = panel.column || numericColumns(columns)[0]
  if (!column) return panel
  const values = records.map((row) => Number(row[column])).filter((value) => !Number.isNaN(value))
  if (values.length === 0) return panel
  const min = Math.min(...values)
  const max = Math.max(...values)
  const bins = 10
  const step = max === min ? 1 : (max - min) / bins
  const counts = Array.from({ length: bins }, () => 0)
  values.forEach((value) => {
    const idx = Math.min(bins - 1, Math.max(0, Math.floor((value - min) / step)))
    counts[idx] += 1
  })
  const labels = counts.map((_, index) => round(min + step * index).toString())
  return {
    ...panel,
    column,
    title: `${humanLabel(column, lang)} ${lang === 'tr' ? 'Dağılımı' : 'Distribution'}`,
    data: { labels, datasets: [{ label: humanLabel(column, lang), data: counts }] },
  }
}

function buildDonutPanel(panel: EnhancedPanel, records: Record<string, unknown>[], columns: DashboardColumnMeta[], lang: DashboardLang): EnhancedPanel {
  const column = categoricalColumns(columns)[0]
  if (!column) return panel
  const counts = new Map<string, number>()
  records.forEach((row) => {
    const key = String(row[column] ?? (lang === 'tr' ? 'Boş' : 'Empty'))
    counts.set(key, (counts.get(key) ?? 0) + 1)
  })
  const entries = [...counts.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  return {
    ...panel,
    title: `${humanLabel(column, lang)} ${lang === 'tr' ? 'Dağılımı' : 'Distribution'}`,
    data: { labels: entries.map(([key]) => key), datasets: [{ data: entries.map(([, count]) => count) }] },
  }
}

function buildMissingPanel(panel: EnhancedPanel, records: Record<string, unknown>[], columns: DashboardColumnMeta[], lang: DashboardLang): EnhancedPanel {
  const labels = columns.map((column) => humanLabel(column.name, lang))
  const data = columns.map((column) => {
    const missing = records.filter((row) => row[column.name] == null || row[column.name] === '').length
    return round((missing / Math.max(1, records.length)) * 100)
  })
  return { ...panel, data: { labels, datasets: [{ label: lang === 'tr' ? 'Eksik %' : 'Missing %', data }] } }
}

export function paginatePanels(panels: EnhancedPanel[]) {
  const pages: DashboardPageModel[] = []
  let current: EnhancedPanel[] = []
  let used = 0
  const maxRows = 9
  for (const panel of panels) {
    const rows = panel.layout?.h ?? 3
    if (current.length > 0 && used + rows > maxRows) {
      pages.push({ pageNumber: pages.length + 1, title: `Page ${pages.length + 1}`, charts: current })
      current = []
      used = 0
    }
    current.push(panel)
    used += rows
  }
  if (current.length > 0) pages.push({ pageNumber: pages.length + 1, title: `Page ${pages.length + 1}`, charts: current })
  return pages
}

function round(value: number) {
  return Number(value.toFixed(3))
}
