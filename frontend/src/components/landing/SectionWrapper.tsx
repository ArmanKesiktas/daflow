import { useScrollAnimation } from '../../hooks/useScrollAnimation'

interface SectionWrapperProps {
  children: React.ReactNode
  id?: string
  className?: string
  animation?: 'fade-up' | 'fade-in' | 'stagger'
  staggerDelay?: number
}

export default function SectionWrapper({
  children,
  id,
  className = '',
  animation = 'fade-up',
}: SectionWrapperProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.1 })

  const animationClasses = {
    'fade-up': `transition-all duration-700 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-8'
    }`,
    'fade-in': `transition-all duration-700 ease-out ${
      isVisible ? 'opacity-100' : 'opacity-0'
    }`,
    'stagger': `transition-all duration-700 ease-out ${
      isVisible ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-6'
    }`,
  }

  return (
    <section
      ref={ref as React.RefObject<HTMLElement>}
      id={id}
      className={`${animationClasses[animation]} ${className}`}
    >
      {children}
    </section>
  )
}
