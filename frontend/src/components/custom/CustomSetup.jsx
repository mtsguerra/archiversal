import { useEffect, useMemo, useState } from 'react'
import { motion } from 'motion/react'
import { PlayIcon } from '../ui/icons.jsx'
import { fetchCatalogue } from '../../api/buildings.js'
import { countryName } from '../../game/countries.js'
import {
  MIN_BUILDINGS,
  MODES,
  filterPool,
  facets,
  readConfig,
  saveConfig,
  startSession,
} from '../../game/custom.js'
import { springSoft } from '../../motion.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { useFitToScreen } from '../home/useFitToScreen.js'
import { AppShell } from '../layout/AppShell.jsx'
import { menuSlots } from '../layout/menuSlots.jsx'
import { InfoTip } from '../ui/InfoTip.jsx'
import { Button } from '../ui/Button.jsx'
import { CompassIcon, GlobeClockIcon, GlobeIcon, HourglassIcon } from '../ui/InstrumentIcons.jsx'
import { JellyRadio } from '../ui/JellyRadio.jsx'
import { RoundsSlider } from './RoundsSlider.jsx'
import { Dimension } from './Dimension.jsx'
import { Arch } from './Arch.jsx'
import { MultiPicker } from './MultiPicker.jsx'
import styles from './CustomSetup.module.css'

/** Which pickers each mode shows. */
const MODE_ICONS = { architect: <CompassIcon />, era: <HourglassIcon />, country: <GlobeIcon />, countryEra: <GlobeClockIcon /> }
const PICKERS = { architect: ['architects'], era: ['eras'], country: ['countries'], countryEra: ['countries', 'eras'] }

export function CustomSetup() {
  const strings = useStrings()
  const { lang } = useLanguage()
  const { custom } = strings
  const [catalogue, setCatalogue] = useState(null)
  const [failed, setFailed] = useState(false)
  const [config, setConfig] = useState(readConfig)
  const [last, setLast] = useState(() => (config.rounds === 'all' ? 10 : config.rounds)) // the slider's number, kept while "All" is on
  useFitToScreen() // the setup fits one screen on a wide window

  useEffect(() => {
    fetchCatalogue().then(setCatalogue).catch(() => setFailed(true))
  }, [])
  useEffect(() => saveConfig(config), [config])

  const rows = useMemo(() => {
    if (!catalogue) return { architects: [], eras: [], countries: [] }
    return {
      architects: facets(catalogue, (b) => b.architects, (name) => name),
      eras: facets(catalogue, (b) => [b.era], (id) => strings.eras[id] ?? id),
      countries: facets(
        catalogue,
        (b) => [b.countryCode],
        (code) => countryName(code, lang) ?? catalogue.find((b) => b.countryCode === code).country,
      ),
    }
  }, [catalogue, lang, strings])

  const pool = useMemo(() => (catalogue ? filterPool(catalogue, config) : []), [catalogue, config])
  const ready = pool.length >= MIN_BUILDINGS
  const set = (patch) => setConfig((c) => ({ ...c, ...patch }))

  const start = () => {
    startSession(pool, config)
    window.location.hash = '#/custom/play'
  }

  return (
    <AppShell
      place={strings.places.custom}
      slim
      {...menuSlots(strings.menu)}
      info={
        <InfoTip label={custom.info.label}>
          <strong>{custom.info.title}</strong>
          <span>{custom.info.what}</span>
        </InfoTip>
      }
    >
      <div className={styles.setup}>
        <h1 className={styles.srOnly}>{custom.heading}</h1>

        {failed && <p role="alert">{custom.failed}</p>}

        <div className={styles.sheet}>
          <section className={styles.step} data-step="filter">
            <h2 className={styles.stepTitle}>
              <span className={styles.num}>1</span>
              {custom.modeLabel}
            </h2>
            <JellyRadio
              ariaLabel={custom.modeLabel}
              items={MODES.map((mode) => ({ value: mode, label: custom.modes[mode], icon: MODE_ICONS[mode] }))}
              value={config.mode}
              onChange={(mode) => set({ mode })}
            />
          </section>

          <section className={styles.step} data-step="pick">
            <h2 className={styles.stepTitle}>
              <span className={styles.num}>2</span>
              {custom.pickStep}
            </h2>
            <div className={styles.pickers}>
              {PICKERS[config.mode].map((kind) => (
                <MultiPicker
                  key={kind}
              kind={kind}
                  label={custom.pick[kind]}
                  placeholder={custom.search}
                  // Nothing is "not found" while the list is still loading.
                  emptyText={catalogue ? custom.none : ''}
                  rows={rows[kind]}
                  selected={config[kind]}
                  onChange={(keys) => set({ [kind]: keys })}
                />
              ))}
            </div>
          </section>

          <section className={styles.step} data-step="rounds">
            <h2 className={styles.stepTitle}>
              <span className={styles.num}>3</span>
              {custom.rounds}
            </h2>
            <RoundsSlider
              value={config.rounds}
              all={pool.length}
              onChange={(rounds) => set({ rounds })}
              last={last}
              onLast={setLast}
            />
          </section>
        </div>

        <footer className={styles.footer}>
          <Arch count={pool.length} needed={MIN_BUILDINGS} />
          <div className={styles.status}>
            <p className={styles.lead}>{custom.lead(MIN_BUILDINGS)}</p>
            <Dimension count={pool.length} needed={MIN_BUILDINGS} text={custom.matches(pool.length)} />
          </div>
          {/* Keyed on readiness so unlocking Start gives it a small settle. */}
          <motion.div key={ready} className={ready ? styles.go : undefined} initial={ready ? { scale: 0.92 } : false} animate={{ scale: 1 }} transition={springSoft}>
            <Button icon={PlayIcon} disabled={!ready} data-sound="start" onClick={start}>
              {custom.start}
            </Button>
          </motion.div>
        </footer>
      </div>
    </AppShell>
  )
}
