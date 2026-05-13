import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'
import WorkflowEditorMockup from './mockups/WorkflowEditorMockup'
import HeroMascot from './HeroMascot'

export default function HeroSection() {
  const navigate = useNavigate()
  const { t } = useI18n()

  return (
    <header className="relative min-h-[90vh] flex items-center overflow-x-clip overflow-y-visible border-b border-black/[0.06] dark:border-white/[0.06]">
      {/* Background gradient */}
      <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/30 to-purple-50/20 dark:from-[#111113] dark:via-[#111113] dark:to-[#1a1a2e]" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top_right,rgba(0,113,227,0.08),transparent_60%)] dark:bg-[radial-gradient(ellipse_at_top_right,rgba(0,113,227,0.12),transparent_60%)]" />

      {/* Grid pattern */}
      <div
        className="absolute inset-0 opacity-[0.03] dark:opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(0,0,0,0.1) 1px, transparent 1px), linear-gradient(90deg, rgba(0,0,0,0.1) 1px, transparent 1px)',
          backgroundSize: '60px 60px',
        }}
      />

      <SectionWrapper className="relative z-10 w-full max-w-6xl mx-auto px-6 pt-28 pb-20" animation="fade-up">
        <div className="max-w-3xl">
          {/* Headline with gradient text */}
          <h1 className="text-[40px] md:text-[56px] lg:text-[64px] font-bold leading-[1.1] tracking-tight bg-gradient-to-r from-gray-900 via-gray-800 to-blue-800 dark:from-white dark:via-blue-100 dark:to-blue-300 bg-clip-text text-transparent">
            {t('landing_hero_headline')}
          </h1>

          {/* Subheadline */}
          <p className="mt-6 max-w-xl text-[17px] md:text-[19px] leading-relaxed text-[var(--color-text-secondary)]">
            {t('landing_hero_subheadline')}
          </p>

          {/* CTAs */}
          <div className="mt-8 flex flex-wrap gap-3">
            <button
              onClick={() => navigate('/login')}
              className="h-12 px-6 rounded-xl bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[15px] font-semibold shadow-lg shadow-blue-500/25 transition-all hover:shadow-xl hover:shadow-blue-500/30 hover:-translate-y-0.5"
            >
              {t('landing_hero_cta_primary')}
            </button>
            <button
              onClick={() => {
                const el = document.getElementById('how-it-works')
                el?.scrollIntoView({ behavior: 'smooth' })
              }}
              className="h-12 px-6 rounded-xl bg-white/80 dark:bg-white/[0.08] hover:bg-white dark:hover:bg-white/[0.12] border border-black/[0.08] dark:border-white/[0.10] text-[15px] font-semibold text-[var(--color-text-primary)] backdrop-blur transition-all hover:-translate-y-0.5"
            >
              {t('landing_hero_cta_secondary')}
            </button>
          </div>
        </div>

        {/* Product preview — realistic Workflow Editor mockup */}
        <div id="hero-mockup" className="mt-16 md:mt-20 relative group">
          {/* Mascot sitting on top-right */}
          <HeroMascot />

          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-bg-surface)] backdrop-blur-xl shadow-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.01]">
            <WorkflowEditorMockup variant="hero" />
          </div>
          {/* Glow effect */}
          <div className="absolute -inset-4 bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 rounded-3xl blur-3xl -z-10" />
        </div>
      </SectionWrapper>
    </header>
  )
}
