import { beforeEach, describe, expect, it, vi } from 'vitest'
import { readSeen, recordSeen } from './seenBuildings.js'

function memoryStorage() {
  const data = new Map()
  return {
    getItem: (k) => (data.has(k) ? data.get(k) : null),
    setItem: (k, v) => data.set(k, String(v)),
  }
}

describe('seen buildings', () => {
  beforeEach(() => vi.stubGlobal('sessionStorage', memoryStorage()))

  it('keeps only the last served building', () => {
    recordSeen('a')
    recordSeen('b')
    expect(readSeen()).toEqual(['b'])
  })

  it('survives broken or blocked storage', () => {
    vi.stubGlobal('sessionStorage', {
      getItem: () => '{not json',
      setItem: () => {
        throw new Error('blocked')
      },
    })
    expect(readSeen()).toEqual([])
    expect(() => recordSeen('a')).not.toThrow()
  })
})
