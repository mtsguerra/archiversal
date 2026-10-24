import { useEffect, useMemo, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'motion/react'
import {
  ArrowDownUp, Building2, Castle, Check, ChevronDown, ChevronRight, Church, Cross, Crown, Dices, Flower, Flower2, Gem, Goal,
  Grid3x3, House, Layers, Library, Landmark, MoonStar, Sparkles, Theater, TrainFront,
} from 'lucide-react'
import { PlayIcon } from '../ui/icons.jsx'
import { fetchCatalogue } from '../../api/buildings.js'
import { THEMED_ROUNDS, THEME_GROUPS, blockLayout, columnsFor, readThemedPick, saveThemedPick, startThemedSession, themePool, themesOf } from '../../game/themed.js'
import { duration, easeOut, springSoft } from '../../motion.js'
import { useStrings } from '../../i18n.js'
import { useReducedMotion } from '../../motionPref.js'
import { AppShell } from '../layout/AppShell.jsx'
import { menuSlots } from '../layout/menuSlots.jsx'
import { Button } from '../ui/Button.jsx'
import { InfoTip } from '../ui/InfoTip.jsx'
import { THEME_COVERS } from './themeCovers.js'
import { JellyRadio } from '../ui/JellyRadio.jsx'
import { DifficultyAccordion } from './DifficultyAccordion.jsx'
import { RuinsIcon, TowerIcon } from './ThemeIcons.jsx'
import styles from './ThemedSetup.module.css'

const ICONS = {
  castles: Castle, 'churches-cathedrals': Church, mosques: MoonStar, monasteries: Cross, palaces: Crown,
  museums: Landmark, 'theatres-opera': Theater, 'railway-stations': TrainFront, 'bridges-towers': TowerIcon,
  skyscrapers: Building2, libraries: Library, 'houses-villas': House, stadiums: Goal, 'asian-temples': Flower,
  'ancient-ruins': RuinsIcon, brutalism: Layers, 'art-nouveau': Flower2, 'art-deco': Gem,
  'portuguese-azulejo': Grid3x3, 'modern-icons': Sparkles,
}

/** The theme index: one numbered row per theme; the chosen row opens its difficulty strip. */
export function ThemedSetup() {
  const strings = useStrings()
  const { themed } = strings
  const reduce = useReducedMotion()
  const [catalogue, setCatalogue] = useState(null)
  const [failed, setFailed] = useState(false)
  const [pick, setPick] = useState(readThemedPick)
  const [query, setQuery] = useState('')
  const [group, setGroup] = useState('all')
  const [sortOpen, setSortOpen] = useState(false)
  const [sort, setSort] = useState('') // '' keeps the theme list's order
  const sheetRef = useRef(null)
  const [rolling, setRolling] = useState(false)
  // The menu folds on wide screens; folded, the rail steps aside and the tiles take its room.
  const [menuOpen, setMenuOpen] = useState(true)
  const railClosed = !menuOpen
  const rollTimer = useRef(0)
  useEffect(() => {
    if (!sortOpen) return undefined
    const close = (e) => !e.target.closest?.(`.${styles.order}`) && setSortOpen(false)
    document.addEventListener('pointerdown', close)
    return () => document.removeEventListener('pointerdown', close)
  }, [sortOpen])
  const [geo, setGeo] = useState({ fit: 4, wide: false, width: 0, height: 0, pad: 0, padV: 0, gap: 0, rem: 16 }) // what the sheet can hold, measured

  useEffect(() => {
    fetchCatalogue().then(setCatalogue).catch(() => setFailed(true))
  }, [])
  useEffect(() => saveThemedPick(pick), [pick])
  useEffect(() => () => clearTimeout(rollTimer.current), []) // leaving mid-roll must not start a game
  useEffect(() => {
    const el = sheetRef.current
    if (!el) return undefined
    const measure = () => {
      const rem = parseFloat(getComputedStyle(document.documentElement).fontSize)
      const css = getComputedStyle(el)
      setGeo({
        fit: Math.max(1, Math.floor((el.clientWidth / rem - 1.5 + 1) / 13.5)), // 12.5rem tiles, 1rem gaps, 1.5rem padding
        wide: window.matchMedia('(min-width: 1025px)').matches,
        width: el.clientWidth,
        height: el.clientHeight,
        pad: parseFloat(css.paddingLeft) + parseFloat(css.paddingRight),
        padV: parseFloat(css.paddingTop) + parseFloat(css.paddingBottom),
        gap: parseFloat(css.columnGap) || 0,
        rem,
      })
    }
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [catalogue])

  // Rows keep the order of the theme list, not of the counts, so a theme never jumps while the data grows.
  const rows = useMemo(() => {
    if (!catalogue) return []
    const counts = new Map(themesOf(catalogue).map((t) => [t.id, t.count]))
    return Object.keys(themed.themes).filter((id) => counts.has(id)).map((id) => ({ id, count: counts.get(id) }))
  }, [catalogue, themed.themes])

  // The menu's filter: a name search (accents ignored) and one group of themes.
  const shown = useMemo(() => {
    const plain = (s) => s.normalize('NFD').replace(/\p{M}/gu, '').toLowerCase()
    const q = plain(query.trim())
    const list = rows.filter(({ id }) => (group === 'all' || THEME_GROUPS[group].includes(id)) && plain(themed.themes[id]).includes(q))
    if (sort === 'az') list.sort((a, b) => themed.themes[a.id].localeCompare(themed.themes[b.id]))
    if (sort === 'most') list.sort((a, b) => b.count - a.count)
    return list
  }, [rows, query, group, sort, themed.themes])

  const picked = rows.find((r) => r.id === pick.theme)
  const PickedIcon = ICONS[pick.theme] ?? Landmark

  // Wide screens: the chosen tile opens into a block of cells (photo + difficulty) that closes every row. Rows then get a fixed height.
  const block = geo.wide && shown.some((r) => r.id === pick.theme) ? blockLayout(shown.length, geo.fit) : null
  const cols = block ? block.cols : columnsFor(shown.length, geo.fit)
  // Rows are 4:3 tiles, but never so tall that the block outgrows the frame: it must show whole (the photo is cropped, not stretched).
  const tileH = block
    ? Math.max(7 * geo.rem, Math.min(((geo.width - geo.pad - geo.gap * (cols - 1)) / cols) * 0.75, (geo.height - geo.padV - geo.gap * (block.h - 1)) / block.h))
    : 0
  const compact = !!block && tileH * block.h + geo.gap * (block.h - 1) < 27 * geo.rem // a short block gets a tighter card

  // The opened block comes into view when it was chosen or its size changed (not while the dice are still rolling).
  useEffect(() => {
    // On phones the opened row's drawer is long; the row goes to the top of the list so the difficulty and Start show.
    if (rolling || !pick.theme || (!block && !window.matchMedia('(max-width: 640px)').matches)) return
    // Measured from the layout (offsetTop), not from where the gliding tiles are drawn, so it lands right while they move.
    const sheet = sheetRef.current
    const row = document.getElementById(`theme-${pick.theme}`)
    if (sheet && row) sheet.scrollTo({ top: row.offsetTop - sheet.offsetTop - parseFloat(getComputedStyle(sheet).paddingTop), behavior: reduce ? 'auto' : 'smooth' })
  }, [pick.theme, !!block, rolling, reduce, cols, Math.round(tileH)]) // eslint-disable-line react-hooks/exhaustive-deps

  const start = (theme = pick.theme) => {
    startThemedSession(themePool(catalogue, theme), theme, pick.level, undefined, pick.extras)
    window.location.hash = '#/themed/play'
  }
  // Random theme draws from what the filter shows. The dice roll while the highlight flicks through themes, slowing, and lands on the draw, which opens so the player picks the difficulty.
  const surprise = () => {
    if (rolling) return
    const draw = () => shown[Math.floor(Math.random() * shown.length)].id
    const final = draw()
    if (reduce) return setPick((p) => ({ ...p, theme: final }))
    setRolling(true)
    const STEPS = 11
    let i = 0
    const tick = () => {
      if (i === STEPS) return setRolling(false)
      i += 1
      setPick((p) => ({ ...p, theme: i === STEPS ? final : draw() }))
      rollTimer.current = setTimeout(tick, i === STEPS ? 450 : 60 + i * 16)
    }
    tick()
  }

  return (
    <AppShell place={strings.places.themed} slim {...menuSlots(strings.menu)} info={
      <InfoTip label={themed.info.label}>
        <strong>{themed.info.title}</strong>
        <span>{themed.info.what}</span>
        <span>{themed.levels.map((l) => `${l.name}: ${l.text}`).join(' · ')}</span>
        <span>{themed.info.blur}</span>
      </InfoTip>
    }>
      <div className={styles.setup}>
        <header className={styles.intro}>
          <h1 className={styles.srOnly}>{themed.heading}</h1>
        </header>

        {failed && <p role="alert">{themed.failed}</p>}
        {catalogue && rows.length === 0 && <p>{themed.empty}</p>}

        <div className={styles.body} data-rail={railClosed ? 'closed' : 'open'}>
        <aside className={styles.menu} aria-label={themed.menu.label} data-closed={!menuOpen || undefined}>
          <button type="button" className={styles.fold} aria-expanded={menuOpen} data-sound="toggle" onClick={() => setMenuOpen((o) => !o)}>
            <span>{themed.menu.label}</span>
            <ChevronDown className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
          </button>
          <div className={styles.collapse}>
          <div className={styles.collapseInner}>
          <input
            type="search"
            className={styles.search}
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={themed.menu.search}
            aria-label={themed.menu.search}
          />
          <div className={styles.groups}>
            <JellyRadio
              size="sm"
              radius={999}
              gap={6}
              swell={0.06}
              barge={0}
              shrink={0.02}
              activeColor="var(--accent)"
              activeTextColor="var(--accent-ink)"
              ariaLabel={themed.menu.groupsLabel}
              items={['all', ...Object.keys(THEME_GROUPS)].map((g) => ({ value: g, label: g === 'all' ? themed.menu.all : themed.menu.groups[g] }))}
              value={group}
              onChange={setGroup}
            />
          </div>
          <div className={styles.order} onKeyDown={(e) => e.key === 'Escape' && setSortOpen(false)}>
            <button type="button" className={styles.orderBtn} data-set={sort || undefined} aria-haspopup="listbox" aria-expanded={sortOpen} aria-label={themed.menu.sortLabel} data-sound="toggle" onClick={() => setSortOpen((o) => !o)}>
              <ArrowDownUp aria-hidden="true" strokeWidth={2} />
              <span>{themed.menu.sort[sort || 'list']}</span>
              <ChevronDown className={styles.orderChevron} aria-hidden="true" strokeWidth={2} />
            </button>
            {sortOpen && (
              <ul className={styles.orderList} role="listbox" aria-label={themed.menu.sortLabel}>
                {['', 'az', 'most'].map((k) => (
                  <li key={k} role="option" aria-selected={sort === k} tabIndex={0} data-sound="choose" onClick={() => { setSort(k); setSortOpen(false) }} onKeyDown={(e) => (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), setSort(k), setSortOpen(false))}>
                    <Check aria-hidden="true" strokeWidth={2.5} />
                    {themed.menu.sort[k || 'list']}
                  </li>
                ))}
              </ul>
            )}
          </div>
          <Button icon={Dices} compact className={styles.random} aria-label={themed.surprise} data-sound="dice" disabled={shown.length === 0} data-rolling={rolling || undefined} onClick={surprise}>
            {themed.surprise}
          </Button>
          </div>
          </div>
        </aside>
        {/* Folded: a slim tab keeps the way back. */}
        <div className={styles.railDock}>
          <button type="button" className={styles.railTab} aria-label={themed.menu.show} data-sound="toggle" onClick={() => setMenuOpen(true)}>
            <ChevronRight className={styles.foldIcon} aria-hidden="true" strokeWidth={2} />
            <span>{themed.menu.label}</span>
          </button>
        </div>
        <div className={styles.frame}>
        <ol
          ref={sheetRef}
          className={styles.sheet}
          aria-label={themed.themeStep}
          data-few={shown.length <= 2 || undefined}
          data-block={!!block || undefined}
          style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))`, gridAutoRows: block ? `${tileH}px` : undefined }}
        >
          {shown.length === 0 && catalogue && rows.length > 0 && <li className={styles.none}>{themed.menu.none}</li>}
          {shown.map(({ id, count }) => {
            const Icon = ICONS[id] ?? Landmark
            const open = pick.theme === id
            return (
              // layout: when a tile opens or closes the grid re-flows, and every tile glides to its new place and size (a spring)
              <motion.li key={id} id={`theme-${id}`} layout transition={reduce ? { duration: 0 } : springSoft} className={styles.row} data-open={open || undefined} data-block={(open && block) || undefined} style={{ '--cover': `url("${THEME_COVERS[id]}")`, ...(open && block ? { '--w': block.w, '--h': block.h } : null) }}>
                <motion.button
                  layout
                  transition={reduce ? { duration: 0 } : springSoft}
                  type="button"
                  className={styles.theme}
                  data-sound="pick"
                  aria-expanded={open}
                  aria-controls={open ? `levels-${id}` : undefined}
                  onClick={() => setPick((p) => ({ ...p, theme: open ? null : id }))}
                >
                  {/* Decorative and blurred: it must never help the player identify a building. */}
                  <motion.img layout className={styles.photo} src={THEME_COVERS[id]} alt="" loading="lazy" decoding="async" />
                  <span className={styles.num}>{String(rows.findIndex((r) => r.id === id) + 1).padStart(2, '0')}</span>
                  <Icon className={styles.icon} aria-hidden="true" strokeWidth={1.6} />
                  <motion.span layout="position" className={styles.name}>{themed.themes[id]}</motion.span>
                  <motion.span layout="position" className={styles.count}>{themed.count(count)}</motion.span>
                  {open && (
                    <motion.span className={styles.desc} initial={reduce ? false : { opacity: 0, y: 8 }} animate={{ opacity: 1, y: 0 }} transition={reduce ? { duration: 0 } : { ...springSoft, delay: 0.2 }}>
                      {themed.descriptions[id]}
                    </motion.span>
                  )}
                  <ChevronDown className={styles.caret} aria-hidden="true" strokeWidth={2} />
                </motion.button>
                {/* Wide screens: the difficulty is a glass card over the opened photo. */}
                {open && (
                  <motion.div
                    className={styles.unitCard}
                    data-compact={compact || undefined}
                    initial={reduce ? false : { opacity: 0, y: 18, scale: 0.96 }}
                    animate={{ opacity: 1, y: 0, scale: 1 }}
                    transition={reduce ? { duration: 0 } : { ...springSoft, delay: 0.22 }}
                  >
                    <p className={styles.levelTitle}>{themed.levelStep}</p>
                    <DifficultyAccordion fill compact={compact} className={styles.unitAcc} level={pick.level} onLevel={(level) => setPick((p) => ({ ...p, level }))} extras={pick.extras} onExtras={(extras) => setPick((p) => ({ ...p, extras }))} label={themed.levelStep} strings={strings} />
                    <div className={styles.go}>
                      <span className={styles.rounds}>{themed.rounds(Math.min(THEMED_ROUNDS, count))}</span>
                      <Button icon={PlayIcon} data-sound="start" onClick={() => start()}>
                        {themed.start}
                      </Button>
                    </div>
                  </motion.div>
                )}
                <AnimatePresence initial={false}>
                  {open && (
                    <motion.div
                      id={`levels-${id}`}
                      className={styles.drawer}
                      initial={reduce ? false : { height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={reduce ? { opacity: 0 } : { height: 0, opacity: 0 }}
                      transition={{ duration: reduce ? 0 : duration.base, ease: easeOut }}
                    >
                      <div className={styles.drawerInner}>
                        <p className={styles.levelTitle}>{themed.levelStep}</p>
                        <DifficultyAccordion level={pick.level} onLevel={(level) => setPick((p) => ({ ...p, level }))} extras={pick.extras} onExtras={(extras) => setPick((p) => ({ ...p, extras }))} label={themed.levelStep} strings={strings} />
                        <div className={styles.go}>
                          <span className={styles.rounds}>{themed.rounds(Math.min(THEMED_ROUNDS, count))}</span>
                          <Button icon={PlayIcon} data-sound="start" onClick={() => start()}>
                            {themed.start}
                          </Button>
                        </div>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.li>
            )
          })}
        </ol>
        </div>

        {/* Wide screens: the chosen theme's levels sit in a card beside the index instead of a drawer. */}
        <aside className={styles.detail} aria-label={themed.levelStep}>
          {picked ? (
            <>
              <div className={styles.detailHead}>
                <PickedIcon className={styles.detailIcon} aria-hidden="true" strokeWidth={1.4} />
                <div>
                  <p className={styles.detailName}>{themed.themes[pick.theme]}</p>
                  <p className={styles.count}>{themed.count(picked.count)}</p>
                </div>
              </div>
              <p className={styles.levelTitle}>{themed.levelStep}</p>
              <DifficultyAccordion level={pick.level} onLevel={(level) => setPick((p) => ({ ...p, level }))} extras={pick.extras} onExtras={(extras) => setPick((p) => ({ ...p, extras }))} label={themed.levelStep} strings={strings} />
              <div className={styles.go}>
                <span className={styles.rounds}>{themed.rounds(Math.min(THEMED_ROUNDS, picked.count))}</span>
                <Button icon={PlayIcon} data-sound="start" onClick={() => start()}>
                  {themed.start}
                </Button>
              </div>
            </>
          ) : (
            <p className={styles.lead}>{themed.pickOne}</p>
          )}
        </aside>
        <p className={styles.credit}>
          {themed.coverCredit}{' '}
          <a href="https://commons.wikimedia.org/" target="_blank" rel="noopener noreferrer">Wikimedia Commons</a>
        </p>
        </div>

      </div>
    </AppShell>
  )
}
