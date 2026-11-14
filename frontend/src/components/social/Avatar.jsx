import { PATHS } from '../../social/avatars.js'
import styles from './social.module.css'

/** An avatar by id (an unknown id draws the arch). Decorative: the username beside it is the label. */
export function Avatar({ id, size = '2.5rem' }) {
  return (
    <svg className={styles.avatar} style={{ width: size, height: size }} viewBox="-4 -4 32 32" aria-hidden="true" focusable="false">
      <circle cx="12" cy="12" r="15.25" />
      <path d={PATHS[id] ?? PATHS.arch} />
    </svg>
  )
}
