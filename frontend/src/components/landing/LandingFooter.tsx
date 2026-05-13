import { useState } from 'react'
import { useI18n } from '../../i18n'
import BrandLogo from '../BrandLogo'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

export default function LandingFooter() {
  const { t } = useI18n()
  const [email, setEmail] = useState('')
  const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle')

  const handleSubscribe = (e: React.FormEvent) => {
    e.preventDefault()
    if (!EMAIL_REGEX.test(email)) {
      setStatus('error')
      return
    }
    // Simulate subscription success
    setStatus('success')
    setEmail('')
    setTimeout(() => setStatus('idle'), 4000)
  }

  const footerLinks = [
    {
      title: t('landing_footer_product'),
      links: [
        { label: 'Workflows', href: '/workflows' },
        { label: 'Dashboards', href: '/dashboards' },
        { label: 'Reports', href: '/reports' },
        { label: 'Templates', href: '/workflows' },
      ],
    },
    {
      title: t('landing_footer_company'),
      links: [
        { label: 'About', href: '/about' },
        { label: 'Blog', href: '/blog' },
        { label: 'Updates', href: '/updates' },
      ],
    },
    {
      title: t('landing_footer_legal'),
      links: [
        { label: t('landing_footer_privacy'), href: '#' },
        { label: t('landing_footer_terms'), href: '#' },
      ],
    },
  ]

  return (
    <footer className="relative border-t border-black/[0.06] dark:border-white/[0.06] bg-white dark:bg-[#161618]">
      {/* Subtle top gradient separator */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-blue-500/20 to-transparent" />

      <div className="max-w-6xl mx-auto px-6 py-14">
        <div className="grid md:grid-cols-[1.2fr_1fr] gap-12 md:gap-8">
          {/* Left: Brand + Newsletter */}
          <div>
            <BrandLogo size="sm" />
            <p className="mt-4 max-w-sm text-[14px] leading-relaxed text-[var(--color-text-secondary)]">
              {t('landing_footer_desc')}
            </p>

            {/* Newsletter */}
            <form onSubmit={handleSubscribe} className="mt-6 flex gap-2 max-w-sm">
              <input
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                  if (status === 'error') setStatus('idle')
                }}
                placeholder={t('landing_footer_newsletter_placeholder')}
                className="flex-1 h-10 px-3.5 rounded-lg border border-black/[0.08] dark:border-white/[0.10] bg-white dark:bg-white/[0.05] text-[14px] text-[var(--color-text-primary)] placeholder:text-[var(--color-text-muted)] focus:outline-none focus:ring-2 focus:ring-blue-500/30 focus:border-blue-500/50 transition-all"
              />
              <button
                type="submit"
                className="h-10 px-4 rounded-lg bg-[var(--color-primary)] hover:bg-[var(--color-primary-hover)] text-white text-[13px] font-semibold transition-colors shrink-0"
              >
                {t('landing_footer_newsletter_submit')}
              </button>
            </form>
            {status === 'success' && (
              <p className="mt-2 text-[13px] text-green-600 dark:text-green-400">
                {t('landing_footer_newsletter_success')}
              </p>
            )}
            {status === 'error' && (
              <p className="mt-2 text-[13px] text-red-500">
                {t('landing_footer_newsletter_error')}
              </p>
            )}
          </div>

          {/* Right: Link columns */}
          <div className="grid grid-cols-2 sm:grid-cols-3 gap-8">
            {footerLinks.map((group) => (
              <div key={group.title}>
                <h4 className="text-[13px] font-semibold text-[var(--color-text-primary)] mb-3">
                  {group.title}
                </h4>
                <ul className="space-y-2">
                  {group.links.map((link) => (
                    <li key={link.label}>
                      <a
                        href={link.href}
                        className="text-[13px] text-[var(--color-text-secondary)] hover:text-[var(--color-text-primary)] transition-colors"
                      >
                        {link.label}
                      </a>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>

        {/* Bottom bar */}
        <div className="mt-12 pt-6 border-t border-black/[0.06] dark:border-white/[0.06] flex flex-col sm:flex-row items-center justify-between gap-4">
          <p className="text-[12px] text-[var(--color-text-muted)]">
            © {new Date().getFullYear()} Daflow. All rights reserved.
          </p>
          {/* Social links */}
          <div className="flex items-center gap-3">
            <SocialLink href="https://twitter.com" label="Twitter">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z"/></svg>
            </SocialLink>
            <SocialLink href="https://linkedin.com" label="LinkedIn">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M20.447 20.452h-3.554v-5.569c0-1.328-.027-3.037-1.852-3.037-1.853 0-2.136 1.445-2.136 2.939v5.667H9.351V9h3.414v1.561h.046c.477-.9 1.637-1.85 3.37-1.85 3.601 0 4.267 2.37 4.267 5.455v6.286zM5.337 7.433c-1.144 0-2.063-.926-2.063-2.065 0-1.138.92-2.063 2.063-2.063 1.14 0 2.064.925 2.064 2.063 0 1.139-.925 2.065-2.064 2.065zm1.782 13.019H3.555V9h3.564v11.452zM22.225 0H1.771C.792 0 0 .774 0 1.729v20.542C0 23.227.792 24 1.771 24h20.451C23.2 24 24 23.227 24 22.271V1.729C24 .774 23.2 0 22.222 0h.003z"/></svg>
            </SocialLink>
            <SocialLink href="https://github.com" label="GitHub">
              <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24"><path d="M12 .297c-6.63 0-12 5.373-12 12 0 5.303 3.438 9.8 8.205 11.385.6.113.82-.258.82-.577 0-.285-.01-1.04-.015-2.04-3.338.724-4.042-1.61-4.042-1.61C4.422 18.07 3.633 17.7 3.633 17.7c-1.087-.744.084-.729.084-.729 1.205.084 1.838 1.236 1.838 1.236 1.07 1.835 2.809 1.305 3.495.998.108-.776.417-1.305.76-1.605-2.665-.3-5.466-1.332-5.466-5.93 0-1.31.465-2.38 1.235-3.22-.135-.303-.54-1.523.105-3.176 0 0 1.005-.322 3.3 1.23.96-.267 1.98-.399 3-.405 1.02.006 2.04.138 3 .405 2.28-1.552 3.285-1.23 3.285-1.23.645 1.653.24 2.873.12 3.176.765.84 1.23 1.91 1.23 3.22 0 4.61-2.805 5.625-5.475 5.92.42.36.81 1.096.81 2.22 0 1.606-.015 2.896-.015 3.286 0 .315.21.69.825.57C20.565 22.092 24 17.592 24 12.297c0-6.627-5.373-12-12-12"/></svg>
            </SocialLink>
          </div>
        </div>
      </div>
    </footer>
  )
}

function SocialLink({ href, label, children }: { href: string; label: string; children: React.ReactNode }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      aria-label={label}
      className="w-8 h-8 rounded-lg flex items-center justify-center text-[var(--color-text-muted)] hover:text-[var(--color-text-primary)] hover:bg-black/[0.04] dark:hover:bg-white/[0.06] transition-colors"
    >
      {children}
    </a>
  )
}
