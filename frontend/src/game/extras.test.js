import { describe, expect, it } from 'vitest'
import { loreFact, loreId } from './lore.js'
import { sanitizeReading } from './readingList.js'
import { shelfText } from './shelf.js'

describe('reading list', () => {
  it('keeps only unique, well-formed ids', () => {
    expect(sanitizeReading(['a-b', 'a-b', 'BAD ID', 3, null, 'c'])).toEqual(['a-b', 'c'])
    expect(sanitizeReading('nope')).toEqual([])
  })
})

describe('daily lore', () => {
  it('picks the same building all day, independent of unlock order', () => {
    expect(loreId(['b', 'a', 'c'], 4)).toBe(loreId(['c', 'b', 'a'], 4))
    expect(loreId([], 4)).toBeNull()
  })
  it('picks a fun fact, or the description when there are none', () => {
    expect(loreFact({ funFacts: ['x', 'y'] }, 3)).toBe('y')
    expect(loreFact({ funFacts: [], description: 'd' }, 3)).toBe('d')
    expect(loreFact(null, 3)).toBe('')
  })
})

describe('shelf text', () => {
  const t = { title: 'My Library', line: (a, b, c, d, e) => `${a}/${b} ${c} ${d}/${e}`, stamps: (s) => `Stamps: ${s}` }
  it('shares totals and stamps, no building names', () => {
    const text = shelfText({ discovered: 3, total: 395, mastered: 2, erasComplete: 1, erasTotal: 23 }, ['Gothic'], t, 'https://x.y')
    expect(text).toBe('My Library\n3/395 2 1/23\nStamps: Gothic\nhttps://x.y')
  })
})
