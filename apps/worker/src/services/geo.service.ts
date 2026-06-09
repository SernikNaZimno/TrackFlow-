import geoip from 'geoip-lite'

export function geoLookup(ip?: string | null) {
  if (!ip) return { country: null, city: null }
  
  const geo = geoip.lookup(ip)
  if (!geo) return { country: null, city: null }
  
  return { 
    country: geo.country || null, 
    city: geo.city || null 
  }
}
