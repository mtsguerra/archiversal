import { useEffect, useState } from 'react'
import { fetchBuilding, fetchBuildingIds } from '../../api/buildings.js'
import { dailyId, dailyNumber, readDaily } from '../../game/daily.js'
import { useCountdown } from '../../game/useCountdown.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { ArrowRightIcon } from '../ui/icons.jsx'
import styles from './DailyTeaser.module.css'

const WHOLE = { x: 0, y: 0, w: 1, h: 1 }

/** Today's first sheet (its first drawing, or its first photo): the image inside its spoiler crop. */
function Sheet({ sheet, onFail }) {
  const [ratio, setRatio] = useState(null)
  const crop = sheet.crop ?? WHOLE
  return (
    <div className={styles.frame} data-drawing={sheet.drawing || undefined} style={ratio ? { aspectRatio: ratio } : { visibility: 'hidden' }}>
      <img
        src={sheet.src}
        alt=""
        draggable={false}
        decoding="async"
        className={styles.image}
        style={{
          width: `${100 / crop.w}%`,
          height: `${100 / crop.h}%`,
          left: `${(-crop.x / crop.w) * 100}%`,
          top: `${(-crop.y / crop.h) * 100}%`,
        }}
        onLoad={(e) => setRatio((e.currentTarget.naturalWidth * crop.w) / (e.currentTarget.naturalHeight * crop.h))}
        onError={onFail}
      />
    </div>
  )
}

/**
 * The Daily's hook on the home page. Before playing: a lens that slowly pans across a detail of
 * today's first sheet. Once played: the whole sheet, stamped, and the time until the next one.
 */
export function DailyTeaser() {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.home.teaser
  const number = dailyNumber()
  const done = Boolean(readDaily(number))
  const left = useCountdown()
  const [sheet, setSheet] = useState(null)
  const [failed, setFailed] = useState(false)

  useEffect(() => {
    const controller = new AbortController()
    fetchBuildingIds()
      .then((ids) => fetchBuilding(dailyId(ids, number), controller.signal))
      .then((building) => {
        const drawing = building.drawings?.[0]
        const first = drawing ?? building.photos?.[0]
        if (first) setSheet({ src: first.src, crop: first.crop, drawing: Boolean(drawing) })
      })
      .catch(() => {}) // no teaser image: the card still offers the Daily
    return () => controller.abort()
  }, [number])

  const image = sheet && !failed ? <Sheet sheet={sheet} onFail={() => setFailed(true)} /> : null

  return (
    <section className={styles.card} aria-label={t.label}>
      <div className={styles.head}>
        <span>{t.label}</span>
        <span className={styles.number}>{strings.daily.title(number)}</span>
      </div>
      {done ? (
        <>
          <div className={styles.full} role="img" aria-label={t.aria}>
            {image}
            {/* Postmarked like the Library's postcard: the word and the date inside the ring. */}
            <span className={styles.stamp}>
              <b>{t.done}</b>
              <time>{new Date().toLocaleDateString(lang, { day: '2-digit', month: 'short' })}</time>
            </span>
          </div>
          <p className={styles.next}>{t.next(left)}</p>
          <a className={styles.secondary} href="#/daily">
            {t.result} <ArrowRightIcon className={styles.arrow} strokeWidth={1.75} />
          </a>
        </>
      ) : (
        <>
          <div className={styles.lens} role="img" aria-label={t.aria}>
            <div className={styles.glass}>
              <div className={styles.pan}>{image}</div>
            </div>
          </div>
          <p className={styles.text}>{t.text}</p>
          <a className={styles.cta} href="#/daily" data-sound="start">
            {t.play} <ArrowRightIcon className={styles.arrow} strokeWidth={1.75} />
          </a>
        </>
      )}
    </section>
  )
}
