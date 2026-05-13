import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'
import CountUpAnimation from './CountUpAnimation'

export default function TrustSection() {
  const { t } = useI18n()

  const stats = [
    { value: 2500, label: t('landing_stat_users'), suffix: '+' },
    { value: 50000, label: t('landing_stat_workflows'), suffix: '+' },
    { value: 120, label: t('landing_stat_datasources'), suffix: '+' },
  ]

  const testimonials = [
    {
      quote: 'Daflow transformed how our team handles data analysis. What used to take days now takes minutes.',
      name: 'Sarah Chen',
      role: 'Data Lead',
      company: 'TechCorp',
    },
    {
      quote: 'The visual workflow editor makes it easy for non-technical team members to build their own pipelines.',
      name: 'Marcus Weber',
      role: 'Product Manager',
      company: 'DataFlow Inc',
    },
    {
      quote: 'AI-powered insights helped us discover patterns we would have missed with traditional tools.',
      name: 'Ayşe Yılmaz',
      role: 'Analytics Director',
      company: 'Innovate Labs',
    },
  ]

  return (
    <SectionWrapper id="trust" className="py-20 md:py-28 px-6" animation="fade-up">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-text-primary)]">
            {t('landing_trust_title')}
          </h2>
        </div>

        {/* Stats - larger and bolder */}
        <div className="grid grid-cols-3 gap-4 md:gap-8 mb-16">
          {stats.map((stat) => (
            <div key={stat.label} className="text-center">
              <div className="text-[42px] md:text-[56px] font-extrabold tracking-tight text-[var(--color-primary)]">
                <CountUpAnimation end={stat.value} suffix={stat.suffix} />
              </div>
              <p className="mt-1 text-[13px] md:text-[14px] text-[var(--color-text-secondary)] font-medium">
                {stat.label}
              </p>
            </div>
          ))}
        </div>

        {/* Testimonials */}
        <div className="grid md:grid-cols-3 gap-4 md:gap-5">
          {testimonials.map((testimonial) => (
            <figure
              key={testimonial.name}
              className="relative rounded-2xl border border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] p-6 transition-all duration-300 hover:shadow-md hover:-translate-y-0.5"
            >
              {/* Large decorative quote mark */}
              <div className="absolute top-4 right-5 text-[60px] leading-none font-serif text-[var(--color-primary)] opacity-10 select-none pointer-events-none">
                &ldquo;
              </div>

              {/* Quote icon */}
              <svg className="w-8 h-8 text-[var(--color-primary)] opacity-20 mb-3" fill="currentColor" viewBox="0 0 24 24">
                <path d="M14.017 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151c-2.432.917-3.995 3.638-3.995 5.849h4v10H14.017zM0 21v-7.391c0-5.704 3.731-9.57 8.983-10.609l.995 2.151C7.546 6.068 5.983 8.789 5.983 11h4v10H0z" />
              </svg>
              <blockquote className="text-[14px] leading-relaxed text-[var(--color-text-secondary)] mb-4">
                &ldquo;{testimonial.quote}&rdquo;
              </blockquote>
              <figcaption>
                <p className="text-[14px] font-semibold text-[var(--color-text-primary)]">{testimonial.name}</p>
                <p className="text-[12px] text-[var(--color-text-muted)]">{testimonial.role}, {testimonial.company}</p>
              </figcaption>
            </figure>
          ))}
        </div>

        {/* Partner logos placeholder */}
        <div className="mt-14 flex flex-wrap items-center justify-center gap-8 md:gap-12 opacity-40">
          {['TechCorp', 'DataFlow', 'Innovate', 'CloudBase', 'AnalyticsPro'].map((name) => (
            <span key={name} className="text-[14px] font-semibold tracking-wide text-[var(--color-text-muted)] uppercase">
              {name}
            </span>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
