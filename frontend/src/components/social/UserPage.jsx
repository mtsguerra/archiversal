import { useEffect, useState } from 'react'
import { fetchLibrary } from '../../api/buildings.js'
import { readLibrary } from '../../game/library.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { useAccount } from '../../social/account.js'
import { accountsEnabled, rpc } from '../../social/client.js'
import { usernameFrom } from '../../social/username.js'
import { Avatar } from './Avatar.jsx'
import { Notice, SocialShell } from './ProfilePage.jsx'
import styles from './social.module.css'

const STATS = ['unlocked', 'mastered', 'eras', 'countries', 'dailies']

/** The favourite, without spoiling the Library: a building is named only to a viewer who has unlocked it. */
function Favorite({ kind, value }) {
  const { account: t } = useStrings()
  const { lang } = useLanguage()
  const unlocked = kind === 'building' && Boolean(readLibrary()[value])
  const [name, setName] = useState(null)
  useEffect(() => {
    if (!unlocked) return undefined
    let live = true
    fetchLibrary(lang)
      .then((rows) => live && setName(rows.find((r) => r.id === value)?.name ?? null))
      .catch(() => {})
    return () => {
      live = false
    }
  }, [unlocked, value, lang])
  if (kind === 'architect') {
    return (
      <p>
        <span className={styles.label}>{t.page.favoriteArchitect}</span> {value}
      </p>
    )
  }
  return (
    <p>
      <span className={styles.label}>{t.page.favoriteBuilding}</span>{' '}
      {unlocked && name ? (
        <a className={styles.link} href={`#/library/${value}`}>
          {name}
        </a>
      ) : (
        <em>{t.page.lockedFavorite}</em>
      )}
    </p>
  )
}

/** `#/u/<username>`: what that player lets the viewer see. `extras(profile)` are the sections later batches add. */
export function UserPage({ extras }) {
  const { account: t } = useStrings()
  const username = usernameFrom(window.location.hash)
  const { status, profile: me, synced } = useAccount()
  const [profile, setProfile] = useState(undefined) // undefined: loading; null: hidden or missing
  // Asked again when the viewer signs in or out (a friends-only page may open) or edits their own profile.
  useEffect(() => {
    if (!accountsEnabled || status === 'loading') return undefined
    let live = true
    rpc('get_profile', { name: username }).then(
      (found) => live && setProfile(found),
      () => live && setProfile(null),
    )
    return () => {
      live = false
    }
  }, [username, status, me, synced])

  if (!accountsEnabled) {
    return (
      <SocialShell>
        <Notice>{t.off}</Notice>
      </SocialShell>
    )
  }
  if (profile === undefined) {
    return (
      <SocialShell>
        <Notice>{t.loading}</Notice>
      </SocialShell>
    )
  }
  if (profile === null) {
    return (
      <SocialShell>
        <Notice>{t.page.missing}</Notice>
      </SocialShell>
    )
  }
  return (
    <SocialShell>
      <section className={styles.sheet}>
        <header className={styles.identity}>
          <Avatar id={profile.avatar} size="4.5rem" />
          <div>
            <h1 className={styles.heading}>{profile.username}</h1>
            <p className={styles.hint}>{t.page.joined(profile.joined)}</p>
          </div>
        </header>
        {/* Typed by the player: React renders it as text, never as markup. */}
        {profile.bio && <p className={styles.bio}>{profile.bio}</p>}
        {profile.favorite_kind && <Favorite kind={profile.favorite_kind} value={profile.favorite} />}
        <dl className={styles.stats}>
          {STATS.map((key) => (
            <div key={key}>
              <dt>{t.stats[key]}</dt>
              <dd>{profile.stats[key]}</dd>
            </div>
          ))}
        </dl>
        {profile.mine && (
          <p className={styles.hint}>
            {t.page.yours} {t.page.privacyNote[profile.privacy]}{' '}
            <a className={styles.link} href="#/profile">
              {t.page.edit}
            </a>
          </p>
        )}
      </section>
      {extras?.(profile)}
    </SocialShell>
  )
}
