import { describe, expect, it } from 'vitest'
import { dailyId, dailyNumber, formatCountdown, msUntilNextDay, readDaily, shareText } from './daily.js'

const ids = ['a', 'b', 'c', 'd', 'e']

describe('daily', () => {
  it('numbers days from the launch day', () => {
    expect(dailyNumber(new Date(2026, 9, 16, 23, 59))).toBe(1)
    expect(dailyNumber(new Date(2026, 9, 17, 0, 1))).toBe(2)
    expect(dailyNumber(new Date(2026, 0, 1))).toBe(1)
  })

  it('picks the same building for the same day, whatever the id order', () => {
    expect(dailyId(ids, 7)).toBe(dailyId([...ids].reverse(), 7))
  })

  it('visits every building once per cycle', () => {
    const cycle = ids.map((_, i) => dailyId(ids, i + 1))
    expect(new Set(cycle).size).toBe(ids.length)
    expect(dailyId(ids, ids.length + 1)).toBe(cycle[0])
  })

  it('counts down to local midnight', () => {
    expect(msUntilNextDay(new Date(2026, 9, 16, 23, 0))).toBe(3_600_000)
    expect(formatCountdown(3_600_000)).toBe('01:00')
    expect(formatCountdown(3_600_001)).toBe('01:01')
  })

  it('shares the result without naming the building', () => {
    const fields = { name: 'correct', architect: 'wrong', country: 'correct', era: 'correct' }
    expect(shareText({ number: 3, fields, hintsUsed: 2, title: 'Daily', url: 'https://x.test' })).toBe(
      'Daily #3\n🏛️✅ 👤❌ 🌍✅ ⏳✅ · 💡2\nhttps://x.test',
    )
  })
})

describe('readDaily', () => {
  const store = {}
  globalThis.localStorage = { getItem: (k) => store[k] ?? null, setItem: (k, v) => (store[k] = v) }
  const good = { number: 5, id: 'a', outcome: 'solved', attempts: 1, hintsUsed: 0, fields: { name: 'correct', architect: 'correct', country: 'correct', era: 'correct' } }

  it('returns today\'s saved result and ignores another day', () => {
    store['archiversal:daily'] = JSON.stringify(good)
    expect(readDaily(5)).toEqual(good)
    expect(readDaily(6)).toBeNull()
  })

  it('ignores a damaged result', () => {
    store['archiversal:daily'] = JSON.stringify({ ...good, fields: { name: 'correct' } })
    expect(readDaily(5)).toBeNull()
    store['archiversal:daily'] = JSON.stringify({ ...good, outcome: '<script>' })
    expect(readDaily(5)).toBeNull()
    store['archiversal:daily'] = 'not json'
    expect(readDaily(5)).toBeNull()
  })
})

describe('earlier days', () => {
  it('keeps a late result apart from today and lists it as late', async () => {
    const store = new Map()
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, String(v)) }
    const { saveDaily, readLate, dailyNumber: today } = await import('./daily.js')
    const fields = { name: 'correct', architect: 'wrong', country: 'correct', era: 'correct' }
    saveDaily({ number: today() - 2, id: 'x', outcome: 'solved', fields, attempts: 1, hintsUsed: 0 })
    expect(readLate()).toEqual([today() - 2])
    expect(readDaily(today())).toBeNull()
    expect(readDaily(today() - 2).id).toBe('x')
  })
})
