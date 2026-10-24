import { isId, read, shuffle, write } from './custom.js'

export const THEMED_ROUNDS = 10
export const MIN_THEME_BUILDINGS = 10
export const LEVELS = [1, 2, 3]

// What each difficulty asks for: casual is the name and era, challenging adds the century, and custom (3) adds what the
// player picked from EXTRAS (the era among them). The architect drops out when the theme has none to ask for.
const LEVEL_FIELDS = {
  1: ['name', 'era'],
  2: ['name', 'era', 'century'],
  3: ['name'], // custom: only the building is always asked
}
export const EXTRAS = ['era', 'century', 'decade', 'country', 'architect'] // in the order they are asked
export const DEFAULT_EXTRAS = ['era', 'century', 'decade', 'architect']

/** A stored or edited list of extras made safe: known names only, in order, and no decade without its century. */
export function sanitizeExtras(value) {
  if (!Array.isArray(value)) return DEFAULT_EXTRAS
  const picked = new Set(value)
  if (picked.has('decade')) picked.add('century')
  return EXTRAS.filter((f) => picked.has(f))
}

/** The menu's filter: every theme sits in exactly one group (a test keeps it in step with the theme list). */
export const THEME_GROUPS = {
  sacred: ['churches-cathedrals', 'mosques', 'monasteries', 'asian-temples'],
  power: ['castles', 'palaces', 'ancient-ruins'],
  civic: ['museums', 'theatres-opera', 'libraries', 'stadiums', 'railway-stations'],
  living: ['houses-villas', 'skyscrapers', 'bridges-towers'],
  styles: ['brutalism', 'art-nouveau', 'art-deco', 'portuguese-azulejo', 'modern-icons'],
}

/**
 * How many columns to lay `count` tiles in, given how many fit (`max`): all in one row when they fit, else the
 * count that leaves the fewest empty cells in the last row (the larger on a tie), so no row ends short if it can help it.
 */
export function columnsFor(count, max) {
  if (count <= max) return Math.max(1, count)
  let best = max
  for (let c = max - 1; c >= 2; c--) if ((c - (count % c)) % c < (best - (count % best)) % best) best = c
  return best
}

/**
 * The opened theme as a block of `w` × `h` cells in a grid of `cols` columns, chosen so that with the other `n - 1` tiles
 * every row is full (dense flow lets the next tiles fill any gap). Prefers a block near 3 × 3, then more columns; when no
 * block closes the rows it falls back to a full-width, two-row block (`exact: false`).
 */
export function blockLayout(n, fit) {
  const others = Math.max(0, n - 1)
  let best = null
  for (let cols = Math.min(fit, 6); cols >= 3; cols--) {
    for (let w = 2; w <= cols; w++) {
      for (let h = 2; h <= 4; h++) {
        const area = w * h
        if ((others + area) % cols || others + area < cols * h) continue
        const score = Math.abs(area - 9) * 10 - cols
        if (!best || score < best.score) best = { cols, w, h, exact: true, score }
      }
    }
  }
  if (best) return { cols: best.cols, w: best.w, h: best.h, exact: true }
  const cols = Math.max(2, Math.min(fit, 4))
  return { cols, w: cols, h: 2, exact: false }
}

const isKnownArchitect = (name) => !/^unknown/i.test(name)

/** Themes with enough buildings to play: [{ id, count }], most buildings first. */
export function themesOf(catalogue) {
  const counts = new Map()
  for (const b of catalogue) for (const id of b.themes ?? []) counts.set(id, (counts.get(id) ?? 0) + 1)
  return [...counts]
    .filter(([, count]) => count >= MIN_THEME_BUILDINGS)
    .map(([id, count]) => ({ id, count }))
    .sort((a, b) => b.count - a.count || a.id.localeCompare(b.id))
}

export const themePool = (catalogue, theme) => catalogue.filter((b) => b.themes?.includes(theme))

/** Eras that occur in the pool, so the era list never offers a style the theme lacks. */
export const erasIn = (pool) => [...new Set(pool.map((b) => b.era))]

/** Share of the pool with a named architect (not "Unknown ..."). */
const knownShare = (pool) => pool.filter((b) => b.architects.some(isKnownArchitect)).length / pool.length

/**
 * The fields to ask for one building at one level. A building with no date skips the date fields,
 * a BCE one skips the decade, and the architect drops out when most of the theme's are unknown.
 */
export function fieldsFor(level, pool, building, extras = DEFAULT_EXTRAS) {
  const dated = building.yearCompleted != null
  const skip = {
    century: !dated,
    decade: !dated || building.yearCompleted <= 0,
    architect: knownShare(pool) < 0.5 || !building.architects.some(isKnownArchitect),
  }
  const wanted = level === 3 ? [...LEVEL_FIELDS[3], ...sanitizeExtras(extras)] : LEVEL_FIELDS[level]
  return wanted.filter((f) => !skip[f])
}

// A themed session is one shuffled run through ten buildings of a theme; it lives in this tab only.
const SESSION_KEY = 'archiversal:themed-session'

export function startThemedSession(pool, theme, level, random, extras = DEFAULT_EXTRAS) {
  const ids = shuffle(pool.map((b) => b.id), random).slice(0, THEMED_ROUNDS)
  const session = { theme, level, extras: sanitizeExtras(extras), ids, index: 0, played: [] }
  write(sessionStorage, SESSION_KEY, session)
  return session
}

export function readThemedSession() {
  const s = read(sessionStorage, SESSION_KEY)
  if (!s || !isId(s.theme) || !LEVELS.includes(s.level) || !Array.isArray(s.ids) || !s.ids.every(isId)) return null
  if (!Number.isInteger(s.index) || s.index < 0) return null
  // Only https links reach an <a href> from here.
  const played = (Array.isArray(s.played) ? s.played : [])
    .filter((p) => p && isId(p.id) && typeof p.name === 'string' && typeof p.wikipedia === 'string' && p.wikipedia.startsWith('https://'))
    .map((p) => ({ id: p.id, name: p.name, wikipedia: p.wikipedia, year: Number.isInteger(p.year) ? p.year : null, solved: p.solved === true }))
  return { theme: s.theme, level: s.level, extras: sanitizeExtras(s.extras), ids: s.ids, index: s.index, played }
}

export const restoreThemedSession = (session) => write(sessionStorage, SESSION_KEY, session)
export const clearThemedSession = () => {
  try {
    sessionStorage.removeItem(SESSION_KEY)
  } catch {
    // Ignore.
  }
}

/** Moves on from `building`, recording it (and whether it was solved) for the recap. */
export function advanceThemedSession(session, building, solved) {
  const played = building
    ? [...session.played, { id: building.id, name: building.name, wikipedia: building.wikipedia, year: building.yearCompleted ?? null, solved }]
    : session.played
  const next = { ...session, played, index: session.index + 1 }
  write(sessionStorage, SESSION_KEY, next)
  return next
}

// The last theme and level picked, remembered between visits.
const PICK_KEY = 'archiversal:themed'

export function readThemedPick() {
  const v = read(localStorage, PICK_KEY) ?? {}
  return { theme: isId(v.theme) ? v.theme : null, level: LEVELS.includes(v.level) ? v.level : 1, extras: sanitizeExtras(v.extras) }
}
export const saveThemedPick = (pick) => write(localStorage, PICK_KEY, pick)
