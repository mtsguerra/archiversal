import { beforeEach, describe, expect, it } from 'vitest'
import { mergeSave } from '../game/save.js'
import { isProjectUrl, isPublicKey } from './client.js'
import { outgoing } from './sync.js'
import { inviteCodeFromHash, inviteFrom, roomFrom, usernameFrom, usernameProblem } from './username.js'
import { badgeHint, badgeName, eraOfBadge, togglePin } from './badges.js'
import { bundles } from '../strings/index.js'
import { challengeResult } from './challenges.js'
import { advanceSession, readSession } from '../game/custom.js'

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

describe('rooms of the profile plan', () => {
  it('reads the room from the hash and nothing else', () => {
    expect(roomFrom('#/profile')).toBe('hall')
    expect(roomFrom('#/friends')).toBe('salon')
    expect(roomFrom('#/profile/studio')).toBe('studio')
    expect(roomFrom('#/profile/hall')).toBeNull() // one address per room
    expect(roomFrom('#/profile/<script>')).toBeNull()
    expect(roomFrom('#/play')).toBeNull()
  })
})

describe('invite codes', () => {
  const code = '0123456789abcdef0123'
  it('are read from a link, a hash or alone, and from nothing else', () => {
    expect(inviteFrom(code)).toBe(code)
    expect(inviteFrom(` https://archiversal.vercel.app/#/invite/${code} `)).toBe(code)
    expect(inviteFrom('not a code')).toBeNull()
    expect(inviteCodeFromHash(`#/invite/${code}`)).toBe(code)
    expect(inviteCodeFromHash(`#/invite/${code}x`)).toBeNull()
    expect(inviteCodeFromHash('#/invite/<script>')).toBeNull()
  })
})

describe('badges', () => {
  it('names era badges from the era and the rest from the catalogue copy', () => {
    expect(eraOfBadge('era-art-nouveau')).toBe('ART_NOUVEAU')
    expect(eraOfBadge('first-sheet')).toBeNull()
    for (const lang of ['en', 'pt-BR']) {
      expect(badgeName(bundles[lang], 'era-baroque')).toContain(bundles[lang].eras.BAROQUE)
      expect(badgeHint(bundles[lang], 'era-baroque')).toContain(bundles[lang].eras.BAROQUE)
      expect(badgeName(bundles[lang], 'first-sheet')).toBe(bundles[lang].badges.names['first-sheet'])
    }
    expect(badgeName(bundles.en, 'unknown-badge')).toBe('unknown-badge')
  })

  it('pins at most three, only earned ones, and unpins', () => {
    const earned = ['a', 'b', 'c', 'd']
    expect(togglePin([], 'a', earned)).toEqual(['a'])
    expect(togglePin(['a'], 'a', earned)).toEqual([])
    expect(togglePin(['a', 'b', 'c'], 'd', earned)).toEqual(['a', 'b', 'c'])
    expect(togglePin([], 'x', earned)).toEqual([])
  })
})

describe('a challenge session', () => {
  const store = new Map()
  beforeEach(() => {
    store.clear()
    globalThis.sessionStorage = { getItem: (k) => store.get(k) ?? null, setItem: (k, v) => store.set(k, v) }
  })
  const building = (id) => ({ id, name: id, wikipedia: 'https://en.wikipedia.org/wiki/X' })
  const id = '0f8fad5b-d9cb-469f-a165-70867728950e'

  it('remembers which buildings were named and reports every one of the ten', () => {
    let session = { config: {}, ids: ['a', 'b', 'c'], index: 0, played: [], challenge: id }
    session = advanceSession(session, building('a'), true)
    advanceSession(session, building('b'), false)
    const saved = readSession()
    expect(saved.challenge).toBe(id)
    expect(challengeResult(saved)).toEqual({ a: true, b: false, c: false }) // c was never reached: not named
  })

  it('drops a challenge id that is not one, and a forged "named"', () => {
    store.set('archiversal:custom-session', JSON.stringify({ ids: ['a'], index: 1, challenge: '<script>', played: [{ ...building('a'), named: 'yes' }] }))
    const saved = readSession()
    expect(saved.challenge).toBeUndefined()
    expect(challengeResult(saved)).toEqual({ a: false })
  })
})
