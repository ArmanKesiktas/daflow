import { useState } from 'react'
import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'
import WorkflowEditorMockup from './mockups/WorkflowEditorMockup'
import DashboardMockup from './mockups/DashboardMockup'
import ReportMockup from './mockups/ReportMockup'

type ShowcaseTab = 'workflow' | 'dashboard' | 'report'

export default function ShowcaseSection() {
  const { t } = useI18n()
  const [active, setActive] = useState<ShowcaseTab>('workflow')

  const tabs: { id: ShowcaseTab; label: string; icon: React.ReactNode }[] = [
    { id: 'workflow', label: t('landing_showcase_tab_workflow'), icon: <WorkflowTabIcon /> },
    { id: 'dashboard', label: t('landing_showcase_tab_dashboard'), icon: <DashboardTabIcon /> },
    { id: 'report', label: t('landing_showcase_tab_report'), icon: <ReportTabIcon /> },
  ]

  return (
    <SectionWrapper id="showcase" className="py-20 md:py-28 px-6" animation="scale-up">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-10 md:mb-14">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-text-primary)]">
            {t('landing_showcase_title')}
          </h2>
          <p className="mt-4 text-[16px] md:text-[18px] text-[var(--color-text-secondary)] leading-relaxed">
            {t('landing_showcase_subtitle')}
          </p>
        </div>

        {/* Tab bar */}
        <div className="flex justify-center mb-6 md:mb-8">
          <div className="inline-flex items-end gap-1 border-b border-black/[0.06] dark:border-white/[0.06]">
            {tabs.map((tab) => {
              const isActive = active === tab.id
              return (
                <button
                  key={tab.id}
                  onClick={() => setActive(tab.id)}
                  className={`
                    flex items-center gap-2 px-4 md:px-5 h-11
                    text-[13px] md:text-[14px] font-medium
                    border-b-2 -mb-px transition-all
                    ${isActive
                      ? 'border-[#0071E3] text-[var(--color-text-primary)]'
                      : 'border-transparent text-[var(--color-text-muted)] hover:text-[var(--color-text-secondary)]'}
                  `}
                >
                  <span className={isActive ? 'text-[#0071E3]' : ''}>{tab.icon}</span>
                  {tab.label}
                </button>
              )
            })}
          </div>
        </div>

        {/* Mockup frame */}
        <div className="relative group">
          {/* Glow behind */}
          <div className="absolute -inset-4 rounded-3xl bg-gradient-to-r from-blue-500/10 via-purple-500/5 to-blue-500/10 blur-3xl -z-10" />

          <div className="rounded-2xl border border-black/[0.08] dark:border-white/[0.08] bg-[var(--color-bg-surface)] shadow-2xl overflow-hidden transition-transform duration-300 group-hover:scale-[1.01]">
            {active === 'workflow' && <WorkflowEditorMockup variant="compact" />}
            {active === 'dashboard' && <DashboardMockup />}
            {active === 'report' && <ReportMockup />}
          </div>
        </div>
      </div>
    </SectionWrapper>
  )
}

function WorkflowTabIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function DashboardTabIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function ReportTabIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19.5 14.25v-2.625a3.375 3.375 0 00-3.375-3.375h-1.5A1.125 1.125 0 0113.5 7.125v-1.5a3.375 3.375 0 00-3.375-3.375H8.25m2.25 0H5.625c-.621 0-1.125.504-1.125 1.125v17.25c0 .621.504 1.125 1.125 1.125h12.75c.621 0 1.125-.504 1.125-1.125V11.25a9 9 0 00-9-9z" />
    </svg>
  )
}
