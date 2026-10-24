import styles from './InstrumentIcons.module.css'

// Small drafting instruments (a compass, an hourglass, a globe). They move when the control they sit in is
// hovered, focused or chosen: a button, or anything marked data-motion (see InstrumentIcons.module.css).
// Same props as the lucide icons they stand in for, so className sets their size and colour.
function Svg({ className = '', strokeWidth = 1.75, children }) {
  return (
    <svg className={`${styles.icon} ${className}`} strokeWidth={strokeWidth} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
      {children}
    </svg>
  )
}

/** A drafting compass whose legs close, then open wider than before, and settle. */
export function CompassIcon(props) {
  return (
    <Svg {...props}>
      <g>
        <circle cx="12" cy="3.5" r="1.6" />
        <path className={styles.legL} d="M12 5 8.5 20.5l-.6 1.5" />
        <path className={styles.legR} d="M12 5 15.5 20.5H17" />
        <path d="M10 10.5h4" />
      </g>
    </Svg>
  )
}

/** An hourglass with sand in both bulbs: it turns over, the stream runs, and it ends looking as it began. */
export function HourglassIcon({ className = '', ...props }) {
  return (
    <Svg {...props} className={`${className} ${styles.hourglassSvg}`}>
      <g>
        <path d="M6.5 3h11M6.5 21h11M8 3c0 5 8 5.5 8 9s-8 4-8 9M16 3c0 5-8 5.5-8 9s8 4 8 9" />
        <path className={styles.sandA} d="M8.9 4.6h6.2L12 8.6z" />
        <path className={styles.sandB} d="M8.9 19.6h6.2L12 15.6z" />
        <path className={styles.stream} d="M12 12V16" />
      </g>
    </Svg>
  )
}

/** A globe whose meridian turns. */
export function GlobeIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h18" />
      <ellipse className={styles.meridian} cx="12" cy="12" rx="4" ry="9" />
    </Svg>
  )
}

/** A globe with a clock hand sweeping round: a place and a time. */
export function GlobeClockIcon(props) {
  return (
    <Svg {...props}>
      <circle cx="12" cy="12" r="9" />
      <path d="M3 12h4M17 12h4M12 3v3M12 18v3" />
      <path className={styles.hand} d="M12 12V7.5M12 12l3 2" />
    </Svg>
  )
}

const WINDOWS = [
  [8, 6.5, 2],
  [14, 6.5, 2],
  [8, 10.5, 1],
  [14, 10.5, 1],
  [8, 14.5, 0],
  [14, 14.5, 0],
] // [x, y, row from the bottom]

/** A facade whose windows light up floor by floor from the bottom, and whose door opens a crack. */
export function BuildingIcon(props) {
  return (
    <Svg {...props}>
      <path d="M6 21V3h12v18M4 21h16" />
      {WINDOWS.map(([x, y, row]) => (
        <rect key={`${x}-${y}`} className={styles.win} style={{ '--r': row }} x={x} y={y} width="2" height="2" rx="0.3" />
      ))}
      <path className={styles.door} d="M10.5 21v-3.5h3V21" />
    </Svg>
  )
}

/** Three nodes joined by lines: the lines draw on hover and the nodes ripple outward when pressed. */
export function ShareIcon(props) {
  return (
    <Svg {...props}>
      <path className={styles.link1} pathLength="1" d="M8 11l8-4.5" />
      <path className={styles.link2} pathLength="1" d="M8 13l8 4.5" />
      <circle className={styles.node} cx="6" cy="12" r="2.4" />
      <circle className={`${styles.node} ${styles.node2}`} cx="18" cy="5.5" r="2.4" />
      <circle className={`${styles.node} ${styles.node3}`} cx="18" cy="18.5" r="2.4" />
    </Svg>
  )
}

/** An open book: its lines are written on the left page and three pages turn over the spine one after another, while it is hovered. */
export function BookIcon(props) {
  return (
    <Svg {...props}>
      <path d="M12 6.5C10 5 7 4.5 3.5 5v13c3.5-.5 6.5 0 8.5 1.5 2-1.5 5-2 8.5-1.5V5c-3.5-.5-6.5 0-8.5 1.5Z" />
      <path d="M12 6.5v13" />
      <path className={styles.bookLines} pathLength="1" d="M6 9h3.5M6 11.5h3.5M6 14h2.5" />
      {[0, 1, 2].map((i) => (
        <path key={i} className={styles.bookPage} style={{ '--i': i }} d={`M12 6.5C13.8 ${5.4 + i * 0.2} 16 ${5.1 + i * 0.2} ${18.3 - i * 0.6} ${5.5 + i * 0.2}v${11.4 - i * 0.4}c-2-.3-4.3 0-${6.3 - i * 0.6} 1.3Z`} />
      ))}
    </Svg>
  )
}

/** Two sheets: on hover the lines are written again on the front one, and pressed it slides over the one behind. */
export function CopyIcon(props) {
  return (
    <Svg {...props}>
      <path d="M15.5 8V5.5a1.5 1.5 0 0 0-1.5-1.5H6A1.5 1.5 0 0 0 4.5 5.5V15A1.5 1.5 0 0 0 6 16.5h2.5" />
      <g className={styles.copyFront}>
        <rect x="8.5" y="8" width="11.5" height="12.5" rx="1.5" />
        <path className={styles.copyLine1} pathLength="1" d="M11.5 12h5.5" />
        <path className={styles.copyLine2} pathLength="1" d="M11.5 15.5h3.5" />
      </g>
    </Svg>
  )
}

/** A drawing sheet under a veil: on hover the veil rolls up to show the lines beneath, and falls away when pressed. */
export function RevealIcon(props) {
  return (
    <Svg {...props}>
      <rect x="4" y="4" width="16" height="16" rx="1.5" />
      <path className={styles.sheetLines} d="M8 9h8M8 12.5h6M8 16h7" />
      <rect className={styles.veil} x="4" y="4" width="16" height="16" rx="1.5" />
    </Svg>
  )
}

/** The Roman C (one hundred) that draws itself again. */
export function CenturyIcon(props) {
  return (
    <Svg {...props}>
      <path className={styles.cArc} pathLength="1" d="M18.5 7.2A8 8 0 1 0 18.5 16.8" />
      <path d="M12 12h.01" />
    </Svg>
  )
}

const TALLY = [
  'M3 6v12', 'M5.5 6v12', 'M8 6v12', 'M10.5 6v12', 'M2 16 12.5 8',
  'M14 6v12', 'M16.5 6v12', 'M19 6v12', 'M21.5 6v12', 'M13 16 23 8',
]

/** Two tally gates (ten marks): the strokes grow in one after another. */
export function DecadeIcon(props) {
  return (
    <Svg {...props}>
      {TALLY.map((d, i) => (
        <path key={d} className={styles.tally} style={{ '--i': i }} d={d} />
      ))}
    </Svg>
  )
}
