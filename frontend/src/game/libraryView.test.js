import { describe, expect, it } from 'vitest'
import { collectionProgress, compareFacts, completedEra, distanceKm, eraFacts, eraProgress, groupRows, joinRows, libraryStats, neighbourEras, passes, pickLocked } from './libraryView.js'

const rows = [
  { id: 'b-villa', name: 'Villa Savoye', architects: ['Le Corbusier'], era: 'MODERNISM', yearCompleted: 1931, countryCode: 'FR', country: 'France' },
  { id: 'a-pantheon', name: 'Pantheon', architects: ['Apollodorus of Damascus'], era: 'CLASSICAL', yearCompleted: 126, countryCode: 'IT', country: 'Italy' },
  { id: 'c-unite', name: 'Unité d’Habitation', architects: ['Le Corbusier'], era: 'BRUTALISM', yearCompleted: 1952, countryCode: 'FR', country: 'France' },
  { id: 'd-parthenon', name: 'Parthenon', architects: ['Iktinos'], era: 'CLASSICAL', yearCompleted: -432, countryCode: 'GR', country: 'Greece' },
]
const unlocks = {
  'b-villa': { at: '2026-10-24', mode: 'normal', mastered: true, attempts: 1 },
  'd-parthenon': { at: '2026-10-20', mode: 'daily', mastered: false, attempts: 3 },
}
const joined = joinRows(rows, unlocks)
const eraOrder = ['CLASSICAL', 'MODERNISM', 'BRUTALISM']

describe('libraryView', () => {
  it('numbers the sheets by id order and marks the unlocked ones', () => {
    expect(joined.map((r) => [r.id, r.no, r.open, r.mastered])).toEqual([
      ['b-villa', 'A-102', true, true],
      ['a-pantheon', 'A-101', false, false],
      ['c-unite', 'A-103', false, false],
      ['d-parthenon', 'A-104', true, false],
    ])
  })

  it('never lets a name or country search match a locked building', () => {
    const found = (f) => joined.filter((r) => passes(r, f)).map((r) => r.id)
    expect(found({ query: 'corbusier' })).toEqual(['b-villa'])
    expect(found({ query: 'pantheon' })).toEqual([])
    expect(found({ country: 'FR' })).toEqual(['b-villa'])
    expect(found({ era: 'CLASSICAL' })).toEqual(['a-pantheon', 'd-parthenon'])
    expect(found({ show: 'locked' })).toEqual(['a-pantheon', 'c-unite'])
    expect(found({ show: 'mastered' })).toEqual(['b-villa'])
  })

  it('matches accents and every word of the query', () => {
    expect(passes(joined[3], { query: 'iktínos parthen' })).toBe(true)
    expect(passes(joined[3], { query: 'iktinos louvre' })).toBe(false)
  })

  it('groups by era in the given order, unlocked first', () => {
    const groups = groupRows(joined, 'era', eraOrder)
    expect(groups.map((g) => g.key)).toEqual(['CLASSICAL', 'MODERNISM', 'BRUTALISM'])
    expect(groups[0].items.map((r) => r.id)).toEqual(['d-parthenon', 'a-pantheon'])
  })

  it('groups by century and country from the unlocked buildings only', () => {
    expect(groupRows(joined, 'century', eraOrder).map((g) => [g.key, g.items.length])).toEqual([[-5, 1], [20, 1], ['~', 2]])
    expect(groupRows(joined, 'country', eraOrder).map((g) => [g.key, g.items.length])).toEqual([['FR', 1], ['GR', 1], ['~', 2]])
  })

  it('counts the figures of the strip', () => {
    expect(libraryStats(joined)).toEqual({ total: 4, discovered: 2, mastered: 1, erasComplete: 1, erasTotal: 3, countries: 2, countriesTotal: 3, oldest: -432 })
    expect(libraryStats([]).oldest).toBeNull()
  })

  it('lists the styles the game calls close, only those in the collection', () => {
    expect(neighbourEras('MODERNISM', ['BRUTALISM', 'ART_DECO', 'CLASSICAL']).sort()).toEqual(['ART_DECO', 'BRUTALISM'])
    expect(neighbourEras('CLASSICAL', ['MODERNISM'])).toEqual([])
  })

  it('measures the distance between countries, and says nothing about an unknown one', () => {
    expect(distanceKm('FR', 'FR')).toBe(0)
    expect(distanceKm('FR', 'GR')).toBeGreaterThan(1500)
    expect(distanceKm('FR', 'GR')).toBeLessThan(2500)
    expect(distanceKm('FR', 'XX')).toBeNull()
  })

  it('picks only a locked building, from the era when one is given', () => {
    expect(pickLocked(joined, '', () => 0)).toBe('a-pantheon')
    expect(pickLocked(joined, 'BRUTALISM', () => 0.9)).toBe('c-unite')
    expect(pickLocked(joined, 'MODERNISM')).toBeNull()
  })

  it('compares two buildings', () => {
    expect(compareFacts(rows[0], rows[2])).toEqual({ yearsApart: 21, km: 0, sameEra: false, sameCountry: true, sameArchitect: true })
    expect(compareFacts(rows[1], rows[3]).yearsApart).toBe(558)
  })

  it('names the era a reveal has just completed, and only on the first reveal', () => {
    const catalogue = rows.map(({ id, era }) => ({ id, era }))
    const before = { 'd-parthenon': {} }
    const after = { 'd-parthenon': {}, 'a-pantheon': {} }
    expect(completedEra(catalogue, before, after, 'a-pantheon')).toBe('CLASSICAL')
    expect(completedEra(catalogue, after, after, 'a-pantheon')).toBeNull() // already unlocked
    expect(completedEra(catalogue, {}, { 'd-parthenon': {} }, 'd-parthenon')).toBeNull() // the era still has a locked one
    expect(completedEra(catalogue, {}, after, 'nope')).toBeNull()
  })

  it('reports each era complete only when all of its buildings are unlocked', () => {
    expect(eraProgress(joined)).toEqual({
      MODERNISM: { total: 1, open: 1, complete: true },
      CLASSICAL: { total: 2, open: 1, complete: false },
      BRUTALISM: { total: 1, open: 0, complete: false },
    })
  })
})

describe('reading list, features and collections', () => {
  const rows = [
    { id: 'a', era: 'X', open: true, mastered: false, name: 'Alpha Dome', architects: [], country: 'Italy', countryCode: 'IT', features: ['dome'] },
    { id: 'b', era: 'X', open: false, mastered: false, name: 'Beta', architects: [], country: 'Italy', countryCode: 'IT', features: ['dome'] },
    { id: 'c', era: 'Y', open: false, mastered: false, name: 'Gamma', architects: [], country: 'France', countryCode: 'FR', features: [] },
  ]
  it('feature search never matches a locked building', () => {
    expect(rows.filter((r) => passes(r, { feature: 'dome' })).map((r) => r.id)).toEqual(['a'])
  })
  it('the reading list shows only locked buildings that were bookmarked', () => {
    expect(rows.filter((r) => passes(r, { show: 'reading', reading: ['a', 'c'] })).map((r) => r.id)).toEqual(['c'])
  })
  it('Play a locked one prefers the reading list', () => {
    expect(pickLocked(rows, '', () => 0, ['c'])).toBe('c')
    expect(pickLocked(rows, '', () => 0, [])).toBe('b')
  })
  it('collections count only, and skip single-building ones', () => {
    const p = collectionProgress(rows, { a: ['t1'], b: ['t1'], c: ['t2'] })
    expect(p).toEqual({ t1: { total: 2, open: 1, complete: false } })
  })
  it('era facts come from unlocked buildings only', () => {
    const open = [{ ...rows[0], yearCompleted: 1500 }, { ...rows[1], yearCompleted: 100 }]
    expect(eraFacts(open, 'X')).toMatchObject({ total: 2, open: 1, from: 1500, to: 1500, features: [['dome', 1]] })
  })
})
