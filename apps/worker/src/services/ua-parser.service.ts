import { UAParser } from 'ua-parser-js'

export function parseUserAgent(uaString?: string | null) {
  if (!uaString) return { device_type: null, browser: null, os: null }
  
  try {
    const parser = new UAParser(uaString)
    const result = parser.getResult()
    
    let device_type = 'desktop'
    if (result.device.type === 'mobile') device_type = 'mobile'
    if (result.device.type === 'tablet') device_type = 'tablet'

    const browser = result.browser.name || null
    const os = result.os.name ? `${result.os.name} ${result.os.version || ''}`.trim() : null

    return { device_type, browser, os }
  } catch (error) {
    return { device_type: null, browser: null, os: null }
  }
}
