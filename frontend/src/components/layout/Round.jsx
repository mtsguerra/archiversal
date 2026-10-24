import { useEffect, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { AnimatePresence, LayoutGroup, motion } from 'motion/react'
import { MapIcon } from '../ui/icons.jsx'
import { duration, easeOut } from '../../motion.js'
import { useStrings } from '../../i18n.js'
import { DrawingBoard } from '../board/DrawingBoard.jsx'
import { GuessForm } from '../guess/GuessForm.jsx'
import { GuessLog } from '../guess/GuessLog.jsx'
import { HintTray } from '../hints/HintTray.jsx'
import { BuildingSummary } from '../summary/BuildingSummary.jsx'
import { RevealBuild } from '../reveal/RevealBuild.jsx'
import { Button } from '../ui/Button.jsx'
import styles from './Round.module.css'

const layoutTransition = { duration: duration.slow * 1.2, ease: easeOut }
const fade = {
  initial: { opacity: 0 },
  animate: { opacity: 1, transition: { duration: duration.base, ease: easeOut, delay: duration.fast } },
  exit: { opacity: 0, transition: { duration: duration.fast } },
}

/**
 * One round. While playing: board | guess sheet + hints. Once revealed, the
 * board steps back into a reference column beside the summary; the player can
 * swap back to the full drawings at any time. Remount per building. `replay={false}` (the Library) skips the build-up.
 */
export function Round({ round, eras, view, onViewChange, daily = false, replay = true }) {
  const strings = useStrings()
  const { building, phase } = round
  const revealed = phase === 'revealed'
  const [built, setBuilt] = useState(!replay) // the Library reopens a building without the build-up
  const [settled, setSettled] = useState(!replay) // the reveal build-up has finished fading out
  const summary = revealed
  const expanded = revealed && view === 'board' // the drawings grown to full width above the summary
  const board = useRef(null)
  useEffect(() => {
    if (expanded) board.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }, [expanded])

  return (
    <LayoutGroup>
      {/* Portalled to the body: the round sits inside a transformed wrapper, which would pin a fixed overlay to it. */}
      {createPortal(
        <AnimatePresence onExitComplete={() => setSettled(true)}>
          {revealed && !built && (
            <RevealBuild key="build" building={building} solved={round.outcome === 'solved'} onDone={() => setBuilt(true)} />
          )}
        </AnimatePresence>,
        document.body,
      )}
      <div className={summary ? styles.summaryLayout : styles.playLayout} data-expanded={expanded || undefined}>
        <motion.div ref={board} layout="position" transition={layoutTransition} className={styles.boardSlot}>
          <motion.div layout transition={layoutTransition} hidden={summary && !expanded}>
            <DrawingBoard building={building} revealed={revealed} fields={round.fields} given={round.given} />
          </motion.div>
          {summary ? (
            <motion.div {...fade} className={styles.boardAction}>
              <Button variant="ghost" icon={MapIcon} onClick={() => onViewChange(expanded ? 'summary' : 'board')}>
                {expanded ? strings.summary.showSummary : strings.summary.showDrawings}
              </Button>
            </motion.div>
          ) : (
            <motion.div {...fade} className={styles.hints}>
              <HintTray
                hints={building.hints}
                hintLevel={round.hintLevel}
                canReveal={phase === 'playing'}
                onReveal={round.revealHint}
              />
            </motion.div>
          )}
        </motion.div>

        <AnimatePresence mode="popLayout" initial={false}>
          {summary ? (
            <motion.div key="summary" exit={fade.exit}>
              <BuildingSummary
                building={building}
                eras={eras}
                fields={round.fields}
                log={round.log}
                play={settled}
                onOpenBoard={() => onViewChange('board')}
                outcome={round.outcome}
                daily={daily ? { fields: round.fields, hintsUsed: round.hintsUsed, number: daily.number } : null}
              />
            </motion.div>
          ) : (
            <motion.aside key="aside" className={styles.aside} {...fade}>
              <GuessForm
                building={building}
                eras={eras}
                centuries={round.themed?.centuries}
                phase={phase}
                fields={round.fields}
                attempts={round.attempts}
                outcome={round.outcome}
                onSubmit={round.submitGuess}
                onEdit={round.editField}
                onGiveUp={round.revealAnswer}
              />
              <GuessLog log={round.log} eras={eras} />
            </motion.aside>
          )}
        </AnimatePresence>
      </div>
    </LayoutGroup>
  )
}
