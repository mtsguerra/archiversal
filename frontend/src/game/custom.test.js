import { describe, expect, it } from 'vitest'
import { advanceSession, emptyConfig, fieldsForConfig, facets, filterPool, pickedKeys, readSession, sanitizeConfig, shuffle } from './custom.js'

const catalogue = [
  { id: 'a', architects: ['Wright'], era: 'MODERNISM', countryCode: 'US' },
  { id: 'b', architects: ['Wright', 'Sullivan'], era: 'ART_NOUVEAU', countryCode: 'US' },
  { id: 'c', architects: ['Gaudí'], era: 'ART_NOUVEAU', countryCode: 'ES' },
  { id: 'd', architects: ['Siza'], era: 'MODERNISM', countryCode: 'PT' },
]
const ids = (config) => filterPool(catalogue, { ...emptyConfig, ...config }).map((b) => b.id)

describe('filterPool', () => {
  it('matches any picked architect, including co-architects', () => {
    expect(ids({ mode: 'architect', architects: ['Sullivan', 'Siza'] })).toEqual(['b', 'd'])
  })

  it('matches by era or by country alone', () => {
    expect(ids({ mode: 'era', eras: ['ART_NOUVEAU'] })).toEqual(['b', 'c'])
    expect(ids({ mode: 'country', countries: ['US', 'PT'] })).toEqual(['a', 'b', 'd'])
  })

  it('needs both a country and an era in countries + eras', () => {
    expect(ids({ mode: 'countryEra', countries: ['US'], eras: ['ART_NOUVEAU'] })).toEqual(['b'])
    expect(ids({ mode: 'countryEra', countries: ['US'] })).toEqual(['a', 'b'])
    expect(ids({ mode: 'countryEra' })).toEqual([])
  })

  it('ignores picks that belong to another mode', () => {
    expect(ids({ mode: 'era', architects: ['Wright'] })).toEqual([])
  })
})

describe('facets', () => {
  it('counts each architect once per building, most first', () => {
    const rows = facets(catalogue, (b) => b.architects, (k) => k)
    expect(rows[0]).toEqual({ key: 'Wright', label: 'Wright', count: 2 })
    expect(rows).toHaveLength(4)
  })
})

describe('session', () => {
  it('shuffles without losing or repeating an item', () => {
    expect(shuffle([1, 2, 3, 4, 5]).sort()).toEqual([1, 2, 3, 4, 5])
  })

  it('records the building played and moves on', () => {
    const next = advanceSession({ ids: ['a', 'b'], index: 0, played: [] }, { id: 'a', name: 'A', wikipedia: 'u' })
    expect(next).toMatchObject({ index: 1, played: [{ id: 'a', name: 'A', wikipedia: 'u' }] })
  })
})

describe('stored data is not trusted', () => {
  it('rebuilds a damaged config from known-good parts', () => {
    expect(sanitizeConfig({ mode: 'nope', architects: 'x', eras: [1, 'MODERNISM'], rounds: 99 })).toEqual({
      ...emptyConfig,
      eras: ['MODERNISM'],
    })
    expect(sanitizeConfig(null)).toEqual(emptyConfig)
    expect([3, 12, 50, 'all', 2, 51, 4.5, '7'].map((rounds) => sanitizeConfig({ rounds }).rounds)).toEqual([3, 12, 50, 'all', 10, 10, 10, 10])
  })
})

describe('a stored session is not trusted', () => {
  const store = {}
  globalThis.sessionStorage = {
    getItem: (k) => store[k] ?? null,
    setItem: (k, v) => (store[k] = v),
    removeItem: (k) => delete store[k],
  }
  const key = 'archiversal:custom-session'
  const session = (extra) => JSON.stringify({ config: emptyConfig, ids: ['a', 'b'], index: 0, played: [], ...extra })

  it('keeps only recap entries with a kebab-case id and an https link', () => {
    store[key] = session({
      played: [
        { id: 'villa-rotonda', name: 'Villa Rotonda', wikipedia: 'https://en.wikipedia.org/wiki/Villa_Rotonda' },
        { id: 'x', name: 'Bad link', wikipedia: 'javascript:alert(1)' },
        { id: '../etc', name: 'Bad id', wikipedia: 'https://example.com' },
      ],
    })
    expect(readSession().played.map((p) => p.id)).toEqual(['villa-rotonda'])
  })

  it('rejects a session whose ids are not plain ids or whose index is not a number', () => {
    store[key] = session({ ids: ['ok', '../../secret'] })
    expect(readSession()).toBeNull()
    store[key] = session({ index: 'one' })
    expect(readSession()).toBeNull()
  })
})

describe('pickedKeys', () => {
  it('lists the picks that matter for the chosen mode, in the order the setup shows them', () => {
    const config = { ...emptyConfig, architects: ['Siza'], eras: ['BAROQUE'], countries: ['PT', 'ES'] }
    expect(pickedKeys({ ...config, mode: 'architect' })).toEqual([{ kind: 'architects', key: 'Siza' }])
    expect(pickedKeys({ ...config, mode: 'countryEra' }).map((p) => p.key)).toEqual(['PT', 'ES', 'BAROQUE'])
    expect(pickedKeys({ ...emptyConfig })).toEqual([])
  })
})

describe('fieldsForConfig', () => {
  const base = { ...emptyConfig, architects: [], eras: [], countries: [] }
  it('asks everything while a filter has several picks', () => {
    expect(fieldsForConfig({ ...base, mode: 'architect', architects: ['a', 'b'] })).toEqual(['name', 'architect', 'country', 'era'])
  })
  it('drops the field a single pick already gives away', () => {
    expect(fieldsForConfig({ ...base, mode: 'architect', architects: ['a'] })).toEqual(['name', 'country', 'era'])
    expect(fieldsForConfig({ ...base, mode: 'country', countries: ['PT'] })).toEqual(['name', 'architect', 'era'])
    expect(fieldsForConfig({ ...base, mode: 'era', eras: ['GOTHIC'] })).toEqual(['name', 'architect', 'country'])
  })
  it('judges country and era separately in country + era', () => {
    expect(fieldsForConfig({ ...base, mode: 'countryEra', countries: ['PT'], eras: ['A', 'B'] })).toEqual(['name', 'architect', 'era'])
    expect(fieldsForConfig({ ...base, mode: 'countryEra', countries: ['PT'], eras: ['A'] })).toEqual(['name', 'architect'])
  })
})
