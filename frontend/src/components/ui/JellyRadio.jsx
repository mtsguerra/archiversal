import { forwardRef, useEffect, useLayoutEffect, useRef } from 'react'
import { animate, motion, motionValue, useTransform } from 'motion/react'
import { useReducedMotion } from '../../motionPref.js'
import './JellyRadio.css'

// After React Bits' JellyRadio: the chosen chip swells like jelly and shoves its neighbours aside.
const SIZES = { sm: [28, 12, 12], md: [36, 13, 16], lg: [44, 14, 20] }

const spring = (k, m, bounce) => ({ type: 'spring', stiffness: k, damping: 2 * Math.sqrt(k * m) * (1 - bounce), mass: m })

const Chip = forwardRef(function Chip({ mv, children, ...rest }, ref) {
  const transform = useTransform(() => `translateX(${mv.x.get()}px) scale(${mv.sx.get()}, ${mv.sy.get()})`)
  return (
    <motion.button ref={ref} style={{ transform }} {...rest}>
      {children}
    </motion.button>
  )
})

/**
 * @param items     [{ value, label, icon? }]
 * @param value     the chosen value (controlled)
 * @param onChange(value, index)
 */
export function JellyRadio({
  items,
  value,
  onChange,
  chipColor = 'var(--paper)',
  activeColor = 'var(--ink)',
  textColor = 'var(--ink)',
  activeTextColor = 'var(--paper)',
  size = 'md',
  gap = 6,
  radius = 6,
  swell = 0.12,
  barge = 4,
  shrink = 0.03,
  jelly = 1,
  bounce = 0.25,
  stagger = 22,
  stiffness = 580,
  ariaLabel,
  className = '',
}) {
  const at = Math.max(0, items.findIndex((it) => it.value === value))
  const reduce = useReducedMotion()
  const groupRef = useRef(null)
  const chipRefs = useRef([])
  const widths = useRef([])
  const mvs = useRef([])
  const applied = useRef(at)
  const cfg = useRef({})
  const [h, font, px] = SIZES[size] ?? SIZES.md
  const itemsKey = items.map((it) => it.value).join('|')

  useEffect(() => {
    cfg.current = { swell, barge, shrink, jelly, bounce, stagger, stiffness, reduce, count: items.length }
  })

  const mvFor = (i) => (mvs.current[i] ??= { x: motionValue(0), sx: motionValue(1), sy: motionValue(1) })

  const apply = (sel, instant) => {
    const C = cfg.current
    const rtl = groupRef.current ? getComputedStyle(groupRef.current).direction === 'rtl' : false
    const push = ((widths.current[sel] ?? 0) * C.swell) / 2 + C.barge
    for (let i = 0; i < C.count; i++) {
      const mv = mvFor(i)
      const far = Math.abs(i - sel)
      const x = Math.sign(i - sel) * (rtl ? -1 : 1) * push
      const s = i === sel ? 1 + C.swell : 1 - C.shrink
      if (instant || C.reduce) {
        mv.x.jump(x)
        mv.sx.jump(s)
        mv.sy.jump(s)
        continue
      }
      const k = C.stiffness * (1 - 0.12 * Math.min(far, 3))
      const inFlight = mv.x.isAnimating() || mv.sx.isAnimating() || mv.sy.isAnimating()
      const delay = inFlight ? 0 : (far * C.stagger) / 1000
      const j = C.jelly
      animate(mv.x, x, { ...spring(k, 0.9, C.bounce), delay })
      animate(mv.sx, s, { ...spring(k * (1 + 0.24 * j), 0.9 - 0.1 * j, Math.min(0.85, C.bounce + 0.3 * j)), delay })
      animate(mv.sy, s, { ...spring(k * (1 - 0.14 * j), 0.9 + 0.05 * j, C.bounce), delay: delay + 0.05 * j })
    }
  }

  // The room the swollen chip needs is padding on the group, so nothing is clipped.
  useLayoutEffect(() => {
    const group = groupRef.current
    const settle = () => {
      widths.current = chipRefs.current.map((el) => el?.offsetWidth ?? 0)
      const chipH = chipRefs.current[0]?.offsetHeight ?? 0
      const maxW = Math.max(0, ...widths.current)
      group.style.setProperty('--jr-pad-x', `${Math.ceil((maxW * swell * 1.3) / 2 + barge) + 2}px`)
      group.style.setProperty('--jr-pad-y', `${Math.ceil((chipH * swell) / 2) + 2}px`)
      apply(applied.current, true)
    }
    settle()
    const observer = new ResizeObserver(settle)
    observer.observe(group)
    document.fonts?.ready.then(settle)
    return () => observer.disconnect()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [itemsKey, size, gap, swell, barge, shrink])

  useEffect(() => {
    if (applied.current === at) return
    applied.current = at
    apply(at, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [at])

  useEffect(
    () => () =>
      mvs.current.forEach((mv) => {
        mv.x.destroy()
        mv.sx.destroy()
        mv.sy.destroy()
      }),
    [],
  )

  const commit = (i, instant) => {
    if (i === at || !items[i]) return
    applied.current = i
    apply(i, instant)
    onChange?.(items[i].value, i)
  }
  const onKeyDown = (e, i) => {
    const n = items.length
    const next = { ArrowRight: (i + 1) % n, ArrowDown: (i + 1) % n, ArrowLeft: (i - 1 + n) % n, ArrowUp: (i - 1 + n) % n, Home: 0, End: n - 1, ' ': i, Enter: i }[e.key]
    if (next === undefined) return
    e.preventDefault()
    commit(next, true)
    chipRefs.current[next]?.focus()
  }

  return (
    <div
      ref={groupRef}
      role="radiogroup"
      aria-label={ariaLabel}
      className={`jelly-radio${className ? ` ${className}` : ''}`}
      style={{
        '--jr-chip': chipColor,
        '--jr-active': activeColor,
        '--jr-text': textColor,
        '--jr-active-text': activeTextColor,
        '--jr-gap': `${gap}px`,
        '--jr-radius': `${radius}px`,
        '--jr-h': `${h}px`,
        '--jr-font': `${font}px`,
        '--jr-px': `${px}px`,
      }}
    >
      {items.map((it, i) => (
        <Chip
          key={it.value}
          mv={mvFor(i)}
          ref={(el) => {
            chipRefs.current[i] = el
          }}
          type="button"
          role="radio"
          aria-checked={i === at}
          tabIndex={i === at ? 0 : -1}
          className="jelly-radio__chip"
          data-on={i === at ? 'true' : 'false'}
          data-sound="choose"
          onClick={(e) => commit(i, e.detail === 0)}
          onKeyDown={(e) => onKeyDown(e, i)}
        >
          <span className="jelly-radio__skin">
            {it.icon ? <span className="jelly-radio__icon">{it.icon}</span> : null}
            <span className="jelly-radio__label">{it.label}</span>
          </span>
        </Chip>
      ))}
    </div>
  )
}
