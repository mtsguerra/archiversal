import { describe, expect, it } from 'vitest'
import { stampInk, wrapLines } from '../components/library/postcard.js'
import { loreFact } from './lore.js'
import { sanitizeReading } from './readingList.js'
import { shelfText } from './shelf.js'

describe('reading list', () => {
  it('keeps only unique, well-formed ids', () => {
    expect(sanitizeReading(['a-b', 'a-b', 'BAD ID', 3, null, 'c'])).toEqual(['a-b', 'c'])
    expect(sanitizeReading('nope')).toEqual([])
  })
})

describe('daily lore', () => {
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

describe('postcard text', () => {
  const measure = (s) => s.length * 10
  it('wraps at the width and never splits a word', () => {
    expect(wrapLines('one two three four', 90, measure)).toEqual(['one two', 'three', 'four'])
    expect(wrapLines('extraordinarily', 50, measure)).toEqual(['extraordinarily'])
    expect(wrapLines('', 50, measure)).toEqual([])
  })
})

describe('stamp colours', () => {
  it('gives each of the 23 eras a different colour', () => {
    expect(new Set(Array.from({ length: 23 }, (_, i) => stampInk(i))).size).toBe(23)
  })
})
