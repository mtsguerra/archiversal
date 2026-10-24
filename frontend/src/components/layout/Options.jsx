import { useRef, useState } from 'react'
import { useStrings } from '../../i18n.js'
import { LanguageSwitch } from './LanguageSwitch.jsx'
import { MotionToggle } from './MotionToggle.jsx'
import { SoundToggle } from './SoundToggle.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'
import { Button } from '../ui/Button.jsx'
import styles from './Options.module.css'

/** Phones: one round button opens a bottom sheet holding sound, language, theme and motion (wider screens show them in the header). */
export function Options() {
  const { options, language } = useStrings()
  const sheet = useRef(null)
  const button = useRef(null)
  const [moved, setMoved] = useState(false) // the knobs slide once per tap
  const rows = [
    [options.sound, <SoundToggle key="s" />],
    [language.label, <LanguageSwitch key="l" />],
    [options.theme, <ThemeToggle key="t" />],
    [options.motion, <MotionToggle key="m" />],
  ]
  return (
    <>
      <button ref={button} type="button" className={styles.button} aria-label={options.label} aria-haspopup="dialog" data-moved={moved || undefined} onPointerDown={() => setMoved(true)} onClick={() => sheet.current.showModal()}>
        <svg onAnimationEnd={() => setMoved(false)} viewBox="0 0 24 24" aria-hidden="true" focusable="false">
          <path d="M4 7h9M17 7h3M4 17h3M11 17h9" />
          <circle cx="15" cy="7" r="2" />
          <circle cx="9" cy="17" r="2" />
        </svg>
      </button>
      <dialog
        ref={sheet}
        className={styles.sheet}
        aria-labelledby="options-title"
        onClick={(event) => event.target === sheet.current && sheet.current.close()} // a tap on the dimmed page
        onClose={() => button.current.focus({ preventScroll: true })} // Safari does not return focus to a tapped button
      >
        <span className={styles.handle} aria-hidden="true" />
        <h2 id="options-title" className={styles.title}>
          {options.label}
        </h2>
        {rows.map(([label, control]) => (
          <div key={label} className={styles.row}>
            <span>{label}</span>
            {control}
          </div>
        ))}
        <Button className={styles.done} onClick={() => sheet.current.close()}>
          {options.done}
        </Button>
      </dialog>
    </>
  )
}
