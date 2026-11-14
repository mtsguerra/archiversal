import { useCallback, useEffect, useState } from 'react'
import { useLanguage, useStrings } from '../../i18n.js'
import { saveProfile, useAccount } from '../../social/account.js'
import { badgeHint, badgeName, fetchBadges, fetchUserBadges, togglePin } from '../../social/badges.js'
import { EraStamp } from '../library/EraStamp.jsx'
import styles from './social.module.css'

const KINDS = ['era', 'milestone', 'explorer']

/** What a counting badge shows in its middle: the number to reach, or 100% for "all of them". */
const glyph = (badge) => (badge.rule === 'all' || badge.threshold >= 1000 ? '100%' : String(badge.threshold))

/** One badge's mark: the era's ex libris stamp, or a ringed number for milestones and explorer badges. */
export function BadgeMark({ badge, name, earned }) {
  const strings = useStrings()
  if (badge.kind === 'era') return <EraStamp era={badge.target} label={strings.eras[badge.target] ?? badge.target} earned={earned} />
  return (
    <svg className={styles.badgeMark} data-earned={earned || undefined} data-kind={badge.kind} viewBox="-60 -60 120 120" role="img" aria-label={name}>
      <circle r="57" />
      <circle r="51" strokeDasharray={badge.kind === 'explorer' ? '1 5' : undefined} />
      <text textAnchor="middle" dominantBaseline="central" textLength={glyph(badge).length > 2 ? 70 : undefined} lengthAdjust="spacingAndGlyphs">
        {glyph(badge)}
      </text>
    </svg>
  )
}

/** The catalogue and one player's badges, loaded together; `reload` asks again. */
function useBadges(username) {
  const [state, setState] = useState({ status: 'loading' })
  const load = useCallback(() => {
    let live = true
    Promise.all([fetchBadges(), fetchUserBadges(username)]).then(
      ([catalogue, mine]) => live && setState(mine ? { status: 'ready', catalogue, earned: mine.earned, showcase: mine.showcase } : { status: 'hidden' }),
      () => live && setState({ status: 'failed' }),
    )
    return () => {
      live = false
    }
  }, [username])
  useEffect(load, [load])
  return [state, load]
}

function BadgeItem({ badge, at, pinned, onPin }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.badges
  const name = badgeName(strings, badge.id)
  const earned = Boolean(at)
  return (
    <li className={styles.badge} data-earned={earned || undefined}>
      <div className={styles.badgeArt}>
        <BadgeMark badge={badge} name={name} earned={earned} />
      </div>
      <div className={styles.badgeText}>
        <strong>{name}</strong>
        {/* A locked badge says how to earn it; an earned one says when. */}
        <span className={styles.hint}>{earned ? t.earned(new Date(`${at}T00:00:00`).toLocaleDateString(lang)) : badgeHint(strings, badge.id)}</span>
        {!earned && <span className={styles.srOnly}>{t.locked}</span>}
        {onPin && earned && (
          <button type="button" className={styles.pin} aria-pressed={pinned} aria-label={pinned ? t.unpin(name) : t.pin(name)} onClick={() => onPin(badge.id)}>
            {pinned ? t.pinned : t.showcase}
          </button>
        )}
      </div>
    </li>
  )
}

/**
 * A player's badges. On the player's own profile (`editable`) every badge is listed, locked ones with how
 * to earn them, and earned ones can be pinned to the showcase. On someone else's page only what they earned.
 */
export function Badges({ username, editable = false }) {
  const strings = useStrings()
  const t = strings.badges
  const [state, reload] = useBadges(username)
  const { newBadges } = useAccount()
  useEffect(() => {
    if (editable && newBadges.length) reload()
  }, [editable, newBadges, reload])
  const [error, setError] = useState(false)

  if (state.status === 'hidden') return null
  if (state.status !== 'ready') {
    return (
      <section className={styles.sheet} data-quiet>
        <h2 className={styles.subheading}>{t.heading}</h2>
        <p role="status">{state.status === 'failed' ? t.failed : strings.account.loading}</p>
      </section>
    )
  }
  const { catalogue, earned, showcase } = state
  const at = Object.fromEntries(earned.map((e) => [e.id, e.at]))
  const known = catalogue.filter((b) => editable || at[b.id])
  const pinned = showcase.map((id) => catalogue.find((b) => b.id === id)).filter(Boolean)

  const pin = async (id) => {
    const failed = await saveProfile({ showcase: togglePin(showcase, id, Object.keys(at)) })
    setError(Boolean(failed))
    reload()
  }

  return (
    <section className={styles.sheet}>
      <header>
        <h2 className={styles.subheading}>{t.heading}</h2>
        <p className={styles.hint}>{t.count(earned.length, catalogue.length)}</p>
      </header>
      {(pinned.length > 0 || editable) && (
        <div>
          <h3 className={styles.label}>{t.showcase}</h3>
          {pinned.length > 0 ? (
            <ul className={styles.showcase}>
              {pinned.map((b) => (
                <li key={b.id}>
                  <div className={styles.badgeArt}>
                    <BadgeMark badge={b} name={badgeName(strings, b.id)} earned />
                  </div>
                  <span>{badgeName(strings, b.id)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className={styles.hint}>{t.showcaseHint}</p>
          )}
        </div>
      )}
      {error && (
        <p className={styles.error} role="alert">
          {strings.account.errors.failed}
        </p>
      )}
      {known.length === 0 && <p className={styles.hint}>{t.none}</p>}
      {KINDS.map((kind) => {
        const group = known.filter((b) => b.kind === kind)
        if (!group.length) return null
        return (
          <div key={kind}>
            <h3 className={styles.label}>{t.kinds[kind]}</h3>
            <ul className={styles.badges}>
              {group.map((b) => (
                <BadgeItem key={b.id} badge={b} at={at[b.id]} pinned={showcase.includes(b.id)} onPin={editable ? pin : undefined} />
              ))}
            </ul>
          </div>
        )
      })}
    </section>
  )
}
