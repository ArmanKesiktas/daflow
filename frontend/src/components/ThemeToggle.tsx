import { useTheme } from '../hooks/useTheme'

interface ThemeToggleProps {
  title?: string
}

export default function ThemeToggle({ title }: ThemeToggleProps) {
  const { isDark, toggleTheme } = useTheme()

  const label = isDark ? 'Switch to light mode' : 'Switch to dark mode'

  return (
    <button
      onClick={toggleTheme}
      className={[
        // Base — ghost button with 28×28 tap target (IconButton pattern)
        'inline-flex items-center justify-center',
        'min-w-7 min-h-7 w-7 h-7',
        'rounded-md',
        // Colors using semantic tokens
        'text-[var(--color-text-secondary)]',
        'bg-transparent',
        'hover:text-[var(--color-text-primary)]',
        'hover:bg-black/[0.05] dark:hover:bg-white/[0.07]',
        // Active state
        'active:scale-[0.97]',
        // Focus ring for keyboard navigation
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary/40',
        // Transition
        'transition-all duration-150',
      ].join(' ')}
      aria-label={label}
      title={title || label}
    >
      {isDark ? <SunIcon /> : <MoonIcon />}
    </button>
  )
}

function SunIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <circle cx="12" cy="12" r="4" />
      <path strokeLinecap="round" d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41" />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg className="w-4 h-4" fill="none" stroke="currentColor" strokeWidth={1.8} viewBox="0 0 24 24">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79Z" />
    </svg>
  )
}
