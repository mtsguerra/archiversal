import { useEffect, useState } from 'react'
import { motion } from 'motion/react'
import { springSoft } from '../../motion.js'
import { useStrings } from '../../i18n.js'
import { LanguageSwitch } from './LanguageSwitch.jsx'
import { Options } from './Options.jsx'
import { MotionNote } from './MotionNote.jsx'
import { MotionToggle } from './MotionToggle.jsx'
import { SoundToggle } from './SoundToggle.jsx'
import { ThemeToggle } from './ThemeToggle.jsx'
import { PageBackground } from './PageBackground.jsx'
import { useAutoHide } from './autoHide.js'
import styles from './AppShell.module.css'
import { useHeaderTitle } from '../../headerTitle.js'

function PlanMark() {
  return (
    <svg className={styles.mark} viewBox="0 0 32 32" aria-hidden="true">
      <rect width="32" height="32" rx="6" fill="var(--oxblood)" />
      <g fill="none" stroke="var(--cream)" strokeWidth="2.2" strokeLinecap="square">
        <path d="M7 7h18v18H7z" />
        <path d="M7 16h7M18 7v6" />
        <path d="M14 16a6 6 0 0 1 6 6" strokeWidth="1.6" />
      </g>
    </svg>
  )
}

/**
 * @param place  where the player is (Daily #3, Custom…), shown beside the logo
 * @param slim   the game's header: a thin line (the Menu on the left, `actions` on the right) that tucks away
 *               while the page scrolls down and returns when it scrolls up; no box, no big name
 * @param info  slim only: a note (an InfoTip) shown beside the logo and place
 * @param menu   the slim header's left control
 * @param library  a Library link beside it
 * @param bottomBar  'phone' or 'reveal' when a fixed bar covers the bottom of the screen (on phones only, or at every size),
 *               so the credits footer gets room above it
 * @param floating  drop the rail's strip and let the logo and controls float over the page (the home and Custom pages)
 * @param brand  'always' shows the small name in the header; 'afterHero' (the home page, which has the big
 *               drawn name in the page) shows it only once that has scrolled away
 */
export function AppShell({ actions, place, brand = 'always', floating = false, slim = false, info, menu, library, bottomBar, children }) {
  const strings = useStrings()
  const title = useHeaderTitle()
  // The rail's edge only appears once content scrolls under it.
  const [scrolled, setScrolled] = useState(false)
  const [pastHero, setPastHero] = useState(false)
  useEffect(() => {
    const onScroll = () => {
      setScrolled(window.scrollY > 4)
      setPastHero(window.scrollY > 240)
    }
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const scrolledAway = useAutoHide()
  const [peek, setPeek] = useState(false) // the pointer is at the top edge or on the bar
  const [focused, setFocused] = useState(false) // a control in the bar has the keyboard
  const hidden = slim && scrolledAway && !peek && !focused

  const header = slim ? (
    <>
      {/* A hair-thin strip at the very top: pointing at it brings the bar back. */}
      <div className={styles.edge} onMouseEnter={() => setPeek(true)} aria-hidden="true" />
      <motion.header
        className={styles.slim}
        animate={{ y: hidden ? '-100%' : '0%', opacity: hidden ? 0 : 1 }}
        transition={springSoft}
        onMouseEnter={() => setPeek(true)}
        onMouseLeave={() => setPeek(false)}
        onFocus={() => setFocused(true)}
        onBlur={() => setFocused(false)}
        inert={hidden || undefined}
      >
        <div className={styles.slimLeft}>
          {menu}
          {library}
        </div>
        <span className={styles.slimGroup} data-info={info ? true : undefined}>
          <a className={styles.slimBrand} href="#/" aria-label={strings.appName} data-away={title ? true : undefined}>
            <PlanMark />
            {place && <span>{place}</span>}
          </a>
          {info}
        </span>
        <div className={styles.slimRight}>
          {actions}
          <span className={styles.tools}>
            <ThemeToggle />
            <SoundToggle />
            <MotionToggle />
            <LanguageSwitch />
          </span>
          <Options />
        </div>
      </motion.header>
    </>
  ) : null

  return (
    <div className={styles.shell} data-slim={slim || undefined} data-floating={floating || undefined} data-bottom-bar={bottomBar}>
      <PageBackground />
      <MotionNote />
      {header}
      {!slim && <header className={styles.rail} data-scrolled={scrolled || undefined}>
        {place && <span className={styles.place}>{place}</span>}
        <a className={styles.brand} href="#/" aria-label={strings.appName} data-hidden={(brand === 'afterHero' && !pastHero) || undefined}>
          <PlanMark />
          <span className={styles.name}>
            <span className={styles.wordmark}>{strings.appName}</span>
            <span className={styles.tagline}>{strings.tagline}</span>
          </span>
        </a>
        <div className={styles.actions}>
          {actions}
          <span className={styles.toggles}>
            <ThemeToggle />
            <SoundToggle />
            <MotionToggle />
            <LanguageSwitch />
          </span>
          <Options />
        </div>
      </header>}
      <main className={styles.main}>{children}</main>
      <footer className={styles.footer}>
        <p>
          {strings.credits.images}{' '}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noreferrer">
            {strings.credits.commons}
          </a>
          {strings.credits.facts}{' '}
          <a href="https://www.wikipedia.org/" target="_blank" rel="noreferrer">
            {strings.credits.wikipedia}
          </a>{' '}
          (
          <a href="https://creativecommons.org/licenses/by-sa/4.0/" target="_blank" rel="noreferrer">
            {strings.credits.licence}
          </a>
          ). {strings.credits.hintBackground} (
          <a
            href="https://commons.wikimedia.org/wiki/File:Focus_on_the_floating_footpath_of_the_Skywalk_in_3-dimensional_image,_Dutch_modern_architecture_design_in_free_image,_created_by_Arjan_and_Fons_Heijnsbroek.tif"
            target="_blank"
            rel="noreferrer"
          >
            {strings.credits.hintBackgroundLicence}
          </a>
          ).
        </p>
      </footer>
    </div>
  )
}
