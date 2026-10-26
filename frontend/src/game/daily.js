import { fetchBuildingIds } from '../api/buildings.js'
import { GUESS_FIELDS } from './matchGuess.js'

// Daily #1 is the launch day. A day is the player's local calendar day.
const EPOCH = Date.UTC(2026, 9, 16)
const DAY = 86_400_000
const KEY = 'archiversal:daily'

const dayStart = (date) => Date.UTC(date.getFullYear(), date.getMonth(), date.getDate())
export const dailyNumber = (date = new Date()) => Math.max(1, Math.round((dayStart(date) - EPOCH) / DAY) + 1)

const hash = (text) => {
  let h = 2166136261
  for (const char of text) h = Math.imul(h ^ char.codePointAt(0), 16777619)
  return h >>> 0
}

/**
 * The same building for everyone on a given day: ids in a fixed pseudo-random order, one per day,
 * repeating after a full cycle. shortcut: adding a building to the catalogue shifts later days, so
 * freeze the order (or curate a calendar) once the daily has a following.
 */
export function dailyId(ids, number) {
  const order = [...ids].sort((a, b) => hash(a) - hash(b) || (a < b ? -1 : 1))
  return order[(number - 1) % order.length]
}

export const msUntilNextDay = (now = new Date()) =>
  new Date(now.getFullYear(), now.getMonth(), now.getDate() + 1) - now

/** "05:42" (hours:minutes, rounded up). */
export function formatCountdown(ms) {
  const minutes = Math.ceil(ms / 60_000)
  return `${String(Math.floor(minutes / 60)).padStart(2, '0')}:${String(minutes % 60).padStart(2, '0')}`
}

const STATUSES = ['idle', 'wrong', 'close', 'correct']
const count = (n) => Number.isInteger(n) && n >= 0

// A saved result goes straight to the reveal, so a damaged one is ignored rather than trusted.
const validResult = ({ id, outcome, fields, attempts, hintsUsed }) =>
  typeof id === 'string' &&
  (outcome === 'solved' || outcome === 'gaveUp') &&
  GUESS_FIELDS.every((f) => STATUSES.includes(fields?.[f])) &&
  count(attempts) &&
  count(hintsUsed)

const DAYS_KEY = 'archiversal:daily-days' // every finished Daily by number, today's and the ones played late

// localStorage can throw (private modes, blocked storage); the daily then just isn't remembered.
const readDays = () => {
  try {
    const saved = JSON.parse(localStorage.getItem(DAYS_KEY))
    return saved && typeof saved === 'object' && !Array.isArray(saved) ? saved : {}
  } catch {
    return {}
  }
}

export function readDaily(number) {
  try {
    const saved = JSON.parse(localStorage.getItem(KEY))
    if (saved?.number === number && validResult(saved)) return saved
  } catch {
    // fall through to the per-day record
  }
  const past = readDays()[number]
  return past?.number === number && validResult(past) ? past : null
}

/** Numbers of the past Dailies that were played after their day (they do not count for the streak). */
export const readLate = () =>
  Object.values(readDays())
    .filter((r) => r?.late === true && Number.isInteger(r.number) && validResult(r))
    .map((r) => r.number)

/** Every day number with a saved result, played on time or late. */
export const readPlayed = () =>
  Object.values(readDays())
    .filter((r) => Number.isInteger(r?.number) && validResult(r))
    .map((r) => r.number)

/** `late` is set for a day other than today's. */
export function saveDaily(result) {
  const late = result.number !== dailyNumber()
  try {
    if (!late) localStorage.setItem(KEY, JSON.stringify(result))
    localStorage.setItem(DAYS_KEY, JSON.stringify({ ...readDays(), [result.number]: { ...result, late } }))
  } catch {
    // Ignore: the daily can be replayed.
  }
}

/** Today's daily id while it is still unfinished (Normal play skips it), else null. */
export async function dailyHold() {
  try {
    const number = dailyNumber()
    return readDaily(number) ? null : dailyId(await fetchBuildingIds(), number)
  } catch {
    return null
  }
}

const ICONS = { name: '🏛️', architect: '👤', country: '🌍', era: '⏳' }

/** The copyable result: never names the building. */
export function shareText({ number, fields, hintsUsed, title, url }) {
  const row = GUESS_FIELDS.map((f) => `${ICONS[f]}${fields[f] === 'correct' ? '✅' : fields[f] === 'close' ? '🟨' : '❌'}`).join(' ')
  return `${title} #${number}\n${row}${hintsUsed ? ` · 💡${hintsUsed}` : ''}\n${url}`
}
