import { isCloseTo, normalize } from './text.js'

// Region codes Intl knows that aren't countries.
const NOT_COUNTRIES = new Set(['EU', 'EZ', 'QO', 'UN', 'XA', 'XB', 'ZZ'])

// Common names Intl doesn't produce.
const ALIASES = {
  usa: 'US',
  'united states of america': 'US',
  america: 'US',
  uk: 'GB',
  britain: 'GB',
  'great britain': 'GB',
  england: 'GB',
  scotland: 'GB',
  wales: 'GB',
  holland: 'NL',
  turkey: 'TR',
  'czech republic': 'CZ',
  russia: 'RU',
  'south korea': 'KR',
  'north korea': 'KP',
  'ivory coast': 'CI',
  burma: 'MM',
  vatican: 'VA',
  // Some browsers name CN "Mainland China" / "China continental", so plain "china" would match nothing.
  china: 'CN',
  'mainland china': 'CN',
  "people's republic of china": 'CN',
  prc: 'CN',
  'hong kong': 'HK',
  macau: 'MO',
  macao: 'MO',
}

const LOCALES = ['en', 'pt-BR']

// Intl calls PS "Palestinian Territories"; the game says Palestine.
const NAME_OVERRIDES = { en: { PS: 'Palestine' }, 'pt-BR': { PS: 'Palestina' } }

// Drops deprecated codes that alias a current one (FX → FR, BU → MM, YU → RS).
function isCanonical(code) {
  return Intl.getCanonicalLocales(`und-${code}`)[0] === `und-${code}`
}

function regionNames(locale) {
  const names = new Intl.DisplayNames([locale], { type: 'region', fallback: 'none' })
  const result = []
  for (let a = 65; a <= 90; a++) {
    for (let b = 65; b <= 90; b++) {
      const code = String.fromCharCode(a, b)
      if (NOT_COUNTRIES.has(code) || !isCanonical(code)) continue
      const name = NAME_OVERRIDES[locale]?.[code] ?? names.of(code)
      if (name && name !== code) result.push({ code, name })
    }
  }
  return result
}

let cache
function index() {
  if (cache) return cache
  // Sorted lists per display language; names in every supported language (and the player's own
  // browser language) resolve to a code whichever language the UI is in.
  const lists = Object.fromEntries(
    LOCALES.map((locale) => [locale, regionNames(locale).sort((x, y) => x.name.localeCompare(y.name, locale))]),
  )
  const byName = new Map()
  const userLocale = typeof navigator !== 'undefined' ? navigator.language : undefined
  const known = [...LOCALES, ...(userLocale && !LOCALES.includes(userLocale) ? [userLocale] : [])]
  for (const locale of known) {
    for (const { code, name } of lists[locale] ?? regionNames(locale)) byName.set(normalize(name), code)
  }
  for (const [alias, code] of Object.entries(ALIASES)) byName.set(alias, code)

  cache = { lists, byName, codes: new Set(lists.en.map((c) => c.code)) }
  return cache
}

const listFor = (lang) => index().lists[lang] ?? index().lists.en

/** A country's name in `lang` from its ISO code, or null if unknown. */
export function countryName(code, lang = 'en') {
  return listFor(lang).find((c) => c.code === code)?.name ?? null
}

/** Up to `limit` suggestions: prefix matches first, then names containing the query. */
export function suggestCountries(query, lang = 'en', limit = 8) {
  const q = normalize(query)
  if (!q) return []
  const prefix = []
  const contains = []
  for (const country of listFor(lang)) {
    const name = normalize(country.name)
    if (name.startsWith(q)) prefix.push(country)
    else if (name.includes(` ${q}`)) contains.push(country)
  }
  return [...prefix, ...contains].slice(0, limit)
}

/** ISO code for free text ("usa", "France", "Itália", "Frnace"), or null. */
export function resolveCountryCode(text) {
  const q = normalize(text)
  if (!q) return null
  const { byName, codes } = index()
  if (q.length === 2 && codes.has(q.toUpperCase())) return q.toUpperCase()
  if (byName.has(q)) return byName.get(q)
  for (const [name, code] of byName) {
    if (isCloseTo(q, name)) return code
  }
  return null
}
