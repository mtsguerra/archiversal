import { ArrowRight, ArrowUp, ChevronDown, Stamp } from 'lucide-react'
import { AnimatePresence, motion } from 'motion/react'
import { useEffect, useMemo, useState } from 'react'
import { fetchBuilding, fetchCatalogue, fetchLibrary } from '../../api/buildings.js'
import { countryName } from '../../game/countries.js'
import { dailyId, dailyNumber, readLate, readPlayed } from '../../game/daily.js'
import { readProgress } from '../../game/progress.js'
import { FEATURES } from '../../game/features.js'
import { loreFact } from '../../game/lore.js'
import { readReading, toggleReading } from '../../game/readingList.js'
import { playBuilding, readLibrary } from '../../game/library.js'
import { collectionProgress, eraProgress, groupRows, joinRows, libraryStats, neighbourEras, passes, pickLocked } from '../../game/libraryView.js'
import { libraryEraFrom, libraryShowFrom } from '../../route.js'
import { formatYear, useEras } from '../../game/useEras.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { useReducedMotion } from '../../motionPref.js'
import { AppShell } from '../layout/AppShell.jsx'
import { menuSlots } from '../layout/menuSlots.jsx'
import { Button } from '../ui/Button.jsx'
import { Magnet } from '../ui/Magnet.jsx'
import { InfoTip } from '../ui/InfoTip.jsx'
import { JellyRadio } from '../ui/JellyRadio.jsx'
import { Compare, Detail } from './Detail.jsx'
import { EraDrawing } from './EraDrawing.jsx'
import { LibraryGlobe } from './LibraryGlobe.jsx'
import { thumb } from '../../game/thumb.js'
import { Mass } from './Marks.jsx'
import { ShareDialog } from './ShareDialog.jsx'
import { EraSheet } from './EraSheet.jsx'
import { EraStamp } from './EraStamp.jsx'
import { Plate } from './Plate.jsx'
import styles from './Library.module.css'

/** The flag emoji of an ISO 3166 alpha-2 code. */
const flagOf = (code) => [...code].map((c) => String.fromCodePoint(127397 + c.charCodeAt(0))).join('')

// A group folds like a drawer: the plates lift into the header one after another, then the panel closes.
const plateFold = { open: { opacity: 1, y: 0, scale: 1 }, closed: { opacity: 0, y: -28, scale: 0.88 } }

const SHOWS = ['all', 'open', 'mastered', 'locked', 'daily', 'reading']

function Stat({ label, value, total }) {
  return (
    <div className={styles.stat}>
      <span className={styles.statLabel}>{label}</span>
      <b className={styles.statValue}>
        {value}
        {total != null && <small> / {total}</small>}
      </b>
    </div>
  )
}

export function Library() {
  const strings = useStrings()
  const { lang } = useLanguage()
  const t = strings.library
  const eras = useEras()
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [unlocks] = useState(readLibrary)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('era')
  const [era, setEra] = useState(() => libraryEraFrom(window.location.hash))
  const [country, setCountry] = useState('')
  const [show, setShow] = useState(() => libraryShowFrom(window.location.hash) || 'all')
  const [feature, setFeature] = useState('')
  const [reading, setReading] = useState(readReading) // locked ids to find
  const [themesOf, setThemesOf] = useState({}) // building id -> theme ids (the collections)
  const [lore, setLore] = useState(null)
  const [sharing, setSharing] = useState(false)
  const [sheetEra, setSheetEra] = useState('') // the era whose study sheet is open
  const [selected, setSelected] = useState(null) // the row whose panel is open
  const [panelSide, setPanelSide] = useState('right') // the panel opens on the side away from the plate that was chosen
  const [pair, setPair] = useState([]) // ids picked for Compare, at most two
  const [comparing, setComparing] = useState(false)
  const [note, setNote] = useState('')
  // On wide screens each card of the side rail folds in place.
  const [erasOpen, setErasOpen] = useState(true)
  const [globeOpen, setGlobeOpen] = useState(true)
  const [collectionsOpen, setCollectionsOpen] = useState(false)
  const [stampsOpen, setStampsOpen] = useState(true)
  const [folded, setFolded] = useState(() => new Set()) // group keys folded on the sheet
  const toggleGroup = (key) => setFolded((f) => (f.has(key) ? new Set([...f].filter((k) => k !== key)) : new Set(f).add(key)))

  useEffect(() => {
    let current = true
    fetchLibrary(lang).then(
      (r) => current && (setRows(r), setFailed(false)),
      () => current && setFailed(true),
    )
    return () => {
      current = false
    }
  }, [lang])

  useEffect(() => {
    fetchCatalogue().then(
      (c) => setThemesOf(Object.fromEntries(c.map((b) => [b.id, b.themes ?? []]))),
      () => {},
    )
  }, [])

  // Country names in the player's language, so the table and the search both speak it.
  const joined = useMemo(
    () => (rows ? joinRows(rows.map((r) => ({ ...r, country: countryName(r.countryCode, lang) ?? r.country })), unlocks) : []),
    [rows, unlocks, lang],
  )
  const eraOrder = useMemo(() => (eras ?? []).map((e) => e.id), [eras])
  const stats = useMemo(() => libraryStats(joined), [joined])
  const collections = useMemo(() => collectionProgress(joined, themesOf), [joined, themesOf])
  // Daily lore: the building of Daily № n and a fact from its summary; until it is unlocked the card stays veiled.
  const day = dailyNumber()
  const dailyRowId = useMemo(() => (joined.length ? dailyId(joined.map((r) => r.id), day) : null), [joined, day])
  const loreRowId = joined.find((r) => r.id === dailyRowId)?.open ? dailyRowId : null
  useEffect(() => {
    if (!loreRowId) return undefined
    const controller = new AbortController()
    fetchBuilding(loreRowId, controller.signal, lang).then(
      (b) => setLore({ id: loreRowId, fact: loreFact(b.summary, day) }),
      () => {},
    )
    return () => controller.abort()
  }, [loreRowId, lang, day])
  const loreRow = joined.find((r) => r.id === loreRowId)
  const loreNow = lore?.id === loreRowId ? lore : null
  const progress = useMemo(() => eraProgress(joined), [joined])
  const eraLabel = (id) => strings.eras[id] ?? id
  const countryLabel = (code) => countryName(code, lang) ?? joined.find((r) => r.countryCode === code)?.country ?? code

  const countries = useMemo(
    () => [...new Map(joined.map((r) => [r.countryCode, countryLabel(r.countryCode)]))].sort((a, b) => a[1].localeCompare(b[1], lang)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [joined, lang],
  )
  const dailyIds = useMemo(() => {
    const ids = joined.map((r) => r.id)
    return ids.length ? Array.from({ length: day }, (_, i) => dailyId(ids, i + 1)) : [] // index n - 1 is Daily № n
  }, [joined, day])
  const dailies = useMemo(() => new Set(dailyIds), [dailyIds])
  // A Daily's stamp ink: one for a day not found, one for a day played on its day, one for a day played another day.
  const [onTime] = useState(() => new Set([...readProgress().days, ...readPlayed()]))
  const [late] = useState(() => new Set(readLate()))
  const stampOf = (n, found) => (!found ? 'var(--ink-soft)' : onTime.has(n) && !late.has(n) ? 'var(--accent)' : 'var(--russet)')
  const reduce = useReducedMotion()
  const [scrolled, setScrolled] = useState(false) // phones: a button back to the top once the page is scrolled
  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 600)
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])
  const filtered = useMemo(() => joined.filter((r) => passes(r, { era, country, show, query, feature, reading, dailies })), [joined, era, country, show, query, feature, reading, dailies])
  const groups = useMemo(() => (show === 'daily' ? [] : groupRows(filtered, group, eraOrder)), [filtered, group, eraOrder, show])
  // Dailies: newest first; a day not found shows only its number and is played from here. Filters hide the unfound ones.
  const filtering = Boolean(era || country || query || feature)
  const dailyDays = useMemo(() => {
    if (show !== 'daily') return []
    const shown = new Set(filtered.map((r) => r.id))
    return dailyIds.map((id, i) => ({ n: i + 1, id })).reverse().filter(({ id }) => shown.has(id) || (!filtering && !joined.find((r) => r.id === id)?.open))
  }, [show, filtered, dailyIds, joined, filtering])
  const unlockedByCountry = useMemo(() => {
    const out = {}
    for (const r of joined) if (r.open) out[r.countryCode] = (out[r.countryCode] ?? 0) + 1
    return out
  }, [joined])

  const title = (g) => (g.key === '~' ? t.undiscovered : group === 'era' ? eraLabel(g.key) : group === 'century' ? strings.themed.century(g.key) : countryLabel(g.key))
  const presentEras = eraOrder.filter((id) => progress[id])
  const byId = (id) => joined.find((r) => r.id === id)
  const open = selected && byId(selected)

  const toggleCompare = (id) => setPair((p) => (p.includes(id) ? p.filter((x) => x !== id) : [...p.slice(-1), id]))
  // "Play a locked one": a random locked building of the era in view, or of any era.
  const playLocked = (forEra = era) => {
    const id = pickLocked(joined, forEra, Math.random, reading)
    if (id) playBuilding(id)
    else setNote(t.noneLocked)
  }
  const eraDone = presentEras.filter((id) => progress[id].complete)
  const chooseEra = (id) => {
    setEra(id)
    setSelected(null)
  }

  return (
    <AppShell
      place={strings.places.library}
      slim
      {...menuSlots(strings.menu, undefined, false)}
      info={
        <InfoTip label={t.info.label}>
          <strong>{t.info.title}</strong>
          <span>{t.info.what}</span>
        </InfoTip>
      }
    >
      <div className={styles.page}>
        <h1 className={styles.srOnly}>{t.heading}</h1>
        {failed && <p role="alert">{t.failed}</p>}

        <div className={styles.sheet}>
          <div className={styles.stats}>
            <Stat label={t.stats.discovered} value={stats.discovered} total={stats.total} />
            <Stat label={t.stats.mastered} value={stats.mastered} total={stats.discovered} />
            <Stat label={t.stats.eras} value={stats.erasComplete} total={stats.erasTotal} />
            <Stat label={t.stats.countries} value={stats.countries} total={stats.countriesTotal} />
            <Stat label={t.stats.oldest} value={stats.oldest == null ? '–' : formatYear(stats.oldest, strings.years)} />
            <Magnet padding={90} magnetStrength={3} maxOffset={14} wrapperClassName={styles.shareWrap} innerClassName={styles.shareInner}>
              <Button className={styles.shareShelf} icon={Stamp} onClick={() => setSharing(true)}>
                {t.share.button}
              </Button>
            </Magnet>
          </div>

          <aside className={styles.lore} aria-label={t.lore.title}>
            {loreRow ? (
              <>
                <div className={styles.loreArt}>
                  {loreRow.photo ? <img src={thumb(loreRow.photo)} alt="" loading="lazy" /> : <Mass era={loreRow.era} className={styles.loreMass} />}
                  <span className={styles.loreNo}>№ {day}</span>
                </div>
                <div className={styles.loreBody}>
                  <span className={styles.loreTitle}>{t.lore.title}</span>
                  <h2 className={styles.loreName}>{loreRow.name}</h2>
                  <p className={styles.loreFact}>{loreNow ? loreNow.fact : t.lore.loading}</p>
                </div>
                <button type="button" className={styles.loreOpen} onClick={() => (window.location.hash = `#/library/${loreRow.id}`)}>
                  {t.lore.open}
                  <ArrowRight aria-hidden="true" strokeWidth={2} />
                </button>
              </>
            ) : (
              <div className={styles.loreBody}>
                <span className={styles.loreTitle}>{t.lore.title}</span>
                <p className={styles.loreFact}>{dailyRowId ? t.lore.locked(day) : t.lore.none}</p>
              </div>
            )}
          </aside>

          <div className={styles.tools}>
            <label className={styles.field}>
              <span>{t.search}</span>
              <input type="search" value={query} placeholder={t.searchPlaceholder} autoComplete="off" onChange={(e) => setQuery(e.target.value)} />
            </label>
            <label className={styles.field}>
              <span>{t.group}</span>
              <select value={group} onChange={(e) => setGroup(e.target.value)}>
                {Object.entries(t.groups).map(([value, label]) => (
                  <option key={value} value={value}>
                    {label}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{t.era}</span>
              <select value={era} onChange={(e) => chooseEra(e.target.value)}>
                <option value="">{t.allEras}</option>
                {presentEras.map((id) => (
                  <option key={id} value={id}>
                    {eraLabel(id)}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{t.country}</span>
              <select value={country} onChange={(e) => setCountry(e.target.value)}>
                <option value="">{t.allCountries}</option>
                {countries.map(([code, name]) => (
                  <option key={code} value={code}>
                    {name}
                  </option>
                ))}
              </select>
            </label>
            <label className={styles.field}>
              <span>{t.feature}</span>
              <select value={feature} onChange={(e) => setFeature(e.target.value)}>
                <option value="">{t.anyFeature}</option>
                {FEATURES.map((id) => (
                  <option key={id} value={id}>
                    {t.features[id]}
                  </option>
                ))}
              </select>
            </label>
            <div className={styles.field}>
              <span>{t.show}</span>
              <JellyRadio size="sm" ariaLabel={t.show} items={SHOWS.map((value) => ({ value, label: t.shows[value] }))} value={show} onChange={setShow} />
            </div>
          </div>
          {group !== 'era' && <p className={styles.hint}>{t.undiscoveredNote}</p>}
          {feature && <p className={styles.hint}>{t.featureNote}</p>}
          {show === 'reading' && <p className={styles.hint}>{reading.length ? t.reading.hint : t.reading.empty}</p>}
          {note && (
            <p className={styles.hint} role="status">
              {note}
            </p>
          )}

          <div className={styles.body}>
            <div className={styles.actions}>
              <Button onClick={() => playLocked()}>{era ? t.randomHere : t.random}</Button>
              <Button variant="ghost" disabled={pair.length < 2} onClick={() => setComparing(true)}>
                {t.compare.button(pair.length)}
              </Button>
            </div>
            <div className={styles.side}>
              <section className={styles.card} data-closed={!erasOpen || undefined}>
                <button type="button" className={styles.fold} aria-expanded={erasOpen} onClick={() => setErasOpen((o) => !o)}>
                  <span>{t.progress}</span>
                  <ChevronDown className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
                </button>
                <div className={styles.collapse}>
                  <nav className={`${styles.collapseInner} ${styles.eras}`} aria-label={t.progress}>
                    <span className={styles.sideTitle}>{t.progress}</span>
                    {presentEras.map((id) => {
                      const p = progress[id]
                      return (
                        <button key={id} type="button" className={styles.era} aria-pressed={era === id} onClick={() => chooseEra(era === id ? '' : id)}>
                          <span>{eraLabel(id)}</span>
                          <span className={styles.count}>
                            {p.complete && (
                              <span className={styles.eraMark} title={t.eraSet(eraLabel(id))}>
                                <EraDrawing era={id} small />
                              </span>
                            )}
                            {t.of(p.open, p.total)}
                          </span>
                          <i style={{ '--p': `${(p.open / p.total) * 100}%` }} />
                        </button>
                      )
                    })}
                  </nav>
                </div>
              </section>
              <section className={`${styles.card} ${styles.globeSlot}`} data-closed={!globeOpen || undefined}>
                <button type="button" className={styles.fold} aria-expanded={globeOpen} onClick={() => setGlobeOpen((o) => !o)}>
                  <span>{t.globe.title}</span>
                  <ChevronDown className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
                </button>
                <div className={styles.collapse}>
                  <div className={styles.collapseInner}>
                    <LibraryGlobe counts={unlockedByCountry} selected={country} nameOf={countryLabel} onPick={(code) => setCountry(country === code ? '' : code)} />
                  </div>
                </div>
              </section>
              <section className={styles.card} data-closed={!stampsOpen || undefined}>
                <button type="button" className={styles.fold} aria-expanded={stampsOpen} onClick={() => setStampsOpen((o) => !o)}>
                  <span>{t.stamps.title}</span>
                  <ChevronDown className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
                </button>
                <div className={styles.collapse}>
                  <div className={styles.collapseInner}>
                    <span className={styles.sideTitle}>{t.stamps.title}</span>
                    {eraDone.length ? (
                      <ul className={styles.stampGrid}>
                        {eraDone.map((id) => (
                          <li key={id} title={t.stamps.stamp(eraLabel(id))}>
                            <EraStamp era={id} label={eraLabel(id)} />
                          </li>
                        ))}
                      </ul>
                    ) : (
                      <p className={styles.hint}>{t.stamps.empty}</p>
                    )}
                    <p className={styles.hint}>
                      {t.stamps.hint} {t.stamps.earned(eraDone.length, presentEras.length)}
                    </p>
                  </div>
                </div>
              </section>
              <section className={styles.card} data-closed={!collectionsOpen || undefined}>
                <button type="button" className={styles.fold} aria-expanded={collectionsOpen} onClick={() => setCollectionsOpen((o) => !o)}>
                  <span>{t.collections.title}</span>
                  <ChevronDown className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
                </button>
                <div className={styles.collapse}>
                  <div className={`${styles.collapseInner} ${styles.eras}`}>
                    <span className={styles.sideTitle}>{t.collections.title}</span>
                    {Object.entries(collections)
                      .sort((a, b) => b[1].open / b[1].total - a[1].open / a[1].total || a[0].localeCompare(b[0]))
                      .map(([id, p]) => (
                        <div key={id} className={styles.era} data-done={p.complete || undefined}>
                          <span>{strings.themed.themes[id] ?? id}</span>
                          <span className={styles.count}>{p.complete ? t.collections.done : t.of(p.open, p.total)}</span>
                          <i style={{ '--p': `${(p.open / p.total) * 100}%` }} />
                        </div>
                      ))}
                    <p className={styles.hint}>{t.collections.hint}</p>
                  </div>
                </div>
              </section>
            </div>
            <div className={styles.tableWrap}>
              {show === 'daily' && (
                <div className={styles.plates}>
                  {dailyDays.map(({ n, id }) => {
                    const r = joined.find((x) => x.id === id)
                    return r?.open ? (
                      <div key={n} className={styles.dayCell} style={{ '--stamp': stampOf(n, true) }}>
                        <span className={styles.dayNo}>#{n}</span>
                        <Plate
                          row={r}
                          t={t}
                          meta={`${countryLabel(r.countryCode)} · ${r.yearCompleted == null ? '–' : formatYear(r.yearCompleted, strings.years)}`}
                          eraLabel={eraLabel(r.era)}
                          selected={selected === r.id}
                          inCompare={pair.includes(r.id)}
                          inReading={reading.includes(r.id)}
                          onReading={() => setReading((l) => toggleReading(l, r.id))}
                          onOpen={(el) => {
                            const box = el.getBoundingClientRect()
                            setPanelSide(box.left + box.width / 2 > window.innerWidth / 2 ? 'left' : 'right')
                            setSelected(r.id)
                          }}
                          onCompare={() => toggleCompare(r.id)}
                        />
                      </div>
                    ) : (
                      <a key={n} className={styles.dayTile} style={{ '--stamp': stampOf(n, false) }} href={n === day ? '#/daily' : `#/daily/${n}`}>
                        <span className={styles.dayTileNo}>#{n}</span>
                        <span className={styles.dayTilePlay}>{t.dailyPlay}</span>
                      </a>
                    )
                  })}
                </div>
              )}
              {groups.map((g) => {
                const complete = group === 'era' && progress[g.key]?.complete
                return (
                  <section key={g.key} className={styles.groupBlock}>
                    <div className={styles.groupHead} onClick={() => toggleGroup(g.key)}>
                      <button type="button" className={styles.groupButton} aria-expanded={!folded.has(g.key)}>
                        <ChevronDown className={styles.groupIcon} aria-hidden="true" strokeWidth={2} />
                        {group === 'country' && g.key !== '~' && <span className={styles.flag} aria-hidden="true">{flagOf(g.key)}</span>}
                        {title(g)}
                        <span className={styles.groupCount}>{group === 'era' ? t.of(progress[g.key].open, progress[g.key].total) : g.items.length}</span>
                        {complete && (
                          <span className={styles.done}>
                            <EraStamp era={g.key} label={eraLabel(g.key)} />
                            {t.eraComplete}
                          </span>
                        )}
                      </button>
                      {group === 'era' && (
                        <button
                          type="button"
                          className={styles.sheetButton}
                          onClick={(e) => {
                            e.stopPropagation()
                            setSheetEra(g.key)
                          }}
                        >
                          {t.sheet.button}
                        </button>
                      )}
                    </div>
                    <AnimatePresence initial={false}>
                      {!folded.has(g.key) && (
                        <motion.div
                          key="plates"
                          className={styles.drawer}
                          initial={reduce ? false : { height: 0 }}
                          animate={{ height: 'auto', transition: { duration: 0.35, ease: [0.22, 1, 0.36, 1], when: 'beforeChildren' } }}
                          exit={reduce ? { height: 0, transition: { duration: 0 } } : { height: 0, transition: { duration: 0.3, ease: [0.22, 1, 0.36, 1], when: 'afterChildren' } }}
                        >
                      <div className={styles.plates}>
                        {g.items.map((r, i) => (
                          <motion.div
                            key={r.id}
                            variants={plateFold}
                            initial={reduce ? false : 'closed'}
                            animate="open"
                            exit="closed"
                            transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1], delay: reduce ? 0 : Math.min(i * 0.025, 0.3) }}
                          >
                          <Plate
                            key={r.id}
                            row={r}
                            t={t}
                            meta={`${countryLabel(r.countryCode)} · ${r.yearCompleted == null ? '–' : formatYear(r.yearCompleted, strings.years)}`}
                            eraLabel={eraLabel(r.era)}
                            selected={selected === r.id}
                            inCompare={pair.includes(r.id)}
                            inReading={reading.includes(r.id)}
                            onReading={() => setReading((l) => toggleReading(l, r.id))}
                            onOpen={(el) => {
                              const box = el.getBoundingClientRect()
                              setPanelSide(box.left + box.width / 2 > window.innerWidth / 2 ? 'left' : 'right')
                              setSelected(r.id)
                            }}
                            onCompare={() => toggleCompare(r.id)}
                          />
                          </motion.div>
                        ))}
                      </div>
                        </motion.div>
                      )}
                    </AnimatePresence>
                  </section>
                )
              })}
              {rows && show !== 'daily' && groups.length === 0 && <p className={styles.empty}>{t.none}</p>}
            </div>
          </div>
        </div>
      </div>

      <button
        type="button"
        className={styles.toTop}
        data-shown={scrolled || undefined}
        aria-label={t.toTop}
        tabIndex={scrolled ? 0 : -1}
        onClick={() => window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })}
      >
        <ArrowUp aria-hidden="true" strokeWidth={2.25} />
      </button>

      {open && (
        <Detail
          key={open.id}
          side={panelSide}
          row={open}
          eraLabel={eraLabel}
          countryLabel={countryLabel}
          neighbours={neighbourEras(open.era, presentEras)}
          inCompare={pair.includes(open.id)}
          onCompare={() => toggleCompare(open.id)}
          onEra={chooseEra}
          onPlay={() => playLocked(open.era)}
          onClose={() => setSelected(null)}
        />
      )}
      {sharing && (
        <ShareDialog
          eras={presentEras.map((id) => ({ id, label: eraLabel(id), earned: Boolean(progress[id].complete) }))}
          stats={stats}
          onClose={() => setSharing(false)}
        />
      )}
      {sheetEra && (
        <EraSheet
          era={sheetEra}
          rows={joined}
          eraLabel={eraLabel}
          countryLabel={countryLabel}
          neighbours={neighbourEras(sheetEra, presentEras)}
          complete={Boolean(progress[sheetEra]?.complete)}
          onPlay={() => playLocked(sheetEra)}
          onEra={setSheetEra}
          onClose={() => setSheetEra('')}
        />
      )}
      {comparing && pair.length === 2 && (
        <Compare a={byId(pair[0])} b={byId(pair[1])} eraLabel={eraLabel} countryLabel={countryLabel} onClose={() => setComparing(false)} />
      )}
    </AppShell>
  )
}
