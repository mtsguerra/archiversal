import { describe, expect, it } from 'vitest'
import { zoomFor } from './globe.js'

describe('zoomFor', () => {
  it('leaves a continent-sized country at 1 and magnifies a small one', () => {
    expect(zoomFor([[[-10, -40], [100, 60], [-10, 60]]])).toBe(1)
    expect(zoomFor([[[8, 47], [10, 47], [10, 48]]])).toBeGreaterThan(3)
    expect(zoomFor([])).toBe(1)
  })
})
