import { beforeEach, describe, expect, it } from 'vitest'
import { lastWeek, readProgress, recordReveal, sanitizeProgress, streakLength } from './progress.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  clear: () => store.clear(),
}

describe('progress', () => {
  beforeEach(() => localStorage.clear())

  it('drops anything that is not a day number, an era id or a country code', () => {
    expect(sanitizeProgress({ days: [3, 3, -1, 'x', 2.5], eras: ['BAROQUE', '<b>', 7], countries: ['PT', 'usa', 'P'] })).toEqual({
      days: [3],
      eras: ['BAROQUE'],
      countries: ['PT'],
    })
    expect(sanitizeProgress('nope')).toEqual({ days: [], eras: [], countries: [] })
  })

  it('records the era and country of every reveal, and the day only for the Daily', () => {
    recordReveal({ era: 'BAROQUE', location: { countryCode: 'IT' } })
    recordReveal({ era: 'BAROQUE', location: { countryCode: 'PT' } }, 290)
    expect(readProgress()).toEqual({ days: [290], eras: ['BAROQUE'], countries: ['IT', 'PT'] })
  })

  it('counts the streak up to today, or up to yesterday while today is open', () => {
    expect(streakLength([285, 286, 287, 288, 289], 290)).toBe(5)
    expect(streakLength([285, 286, 287, 288, 289, 290], 290)).toBe(6)
    expect(streakLength([286, 288, 289], 290)).toBe(2)
    expect(streakLength([], 290)).toBe(0)
  })

  it('lists the last seven Dailies with their state', () => {
    expect(lastWeek([285, 290], 290).map((d) => d.state)).toEqual(['missed', 'done', 'missed', 'missed', 'missed', 'missed', 'done'])
    expect(lastWeek([], 290).at(-1)).toEqual({ number: 290, state: 'today' })
  })
})

describe('lastWeek with late days', () => {
  it('marks a day played afterwards as late, not done', () => {
    const week = lastWeek([289], 290, [288])
    expect(week.find((d) => d.number === 289).state).toBe('done')
    expect(week.find((d) => d.number === 288).state).toBe('late')
    expect(week.find((d) => d.number === 287).state).toBe('missed')
  })
})
