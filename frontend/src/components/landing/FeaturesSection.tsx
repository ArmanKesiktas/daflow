import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'

interface FeatureCard {
  icon: React.ReactNode
  title: string
  description: string
  gradient: string
  iconBg: string
  iconColor: string
}

export default function FeaturesSection() {
  const { t } = useI18n()

  const features: FeatureCard[] = [
    {
      icon: <WorkflowIcon />,
      title: t('landing_feature_workflow_title'),
      description: t('landing_feature_workflow_desc'),
      gradient: 'from-blue-500/10 to-blue-600/5',
      iconBg: 'bg-blue-500/10 dark:bg-blue-400/15',
      iconColor: 'text-blue-600 dark:text-blue-400',
    },
    {
      icon: <AIIcon />,
      title: t('landing_feature_ai_title'),
      description: t('landing_feature_ai_desc'),
      gradient: 'from-amber-500/10 to-orange-500/5',
      iconBg: 'bg-amber-500/10 dark:bg-amber-400/15',
      iconColor: 'text-amber-600 dark:text-amber-400',
    },
    {
      icon: <DashboardIcon />,
      title: t('landing_feature_dashboard_title'),
      description: t('landing_feature_dashboard_desc'),
      gradient: 'from-purple-500/10 to-violet-500/5',
      iconBg: 'bg-purple-500/10 dark:bg-purple-400/15',
      iconColor: 'text-purple-600 dark:text-purple-400',
    },
    {
      icon: <CollabIcon />,
      title: t('landing_feature_collab_title'),
      description: t('landing_feature_collab_desc'),
      gradient: 'from-green-500/10 to-emerald-500/5',
      iconBg: 'bg-green-500/10 dark:bg-green-400/15',
      iconColor: 'text-green-600 dark:text-green-400',
    },
    {
      icon: <BigDataIcon />,
      title: t('landing_feature_bigdata_title'),
      description: t('landing_feature_bigdata_desc'),
      gradient: 'from-cyan-500/10 to-teal-500/5',
      iconBg: 'bg-cyan-500/10 dark:bg-cyan-400/15',
      iconColor: 'text-cyan-600 dark:text-cyan-400',
    },
  ]

  return (
    <SectionWrapper id="features" className="py-20 md:py-28 px-6" animation="fade-up">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-text-primary)]">
            {t('landing_features_title')}
          </h2>
          <p className="mt-4 text-[16px] md:text-[18px] text-[var(--color-text-secondary)] leading-relaxed">
            {t('landing_features_subtitle')}
          </p>
        </div>

        {/* Feature grid */}
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-5">
          {features.map((feature, index) => (
            <div
              key={index}
              className="group relative rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-6 transition-all duration-300 hover:shadow-lg hover:shadow-black/[0.04] dark:hover:shadow-white/[0.02] hover:-translate-y-1 hover:border-black/[0.10] dark:hover:border-white/[0.10]"
            >
              {/* Gradient background on hover */}
              <div className={`absolute inset-0 rounded-2xl bg-gradient-to-br ${feature.gradient} opacity-0 group-hover:opacity-100 transition-opacity duration-300`} />

              <div className="relative">
                <div className={`w-11 h-11 rounded-xl ${feature.iconBg} flex items-center justify-center ${feature.iconColor} mb-4`}>
                  {feature.icon}
                </div>
                <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)] mb-2">
                  {feature.title}
                </h3>
                <p className="text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
                  {feature.description}
                </p>
              </div>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}

function WorkflowIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.75 6A2.25 2.25 0 016 3.75h2.25A2.25 2.25 0 0110.5 6v2.25a2.25 2.25 0 01-2.25 2.25H6a2.25 2.25 0 01-2.25-2.25V6zM3.75 15.75A2.25 2.25 0 016 13.5h2.25a2.25 2.25 0 012.25 2.25V18a2.25 2.25 0 01-2.25 2.25H6A2.25 2.25 0 013.75 18v-2.25zM13.5 6a2.25 2.25 0 012.25-2.25H18A2.25 2.25 0 0120.25 6v2.25A2.25 2.25 0 0118 10.5h-2.25a2.25 2.25 0 01-2.25-2.25V6zM13.5 15.75a2.25 2.25 0 012.25-2.25H18a2.25 2.25 0 012.25 2.25V18A2.25 2.25 0 0118 20.25h-2.25A2.25 2.25 0 0113.5 18v-2.25z" />
    </svg>
  )
}

function AIIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9.813 15.904L9 18.75l-.813-2.846a4.5 4.5 0 00-3.09-3.09L2.25 12l2.846-.813a4.5 4.5 0 003.09-3.09L9 5.25l.813 2.846a4.5 4.5 0 003.09 3.09L15.75 12l-2.846.813a4.5 4.5 0 00-3.09 3.09zM18.259 8.715L18 9.75l-.259-1.035a3.375 3.375 0 00-2.455-2.456L14.25 6l1.036-.259a3.375 3.375 0 002.455-2.456L18 2.25l.259 1.035a3.375 3.375 0 002.456 2.456L21.75 6l-1.035.259a3.375 3.375 0 00-2.456 2.456zM16.894 20.567L16.5 21.75l-.394-1.183a2.25 2.25 0 00-1.423-1.423L13.5 18.75l1.183-.394a2.25 2.25 0 001.423-1.423l.394-1.183.394 1.183a2.25 2.25 0 001.423 1.423l1.183.394-1.183.394a2.25 2.25 0 00-1.423 1.423z" />
    </svg>
  )
}

function DashboardIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 13.125C3 12.504 3.504 12 4.125 12h2.25c.621 0 1.125.504 1.125 1.125v6.75C7.5 20.496 6.996 21 6.375 21h-2.25A1.125 1.125 0 013 19.875v-6.75zM9.75 8.625c0-.621.504-1.125 1.125-1.125h2.25c.621 0 1.125.504 1.125 1.125v11.25c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V8.625zM16.5 4.125c0-.621.504-1.125 1.125-1.125h2.25C20.496 3 21 3.504 21 4.125v15.75c0 .621-.504 1.125-1.125 1.125h-2.25a1.125 1.125 0 01-1.125-1.125V4.125z" />
    </svg>
  )
}

function CollabIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M18 18.72a9.094 9.094 0 003.741-.479 3 3 0 00-4.682-2.72m.94 3.198l.001.031c0 .225-.012.447-.037.666A11.944 11.944 0 0112 21c-2.17 0-4.207-.576-5.963-1.584A6.062 6.062 0 016 18.719m12 0a5.971 5.971 0 00-.941-3.197m0 0A5.995 5.995 0 0012 12.75a5.995 5.995 0 00-5.058 2.772m0 0a3 3 0 00-4.681 2.72 8.986 8.986 0 003.74.477m.94-3.197a5.971 5.971 0 00-.94 3.197M15 6.75a3 3 0 11-6 0 3 3 0 016 0zm6 3a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0zm-13.5 0a2.25 2.25 0 11-4.5 0 2.25 2.25 0 014.5 0z" />
    </svg>
  )
}

function BigDataIcon() {
  return (
    <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20.25 6.375c0 2.278-3.694 4.125-8.25 4.125S3.75 8.653 3.75 6.375m16.5 0c0-2.278-3.694-4.125-8.25-4.125S3.75 4.097 3.75 6.375m16.5 0v11.25c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125V6.375m16.5 0v3.75m-16.5-3.75v3.75m16.5 0v3.75C20.25 16.153 16.556 18 12 18s-8.25-1.847-8.25-4.125v-3.75m16.5 0c0 2.278-3.694 4.125-8.25 4.125s-8.25-1.847-8.25-4.125" />
    </svg>
  )
}
