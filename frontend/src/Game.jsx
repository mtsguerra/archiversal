import { useEffect, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import { ChevronDown } from 'lucide-react'
import { BookIcon, CheckIcon, LayoutGridIcon, ShuffleIcon } from './components/ui/icons.jsx'
import { dailyNumber } from './game/daily.js'
import { clearSession, readSession, restoreSession } from './game/custom.js'
import { clearThemedSession, readThemedSession, restoreThemedSession } from './game/themed.js'
import { showToast } from './components/ui/toast.js'
import { useEras } from './game/useEras.js'
import { usePullToNext } from './game/usePullToNext.js'
import { useGameRound } from './game/useGameRound.js'
import { duration, easeOut, springSoft } from './motion.js'
import { useStrings } from './i18n.js'
import { stamp } from './game/sound.js'
import { AppShell } from './components/layout/AppShell.jsx'
import { BoardStatus } from './components/board/BoardStatus.jsx'
import { RevealBar } from './components/layout/RevealBar.jsx'
import { Recap } from './components/custom/Recap.jsx'
import { ThemedRecap } from './components/themed/ThemedRecap.jsx'
import { SlimButton } from './components/layout/SlimButton.jsx'
import { Round } from './components/layout/Round.jsx'
import { Button } from './components/ui/Button.jsx'
import styles from './App.module.css'
import { useReducedMotion } from './motionPref.js'

// Sheet swap: the old drawing set is pulled off the mat, the new one is laid down
// as a drafting line wipes across it.
const sheetOut = { opacity: 0, x: -48, rotate: -1.5, filter: 'blur(4px)' }
const roundMotion = {
  initial: { opacity: 0, x: 40, y: 12, rotate: 1, filter: 'blur(4px)', clipPath: 'inset(-24px 100% -24px -24px)' },
  animate: {
    opacity: 1,
    x: 0,
    y: 0,
    rotate: 0,
    filter: 'blur(0px)',
    clipPath: 'inset(-24px -24px -24px -24px)',
    // Position springs (it can be redirected mid-flight); the wipe and blur are timed.
    transition: {
      x: springSoft,
      y: springSoft,
      rotate: springSoft,
      opacity: { duration: duration.base, ease: easeOut },
      filter: { duration: duration.slow, ease: easeOut },
      clipPath: { duration: duration.slow * 1.4, ease: easeOut },
    },
  },
  exit: { ...sheetOut, transition: { x: springSoft, rotate: springSoft, opacity: { duration: duration.base, ease: easeOut }, filter: { duration: duration.base } } },
}
const plainMotion = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
}

/** Two taps for a move you cannot take back: the first arms it (and times out), the second does it. */
function useConfirm(action) {
  const [armed, setArmed] = useState(false)
  useEffect(() => {
    if (!armed) return undefined
    const timer = setTimeout(() => setArmed(false), 4000)
    return () => clearTimeout(timer)
  }, [armed])
  const press = () => {
    if (!armed) return setArmed(true)
    setArmed(false)
    action()
  }
  return { armed, press, cancel: () => setArmed(false) }
}

// The session each session-based mode keeps, and the screen its Undo returns to.
const SESSIONS = {
  custom: { read: readSession, clear: clearSession, restore: restoreSession, play: '#/custom/play' },
  themed: { read: readThemedSession, clear: clearThemedSession, restore: restoreThemedSession, play: '#/themed/play' },
}

/** @param {'normal' | 'daily' | 'custom' | 'themed'} mode */
export default function Game({ mode = 'normal', day }) {
  const strings = useStrings()
  const reduceMotion = useReducedMotion()
  const daily = mode === 'daily'
  const round = useGameRound(mode, day)
  const allEras = useEras()
  // A themed game offers only the styles that occur in its theme.
  const eras = round.themed && allEras ? allEras.filter((e) => round.themed.eras.includes(e.id)) : allEras
  const { phase, building } = round
  const loading = phase === 'loading'
  const revealed = phase === 'revealed'
  // The Daily's result card lands a moment after the reveal overlay clears.
  useEffect(() => {
    if (!(daily && revealed)) return undefined
    const timer = setTimeout(stamp, 1600)
    return () => clearTimeout(timer)
  }, [daily, revealed])

  // Drawings or summary after the reveal; it starts on the summary for each building.
  const [viewFor, setViewFor] = useState({ id: null, view: 'summary' })
  const view = building && viewFor.id === building.id ? viewFor.view : 'summary'
  const toggleView = () => setViewFor({ id: building.id, view: view === 'summary' ? 'board' : 'summary' })
  // After a reveal, pulling the page down moves to the next building (Normal and Custom, on touch).
  const next = useConfirm(round.loadNext)
  const pullIndicator = usePullToNext(phase === 'revealed' && !daily, round.loadNext)

  // Leaving a custom session ends it at once; for a few seconds Undo puts it back where it was
  // (the building you were on, though not the guesses you had typed for it).
  const leave = (to = '#/') => {
    const store = SESSIONS[mode]
    const session = store && phase !== 'done' ? store.read() : null
    if (session) {
      store.clear()
      showToast({
        text: strings.custom.ended,
        actionLabel: strings.custom.undo,
        onAction: () => {
          store.restore(session)
          window.location.hash = store.play
        },
      })
    }
    window.location.hash = to
  }

  let content
  if (phase === 'error') {
    content = <BoardStatus key="error" status="error" onRetry={round.reload} />
  } else if (phase === 'done') {
    content = mode === 'themed' ? <ThemedRecap key="recap" onAgain={round.reload} /> : <Recap key="recap" onAgain={round.reload} />
  } else if (!building) {
    content = <BoardStatus key="loading" status="loading" />
  } else {
    content = (
      <div key={building.id}>
        <Round
          round={round}
          eras={eras}
          view={view}
          onViewChange={(next) => setViewFor({ id: building.id, view: next })}
          daily={daily && { number: day ?? dailyNumber() }}
        />
      </div>
    )
  }

  return (
    <AppShell
      place={daily ? strings.daily.title(day ?? dailyNumber()) : (strings.places[mode] ?? strings.places.normal)}
      slim
      bottomBar={revealed ? 'reveal' : 'phone'}
      menu={
        <span className={styles.desktopOnly}>
          <SlimButton icon={LayoutGridIcon} onClick={() => leave()}>
            {strings.menu}
          </SlimButton>
        </span>
      }
      library={
        <span className={styles.desktopOnly}>
          <SlimButton icon={BookIcon} onClick={() => leave('#/library')}>
            {strings.library.nav}
          </SlimButton>
        </span>
      }
      actions={
        !daily && phase !== 'done' ? (
          <span className={styles.desktopOnly}>
            <SlimButton icon={ShuffleIcon} onClick={next.press} disabled={loading}>
              {next.armed ? strings.nextConfirm : strings.nextBuilding}
            </SlimButton>
          </span>
        ) : null
      }
    >
      {/* After the reveal: what to do next, fixed at the bottom. */}
      {revealed && building && (
        <>
          <RevealBar
            view={view}
            onToggleView={toggleView}
            wikipedia={building.wikipedia}
            onMenu={() => leave()}
            onNext={daily ? () => (window.location.hash = '#/play') : round.loadNext}
            nextLabel={daily ? strings.daily.playGuesser : undefined}
            daily={daily ? { fields: round.fields, hintsUsed: round.hintsUsed, number: day ?? dailyNumber() } : null}
          />
        </>
      )}
      {/* On phones the same controls sit in a bar within thumb reach. */}
      {!revealed && (
        <>
          <div className={styles.bar}>
            <Button variant="ghost" icon={LayoutGridIcon} onClick={() => leave()} compact className={styles.barMenu} aria-label={strings.menu}>
              {strings.menu}
            </Button>
            {phase === 'playing' && (
              <Button type="submit" form="guess-form" icon={CheckIcon} className={styles.barCheck}>
                {strings.guess.submit}
              </Button>
            )}
          </div>
        </>
      )}
      <div ref={pullIndicator} className={styles.pull} aria-hidden="true">
        <ChevronDown strokeWidth={2} />
        <span className={styles.pullHint}>{strings.pull.hint}</span>
        <span className={styles.pullRelease}>{strings.pull.release}</span>
      </div>
      <AnimatePresence mode="wait">
        <motion.div
          key={content.key}
          className={styles.sheet}
          variants={reduceMotion ? plainMotion : roundMotion}
          initial="initial"
          animate={loading && building ? { opacity: 0.6, y: 0 } : 'animate'}
          exit="exit"
          inert={loading || undefined}
        >
          {content}
          {!reduceMotion && (
            <motion.span
              className={styles.line}
              aria-hidden="true"
              initial={{ left: '0%', opacity: 1 }}
              animate={{ left: '100%', opacity: [1, 1, 0], transition: { duration: duration.slow * 1.4, ease: easeOut } }}
            />
          )}
        </motion.div>
      </AnimatePresence>
      {/* On phones, another building sits at the very end of the page and asks twice. */}
      {!revealed && !daily && phase !== 'done' && building && (
        <div className={styles.nextEnd}>
          <Button icon={ShuffleIcon} onClick={next.press} disabled={loading} variant={next.armed ? 'primary' : 'ghost'} className={styles.nextEndButton}>
            {next.armed ? strings.nextConfirm : strings.nextBuilding}
          </Button>
          {next.armed && (
            <Button variant="quiet" onClick={next.cancel}>
              {strings.nextCancel}
            </Button>
          )}
        </div>
      )}
    </AppShell>
  )
}
