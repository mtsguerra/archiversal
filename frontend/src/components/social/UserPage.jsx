import { useEffect, useState } from 'react'
import { fetchLibrary } from '../../api/buildings.js'
import { readLibrary } from '../../game/library.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { useAccount } from '../../social/account.js'
import { accountsEnabled, rpc } from '../../social/client.js'
import { usernameFrom } from '../../social/username.js'
import { Avatar } from './Avatar.jsx'
import { Badges } from './Badges.jsx'
import { FriendActions } from './Friends.jsx'
import { CompareProfiles } from './Social.jsx'
import { Notice, SocialShell, VisitorPlan } from './Shell.jsx'
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

/** A player's card: avatar, name, bio, favourite and learning stats (a profile from get_profile). */
export function ProfileCard({ profile }) {
  const { account: t } = useStrings()
  return (
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
  )
}

/** `#/u/<username>`: what that player lets the viewer see. */
export function UserPage() {
  const { account: t, plan } = useStrings()
  const username = usernameFrom(window.location.hash)
  // Both are tagged with the username they belong to, so moving to another player's page starts afresh.
  const [picked, setRoom] = useState({ name: null, room: 'hall' })
  const [shared, setCommon] = useState(null) // compare_with: what the viewer and this player share (null: signed out, or it failed)
  const room = picked.name === username ? picked.room : 'hall'
  const common = shared?.name === username ? shared.found : null
  const [friendsIn, setFriendsIn] = useState(null) // shared_friends: the friends both have (null: signed out, or it could not be read)
  const inCommon = friendsIn?.name === username ? friendsIn.list : null
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
  useEffect(() => {
    if (!accountsEnabled || status !== 'in') return undefined
    let live = true
    rpc('compare_with', { name: username }).then(
      (found) => live && setCommon({ name: username, found }),
      () => {},
    )
    // Asked on its own: if this fails (an older database) the Salon simply stays shut.
    rpc('shared_friends', { name: username }).then(
      (list) => live && Array.isArray(list) && setFriendsIn({ name: username, list }),
      () => {},
    )
    return () => {
      live = false
    }
  }, [username, status, synced])

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
  if (profile.mine) {
    return (
      <SocialShell>
        <ProfileCard profile={profile} />
        <Badges username={profile.username} />
      </SocialShell>
    )
  }
  const v = plan.visitor
  const notes = {
    hall: profile.username,
    archive: common ? v.common(common.mastered.length) : v.sheets(profile.stats.unlocked),
    gallery: common ? v.badges(common.badges.length) : plan.parts.gallery,
    salon: inCommon ? v.friends(inCommon.length) : '',
  }
  return (
    <SocialShell plan={<VisitorPlan name={profile.username} room={room} notes={notes} salon={Boolean(inCommon)} onRoom={(next) => setRoom({ name: username, room: next })} />}>
      {room === 'hall' && (
        <>
          <ProfileCard profile={profile} />
          <FriendActions username={profile.username} />
        </>
      )}
      {room === 'archive' && (
        <section className={styles.sheet}>
          <h2 className={styles.subheading}>{plan.parts.archive}</h2>
          <p className={styles.hint}>{notes.archive}</p>
          <CompareProfiles username={profile.username} />
        </section>
      )}
      {room === 'gallery' && <Badges username={profile.username} />}
      {room === 'salon' && inCommon && (
        <section className={styles.sheet}>
          <h2 className={styles.subheading}>{plan.parts.salon}</h2>
          <p className={styles.hint}>{inCommon.length ? v.friends(inCommon.length) : v.noFriends}</p>
          {inCommon.length > 0 && (
            <ul className={styles.people}>
              {inCommon.map((person) => (
                <li key={person.username} className={styles.person}>
                  <a className={styles.personName} href={`#/u/${person.username}`}>
                    <Avatar id={person.avatar} size="2.25rem" />
                    <span>{person.username}</span>
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      )}
    </SocialShell>
  )
}
