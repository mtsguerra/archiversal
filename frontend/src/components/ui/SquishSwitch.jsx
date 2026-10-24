import { useEffect, useId, useRef, useState } from 'react'
import { animate, motion, useMotionValue, useSpring, useTransform, useVelocity } from 'motion/react'
import { useReducedMotion } from '../../motionPref.js'
import './SquishSwitch.css'

// After React Bits' SquishSwitch: a two-state switch whose thumb stretches with its speed. The thumb
// is a rounded rectangle and shows the chosen side's label; the other label waits on the track.
const clamp = (value, min, max) => Math.min(max, Math.max(min, value))
const FLOW_SPRING = { stiffness: 320, damping: 40, mass: 0.6 }
const SWELL_SPRING = { stiffness: 520, damping: 34, mass: 0.6 }
const MAX_STRETCH = 0.4
const STRETCH_SPEED = 600
const TAP_SLOP = { fine: 4, coarse: 8 }

/**
 * @param checked    controlled state (true = the on side)
 * @param onChange(checked)
 * @param offLabel   text for the off side; onLabel for the on side
 */
export function SquishSwitch({
  checked,
  onChange,
  offLabel,
  onLabel,
  ariaLabel,
  trackColor = 'var(--chocolate)',
  thumbColor = 'var(--cream)',
  width = 76,
  height = 32,
  radius = 10,
  speed = 50,
  stretch = 36,
  hoverScale = 1.035,
}) {
  const reduce = useReducedMotion()
  const inset = Math.max(3, Math.round(height * 0.11))
  const thumb = height - inset * 2
  const thumbW = Math.round(width / 2 - inset)
  const min = inset
  const max = width - inset - thumbW
  const mid = (min + max) / 2
  const trackRadius = Math.min(radius, height / 2)
  const thumbRadius = Math.max(2, trackRadius - inset)

  const on = checked
  const [dragging, setDragging] = useState(false)
  const trackRef = useRef(null)
  const grip = useRef(null)
  const onRef = useRef(on)
  const skipClick = useRef(false)
  const buttonId = useId()

  useEffect(() => {
    onRef.current = on
  }, [on])

  const x = useMotionValue(on ? max : min)
  const flow = useSpring(useVelocity(x), FLOW_SPRING)
  const swell = useSpring(1, SWELL_SPRING)
  const gain = reduce ? 0 : clamp(stretch, 0, 100) / 100
  const stretchOf = (v) => 1 + Math.min(MAX_STRETCH, Math.abs(v) / STRETCH_SPEED) * gain
  const scaleX = useTransform([flow, swell], ([v, h]) => stretchOf(v) * h)
  const scaleY = useTransform([flow, swell], ([v, h]) => h / stretchOf(v))

  const commit = (next) => {
    if (next === onRef.current) return
    onRef.current = next
    onChange?.(next)
  }

  useEffect(() => {
    if (dragging) return undefined
    const target = on ? max : min
    if (reduce) {
      x.jump(target)
      return undefined
    }
    const controls = animate(x, target, { type: 'spring', stiffness: 170 - (50 - clamp(speed, 0, 100)) * 1.1, damping: 21.5, mass: 0.9, restDelta: 0.001, restSpeed: 0.01 })
    return () => controls.stop()
  }, [on, dragging, min, max, speed, reduce, x])

  const localX = (clientX) => {
    const el = trackRef.current
    if (!el) return 0
    const rect = el.getBoundingClientRect()
    return (clientX - rect.left) / (rect.width / (el.offsetWidth || rect.width) || 1)
  }
  const down = (e) => {
    if (grip.current || e.button !== 0) return
    grip.current = { id: e.pointerId, grab: null, moved: false, startX: e.clientX, onAtPress: onRef.current, slop: e.pointerType === 'touch' ? TAP_SLOP.coarse : TAP_SLOP.fine }
    try {
      e.currentTarget.setPointerCapture(e.pointerId)
    } catch {
      // capture is only a nicety
    }
    setDragging(true)
  }
  const move = (e) => {
    const g = grip.current
    if (!g || g.id !== e.pointerId) return
    const lx = localX(e.clientX)
    if (g.grab === null) {
      g.grab = lx - x.get()
      return
    }
    if (!g.moved && Math.abs(e.clientX - g.startX) > g.slop) g.moved = true
    if (!g.moved) return
    const nx = clamp(lx - g.grab, min, max)
    x.set(nx)
    commit(nx > mid)
  }
  const up = (e, cancelled) => {
    const g = grip.current
    if (!g || g.id !== e.pointerId) return
    grip.current = null
    try {
      e.currentTarget.releasePointerCapture(e.pointerId)
    } catch {
      // already released
    }
    if (cancelled) commit(g.onAtPress)
    else if (!g.moved) commit(!onRef.current)
    skipClick.current = true
    setTimeout(() => {
      skipClick.current = false
    }, 0)
    setDragging(false)
  }
  const click = () => {
    if (skipClick.current) {
      skipClick.current = false
      return
    }
    commit(!onRef.current)
  }

  return (
    <button
      id={buttonId}
      type="button"
      role="switch"
      aria-checked={on}
      aria-label={ariaLabel}
      className="squish-switch"
      data-on={on ? '' : undefined}
      data-held={dragging ? '' : undefined}
      data-sound="toggle"
      style={{
        '--ss-w': `${width}px`,
        '--ss-h': `${height}px`,
        '--ss-inset': `${inset}px`,
        '--ss-thumb': `${thumb}px`,
        '--ss-thumb-w': `${thumbW}px`,
        '--ss-r': `${trackRadius}px`,
        '--ss-thumb-r': `${thumbRadius}px`,
        '--ss-track': trackColor,
        '--ss-thumb-color': thumbColor,
      }}
      onPointerDown={down}
      onPointerMove={move}
      onPointerUp={(e) => up(e, false)}
      onPointerCancel={(e) => up(e, true)}
      onPointerEnter={(e) => e.pointerType === 'mouse' && swell.set(hoverScale)}
      onPointerLeave={() => swell.set(1)}
      onKeyDown={(e) => e.key === 'Escape' && grip.current && up({ pointerId: grip.current.id, currentTarget: e.currentTarget }, true)}
      onClick={click}
    >
      <span ref={trackRef} className="squish-switch__track">
        <span className="squish-switch__side squish-switch__side--off" aria-hidden="true">
          {offLabel}
        </span>
        <span className="squish-switch__side squish-switch__side--on" aria-hidden="true">
          {onLabel}
        </span>
        <motion.span className="squish-switch__thumb" aria-hidden="true" style={{ x, scaleX, scaleY }}>
          {on ? onLabel : offLabel}
        </motion.span>
      </span>
    </button>
  )
}
