import { useCallback, useEffect, useReducer, useRef, useState } from 'react'
import { fetchBuilding, fetchBuildingIds, fetchCatalogue, fetchRandomBuilding } from '../api/buildings.js'
import { useLanguage, useStrings } from '../i18n.js'
import { advanceSession, fieldsForConfig, readSession } from './custom.js'
import { dailyHold, dailyId, dailyNumber, readDaily, saveDaily } from './daily.js'
import { gameReducer, initialState } from './gameReducer.js'
import { showToast } from '../components/ui/toast.js'
import { readLibrary, recordLibrary } from './library.js'
import { completedEra } from './libraryView.js'
import { recordReveal } from './progress.js'
import { centuriesIn } from './dates.js'
import { advanceThemedSession, erasIn, fieldsFor, readThemedSession, themePool } from './themed.js'
import { GUESS_FIELDS, evaluateGuess } from './matchGuess.js'
import { turn } from './sound.js'
import { readSeen, recordSeen } from './seenBuildings.js'

/**
 * @param {'normal' | 'daily' | 'custom' | 'themed'} mode  daily plays today's fixed building once, then shows its saved result;
 *   custom and themed walk the saved session's buildings in order; themed also asks only the fields of its level.
 */
export function useGameRound(mode = 'normal', day) {
  const number = day ?? dailyNumber() // the Daily being played: today's, or an earlier day's
  const [state, dispatch] = useReducer(gameReducer, initialState)
  const pending = useRef(null)
  const { lang } = useLanguage()
  const strings = useStrings()
  // Read through a ref so a language switch doesn't recreate loadNext and start a new round.
  const langRef = useRef(lang)
  useEffect(() => {
    langRef.current = lang
  }, [lang])

  const buildingRef = useRef(null)
  const solvedRef = useRef(false)
  useEffect(() => {
    buildingRef.current = state.building
    solvedRef.current = state.outcome === 'solved'
  }, [state.building, state.outcome])

  // Themed: the eras and centuries that occur in the theme, so the pickers offer nothing else.
  const [themed, setThemed] = useState(null)
  const advancedFrom = useRef(null) // the building a themed session already moved past, so a double press moves once

  // `advance` (custom only) moves the session past the current building first.
  const load = useCallback(async (advance) => {
    pending.current?.abort()
    const controller = new AbortController()
    pending.current = controller

    dispatch({ type: 'load/start' })
    try {
      if (mode === 'custom') {
        let session = readSession()
        if (!session) throw new Error('No custom session')
        if (advance) session = advanceSession(session, buildingRef.current)
        if (session.index >= session.ids.length) {
          dispatch({ type: 'session/done' })
          return
        }
        const building = await fetchBuilding(session.ids[session.index], controller.signal, langRef.current)
        const fields = fieldsForConfig(session.config)
        dispatch({ type: 'load/success', building, fields, given: GUESS_FIELDS.filter((f) => !fields.includes(f)) })
        return
      }
      if (mode === 'themed') {
        let session = readThemedSession()
        if (!session) throw new Error('No themed session')
        if (advance && advancedFrom.current !== buildingRef.current) {
          advancedFrom.current = buildingRef.current
          session = advanceThemedSession(session, buildingRef.current, solvedRef.current)
        }
        const catalogue = await fetchCatalogue()
        // Saved ids the catalogue no longer has (data changed mid-session) are moved past.
        while (session.index < session.ids.length && !catalogue.some((b) => b.id === session.ids[session.index])) {
          session = advanceThemedSession(session, null, false)
        }
        if (session.index >= session.ids.length) {
          dispatch({ type: 'session/done' })
          return
        }
        const id = session.ids[session.index]
        const building = await fetchBuilding(id, controller.signal, langRef.current)
        const pool = themePool(catalogue, session.theme)
        setThemed({ eras: erasIn(pool), centuries: centuriesIn(pool) })
        dispatch({ type: 'load/success', building, fields: fieldsFor(session.level, pool, catalogue.find((b) => b.id === id), session.extras) })
        return
      }
      if (mode === 'daily') {
        const id = dailyId(await fetchBuildingIds(), number)
        const building = await fetchBuilding(id, controller.signal, langRef.current)
        const saved = readDaily(number)
        dispatch(saved ? { type: 'load/restore', building, saved } : { type: 'load/success', building })
        return
      }
      const seen = readSeen()
      const hold = await dailyHold()
      const building = await fetchRandomBuilding(hold ? [...seen, hold] : seen, controller.signal, langRef.current)
      recordSeen(building.id, seen)
      dispatch({ type: 'load/success', building })
    } catch (error) {
      if (error.name !== 'AbortError') dispatch({ type: 'load/failure', error })
    }
  }, [mode, number])

  // Next building (in a custom session: the next one); `reload` retries the current one.
  const loadNext = useCallback(() => {
    turn()
    load(true)
  }, [load])
  const reload = useCallback(() => load(false), [load])

  useEffect(() => {
    reload()
    return () => pending.current?.abort()
  }, [reload])

  const currentId = state.building?.id

  // A finished daily is remembered on this device.
  const { phase, outcome, fields, attempts, hintsUsed } = state
  useEffect(() => {
    if (mode === 'daily' && phase === 'revealed') {
      saveDaily({ number, id: currentId, outcome, fields, attempts, hintsUsed })
    }
  }, [mode, number, phase, outcome, fields, attempts, hintsUsed, currentId])

  // Every revealed building stamps its era and country in the archive; a Daily also counts for the streak.
  useEffect(() => {
    if (phase === 'revealed' && buildingRef.current?.id === currentId && currentId) {
      recordReveal(buildingRef.current, mode === 'daily' && number === dailyNumber() ? number : undefined) // an earlier day does not count for the streak
    }
  }, [mode, number, phase, currentId])

  // The Library unlocks it too; naming the building (not only the era or architect) makes it mastered.
  useEffect(() => {
    if (phase === 'revealed' && buildingRef.current?.id === currentId && currentId) {
      const before = readLibrary()
      const after = recordLibrary(currentId, { mode, mastered: fields.name === 'correct', attempts })
      // Unlocking the last building of an era says so.
      fetchCatalogue()
        .then((catalogue) => {
          const era = completedEra(catalogue, before, after, currentId)
          if (era) showToast({ text: strings.library.eraCompleted(strings.eras[era] ?? era) })
        })
        .catch(() => {}) // no catalogue: no toast
    }
  }, [mode, phase, currentId, fields, attempts, strings])

  // Switching language mid-round swaps the building's text but keeps guesses, hints and phase.
  const currentLang = useRef(lang)
  useEffect(() => {
    if (currentLang.current === lang) return
    currentLang.current = lang
    if (!currentId) return
    const controller = new AbortController()
    fetchBuilding(currentId, controller.signal, lang)
      .then((building) => dispatch({ type: 'building/translate', building }))
      .catch(() => {}) // keep the text we have
    return () => controller.abort()
  }, [lang, currentId])

  const revealHint = useCallback(() => dispatch({ type: 'hint/reveal' }), [])
  const revealAnswer = useCallback(() => dispatch({ type: 'answer/reveal' }), [])
  const editField = useCallback((field) => dispatch({ type: 'guess/edit', field }), [])

  const { building } = state
  const submitGuess = useCallback(
    (values) => dispatch({ type: 'guess/submit', results: evaluateGuess(building, values), values }),
    [building],
  )

  return { ...state, themed, loadNext, reload, revealHint, revealAnswer, submitGuess, editField }
}
