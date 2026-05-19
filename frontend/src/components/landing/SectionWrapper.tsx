import { useEffect, useState } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

type AnimationType = 'fade-up' | 'fade-in' | 'stagger' | 'scale-up' | 'parallax' | 'stagger-children'

interface SectionWrapperProps {
  children: React.ReactNode
  id?: string
  className?: string
  animation?: AnimationType
  staggerDelay?: number
}

/**
 * Detects if viewport is mobile (<768px).
 * Used to reduce animation intensity by 50% on mobile for performance.
 */
function useIsMobile(): boolean {
  const [isMobile, setIsMobile] = useState(false)

  useEffect(() => {
    const checkMobile = () => setIsMobile(window.innerWidth < 768)
    checkMobile()

    const mediaQuery = window.matchMedia('(max-width: 767px)')
    const handler = (e: MediaQueryListEvent) => setIsMobile(e.matches)
    mediaQuery.addEventListener('change', handler)
    return () => mediaQuery.removeEventListener('change', handler)
  }, [])

  return isMobile
}

export default function SectionWrapper({
  children,
  id,
  className = '',
  animation = 'fade-up',
}: SectionWrapperProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })
  const isMobile = useIsMobile()

  // Mobile: reduce animation intensity by 50% (scale from 0.96 instead of 0.92)
  const scaleFrom = isMobile ? 'scale-[0.96]' : 'scale-[0.92]'
  const translateParallax = isMobile ? 'translate-y-8' : 'translate-y-16'

  const animationClasses: Record<AnimationType, string> = {
    'fade-up': `transition-[transform,opacity] duration-700 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`,
    'fade-in': `transition-opacity duration-700 ease-out ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`,
    'stagger': `transition-[transform,opacity] duration-700 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
    }`,
    'scale-up': `transition-[transform,opacity] duration-700 ease-out ${
      isVisible ? 'opacity-100 scale-100' : `opacity-0 ${scaleFrom}`
    }`,
    'parallax': `transition-[transform,opacity] duration-1000 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : `opacity-0 ${translateParallax}`
    }`,
    'stagger-children': `transition-[transform,opacity] duration-700 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
    }`,
  }

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={`${animationClasses[animation]} ${className}`}
      style={{ willChange: 'transform, opacity' }}
    >
      {children}
    </section>
  )
}
