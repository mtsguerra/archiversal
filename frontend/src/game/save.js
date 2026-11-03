// A player's progress as one text code, so it can move to another address or device. Only what the player
// earned travels (streak days, Library unlocks, Daily results, reading list), never settings. Anything
// coming in is sanitized and merged into what is already here: nothing is ever overwritten or lost.
import { sanitizeLibrary } from './library.js'
import { sanitizeProgress } from './progress.js'
import { sanitizeReading } from './readingList.js'

const KEYS = { progress: 'archiversal:progress', library: 'archiversal:library', reading: 'archiversal:reading', days: 'archiversal:daily-days' }
const MAX_CODE = 200_000

const read = (key) => {
  try {
    return JSON.parse(localStorage.getItem(key))
  } catch {
    return null
  }
}

// Daily results are validated again whenever they are read (daily.js validResult); here only the shape is bounded.
const sanitizeDays = (raw) => {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return {}
  const out = {}
  for (const [n, r] of Object.entries(raw).slice(0, 1000)) if (/^\d{1,6}$/.test(n) && r && typeof r === 'object' && r.number === Number(n)) out[n] = r
  return out
}

const b64 = (text) => btoa(String.fromCharCode(...new TextEncoder().encode(text))).replaceAll('+', '-').replaceAll('/', '_').replace(/=+$/, '')
const unb64 = (code) => new TextDecoder().decode(Uint8Array.from(atob(code.replaceAll('-', '+').replaceAll('_', '/')), (c) => c.charCodeAt(0)))

export const hasSave = () => Object.values(KEYS).some((k) => localStorage.getItem(k) !== null)

/** The code for this device's progress. */
export const exportSave = () =>
  b64(JSON.stringify({ v: 1, progress: read(KEYS.progress), library: read(KEYS.library), reading: read(KEYS.reading), days: read(KEYS.days) }))

/** Merges a code into this device; returns how many buildings it brought in, or null when the code is unusable. */
export function importSave(code) {
  let data
  try {
    if (typeof code !== 'string' || code.length > MAX_CODE) return null
    data = JSON.parse(unb64(code.trim()))
  } catch {
    return null
  }
  if (data?.v !== 1) return null
  const mine = sanitizeLibrary(read(KEYS.library))
  const theirs = sanitizeLibrary(data.library)
  const library = { ...theirs, ...mine }
  for (const id of Object.keys(mine)) if (theirs[id]?.mastered) library[id] = { ...mine[id], mastered: true }
  const p = sanitizeProgress(read(KEYS.progress))
  const q = sanitizeProgress(data.progress)
  const progress = sanitizeProgress({ days: [...q.days, ...p.days], eras: [...q.eras, ...p.eras], countries: [...q.countries, ...p.countries] })
  const reading = sanitizeReading([...sanitizeReading(read(KEYS.reading)), ...sanitizeReading(data.reading)])
  const days = { ...sanitizeDays(data.days), ...sanitizeDays(read(KEYS.days)) }
  try {
    localStorage.setItem(KEYS.library, JSON.stringify(library))
    localStorage.setItem(KEYS.progress, JSON.stringify(progress))
    localStorage.setItem(KEYS.reading, JSON.stringify(reading))
    localStorage.setItem(KEYS.days, JSON.stringify(days))
  } catch {
    return null
  }
  return Object.keys(library).length - Object.keys(mine).length
}

const PREFIX = '#/import='
/** The code in `#/import=<code>` (the hand-off link), or null. */
export const codeFromHash = (hash) => (hash.startsWith(PREFIX) ? hash.slice(PREFIX.length) : null)
export const importLink = (origin) => `${origin}/${PREFIX}${exportSave()}`
