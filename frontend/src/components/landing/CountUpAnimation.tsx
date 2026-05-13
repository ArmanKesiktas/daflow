import { useEffect, useState } from 'react'
import { useScrollAnimation } from '../../hooks/useScrollAnimation'

interface CountUpAnimationProps {
  end: number
  duration?: number
  suffix?: string
  className?: string
}

export default function CountUpAnimation({
  end,
  duration = 2000,
  suffix = '',
  className = '',
}: CountUpAnimationProps) {
  const { ref, isVisible } = useScrollAnimation({ threshold: 0.3 })
  const [count, setCount] = useState(0)

  useEffect(() => {
    if (!isVisible) return

    let startTime: number | null = null
    let animationFrame: number

    const animate = (timestamp: number) => {
      if (!startTime) startTime = timestamp
      const progress = Math.min((timestamp - startTime) / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3) // ease-out cubic
      setCount(Math.floor(eased * end))

      if (progress < 1) {
        animationFrame = requestAnimationFrame(animate)
      }
    }

    animationFrame = requestAnimationFrame(animate)
    return () => cancelAnimationFrame(animationFrame)
  }, [isVisible, end, duration])

  return (
    <span ref={ref as React.RefObject<HTMLSpanElement>} className={className}>
      {count.toLocaleString()}{suffix}
    </span>
  )
}
