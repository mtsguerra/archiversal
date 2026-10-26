import { resolveCountryCode } from './countries.js'
import { isCloseTo, normalize } from './text.js'
import { judgeCentury, judgeDecade } from './dates.js'

export const GUESS_FIELDS = ['name', 'architect', 'country', 'era']

// Words too generic to identify a building or person on their own.
const GENERIC_WORDS = new Set([
  'and', 'of', 'for', 'la', 'le', 'les', 'el', 'il', 'di', 'de', 'del', 'della', 'alla', 'du', 'des', 'van', 'von',
  'villa', 'house', 'casa', 'maison', 'haus', 'church', 'chiesa', 'cathedral', 'chapel', 'temple', 'palace', 'palazzo',
  'tower', 'museum', 'hall', 'building', 'center', 'centre', 'institute', 'saint', 'sant', 'san', 'santa', 'st',
  'studies', 'library', 'school', 'pavilion',
])

const MIN_WORD = 4

/**
 * Eras that blur into each other. A guess of one for a building stored as the other is
 * "close": the field stays open and the player is nudged to the more specific style.
 * Each building stores exactly one era: the style it is known for, not its date.
 */
export const CLOSE_ERAS = [
  ['MODERNISM', 'BRUTALISM'],
  ['MODERNISM', 'CONTEMPORARY'],
  ['BRUTALISM', 'CONTEMPORARY'],
  ['POSTMODERNISM', 'CONTEMPORARY'],
  ['HISTORICISM', 'ART_NOUVEAU'],
  ['ART_DECO', 'MODERNISM'],
  ['NEOCLASSICAL', 'HISTORICISM'],
  ['MANUELINE', 'MEDIEVAL'],
  ['MANUELINE', 'RENAISSANCE'],
  ['MANNERISM', 'RENAISSANCE'],
  ['MANNERISM', 'BAROQUE'],
  ['ISLAMIC', 'MEDIEVAL'],
  ['INDUSTRIAL', 'HISTORICISM'],
  ['RUSSIAN', 'BYZANTINE'],
]

/** true (exactly the stored era), 'close' (a neighbouring one, either way round) or false. */
export function judgeEra(guess, answer) {
  if (guess === answer) return true
  return CLOSE_ERAS.some(([a, b]) => (guess === a && answer === b) || (guess === b && answer === a)) ? 'close' : false
}

/**
 * Words distinctive enough to count alone. For buildings, any non-generic word
 * ("savoye", "rotonda"); for people, only the surname ("borromini", "kahn"),
 * since a first name like "Louis" identifies no one.
 */
function distinctiveWords(name, person) {
  const words = normalize(name).split(' ')
  const candidates = person ? words.slice(-1) : words
  return candidates.filter((w) => w.length >= MIN_WORD && !GENERIC_WORDS.has(w))
}

/**
 * Typo-tolerant match against a list of accepted names. The guess may be the
 * whole name or one of its distinctive words.
 */
export function matchesName(guess, names, { person = false } = {}) {
  const g = normalize(guess)
  if (g.length < 3) return false
  return names.some((name) => {
    const target = normalize(name)
    return isCloseTo(g, target) || distinctiveWords(name, person).some((word) => isCloseTo(g, word))
  })
}

/**
 * Scores the player's guess. Each field is true (correct), false (wrong) or
 * null (left empty, so not judged); the era may also be 'close'.
 */
export function evaluateGuess(building, values) {
  const judge = (value, isCorrect) => (String(value ?? '').trim() ? isCorrect(value) : null)

  const themed = {}
  if ('century' in values) themed.century = judge(values.century, (v) => judgeCentury(v, building.yearCompleted))
  if ('decade' in values) themed.decade = judge(values.decade, (v) => judgeDecade(v, building.yearCompleted))

  return {
    ...themed,
    name: judge(values.name, (v) => matchesName(v, [building.name, ...building.aliases])),
    architect: judge(values.architect, (v) =>
      building.architects.some((a) => matchesName(v, [a.name, ...a.aliases], { person: true })),
    ),
    country: judge(values.country, (v) => resolveCountryCode(v) === building.location.countryCode),
    era: judge(values.era, (v) => judgeEra(v, building.era)),
  }
}

/** A round's points: 1 per correct field, half for a close one (a neighbouring era, century or decade). */
export function scoreOf(fields, names = Object.keys(fields)) {
  return names.reduce((sum, f) => sum + (fields[f] === 'correct' ? 1 : fields[f] === 'close' ? 0.5 : 0), 0)
}
