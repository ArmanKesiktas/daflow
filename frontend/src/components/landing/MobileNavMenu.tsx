import { useI18n } from '../../i18n'
import ThemeToggle from '../ThemeToggle'

interface MobileNavMenuProps {
  isOpen: boolean
  onClose: () => void
  onSectionClick: (sectionId: string) => void
  onNavigate: (path: string) => void
}

export default function MobileNavMenu({
  isOpen,
  onClose,
  onSectionClick,
  onNavigate,
}: MobileNavMenuProps) {
  const { t, lang, setLang } = useI18n()

  const sections = [
    { id: 'features', label: t('landing_features') },
    { id: 'how-it-works', label: t('landing_howItWorks') },
    { id: 'pricing', label: t('landing_pricing') },
  ]

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[60] md:hidden">
      {/* Backdrop */}
      <div
        className="absolute inset-0 bg-black/40 backdrop-blur-sm"
        onClick={onClose}
      />

      {/* Menu panel */}
      <div className="absolute top-0 right-0 w-[280px] h-full bg-white dark:bg-[#1C1C1E] shadow-xl overflow-y-auto">
        <div className="p-5">
          {/* Close button */}
          <button
            onClick={onClose}
            className="absolute top-4 right-4 w-8 h-8 flex items-center justify-center rounded-md hover:bg-black/5 dark:hover:bg-white/10 text-[var(--color-text-primary)]"
            aria-label="Close menu"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" strokeWidth={2} viewBox="0 0 24 24">
              <path strokeLinecap="round" d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>

          {/* Section links */}
          <nav className="mt-10 space-y-1">
            {sections.map((section) => (
              <button
                key={section.id}
                onClick={() => {
                  onSectionClick(section.id)
                  onClose()
                }}
                className="w-full text-left px-3 py-2.5 rounded-lg text-[15px] font-medium text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
              >
                {section.label}
              </button>
            ))}
          </nav>

          {/* Divider */}
          <div className="my-5 h-px bg-black/[0.06] dark:bg-white/[0.06]" />

          {/* Language switcher */}
          <div className="flex items-center gap-2 px-3 mb-4">
            <span className="text-[13px] text-[var(--color-text-secondary)] mr-auto">Language</span>
            <div className="flex rounded-lg overflow-hidden border border-black/[0.08] dark:border-white/[0.08]">
              {(['en', 'tr'] as const).map((item) => (
                <button
                  key={item}
                  onClick={() => setLang(item)}
                  className={`px-3 py-1.5 text-[12px] font-medium transition-colors ${
                    lang === item
                      ? 'bg-[var(--color-primary)] text-white'
                      : 'text-[var(--color-text-secondary)] hover:bg-black/5 dark:hover:bg-white/5'
                  }`}
                >
                  {item.toUpperCase()}
                </button>
              ))}
            </div>
          </div>

          {/* Theme toggle */}
          <div className="flex items-center gap-2 px-3 mb-6">
            <span className="text-[13px] text-[var(--color-text-secondary)] mr-auto">Theme</span>
            <ThemeToggle />
          </div>

          {/* Auth buttons */}
          <div className="space-y-2 px-3">
            <button
              onClick={() => {
                onNavigate('/login')
                onClose()
              }}
              className="w-full h-10 rounded-lg border border-black/[0.08] dark:border-white/[0.10] text-[14px] font-medium text-[var(--color-text-primary)] hover:bg-black/5 dark:hover:bg-white/5 transition-colors"
            >
              {t('landing_login')}
            </button>
            <button
              onClick={() => {
                onNavigate('/login')
                onClose()
              }}
              className="w-full h-10 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[14px] font-medium transition-colors"
            >
              {t('landing_signUp')}
            </button>
          </div>
        </div>
      </div>
    </div>
  )
}
