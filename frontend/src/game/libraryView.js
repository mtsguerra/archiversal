import { CENTROIDS } from './countryCentroids.js'
import { centuryOf } from './dates.js'
import { CLOSE_ERAS } from './matchGuess.js'
import { normalize } from './text.js'
import { FEATURES_OF } from './features.js'

// What the Library page shows, as plain functions over the API rows (fetchLibrary) and the unlocks (library.js).

/**
 * Joins the rows with the unlocks. `no` is the sheet number (A-101…), the building's place in id order, so
 * it does not change when the language does.
 */
export function joinRows(rows, unlocks) {
  const order = [...rows].sort((a, b) => (a.id < b.id ? -1 : 1))
  const no = new Map(order.map((r, i) => [r.id, `A-${101 + i}`]))
  return rows.map((r) => {
    const u = unlocks[r.id]
    return { ...r, features: FEATURES_OF[r.id] ?? [], no: no.get(r.id), open: Boolean(u), mastered: u?.mastered === true, at: u?.at ?? null, mode: u?.mode ?? null, attempts: u?.attempts ?? 0 }
  })
}

/**
 * Whether a row passes the filters. A locked building shows only its era, so it never matches a name or
 * country search: a search can never be used to find out what is still locked.
 */
export function passes(row, { era = '', country = '', show = 'all', query = '', feature = '', reading = [] }) {
  if (era && row.era !== era) return false
  if (show === 'open' && !row.open) return false
  if (show === 'mastered' && !row.mastered) return false
  if (show === 'locked' && row.open) return false
  if (show === 'reading' && (row.open || !reading.includes(row.id))) return false
  if ((query || country || feature) && !row.open) return false
  if (feature && !row.features.includes(feature)) return false
  if (country && row.countryCode !== country) return false
  if (query) {
    const hay = normalize([row.name, ...row.architects, row.country].join(' '))
    return normalize(query).split(' ').every((word) => hay.includes(word))
  }
  return true
}

/**
 * Splits rows into groups: 'era' (in `eraOrder`, every group keyed by the era id), 'century' or 'country'
 * (both only know the buildings that are unlocked; the rest wait in a last group keyed '~').
 * Inside a group the unlocked ones come first, oldest first.
 */
export function groupRows(rows, by, eraOrder) {
  const groups = new Map()
  const put = (key, row) => groups.set(key, [...(groups.get(key) ?? []), row])
  for (const row of rows) {
    if (by === 'era') put(row.era, row)
    else if (!row.open || row.yearCompleted == null) put('~', row)
    else put(by === 'century' ? centuryOf(row.yearCompleted) : row.countryCode, row)
  }
  const byYear = (a, b) => (a.yearCompleted ?? Infinity) - (b.yearCompleted ?? Infinity)
  const out = [...groups].map(([key, items]) => ({ key, items: items.sort((a, b) => b.open - a.open || byYear(a, b)) }))
  const rank = (g) => (g.key === '~' ? Infinity : by === 'era' ? eraOrder.indexOf(g.key) : by === 'century' ? g.key : 0)
  return out.sort((a, b) => (by === 'country' && a.key !== '~' && b.key !== '~' ? a.items[0].country.localeCompare(b.items[0].country) : rank(a) - rank(b)))
}

/** The figures of the stats strip, over every row (not the filtered ones). */
export function libraryStats(rows) {
  const open = rows.filter((r) => r.open)
  const years = open.map((r) => r.yearCompleted).filter((y) => y != null)
  const eras = Map.groupBy(rows, (r) => r.era)
  return {
    total: rows.length,
    discovered: open.length,
    mastered: open.filter((r) => r.mastered).length,
    erasComplete: [...eras.values()].filter((list) => list.every((r) => r.open)).length,
    erasTotal: eras.size,
    countries: new Set(open.map((r) => r.countryCode)).size,
    countriesTotal: new Set(rows.map((r) => r.countryCode)).size,
    oldest: years.length ? Math.min(...years) : null,
  }
}

/** Per era: how many buildings, how many unlocked, and whether the set is complete. */
export function eraProgress(rows) {
  const out = {}
  for (const r of rows) {
    out[r.era] ??= { total: 0, open: 0, complete: false }
    out[r.era].total++
    if (r.open) out[r.era].open++
  }
  for (const p of Object.values(out)) p.complete = p.open === p.total
  return out
}

/** The styles the game answers "Close!" for next to `era`, limited to those that exist in `eras`. */
export const neighbourEras = (era, eras) =>
  CLOSE_ERAS.filter((pair) => pair.includes(era)).map((pair) => pair.find((e) => e !== era)).filter((e) => eras.includes(e))

/** Great-circle distance between two countries' rough centres, in km; null when either is unknown. */
export function distanceKm(codeA, codeB) {
  const a = CENTROIDS[codeA]
  const b = CENTROIDS[codeB]
  if (!a || !b) return null
  const rad = Math.PI / 180
  const h = Math.sin(((b[0] - a[0]) * rad) / 2) ** 2 + Math.cos(a[0] * rad) * Math.cos(b[0] * rad) * Math.sin(((b[1] - a[1]) * rad) / 2) ** 2
  return Math.round(6371 * 2 * Math.asin(Math.sqrt(h)))
}

/** A random locked building's id, from one era if given; null when none is left. Only the id leaves: nothing else about it is shown. */
export function pickLocked(rows, era = '', random = Math.random, reading = []) {
  const locked = rows.filter((r) => !r.open && (!era || r.era === era))
  const wanted = locked.filter((r) => reading.includes(r.id))
  const pool = wanted.length ? wanted : locked
  return pool.length ? pool[Math.floor(random() * pool.length)].id : null
}

/** How the two buildings relate, for the compare view. */
export function compareFacts(a, b) {
  return {
    yearsApart: a.yearCompleted != null && b.yearCompleted != null ? Math.abs(a.yearCompleted - b.yearCompleted) : null,
    km: distanceKm(a.countryCode, b.countryCode),
    sameEra: a.era === b.era,
    sameCountry: a.countryCode === b.countryCode,
    sameArchitect: a.architects.some((x) => b.architects.includes(x)),
  }
}

/**
 * The era a reveal has just completed: `id` was not unlocked before, and now every building of its era is.
 * `catalogue` is the catalogue (id, era); `before` and `after` are the unlocks around the reveal.
 */
export function completedEra(catalogue, before, after, id) {
  const era = catalogue.find((b) => b.id === id)?.era
  if (!era || id in before) return null
  return catalogue.filter((b) => b.era === era).every((b) => b.id in after) ? era : null
}

/**
 * How far each collection (a Themed theme) is complete. `themesOf` maps a building id to its theme ids; a
 * collection with fewer than two buildings is left out. Counts only: nothing about a locked building leaks.
 */
export function collectionProgress(rows, themesOf) {
  const out = {}
  for (const r of rows) {
    for (const id of themesOf[r.id] ?? []) {
      out[id] ??= { total: 0, open: 0, complete: false }
      out[id].total++
      if (r.open) out[id].open++
    }
  }
  for (const [id, p] of Object.entries(out)) {
    if (p.total < 2) delete out[id]
    else p.complete = p.open === p.total
  }
  return out
}

/** What a study sheet says about an era, from the buildings unlocked in it (the rest stay out of it). */
export function eraFacts(rows, era) {
  const mine = rows.filter((r) => r.era === era)
  const open = mine.filter((r) => r.open)
  const years = open.map((r) => r.yearCompleted).filter((y) => y != null)
  const count = (list) => Object.entries(list.reduce((m, x) => ({ ...m, [x]: (m[x] ?? 0) + 1 }), {})).sort((a, b) => b[1] - a[1] || (a[0] < b[0] ? -1 : 1))
  return {
    total: mine.length,
    open: open.length,
    from: years.length ? Math.min(...years) : null,
    to: years.length ? Math.max(...years) : null,
    countries: [...new Set(open.map((r) => r.countryCode))],
    architects: [...new Set(open.flatMap((r) => r.architects))],
    features: count(open.flatMap((r) => r.features)),
  }
}
