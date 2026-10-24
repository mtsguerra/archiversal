import { beforeEach, describe, expect, it } from 'vitest'
import { dayOf, readLibrary, recordLibrary, sanitizeLibrary } from './library.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
}

const day = new Date(2026, 9, 24)

describe('library', () => {
  beforeEach(() => localStorage.clear())

  it('formats the local day', () => {
    expect(dayOf(day)).toBe('2026-10-24')
  })

  it('drops anything that is not an id with a day, a mode and flags', () => {
    expect(
      sanitizeLibrary({
        'villa-savoye': { at: '2026-10-24', mode: 'daily', mastered: true, attempts: 2 },
        'Bad Id': { at: '2026-10-24', mode: 'daily' },
        'no-day': { at: 'yesterday', mode: 'daily' },
        'no-mode': { at: '2026-10-24', mode: 'hacked' },
        'odd-flags': { at: '2026-10-24', mode: 'normal', mastered: 'yes', attempts: -3 },
      }),
    ).toEqual({
      'villa-savoye': { at: '2026-10-24', mode: 'daily', mastered: true, attempts: 2 },
      'odd-flags': { at: '2026-10-24', mode: 'normal', mastered: false, attempts: 0 },
    })
    expect(sanitizeLibrary('nope')).toEqual({})
    expect(sanitizeLibrary([1])).toEqual({})
  })

  it('unlocks a building on its first reveal and keeps that day and mode', () => {
    recordLibrary('villa-savoye', { mode: 'normal', mastered: false, attempts: 3 }, day)
    recordLibrary('villa-savoye', { mode: 'daily', mastered: false, attempts: 1 }, new Date(2026, 9, 25))
    expect(readLibrary()).toEqual({ 'villa-savoye': { at: '2026-10-24', mode: 'normal', mastered: false, attempts: 3 } })
  })

  it('adds the mastered mark on a later reveal and never takes it away', () => {
    recordLibrary('villa-savoye', { mode: 'normal', mastered: false, attempts: 3 }, day)
    recordLibrary('villa-savoye', { mode: 'normal', mastered: true, attempts: 1 }, day)
    expect(readLibrary()['villa-savoye'].mastered).toBe(true)
    recordLibrary('villa-savoye', { mode: 'normal', mastered: false, attempts: 1 }, day)
    expect(readLibrary()['villa-savoye'].mastered).toBe(true)
  })

  it('reads an empty library when storage holds garbage', () => {
    localStorage.setItem('archiversal:library', '{not json')
    expect(readLibrary()).toEqual({})
  })
})
