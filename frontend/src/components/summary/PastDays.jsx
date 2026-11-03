import { ArrowRight } from 'lucide-react'
import { dailyNumber, readLate, readPlayed } from '../../game/daily.js'
import { readProgress } from '../../game/progress.js'
import { useStrings } from '../../i18n.js'
import styles from './PastDays.module.css'

/**
 * "Other days" beside the countdown: opens the Library on its Dailies filter, where only the Dailies
 * already found are listed. The calendar's page flips on hover.
 */
export function PastDays() {
  const t = useStrings().daily.past
  const today = dailyNumber()
  if (today <= 1) return null
  const found = new Set([...readProgress().days, ...readLate(), ...readPlayed()].filter((n) => n < today)).size

  return (
    <a className={styles.toggle} href="#/library?show=daily">
      <svg className={styles.cal} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
        <rect width="18" height="18" x="3" y="4" rx="2" />
        <path d="M16 2v4M8 2v4M3 10h18" />
        <rect className={styles.leaf} x="6.5" y="12.5" width="11" height="6" rx="1" />
      </svg>
      {t.button}
      {found > 0 && <span className={styles.count}>· {t.found(found)}</span>}
      <ArrowRight className={styles.arrow} aria-hidden="true" strokeWidth={2} />
    </a>
  )
}
