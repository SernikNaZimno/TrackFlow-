import { describe, it, expect } from 'vitest'
import { parseUserAgent } from '../services/ua-parser.service'

describe('parseUserAgent', () => {
  it('iPhone UA -> device_type: mobile', () => {
    const result = parseUserAgent('Mozilla/5.0 (iPhone; CPU iPhone OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1')
    expect(result.device_type).toBe('mobile')
    expect(result.os).toContain('iOS')
  })

  it('iPad UA -> device_type: tablet', () => {
    const result = parseUserAgent('Mozilla/5.0 (iPad; CPU OS 16_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/16.6 Mobile/15E148 Safari/604.1')
    expect(result.device_type).toBe('tablet')
  })

  it('Chrome Desktop UA -> device_type: desktop', () => {
    const result = parseUserAgent('Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36')
    expect(result.device_type).toBe('desktop')
    expect(result.browser).toBe('Chrome')
  })

  it('pusty string -> zwraca nulls', () => {
    const result = parseUserAgent('')
    expect(result).toEqual({ device_type: null, browser: null, os: null })
  })

  it('null/undefined -> nie rzuca wyjątku', () => {
    expect(() => parseUserAgent(null)).not.toThrow()
    expect(parseUserAgent(undefined)).toEqual({ device_type: null, browser: null, os: null })
  })
})
