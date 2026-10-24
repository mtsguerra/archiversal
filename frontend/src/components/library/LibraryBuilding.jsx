import { ArrowLeft } from 'lucide-react'
import { useEffect, useState } from 'react'
import { fetchBuilding } from '../../api/buildings.js'
import { readLibrary } from '../../game/library.js'
import { useEras } from '../../game/useEras.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { libraryIdFrom } from '../../route.js'
import { BoardStatus } from '../board/BoardStatus.jsx'
import { AppShell } from '../layout/AppShell.jsx'
import { Round } from '../layout/Round.jsx'
import { SlimButton } from '../layout/SlimButton.jsx'
import { Button } from '../ui/Button.jsx'
import { LayoutGridIcon } from '../ui/icons.jsx'
import appStyles from '../../App.module.css'
import styles from './LibraryBuilding.module.css'

// What Round reads from a round that is already over: nothing was guessed here, so there are no fields or log.
const reopened = (building) => ({ building, phase: 'revealed', fields: null, given: [], log: [], outcome: null, hintsUsed: 0 })

const back = () => {
  window.location.hash = '#/library'
}

/** An unlocked building's reveal summary and drawings, opened from the Library (no guessing, no build-up). */
export function LibraryBuilding() {
  const strings = useStrings()
  const { lang } = useLanguage()
  const eras = useEras()
  const id = libraryIdFrom(window.location.hash)
  const unlocked = Boolean(readLibrary()[id])
  const [building, setBuilding] = useState(null)
  const [failed, setFailed] = useState(false)
  const [view, setView] = useState('summary')

  // A locked building has no page: the URL is not a way around the Library.
  useEffect(() => {
    if (!unlocked) back()
  }, [unlocked])

  useEffect(() => {
    if (!unlocked) return undefined
    const controller = new AbortController()
    fetchBuilding(id, controller.signal, lang).then(setBuilding, (e) => e.name !== 'AbortError' && setFailed(true))
    return () => controller.abort()
  }, [id, lang, unlocked])

  const label = strings.library.back
  return (
    <AppShell
      place={strings.places.library}
      slim
      menu={
        <span className={styles.deskOnly}>
          <SlimButton icon={LayoutGridIcon} onClick={back}>
            {label}
          </SlimButton>
        </span>
      }
      actions={
        <span className={styles.phoneOnly}>
          <Button variant="rail" icon={LayoutGridIcon} compact aria-label={label} onClick={back}>
            {label}
          </Button>
        </span>
      }
    >
      <a className={styles.backLink} href="#/library">
        <ArrowLeft aria-hidden="true" strokeWidth={2} />
        {strings.library.backLink}
      </a>
      <div className={appStyles.sheet}>
        {failed ? (
          <BoardStatus status="error" onRetry={() => setFailed(false)} />
        ) : building ? (
          <Round round={reopened(building)} eras={eras} view={view} onViewChange={setView} replay={false} />
        ) : (
          <BoardStatus status="loading" />
        )}
      </div>
    </AppShell>
  )
}
