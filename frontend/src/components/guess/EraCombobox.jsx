import { useId, useMemo, useState } from 'react'
import { eraName } from '../../game/useEras.js'
import { useListPlacement } from './listPlacement.js'
import { normalize } from '../../game/text.js'
import { useStrings } from '../../i18n.js'
import styles from './GuessForm.module.css'

/** The eras that match what was typed: part of a name. */
function suggest(eras, query, strings) {
  const q = normalize(query)
  if (!q) return eras
  return eras.filter((era) => normalize(eraName(era, strings)).includes(q))
}

/**
 * Era input in the shape of the country field: type part of a name and pick from the
 * list, or open it and browse all the styles. The form holds an era id; typing without choosing
 * means no guess, unless the text names one era exactly.
 *
 * @param value   the chosen era id, or '' for none
 * @param onChange(eraId)
 */
export function EraCombobox({ id, eras, value, onChange, className, ...inputProps }) {
  const strings = useStrings()
  const listId = useId()
  const chosen = eras?.find((era) => era.id === value)
  const [typed, setTyped] = useState('')
  const [open, setOpen] = useState(false)
  const [active, setActive] = useState(0)
  const [filtering, setFiltering] = useState(false) // true while the player is typing, so an exactly typed name keeps narrowing the list
  const text = chosen && typed === '' ? eraName(chosen, strings) : typed
  const options = useMemo(
    () => (open && eras ? suggest(eras, chosen && !filtering ? '' : typed, strings) : []),
    [open, eras, chosen, filtering, typed, strings],
  )
  const expanded = open && options.length > 0
  const { ref, placement } = useListPlacement(expanded)

  function choose(era) {
    setTyped(eraName(era, strings))
    onChange(era.id)
    setFiltering(false)
    setOpen(false)
  }

  function handleChange(event) {
    const next = event.target.value
    setTyped(next)
    setFiltering(true)
    setOpen(true)
    setActive(0)
    const exact = eras?.find((era) => normalize(eraName(era, strings)) === normalize(next))
    onChange(exact ? exact.id : '')
  }

  function handleKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      if (!expanded) return setOpen(true)
      const step = event.key === 'ArrowDown' ? 1 : -1
      setActive((i) => (i + step + options.length) % options.length)
    } else if (event.key === 'Enter' && expanded) {
      event.preventDefault() // pick the suggestion instead of submitting the form
      choose(options[active])
    } else if (event.key === 'Escape' && expanded) {
      event.preventDefault()
      setOpen(false)
    }
  }

  function handleBlur() {
    setOpen(false)
    setFiltering(false)
    // A lone match is taken as the answer, so a half-typed name isn't silently dropped.
    if (!chosen && typed.trim()) {
      const matches = suggest(eras ?? [], typed, strings)
      if (matches.length === 1) choose(matches[0])
    }
  }

  return (
    <div ref={ref} className={styles.combo}>
      <input
        {...inputProps}
        id={id}
        className={className}
        type="text"
        role="combobox"
        autoComplete="off"
        spellCheck={false}
        aria-autocomplete="list"
        aria-expanded={expanded}
        aria-controls={listId}
        aria-activedescendant={expanded ? `${listId}-${active}` : undefined}
        placeholder={eras?.length === 0 ? strings.guess.erasUnavailable : strings.guess.placeholders.era}
        disabled={!eras?.length}
        value={text}
        onChange={handleChange}
        onFocus={() => setOpen(true)}
        onClick={() => setOpen(true)}
        onKeyDown={handleKeyDown}
        onBlur={handleBlur}
      />
      <ul
        id={listId}
        role="listbox"
        aria-label={strings.guess.eraSuggestions}
        className={styles.listbox}
        data-up={placement.up || undefined}
        style={{ maxHeight: placement.max }}
        hidden={!expanded}
      >
        {options.map((era, i) => (
          <li
            key={era.id}
            id={`${listId}-${i}`}
            role="option"
            aria-selected={i === active}
            className={`${styles.option} ${styles.eraOption}`}
            // mousedown, not click: fires before the input's blur closes the list
            onMouseDown={(e) => {
              e.preventDefault()
              choose(era)
            }}
            onMouseEnter={() => setActive(i)}
          >
            <span>{eraName(era, strings)}</span>
          </li>
        ))}
      </ul>
    </div>
  )
}
