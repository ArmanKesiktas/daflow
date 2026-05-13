import { useEffect, useRef, useState } from 'react'

/**
 * Animated mascot that sits on the top-right of the hero mockup.
 *
 * Idle cycle: center → (throw) → walk → left → (throw) → walk → center →
 *             (throw) → walk → right → (throw) → walk → back to center.
 *
 * Drag interaction:
 *   - Press and hold on the mascot, then move the cursor → mascot follows the
 *     cursor (as if you're holding it in the air). Pose becomes `air`.
 *   - Release the mouse → the mascot smoothly returns to its current idle
 *     position and resumes walking/throwing.
 */

type Pose = 'ballholding' | 'ballthrow' | 'walkleft1' | 'walkleft2' | 'walkright1' | 'walkright2' | 'air'
type Position = 'far-left' | 'left-to-farleft-1' | 'left-to-farleft-2' | 'left-to-farleft-3' | 'left' | 'center-to-left-1' | 'center-to-left-2' | 'center-to-left-3' | 'left-to-center-1' | 'left-to-center-2' | 'left-to-center-3' | 'farleft-to-left-1' | 'farleft-to-left-2' | 'farleft-to-left-3' | 'center' | 'center-to-right-1' | 'center-to-right-2' | 'center-to-right-3' | 'right-to-center-1' | 'right-to-center-2' | 'right-to-center-3' | 'right'

interface Step {
  pose: Pose
  position: Position
  duration: number
}

const SEQUENCE: Step[] = [
  // Center — hold & throw (stay still)
  { pose: 'ballholding', position: 'center', duration: 900 },
  { pose: 'ballthrow', position: 'center', duration: 550 },
  { pose: 'ballholding', position: 'center', duration: 500 },
  // Walk left to "left" (each frame moves a bit)
  { pose: 'walkleft1', position: 'center-to-left-1', duration: 250 },
  { pose: 'walkleft2', position: 'center-to-left-2', duration: 250 },
  { pose: 'walkleft1', position: 'center-to-left-3', duration: 250 },
  { pose: 'walkleft2', position: 'left', duration: 250 },
  // Left — hold & throw (stay still)
  { pose: 'ballholding', position: 'left', duration: 900 },
  { pose: 'ballthrow', position: 'left', duration: 550 },
  { pose: 'ballholding', position: 'left', duration: 500 },
  // Walk left to "far-left"
  { pose: 'walkleft1', position: 'left-to-farleft-1', duration: 250 },
  { pose: 'walkleft2', position: 'left-to-farleft-2', duration: 250 },
  { pose: 'walkleft1', position: 'left-to-farleft-3', duration: 250 },
  { pose: 'walkleft2', position: 'far-left', duration: 250 },
  // Far-left — hold & throw (stay still)
  { pose: 'ballholding', position: 'far-left', duration: 900 },
  { pose: 'ballthrow', position: 'far-left', duration: 550 },
  { pose: 'ballholding', position: 'far-left', duration: 500 },
  // Walk right to "left"
  { pose: 'walkright1', position: 'farleft-to-left-1', duration: 250 },
  { pose: 'walkright2', position: 'farleft-to-left-2', duration: 250 },
  { pose: 'walkright1', position: 'farleft-to-left-3', duration: 250 },
  { pose: 'walkright2', position: 'left', duration: 250 },
  // Left — hold & throw
  { pose: 'ballholding', position: 'left', duration: 900 },
  { pose: 'ballthrow', position: 'left', duration: 550 },
  { pose: 'ballholding', position: 'left', duration: 500 },
  // Walk right to "center"
  { pose: 'walkright1', position: 'left-to-center-1', duration: 250 },
  { pose: 'walkright2', position: 'left-to-center-2', duration: 250 },
  { pose: 'walkright1', position: 'left-to-center-3', duration: 250 },
  { pose: 'walkright2', position: 'center', duration: 250 },
  // Center — hold & throw
  { pose: 'ballholding', position: 'center', duration: 900 },
  { pose: 'ballthrow', position: 'center', duration: 550 },
  { pose: 'ballholding', position: 'center', duration: 500 },
  // Walk right to "right"
  { pose: 'walkright1', position: 'center-to-right-1', duration: 250 },
  { pose: 'walkright2', position: 'center-to-right-2', duration: 250 },
  { pose: 'walkright1', position: 'center-to-right-3', duration: 250 },
  { pose: 'walkright2', position: 'right', duration: 250 },
  // Right — hold & throw
  { pose: 'ballholding', position: 'right', duration: 900 },
  { pose: 'ballthrow', position: 'right', duration: 550 },
  { pose: 'ballholding', position: 'right', duration: 500 },
  // Walk left back to "center"
  { pose: 'walkleft1', position: 'right-to-center-1', duration: 250 },
  { pose: 'walkleft2', position: 'right-to-center-2', duration: 250 },
  { pose: 'walkleft1', position: 'right-to-center-3', duration: 250 },
  { pose: 'walkleft2', position: 'center', duration: 250 },
]

const POSITION_OFFSETS: Record<Position, number> = {
  'far-left': -128,
  'left-to-farleft-1': -80,
  'left-to-farleft-2': -96,
  'left-to-farleft-3': -112,
  'left': -64,
  'center-to-left-1': -16,
  'center-to-left-2': -32,
  'center-to-left-3': -48,
  'left-to-center-1': -48,
  'left-to-center-2': -32,
  'left-to-center-3': -16,
  'farleft-to-left-1': -112,
  'farleft-to-left-2': -96,
  'farleft-to-left-3': -80,
  'center': 0,
  'center-to-right-1': 16,
  'center-to-right-2': 32,
  'center-to-right-3': 48,
  'right-to-center-1': 48,
  'right-to-center-2': 32,
  'right-to-center-3': 16,
  'right': 64,
}

export default function HeroMascot() {
  const [step, setStep] = useState(0)

  // Drag state
  const [isDragging, setIsDragging] = useState(false)
  const [dragDelta, setDragDelta] = useState<{ dx: number; dy: number }>({ dx: 0, dy: 0 })
  const dragStart = useRef<{ x: number; y: number } | null>(null)

  // Idle animation loop (pauses while dragging)
  useEffect(() => {
    if (isDragging) return
    const timer = setTimeout(() => {
      setStep((s) => (s + 1) % SEQUENCE.length)
    }, SEQUENCE[step].duration)
    return () => clearTimeout(timer)
  }, [step, isDragging])

  // Global mouse listeners for drag
  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!dragStart.current) return
      setDragDelta({
        dx: e.clientX - dragStart.current.x,
        dy: e.clientY - dragStart.current.y,
      })
    }
    const handleMouseUp = () => {
      dragStart.current = null
      setIsDragging(false)
      setDragDelta({ dx: 0, dy: 0 })
    }
    window.addEventListener('mousemove', handleMouseMove)
    window.addEventListener('mouseup', handleMouseUp)
    return () => {
      window.removeEventListener('mousemove', handleMouseMove)
      window.removeEventListener('mouseup', handleMouseUp)
    }
  }, [])

  const current = SEQUENCE[step]

  // Each step already has its exact position — no need to compute "next"
  const offsetX = isDragging ? dragDelta.dx : POSITION_OFFSETS[current.position]
  const offsetY = isDragging ? dragDelta.dy : 0

  const transition = isDragging
    ? 'none'
    : 'transform 250ms linear'

  // Active pose
  const pose: Pose = isDragging ? 'air' : current.pose

  const imgSrc =
    pose === 'ballholding'
      ? '/mascot/ballholding.png'
      : pose === 'ballthrow'
      ? '/mascot/ballthrow.png'
      : pose === 'air'
      ? '/mascot/air.png'
      : pose === 'walkleft1'
      ? '/mascot/walkingleft.png'
      : pose === 'walkleft2'
      ? '/mascot/walkingleft2.png'
      : pose === 'walkright1'
      ? '/mascot/walkingright.png'
      : '/mascot/walkingright2.png'

  const flipHorizontal = false

  return (
    <div
      className="pointer-events-none absolute -top-20 md:-top-28 right-20 md:right-24 z-30"
      style={{
        transform: `translate(${offsetX}px, ${offsetY}px)`,
        transition,
        willChange: 'transform',
      }}
      aria-hidden="true"
    >
      <div
        className={`pointer-events-auto relative w-20 h-20 md:w-28 md:h-28 select-none ${
          isDragging ? 'cursor-grabbing' : 'cursor-grab'
        }`}
        onMouseDown={(e) => {
          e.preventDefault()
          dragStart.current = { x: e.clientX - (isDragging ? dragDelta.dx : POSITION_OFFSETS[current.position]), y: e.clientY - (isDragging ? dragDelta.dy : 0) }
          setIsDragging(true)
        }}
      >
        <img
          src={imgSrc}
          alt=""
          className="absolute inset-0 w-full h-full object-contain pointer-events-none"
          style={{ transform: flipHorizontal ? 'scaleX(-1)' : 'none' }}
          draggable={false}
        />
      </div>
    </div>
  )
}
