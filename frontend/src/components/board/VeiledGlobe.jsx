import { useEffect, useId } from 'react'
import { animate, motion, useMotionValue, useTransform } from 'motion/react'
import { countryName } from '../../game/countries.js'
import { CENTROIDS } from '../../game/countryCentroids.js'
import { SHAPES } from '../../game/countryShapes.js'
import { C, R, graticule, silhouette, zoomFor } from '../../game/globe.js'
import { useLanguage } from '../../i18n.js'
import { easeOut } from '../../motion.js'
import styles from './VeiledGlobe.module.css'
import { useReducedMotion } from '../../motionPref.js'

const IDLE = { lat: 25, lon: 20 }
const TURN = { duration: 1.6, ease: easeOut }
const SPIN = { duration: 2.6, ease: easeOut } // a full turn first, then it comes to rest on the country

/**
 * A bare graticule that hides where the building is. Once the country guess is right it spins once, then turns to
 * that country and drops a pin. `found` is true after the guess locks or the answer is revealed.
 */
export function VeiledGlobe({ code, found }) {
  const { lang, strings } = useLanguage()
  const text = strings.board.globe
  const reduceMotion = useReducedMotion()
  const centre = CENTROIDS[code]
  const known = found && centre
  const lat = known ? centre[0] : IDLE.lat
  const lon = known ? centre[1] : IDLE.lon
  const latValue = useMotionValue(lat)
  const lonValue = useMotionValue(lon)
  const rings = known ? SHAPES[code] : undefined // not before the guess: the outline would give the country away
  const zoomTo = rings?.length ? zoomFor(rings) : 1 // a small country comes closer once found
  const zoomValue = useMotionValue(1)
  const clipId = `veil-${useId().replace(/:/g, '')}`
  const path = useTransform([latValue, lonValue, zoomValue], ([a, b, z]) => graticule(a, b, z))
  const shape = useTransform([latValue, lonValue, zoomValue], ([a, b, z]) => (rings?.length ? silhouette(rings, a, b, z) : ''))

  useEffect(() => {
    if (reduceMotion) {
      latValue.set(lat)
      lonValue.set(lon)
      zoomValue.set(zoomTo)
      return undefined
    }
    // Going to the country, the globe first spins once all the way round (eastward) and ends on it.
    const start = lonValue.get()
    const spun = start + ((((lon - start) % 360) + 360) % 360) + 360
    const turns = known
      ? [
          animate(latValue, lat, SPIN),
          animate(lonValue, spun, { ...SPIN, onComplete: () => lonValue.set(lon) }), // same place, so the next turn starts from a plain angle
        ]
      : [animate(latValue, lat, TURN), animate(lonValue, lon, TURN)]
    turns.push(animate(zoomValue, zoomTo, { duration: 1.1, ease: easeOut, delay: known ? 1.7 : 0 }))
    return () => turns.forEach((t) => t.stop())
  }, [lat, lon, known, zoomTo, latValue, lonValue, zoomValue, reduceMotion])

  const name = known ? (countryName(code, lang) ?? code) : text.hidden

  return (
    <figure className={styles.globe}>
      <svg viewBox="0 0 200 200" className={styles.svg} role="img" aria-label={name}>
        <circle className={styles.disc} cx={C} cy={C} r={R} />
        <clipPath id={clipId}>
          <circle cx={C} cy={C} r={R} />
        </clipPath>
        <motion.path className={styles.lines} d={path} clipPath={`url(#${clipId})`} />
        <motion.path
          className={styles.shape}
          clipPath={`url(#${clipId})`}
          d={shape}
          initial={false}
          animate={{ opacity: rings?.length ? 1 : 0 }}
          transition={{ duration: 0.6, ease: easeOut, delay: known && !reduceMotion ? 1.9 : 0 }}
        />
        <motion.text
          className={styles.question}
          x={C}
          y={C + 20}
          textAnchor="middle"
          initial={false}
          animate={{ opacity: known ? 0 : 1 }}
        >
          ?
        </motion.text>
        <motion.g
          className={styles.pin}
          initial={false}
          animate={{ opacity: known ? 1 : 0, scale: known ? 1 : 0.4 }}
          transition={{ duration: 0.45, ease: easeOut, delay: known && !reduceMotion ? 2.1 : 0 }}
        >
          <circle className={styles.ring} cx={C} cy={C} r="11" />
          <circle className={styles.dot} cx={C} cy={C} r="4.5" />
        </motion.g>
      </svg>
      <figcaption className={styles.caption}>
        <span className={styles.label}>{text.label}</span>
        <strong className={known ? styles.name : styles.hidden}>{name}</strong>
        <span className={styles.note}>{known ? text.coords(centre[0], centre[1]) : text.hint}</span>
      </figcaption>
    </figure>
  )
}
