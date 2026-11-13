import { beforeEach, describe, expect, it } from 'vitest'
import { mergeSave } from '../game/save.js'
import { isProjectUrl, isPublicKey } from './client.js'
import { outgoing } from './sync.js'
import { usernameFrom, usernameProblem } from './username.js'

const jwt = (role) => `x.${btoa(JSON.stringify({ role }))}.y`

describe('which Supabase key may ship', () => {
  it('accepts only public keys', () => {
    expect(isPublicKey('sb_publishable_abc')).toBe(true)
    expect(isPublicKey(jwt('anon'))).toBe(true)
    expect(isPublicKey(jwt('service_role'))).toBe(false)
    expect(isPublicKey('sb_secret_abc')).toBe(false)
    expect(isPublicKey('')).toBe(false)
    expect(isPublicKey(undefined)).toBe(false)
  })

  it('accepts only a Supabase project address', () => {
    expect(isProjectUrl('https://abcdefghijklmnopqrst.supabase.co')).toBe(true)
    expect(isProjectUrl('https://evil.example.com')).toBe(false)
    expect(isProjectUrl('https://abcdefghijklmnopqrst.supabase.co.evil.com')).toBe(false)
    expect(isProjectUrl('http://127.0.0.1:54321')).toBe(false)
    expect(isProjectUrl('http://127.0.0.1:54321', true)).toBe(true)
  })
})

describe('usernames', () => {
  it('says what is wrong with the shape', () => {
    expect(usernameProblem('ab')).toBe('short')
    expect(usernameProblem('a'.repeat(21))).toBe('long')
    expect(usernameProblem('1abc')).toBe('start')
    expect(usernameProblem('Ana')).toBe('start')
    expect(usernameProblem('ana-b')).toBe('chars')
    expect(usernameProblem('ana b')).toBe('chars')
    expect(usernameProblem('ana_b2')).toBeNull()
  })

  it('reads a profile link and nothing else', () => {
    expect(usernameFrom('#/u/ana_b2')).toBe('ana_b2')
    expect(usernameFrom('#/u/Ana')).toBeNull()
    expect(usernameFrom('#/u/ana/../x')).toBeNull()
    expect(usernameFrom('#/u/<script>')).toBeNull()
  })
})

describe('merging the account into the browser', () => {
  const store = new Map()
  beforeEach(() => {
    store.clear()
    globalThis.localStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  })
  const unlock = (extra = {}) => ({ at: '2026-10-20', mode: 'normal', mastered: false, attempts: 1, ...extra })
  const library = () => JSON.parse(store.get('archiversal:library'))

  it('adds what the account has and keeps what the browser has', () => {
    store.set('archiversal:library', JSON.stringify({ here: unlock({ at: '2026-10-01' }) }))
    store.set('archiversal:progress', JSON.stringify({ days: [2], eras: ['BAROQUE'], countries: ['IT'] }))
    const added = mergeSave({ v: 1, library: { there: unlock(), here: unlock({ at: '2026-11-11', mastered: true }) }, progress: { days: [1], eras: ['GOTHIC'], countries: [] }, days: {} })
    expect(added).toBe(1)
    expect(library().here).toMatchObject({ at: '2026-10-01', mastered: true }) // first day kept, mastered gained
    expect(library().there).toBeTruthy()
    expect(JSON.parse(store.get('archiversal:progress')).days.sort()).toEqual([1, 2])
  })

  it('never lets the account take a mastered mark or a building away', () => {
    store.set('archiversal:library', JSON.stringify({ here: unlock({ mastered: true }) }))
    mergeSave({ v: 1, library: { here: unlock({ mastered: false }) }, progress: null, days: null })
    expect(library().here.mastered).toBe(true)
    mergeSave({ v: 1, library: {}, progress: null, days: null })
    expect(library().here).toBeTruthy()
  })

  it('ignores junk coming back', () => {
    mergeSave({ v: 1, library: { '<img>': unlock(), ok: { at: 'yesterday', mode: 'normal' } }, progress: { days: ['x'] }, days: { 1: { number: 2 } } })
    expect(library()).toEqual({})
    expect(JSON.parse(store.get('archiversal:daily-days'))).toEqual({})
  })

  it('sends only cleaned progress', () => {
    const sent = outgoing({ library: { '<img>': unlock(), fine: unlock() }, days: [1], progress: { days: [1, 'x'], eras: [], countries: [] } })
    expect(Object.keys(sent.library)).toEqual(['fine'])
    expect(sent.days).toEqual({})
    expect(sent.progress.days).toEqual([1])
  })
})
