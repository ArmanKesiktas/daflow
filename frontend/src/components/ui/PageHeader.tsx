import React from 'react'
import { useNavigate } from 'react-router-dom'

export interface PageHeaderProps {
  title: string
  subtitle?: string
  backTo?: string
  actions?: React.ReactNode
}

/** Inline ChevronLeft icon at 16px */
function ChevronLeftIcon() {
  return (
    <svg
      width="16"
      height="16"
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.8}
      strokeLinecap="round"
      strokeLinejoin="round"
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

export const PageHeader: React.FC<PageHeaderProps> = ({
  title,
  subtitle,
  backTo,
  actions,
}) => {
  const navigate = useNavigate()

  return (
    <div className="flex items-center justify-between py-4">
      {/* Left side: back button + title */}
      <div className="flex items-center gap-3">
        {backTo && (
          <button
            type="button"
            onClick={() => navigate(backTo)}
            aria-label="Go back"
            className={[
              'inline-flex items-center justify-center',
              'w-7 h-7 rounded-sm',
              'bg-transparent text-[var(--color-text-primary)]',
              'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
              'transition-all duration-150',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
            ].join(' ')}
          >
            <ChevronLeftIcon />
          </button>
        )}
        <div>
          <h1 className="text-xl font-bold leading-7 text-[var(--color-text-primary)]">
            {title}
          </h1>
          {subtitle && (
            <p className="text-[13px] text-[var(--color-text-secondary)] mt-0.5">
              {subtitle}
            </p>
          )}
        </div>
      </div>

      {/* Right side: actions */}
      {actions && <div className="flex items-center gap-2">{actions}</div>}
    </div>
  )
}

PageHeader.displayName = 'PageHeader'

export default PageHeader
