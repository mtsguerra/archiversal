import { describe, expect, it } from 'vitest'
import { libraryIdFrom, routeFrom } from './route.js'

describe('routeFrom', () => {
  it('opens the game on #/play and the homepage otherwise', () => {
    expect(routeFrom('#/play')).toBe('play')
    expect(routeFrom('#/daily')).toBe('daily')
    expect(routeFrom('#/custom')).toBe('custom')
    expect(routeFrom('#/custom/play')).toBe('customPlay')
    expect(routeFrom('#/themed')).toBe('themed')
    expect(routeFrom('#/themed/play')).toBe('themedPlay')
    expect(routeFrom('#/library')).toBe('library')
    expect(routeFrom('#/library/villa-savoye')).toBe('libraryBuilding')
    expect(routeFrom('#/library/Bad Id')).toBe('home')
    expect(routeFrom('#/profile')).toBe('profile')
    expect(routeFrom('#/u/ana_b2')).toBe('user')
    expect(routeFrom('#/u/Not A Name')).toBe('home')
    expect(routeFrom('')).toBe('home')
    expect(routeFrom('#/')).toBe('home')
    expect(routeFrom('#/nope')).toBe('home')
  })

  it('reads the building id from a Library hash', () => {
    expect(libraryIdFrom('#/library/villa-savoye')).toBe('villa-savoye')
    expect(libraryIdFrom('#/library')).toBeNull()
    expect(libraryIdFrom('#/library/a/b')).toBeNull()
  })
})
