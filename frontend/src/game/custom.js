import { GUESS_FIELDS } from './matchGuess.js'

export const MIN_BUILDINGS = 10
export const MIN_ROUNDS = 3
export const MAX_ROUNDS = 50
export const isRounds = (v) => v === 'all' || (Number.isInteger(v) && v >= MIN_ROUNDS && v <= MAX_ROUNDS)

// Filter modes: one of architects, eras or countries alone, or countries + eras together.
export const MODES = ['architect', 'era', 'country', 'countryEra']

export const emptyConfig = { mode: 'architect', architects: [], eras: [], countries: [], rounds: 10 }

const CONFIG_KEY = 'archiversal:custom'
const SESSION_KEY = 'archiversal:custom-session'

/** Buildings matching the config. Inside a filter, any pick matches; countries + eras need both. */
export function filterPool(catalogue, { mode, architects, eras, countries }) {
  const has = (list, value) => list.includes(value)
  const match = {
    architect: (b) => b.architects.some((a) => has(architects, a)),
    era: (b) => has(eras, b.era),
    country: (b) => has(countries, b.countryCode),
    // An empty side means "any"; both empty matches nothing.
    countryEra: (b) => (eras.length || countries.length) > 0 && (!countries.length || has(countries, b.countryCode)) && (!eras.length || has(eras, b.era)),
  }[mode]
  return catalogue.filter(match)
}

/** Picker rows: [{ key, label, count }] for every distinct value, most buildings first. */
export function facets(catalogue, valuesOf, labelOf) {
  const counts = new Map()
  for (const b of catalogue) for (const key of new Set(valuesOf(b))) counts.set(key, (counts.get(key) ?? 0) + 1)
  return [...counts]
    .map(([key, count]) => ({ key, label: labelOf(key, catalogue), count }))
    .sort((a, b) => b.count - a.count || a.label.localeCompare(b.label))
}

export function read(storage, key) {
  try {
    return JSON.parse(storage.getItem(key))
  } catch {
    return null
  }
}

export function write(storage, key, value) {
  try {
    storage.setItem(key, JSON.stringify(value))
  } catch {
    // Ignore: nothing is remembered.
  }
}

/** The fields a custom round asks: a filter narrowed to one architect, country or era already gives that answer away. */
export function fieldsForConfig({ mode, architects, eras, countries }) {
  const fixed = {
    architect: mode === 'architect' && architects.length === 1,
    country: ['country', 'countryEra'].includes(mode) && countries.length === 1,
    era: ['era', 'countryEra'].includes(mode) && eras.length === 1,
  }
  return GUESS_FIELDS.filter((f) => !fixed[f])
}

/** What a setup has picked, for a one-line summary: [{ kind: 'architects' | 'eras' | 'countries', key }]. */
export function pickedKeys({ mode, architects, eras, countries }) {
  const by = { architect: [['architects', architects]], era: [['eras', eras]], country: [['countries', countries]], countryEra: [['countries', countries], ['eras', eras]] }
  return by[mode].flatMap(([kind, keys]) => keys.map((key) => ({ kind, key })))
}

// Browser storage can hold anything (older versions, hand edits), so every read is rebuilt from
// known-good parts before the app touches it.
const strings = (value) => (Array.isArray(value) ? value.filter((x) => typeof x === 'string') : [])
export const isId = (value) => typeof value === 'string' && /^[a-z0-9-]+$/.test(value)

export function sanitizeConfig(value) {
  const v = value && typeof value === 'object' ? value : {}
  return {
    mode: MODES.includes(v.mode) ? v.mode : emptyConfig.mode,
    architects: strings(v.architects),
    eras: strings(v.eras),
    countries: strings(v.countries),
    rounds: isRounds(v.rounds) ? v.rounds : emptyConfig.rounds,
  }
}

// Remembered between visits.
export const readConfig = () => sanitizeConfig(read(localStorage, CONFIG_KEY))
export const saveConfig = (config) => write(localStorage, CONFIG_KEY, config)

export function shuffle(items, random = Math.random) {
  const out = [...items]
  for (let i = out.length - 1; i > 0; i--) {
    const j = Math.floor(random() * (i + 1))
    ;[out[i], out[j]] = [out[j], out[i]]
  }
  return out
}

/** A session is one shuffled run through the pool; it lives in this tab only. */
export function startSession(pool, config, random) {
  const ids = shuffle(pool.map((b) => b.id), random)
  const session = { config, ids: config.rounds === 'all' ? ids : ids.slice(0, config.rounds), index: 0, played: [] }
  write(sessionStorage, SESSION_KEY, session)
  return session
}

export function readSession() {
  const s = read(sessionStorage, SESSION_KEY)
  if (!s || !Array.isArray(s.ids) || !s.ids.every(isId) || !Number.isInteger(s.index) || s.index < 0) return null
  // Only https links reach an <a href> from here.
  const played = (Array.isArray(s.played) ? s.played : []).filter(
    (p) => p && isId(p.id) && typeof p.name === 'string' && typeof p.wikipedia === 'string' && p.wikipedia.startsWith('https://'),
  )
  return { config: sanitizeConfig(s.config), ids: s.ids, index: s.index, played }
}
/** Puts back a session that was cleared a moment ago (Undo after leaving). */
export const restoreSession = (session) => write(sessionStorage, SESSION_KEY, session)
export const clearSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore.
  }
}

/** Moves on from `building`, recording it for the recap. Returns the saved session. */
export function advanceSession(session, building) {
  const played = building ? [...session.played, { id: building.id, name: building.name, wikipedia: building.wikipedia }] : session.played
  const next = { ...session, played, index: session.index + 1 }
  write(sessionStorage, SESSION_KEY, next)
  return next
}
