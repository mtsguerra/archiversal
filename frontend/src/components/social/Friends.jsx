import { useState } from 'react'
import { useStrings } from '../../i18n.js'
import { signIn, useAccount } from '../../social/account.js'
import { useFriends } from '../../social/useFriends.js'
import { inviteCodeFromHash, inviteFrom } from '../../social/username.js'
import { Button } from '../ui/Button.jsx'
import { showToast } from '../ui/toast.js'
import { Avatar } from './Avatar.jsx'
import { Notice, SocialShell } from './ProfilePage.jsx'
import styles from './social.module.css'

/** A button that asks twice before something that is not easily undone (remove, block). */
export function ConfirmButton({ children, onConfirm }) {
  const { friends: t } = useStrings()
  const [armed, setArmed] = useState(false)
  return (
    <Button variant="quiet" onBlur={() => setArmed(false)} onClick={() => (armed ? (setArmed(false), onConfirm()) : setArmed(true))}>
      {armed ? t.confirm : children}
    </Button>
  )
}

function Person({ person, note, children }) {
  return (
    <li className={styles.person}>
      <a className={styles.personName} href={`#/u/${person.username}`}>
        <Avatar id={person.avatar} size="2.25rem" />
        <span>{person.username}</span>
      </a>
      {note && <span className={styles.hint}>{note}</span>}
      <span className={styles.personActions}>{children}</span>
    </li>
  )
}

function Search({ lists, act }) {
  const { friends: t } = useStrings()
  const [query, setQuery] = useState('')
  const [results, setResults] = useState(null)
  const search = async (event) => {
    event.preventDefault()
    if (query.trim().length < 3) return
    setResults((await act('search_users', { q: query })) ?? null)
  }
  const relation = (name) =>
    lists.friends.some((f) => f.username === name) ? t.isFriend : lists.outgoing.some((f) => f.username === name) ? t.sent : null
  return (
    <section className={styles.sheet} data-quiet>
      <h2 className={styles.subheading}>{t.find}</h2>
      <form className={styles.row} onSubmit={search} role="search">
        <input className={styles.input} value={query} onChange={(e) => setQuery(e.target.value)} maxLength={20} autoCapitalize="none" autoComplete="off" spellCheck="false" aria-label={t.find} aria-describedby="find-hint" />
        <Button type="submit" className={styles.fit} disabled={query.trim().length < 3}>
          {t.search}
        </Button>
      </form>
      <p id="find-hint" className={styles.hint}>
        {t.findHint}
      </p>
      <div aria-live="polite">
        {results?.length === 0 && <p>{t.noResults}</p>}
        {results?.length > 0 && (
          <ul className={styles.people}>
            {results.map((person) => (
              <Person key={person.username} person={person} note={relation(person.username)}>
                {!relation(person.username) && <Button variant="ghost" onClick={() => act('friend_request', { name: person.username })}>{t.add}</Button>}
              </Person>
            ))}
          </ul>
        )}
      </div>
    </section>
  )
}

function Invite({ act }) {
  const { friends: t } = useStrings()
  const [link, setLink] = useState('')
  const [typed, setTyped] = useState('')
  const [invalid, setInvalid] = useState(false)
  const create = async () => {
    const code = await act('create_invite')
    if (code) setLink(`${window.location.origin}/#/invite/${code}`)
  }
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(link)
      showToast({ text: t.invite.copied })
    } catch {
      // no clipboard: the link is in the field to copy by hand
    }
  }
  const use = async (event) => {
    event.preventDefault()
    const code = inviteFrom(typed)
    const name = code ? await act('redeem_invite', { invite: code }) : null
    setInvalid(name === null)
    if (name) {
      setTyped('')
      showToast({ text: t.invite.accepted(name) })
    }
  }
  return (
    <section className={styles.sheet} data-quiet>
      <h2 className={styles.subheading}>{t.invite.heading}</h2>
      <p className={styles.hint}>{t.invite.text}</p>
      {link ? (
        <div className={styles.row}>
          <input className={styles.input} readOnly value={link} aria-label={t.invite.heading} onFocus={(e) => e.target.select()} />
          <Button className={styles.fit} onClick={copy}>
            {t.invite.copy}
          </Button>
        </div>
      ) : (
        <div className={styles.actions}>
          <Button variant="ghost" onClick={create}>
            {t.invite.create}
          </Button>
        </div>
      )}
      <form className={styles.field} onSubmit={use}>
        <label className={styles.label} htmlFor="invite-code">
          {t.invite.code}
        </label>
        <div className={styles.row}>
          <input id="invite-code" className={styles.input} value={typed} onChange={(e) => setTyped(e.target.value)} maxLength={200} autoComplete="off" autoCapitalize="none" spellCheck="false" />
          <Button type="submit" variant="ghost" className={styles.fit} disabled={!typed.trim()}>
            {t.invite.use}
          </Button>
        </div>
        {invalid && (
          <p className={styles.error} role="alert">
            {t.invite.invalid}
          </p>
        )}
      </form>
    </section>
  )
}

/** Shown wherever friends are needed but the visitor has no account or no username yet. */
export function NeedProfile({ after }) {
  const { friends: t, account } = useStrings()
  const { status } = useAccount()
  if (status === 'off') return <Notice>{account.off}</Notice>
  if (status === 'loading') return <Notice>{account.loading}</Notice>
  return (
    <section className={styles.sheet}>
      <p>{t.needProfile}</p>
      <div className={styles.actions}>
        {status === 'out' ? (
          <Button onClick={() => signIn(after)}>{account.signInGoogle}</Button>
        ) : (
          <a className={styles.link} href="#/profile">
            {t.toProfile}
          </a>
        )}
      </div>
    </section>
  )
}

/** `#/friends`: requests, friends, search, invites and blocks. `extras` are the sections later batches add. */
export function FriendsPage({ extras = null }) {
  const { friends: t } = useStrings()
  const { ready, lists, error, act } = useFriends()
  if (!ready) {
    return (
      <SocialShell>
        <NeedProfile after="#/friends" />
      </SocialShell>
    )
  }
  return (
    <SocialShell>
      {error && (
        <p className={styles.error} role="alert">
          {t.errors[error]}
        </p>
      )}
      <section className={styles.sheet}>
        <h1 className={styles.heading}>{t.heading}</h1>
        {lists && lists.incoming.length + lists.outgoing.length > 0 && (
          <div>
            <h2 className={styles.label}>{t.requests}</h2>
            <ul className={styles.people}>
              {lists.incoming.map((person) => (
                <Person key={person.username} person={person} note={t.incoming}>
                  <Button onClick={() => act('friend_respond', { name: person.username, accept: true })}>{t.accept}</Button>
                  <Button variant="ghost" onClick={() => act('friend_respond', { name: person.username, accept: false })}>{t.decline}</Button>
                </Person>
              ))}
              {lists.outgoing.map((person) => (
                <Person key={person.username} person={person} note={t.outgoing}>
                  <Button variant="quiet" onClick={() => act('friend_remove', { name: person.username })}>{t.cancel}</Button>
                </Person>
              ))}
            </ul>
          </div>
        )}
        {lists?.friends.length === 0 && <p className={styles.hint}>{t.empty}</p>}
        {lists?.friends.length > 0 && (
          <ul className={styles.people}>
            {lists.friends.map((person) => (
              <Person key={person.username} person={person}>
                {extras?.friendActions?.(person)}
                <ConfirmButton onConfirm={() => act('friend_remove', { name: person.username })}>{t.remove}</ConfirmButton>
                <ConfirmButton onConfirm={() => act('block_user', { name: person.username })}>{t.block}</ConfirmButton>
              </Person>
            ))}
          </ul>
        )}
      </section>
      {extras?.sections}
      {lists && <Search lists={lists} act={act} />}
      <Invite act={act} />
      {lists?.blocked.length > 0 && (
        <section className={styles.sheet} data-quiet>
          <h2 className={styles.subheading}>{t.blocked}</h2>
          <p className={styles.hint}>{t.blockNote}</p>
          <ul className={styles.people}>
            {lists.blocked.map((username) => (
              <li key={username} className={styles.person}>
                <span className={styles.personName}>{username}</span>
                <span className={styles.personActions}>
                  <Button variant="ghost" onClick={() => act('unblock_user', { name: username })}>{t.unblock}</Button>
                </span>
              </li>
            ))}
          </ul>
        </section>
      )}
    </SocialShell>
  )
}

/** `#/invite/<code>`: accept an invite link (after signing in and choosing a username, if needed). */
export function InvitePage() {
  const { friends: t } = useStrings()
  const code = inviteCodeFromHash(window.location.hash)
  const { ready, error, act } = useFriends()
  const [invalid, setInvalid] = useState(false)
  const accept = async () => {
    const name = await act('redeem_invite', { invite: code })
    setInvalid(name === null)
    if (name) {
      showToast({ text: t.invite.accepted(name) })
      window.location.hash = `#/u/${name}`
    }
  }
  return (
    <SocialShell>
      <section className={styles.sheet}>
        <h1 className={styles.heading}>{t.invite.heading}</h1>
        <p>{t.invite.page}</p>
        {ready && (
          <div className={styles.actions}>
            <Button onClick={accept}>{t.invite.accept}</Button>
          </div>
        )}
        {(invalid || error) && (
          <p className={styles.error} role="alert">
            {invalid ? t.invite.invalid : t.errors[error]}
          </p>
        )}
      </section>
      {!ready && <NeedProfile after={window.location.hash} />}
    </SocialShell>
  )
}

/** On another player's page: add, answer, remove or block, depending on how the two stand. */
export function FriendActions({ username, extras = null }) {
  const { friends: t } = useStrings()
  const { ready, lists, error, act } = useFriends()
  if (!ready || !lists) return null
  const has = (list) => lists[list].some((f) => f.username === username)
  const name = { name: username }
  return (
    <section className={styles.sheet} data-quiet>
      {error && (
        <p className={styles.error} role="alert">
          {t.errors[error]}
        </p>
      )}
      <div className={styles.actions}>
        {has('friends') ? (
          <>
            <span className={styles.label}>{t.isFriend}</span>
            {extras}
            <ConfirmButton onConfirm={() => act('friend_remove', name)}>{t.remove}</ConfirmButton>
          </>
        ) : has('incoming') ? (
          <>
            <span className={styles.label}>{t.askedYou}</span>
            <Button onClick={() => act('friend_respond', { ...name, accept: true })}>{t.accept}</Button>
            <Button variant="ghost" onClick={() => act('friend_respond', { ...name, accept: false })}>{t.decline}</Button>
          </>
        ) : has('outgoing') ? (
          <>
            <span className={styles.label}>{t.sent}</span>
            <Button variant="quiet" onClick={() => act('friend_remove', name)}>{t.cancel}</Button>
          </>
        ) : (
          <Button onClick={() => act('friend_request', name)}>{t.add}</Button>
        )}
        <ConfirmButton
          onConfirm={async () => {
            await act('block_user', name)
            window.location.hash = '#/friends'
          }}
        >
          {t.block}
        </ConfirmButton>
      </div>
    </section>
  )
}
