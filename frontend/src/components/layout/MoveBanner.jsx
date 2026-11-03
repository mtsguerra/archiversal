import { useState } from 'react'
import { useStrings } from '../../i18n.js'
import { hasSave, importLink } from '../../game/save.js'
import styles from './MoveBanner.module.css'

const OLD_HOST = 'arch-guesser.vercel.app'
const NEW_ORIGIN = 'https://archiversal.vercel.app'

/** On the old address only: offers to carry the saved progress to the new one. */
export function MoveBanner() {
  const t = useStrings().move
  const [shown, setShown] = useState(true)
  if (window.location.hostname !== OLD_HOST || !shown) return null
  return (
    <div className={styles.banner} role="region" aria-label={t.label}>
      <span>{t.text}</span>
      <a className={styles.go} href={hasSave() ? importLink(NEW_ORIGIN) : NEW_ORIGIN}>
        {hasSave() ? t.move : t.open}
      </a>
      <button type="button" className={styles.close} onClick={() => setShown(false)} aria-label={t.dismiss}>
        ×
      </button>
    </div>
  )
}
