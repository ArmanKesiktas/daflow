import { useEffect, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { reportsApi } from '../api/executions'
import type { ReportDetail, ReportSection } from '../types/workflow'
import toast from 'react-hot-toast'
import { useTheme } from '../hooks/useTheme'
import { useI18n } from '../i18n'

// ── Simple inline Markdown renderer ──────────────────────────────────────────
function MarkdownBlock({ content }: { content: string }) {
  const lines = content.split('\n')
  const elements: React.ReactNode[] = []
  let i = 0

  while (i < lines.length) {
    const line = lines[i]

    if (line.startsWith('## ')) {
      elements.push(
        <h3 key={i} className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white mt-5 mb-2 first:mt-0">
          {renderInline(line.slice(3))}
        </h3>
      )
    } else if (line.startsWith('### ')) {
      elements.push(
        <h4 key={i} className="text-[12px] font-semibold text-[#1d1d1f]/80 dark:text-white/80 mt-4 mb-1.5">
          {renderInline(line.slice(4))}
        </h4>
      )
    } else if (line.match(/^(\d+)\. /)) {
      // Numbered list — collect consecutive numbered lines
      const listItems: React.ReactNode[] = []
      while (i < lines.length && lines[i].match(/^(\d+)\. /)) {
        const m = lines[i].match(/^(\d+)\. (.*)/)!
        listItems.push(
          <li key={i} className="flex gap-2 text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed">
            <span className="flex-shrink-0 w-5 h-5 rounded-full bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] text-[10px] font-semibold flex items-center justify-center mt-0.5">
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
          <li key={i} className="flex gap-2 text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed">
            <span className="flex-shrink-0 w-1.5 h-1.5 rounded-full bg-[#1d1d1f]/30 dark:bg-white/30 mt-2" />
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
        <p key={i} className="text-[12px] text-[#1d1d1f]/75 dark:text-white/75 leading-relaxed">
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
      return <strong key={i} className="font-semibold text-[#1d1d1f] dark:text-white">{part.slice(2, -2)}</strong>
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
  ai_insights:          { icon: '✦', label_en: 'AI Insights',             label_tr: 'Yapay Zeka Analizi' },
}

// ── Main component ────────────────────────────────────────────────────────────
export default function ReportDetailPage() {
  const { reportId } = useParams<{ reportId: string }>()
  const [report, setReport] = useState<ReportDetail | null>(null)
  const [loading, setLoading] = useState(true)
  const [downloading, setDownloading] = useState(false)
  const [activeSectionId, setActiveSectionId] = useState<string | null>(null)
  const [aiInsights, setAiInsights] = useState<string | null>(null)
  const [aiLoading, setAiLoading] = useState(false)
  const navigate = useNavigate()
  const { isDark, toggleTheme } = useTheme()
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
    sectionRefs.current[id]?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  const handlePrint = () => window.print()

  const handleAiInsights = async () => {
    if (!reportId || aiLoading) return
    setAiLoading(true)
    try {
      const language = detectedLang === 'tr' ? 'Turkish' : 'English'
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

  const sectionLabel = (sec: ReportSection, lang: string) => {
    const meta = SECTION_META[sec.section_type]
    if (!meta) return sec.node_label ?? sec.section_type.replace(/_/g, ' ')
    return lang === 'tr' ? meta.label_tr : meta.label_en
  }

  // Detect report language from AI insights content
  const detectedLang = (() => {
    const aiSec = report?.sections.find((s) => s.section_type === 'ai_insights')
    if (!aiSec?.content) return 'en'
    const turkishChars = /[şğüöıçŞĞÜÖİÇ]/
    return turkishChars.test(aiSec.content) ? 'tr' : 'en'
  })()

  const t = (en: string, tr: string) => detectedLang === 'tr' ? tr : en

  if (loading) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] flex items-center justify-center">
        <div className="w-6 h-6 rounded-full border-2 border-black/[0.08] dark:border-white/[0.08] border-t-black/50 dark:border-t-white/50 animate-spin" />
      </div>
    )
  }

  if (!report) {
    return (
      <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] flex items-center justify-center">
        <p className="text-[14px] text-[#1d1d1f]/40 dark:text-white/40">Report not found.</p>
      </div>
    )
  }

  const sections = report.sections ?? []
  const meta = report.metadata ?? {}

  return (
    <div className="min-h-screen bg-[#F5F5F7] dark:bg-[#111113] text-[#1d1d1f] dark:text-white">
      {/* ── Top nav ────────────────────────────────────────────────── */}
      <header className="sticky top-0 z-50 h-11 bg-[#F5F5F7]/95 dark:bg-[#111113]/95 backdrop-blur-xl border-b border-black/[0.07] dark:border-white/[0.07] flex items-center px-5 gap-2">
        <button
          onClick={() => navigate('/reports')}
          className="flex items-center gap-1.5 text-[13px] text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f]/90 dark:hover:text-white/90 transition-colors"
        >
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
            <path d="M9 11L5 7l4-4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('Reports', 'Raporlar')}
        </button>
        <span className="text-[#1d1d1f]/15 dark:text-white/15 text-[12px]">·</span>
        <span className="text-[13px] font-medium text-[#1d1d1f]/80 dark:text-white/80 truncate max-w-[260px]">{report.title}</span>
        <div className="flex-1" />

        {/* Print */}
        <button
          onClick={handlePrint}
          className="print:hidden flex items-center gap-1.5 text-[12px] bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] hover:bg-[#007AFF]/20 dark:hover:bg-[#0A84FF]/25 px-3 py-1.5 rounded-lg transition-colors"
        >
          <svg width="13" height="13" viewBox="0 0 16 16" fill="none">
            <path d="M4 6V2h8v4M4 12H3a1 1 0 0 1-1-1V7a1 1 0 0 1 1-1h10a1 1 0 0 1 1 1v4a1 1 0 0 1-1 1h-1M4 9h8v5H4V9z" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
          </svg>
          {t('Print', 'Yazdır')}
        </button>

        {/* Theme toggle */}
        <button
          onClick={toggleTheme}
          title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          className="w-7 h-7 rounded-lg flex items-center justify-center text-[#1d1d1f]/40 dark:text-white/40 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.06] dark:hover:bg-white/[0.07] transition-all"
        >
          {isDark ? (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <circle cx="12" cy="12" r="4" /><path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
            </svg>
          ) : (
            <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z" />
            </svg>
          )}
        </button>
      </header>

      {/* ── Report hero banner ────────────────────────────────────── */}
      <div className="bg-white dark:bg-[#161618] border-b border-black/[0.07] dark:border-white/[0.06] px-8 py-7">
        <div className="max-w-5xl mx-auto">
          <p className="text-[11px] font-medium text-[#007AFF] dark:text-[#0A84FF] uppercase tracking-widest mb-2">
            {t('Data Analysis Report', 'Veri Analizi Raporu')}
          </p>
          <h1 className="text-[24px] font-semibold tracking-tight text-[#1d1d1f] dark:text-white mb-3">{report.title}</h1>
          <div className="flex flex-wrap gap-4 text-[12px] text-[#1d1d1f]/40 dark:text-white/40">
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M8 1.5A6.5 6.5 0 1 1 1.5 8 6.507 6.507 0 0 1 8 1.5zm0 3v3.75l2.5 1.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {new Date(report.generated_at).toLocaleString()}
            </span>
            <span className="flex items-center gap-1.5">
              <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><rect x="1.5" y="2.5" width="13" height="11" rx="2" stroke="currentColor" strokeWidth="1.5"/><path d="M5 6h6M5 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
              {report.workflow_name}
            </span>
            {meta.filename != null && (
              <span className="flex items-center gap-1.5">
                <svg width="12" height="12" viewBox="0 0 16 16" fill="none"><path d="M9 1.5H4a1.5 1.5 0 0 0-1.5 1.5v10A1.5 1.5 0 0 0 4 14.5h8a1.5 1.5 0 0 0 1.5-1.5V6L9 1.5z" stroke="currentColor" strokeWidth="1.5"/><path d="M9 1.5V6h4.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/></svg>
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
      <div className="max-w-5xl mx-auto px-4 py-8 flex gap-6">

        {/* Sidebar — Contents */}
        <aside className="w-52 flex-shrink-0 hidden lg:block">
          <div className="sticky top-16">
            <p className="text-[10px] font-semibold text-[#1d1d1f]/30 dark:text-white/30 uppercase tracking-widest mb-3 px-1">
              {t('Contents', 'İçindekiler')}
            </p>
            <nav className="space-y-0.5">
              {/* Metadata as first item */}
              <button
                onClick={() => scrollTo('section-metadata')}
                className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] transition-colors flex items-center gap-2 ${
                  activeSectionId === 'section-metadata'
                    ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] font-medium'
                    : 'text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                }`}
              >
                <span className="w-5 text-center text-[10px] opacity-60">⊙</span>
                {t('Dataset Info', 'Veri Seti')}
              </button>
              {sections.map((sec, i) => {
                const id = sectionId(sec, i)
                const meta = SECTION_META[sec.section_type]
                const icon = meta?.icon ?? '○'
                const label = sectionLabel(sec, detectedLang)
                return (
                  <button
                    key={id}
                    onClick={() => scrollTo(id)}
                    className={`w-full text-left px-2 py-1.5 rounded-lg text-[12px] transition-colors flex items-center gap-2 ${
                      activeSectionId === id
                        ? 'bg-[#007AFF]/10 dark:bg-[#0A84FF]/15 text-[#007AFF] dark:text-[#0A84FF] font-medium'
                        : 'text-[#1d1d1f]/50 dark:text-white/50 hover:text-[#1d1d1f] dark:hover:text-white hover:bg-black/[0.04] dark:hover:bg-white/[0.04]'
                    }`}
                  >
                    <span className="w-5 text-center text-[11px] opacity-60 font-mono">{icon}</span>
                    <span className="truncate">{label}</span>
                  </button>
                )
              })}
            </nav>

            {/* AI Insights button */}
            <div className="mt-4 pt-3 border-t border-black/[0.06] dark:border-white/[0.06]">
              <button
                onClick={handleAiInsights}
                disabled={aiLoading}
                className="w-full flex items-center gap-2 px-2 py-2 rounded-xl text-[12px] font-medium bg-gradient-to-r from-[#BF5AF2]/10 to-[#0071E3]/10 dark:from-[#BF5AF2]/15 dark:to-[#0071E3]/15 text-[#BF5AF2] hover:from-[#BF5AF2]/20 hover:to-[#0071E3]/20 transition-all disabled:opacity-50"
              >
                {aiLoading ? (
                  <div className="w-4 h-4 rounded-full border-2 border-[#BF5AF2]/30 border-t-[#BF5AF2] animate-spin flex-shrink-0" />
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
          {Object.keys(meta).length > 0 && (
            <SectionCard
              id="section-metadata"
              icon="⊙"
              title={t('Dataset Info', 'Veri Seti Bilgisi')}
              ref={(el) => { sectionRefs.current['section-metadata'] = el }}
            >
              <MetadataGrid data={meta} />
            </SectionCard>
          )}

          {/* Analysis sections */}
          {sections.map((sec, i) => {
            const id = sectionId(sec, i)
            const meta = SECTION_META[sec.section_type]
            const icon = meta?.icon ?? '○'
            const label = sectionLabel(sec, detectedLang)
            return (
              <SectionCard
                key={id}
                id={id}
                icon={icon}
                title={label}
                ref={(el) => { sectionRefs.current[id] = el }}
                badge={sec.section_type === 'ai_insights' ? (detectedLang === 'tr' ? 'Gemini' : 'Gemini') : undefined}
              >
                <SectionContent section={sec} lang={detectedLang} />
              </SectionCard>
            )
          })}

          {sections.length === 0 && (
            <div className="text-center py-20 text-[13px] text-[#1d1d1f]/25 dark:text-white/25">
              {t('No analysis sections in this report.', 'Bu raporda analiz bölümü bulunmuyor.')}
            </div>
          )}

          {/* Inline AI Insights panel */}
          {aiInsights && (
            <div
              id="ai-insights-inline"
              className="bg-white dark:bg-[#161618] border border-[#BF5AF2]/20 dark:border-[#BF5AF2]/25 rounded-2xl overflow-hidden shadow-sm"
            >
              <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-[#BF5AF2]/12 dark:border-[#BF5AF2]/15 bg-gradient-to-r from-[#BF5AF2]/5 to-transparent">
                <span className="w-7 h-7 rounded-lg bg-[#BF5AF2]/10 flex items-center justify-center text-[14px] text-[#BF5AF2] flex-shrink-0">✦</span>
                <h2 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white flex-1">
                  {t('AI Insights', 'Yapay Zeka Analizi')}
                </h2>
                <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#BF5AF2]/10 dark:bg-[#BF5AF2]/15 text-[#BF5AF2]">Gemini</span>
                <button
                  onClick={() => setAiInsights(null)}
                  className="w-6 h-6 rounded-lg flex items-center justify-center text-[#1d1d1f]/25 dark:text-white/25 hover:text-[#1d1d1f]/60 dark:hover:text-white/60 hover:bg-black/[0.05] dark:hover:bg-white/[0.05] transition-all"
                >
                  <svg width="10" height="10" viewBox="0 0 10 10" fill="none">
                    <path d="M1 1l8 8M9 1L1 9" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
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

// ── Section card wrapper ──────────────────────────────────────────────────────
import { forwardRef } from 'react'

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
    className="bg-white dark:bg-[#161618] border border-black/[0.07] dark:border-white/[0.06] rounded-2xl overflow-hidden shadow-sm dark:shadow-none"
  >
    <div className="flex items-center gap-2.5 px-5 py-3.5 border-b border-black/[0.06] dark:border-white/[0.05]">
      <span className="w-7 h-7 rounded-lg bg-[#007AFF]/8 dark:bg-[#0A84FF]/12 flex items-center justify-center text-[13px] text-[#007AFF] dark:text-[#0A84FF] font-mono flex-shrink-0">
        {icon}
      </span>
      <h2 className="text-[13px] font-semibold text-[#1d1d1f] dark:text-white flex-1">{title}</h2>
      {badge && (
        <span className="text-[10px] font-medium px-2 py-0.5 rounded-full bg-[#BF5AF2]/10 dark:bg-[#BF5AF2]/15 text-[#BF5AF2]">
          {badge}
        </span>
      )}
    </div>
    <div className="p-5">{children}</div>
  </div>
))
SectionCard.displayName = 'SectionCard'

// ── Section content dispatcher ────────────────────────────────────────────────
function SectionContent({ section, lang }: { section: ReportSection; lang: string }) {
  const { section_type, data, content } = section
  switch (section_type) {
    case 'statistics':         return <StatisticsTable data={data as Record<string, StatRow>} lang={lang} />
    case 'missing_value':      return <MissingTable data={data as Record<string, MissingRow>} lang={lang} />
    case 'duplicate_detection':return <DuplicateCard data={data} lang={lang} />
    case 'anomaly_detection':  return <AnomalyCard data={data} lang={lang} />
    case 'correlation':        return <CorrelationTable data={data} lang={lang} />
    case 'column_type_detection': return <ColumnTypesTable data={data as Record<string, ColTypeRow>} lang={lang} />
    case 'distribution':       return <DistributionSection data={data as Record<string, DistRow>} lang={lang} />
    case 'ai_insights':        return content ? <MarkdownBlock content={content} /> : <p className="text-[12px] text-[#1d1d1f]/30 dark:text-white/30">No AI insights available.</p>
    default:                   return <KVGrid data={data} />
  }
}

// ── Type helpers ──────────────────────────────────────────────────────────────
interface StatRow { count?: number; mean?: number; std?: number; min?: number; max?: number; skewness?: number; kurtosis?: number; is_normal?: boolean | null; shapiro_p?: number }
interface MissingRow { missing_count?: number; missing_pct?: number; present_count?: number }
interface ColTypeRow { semantic_type?: string; pandas_dtype?: string; unique_count?: number; missing_count?: number }
interface CorrelationPair { col_a: string; col_b: string; correlation: number; direction: string; strength: string }
interface DistRow { skewness?: number; kurtosis?: number; skewness_label?: string; histogram?: { counts: number[] } }

function fmt(v: unknown, decimals = 3): string {
  if (v == null) return '—'
  if (typeof v === 'number') return v.toFixed(decimals)
  return String(v)
}

// ── Sub-section renderers ─────────────────────────────────────────────────────

function MetadataGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data).filter(([, v]) =>
    v != null && (typeof v === 'string' || typeof v === 'number' || typeof v === 'boolean')
  )
  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
      {entries.map(([k, v]) => (
        <div key={k} className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2.5">
          <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-0.5">{k.replace(/_/g, ' ')}</p>
          <p className="text-[13px] font-medium text-[#1d1d1f] dark:text-white font-mono truncate">{String(v)}</p>
        </div>
      ))}
    </div>
  )
}

function StatisticsTable({ data, lang }: { data: Record<string, StatRow>; lang: string }) {
  const cols = Object.keys(data ?? {})
  if (!cols.length) return <Empty lang={lang} />
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {[t('Column','Sütun'), t('Count','Sayı'), t('Mean','Ort.'), t('Std Dev','Std'), t('Min','Min'), t('Max','Max'), t('Skewness','Çarpıklık'), t('Kurtosis','Basıklık'), t('Normal?','Normal?')].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-[#1d1d1f]/35 dark:text-white/35 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => {
            const s = data[col] ?? {}
            const isNormal = s.is_normal
            const skew = s.skewness ?? 0
            const skewFlag = Math.abs(skew) > 1
            return (
              <tr key={col} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{col}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.count, 0)}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.mean)}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.std)}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.min)}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.max)}</td>
                <td className={`px-3 py-2 font-mono ${skewFlag ? 'text-[#FF9F0A] font-semibold' : 'text-[#1d1d1f]/60 dark:text-white/60'}`}>{fmt(s.skewness)}</td>
                <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 font-mono">{fmt(s.kurtosis)}</td>
                <td className="px-3 py-2">
                  {isNormal === true ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#30D158]/15 text-[#30D158] font-medium">{t('Yes','Evet')}</span>
                  ) : isNormal === false ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#FF453A]/12 text-[#FF453A] font-medium">{t('No','Hayır')}</span>
                  ) : (
                    <span className="text-[#1d1d1f]/20 dark:text-white/20">—</span>
                  )}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function MissingTable({ data, lang }: { data: Record<string, MissingRow>; lang: string }) {
  const cols = Object.keys(data ?? {})
  if (!cols.length) return <Empty lang={lang} />
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  const totalMissing = cols.filter((c) => (data[c]?.missing_count ?? 0) > 0).length
  return (
    <div className="space-y-3">
      {/* Summary line */}
      <p className="text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
        {totalMissing === 0
          ? t('✓ No missing values detected across all columns.', '✓ Hiçbir sütunda eksik değer tespit edilmedi.')
          : t(`⚠ ${totalMissing} column(s) have missing values.`, `⚠ ${totalMissing} sütunda eksik değer var.`)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
              {[t('Column','Sütun'), t('Missing','Eksik'), t('Rate','Oran'), t('Present','Mevcut')].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[#1d1d1f]/35 dark:text-white/35 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {cols.map((col) => {
              const s = data[col] ?? {}
              const count = s.missing_count ?? 0
              const pct = s.missing_pct ?? 0
              return (
                <tr key={col} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                  <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{col}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${count > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]'}`}>{count}</td>
                  <td className="px-3 py-2">
                    <div className="flex items-center gap-2">
                      <div className="w-16 h-1.5 rounded-full bg-black/[0.07] dark:bg-white/[0.07] overflow-hidden">
                        <div
                          className={`h-full rounded-full ${count > 0 ? 'bg-[#FF9F0A]' : 'bg-[#30D158]'}`}
                          style={{ width: `${Math.min(pct, 100)}%` }}
                        />
                      </div>
                      <span className="text-[#1d1d1f]/50 dark:text-white/50">{pct.toFixed(1)}%</span>
                    </div>
                  </td>
                  <td className="px-3 py-2 font-mono text-[#1d1d1f]/50 dark:text-white/50">{s.present_count ?? '—'}</td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function DuplicateCard({ data, lang }: { data: Record<string, unknown>; lang: string }) {
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  const total = Number(data.total_rows ?? 0)
  const dupes = Number(data.duplicate_count ?? 0)
  const pct = Number(data.duplicate_pct ?? 0)
  const unique = Number(data.unique_rows ?? 0)
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
        {dupes === 0
          ? t('✓ No duplicate rows detected.', '✓ Tekrar eden satır tespit edilmedi.')
          : t(`⚠ ${dupes} duplicate rows found (${pct.toFixed(1)}% of data).`, `⚠ ${dupes} tekrar eden satır bulundu (verinin %${pct.toFixed(1)}'i).`)}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('Total Rows', 'Toplam Satır'), value: total.toLocaleString(), color: '' },
          { label: t('Duplicates', 'Tekrarlar'), value: dupes.toLocaleString(), color: dupes > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]' },
          { label: t('Duplicate Rate', 'Tekrar Oranı'), value: `${pct.toFixed(2)}%`, color: dupes > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]' },
          { label: t('Unique Rows', 'Benzersiz Satır'), value: unique.toLocaleString(), color: '' },
        ].map(({ label, value, color }) => (
          <div key={label} className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-[15px] font-semibold font-mono ${color || 'text-[#1d1d1f] dark:text-white'}`}>{value}</p>
          </div>
        ))}
      </div>
    </div>
  )
}

function AnomalyCard({ data, lang }: { data: Record<string, unknown>; lang: string }) {
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  const method = String(data.method ?? 'N/A')
  const total = Number(data.total_rows ?? 0)
  const count = Number(data.anomaly_count ?? 0)
  const rate = Number(data.anomaly_rate ?? 0)
  const clean = Number(data.clean_count ?? total - count)
  const cols = (data.columns_analysed as string[] | undefined) ?? []
  return (
    <div className="space-y-4">
      <p className="text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
        {count === 0
          ? t('✓ No anomalies detected.', '✓ Anomali tespit edilmedi.')
          : t(`⚠ ${count} anomalous rows detected (${(rate * 100).toFixed(2)}% of data) using ${method}.`,
             `⚠ ${method} yöntemiyle ${count} anormal satır tespit edildi (verinin %${(rate * 100).toFixed(2)}'i).`)}
      </p>
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
        {[
          { label: t('Method', 'Yöntem'), value: method, mono: false },
          { label: t('Anomalies', 'Anomaliler'), value: count.toLocaleString(), color: count > 0 ? 'text-[#FF453A]' : 'text-[#30D158]' },
          { label: t('Anomaly Rate', 'Anomali Oranı'), value: `${(rate * 100).toFixed(2)}%`, color: count > 0 ? 'text-[#FF453A]' : 'text-[#30D158]' },
          { label: t('Clean Rows', 'Temiz Satır'), value: clean.toLocaleString(), color: '' },
        ].map(({ label, value, color, mono }) => (
          <div key={label} className="bg-black/[0.02] dark:bg-white/[0.03] rounded-xl px-3 py-2.5">
            <p className="text-[10px] text-[#1d1d1f]/35 dark:text-white/35 uppercase tracking-wider mb-1">{label}</p>
            <p className={`text-[15px] font-semibold ${mono !== false ? 'font-mono' : ''} ${color || 'text-[#1d1d1f] dark:text-white'} truncate`}>{value}</p>
          </div>
        ))}
      </div>
      {cols.length > 0 && (
        <p className="text-[11px] text-[#1d1d1f]/35 dark:text-white/35">
          {t('Columns analysed:', 'Analiz edilen sütunlar:')} {cols.join(', ')}
        </p>
      )}
    </div>
  )
}

function CorrelationTable({ data, lang }: { data: Record<string, unknown>; lang: string }) {
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  const strong = (data.strong_pairs as CorrelationPair[] | undefined) ?? []
  if (!strong.length) {
    return (
      <p className="text-[12px] text-[#1d1d1f]/40 dark:text-white/40">
        {t('No strong correlations found above the threshold.', 'Eşik değerinin üzerinde güçlü korelasyon bulunamadı.')}
      </p>
    )
  }
  return (
    <div className="space-y-3">
      <p className="text-[12px] text-[#1d1d1f]/50 dark:text-white/50">
        {t(`${strong.length} strong correlation(s) detected.`, `${strong.length} güçlü korelasyon tespit edildi.`)}
      </p>
      <div className="overflow-x-auto">
        <table className="w-full text-[11px] border-collapse">
          <thead>
            <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
              {[t('Column A','Sütun A'), t('Column B','Sütun B'), 'r', t('Direction','Yön'), t('Strength','Güç')].map((h) => (
                <th key={h} className="text-left px-3 py-2 text-[#1d1d1f]/35 dark:text-white/35 font-medium">{h}</th>
              ))}
            </tr>
          </thead>
          <tbody>
            {strong.map((p, i) => {
              const r = p.correlation
              const abs = Math.abs(r)
              const color = abs > 0.8 ? 'text-[#FF453A]' : abs > 0.6 ? 'text-[#FF9F0A]' : 'text-[#1d1d1f]/60 dark:text-white/60'
              return (
                <tr key={i} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                  <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{p.col_a}</td>
                  <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{p.col_b}</td>
                  <td className={`px-3 py-2 font-mono font-semibold ${color}`}>{r.toFixed(3)}</td>
                  <td className="px-3 py-2 text-[#1d1d1f]/60 dark:text-white/60 capitalize">{p.direction}</td>
                  <td className="px-3 py-2">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                      p.strength === 'very strong' || p.strength === 'strong'
                        ? 'bg-[#FF453A]/12 text-[#FF453A]'
                        : 'bg-[#FF9F0A]/12 text-[#FF9F0A]'
                    }`}>{p.strength}</span>
                  </td>
                </tr>
              )
            })}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function ColumnTypesTable({ data, lang }: { data: Record<string, ColTypeRow>; lang: string }) {
  const cols = Object.keys(data ?? {})
  if (!cols.length) return <Empty lang={lang} />
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en
  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {[t('Column','Sütun'), t('Semantic Type','Semantik Tip'), t('Dtype','Dtype'), t('Unique','Benzersiz'), t('Missing','Eksik')].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-[#1d1d1f]/35 dark:text-white/35 font-medium">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => {
            const s = data[col] ?? {}
            return (
              <tr key={col} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{col}</td>
                <td className="px-3 py-2">
                  <span className="text-[10px] px-1.5 py-0.5 rounded-full bg-[#007AFF]/8 dark:bg-[#0A84FF]/12 text-[#007AFF] dark:text-[#0A84FF] font-medium">
                    {s.semantic_type ?? '—'}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[#1d1d1f]/55 dark:text-white/55">{s.pandas_dtype ?? '—'}</td>
                <td className="px-3 py-2 font-mono text-[#1d1d1f]/55 dark:text-white/55">{s.unique_count ?? '—'}</td>
                <td className={`px-3 py-2 font-mono font-semibold ${Number(s.missing_count ?? 0) > 0 ? 'text-[#FF9F0A]' : 'text-[#30D158]'}`}>
                  {s.missing_count ?? 0}
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DistributionSection({ data, lang }: { data: Record<string, DistRow>; lang: string }) {
  const cols = Object.keys(data ?? {})
  if (!cols.length) return <Empty lang={lang} />
  const t = (en: string, tr: string) => lang === 'tr' ? tr : en

  const skewLabel = (label?: string) => {
    if (!label) return '—'
    const map: Record<string, string> = {
      'approximately symmetric': lang === 'tr' ? 'Simetrik' : 'Symmetric',
      'moderately skewed':       lang === 'tr' ? 'Orta çarpık' : 'Mod. skewed',
      'highly skewed':           lang === 'tr' ? 'Yüksek çarpık' : 'Highly skewed',
    }
    return map[label] ?? label
  }

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-[11px] border-collapse">
        <thead>
          <tr className="border-b border-black/[0.07] dark:border-white/[0.07]">
            {[t('Column','Sütun'), t('Skewness','Çarpıklık'), t('Kurtosis','Basıklık'), t('Shape','Şekil'), t('Obs.','Gözlem')].map((h) => (
              <th key={h} className="text-left px-3 py-2 text-[#1d1d1f]/35 dark:text-white/35 font-medium whitespace-nowrap">{h}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {cols.map((col) => {
            const d = data[col] ?? {}
            const skew = d.skewness ?? 0
            const highSkew = Math.abs(skew) > 1
            const obs = d.histogram?.counts?.reduce((a, b) => a + b, 0) ?? '—'
            return (
              <tr key={col} className="border-b border-black/[0.04] dark:border-white/[0.04] last:border-0 hover:bg-black/[0.015] dark:hover:bg-white/[0.015]">
                <td className="px-3 py-2 font-medium text-[#1d1d1f]/85 dark:text-white/85">{col}</td>
                <td className={`px-3 py-2 font-mono font-semibold ${highSkew ? 'text-[#FF9F0A]' : 'text-[#1d1d1f]/60 dark:text-white/60'}`}>
                  {d.skewness != null ? d.skewness.toFixed(3) : '—'}
                </td>
                <td className="px-3 py-2 font-mono text-[#1d1d1f]/60 dark:text-white/60">
                  {d.kurtosis != null ? d.kurtosis.toFixed(3) : '—'}
                </td>
                <td className="px-3 py-2">
                  <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-medium ${
                    highSkew
                      ? 'bg-[#FF9F0A]/12 text-[#FF9F0A]'
                      : 'bg-[#30D158]/12 text-[#30D158]'
                  }`}>
                    {skewLabel(d.skewness_label)}
                  </span>
                </td>
                <td className="px-3 py-2 font-mono text-[#1d1d1f]/50 dark:text-white/50">{obs}</td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function KVGrid({ data }: { data: Record<string, unknown> }) {
  const entries = Object.entries(data ?? {}).filter(([, v]) => v != null)
  if (!entries.length) return <p className="text-[12px] text-[#1d1d1f]/25 dark:text-white/25">No data</p>
  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
      {entries.map(([k, v]) => (
        <div key={k} className="flex items-start gap-2 px-3 py-2 rounded-lg bg-black/[0.02] dark:bg-white/[0.02]">
          <span className="text-[11px] text-[#1d1d1f]/40 dark:text-white/40 w-32 flex-shrink-0 pt-px capitalize">{k.replace(/_/g, ' ')}</span>
          <span className="text-[11px] text-[#1d1d1f]/75 dark:text-white/75 font-mono break-all">{JSON.stringify(v)}</span>
        </div>
      ))}
    </div>
  )
}

function Empty({ lang }: { lang: string }) {
  return <p className="text-[12px] text-[#1d1d1f]/25 dark:text-white/25">{lang === 'tr' ? 'Veri yok.' : 'No data available.'}</p>
}
