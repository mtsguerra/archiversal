// The Library's unlocks: every building revealed on this device, with when, in which mode and whether
// the player named it. Kept only here; read back defensively since anything can sit in localStorage.
// Names and facts are not stored: they come from the API in the current language (api fetchLibrary).
import { emptyConfig, startSession } from './custom.js'

const KEY = 'archiversal:library'
const LIMIT = 1000
const MODES = ['normal', 'daily', 'custom', 'themed']
const ID = /^[a-z0-9-]{1,80}$/
const DAY = /^\d{4}-\d{2}-\d{2}$/

const empty = () => ({})

/** One saved entry: { at: 'YYYY-MM-DD', mode, mastered, attempts } or null when it is not usable. */
function entry(raw) {
  if (!raw || typeof raw !== 'object') return null
  if (typeof raw.at !== 'string' || !DAY.test(raw.at) || !MODES.includes(raw.mode)) return null
  const attempts = Number.isInteger(raw.attempts) && raw.attempts >= 0 && raw.attempts < 100 ? raw.attempts : 0
  return { at: raw.at, mode: raw.mode, mastered: raw.mastered === true, attempts }
}

export function sanitizeLibrary(raw) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return empty()
  const out = {}
  for (const [id, value] of Object.entries(raw).slice(0, LIMIT)) {
    const e = ID.test(id) ? entry(value) : null
    if (e) out[id] = e
  }
  return out
}

export function readLibrary() {
  try {
    return sanitizeLibrary(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return empty()
  }
}

/** Local calendar day as YYYY-MM-DD. */
export const dayOf = (date = new Date()) =>
  `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`

/**
 * Unlocks a revealed building (any mode, solved or given up). The first reveal keeps its day, mode and
 * attempts; a later reveal can only add the mastered mark, never take it away.
 */
export function recordLibrary(id, { mode, mastered, attempts }, now = new Date()) {
  const lib = readLibrary()
  const first = lib[id]
  const next = sanitizeLibrary({
    ...lib,
    [id]: first ? { ...first, mastered: first.mastered || mastered === true } : { at: dayOf(now), mode, mastered: mastered === true, attempts },
  })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: the unlock just isn't kept
  }
  return next
}

/** Starts a one-building round on `id` (a Custom session of one) and opens it. */
export function playBuilding(id) {
  startSession([{ id }], emptyConfig)
  window.location.hash = '#/custom/play'
}
