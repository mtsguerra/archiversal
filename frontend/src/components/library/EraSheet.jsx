import { useEffect, useRef } from 'react'
import { eraFacts } from '../../game/libraryView.js'
import { formatYear } from '../../game/useEras.js'
import { useStrings } from '../../i18n.js'
import { Button } from '../ui/Button.jsx'
import { EraDrawing } from './EraDrawing.jsx'
import { EraStamp } from './EraStamp.jsx'
import styles from './Detail.module.css'

/**
 * A one-page study sheet for an era, made only from what the player has unlocked in it (its years, countries,
 * architects and the features its buildings show) and the styles the game answers "Close!" for.
 */
export function EraSheet({ era, rows, eraLabel, countryLabel, neighbours, complete, onPlay, onEra, onClose }) {
  const strings = useStrings()
  const t = strings.library
  const dialog = useRef(null)
  useEffect(() => {
    const el = dialog.current
    if (!el.open) el.showModal()
    return () => el.open && el.close()
  }, [])
  const f = eraFacts(rows, era)
  const years = f.from == null ? null : f.from === f.to ? formatYear(f.from, strings.years) : `${formatYear(f.from, strings.years)} – ${formatYear(f.to, strings.years)}`
  const list = (items) => items.join(', ')
  return (
    <dialog ref={dialog} className={styles.dialog} aria-label={t.sheet.title(eraLabel(era))} onClose={(e) => !e.currentTarget.open && onClose()}>
      <button type="button" className={styles.close} onClick={onClose} aria-label={t.close}>
        ×
      </button>
      <span className={styles.eyebrow}>{t.sheet.title(eraLabel(era))}</span>
      <div className={styles.sheetTop}>
        <div className={styles.sheetArt}>{complete ? <EraStamp era={era} label={eraLabel(era)} /> : <EraDrawing era={era} />}</div>
        <p className={styles.text}>{t.sheet.found(f.open, f.total)}</p>
      </div>
      {f.open === 0 ? (
        <p className={styles.text}>{t.sheet.none}</p>
      ) : (
        <dl className={styles.facts}>
          {years && (
            <>
              <dt>{t.sheet.span}</dt>
              <dd>{years}</dd>
            </>
          )}
          <dt>{t.sheet.countries}</dt>
          <dd>{list(f.countries.map(countryLabel))}</dd>
          <dt>{t.sheet.architects}</dt>
          <dd>{list(f.architects)}</dd>
          {f.features.length > 0 && (
            <>
              <dt>{t.sheet.features}</dt>
              <dd>{list(f.features.map(([id, n]) => `${t.features[id]} (${n})`))}</dd>
            </>
          )}
        </dl>
      )}
      {neighbours.length > 0 && (
        <div className={styles.near}>
          <span className={styles.eyebrow}>{t.sheet.neighbours}</span>
          <div className={styles.chips}>
            {neighbours.map((id) => (
              <button key={id} type="button" onClick={() => onEra(id)}>
                {eraLabel(id)}
              </button>
            ))}
          </div>
        </div>
      )}
      <div className={styles.actions}>
        <Button onClick={onPlay}>{t.sheet.play}</Button>
      </div>
    </dialog>
  )
}
