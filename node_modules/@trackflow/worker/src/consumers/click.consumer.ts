import { ConsumeMessage } from 'amqplib'
import * as crypto from 'crypto'
import { prisma } from '../lib/prisma'
import { parseUserAgent } from '../services/ua-parser.service'
import { geoLookup } from '../services/geo.service'

export async function handleClickRecorded(msg: ConsumeMessage | null, channel: any) {
  if (!msg) return
  
  try {
    const content = JSON.parse(msg.content.toString())
    const { event_id, payload } = content
    
    // Idempotency check: upewniamy się, czy już nie przetworzyliśmy tego zdarzenia
    const exists = await prisma.click.findUnique({ where: { eventId: event_id } })
    if (exists) {
      channel.ack(msg)
      return
    }

    const { device_type, browser, os } = parseUserAgent(payload.browser)
    const { country, city } = geoLookup(payload.ip_hash)

    // RODO: Hashowanie IP z użyciem stałego saltu
    const ipSalt = process.env.IP_SALT || 'default_dev_salt_123'
    const ipHash = crypto.createHash('sha256').update((payload.ip_hash || '') + ipSalt).digest('hex')

    await prisma.click.create({
      data: {
        linkId: payload.link_id,
        clickedAt: new Date(payload.clicked_at),
        country,
        city,
        deviceType: device_type as 'mobile' | 'desktop' | 'tablet' | null,
        browser,
        os,
        referrer: payload.referrer,
        ipHash,
        eventId: event_id
      }
    })

    // Potwierdzenie przetworzenia DOPIERO po zapisie
    channel.ack(msg)
  } catch (error) {
    console.error('Błąd w click.consumer:', error)
    // Nack z requeue (true) aby spróbować ponownie
    channel.nack(msg, false, true)
  }
}
