import { Eye } from 'lucide-react'
import { motion } from 'motion/react'
import { GUESS_FIELDS } from '../../game/matchGuess.js'
import { dailyNumber, shareText } from '../../game/daily.js'
import { useCountdown } from '../../game/useCountdown.js'
import { useStrings } from '../../i18n.js'
import { RollingNumber } from '../ui/RollingNumber.jsx'
import { ShareMenu } from '../layout/DailyShare.jsx'
import { PastDays } from './PastDays.jsx'
import styles from './DailyCard.module.css'
import { useReducedMotion } from '../../motionPref.js'

/**
 * The Daily's result as a drafting title block: the score on the left, one ruled row per guess with a
 * round badge (a drawn checkmark when got, a soft eye when revealed), then the ways to send it and the countdown. The text it
 * shares never names the building.
 *
 * @param daily  { fields, hintsUsed }
 * @param play   false while the reveal build-up covers the screen: the badges and digits wait, then play
 */
export function DailyCard({ daily, play = true }) {
  const number = daily.number ?? dailyNumber()
  const strings = useStrings()
  const reduce = useReducedMotion()
  const left = useCountdown()
  const text = shareText({ number, fields: daily.fields, hintsUsed: daily.hintsUsed, title: strings.daily.shareTitle, url: window.location.origin })
  const got = GUESS_FIELDS.filter((f) => daily.fields[f] === 'correct').length

  return (
    <section className={styles.block} aria-label={strings.daily.preview}>
      <header className={styles.head}>
        <span>{strings.daily.title(number)}</span>
        <span>{strings.titleBlock.sheetOf(1, 1)}</span>
      </header>
      <div className={styles.body}>
        <div className={styles.score}>
          <strong>
            {got}
            <span>/{GUESS_FIELDS.length}</span>
          </strong>
          {daily.hintsUsed > 0 && <em>💡 {daily.hintsUsed}</em>}
        </div>
        <ul className={styles.rows}>
          {GUESS_FIELDS.map((f, i) => {
            const ok = daily.fields[f] === 'correct'
            return (
              <li key={f} className={styles.row} data-got={ok || undefined}>
                <span>{strings.guess.fields[f]}</span>
                <motion.span
                  className={styles.badge}
                  data-got={ok || undefined}
                  initial={reduce ? false : { opacity: 0, scale: 0.5 }}
                  animate={play ? { opacity: 1, scale: 1 } : { opacity: 0, scale: 0.5 }}
                  transition={{ type: 'spring', stiffness: 460, damping: 20, delay: 0.45 + i * 0.12 }}
                >
                  {ok ? (
                    <svg viewBox="0 0 24 24" aria-hidden="true">
                      <motion.path
                        d="M6.5 12.5l3.5 3.5 7.5-8"
                        initial={reduce ? false : { pathLength: 0 }}
                        animate={{ pathLength: play ? 1 : 0 }}
                        transition={{ duration: 0.35, ease: 'easeOut', delay: 0.6 + i * 0.12 }}
                      />
                    </svg>
                  ) : (
                    <Eye aria-hidden="true" strokeWidth={2} />
                  )}
                  <span className="visually-hidden">{ok ? strings.summary.recapGot : strings.summary.recapMissed}</span>
                </motion.span>
              </li>
            )
          })}
        </ul>
      </div>
      <footer className={styles.foot}>
        <div className={styles.countRow}>
        <div className={styles.countdown}>
          <span className={styles.countLabel}>{strings.daily.nextLabel}</span>
          <span className={styles.digits} aria-hidden="true">
            {left.split('').map((c, i) =>
              c === ':' ? (
                <span key={i} className={styles.colon}>:</span>
              ) : (
                <RollingNumber key={i} value={play ? Number(c) : 0} delay={0.5 + i * 0.09} fade />
              ),
            )}
          </span>
          <span className={styles.units} aria-hidden="true">
            <span>{strings.daily.hoursUnit}</span>
            <span>{strings.daily.minutesUnit}</span>
          </span>
          <span className="visually-hidden">{strings.daily.nextIn(left)}</span>
        </div>
        <PastDays current={number} />
        </div>
        <ShareMenu text={text} />
      </footer>
    </section>
  )
}
