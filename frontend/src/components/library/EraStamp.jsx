import { useId } from 'react'
import { BY_ERA, silhouetteFor } from '../reveal/silhouettes.js'
import styles from './EraStamp.module.css'

const ERA_IDS = Object.keys(BY_ERA)

/**
 * The ex libris stamp an era earns once every building of it is unlocked. Each era's stamp differs: its own
 * front elevation in the middle, its name on the ring, and a ring pattern (double, dashed, notched or
 * ticked), tick count and tilt picked from the era's place in the list.
 *
 * @param label  the era's name in the player's language
 */
export function EraStamp({ era, label, earned = true }) {
  const uid = useId().replace(/:/g, '')
  const i = Math.max(0, ERA_IDS.indexOf(era))
  const variant = i % 4
  const ticks = 20 + ((i * 5) % 14)
  const tilt = -8 + ((i * 7) % 17)
  const { mass, strokes } = silhouetteFor(era)
  return (
    <svg className={styles.stamp} data-earned={earned || undefined} viewBox="-60 -60 120 120" role="img" aria-label={label} style={{ rotate: `${tilt}deg` }}>
      <defs>
        <path id={`t${uid}`} d="M-40 0A40 40 0 0 1 40 0" />
        <path id={`b${uid}`} d="M-47 0A47 47 0 0 0 47 0" />
      </defs>
      <circle r="57" className={styles.ring} />
      {variant === 0 && <circle r="53" className={styles.ring} />}
      {variant === 1 && <circle r="53.5" className={styles.ring} strokeDasharray="3 3" />}
      {variant >= 2 &&
        Array.from({ length: ticks }, (_, k) => {
          const a = (k / ticks) * Math.PI * 2
          const r0 = variant === 2 ? 52 : 50
          return <line key={k} x1={Math.cos(a) * r0} y1={Math.sin(a) * r0} x2={Math.cos(a) * 56} y2={Math.sin(a) * 56} className={styles.ring} />
        })}
      <circle r="47" className={styles.ring} />
      <text className={styles.text}>
        <textPath href={`#t${uid}`} startOffset="50%" textAnchor="middle">
          {label.toUpperCase()}
        </textPath>
      </text>
      <text className={styles.text}>
        <textPath href={`#b${uid}`} startOffset="50%" textAnchor="middle">
          EX LIBRIS
        </textPath>
      </text>
      <svg x="-30" y="-18" width="60" height="36.6" viewBox="0 0 400 244" className={styles.art}>
        <path d={mass} className={styles.mass} />
        {strokes
          .filter((s) => s.tone !== 'dimension')
          .map((s, k) => (
            <path key={k} d={s.d} />
          ))}
      </svg>
    </svg>
  )
}
