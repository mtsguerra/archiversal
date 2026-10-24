import { beforeEach, describe, expect, it, vi } from 'vitest'

const makeStore = (entries = {}) => {
  const data = { ...entries }
  return new Proxy(
    {
      getItem: (k) => (k in data ? data[k] : null),
      setItem: (k, v) => {
        data[k] = String(v)
      },
      removeItem: (k) => {
        delete data[k]
      },
    },
    { ownKeys: () => Object.keys(data), getOwnPropertyDescriptor: (_, k) => (k in data ? { enumerable: true, configurable: true, value: data[k] } : undefined) },
  )
}

describe('migrateStorage', () => {
  beforeEach(() => vi.resetModules())

  it('moves old arch-guesser keys to archiversal in both storages, keeping newer values', async () => {
    const local = makeStore({ 'arch-guesser:library': '{"a":1}', 'arch-guesser:theme': 'dark', 'archiversal:theme': 'light', other: 'x' })
    const session = makeStore({ 'arch-guesser:seen': '["x"]' })
    vi.stubGlobal('window', { localStorage: local, sessionStorage: session })
    await import('./migrateStorage.js')
    expect(local.getItem('archiversal:library')).toBe('{"a":1}')
    expect(local.getItem('archiversal:theme')).toBe('light')
    expect(local.getItem('arch-guesser:library')).toBeNull()
    expect(local.getItem('arch-guesser:theme')).toBeNull()
    expect(local.getItem('other')).toBe('x')
    expect(session.getItem('archiversal:seen')).toBe('["x"]')
  })
})
