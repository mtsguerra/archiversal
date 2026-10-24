import { describe, expect, it } from 'vitest'
import { centuriesIn, centuryOf, decadeOf, decadesOfCentury, judgeCentury, judgeDecade } from './dates.js'
import en from '../strings/en.js'
import { THEME_GROUPS, blockLayout, columnsFor, sanitizeExtras, erasIn, fieldsFor, themePool, themesOf } from './themed.js'
import { evaluateGuess } from './matchGuess.js'

const entry = (id, themes, extra = {}) => ({ id, themes, era: 'MEDIEVAL', architects: ['Unknown masons'], yearCompleted: 1250, ...extra })

describe('centuries', () => {
  it('numbers CE and BCE centuries', () => {
    expect([centuryOf(1), centuryOf(100), centuryOf(101), centuryOf(1893), centuryOf(2015)]).toEqual([1, 1, 2, 19, 21])
    expect([centuryOf(-447), centuryOf(-1), centuryOf(0), centuryOf(-100), centuryOf(-101)]).toEqual([-5, -1, -1, -1, -2])
  })

  it('judges exact, near miss and wrong', () => {
    expect(judgeCentury(19, 1893)).toBe(true)
    expect(judgeCentury(20, 1893)).toBe('close') // 8 years before the 20th century
    expect(judgeCentury(18, 1893)).toBe(false) // 93 years after the 18th
    expect(judgeCentury(18, 1805)).toBe('close')
    expect(judgeCentury(-5, -447)).toBe(true)
    expect(judgeCentury(-4, -401)).toBe('close') // 401 BCE is the 5th century, one year before the 4th starts
    expect(judgeCentury(-3, -401)).toBe(false)
  })

  it('rejects junk', () => {
    expect(judgeCentury(0, 1893)).toBe(false)
    expect(judgeCentury('x', 1893)).toBe(false)
  })
})

describe('decades', () => {
  it('judges the decade and its neighbours', () => {
    expect(decadeOf(1893)).toBe(1890)
    expect(judgeDecade(1890, 1893)).toBe(true)
    expect(judgeDecade(1880, 1893)).toBe('close')
    expect(judgeDecade(1900, 1893)).toBe('close')
    expect(judgeDecade(1870, 1893)).toBe(false)
  })
})

describe('evaluateGuess with date fields', () => {
  const b = { name: 'Tower', aliases: [], architects: [], location: { countryCode: 'FR' }, era: 'MEDIEVAL', yearCompleted: 1893 }
  it('adds century and decade only when asked', () => {
    expect(Object.keys(evaluateGuess(b, { name: 'Tower', architect: '', country: '', era: '' }))).not.toContain('century')
    const r = evaluateGuess(b, { name: 'Tower', era: 'MEDIEVAL', century: 20, decade: 1890 })
    expect(r).toMatchObject({ century: 'close', decade: true })
  })
})

describe('theme pools', () => {
  const catalogue = [
    ...Array.from({ length: 10 }, (_, i) => entry(`c${i}`, ['castles'])),
    ...Array.from({ length: 9 }, (_, i) => entry(`m${i}`, ['museums'])),
  ]
  it('lists only themes with enough buildings', () => {
    expect(themesOf(catalogue)).toEqual([{ id: 'castles', count: 10 }])
    expect(themePool(catalogue, 'museums')).toHaveLength(9)
    expect(erasIn(catalogue)).toEqual(['MEDIEVAL'])
  })
})

describe('fieldsFor', () => {
  const named = Array.from({ length: 4 }, (_, i) => entry(`n${i}`, ['t'], { architects: ['Wren'] }))
  const anon = Array.from({ length: 4 }, (_, i) => entry(`a${i}`, ['t']))
  it('asks the level fields', () => {
    expect(fieldsFor(1, named, named[0])).toEqual(['name', 'era'])
    expect(fieldsFor(2, named, named[0])).toEqual(['name', 'era', 'century'])
    expect(fieldsFor(3, named, named[0])).toEqual(['name', 'era', 'century', 'decade', 'architect'])
  })
  it('hides the architect when the theme mostly has none', () => {
    expect(fieldsFor(3, anon, anon[0])).toEqual(['name', 'era', 'century', 'decade'])
  })
  it('skips dates that are unknown or BCE', () => {
    const undated = entry('u', ['t'], { architects: ['Wren'], yearCompleted: null })
    const bce = entry('b', ['t'], { architects: ['Wren'], yearCompleted: -447 })
    expect(fieldsFor(3, named, undated)).toEqual(['name', 'era', 'architect'])
    expect(fieldsFor(3, named, bce)).toEqual(['name', 'era', 'century', 'architect'])
  })
})

describe('themed sessions', () => {
  it('lists centuries across the pool without a century 0', () => {
    expect(centuriesIn([{ yearCompleted: -50 }, { yearCompleted: 120 }, { yearCompleted: null }])).toEqual([-1, 1, 2])
    expect(decadesOfCentury(19)).toEqual([1800, 1810, 1820, 1830, 1840, 1850, 1860, 1870, 1880, 1890, 1900])
    // A year that ends a century keeps its decade in that century's list.
    expect(decadesOfCentury(centuryOf(1900))).toContain(decadeOf(1900))
  })

  it('keeps a session through storage and drops bad links', async () => {
    const store = {}
    globalThis.sessionStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v), removeItem: (k) => delete store[k] }
    const t = await import('./themed.js')
    const pool = Array.from({ length: 12 }, (_, i) => ({ id: `b${i}` }))
    const s = t.startThemedSession(pool, 'castles', 2)
    expect(s.ids).toHaveLength(10)
    const next = t.advanceThemedSession(s, { id: 'b1', name: 'B', wikipedia: 'javascript:alert(1)', yearCompleted: 1200 }, true)
    expect(next.index).toBe(1)
    expect(t.readThemedSession().played).toEqual([]) // unsafe link filtered
    t.advanceThemedSession(next, { id: 'b2', name: 'C', wikipedia: 'https://en.wikipedia.org/wiki/C', yearCompleted: null }, false)
    expect(t.readThemedSession().played).toEqual([{ id: 'b2', name: 'C', wikipedia: 'https://en.wikipedia.org/wiki/C', year: null, solved: false }])
    store['archiversal:themed-session'] = '{"theme":"X y","level":9}'
    expect(t.readThemedSession()).toBeNull()
  })
})

describe('guess text', () => {
  it('shows century and decade with their unit', async () => {
    const { guessText } = await import('./guessText.js')
    const strings = { themed: { century: (c) => `C${c}`, decade: (d) => `D${d}` } }
    expect(guessText('century', '19', { strings })).toBe('C19')
    expect(guessText('decade', '1890', { strings })).toBe('D1890')
    expect(guessText('name', 'Tower', { strings })).toBe('Tower')
  })
})

describe('theme groups', () => {
  it('put every theme in exactly one group', () => {
    const grouped = Object.values(THEME_GROUPS).flat()
    expect([...grouped].sort()).toEqual(Object.keys(en.themed.themes).sort())
  })
})

describe('columnsFor', () => {
  it('puts a few tiles in one full row', () => {
    expect(columnsFor(1, 4)).toBe(1)
    expect(columnsFor(3, 4)).toBe(3)
    expect(columnsFor(4, 5)).toBe(4)
  })
  it('picks the count that leaves the fewest empty cells', () => {
    expect(columnsFor(20, 4)).toBe(4)
    expect(columnsFor(20, 6)).toBe(5)
    expect(columnsFor(5, 4)).toBe(3)
    expect(columnsFor(7, 4)).toBe(4)
  })
})

describe('custom difficulty', () => {
  const named = [entry('a', ['castles'], { architects: ['Ada'] })]
  it('always asks the name, then the extras picked, in order', () => {
    expect(fieldsFor(3, named, named[0], ['architect', 'country', 'era'])).toEqual(['name', 'era', 'country', 'architect'])
    expect(fieldsFor(3, named, named[0], [])).toEqual(['name'])
  })
  it('never asks a decade without its century', () => {
    expect(sanitizeExtras(['decade'])).toEqual(['century', 'decade'])
  })
  it('falls back to the old third level for stored data it cannot read', () => {
    expect(sanitizeExtras(undefined)).toEqual(['era', 'century', 'decade', 'architect'])
    expect(sanitizeExtras(['nope', 'country'])).toEqual(['country'])
  })
})

describe('blockLayout', () => {
  it('opens the 20 themes as a 3 x 3 block in 4 columns', () => {
    expect(blockLayout(20, 5)).toMatchObject({ cols: 4, w: 3, h: 3, exact: true })
    expect(blockLayout(20, 4)).toMatchObject({ cols: 4, w: 3, h: 3, exact: true })
  })
  it('keeps every row full whenever it finds an exact block', () => {
    for (let n = 1; n <= 24; n++) {
      for (const fit of [3, 4, 5, 6]) {
        const b = blockLayout(n, fit)
        if (!b.exact) continue
        const cells = n - 1 + b.w * b.h
        expect(cells % b.cols).toBe(0)
        expect(cells).toBeGreaterThanOrEqual(b.cols * b.h)
      }
    }
  })
  it('falls back to a full-width block when nothing closes the rows', () => {
    const b = blockLayout(2, 4)
    expect(b.w).toBe(b.cols)
  })
})
