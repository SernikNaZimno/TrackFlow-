import { describe, it, expect } from 'vitest'
import { geoLookup } from '../services/geo.service'

describe('geoLookup', () => {
  it('prywatny IP (192.168.x.x) -> { country: null, city: null }', () => {
    const result = geoLookup('192.168.1.100')
    expect(result).toEqual({ country: null, city: null })
  })

  it('publiczny IP -> zwraca country jako string', () => {
    const result = geoLookup('8.8.8.8') // Google DNS, USA
    expect(result.country).toBe('US')
  })

  it('null input -> { country: null, city: null }, nie rzuca wyjątku', () => {
    expect(() => geoLookup(null)).not.toThrow()
    expect(geoLookup(undefined)).toEqual({ country: null, city: null })
  })
})
