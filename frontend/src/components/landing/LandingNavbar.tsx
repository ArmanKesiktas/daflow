import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useI18n } from '../../i18n'
import BrandLogo from '../BrandLogo'
import ThemeToggle from '../ThemeToggle'
import MobileNavMenu from './MobileNavMenu'

interface LandingNavbarProps {
  onSectionClick: (sectionId: string) => void
}

export default function LandingNavbar({ onSectionClick }: LandingNavbarProps) {
  const navigate = useNavigate()
  const { t, lang, setLang } = useI18n()
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)

  const sections = [
    { id: 'features', label: t('landing_features') },
    { id: 'showcase', label: t('landing_showcase_tab_workflow') },
    { id: 'how-it-works', label: t('landing_howItWorks') },
  ]

  return (
    <>
      <nav className="fixed top-0 left-0 right-0 z-50 h-14 px-5 md:px-8 flex items-center bg-white/80 dark:bg-[#111113]/80 backdrop-blur-xl border-b border-black/[0.06] dark:border-white/[0.06]">
        {/* Left: Logo */}
        <button onClick={() => {
          if (window.location.pathname !== '/') {
            navigate('/')
          } else {
            window.scrollTo({ top: 0, behavior: 'smooth' })
          }
        }} className="inline-flex items-center shrink-0">
          <BrandLogo size="sm" />
        </button>

        {/* Center: Section links (desktop) — absolutely centered */}
        <div className="hidden md:flex items-center gap-1 absolute left-1/2 -translate-x-1/2">
          {sections.map((section) => (
            <button
              key={section.id}
              onClick={() => onSectionClick(section.id)}
              className="h-8 px-3 rounded-md text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
            >
              {section.label}
            </button>
          ))}
          <button
            onClick={() => navigate('/pricing')}
            className="h-8 px-3 rounded-md text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            {t('landing_pricing')}
          </button>
        </div>

        {/* Right: Controls */}
        <div className="flex items-center gap-2 ml-auto">
          {/* Language switcher (desktop) */}
          <div className="hidden md:flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
            {(['en', 'tr'] as const).map((item) => (
              <button
                key={item}
                onClick={() => setLang(item)}
                className={`px-2.5 py-1 text-[11px] font-medium transition-colors ${
                  lang === item
                    ? 'bg-[var(--color-primary)] text-white'
                    : 'text-[var(--color-text-secondary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.05]'
                }`}
              >
                {item.toUpperCase()}
              </button>
            ))}
          </div>

          {/* Theme toggle (desktop) */}
          <div className="hidden md:block">
            <ThemeToggle />
          </div>

          {/* Login button (desktop) */}
          <button
            onClick={() => navigate('/login')}
            className="hidden md:inline-flex h-8 px-3 items-center rounded-md text-[13px] font-medium text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
          >
            {t('landing_login')}
          </button>

          {/* Sign up button (desktop) */}
          <button
            onClick={() => navigate('/login')}
            className="hidden md:inline-flex h-8 px-4 items-center rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[13px] font-medium transition-colors"
          >
            {t('landing_signUp')}
          </button>

          {/* Hamburger (mobile) */}
          <button
            onClick={() => setMobileMenuOpen(true)}
            className="md:hidden w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[var(--color-text-primary)]"
            aria-label="Open menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
          </button>
        </div>
      </nav>

      <MobileNavMenu
        isOpen={mobileMenuOpen}
        onClose={() => setMobileMenuOpen(false)}
        onSectionClick={onSectionClick}
        onNavigate={navigate}
      />
    </>
  )
}
