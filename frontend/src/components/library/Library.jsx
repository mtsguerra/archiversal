import { ChevronDown } from 'lucide-react'
import { useEffect, useMemo, useState } from 'react'
import { fetchLibrary } from '../../api/buildings.js'
import { countryName } from '../../game/countries.js'
import { playBuilding, readLibrary } from '../../game/library.js'
import { eraProgress, groupRows, joinRows, libraryStats, neighbourEras, passes, pickLocked } from '../../game/libraryView.js'
import { libraryEraFrom } from '../../route.js'
import { formatYear, useEras } from '../../game/useEras.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { AppShell } from '../layout/AppShell.jsx'
import { menuSlots } from '../layout/menuSlots.jsx'
import { Button } from '../ui/Button.jsx'
import { InfoTip } from '../ui/InfoTip.jsx'
import { JellyRadio } from '../ui/JellyRadio.jsx'
import { Compare, Detail } from './Detail.jsx'
import { EraDrawing } from './EraDrawing.jsx'
import { LibraryGlobe } from './LibraryGlobe.jsx'
import { Marks, Mass } from './Marks.jsx'
import styles from './Library.module.css'

const SHOWS = ['all', 'open', 'mastered', 'locked']

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
  const [show, setShow] = useState('all')
  const [selected, setSelected] = useState(null) // the row whose panel is open
  const [pair, setPair] = useState([]) // ids picked for Compare, at most two
  const [comparing, setComparing] = useState(false)
  const [note, setNote] = useState('')
  // On wide screens each card of the side rail folds in place.
  const [erasOpen, setErasOpen] = useState(true)
  const [globeOpen, setGlobeOpen] = useState(true)
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

  // Country names in the player's language, so the table and the search both speak it.
  const joined = useMemo(
    () => (rows ? joinRows(rows.map((r) => ({ ...r, country: countryName(r.countryCode, lang) ?? r.country })), unlocks) : []),
    [rows, unlocks, lang],
  )
  const eraOrder = useMemo(() => (eras ?? []).map((e) => e.id), [eras])
  const stats = useMemo(() => libraryStats(joined), [joined])
  const progress = useMemo(() => eraProgress(joined), [joined])
  const eraLabel = (id) => strings.eras[id] ?? id
  const countryLabel = (code) => countryName(code, lang) ?? joined.find((r) => r.countryCode === code)?.country ?? code

  const countries = useMemo(
    () => [...new Map(joined.map((r) => [r.countryCode, countryLabel(r.countryCode)]))].sort((a, b) => a[1].localeCompare(b[1], lang)),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [joined, lang],
  )
  const filtered = useMemo(() => joined.filter((r) => passes(r, { era, country, show, query })), [joined, era, country, show, query])
  const groups = useMemo(() => groupRows(filtered, group, eraOrder), [filtered, group, eraOrder])
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
    const id = pickLocked(joined, forEra)
    if (id) playBuilding(id)
    else setNote(t.noneLocked)
  }
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
          </div>

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
            <div className={styles.field}>
              <span>{t.show}</span>
              <JellyRadio size="sm" ariaLabel={t.show} items={SHOWS.map((value) => ({ value, label: t.shows[value] }))} value={show} onChange={setShow} />
            </div>
          </div>
          {group !== 'era' && <p className={styles.hint}>{t.undiscoveredNote}</p>}
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
            </div>
            <div className={styles.tableWrap}>
              <table className={styles.table}>
                <thead>
                  <tr>
                    <th>{t.cols.sheet}</th>
                    <th />
                    <th>{t.cols.building}</th>
                    <th>{t.cols.architect}</th>
                    <th>{t.cols.country}</th>
                    <th>{t.cols.year}</th>
                    <th>{t.cols.marks}</th>
                    <th>
                      <span className={styles.srOnly}>{t.compare.title}</span>
                    </th>
                  </tr>
                </thead>
                {groups.map((g) => {
                  const complete = group === 'era' && progress[g.key]?.complete
                  return (
                    <tbody key={g.key}>
                      <tr className={styles.group}>
                        <th colSpan={8} scope="colgroup">
                          <button type="button" className={styles.groupButton} aria-expanded={!folded.has(g.key)} onClick={() => toggleGroup(g.key)}>
                            <ChevronDown className={styles.groupIcon} aria-hidden="true" strokeWidth={2} />
                            {title(g)}
                            <span className={styles.groupCount}>{group === 'era' ? t.of(progress[g.key].open, progress[g.key].total) : g.items.length}</span>
                            {complete && (
                              <span className={styles.done}>
                                <EraDrawing era={g.key} small />
                                {t.eraComplete}
                              </span>
                            )}
                          </button>
                        </th>
                      </tr>
                      {(folded.has(g.key) ? [] : g.items).map((r) => (
                        <tr key={r.id} data-locked={!r.open || undefined} data-selected={selected === r.id || undefined} onClick={() => setSelected(r.id)}>
                          <td className={styles.no}>{r.no}</td>
                          <td className={styles.thumb}>
                            <Mass era={r.era} />
                          </td>
                          <th scope="row" className={styles.name}>
                            <button type="button" className={styles.rowButton} onClick={(e) => (e.stopPropagation(), setSelected(r.id))} aria-label={r.open ? r.name : `${r.no}, ${t.locked}`}>
                              {r.open ? r.name : <span className={styles.redact} style={{ '--w': `${5 + (r.no.slice(2) % 4)}rem` }} />}
                            </button>
                          </th>
                          {r.open ? (
                            <>
                              <td>{r.architects.join(', ')}</td>
                              <td>{countryLabel(r.countryCode)}</td>
                              <td className={styles.year}>{r.yearCompleted == null ? '–' : formatYear(r.yearCompleted, strings.years)}</td>
                              <td>
                                <Marks row={r} t={t} />
                              </td>
                              <td>
                                <button
                                  type="button"
                                  className={styles.cmp}
                                  aria-pressed={pair.includes(r.id)}
                                  aria-label={`${pair.includes(r.id) ? t.compare.remove : t.compare.add}: ${r.name}`}
                                  title={pair.includes(r.id) ? t.compare.remove : t.compare.add}
                                  onClick={(e) => (e.stopPropagation(), toggleCompare(r.id))}
                                >
                                  +
                                </button>
                              </td>
                            </>
                          ) : (
                            <>
                              <td aria-hidden="true">
                                <span className={styles.redact} style={{ '--w': `${4 + (r.no.slice(2) % 3)}rem` }} />
                              </td>
                              <td aria-hidden="true">
                                <span className={styles.redact} style={{ '--w': '3rem' }} />
                              </td>
                              <td aria-hidden="true">
                                <span className={styles.redact} style={{ '--w': '2.4rem' }} />
                              </td>
                              <td>
                                <span className={styles.chip}>{eraLabel(r.era)}</span>
                              </td>
                              <td />
                            </>
                          )}
                        </tr>
                      ))}
                    </tbody>
                  )
                })}
              </table>
              {rows && groups.length === 0 && <p className={styles.empty}>{t.none}</p>}
            </div>
          </div>
        </div>
      </div>

      {open && (
        <Detail
          key={open.id}
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
      {comparing && pair.length === 2 && (
        <Compare a={byId(pair[0])} b={byId(pair[1])} eraLabel={eraLabel} countryLabel={countryLabel} onClose={() => setComparing(false)} />
      )}
    </AppShell>
  )
}
