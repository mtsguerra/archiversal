import { useEffect, useRef, useState } from 'react'
import { animate, motion } from 'motion/react'
import { Check, Eye } from 'lucide-react'
import { ExternalIcon } from '../ui/icons.jsx'
import { guessText } from '../../game/guessText.js'
import { centuryOf, decadeOf } from '../../game/dates.js'
import { scoreOf } from '../../game/matchGuess.js'
import { eraName, formatYear } from '../../game/useEras.js'
import { duration, easeOut } from '../../motion.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { ArchImage } from '../ui/ArchImage.jsx'
import { Credit } from '../ui/Credit.jsx'
import { countryName } from '../../game/countries.js'
import { DailyCard } from './DailyCard.jsx'
import styles from './BuildingSummary.module.css'
import { isReduced, useReducedMotion } from '../../motionPref.js'
import { hatchScore, signScore } from '../../game/sound.js'
import { setHeaderTitle } from '../../headerTitle.js'

// The monograph unfolds section by section as the board steps back.
const unfold = {
  hidden: {},
  shown: { transition: { staggerChildren: 0.07, delayChildren: 0.18 } },
}
const section = {
  hidden: { opacity: 0, y: 18 },
  shown: { opacity: 1, y: 0, transition: { duration: duration.slow, ease: easeOut } },
}

function FactStrip({ building, era }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const { location } = building
  const items = [
    [strings.summary.facts.location, [location.city, countryName(location.countryCode, lang) ?? location.country].filter(Boolean).join(', ')],
    [strings.summary.facts.completed, building.yearCompleted == null ? strings.summary.facts.underConstruction : formatYear(building.yearCompleted, strings.years)],
    [
      strings.summary.facts.era,
      era ? (
        eraName(era, strings)
      ) : (
        building.era
      ),
    ],
    [strings.summary.facts.style, building.style],
  ].filter(([, value]) => value != null && value !== '')

  return (
    <dl className={styles.strip}>
      {items.map(([label, value]) => (
        <div key={label} className={styles.stripCell}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The row's diagonal hatching (45 degrees, a line every 7px across, 2px thick), drawn stroke by stroke from left to right. */
const HATCH_GAP = 7 * Math.SQRT2 // 7px between lines, measured across them
function Hatch({ row, play }) {
  const root = useRef(null)
  const [size, setSize] = useState(null)
  useEffect(() => {
    const el = root.current
    if (!el) return undefined
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const strokes = size ? Array.from({ length: Math.ceil((size.w + size.h) / HATCH_GAP) + 1 }, (_, i) => i * HATCH_GAP - size.h) : []
  // The scratch follows the drawing: the CSS starts the strokes 0.9 s plus 0.15 s a row after the sheet is allowed to play.
  const count = strokes.length
  useEffect(() => {
    if (!play || !count || isReduced()) return undefined
    return hatchScore(0.9 + row * 0.15, count, row)
  }, [play, count, row])
  return (
    <svg ref={root} className={styles.hatch} viewBox={size ? `0 0 ${size.w} ${size.h}` : undefined} aria-hidden="true" style={{ '--row': row }}>
      {size &&
        strokes.map((x, i) => (
          <path key={i} d={`M${x} ${size.h}L${x + size.h} 0`} style={{ '--i': i, '--len': size.h * Math.SQRT2 }} />
        ))}
    </svg>
  )
}

/**
 * All four right: once everything else has been drawn, a pen plots a second rule round the sheet,
 * leaving a glow behind its nib. Waits for `play`; under reduced motion the rule is simply there.
 */
const SIGN_DELAY = 2.7
const SIGN_TIME = 1.4
function SignOff({ play }) {
  const reduce = useReducedMotion()
  const root = useRef(null)
  const line = useRef(null)
  const nib = useRef(null)
  const [size, setSize] = useState(null)

  useEffect(() => {
    const el = root.current
    const measure = () => setSize({ w: el.clientWidth, h: el.clientHeight })
    measure()
    const observer = new ResizeObserver(measure)
    observer.observe(el)
    return () => observer.disconnect()
  }, [])

  useEffect(() => {
    const path = line.current
    if (!size || !path) return undefined
    const total = path.getTotalLength()
    path.style.strokeDasharray = `${total} ${total}`
    path.style.strokeDashoffset = reduce ? 0 : total
    if (reduce || !play) return undefined
    const controls = animate(0, 1, {
      delay: SIGN_DELAY,
      duration: SIGN_TIME,
      ease: easeOut,
      onUpdate: (p) => {
        path.style.strokeDashoffset = total * (1 - p)
        const at = path.getPointAtLength(total * p)
        nib.current.setAttribute('transform', `translate(${at.x} ${at.y})`)
        nib.current.style.opacity = p > 0 && p < 1 ? 1 : 0
      },
    })
    const stopSound = signScore(SIGN_DELAY, SIGN_TIME)
    return () => {
      controls.stop()
      stopSound()
    }
  }, [size, play, reduce])

  return (
    <svg ref={root} className={styles.signoff} aria-hidden="true">
      {size && (
        <>
          <path ref={line} d={`M0 0H${size.w}V${size.h}H0Z`} />
          <g ref={nib} className={styles.nib} style={{ opacity: 0 }}>
            <circle r="9" className={styles.nibGlow} />
            <circle r="3" className={styles.nibDot} />
          </g>
        </>
      )}
    </svg>
  )
}

/** Your guess against the answer, one ruled row per field. */
function Recap({ building, era, eras, fields, log, outcome, play }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const { location } = building
  const answers = {
    name: building.name,
    architect: building.architects.map((a) => a.name).join(' & '),
    country: countryName(location.countryCode, lang) ?? location.country,
    era: era ? eraName(era, strings) : building.era,
    century: building.yearCompleted != null && strings.themed.century(centuryOf(building.yearCompleted)),
    decade: building.yearCompleted > 0 && strings.themed.decade(decadeOf(building.yearCompleted)),
  }
  const names = Object.keys(fields) // only the fields this round asked
  const typed = (field) => {
    const text = log?.findLast((e) => e.field === field)?.text
    return text && guessText(field, text, { eras, strings })
  }
  return (
    <div className={styles.recap}>
      <div className={styles.recapHead}>
        <p className={styles.outcome}>{outcome === 'solved' ? strings.guess.solved : strings.guess.gaveUp}</p>
      </div>
      <ul className={styles.recapList} aria-label={strings.summary.recap}>
        {names.map((field) => {
          const got = fields[field] === 'correct'
          const Icon = got ? Check : Eye
          const guess = typed(field)
          return (
            <li key={field} className={got ? styles.got : styles.missed} style={{ '--row': names.indexOf(field) }}>
              {got && <Hatch row={names.indexOf(field)} play={play} />}
              <span className={styles.recapField}>{strings.guess.fields[field]}</span>
              <Icon className={styles.recapIcon} aria-hidden="true" strokeWidth={2.25} />
              <span className={styles.recapAnswer}>
                <span className="visually-hidden">{strings.summary.recapAnswer}: </span>
                {answers[field]}
              </span>
              {!got && (
                <span className={styles.recapGuess}>
                  <span className="visually-hidden">{strings.summary.recapGuess}: </span>
                  {guess ? <s>{guess}</s> : strings.summary.noGuess}
                </span>
              )}
              <span className="visually-hidden">: {got ? strings.summary.recapGot : strings.summary.recapMissed}</span>
            </li>
          )
        })}
      </ul>
    </div>
  )
}

/** The photo and a drawing (or a second photo) side by side under the title; tapping opens the gallery. */
function Hero({ building, onOpen }) {
  const strings = useStrings()
  const [bad, setBad] = useState({})
  const [loaded, setLoaded] = useState({})
  const photos = building.photos ?? []
  const first = photos.find((p) => p.view === 'EXTERIOR') ?? photos[0]
  const second = building.drawings?.[0] ?? photos.find((p) => p !== first)
  const tiles = [first && { ...first, key: 'a' }, second && { ...second, key: 'b' }].filter((t) => t && !bad[t.key])
  if (!tiles.length) return null
  return (
    <figure className={styles.hero}>
      <div className={styles.heroFrame}>
      <button type="button" className={styles.heroButton} data-count={tiles.length} onClick={onOpen} aria-label={strings.summary.showDrawings}>
        {tiles.map((t, i) => (
          <span key={t.key} className={styles.heroTile}>
            {(i === 0 || tiles.length === 1) && <span className={styles.scale} aria-hidden="true" />}
            {(i === 1 || tiles.length === 1) && (
              <svg className={styles.north} viewBox="0 0 10 16" aria-hidden="true">
                <path d="M5 0 L9 12 L5 9.5 L1 12Z" />
                <text x="5" y="16" textAnchor="middle">N</text>
              </svg>
            )}
            <ArchImage
              src={t.src}
              alt={t.alt}
              fit="cover"
              crop={t.crop}
              onLoad={() => setLoaded((l) => ({ ...l, [t.key]: true }))}
              onError={() => setBad((b) => ({ ...b, [t.key]: true }))}
            />
          </span>
        ))}
      </button>
      <div className={styles.cut} aria-hidden="true">
        <span className={styles.bub}>A</span>
        <span className={styles.cutLine} />
        <span className={styles.bub}>A</span>
      </div>
      </div>
      <figcaption className={styles.heroCredit}>
        {tiles.filter((t) => loaded[t.key] && t.credit).map((t) => (
          <span key={t.key}>
            <Credit text={t.credit} source={t.source} />
          </span>
        ))}
      </figcaption>
    </figure>
  )
}

/**
 * A slim title with the score, pinned at the level of the game header while the real title is scrolled away. As you
 * scroll back up, the real title arrives from above and pushes the bar down in front of it, so the bar stays just under
 * the title; once the title is well inside the page the bar fades. The header hides its own label while the bar is
 * up in its spot (headerTitle.js), so the two never overlap.
 */
function StickyTitle({ title, target, score, total, viewing }) {
  const bar = useRef(null)
  useEffect(() => {
    const update = () => {
      if (!target.current || !bar.current) return
      const hold = bar.current.parentElement
      const pin = parseFloat(getComputedStyle(hold).top) || 0 // where the sticky hold pins, from the viewport's top
      const room = bar.current.offsetHeight + 8
      const pushed = target.current.getBoundingClientRect().bottom + 8 - pin // how far the title's lower edge is below the pin
      // The bar goes to the pin, or just under the title if that is lower; the hold itself may not be stuck yet.
      bar.current.style.transform = `translateY(${Math.max(pin, pushed + pin) - hold.getBoundingClientRect().top}px)`
      const opacity = 1 - Math.min(1, Math.max(0, (pushed - 1.2 * room) / (0.8 * room))) // gone well before the title is at rest, so it never covers the byline
      bar.current.style.opacity = opacity
      bar.current.style.visibility = opacity <= 0 ? 'hidden' : 'visible'
      setHeaderTitle(pushed <= 0 ? title : null)
    }
    update()
    window.addEventListener('scroll', update, { passive: true })
    window.addEventListener('resize', update)
    return () => {
      window.removeEventListener('scroll', update)
      window.removeEventListener('resize', update)
      setHeaderTitle(null)
    }
  }, [target, title])
  return (
    <div className={styles.stickyHold} aria-hidden="true">
      <div ref={bar} className={styles.sticky} style={{ visibility: 'hidden' }}>
        <span className={styles.stickyName}>{title}</span>
        {!viewing && (
          <span className={styles.stickyScore}>
            {score}/{total}
          </span>
        )}
      </div>
    </div>
  )
}

/** The score as a level on a ruled scale: the triangle slides to it. */
function LevelMarker({ score, total }) {
  const strings = useStrings()
  return (
    <div className={styles.level} style={{ '--p': score / total }}>
      <div className={styles.ruler} aria-hidden="true">
        {Array.from({ length: total + 1 }, (_, i) => (
          <i key={i} className={styles.rulerTick} style={{ left: `${(i / total) * 100}%` }} />
        ))}
        <span className={styles.tri} />
      </div>
      <p className={styles.levelText}>
        <span>{strings.summary.levelLabel}</span>
        <strong>
          +{score} / {total}
        </strong>
      </p>
    </div>
  )
}

/** The foot of the sheet, set like a revision block. Its cells rise once it scrolls into view. */
function RevisionBlock({ building, era }) {
  const strings = useStrings()
  const root = useRef(null)
  const [shown, setShown] = useState(false)
  useEffect(() => {
    const el = root.current
    if (!el || typeof IntersectionObserver === 'undefined') return setShown(true)
    const observer = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return
      setShown(true)
      observer.disconnect()
    })
    observer.observe(el)
    return () => observer.disconnect()
  }, [])
  const cells = [
    [strings.summary.drawnBy, building.architects.map((a) => a.name).join(' & ')],
    [strings.summary.dateLabel, building.yearCompleted == null ? strings.summary.noDate : formatYear(building.yearCompleted, strings.years)],
    [strings.summary.sheetLabel, building.style || (era ? eraName(era, strings) : building.era)],
  ]
  return (
    <dl ref={root} className={styles.rev} data-shown={shown || undefined}>
      {cells.map(([label, value], i) => (
        <div key={label} className={styles.revCell} style={{ '--i': i }}>
          <dt>{label}</dt>
          <dd>{value}</dd>
        </div>
      ))}
    </dl>
  )
}

/** The first sentence, set larger, and the rest. A full stop inside an abbreviation ("d.C. sob") is not a sentence end. */
function splitLede(text) {
  const match = /^(.+?[.!?])\s+(?=[A-ZÀ-ÝÁÉÍÓÚ“"])/.exec(text)
  return match ? [match[1], text.slice(match[0].length)] : [null, text]
}

/** A print in the gallery. If its file fails to load, the whole print disappears. */
function Photo({ photo }) {
  const strings = useStrings()
  const [status, setStatus] = useState('loading')
  if (status === 'error') return null
  return (
    <figure className={styles.photo}>
      <div className={styles.print}>
        <ArchImage
          src={photo.src}
          alt={photo.alt}
          fit="cover"
          crop={photo.crop}
          onLoad={() => setStatus('loaded')}
          onError={() => setStatus('error')}
        />
      </div>
      <figcaption>
        {photo.caption ?? strings.board.views[photo.view]}
        {status === 'loaded' && photo.credit && (
          <span className={styles.credit}>
            <Credit text={photo.credit} source={photo.source} />
          </span>
        )}
      </figcaption>
    </figure>
  )
}

export function BuildingSummary({ building, eras, fields, log, onOpenBoard, play = true, outcome, daily }) {
  const strings = useStrings()
  const heading = useRef(null)
  const era = eras?.find((e) => e.id === building.era)
  const photos = building.photos ?? []
  const [lede, rest] = splitLede(building.summary.description)
  const viewing = !fields // opened from the Library: nothing was guessed, so no score, level or recap
  const total = viewing ? 0 : Object.keys(fields).length
  const score = viewing ? 0 : scoreOf(fields)
  const signedOff = !viewing && score === total
  const facts = [...building.hints.map((h) => h.text), ...building.summary.funFacts]

  // Move focus to the summary so keyboard and screen-reader users land on the payoff.
  useEffect(() => heading.current?.focus({ preventScroll: true }), [])

  return (
    <motion.article className={styles.monograph} aria-label={strings.summary.label} variants={unfold} initial="hidden" animate="shown" data-play={play || undefined} data-signed={signedOff || undefined}>
      {signedOff && <SignOff play={play} />}
      <StickyTitle title={building.name} target={heading} score={score} total={total} viewing={viewing} />
      <motion.header className={styles.header} variants={section}>
        <h2 ref={heading} tabIndex={-1} className={styles.title}>
          {building.name}
        </h2>
        {signedOff && (
          <svg className={styles.check} viewBox="0 0 24 24" aria-hidden="true">
            <path d="M3 13.5 9.5 20 21 4.5" pathLength="1" />
            <circle cx="21" cy="4.5" r="1.8" />
          </svg>
        )}
        <p className={styles.byline}>{building.architects.map((a) => a.name).join(' & ')}</p>
        <div className={styles.dim} aria-hidden="true">
          <span className={styles.dimLine} />
          {building.yearCompleted != null && <span className={styles.dimLabel}>{formatYear(building.yearCompleted, strings.years)}</span>}
          <span className={styles.dimLine} data-end />
        </div>
      </motion.header>

      {onOpenBoard && (
        <motion.div variants={section}>
          <Hero building={building} onOpen={onOpenBoard} />
        </motion.div>
      )}

      <motion.div variants={section}>
        <FactStrip building={building} era={era} />
      </motion.div>

      {!viewing && (
        <motion.div variants={section}>
          <LevelMarker score={score} total={total} />
        </motion.div>
      )}

      {!viewing && (
      <motion.div variants={section}>
        {daily ? <DailyCard daily={daily} play={play} /> : <Recap building={building} era={era} eras={eras} fields={fields} log={log} outcome={outcome} play={play} />}
      </motion.div>
      )}

      <motion.div className={styles.reading} variants={section}>
        {lede && <p className={styles.ledeLine}>{lede}</p>}
        <p className={styles.lead}>{rest}</p>
      </motion.div>

      <motion.div className={styles.columns} variants={section}>
        {building.summary.keyFeatures.length > 0 && (
          <section>
            <h3 className={styles.sectionTitle}>{strings.summary.keyFeatures}</h3>
            <ul className={styles.features}>
              {building.summary.keyFeatures.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}
        {facts.length > 0 && (
          <section className={styles.note}>
            <h3 className={styles.sectionTitle}>{strings.summary.funFacts}</h3>
            <ul className={styles.facts}>
              {facts.map((f) => (
                <li key={f}>{f}</li>
              ))}
            </ul>
          </section>
        )}
      </motion.div>

      {photos.length > 0 && (
        <motion.section variants={section}>
          <h3 className={styles.sectionTitle}>{strings.summary.photos}</h3>
          <div className={styles.gallery}>
            {photos.map((photo) => (
              <Photo key={photo.src} photo={photo} />
            ))}
          </div>
        </motion.section>
      )}

      <motion.section variants={section}>
        <h3 className={styles.sectionTitle}>{strings.summary.architects(building.architects.length)}</h3>
        <div className={styles.architects}>
          {building.architects.map((a) => (
            <div key={a.name} className={styles.architect}>
              <p className={styles.architectName}>{a.name}</p>
              <p className={styles.architectMeta}>{[a.lifespan, a.nationality].filter(Boolean).join(' · ')}</p>
              <p className={styles.bio}>{a.bio}</p>
            </div>
          ))}
        </div>
      </motion.section>

      {building.wikipedia && (
        <motion.section className={styles.more} variants={section} aria-labelledby="more-title">
          <h3 id="more-title" className={styles.sectionTitle}>
            {strings.summary.more.title}
          </h3>
          <p>{strings.summary.more.text}</p>
          <a className={styles.moreLink} href={building.wikipedia} target="_blank" rel="noreferrer">
            {strings.summary.more.link}
            <ExternalIcon className={styles.moreIcon} aria-hidden="true" strokeWidth={1.75} />
          </a>
        </motion.section>
      )}

      <RevisionBlock building={building} era={era} />
    </motion.article>
  )
}
