// What this device has played: finished Dailies (by number) and the eras and countries of every
// revealed building. Kept only here; read back defensively since anything can sit in localStorage.
const KEY = 'arch-guesser:progress'
const LIMITS = { days: 400, eras: 60, countries: 300 }
const empty = () => ({ days: [], eras: [], countries: [] })

const list = (value, ok, limit) => (Array.isArray(value) ? [...new Set(value.filter(ok))].slice(-limit) : [])

export function sanitizeProgress(raw) {
  if (!raw || typeof raw !== 'object') return empty()
  return {
    days: list(raw.days, (n) => Number.isInteger(n) && n > 0 && n < 1e6, LIMITS.days),
    eras: list(raw.eras, (e) => typeof e === 'string' && /^[A-Z_]{2,30}$/.test(e), LIMITS.eras),
    countries: list(raw.countries, (c) => typeof c === 'string' && /^[A-Z]{2}$/.test(c), LIMITS.countries),
  }
}

export function readProgress() {
  try {
    return sanitizeProgress(JSON.parse(localStorage.getItem(KEY)))
  } catch {
    return empty()
  }
}

/** Notes a revealed building (any mode); `daily` is the Daily's number when it was the Daily. */
export function recordReveal(building, daily) {
  const p = readProgress()
  const next = sanitizeProgress({
    days: daily ? [...p.days, daily] : p.days,
    eras: [...p.eras, building.era],
    countries: [...p.countries, building.location?.countryCode],
  })
  try {
    localStorage.setItem(KEY, JSON.stringify(next))
  } catch {
    // storage blocked: the progress just isn't kept
  }
  return next
}

/** Days in a row with a finished Daily, ending today (or yesterday, while today is still open). */
export function streakLength(days, today) {
  const played = new Set(days)
  let day = played.has(today) ? today : today - 1
  let count = 0
  while (played.has(day)) {
    count++
    day--
  }
  return count
}

/** The last seven Dailies, oldest first: 'done' | 'late' (played after its day) | 'missed' | 'today' (still open). */
export function lastWeek(days, today, late = []) {
  const played = new Set(days)
  const afterwards = new Set(late)
  return Array.from({ length: 7 }, (_, i) => {
    const number = today - 6 + i
    return { number, state: played.has(number) ? 'done' : afterwards.has(number) ? 'late' : number === today ? 'today' : 'missed' }
  }).filter((d) => d.number > 0)
}
