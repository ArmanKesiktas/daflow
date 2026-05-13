import { forwardRef, useEffect, useRef, useState } from 'react'
import { useParams } from 'react-router-dom'
import { reportsApi } from '../api/executions'
import { publishApi } from '../api/platform'
import type { ReportDetail, ReportSection } from '../types/workflow'
import toast from 'react-hot-toast'
import { useI18n } from '../i18n'
import { PageHeader } from '../components/ui'

// ── Simple inline Markdown renderer ──────────────────────────────────────────
function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-[13px] font-semibold text-[var(--color-text-primary)] mt-5 mb-2 first:mt-0">
          {renderInline(line.slice(3))}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-[12px] font-semibold text-[var(--color-text-primary)] mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h4>
      )
    } else if (line.match(/^(\d+)\. /)) {
      // Numbered list — collect consecutive numbered lines
      const listItems: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^(\d+)\. /)) {
        const m = lines[i].match(/^(\d+)\. (.*)/)!
        listItems.push(
          <li key={i} className="flex gap-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[var(--color-border-default)] text-[var(--color-text-secondary)] text-[10px] font-semibold flex items-center justify-center mt-0.5">
              {m[1]}
            </span>
            <span>{renderInline(m[2])}</span>
          </li>
        )
        i++
      }
      elements.push(<ol key={`ol-${i}`} className="space-y-2 my-2">{listItems}</ol>)
      continue
    } else if (line.startsWith('- ') || line.startsWith('* ')) {
      // Bullet list — collect consecutive bullet lines
      const listItems: React.ReactNode[] = []
      while (i < lines.length && (lines[i].startsWith('- ') || lines[i].startsWith('* '))) {
        listItems.push(
          <li key={i} className="flex gap-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[var(--color-text-muted)] mt-2" />
            <span>{renderInline(lines[i].slice(2))}</span>
          </li>
        )
        i++
      }
      elements.push(<ul key={`ul-${i}`} className="space-y-1.5 my-2">{listItems}</ul>)
      continue
    } else if (line.trim() === '') {
      // skip blank lines between sections (handled by spacing above)
    } else {
      elements.push(
        <p key={i} className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
          {renderInline(line)}
        </p>
      )
    }
    i++
  }

  return <div className="space-y-1">{elements}</div>
}

function renderInline(text: string): React.ReactNode {
  // Handle **bold** and *italic*
  const parts = text.split(/(\*\*[^*]+\*\*|\*[^*]+\*)/g)
  return parts.map((part, i) => {
    if (part.startsWith('**') && part.endsWith('**')) {
      return <strong key={i} className="font-semibold text-[var(--color-text-primary)]">{part.slice(2, -2)}</strong>
    }
    if (part.startsWith('*') && part.endsWith('*')) {
      return <em key={i}>{part.slice(1, -1)}</em>
    }
    return part
  })
}

// ── Section labels / icons map ────────────────────────────────────────────────
const SECTION_META: Record<string, { icon: string; label_en: string; label_tr: string }> = {
  statistics:           { icon: '∑', label_en: 'Descriptive Statistics', label_tr: 'Betimsel İstatistikler' },
  missing_value:        { icon: '⊘', label_en: 'Missing Values',         label_tr: 'Eksik Değerler' },
  duplicate_detection:  { icon: '⊡', label_en: 'Duplicate Detection',    label_tr: 'Tekrar Eden Satırlar' },
  column_type_detection:{ icon: '≡', label_en: 'Column Types',           label_tr: 'Sütun Tipleri' },
  anomaly_detection:    { icon: '△', label_en: 'Anomaly Detection',       label_tr: 'Anomali Tespiti' },
  correlation:          { icon: 'ρ', label_en: 'Correlations',            label_tr: 'Korelasyonlar' },
  distribution:         { icon: '∿', label_en: 'Distributions',           label_tr: 'Dağılımlar' },
  chunk_processing:     { icon: '▤', label_en: 'Chunk Processing',        label_tr: 'Chunk Processing' },
  mapreduce_aggregation:{ icon: 'Σ', label_en: 'MapReduce Aggregation',   label_tr: 'MapReduce Aggregation' },
  spark_groupby:        { icon: 'S', label_en: 'Spark-like GroupBy',      label_tr: 'Spark-like GroupBy' },
  large_dataset_profiler:{ icon: 'LP', label_en: 'Large Dataset Profiler', label_tr: 'Large Dataset Profiler' },
  ai_insights:          { icon: '✦', label_en: 'AI Insights',             label_tr: 'Yapay Zeka Analizi' },
}

// ── ContentRow — sidebar navigation item ──────────────────────────────────────
function ContentRow({
  active,
  hidden,
  icon,
  label,
  onScroll,
  onToggle,
}: {
  active: boolean
  hidden: boolean
  icon: string
  label: string
  onScroll: () => void
  onToggle: () => void
}) {
  return (
    <div
      className={[
        'group flex items-center gap-2 px-2 py-1.5 rounded-lg cursor-pointer transition-colors',
        active ? 'bg-[var(--color-border-default)] text-[var(--color-text-primary)]' : 'text-[var(--color-text-secondary)] hover:bg-[var(--color-border-subtle)]',
        hidden ? 'opacity-40' : '',
      ].join(' ')}
      onClick={onScroll}
    >
      <span className="text-[11px] w-5 text-center flex-shrink-0">{icon}</span>
      <span className="text-[11px] truncate flex-1">{label}</span>
      <button
        onClick={(e) => { e.stopPropagation(); onToggle() }}
        className="opacity-0 group-hover:opacity-100 w-4 h-4 flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] transition-opacity"
        aria-label={hidden ? 'Show section' : 'Hide section'}
      >
        <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none">
          {hidden ? (
            <path d="M5 2v6M2 5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          ) : (
            <path d="M2 5h6" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" />
          )}
        </svg>
      </button>
    </div>
  )
}

// ── SectionCard — card wrapper for report sections ────────────────────────────
const SectionCard = forwardRef<HTMLDivElement, {
  id: string
  icon: string
  title: string
  badge?: string
  children: React.ReactNode
}>(({ id, icon, title, badge, children }, ref) => (
  <div
    id={id}
    ref={ref}
    className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm overflow-hidden"
  >
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
      <span className="w-7 h-7 rounded-lg bg-[var(--color-border-subtle)] flex items-center justify-center text-[14px] text-[var(--color-text-muted)] flex-shrink-0">
        {icon}
      </span>
      <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] flex-1">
        {title}
      </h2>
      {badge && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]">
          {badge}
        </span>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
))
SectionCard.displayName = 'SectionCard'

// ── MetadataGrid — key/value grid for dataset info ────────────────────────────
function MetadataGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) => v != null)
  if (entries.length === 0) return null
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 gap-3">
      {entries.map(([key, value]) => (
        <div key={key} className="rounded-lg border border-[var(--color-border-default)] bg-[var(--color-bg-page)] p-3">
          <p className="text-[10px] uppercase tracking-[0.16em] text-[var(--color-text-muted)]">
            {key.replace(/_/g, ' ')}
          </p>
          <p className="text-[13px] font-medium text-[var(--color-text-primary)] mt-1 truncate">
            {typeof value === 'number' ? value.toLocaleString() : String(value)}
          </p>
        </div>
      ))}
    </div>
  )
}

// ── SectionContent — renders section data based on type ───────────────────────
function SectionContent({ section, lang }: { section: ReportSection; lang: string }) {
  // Prefer string content (markdown), fall back to data object
  if (section.content) {
    return <MarkdownBlock content={section.content} />
  }

  const data = section.data
  if (!data || Object.keys(data).length === 0) {
    return <p className="text-[12px] text-[var(--color-text-muted)]">{lang === 'tr' ? 'Veri yok.' : 'No data.'}</p>
  }

  // Check if data has a "rows" or "results" array for table rendering
  const tableKey = Object.keys(data).find((k) => Array.isArray(data[k]) && (data[k] as unknown[]).length > 0 && typeof (data[k] as unknown[])[0] === 'object')
  if (tableKey) {
    const rows = data[tableKey] as Record<string, unknown>[]
    const keys = Object.keys(rows[0])
    return (
      <div className="overflow-auto max-h-[400px] rounded-lg border border-[var(--color-border-subtle)]">
        <table className="w-full text-left text-[12px]">
          <thead className="sticky top-0 bg-[var(--color-bg-page)]">
            <tr>
              {keys.map((k) => (
                <th key={k} className="px-3 py-2 font-medium whitespace-nowrap text-[var(--color-text-primary)] border-b border-[var(--color-border-subtle)]">
                  {k.replace(/_/g, ' ')}
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {rows.map((row, idx) => (
              <tr key={idx} className="border-t border-[var(--color-border-subtle)]">
                {keys.map((k) => (
                  <td key={k} className="px-3 py-2 text-[var(--color-text-secondary)] whitespace-nowrap">
                    {String(row[k] ?? '')}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    )
  }

  // Object content → key/value pairs
  return <MetadataGrid data={data} />
}


// ── Main component ────────────────────────────────────────────────────────────
export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [hiddenSectionIds, setHiddenSectionIds] = useState<string[]>([])
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const [exportAllowed, setExportAllowed] = useState(true)
  const [publishUrl, setPublishUrl] = useState('')
  const { lang } = useI18n()
  const sectionRefs = useRef<Record<string, HTMLDivElement | null>>({})

  useEffect(() => {
    if (!reportId) return
    reportsApi.getJson(reportId)
      .then((data) => {
        setReport(data)
        // Pre-load persisted AI insights if present
        const aiSec = (data?.sections ?? []).find(
          (s: { section_type: string }) => s.section_type === 'ai_insights'
        )
        if (aiSec?.content) setAiInsights(aiSec.content as string)
        reportsApi.getExportPermission(reportId)
          .then((result) => setExportAllowed(result.allowed))
          .catch(() => setExportAllowed(false))
      })
      .catch(() => toast.error('Failed to load report'))
      .finally(() => setLoading(false))
  }, [reportId])

  // Intersection observer for active sidebar item
  useEffect(() => {
    if (!report) return
    const observer = new IntersectionObserver(
      (entries) => {
        const visible = entries.find((e) => e.isIntersecting)
        if (visible) setActiveSectionId(visible.target.id)
      },
      { rootMargin: '-20% 0px -70% 0px' }
    )
    Object.values(sectionRefs.current).forEach((el) => el && observer.observe(el))
    return () => observer.disconnect()
  }, [report])

  const scrollTo = (id: string) => {
    ;(sectionRefs.current[id] ?? document.getElementById(id))?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePublish = async () => {
    if (!reportId) return
    try {
      const link = await publishApi.report(reportId, { enabled: true, allow_export: false })
      const url = `${window.location.origin}${link.url}`
      setPublishUrl(url)
      await navigator.clipboard?.writeText(url)
      toast.success(lang === 'tr' ? 'Yayın linki kopyalandı.' : 'Publish link copied.')
    } catch {
      toast.error(lang === 'tr' ? 'Yayın linki oluşturulamadı.' : 'Publish link could not be created.')
    }
  }

  const handlePrint = () => {
    if (!exportAllowed) {
      toast.error('You do not have permission to perform this action.')
      return
    }
    window.print()
  }

  const handleAiInsights = async () => {
    if (!reportId || aiLoading) return
    setAiLoading(true)
    try {
      const language = lang === 'tr' ? 'tr' : 'en'
      const result = await reportsApi.getAiInsights(reportId, language)
      setAiInsights(result.insights)
      // Scroll to end of sidebar (where the AI section appears)
      setTimeout(() => {
        const el = document.getElementById('ai-insights-inline')
        el?.scrollIntoView({ behavior: 'smooth', block: 'start' })
      }, 100)
    } catch {
      toast.error(t('AI request failed', 'Yapay zeka isteği başarısız'))
    } finally {
      setAiLoading(false)
    }
  }

  const sectionId = (sec: ReportSection, i: number) =>
    `section-${sec.section_type}-${i}`

  const isSectionHidden = (id: string) => hiddenSectionIds.includes(id)

  const toggleSection = (id: string) => {
    setHiddenSectionIds((current) =>
      current.includes(id) ? current.filter((item) => item !== id) : [...current, id],
    )
  }

  const sectionLabel = (sec: ReportSection, lang: string) => {
    const meta = SECTION_META[sec.section_type]
    if (!meta) return sec.node_label ?? sec.section_type.replace(/_/g, ' ')
    return lang === 'tr' ? meta.label_tr : meta.label_en
  }

  const detectedLang = lang === 'tr' ? 'tr' : 'en'

  const t = (en: string, tr: string) => detectedLang === 'tr' ? tr : en

  if (loading) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-[var(--color-border-default)] border-t-[var(--color-text-secondary)] animate-spin" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[var(--color-bg-page)] flex items-center justify-center">
        <p className="text-[14px] text-[var(--color-text-muted)]">Report not found.</p>
      </div>
    )
  }

  const sections = report.sections ?? []
  const meta = report.metadata ?? {}

  return (
    <div className="report-print-root min-h-screen bg-[var(--color-bg-page)] text-[var(--color-text-primary)]">
      <div className="report-print-brand" aria-label="Made by Daflow">
        <img src="/brand/daflow-mark-blue.png" alt="" />
        <span>{t('Made by Daflow', 'Daflow ile üretildi')}</span>
      </div>

      {/* ── Page Header with back-navigation ──────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 pt-6 print:hidden">
        <PageHeader
          title={report.title}
          backTo="/reports"
          actions={
            <div className="flex items-center gap-2">
              <button
                onClick={handlePublish}
                className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] px-3 py-1.5 rounded-lg transition-colors"
              >
                {t('Publish', 'Yayınla')}
              </button>
              <button
                onClick={handlePrint}
                disabled={!exportAllowed}
                aria-label={lang === 'tr' ? 'Raporu yazdır' : 'Print report'}
                className="flex items-center gap-1.5 text-[12px] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] px-3 py-1.5 rounded-lg transition-colors disabled:opacity-45 disabled:cursor-not-allowed"
              >
                <svg width="14" height="14" viewBox="0 0 16 16" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4V9z" />
                </svg>
                {t('Print', 'Yazdır')}
              </button>
            </div>
          }
        />
      </div>

      {publishUrl && (
        <div className="dropdown-popover dropdown-popover-right fixed right-4 top-14 z-[60] max-w-sm rounded-lg border border-[var(--color-border-default)] bg-surface shadow-xl p-3 print:hidden">
          <p className="text-[12px] font-semibold text-[var(--color-text-primary)]">{t('Published report', 'Rapor yayınlandı')}</p>
          <p className="text-[11px] text-[var(--color-text-muted)] truncate mt-1">{publishUrl}</p>
        </div>
      )}

      {/* ── Report hero banner ────────────────────────────────────── */}
      <div className="report-hero bg-surface border-b border-[var(--color-border-default)] px-8 py-7">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-medium text-[var(--color-text-muted)] uppercase tracking-widest mb-2">
            {t('Data Analysis Report', 'Veri Analizi Raporu')}
          </p>
          <h1 className="text-xl font-bold tracking-tight text-[var(--color-text-primary)] mb-3">{report.title}</h1>
          <div className="flex flex-wrap gap-4 text-[12px] text-[var(--color-text-muted)]">
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 1 1 1.5 8 6.507 6.507 0 0 1 8 1.5zm0 3v3.75l2.5 1.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {new Date(report.generated_at).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.8"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
              {report.workflow_name}
            </span>
            {meta.filename != null && (
              <span className="flex items-center gap-1.5">
                <svg className="w-3.5 h-3.5" viewBox="0 0 16 16" fill="none"><path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" stroke="currentColor" strokeWidth="1.8"/><path d="M9 1.5V6h4.5" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/></svg>
                {String(meta.filename)}
              </span>
            )}
            {meta.row_count != null && (
              <span>{Number(meta.row_count).toLocaleString()} {t('rows', 'satır')} × {Number(meta.column_count ?? 0)} {t('columns', 'sütun')}</span>
            )}
          </div>
        </div>
      </div>

      {/* ── Two-column layout ─────────────────────────────────────── */}
      <div className="max-w-5xl mx-auto px-6 py-8 flex gap-6">

        {/* Sidebar — Contents */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="sticky top-16">
            <p className="text-[10px] font-semibold text-[var(--color-text-muted)] uppercase tracking-widest mb-3 px-1">
              {t('Contents', 'İçindekiler')}
            </p>
            <nav className="space-y-0.5">
              {/* Metadata as first item */}
              <ContentRow
                active={activeSectionId === 'section-metadata'}
                hidden={isSectionHidden('section-metadata')}
                icon="⊙"
                label={t('Dataset Info', 'Veri Seti')}
                onScroll={() => scrollTo('section-metadata')}
                onToggle={() => toggleSection('section-metadata')}
              />
              {sections.map((sec, i) => {
                const id = sectionId(sec, i)
                const secMeta = SECTION_META[sec.section_type]
                const icon = secMeta?.icon ?? '○'
                const label = sectionLabel(sec, detectedLang)
                return (
                  <ContentRow
                    key={id}
                    active={activeSectionId === id}
                    hidden={isSectionHidden(id)}
                    icon={icon}
                    label={label}
                    onScroll={() => scrollTo(id)}
                    onToggle={() => toggleSection(id)}
                  />
                )
              })}
              {aiInsights && (
                <ContentRow
                  active={activeSectionId === 'ai-insights-inline'}
                  hidden={isSectionHidden('ai-insights-inline')}
                  icon="✦"
                  label={t('AI Insights', 'Yapay Zeka Analizi')}
                  onScroll={() => scrollTo('ai-insights-inline')}
                  onToggle={() => toggleSection('ai-insights-inline')}
                />
              )}
            </nav>

            {/* AI Insights button */}
            <div className="mt-4 pt-3 border-t border-[var(--color-border-subtle)]">
              <button
                onClick={handleAiInsights}
                disabled={aiLoading}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[12px] font-medium bg-[var(--color-border-subtle)] text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[var(--color-border-default)] border-t-[var(--color-text-secondary)] animate-spin flex-shrink-0" />
                ) : (
                  <span className="text-[14px]">✦</span>
                )}
                {aiLoading
                  ? t('Analysing...', 'Analiz ediliyor...')
                  : aiInsights
                  ? t('Regenerate', 'Yeniden Üret')
                  : t('AI Insights', 'Yapay Zeka Analizi')}
              </button>
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 min-w-0 space-y-6">

          {/* Dataset Info section */}
          {Object.keys(meta).length > 0 && !isSectionHidden('section-metadata') && (
            <SectionCard
              id="section-metadata"
              icon="⊙"
              title={t('Dataset Info', 'Veri Seti Bilgisi')}
              ref={(el: HTMLDivElement | null) => { sectionRefs.current['section-metadata'] = el }}
            >
              <MetadataGrid data={meta} />
            </SectionCard>
          )}

          {/* Analysis sections */}
          {sections.map((sec, i) => {
            const id = sectionId(sec, i)
            if (isSectionHidden(id)) return null
            const secMeta = SECTION_META[sec.section_type]
            const icon = secMeta?.icon ?? '○'
            const label = sectionLabel(sec, detectedLang)
            return (
              <SectionCard
                key={id}
                id={id}
                icon={icon}
                title={label}
                ref={(el: HTMLDivElement | null) => { sectionRefs.current[id] = el }}
                badge={sec.section_type === 'ai_insights' ? 'AI' : undefined}
              >
                <SectionContent section={sec} lang={detectedLang} />
              </SectionCard>
            )
          })}

          {sections.length === 0 && (
            <div className="text-center py-20 text-[13px] text-[var(--color-text-muted)]">
              {t('No analysis sections in this report.', 'Bu raporda analiz bölümü bulunmuyor.')}
            </div>
          )}

          {/* Inline AI Insights panel */}
          {aiInsights && !isSectionHidden('ai-insights-inline') && (
            <div
              id="ai-insights-inline"
              className="rounded-lg border border-[var(--color-border-default)] bg-surface shadow-sm overflow-hidden"
            >
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[var(--color-border-subtle)]">
                <span className="w-7 h-7 rounded-lg bg-[var(--color-border-subtle)] flex items-center justify-center text-[14px] text-[var(--color-text-muted)] flex-shrink-0">✦</span>
                <h2 className="text-[13px] font-semibold text-[var(--color-text-primary)] flex-1">
                  {t('AI Insights', 'Yapay Zeka Analizi')}
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[var(--color-border-subtle)] text-[var(--color-text-muted)]">AI</span>
                <button
                  onClick={() => setAiInsights(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)] hover:bg-[var(--color-border-default)] transition-all"
                  aria-label="Close insights"
                >
                  <svg className="w-3.5 h-3.5" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round"/>
                  </svg>
                </button>
              </div>
              <div className="p-5">
                <MarkdownBlock content={aiInsights} />
              </div>
            </div>
          )}
        </main>
      </div>
    </div>
  )
}
