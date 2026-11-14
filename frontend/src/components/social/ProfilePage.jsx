import { useEffect, useState } from 'react'
import { fetchCatalogue, fetchLibrary } from '../../api/buildings.js'
import { readLibrary } from '../../game/library.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { deleteAccount, saveProfile, signIn, signOut, useAccount } from '../../social/account.js'
import { MAX_BIO, usernameProblem } from '../../social/username.js'
import { Button } from '../ui/Button.jsx'
import { showToast } from '../ui/toast.js'
import { AVATARS } from '../../social/avatars.js'
import { Badges } from './Badges.jsx'
import { FriendsRoom } from './Friends.jsx'
import { Notice, Plan, SocialShell } from './Shell.jsx'
import { Challenges } from './Social.jsx'
import { ProfileCard } from './UserPage.jsx'
import { usePlanData } from '../../social/usePlan.js'
import { Avatar } from './Avatar.jsx'
import styles from './social.module.css'

const PRIVACY = ['private', 'friends', 'public']

function SignedOut() {
  const { account: t } = useStrings()
  return (
    <section className={styles.sheet}>
      <h1 className={styles.heading}>{t.intro.heading}</h1>
      <p>{t.intro.text}</p>
      <ul className={styles.points}>
        {t.intro.points.map((point) => (
          <li key={point}>{point}</li>
        ))}
      </ul>
      <div className={styles.actions}>
        <Button onClick={() => signIn()}>{t.signInGoogle}</Button>
      </div>
    </section>
  )
}

/** The buildings this player may name as a favourite (the unlocked ones) and every architect, for the two pickers. */
function useFavoriteChoices(lang) {
  const [choices, setChoices] = useState({ building: [], architect: [] })
  useEffect(() => {
    let live = true
    Promise.all([fetchLibrary(lang), fetchCatalogue()])
      .then(([rows, catalogue]) => {
        const unlocked = readLibrary()
        const building = rows.filter((r) => unlocked[r.id]).map((r) => ({ value: r.id, label: r.name }))
        const architect = [...new Set(catalogue.flatMap((b) => b.architects))].map((name) => ({ value: name, label: name }))
        const byLabel = (a, b) => a.label.localeCompare(b.label)
        if (live) setChoices({ building: building.sort(byLabel), architect: architect.sort(byLabel) })
      })
      .catch(() => {}) // no lists: the favourite simply cannot be changed right now
    return () => {
      live = false
    }
  }, [lang])
  return choices
}

function ProfileForm({ profile }) {
  const { account: t } = useStrings()
  const { lang } = useLanguage()
  const choices = useFavoriteChoices(lang)
  const [form, setForm] = useState(() => ({
    username: profile?.username ?? '',
    avatar: profile?.avatar ?? 'arch',
    bio: profile?.bio ?? '',
    favorite_kind: profile?.favorite_kind ?? '',
    favorite: profile?.favorite ?? '',
    privacy: profile?.privacy ?? 'private',
  }))
  const [error, setError] = useState(null)
  const [busy, setBusy] = useState(false)
  const set = (patch) => setForm((f) => ({ ...f, ...patch }))

  const submit = async (event) => {
    event.preventDefault()
    const username = form.username.trim().toLowerCase()
    const problem = usernameProblem(username)
    if (problem) return setError(problem)
    setBusy(true)
    const hasFavorite = form.favorite_kind && form.favorite
    const failed = await saveProfile({
      username,
      avatar: form.avatar,
      bio: form.bio.trim(),
      favorite_kind: hasFavorite ? form.favorite_kind : null,
      favorite: hasFavorite ? form.favorite : null,
      privacy: form.privacy,
    })
    setBusy(false)
    setError(failed)
    if (!failed) showToast({ text: t.edit.saved })
  }

  // A saved favourite stays selectable even when its list has not loaded (or no longer has it).
  const options = form.favorite_kind ? choices[form.favorite_kind] : []
  const listed = options.some((o) => o.value === form.favorite)

  return (
    <form className={styles.sheet} onSubmit={submit} noValidate>
      <h1 className={styles.heading}>{profile ? t.edit.heading : t.setup.heading}</h1>
      {!profile && <p>{t.setup.text}</p>}

      <label className={styles.field}>
        <span className={styles.label}>{t.fields.username}</span>
        <input
          className={styles.input}
          value={form.username}
          onChange={(e) => set({ username: e.target.value })}
          maxLength={20}
          autoComplete="off"
          autoCapitalize="none"
          spellCheck="false"
          aria-describedby="username-hint"
          aria-invalid={error && error !== 'failed' ? true : undefined}
        />
        <span id="username-hint" className={styles.hint}>
          {t.fields.usernameHint}
        </span>
      </label>

      <fieldset className={styles.field}>
        <legend className={styles.label}>{t.fields.avatar}</legend>
        <div className={styles.avatars}>
          {AVATARS.map((id) => (
            <label key={id} className={styles.avatarChoice} title={t.avatars[id]}>
              <input type="radio" name="avatar" value={id} checked={form.avatar === id} onChange={() => set({ avatar: id })} />
              <Avatar id={id} size="2.75rem" />
              <span className={styles.srOnly}>{t.avatars[id]}</span>
            </label>
          ))}
        </div>
      </fieldset>

      <label className={styles.field}>
        <span className={styles.label}>{t.fields.bio}</span>
        <textarea className={styles.input} rows={3} maxLength={MAX_BIO} value={form.bio} onChange={(e) => set({ bio: e.target.value.replace(/[\r\n\t]+/g, ' ') })} aria-describedby="bio-left" />
        <span id="bio-left" className={styles.hint}>
          {t.fields.bioLeft(MAX_BIO - form.bio.length)}
        </span>
      </label>

      <div className={styles.field}>
        <label className={styles.label} htmlFor="favorite-kind">
          {t.fields.favorite}
        </label>
        <div className={styles.row}>
          <select id="favorite-kind" className={styles.input} value={form.favorite_kind} onChange={(e) => set({ favorite_kind: e.target.value, favorite: '' })}>
            <option value="">{t.fields.favoriteKinds.none}</option>
            <option value="building">{t.fields.favoriteKinds.building}</option>
            <option value="architect">{t.fields.favoriteKinds.architect}</option>
          </select>
          {form.favorite_kind && (
            <select className={styles.input} aria-label={t.fields.favoritePick} value={form.favorite} onChange={(e) => set({ favorite: e.target.value })}>
              <option value="">{t.fields.favoritePick}</option>
              {form.favorite && !listed && <option value={form.favorite}>{form.favorite}</option>}
              {options.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </select>
          )}
        </div>
        {form.favorite_kind === 'building' && <span className={styles.hint}>{t.fields.favoriteBuildingHint}</span>}
      </div>

      <fieldset className={styles.field}>
        <legend className={styles.label}>{t.fields.privacy}</legend>
        {PRIVACY.map((value) => (
          <label key={value} className={styles.choice}>
            <input type="radio" name="privacy" value={value} checked={form.privacy === value} onChange={() => set({ privacy: value })} />
            <span>
              <strong>{t.privacy[value].label}</strong>
              <span className={styles.hint}>{t.privacy[value].text}</span>
            </span>
          </label>
        ))}
      </fieldset>

      {error && (
        <p className={styles.error} role="alert">
          {t.errors[error]}
        </p>
      )}
      <div className={styles.actions}>
        <Button type="submit" disabled={busy}>
          {profile ? t.edit.save : t.setup.create}
        </Button>
      </div>
    </form>
  )
}

function Danger() {
  const { account: t } = useStrings()
  const [armed, setArmed] = useState(false)
  const [failed, setFailed] = useState(false)
  const remove = async () => {
    if (!armed) return setArmed(true)
    try {
      await deleteAccount()
      showToast({ text: t.danger.done })
      window.location.hash = '#/'
    } catch {
      setFailed(true)
    }
  }
  return (
    <section className={styles.sheet} data-quiet>
      <div className={styles.actions}>
        <Button variant="ghost" onClick={signOut}>
          {t.signOut}
        </Button>
      </div>
      <h2 className={styles.subheading}>{t.danger.heading}</h2>
      <p className={styles.hint}>{t.danger.text}</p>
      {failed && (
        <p className={styles.error} role="alert">
          {t.errors.failed}
        </p>
      )}
      <div className={styles.actions}>
        <Button variant="quiet" onClick={remove} onBlur={() => setArmed(false)}>
          {armed ? t.danger.confirm : t.danger.delete}
        </Button>
      </div>
    </section>
  )
}

/**
 * `#/profile` and its rooms (`#/profile/<room>`, `#/friends`): sign in, choose a username, then the plan.
 * Hall: edit the profile. Archive: your card as others see it. Gallery: badges. Salon: friends. Studio: challenges.
 */
export function ProfilePage({ room }) {
  const { account: t } = useStrings()
  const { status, profile } = useAccount()
  const data = usePlanData(room)
  if (status !== 'in' || !profile) {
    return (
      <SocialShell>
        {status === 'off' && <Notice>{t.off}</Notice>}
        {status === 'loading' && <Notice>{t.loading}</Notice>}
        {status === 'out' && <SignedOut />}
        {status === 'in' && (
          <>
            <ProfileForm key="new" profile={null} />
            <Danger />
          </>
        )}
      </SocialShell>
    )
  }
  return (
    <SocialShell plan={<Plan room={room} profile={profile} data={data} />}>
      {room === 'hall' && (
        <>
          <ProfileForm key={profile.username} profile={profile} />
          <Danger />
        </>
      )}
      {room === 'archive' && (data?.card ? <ProfileCard profile={data.card} /> : <Notice>{t.loading}</Notice>)}
      {room === 'gallery' && <Badges username={profile.username} editable />}
      {room === 'salon' && <FriendsRoom />}
      {room === 'studio' && <Challenges />}
    </SocialShell>
  )
}
