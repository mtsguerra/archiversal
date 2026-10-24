import { LayoutGridIcon } from '../ui/icons.jsx'
import { LibraryLink } from './LibraryLink.jsx'
import { MenuButton } from './MenuButton.jsx'
import { SlimButton } from './SlimButton.jsx'
import styles from './AppShell.module.css'

/** The Menu for a slim-header screen: spread into AppShell as `{...menuSlots(label)}`. */
export function menuSlots(label, onClick = () => (window.location.hash = '#/'), library = true) {
  return {
    menu: (
      <span className={styles.deskOnly}>
        <SlimButton icon={LayoutGridIcon} onClick={onClick}>{label}</SlimButton>
      </span>
    ),
    library: library && (
      <span className={styles.deskOnly}>
        <LibraryLink />
      </span>
    ),
    actions: (
      <span className={styles.phoneOnly}>
        <MenuButton onClick={onClick} />
      </span>
    ),
  }
}
