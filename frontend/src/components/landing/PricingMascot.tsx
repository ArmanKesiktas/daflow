import { useEffect, useState } from 'react'

/**
 * Animated mascot for the Pricing section.
 *
 * Cycles between "ballholding" (900ms) and "ballthrow" (500ms) poses in a loop.
 * Positioned absolutely relative to the Pro tier card, near the CTA button.
 * The throw gesture direction points toward the "Start Pro Trial" button.
 *
 * On mobile (< 768px), the mascot is scaled down by 40% via max-md:scale-60.
 */

type Pose = 'ballholding' | 'ballthrow'

const HOLD_DURATION = 900
const THROW_DURATION = 500

export default function PricingMascot() {
  const [pose, setPose] = useState<Pose>('ballholding')

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>

    const cycle = () => {
      setPose((current) => {
        const next: Pose = current === 'ballholding' ? 'ballthrow' : 'ballholding'
        const duration = current === 'ballholding' ? HOLD_DURATION : THROW_DURATION
        timeout = setTimeout(cycle, duration)
        return next
      })
    }

    // Start the first transition after the initial hold duration
    timeout = setTimeout(cycle, HOLD_DURATION)

    return () => clearTimeout(timeout)
  }, [])

  const imgSrc =
    pose === 'ballholding'
      ? '/mascot/ballholding.png'
      : '/mascot/ballthrow.png'

  return (
    <div
      className="absolute -bottom-4 -right-6 md:-bottom-6 md:-right-10 z-20 max-md:scale-60 origin-bottom-right pointer-events-none"
      aria-hidden="true"
    >
      <div className="w-20 h-20 md:w-28 md:h-28">
        <img
          src={imgSrc}
          alt=""
          className="w-full h-full object-contain drop-shadow-lg"
          style={{
            transform: pose === 'ballthrow' ? 'scaleX(-1)' : 'none',
            transition: 'transform 100ms ease-in-out',
          }}
          draggable={false}
        />
      </div>
    </div>
  )
}
