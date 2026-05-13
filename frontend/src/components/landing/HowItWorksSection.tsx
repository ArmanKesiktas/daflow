import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'

export default function HowItWorksSection() {
  const { t } = useI18n()

  const steps = [
    {
      number: 1,
      title: t('landing_step1_title'),
      description: t('landing_step1_desc'),
      icon: <UploadIcon />,
      color: 'bg-blue-500',
      gradientFrom: 'from-blue-500',
      gradientTo: 'to-blue-600',
    },
    {
      number: 2,
      title: t('landing_step2_title'),
      description: t('landing_step2_desc'),
      icon: <BuildIcon />,
      color: 'bg-purple-500',
      gradientFrom: 'from-purple-500',
      gradientTo: 'to-purple-600',
    },
    {
      number: 3,
      title: t('landing_step3_title'),
      description: t('landing_step3_desc'),
      icon: <ResultsIcon />,
      color: 'bg-green-500',
      gradientFrom: 'from-green-500',
      gradientTo: 'to-green-600',
    },
  ]

  return (
    <SectionWrapper
      id="how-it-works"
      className="py-20 md:py-28 px-6 bg-gray-50/80 dark:bg-white/[0.02] border-y border-black/[0.06] dark:border-white/[0.06]"
      animation="fade-up"
    >
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-16">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-text-primary)]">
            {t('landing_howItWorks_title')}
          </h2>
        </div>

        {/* Steps */}
        <div className="grid md:grid-cols-3 gap-8 md:gap-6 relative">
          {/* Connector lines (desktop) - more visible */}
          <div className="hidden md:block absolute top-16 left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-[3px] bg-gradient-to-r from-blue-500/40 via-purple-500/40 to-green-500/40 rounded-full" />
          <div className="hidden md:block absolute top-[62px] left-[calc(16.67%+24px)] right-[calc(16.67%+24px)] h-[3px] bg-gradient-to-r from-blue-500/10 via-purple-500/10 to-green-500/10 rounded-full blur-sm" />

          {steps.map((step) => (
            <div key={step.number} className="relative flex flex-col items-center text-center">
              {/* Step number circle with gradient */}
              <div className={`w-14 h-14 rounded-2xl bg-gradient-to-br ${step.gradientFrom} ${step.gradientTo} text-white flex items-center justify-center shadow-lg mb-6 relative z-10`}>
                {step.icon}
              </div>

              {/* Step number badge */}
              <div className="absolute -top-2 -right-2 md:top-0 md:right-auto md:left-[calc(50%+16px)] w-6 h-6 rounded-full bg-white dark:bg-[#1C1C1E] border-2 border-[var(--color-text-primary)] text-[11px] font-bold flex items-center justify-center text-[var(--color-text-primary)] shadow-sm z-20">
                {step.number}
              </div>

              <h3 className="text-[18px] font-semibold text-[var(--color-text-primary)] mb-2">
                {step.title}
              </h3>
              <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] max-w-xs">
                {step.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

function UploadIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 16.5v2.25A2.25 2.25 0 005.25 21h13.5A2.25 2.25 0 0021 18.75V16.5m-13.5-9L12 3m0 0l4.5 4.5M12 3v13.5" />
    </svg>
  )
}

function BuildIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M11.42 15.17l-5.1-5.1m0 0L12 4.37m-5.68 5.7h11.36m-5.68 5.7l5.1-5.1m0 0L12 4.37" />
    </svg>
  )
}

function ResultsIcon() {
  return (
    <svg className="w-6 h-6" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}
