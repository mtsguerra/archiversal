import { Fragment, useEffect, useId, useRef, useState } from 'react'
import { AnimatePresence, motion, useAnimationControls } from 'motion/react'
import { Check, Eye, Target, X } from 'lucide-react'
import { CheckIcon } from '../ui/icons.jsx'
import { centuryOf, decadeOf, decadesOfCentury } from '../../game/dates.js'
import { eraName } from '../../game/useEras.js'
import { duration, easeOut } from '../../motion.js'
import { useReducedMotion } from '../../motionPref.js'
import { RollingNumber } from '../ui/RollingNumber.jsx'
import { REVEAL, TICK, haptic } from '../../game/haptics.js'
import { close, dial, lock, nothing, wrong } from '../../game/sound.js'
import { useLanguage, useStrings } from '../../i18n.js'
import { countryName } from '../../game/countries.js'
import { Button } from '../ui/Button.jsx'
import { Hatch } from '../ui/Hatch.jsx'
import { BuildingIcon, CenturyIcon, CompassIcon, DecadeIcon, GlobeIcon, HourglassIcon, RevealIcon } from '../ui/InstrumentIcons.jsx'
import { CountryCombobox } from './CountryCombobox.jsx'
import { EraCombobox } from './EraCombobox.jsx'
import styles from './GuessForm.module.css'

/** The picked century or decade as a dial: the number rolls to its new value, the words around it stay. */
function Dial({ text, n }) {
  const digits = String(Math.abs(n))
  const at = text.indexOf(digits)
  if (at < 0) return <span className={styles.dial}>{text}</span>
  return (
    <motion.span className={styles.dial} aria-hidden="true" initial={{ opacity: 0, y: 4 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: duration.base, ease: easeOut }}>
      {text.slice(0, at)}
      <RollingNumber value={Math.abs(n)} fade />
      {text.slice(at + digits.length)}
    </motion.span>
  )
}

const shake = { x: [0, -7, 7, -4, 4, 0], transition: { duration: 0.4, ease: 'easeOut' } }

function answerFor(field, building, eras, { strings, lang }) {
  switch (field) {
    case 'century':
      return strings.themed.century(centuryOf(building.yearCompleted))
    case 'decade':
      return strings.themed.decade(decadeOf(building.yearCompleted))
    case 'name':
      return building.name
    case 'architect':
      return building.architects.map((a) => a.name).join(' & ')
    case 'country':
      return countryName(building.location.countryCode, lang) ?? building.location.country
    case 'era': {
      const era = eras?.find((e) => e.id === building.era)
      return era ? eraName(era, strings) : building.era
    }
  }
}

/**
 * One guess field. Once correct (or revealed) the input is replaced by the
 * canonical answer, plotted in like the title block, so "Savoy" is corrected
 * to "Villa Savoye" the moment it locks.
 */
function Field({ id, field, icon: Icon, status, attempts, revealed, answer, dial, children }) {
  const strings = useStrings()
  const controls = useAnimationControls()
  const messageId = `${id}-message`

  const wasLocked = useRef(status === 'correct')

  useEffect(() => {
    if (status === 'wrong') {
      controls.start(shake)
      wrong()
    }
    if (status === 'close') {
      controls.start({ scale: [1, 1.02, 1], transition: { duration: 0.4, ease: easeOut } })
      close()
    }
  }, [status, attempts, controls])

  const locked = status === 'correct'

  // A field locking is felt: a small spring on the row and a tick, once, not when a saved result comes back.
  useEffect(() => {
    if (locked && !wasLocked.current) {
      controls.start({ scale: [1, 1.025, 1], transition: { duration: 0.4, ease: easeOut } })
      haptic(TICK)
      lock()
    }
    wasLocked.current = locked
  }, [locked, controls])

  const showAnswer = answer != null

  return (
    <motion.div className={styles.field} data-motion data-status={revealed ? (locked ? 'correct' : 'revealed') : status} animate={controls}>
      <div className={styles.labelRow}>
        <label className={styles.label} htmlFor={id}>
          {strings.guess.fields[field]}
        </label>
        {dial}
      </div>

      <div className={styles.control}>
        {Icon && <Icon className={styles.icon} aria-hidden="true" strokeWidth={1.75} />}
        {showAnswer ? (
          <output id={id} className={styles.answer} aria-describedby={messageId}>
            {locked && <Hatch />}
            <motion.span
              initial={{ clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: duration.slow * 1.4, ease: easeOut }}
            >
              {answer}
            </motion.span>
          </output>
        ) : (
          children({ id, 'aria-describedby': messageId, 'aria-invalid': status === 'wrong' || undefined })
        )}

        {status === 'close' && !revealed && (
          // Half the field painted: half a point, the rest needs the more specific answer.
          <motion.span
            key={attempts}
            className={styles.half}
            aria-hidden="true"
            initial={{ scaleX: 0 }}
            animate={{ scaleX: 1 }}
            transition={{ type: 'spring', stiffness: 220, damping: 22 }}
          />
        )}

        <span className={styles.badge} aria-hidden="true">
          {locked && (
            <motion.span
              // Stamped down: lands a little big and crooked, then settles.
              initial={{ scale: 1.8, rotate: -14, opacity: 0 }}
              animate={{ scale: 1, rotate: 0, opacity: 1 }}
              transition={{ type: 'spring', stiffness: 380, damping: 16, delay: 0.25 }}
              style={{ display: 'grid' }}
            >
              <Check strokeWidth={2.5} />
            </motion.span>
          )}
          {revealed && !locked && <Eye strokeWidth={2} />}
        </span>
      </div>

      <AnimatePresence initial={false}>
        {(status === 'wrong' || status === 'close') && !revealed && (
          <motion.p
            key={status}
            id={messageId}
            className={styles.message}
            data-kind={status}
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            transition={{ duration: duration.base, ease: easeOut }}
          >
            {status === 'close' ? <Target aria-hidden="true" strokeWidth={2.25} /> : <X aria-hidden="true" strokeWidth={2.25} />}
            {status === 'close' ? (field === 'century' || field === 'decade' ? strings.guess.closeDate : strings.guess.close) : strings.guess.wrong}
          </motion.p>
        )}
      </AnimatePresence>
      {locked && <span id={messageId} className="visually-hidden">{strings.guess.correct}</span>}
    </motion.div>
  )
}

/**
 * The guess sheet. Remount per building (`key={building.id}`) to clear the inputs.
 */
export function GuessForm({ building, eras, centuries, phase, fields, attempts, outcome, onSubmit, onEdit, onGiveUp }) {
  const strings = useStrings()
  const { lang } = useLanguage()
  const idPrefix = useId()
  const names = Object.keys(fields) // the fields this round asks, in the order they are drawn
  const [values, setValues] = useState(() => Object.fromEntries(names.map((f) => [f, ''])))
  const reduce = useReducedMotion()
  const [nothingToCheck, setNothingToCheck] = useState(false)
  const [nudges, setNudges] = useState(0)
  const revealed = phase === 'revealed'

  const wasRevealed = useRef(revealed)
  useEffect(() => {
    if (revealed && !wasRevealed.current) {
      haptic(REVEAL)
    }
    wasRevealed.current = revealed
  }, [revealed])

  // A wrong guess empties its field (the guess log keeps the text); a close one stays to be made more specific.
  const prevFields = useRef(fields)
  useEffect(() => {
    const cleared = names.filter((f) => fields[f] === 'wrong' && prevFields.current[f] !== 'wrong')
    prevFields.current = fields
    if (cleared.length) setValues((v) => ({ ...v, ...Object.fromEntries(cleared.map((f) => [f, ''])) }))
  }, [fields]) // eslint-disable-line react-hooks/exhaustive-deps

  function update(field, value) {
    // A new century clears the decade picked inside the old one.
    if (field === 'century' || field === 'decade') dial()
    setValues((v) => ({ ...v, [field]: value, ...(field === 'century' && { decade: '' }) }))
    setNothingToCheck(false)
    onEdit(field)
    if (field === 'century' && names.includes('decade')) onEdit('decade')
  }

  function handleSubmit(event) {
    event.preventDefault()
    const open = names.filter((f) => fields[f] !== 'correct')
    if (!open.some((f) => values[f].trim())) {
      nothing()
      setNudges((n) => n + 1) // shakes the message again on every press
      return setNothingToCheck(true)
    }
    onSubmit(values)
  }

  // Revealing with something typed but unchecked judges it first, so it counts.
  function handleGiveUp() {
    if (names.some((f) => fields[f] !== 'correct' && values[f].trim())) onSubmit(values)
    onGiveUp()
  }

  const correctCount = names.filter((f) => fields[f] === 'correct').length
  const wrongCount = names.filter((f) => fields[f] === 'wrong').length
  const closeCount = names.filter((f) => fields[f] === 'close').length

  let status = ''
  if (revealed) status = outcome === 'solved' ? (names.includes('country') ? strings.guess.solved : strings.guess.solvedAll) : strings.guess.gaveUp
  else if (nothingToCheck) status = strings.guess.nothingToCheck
  else if (attempts > 0) status = strings.guess.result(correctCount, wrongCount, closeCount)

  const fieldProps = (field) => ({
    id: `${idPrefix}-${field}`,
    field,
    status: fields[field],
    attempts,
    revealed,
    answer: revealed || fields[field] === 'correct' ? answerFor(field, building, eras, { strings, lang }) : null,
  })

  const inputs = {
      name: (
          <Field {...fieldProps('name')} icon={BuildingIcon}>
            {(props) => (
              <input
                {...props}
                className={styles.input}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={strings.guess.placeholders.name}
                value={values.name}
                onChange={(e) => update('name', e.target.value)}
              />
            )}
          </Field>

      ),
      architect: (
          <Field {...fieldProps('architect')} icon={CompassIcon}>
            {(props) => (
              <input
                {...props}
                className={styles.input}
                type="text"
                autoComplete="off"
                spellCheck={false}
                placeholder={strings.guess.placeholders.architect}
                value={values.architect}
                onChange={(e) => update('architect', e.target.value)}
              />
            )}
          </Field>

      ),
      country: (
          <Field {...fieldProps('country')} icon={GlobeIcon}>
            {(props) => (
              <CountryCombobox
                {...props}
                className={styles.input}
                placeholder={strings.guess.placeholders.country}
                value={values.country}
                onChange={(value) => update('country', value)}
              />
            )}
          </Field>

      ),
      era: (
          <Field {...fieldProps('era')} icon={HourglassIcon}>
            {(props) => (
              <EraCombobox
                {...props}
                className={styles.input}
                eras={eras}
                value={values.era}
                onChange={(era) => update('era', era)}
              />
            )}
          </Field>
      ),
      century: (
        <Field
          {...fieldProps('century')}
          icon={CenturyIcon}
          dial={values.century && <Dial key="century" n={Number(values.century)} text={strings.themed.century(Number(values.century))} />}
        >
          {(props) => (
            <select {...props} className={`${styles.input} ${styles.select}`} value={values.century} onChange={(e) => update('century', e.target.value)}>
              <option value="">{strings.guess.placeholders.century}</option>
              {(centuries ?? []).map((c) => (
                <option key={c} value={c}>
                  {strings.themed.century(c)}
                </option>
              ))}
            </select>
          )}
        </Field>
      ),
      decade: (
        <Field
          {...fieldProps('decade')}
          icon={DecadeIcon}
          dial={values.decade && <Dial key="decade" n={Number(values.decade)} text={strings.themed.decade(Number(values.decade))} />}
        >
          {(props) => (
            <motion.span
              // Picking a century sweeps its decades open.
              key={values.century}
              style={{ display: 'block' }}
              initial={reduce || !values.century ? false : { clipPath: 'inset(0 100% 0 0)' }}
              animate={{ clipPath: 'inset(0 0% 0 0)' }}
              transition={{ duration: duration.base, ease: easeOut }}
            >
            <select
              {...props}
              className={`${styles.input} ${styles.select}`}
              value={values.decade}
              disabled={!(Number(values.century) > 0)}
              onChange={(e) => update('decade', e.target.value)}
            >
              <option value="">{strings.guess.placeholders.decade}</option>
              {Number(values.century) > 0 &&
                decadesOfCentury(Number(values.century)).map((d) => (
                  <option key={d} value={d}>
                    {strings.themed.decade(d)}
                  </option>
                ))}
            </select>
            </motion.span>
          )}
        </Field>
      ),
  }

  return (
    <section className={styles.sheet} aria-labelledby={`${idPrefix}-heading`}>
      <div className={styles.header}>
        <h2 id={`${idPrefix}-heading`} className={styles.heading}>
          {strings.guess.heading}
        </h2>
        <span className={styles.pips} aria-hidden="true">
          {names.map((f) => (
            <span key={f} className={styles.pip} data-status={revealed && fields[f] !== 'correct' ? 'revealed' : fields[f]} />
          ))}
        </span>
      </div>

      <form id="guess-form" className={styles.form} onSubmit={handleSubmit} noValidate>
        {names.map((name) => (
          <Fragment key={name}>{inputs[name]}</Fragment>
        ))}

        <motion.p key={nudges} className={styles.status} role="status" animate={nothingToCheck && !reduce ? shake : undefined}>
          {status}
        </motion.p>

        {!revealed && (
          <div className={styles.actions}>
            <Button type="submit" icon={CheckIcon} className={styles.primary}>
              {strings.guess.submit}
            </Button>
            <Button variant="quiet" icon={RevealIcon} data-sound="unveil" onClick={handleGiveUp}>
              {strings.guess.giveUp}
            </Button>
          </div>
        )}
      </form>
    </section>
  )
}
