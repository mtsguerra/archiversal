import { beforeEach, describe, expect, it } from 'vitest'
import { claimSave, releaseSave, codeFromHash, exportSave, importSave } from './save.js'

const store = new Map()
globalThis.localStorage = {
  getItem: (k) => (store.has(k) ? store.get(k) : null),
  setItem: (k, v) => store.set(k, String(v)),
  removeItem: (k) => store.delete(k),
  clear: () => store.clear(),
}

const entry = { at: '2026-10-20', mode: 'normal', mastered: false, attempts: 2 }

describe('save code', () => {
  beforeEach(() => localStorage.clear())

  it('round-trips and merges without overwriting', () => {
    localStorage.setItem('archiversal:library', JSON.stringify({ a: entry, b: { ...entry, mastered: true } }))
    localStorage.setItem('archiversal:progress', JSON.stringify({ days: [3], eras: ['GOTHIC'], countries: ['FR'] }))
    const code = exportSave()
    localStorage.clear()
    localStorage.setItem('archiversal:library', JSON.stringify({ a: { ...entry, mastered: false }, c: entry }))
    expect(importSave(code)).toBe(1)
    const lib = JSON.parse(localStorage.getItem('archiversal:library'))
    expect(Object.keys(lib).sort()).toEqual(['a', 'b', 'c'])
    expect(JSON.parse(localStorage.getItem('archiversal:progress')).days).toEqual([3])
  })

  it('rejects garbage and drops bad entries', () => {
    expect(importSave('%%%')).toBeNull()
    expect(importSave(btoa(JSON.stringify({ v: 2 })))).toBeNull()
    const bad = btoa(JSON.stringify({ v: 1, library: { 'BAD ID': entry, ok: { at: 'x' } } }))
    expect(importSave(bad)).toBe(0)
    expect(JSON.parse(localStorage.getItem('archiversal:library'))).toEqual({})
  })

  it('reads the code from the hash', () => {
    expect(codeFromHash('#/import=abc')).toBe('abc')
    expect(codeFromHash('#/play')).toBeNull()
  })
})

describe('claimSave', () => {
  beforeEach(() => localStorage.clear())

  it('keeps guest progress for the first account and clears it for a different one', () => {
    localStorage.setItem('archiversal:library', JSON.stringify({ a: entry }))
    expect(claimSave('u1')).toBe(false)
    expect(localStorage.getItem('archiversal:library')).not.toBeNull()
    expect(claimSave('u1')).toBe(false)
    expect(claimSave('u2')).toBe(true)
    expect(localStorage.getItem('archiversal:library')).toBeNull()
  })
})

describe('releaseSave', () => {
  it('empties the device so the next player starts as a guest and merges into their own account', () => {
    localStorage.setItem('archiversal:library', JSON.stringify({ a: entry }))
    claimSave('u1')
    releaseSave()
    expect(localStorage.getItem('archiversal:library')).toBeNull()
    localStorage.setItem('archiversal:library', JSON.stringify({ b: entry })) // played as a guest afterwards
    expect(claimSave('u2')).toBe(false) // no owner any more: nothing is cleared, it joins u2
    expect(localStorage.getItem('archiversal:library')).not.toBeNull()
  })
})
