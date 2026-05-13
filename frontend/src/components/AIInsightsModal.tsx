import { useEffect, useRef } from 'react'
import { useI18n } from '../i18n'

interface AIInsightsModalProps {
  insights: string
  onClose: () => void
}

export default function AIInsightsModal({ insights, onClose }: AIInsightsModalProps) {
  const { t } = useI18n()
  const backdropRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  /* Focus trap — focus the content on mount */
  useEffect(() => {
    contentRef.current?.focus()
  }, [])

  /* Close on Escape */
  useEffect(() => {
    const handle = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose() }
    window.addEventListener('keydown', handle)
    return () => window.removeEventListener('keydown', handle)
  }, [onClose])

  /* Close on backdrop click */
  const handleBackdropClick = (e: React.MouseEvent) => {
    if (e.target === backdropRef.current) onClose()
  }

  return (
    <div
      ref={backdropRef}
      onClick={handleBackdropClick}
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/40 backdrop-blur-sm"
    >
      <div
        ref={contentRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="ai-insights-title"
        tabIndex={-1}
        className="relative w-full max-w-[480px] mx-4 bg-surface border border-[var(--color-border-default)] rounded-2xl shadow-2xl flex flex-col max-h-[80vh] overflow-hidden animate-[fadeInUp_0.22s_ease] outline-none"
      >

        {/* Header */}
        <div className="flex items-center gap-3 px-4 pt-4 pb-3 border-b border-[var(--color-border-subtle)]">
          <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center shrink-0">
            <svg className="w-4 h-4 text-primary" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round"
                d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09z" />
            </svg>
          </div>
          <div className="flex-1 min-w-0">
            <h2 id="ai-insights-title" className="text-[15px] font-semibold text-[var(--color-text-primary)] leading-tight">
              {t('aiInsights')}
            </h2>
            <p className="text-[11px] text-[var(--color-text-muted)] mt-0.5 leading-none">
              {t('aiInsightsSubtitle')}
            </p>
          </div>
          <button
            onClick={onClose}
            aria-label="Close dialog"
            className="w-7 h-7 rounded-full bg-[var(--color-secondary)] flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-[var(--color-border-default)] transition-all shrink-0"
          >
            <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth={2.2} viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Body */}
        <div className="overflow-y-auto px-6 py-4 flex-1">
          <div className="prose prose-sm dark:prose-invert max-w-none">
            {insights.split('\n').map((line, i) => {
              if (!line.trim()) return <div key={i} className="h-2" />

              /* Markdown-style headers */
              if (line.startsWith('### ')) {
                return (
                  <h3 key={i} className="text-[13px] font-semibold text-[var(--color-text-primary)] mt-4 mb-1">
                    {line.slice(4)}
                  </h3>
                )
              }
              if (line.startsWith('## ')) {
                return (
                  <h2 key={i} className="text-[14px] font-semibold text-[var(--color-text-primary)] mt-5 mb-1.5">
                    {line.slice(3)}
                  </h2>
                )
              }
              if (line.startsWith('**') && line.endsWith('**')) {
                return (
                  <p key={i} className="text-[12px] font-semibold text-[var(--color-text-primary)]">
                    {line.slice(2, -2)}
                  </p>
                )
              }
              /* Bullet points */
              if (line.startsWith('- ') || line.startsWith('• ')) {
                return (
                  <div key={i} className="flex gap-2 text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                    <span className="text-primary mt-1 shrink-0">•</span>
                    <span>{line.slice(2)}</span>
                  </div>
                )
              }
              /* Section headers (===) */
              if (line.startsWith('===') && line.endsWith('===')) {
                return (
                  <h4 key={i} className="text-[11px] font-bold text-primary uppercase tracking-wider mt-4 mb-1">
                  {line.split('=').join('').trim()}
                  </h4>
                )
              }

              return (
                <p key={i} className="text-[12px] text-[var(--color-text-secondary)] leading-relaxed">
                  {line}
                </p>
              )
            })}
          </div>
        </div>

        {/* Footer */}
        <div className="px-4 pb-4 pt-3 border-t border-[var(--color-border-subtle)] flex justify-end">
          <button
            onClick={onClose}
            className="px-4 h-8 rounded-lg bg-primary hover:bg-primary-hover text-white text-[12px] font-medium transition-colors"
          >
            {t('close')}
          </button>
        </div>
      </div>
    </div>
  )
}
