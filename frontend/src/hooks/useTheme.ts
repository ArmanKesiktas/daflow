import { useEffect, useRef, useState } from 'react'

type Theme = 'dark' | 'light'

function getInitialTheme(): Theme {
  if (typeof window === 'undefined') return 'dark'
  const stored = localStorage.getItem('theme') as Theme | null
  if (stored === 'light' || stored === 'dark') return stored
  return 'dark' // default: dark
}

function applyTheme(theme: Theme, animate = false) {
  const root = document.documentElement
  const shouldAnimate =
    animate &&
    typeof window !== 'undefined' &&
    !window.matchMedia('(prefers-reduced-motion: reduce)').matches

  if (shouldAnimate) {
    root.classList.add('theme-transition')
  }

  if (theme === 'dark') {
    root.classList.add('dark')
  } else {
    root.classList.remove('dark')
  }
  localStorage.setItem('theme', theme)

  if (shouldAnimate) {
    window.setTimeout(() => {
      root.classList.remove('theme-transition')
    }, 320)
  }
}

export function useTheme() {
  const [theme, setThemeState] = useState<Theme>(getInitialTheme)
  const mountedRef = useRef(false)

  useEffect(() => {
    applyTheme(theme, mountedRef.current)
    mountedRef.current = true
  }, [theme])

  const toggleTheme = () => {
    setThemeState((prev) => (prev === 'dark' ? 'light' : 'dark'))
  }

  const setTheme = (nextTheme: Theme) => {
    setThemeState(nextTheme)
  }

  const isDark = theme === 'dark'

  return { theme, isDark, toggleTheme, setTheme }
}

/** Call once at app root to initialize theme from localStorage before first render */
export function initTheme() {
  applyTheme(getInitialTheme())
}
