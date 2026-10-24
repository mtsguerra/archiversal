import { useEffect, useRef } from 'react'
import styles from './icons.module.css'
import { isReduced } from '../../motionPref.js'

// Button icons that move when their button is hovered or focused (the rule is in icons.module.css:
// a hovered control sets --on to 1 and each part reacts). Same props as the lucide icons they replace.
function Svg({ className = '', strokeWidth = 1.75, svgRef, children }) {
  return (
    <svg ref={svgRef} className={`${styles.icon} ${className}`} viewBox="0 0 24 24" strokeWidth={strokeWidth} aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

const part = (...names) => [styles.part, ...names.map((n) => styles[n])].join(' ')

// Each arrowhead rides back along its own strand and returns (SMIL, so it follows the curves and turns
// with them). The paths are the strands read backwards from the arrowhead, in coordinates relative to it.
const RIDE_UP = 'M0 0 h-5.973 a4 4 0 0 0 -3.3 1.7 l-5.454 8.6 a4 4 0 0 1 -3.3 1.7 h-1.973'
const RIDE_DOWN = 'M0 0 h-6.041 a4 4 0 0 1 -3.3 -1.8 l-.359 -.45 l-4.728 -7.55 a4 4 0 0 0 -3.6 -2.2 h-1.972'
const EASE = { calcMode: 'spline', keyTimes: '0;0.5;1', keyPoints: '0;1;0', keySplines: '0.4 0 0.2 1;0.4 0 0.2 1' }

/** Two strands with an arrowhead each: on hover the heads travel along their strand, one down and one up, and come back. */
export function ShuffleIcon(props) {
  const svg = useRef(null)
  const heads = useRef([])

  useEffect(() => {
    const control = svg.current?.closest('button, a, [role="button"]')
    if (!control) return
    const ride = () => {
      if (isReduced()) return
      if (control.disabled || control.getAttribute('aria-disabled') === 'true') return
      heads.current.forEach((head) => head?.beginElement?.())
    }
    control.addEventListener('mouseenter', ride)
    control.addEventListener('focus', ride)
    return () => {
      control.removeEventListener('mouseenter', ride)
      control.removeEventListener('focus', ride)
    }
  }, [])

  return (
    <Svg {...props} svgRef={svg}>
      <path d="M2 18h1.973a4 4 0 0 0 3.3-1.7l5.454-8.6a4 4 0 0 1 3.3-1.7H22" />
      <path d="M2 6h1.972a4 4 0 0 1 3.6 2.2" />
      <path d="M22 18h-6.041a4 4 0 0 1-3.3-1.8l-.359-.45" />
      <g transform="translate(22 6)">
        <g>
          <animateMotion ref={(el) => (heads.current[0] = el)} begin="indefinite" dur="0.9s" rotate="auto-reverse" path={RIDE_UP} {...EASE} />
          <path d="m-4 -4 4 4 -4 4" />
        </g>
      </g>
      <g transform="translate(22 18)">
        <g>
          <animateMotion ref={(el) => (heads.current[1] = el)} begin="indefinite" dur="0.9s" rotate="auto-reverse" path={RIDE_DOWN} {...EASE} />
          <path d="m-4 -4 4 4 -4 4" />
        </g>
      </g>
    </Svg>
  )
}

/** A bulb that lights: a warm glow and fill come up, and it gives a small wiggle. */
export function BulbIcon(props) {
  return (
    <Svg {...props}>
      <circle className={part('glow')} cx="12" cy="9" r="9" />
      <g className={part('bulb')}>
        <path className={part('bulbBody')} d="M15 14c.2-1 .7-1.7 1.5-2.5 1-.9 1.5-2.2 1.5-3.5A6 6 0 0 0 6 8c0 1 .2 2.2 1.5 3.5.7.7 1.3 1.5 1.5 2.5" />
        <path d="M9 18h6" />
        <path d="M10 22h4" />
      </g>
    </Svg>
  )
}

/** A map that tips and unfolds: its two fold lines slide apart. */
export function MapIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('map')}>
        <path d="M14.106 5.553a2 2 0 0 0 1.788 0l3.659-1.83A1 1 0 0 1 21 4.619v12.764a1 1 0 0 1-.553.894l-4.553 2.277a2 2 0 0 1-1.788 0l-4.212-2.106a2 2 0 0 0-1.788 0l-3.659 1.83A1 1 0 0 1 3 19.381V6.618a1 1 0 0 1 .553-.894l4.553-2.277a2 2 0 0 1 1.788 0z" />
        <path className={part('fold1')} d="M15 5.764v15" />
        <path className={part('fold2')} d="M9 3.236v15" />
      </g>
    </Svg>
  )
}

/** An arrow that reaches forward. */
export function ArrowRightIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('shaft')} d="M5 12h14" />
      <path className={part('arrowHead')} d="m12 5 7 7-7 7" />
    </Svg>
  )
}

/** Four tiles that ripple one after the other. */
export function LayoutGridIcon(props) {
  return (
    <Svg {...props}>
      <rect className={part('tile', 't1')} width="7" height="7" x="3" y="3" rx="1" />
      <rect className={part('tile', 't2')} width="7" height="7" x="14" y="3" rx="1" />
      <rect className={part('tile', 't3')} width="7" height="7" x="14" y="14" rx="1" />
      <rect className={part('tile', 't4')} width="7" height="7" x="3" y="14" rx="1" />
    </Svg>
  )
}

export function ChevronLeftIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('chevL')} d="m15 18-6-6 6-6" />
    </Svg>
  )
}

export function ChevronRightIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('chevR')} d="m9 18 6-6-6-6" />
    </Svg>
  )
}

/** A circular arrow that turns a full circle. */
export function RotateIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('spin')}>
        <path d="M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8" />
        <path d="M3 3v5h5" />
      </g>
    </Svg>
  )
}

export function PlayIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('play')} d="M6 3l14 9-14 9z" />
    </Svg>
  )
}

/** The knobs of the sliders slide. */
export function SlidersIcon(props) {
  return (
    <Svg {...props}>
      <path d="M10 5H3" />
      <path d="M12 19H3" />
      <path className={part('knobA')} d="M14 3v4" />
      <path className={part('knobB')} d="M16 17v4" />
      <path d="M21 12h-9" />
      <path d="M21 19h-5" />
      <path d="M21 5h-7" />
      <path className={part('knobA')} d="M8 10v4" />
      <path d="M8 12H3" />
    </Svg>
  )
}

/** Two sheets that slip apart. */
export function CopyIcon(props) {
  return (
    <Svg {...props}>
      <rect className={part('copyFront')} width="14" height="14" x="8" y="8" rx="2" ry="2" />
      <path className={part('copyBack')} d="M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2" />
    </Svg>
  )
}

/** A tick that is drawn again, as if ticked by hand. */
export function CheckIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('tick')} pathLength="1" d="M20 6 9 17l-5-5" />
    </Svg>
  )
}

/** An open book whose spine is drawn again and whose pages lift. */
/** A calendar whose binding rings lift on hover. */
export function CalendarIcon(props) {
  return (
    <Svg {...props}>
      <rect width="18" height="18" x="3" y="4" rx="2" />
      <path className={part('book')} d="M16 2v4M8 2v4M3 10h18" />
    </Svg>
  )
}

export function BookIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('book')}>
        <path className={part('spine')} pathLength="1" d="M12 7v14" />
        <path d="M3 18a1 1 0 0 1-1-1V4a1 1 0 0 1 1-1h5a4 4 0 0 1 4 4 4 4 0 0 1 4-4h5a1 1 0 0 1 1 1v13a1 1 0 0 1-1 1h-6a3 3 0 0 0-3 3 3 3 0 0 0-3-3z" />
      </g>
    </Svg>
  )
}

/** The arrow of an external link darts out of its box. */
export function ExternalIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('out')}>
        <path d="M15 3h6v6" />
        <path d="M10 14 21 3" />
      </g>
      <path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" />
    </Svg>
  )
}

export function XIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('cross')}>
        <path d="M18 6 6 18" />
        <path d="m6 6 12 12" />
      </g>
    </Svg>
  )
}

/** A plus that turns a quarter, the zoom in. */
export function PlusIcon(props) {
  return (
    <Svg {...props}>
      <g className={part('plus')}>
        <path d="M5 12h14" />
        <path d="M12 5v14" />
      </g>
    </Svg>
  )
}

/** A minus that squeezes in, the zoom out. */
export function MinusIcon(props) {
  return (
    <Svg {...props}>
      <path className={part('minus')} d="M5 12h14" />
    </Svg>
  )
}
