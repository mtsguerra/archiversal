import { useStrings } from '../../i18n.js'
import { useAccount } from '../../social/account.js'
import { Avatar } from './Avatar.jsx'
import styles from './social.module.css'

/**
 * The way to the account: a round button in the header on wide screens, a text link in the phone's
 * Options sheet (`text`). Always shown: with no accounts configured the profile screen says so.
 */
export function AccountLink({ text = false }) {
  const { account: t } = useStrings()
  const { status, profile } = useAccount()
  const label = status === 'in' ? (profile?.username ?? t.nav) : status === 'off' ? t.nav : t.signIn
  return (
    <a className={text ? styles.accountText : styles.accountRound} href="#/profile" aria-label={text ? undefined : label} title={text ? undefined : label}>
      {text ? label : <Avatar id={status === 'in' ? profile?.avatar : 'arch'} size="100%" />}
    </a>
  )
}

/**
 * Phones: the header hides the toggles, so the way to the account sits beside the Options button, written
 * "Login" until signed in, then the player's avatar.
 */
export function PhoneLogin() {
  const { account: t } = useStrings()
  const { status, profile } = useAccount()
  const signedIn = status === 'in' && profile
  return (
    <a className={signedIn ? `${styles.phoneLogin} ${styles.phoneAvatar}` : styles.phoneLogin} href="#/profile" aria-label={signedIn ? profile.username : undefined}>
      {signedIn ? (
        <Avatar id={profile.avatar} size="100%" />
      ) : (
        <>
          <Avatar id="arch" size="1.5rem" />
          {t.login}
        </>
      )}
    </a>
  )
}
