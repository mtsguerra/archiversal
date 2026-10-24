import { useState } from 'react'
import { Flag } from 'lucide-react'
import { silhouetteFor } from '../reveal/silhouettes.js'
import { Marks } from './Marks.jsx'
import styles from './Library.module.css'

/** The era's front elevation, drawn still on the plate (the Library's thumbnails; the reveal plays it line by line). */
function PlateArt({ era }) {
  const { mass, strokes } = silhouetteFor(era)
  return (
    <svg className={styles.plateDrawing} viewBox="0 0 400 244" aria-hidden="true">
      <path d={mass} className={styles.plateMass} />
      {strokes
        .filter((s) => s.tone !== 'dimension')
        .map((s, i) => (
          <path key={i} d={s.d} data-tone={s.tone} />
        ))}
    </svg>
  )
}

// Wikimedia serves stepped thumbnail widths; a plate needs 500px, not the 1920px the board loads.
const small = (src) => src.replace(/(\/thumb\/.*\/)\d+px-/, '$1500px-')

/** The building's photograph over the drawing; if it fails to load the drawing stays. */
function PlatePhoto({ src }) {
  const [failed, setFailed] = useState(false)
  if (failed) return null
  return <img className={styles.platePhoto} src={small(src)} alt="" loading="lazy" decoding="async" onError={() => setFailed(true)} />
}

/**
 * One building as a framed plate. Unlocked: its name, country and year, marks, and a Compare toggle.
 * Locked: the era's drawing under frosted tracing paper, and only the sheet number.
 *
 * @param meta        "Country · year" for an unlocked plate
 * @param eraLabel    the era's name (shown on a locked plate)
 */
export function Plate({ row, t, meta, eraLabel, selected, inCompare, inReading, onOpen, onCompare, onReading }) {
  const label = row.open ? row.name : `${row.no}, ${t.locked}`
  return (
    <article className={styles.plate} data-locked={!row.open || undefined} data-selected={selected || undefined} data-mastered={row.mastered || undefined}>
      <button type="button" className={styles.plateOpen} onClick={onOpen} aria-label={label}>
        <span className={styles.plateNo}>{row.no}</span>
        <span className={styles.plateArt}>
          <PlateArt era={row.era} />
          {row.open && row.photo && <PlatePhoto src={row.photo} />}
        </span>
        {row.open ? (
          <>
            <b className={styles.plateName}>{row.name}</b>
            <small className={styles.plateMeta}>{meta}</small>
          </>
        ) : (
          <>
            <span className={styles.redact} style={{ '--w': `${5 + (row.no.slice(2) % 4)}rem` }} />
            <small className={styles.plateMeta}>{eraLabel}</small>
          </>
        )}
      </button>
      {!row.open && (
        <button
          type="button"
          className={`${styles.cmp} ${styles.plateCmp}`}
          aria-pressed={inReading}
          aria-label={`${inReading ? t.reading.remove : t.reading.add}: ${row.no}`}
          title={inReading ? t.reading.remove : t.reading.add}
          onClick={onReading}
        >
          <Flag aria-hidden="true" strokeWidth={2.2} size={13} fill={inReading ? 'currentColor' : 'none'} />
        </button>
      )}
      {row.open && (
        <>
          <span className={styles.plateMarks}>
            <Marks row={row} t={t} />
          </span>
          <button
            type="button"
            className={`${styles.cmp} ${styles.plateCmp}`}
            aria-pressed={inCompare}
            aria-label={`${inCompare ? t.compare.remove : t.compare.add}: ${row.name}`}
            title={inCompare ? t.compare.remove : t.compare.add}
            onClick={onCompare}
          >
            +
          </button>
        </>
      )}
    </article>
  )
}
