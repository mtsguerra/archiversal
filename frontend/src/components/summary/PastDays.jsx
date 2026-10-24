import { useId, useState } from 'react'
import { dailyNumber, readLate, readPlayed } from '../../game/daily.js'
import { readProgress } from '../../game/progress.js'
import { useStrings } from '../../i18n.js'
import { CalendarIcon } from '../ui/icons.jsx'
import styles from './PastDays.module.css'

const SHOWN = 30 // the most recent days offered

/**
 * "Other days" beside the countdown: opens the earlier Dailies, newest first, each with its state.
 * Days played after their day are marked differently and never count for the streak.
 */
export function PastDays({ current }) {
  const t = useStrings().daily.past
  const [open, setOpen] = useState(false)
  const listId = useId()
  const today = dailyNumber()
  const [ontime] = useState(() => new Set(readProgress().days))
  const [late] = useState(() => new Set(readLate()))
  const [saved] = useState(() => new Set(readPlayed()))
  const days = Array.from({ length: Math.min(SHOWN, today - 1) }, (_, i) => today - 1 - i)
  if (!days.length) return null

  const stateOf = (n) => (late.has(n) ? 'late' : ontime.has(n) || saved.has(n) ? 'done' : 'open')

  return (
    <>
      <button type="button" className={styles.toggle} aria-expanded={open} aria-controls={listId} onClick={() => setOpen((o) => !o)}>
        <CalendarIcon aria-hidden="true" />
        {t.button}
      </button>
      {open && (
        <div id={listId} className={styles.panel}>
          <p className={styles.note}>{t.note}</p>
          <ul className={styles.list}>
            {days.map((n) => {
              const state = stateOf(n)
              // An on-time day from before results were kept per day has nothing to open again.
              const reopen = state !== 'done' || saved.has(n)
              const label = t.day(n, state)
              return (
                <li key={n}>
                  {reopen ? (
                    <a className={styles.day} data-state={state} data-current={n === current || undefined} href={`#/daily/${n}`} aria-label={label} title={label}>
                      #{n}
                    </a>
                  ) : (
                    <span className={styles.day} data-state={state} aria-label={label} title={label}>
                      #{n}
                    </span>
                  )}
                </li>
              )
            })}
          </ul>
        </div>
      )}
    </>
  )
}
