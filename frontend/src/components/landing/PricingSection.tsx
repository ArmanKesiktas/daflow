import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import SectionWrapper from './SectionWrapper'

interface PricingTier {
  id: 'free' | 'pro' | 'enterprise'
  name: string
  price: string
  period?: string
  features: string[]
  cta: string
  highlighted?: boolean
}

export default function PricingSection() {
  const navigate = useNavigate()
  const { t } = useI18n()

  const tiers: PricingTier[] = [
    {
      id: 'free',
      name: t('landing_pricing_free'),
      price: '$0',
      period: '/month',
      features: [
        t('landing_pricing_free_f1'),
        t('landing_pricing_free_f2'),
        t('landing_pricing_free_f3'),
        t('landing_pricing_free_f4'),
      ],
      cta: t('landing_pricing_cta_free'),
    },
    {
      id: 'pro',
      name: t('landing_pricing_pro'),
      price: '$29',
      period: '/month',
      features: [
        t('landing_pricing_pro_f1'),
        t('landing_pricing_pro_f2'),
        t('landing_pricing_pro_f3'),
        t('landing_pricing_pro_f4'),
        t('landing_pricing_pro_f5'),
        t('landing_pricing_pro_f6'),
      ],
      cta: t('landing_pricing_cta_pro'),
      highlighted: true,
    },
    {
      id: 'enterprise',
      name: t('landing_pricing_enterprise'),
      price: t('landing_pricing_custom'),
      features: [
        t('landing_pricing_ent_f1'),
        t('landing_pricing_ent_f2'),
        t('landing_pricing_ent_f3'),
        t('landing_pricing_ent_f4'),
        t('landing_pricing_ent_f5'),
      ],
      cta: t('landing_pricing_cta_enterprise'),
    },
  ]

  return (
    <SectionWrapper
      id="pricing"
      className="py-20 md:py-28 px-6 bg-gray-50/80 dark:bg-white/[0.02] border-y border-black/[0.06] dark:border-white/[0.06]"
      animation="fade-up"
    >
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="text-center max-w-2xl mx-auto mb-14">
          <h2 className="text-[32px] md:text-[40px] font-bold tracking-tight text-[var(--color-text-primary)]">
            {t('landing_pricing_title')}
          </h2>
          <p className="mt-4 text-[16px] md:text-[18px] text-[var(--color-text-secondary)] leading-relaxed">
            {t('landing_pricing_subtitle')}
          </p>
        </div>

        {/* Pricing cards */}
        <div className="grid md:grid-cols-3 gap-5 md:gap-4 items-stretch">
          {tiers.map((tier) => (
            <div
              key={tier.id}
              className={`relative rounded-2xl border p-7 md:p-8 transition-all duration-300 flex flex-col ${
                tier.highlighted
                  ? 'border-blue-500/50 dark:border-blue-400/40 bg-white dark:bg-white/[0.05] shadow-xl shadow-blue-500/10 scale-[1.02] md:scale-105 z-10 ring-1 ring-blue-500/20'
                  : 'border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-white/[0.03] hover:shadow-md hover:-translate-y-0.5'
              }`}
            >
              {/* Popular badge */}
              {tier.highlighted && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3.5 py-1 rounded-full bg-[var(--color-primary)] text-white text-[11px] font-semibold shadow-lg shadow-blue-500/30">
                  Popular
                </div>
              )}

              {/* Tier name */}
              <h3 className="text-[16px] font-semibold text-[var(--color-text-primary)]">{tier.name}</h3>

              {/* Price */}
              <div className="mt-4 flex items-baseline gap-1">
                <span className="text-[36px] md:text-[42px] font-bold tracking-tight text-[var(--color-text-primary)]">
                  {tier.price}
                </span>
                {tier.period && (
                  <span className="text-[14px] text-[var(--color-text-muted)]">{tier.period}</span>
                )}
              </div>

              {/* Features */}
              <ul className="mt-6 space-y-3 flex-1">
                {tier.features.map((feature) => (
                  <li key={feature} className="flex items-start gap-2.5">
                    <svg className="w-4 h-4 mt-0.5 text-green-500 shrink-0" fill="none" stroke="currentColor" strokeWidth={2.5} viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" d="M4.5 12.75l6 6 9-13.5" />
                    </svg>
                    <span className="text-[14px] text-[var(--color-text-secondary)]">{feature}</span>
                  </li>
                ))}
              </ul>

              {/* CTA */}
              <button
                onClick={() => navigate(`/login?plan=${tier.id}`)}
                className={`mt-8 w-full h-11 rounded-xl text-[14px] font-semibold transition-all ${
                  tier.highlighted
                    ? 'bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white shadow-lg shadow-blue-500/20'
                    : 'bg-black/[0.04] dark:bg-white/[0.06] hover:bg-black/[0.08] dark:hover:bg-white/[0.10] text-[var(--color-text-primary)] border border-black/[0.08] dark:border-white/[0.10]'
                }`}
              >
                {tier.cta}
              </button>
            </div>
          ))}
        </div>
      </div>
    </SectionWrapper>
  )
}
