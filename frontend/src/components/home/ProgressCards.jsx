import { useEffect, useState } from 'react'
import { fetchLibrary } from '../../api/buildings.js'
import { eraProgress, joinRows } from '../../game/libraryView.js'
import { dailyNumber, readDaily, readLate } from '../../game/daily.js'
import { lastWeek, readProgress, streakLength } from '../../game/progress.js'
import { eraName } from '../../game/useEras.js'
import { useLanguage, useStrings } from '../../i18n.js'
import buttonStyles from '../ui/Button.module.css'
import { readLibrary } from '../../game/library.js'
import styles from './ProgressCards.module.css'

function Check() {
  return (
    <svg viewBox="0 0 12 12" aria-hidden="true">
      <path d="M2 6.5L5 9L10 3" />
    </svg>
  )
}

/** The run of Dailies played on this device (game/progress.js). */
export function StreakCard() {
  const t = useStrings().home.progress
  const today = dailyNumber()
  const [progress] = useState(readProgress)
  // A Daily finished before the record existed still counts for today.
  const days = readDaily(today) ? [...progress.days, today] : progress.days
  const run = streakLength(days, today)
  const week = lastWeek(days, today, readLate())

  return (
    <section className={styles.card} aria-label={t.streak}>
      <div className={styles.head}>
        <span>{t.streak}</span>
        <strong className={styles.big}>{run ? t.days(run) : t.start}</strong>
      </div>
      <ol className={styles.week}>
        {week.map(({ number, state }) => (
          <li key={number} className={styles.day} data-state={state} title={t.day(number, state)} aria-label={t.day(number, state)}>
            <span className={styles.num}>#{number}</span>
            <span className={styles.mark}>{state === 'done' && <Check />}
            {state === 'late' && <Check />}</span>
          </li>
        ))}
      </ol>
    </section>
  )
}

/**
 * The archive of styles and countries revealed so far on this device (game/progress.js).
 *
 * @param eras            the era list (for names and the total)
 * @param countriesTotal  how many countries the collection has, once the catalogue is loaded
 */
export function ArchiveCard({ eras, countriesTotal }) {
  const strings = useStrings()
  const t = strings.home.progress
  const { lang } = useLanguage()
  const [progress] = useState(readProgress)
  const [rows, setRows] = useState([])
  useEffect(() => {
    fetchLibrary(lang).then(setRows, () => {})
  }, [lang])
  if (!eras?.length) return null
  const done = eraProgress(joinRows(rows, readLibrary()))
  const found = new Set(progress.eras)
  const discovered = eras.filter((e) => found.has(e.id))

  return (
    <section className={`${styles.card} ${styles.archive}`} aria-label={t.archive}>
      <div className={styles.head}>
        <span>{t.archive}</span>
        <span className={styles.count}>{t.count(discovered.length, eras.length, progress.countries.length, countriesTotal ?? '…')}</span>
      </div>
      <div className={styles.register} aria-hidden="true">
        {eras.map((e) => (
          <span key={e.id} data-on={found.has(e.id) || undefined} />
        ))}
      </div>
      {discovered.length ? (
        <ul className={styles.stamps}>
          {discovered.map((e, i) => (
            <li key={e.id} style={{ '--i': i }} data-complete={done[e.id]?.complete || undefined}>
              <a href={`#/library?era=${e.id}`}>{eraName(e, strings)}</a>
            </li>
          ))}
        </ul>
      ) : (
        <p className={styles.empty}>{t.empty}</p>
      )}
    </section>
  )
}

/** The Library: how many buildings this device has unlocked, and the way in. */
export function LibraryCard({ total }) {
  const t = useStrings().home.library
  const [unlocked] = useState(() => Object.keys(readLibrary()).length)
  return (
    <section className={`${styles.card} ${styles.library}`} aria-label={t.title}>
      <div className={styles.head}>
        <span>{t.title}</span>
      </div>
      <p className={styles.libraryText}>{total ? t.text(unlocked, total) : ''}</p>
      <a className={`${buttonStyles.button} ${buttonStyles.ghost}`} href="#/library">
        <span>{t.open}</span>
      </a>
    </section>
  )
}
