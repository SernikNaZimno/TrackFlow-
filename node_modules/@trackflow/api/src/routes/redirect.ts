import { FastifyInstance } from 'fastify'
import { prisma } from '../lib/prisma'
import { getCache, setCache } from '../plugins/redis'
import { publishEvent } from '../plugins/rabbitmq'
import * as crypto from 'crypto'

interface CacheLink {
  id: string
  original_url: string
  expires_at: string | null
  is_active: boolean
}

export default async function redirectRoutes(fastify: FastifyInstance) {
  
  // Krytyczny endpoint GET /:short_code
  fastify.get('/:short_code', async (request, reply) => {
    const { short_code } = request.params as { short_code: string }
    const cacheKey = `link:${short_code}`

    let linkData: CacheLink | null = await getCache(cacheKey)

    if (!linkData) {
      // MISS: Fallback do PostgreSQL
      const dbLink = await prisma.link.findUnique({
        where: { shortCode: short_code }
      })

      if (!dbLink || dbLink.deletedAt) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' })
      }

      linkData = {
        id: dbLink.id,
        original_url: dbLink.originalUrl,
        expires_at: dbLink.expiresAt ? dbLink.expiresAt.toISOString() : null,
        is_active: dbLink.isActive
      }

      // Asynchroniczny zapis do cache (nie blokujemy zwracania 302)
      await setCache(cacheKey, linkData, 86400) // 24h TTL
    }

    // Walidacja statusu i czasu
    if (!linkData.is_active) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' })
    }

    if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' })
    }

    // Publikacja zdarzenia click w RabbitMQ (asynchronicznie, nie blokuje 302)
    publishEvent('click.recorded', {
      link_id: linkData.id,
      clicked_at: new Date().toISOString(),
      country: request.headers['cf-ipcountry'] as string | undefined,
      device_type: request.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
      browser: request.headers['user-agent'] as string | undefined,
      referrer: request.headers['referer'] as string | undefined,
      ip_hash: request.ip
    })

    // Zwracamy 302 (Temporary Redirect)
    return reply
      .status(302)
      .header('Location', linkData.original_url)
      .header('Cache-Control', 'no-cache')
      .send()
  })
}
