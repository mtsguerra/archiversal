import { useEffect, useState } from 'react'
import { fetchLibrary } from '../../api/buildings.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { useAccount } from '../../social/account.js'
import { badgeName, fetchBadges } from '../../social/badges.js'
import { playChallenge } from '../../social/challenges.js'
import { rpc } from '../../social/client.js'
import { CompareDialog } from '../library/Detail.jsx'
import compare from '../library/Detail.module.css'
import { Button } from '../ui/Button.jsx'
import { Avatar } from './Avatar.jsx'
import { BadgeMark } from './Badges.jsx'
import styles from './social.module.css'

/** One read from the database: undefined while loading, null when it failed. Asked again when `key` changes. */
function useRpc(fn, args, key) {
  const [data, setData] = useState(undefined)
  useEffect(() => {
    let live = true
    rpc(fn, args).then(
      (found) => live && setData(found),
      () => live && setData(null),
    )
    return () => {
      live = false
    }
    // `args` is rebuilt on every render; `key` says when the question changed.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [fn, key])
  return data
}

/** Building names by id, in the current language (only ever shown for buildings the viewer has played). */
function useBuildingNames() {
  const { lang } = useLanguage()
  const [names, setNames] = useState({})
  useEffect(() => {
    let live = true
    fetchLibrary(lang)
      .then((rows) => live && setNames(Object.fromEntries(rows.map((r) => [r.id, r.name]))))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [lang])
  return names
}

const day = (iso, lang) => new Date(iso).toLocaleDateString(lang)

/** What the caller's friends did lately: badges earned and challenges finished. */
export function Feed() {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.social.feed
  const events = useRpc('friends_feed')
  if (!events) return null
  return (
    <section className={styles.sheet} data-quiet>
      <h2 className={styles.subheading}>{t.heading}</h2>
      {events.length === 0 ? (
        <p className={styles.hint}>{t.empty}</p>
      ) : (
        <ul className={styles.people}>
          {events.map((e, i) => (
            <li key={i} className={styles.person}>
              <a className={styles.personName} href={`#/u/${e.username}`} aria-label={e.username}>
                <Avatar id={e.avatar} size="2.25rem" />
              </a>
              <span>{e.kind === 'badge' ? t.badge(e.username, badgeName(strings, e.ref)) : t.challenge(e.username, e.ref)}</span>
              <span className={`${styles.hint} ${styles.personActions}`}>{day(e.at, lang)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  )
}

/** The caller's challenges, sent and received: play the ones still open, and see both results side by side. */
export function Challenges({ version }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.social.challenge
  const list = useRpc('list_challenges', undefined, version)
  const names = useBuildingNames()
  if (!list) return null
  const mark = (named) => (
    <td data-named={named || undefined}>
      <span aria-hidden="true">{named ? '✓' : '–'}</span>
      <span className={styles.srOnly}>{named ? t.named : t.missed}</span>
    </td>
  )
  return (
    <section className={styles.sheet} data-quiet>
      <h2 className={styles.subheading}>{t.heading}</h2>
      <p className={styles.hint}>{t.note}</p>
      {list.length === 0 && <p className={styles.hint}>{t.empty}</p>}
      {list.map((c) => (
        <article key={c.id} className={styles.challenge}>
          <header className={styles.person}>
            <span className={styles.personName}>
              <Avatar id={c.avatar} size="2.25rem" />
              {c.sent ? t.sent(c.with) : t.received(c.with)}
            </span>
            <span className={styles.hint}>{day(c.at, lang)}</span>
            {!c.mine && (
              <span className={styles.personActions}>
                <Button data-sound="start" onClick={() => playChallenge(c)}>
                  {t.play}
                </Button>
              </span>
            )}
          </header>
          {!c.mine && c.answered && <p className={styles.hint}>{t.theyPlayed(c.with)}</p>}
          {c.mine && (
            <table className={styles.results}>
              <thead>
                <tr>
                  <th scope="col">{t.building}</th>
                  <th scope="col">{t.you}</th>
                  <th scope="col">{c.with}</th>
                </tr>
              </thead>
              <tbody>
                {c.buildings.map((id) => (
                  <tr key={id}>
                    <th scope="row">
                      <a className={styles.link} href={`#/library/${id}`}>
                        {names[id] ?? '…'}
                      </a>
                    </th>
                    {mark(c.mine[id] === true)}
                    {c.theirs ? mark(c.theirs[id] === true) : <td>·</td>}
                  </tr>
                ))}
              </tbody>
            </table>
          )}
          {c.mine && !c.theirs && <p className={styles.hint}>{t.waiting(c.with)}</p>}
        </article>
      ))}
    </section>
  )
}

function CompareBody({ username }) {
  const strings = useStrings()
  const t = strings.social.compare
  const { profile } = useAccount()
  const found = useRpc('compare_with', { name: username }, username)
  const names = useBuildingNames()
  const [catalogue, setCatalogue] = useState([])
  useEffect(() => {
    fetchBadges().then(setCatalogue, () => {})
  }, [])
  if (found === undefined) return <p role="status">{strings.account.loading}</p>
  if (found === null) return <p role="status">{strings.account.page.missing}</p>
  const side = (name, avatar, stats) => (
    <div className={compare.card}>
      <div className={compare.cardInfo}>
        <Avatar id={avatar} size="3.5rem" />
        <b>{name}</b>
        <span>
          {strings.account.stats.unlocked}: {stats.unlocked}
        </span>
        <span>
          {strings.account.stats.mastered}: {stats.mastered}
        </span>
        <span>
          {strings.account.stats.countries}: {stats.countries}
        </span>
      </div>
    </div>
  )
  const badges = found.badges.map((id) => catalogue.find((b) => b.id === id)).filter(Boolean)
  return (
    <>
      <div className={compare.cols}>
        {side(`${profile.username} (${t.you})`, profile.avatar, found.mine)}
        <div className={compare.mid}>
          <p>
            <b>{found.badges.length}</b>
            {t.badges}
          </p>
          <p>
            <b>{found.mastered.length}</b>
            {t.mastered}
          </p>
        </div>
        {side(found.username, found.avatar, found.theirs)}
      </div>
      {found.badges.length + found.mastered.length === 0 && <p>{t.none}</p>}
      {badges.length > 0 && (
        <div>
          <h3 className={styles.label}>{t.sharedBadges}</h3>
          <ul className={styles.shared}>
            {badges.map((b) => (
              <li key={b.id}>
                <div className={styles.badgeArt}>
                  <BadgeMark badge={b} name={badgeName(strings, b.id)} earned />
                </div>
                <span>{badgeName(strings, b.id)}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
      {found.mastered.length > 0 && (
        <div>
          <h3 className={styles.label}>{t.sharedMastered}</h3>
          <ul className={styles.sharedNames}>
            {found.mastered.map((id) => (
              <li key={id}>
                <a className={styles.link} href={`#/library/${id}`}>
                  {names[id] ?? '…'}
                </a>
              </li>
            ))}
          </ul>
        </div>
      )}
      <p className={compare.text}>{t.note}</p>
    </>
  )
}

/** "Compare with me" on another player's page: opens the Library's Compare dialog with the two profiles in it. */
export function CompareProfiles({ username }) {
  const { social } = useStrings()
  const { status, profile } = useAccount()
  const [open, setOpen] = useState(false)
  if (status !== 'in' || !profile) return null
  return (
    <>
      <Button variant="ghost" onClick={() => setOpen(true)}>
        {social.compare.button}
      </Button>
      {open && (
        <CompareDialog label={social.compare.title} eyebrow={social.compare.title} onClose={() => setOpen(false)}>
          <CompareBody username={username} />
        </CompareDialog>
      )}
    </>
  )
}
