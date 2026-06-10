import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import { prisma } from '../lib/prisma'

const statsQuerySchema = z.object({
  period: z.enum(['hour', 'day', 'week']).default('day').optional(),
  date_from: z.string().datetime().optional(),
  date_to: z.string().datetime().optional()
})

export default async function statsRoutes(fastify: FastifyInstance) {
  fastify.addHook('preValidation', fastify.authenticate)

  fastify.get('/api/links/:id/stats', async (request, reply) => {
    const { id } = request.params as { id: string }
    const parsedQuery = statsQuerySchema.safeParse(request.query)

    if (!parsedQuery.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Błąd walidacji parametrów zapytania',
        details: parsedQuery.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      })
    }

    const period = parsedQuery.data.period || 'day'
    // Domyślnie bierzemy dane do teraz i od 7 dni wstecz, jeśli nie podano inaczej
    const dateTo = parsedQuery.data.date_to ? new Date(parsedQuery.data.date_to) : new Date()
    const dateFrom = parsedQuery.data.date_from ? new Date(parsedQuery.data.date_from) : new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

    const link = await prisma.link.findUnique({ where: { id } })

    if (!link || link.deletedAt) {
      return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje' })
    }

    // Autoryzacja dostępu po rolach
    if (request.user.role === 'client' && link.clientId !== request.user.sub) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'Brak dostępu do statystyk tego linku' })
    }
    if (request.user.role === 'marketer' && link.createdBy !== request.user.sub) {
      return reply.status(403).send({ code: 'FORBIDDEN', message: 'Brak dostępu do statystyk tego linku' })
    }

    // Wykonanie wysoce zoptymalizowanych zapytań SQL do PostgreSQL
    // Rzutowanie na ::int zapobiega błędom serializacji BigInt w JSON z surowego COUNT
    const [totalAndUnique]: any = await prisma.$queryRaw`
      SELECT 
        COUNT(id)::int as total_clicks,
        COUNT(DISTINCT ip_hash)::int as unique_clicks
      FROM clicks 
      WHERE link_id = ${id}::uuid AND clicked_at >= ${dateFrom} AND clicked_at <= ${dateTo}
    `

    const clicksOverTime: any[] = await prisma.$queryRaw`
      SELECT 
        DATE_TRUNC(${period}, clicked_at) as timestamp,
        COUNT(id)::int as count
      FROM clicks 
      WHERE link_id = ${id}::uuid AND clicked_at >= ${dateFrom} AND clicked_at <= ${dateTo}
      GROUP BY timestamp
      ORDER BY timestamp ASC
    `

    const byCountry: any[] = await prisma.$queryRaw`
      SELECT 
        country,
        COUNT(id)::int as count
      FROM clicks 
      WHERE link_id = ${id}::uuid AND clicked_at >= ${dateFrom} AND clicked_at <= ${dateTo}
      GROUP BY country
      ORDER BY count DESC
      LIMIT 10
    `

    const byDevice: any[] = await prisma.$queryRaw`
      SELECT 
        device_type,
        COUNT(id)::int as count
      FROM clicks 
      WHERE link_id = ${id}::uuid AND clicked_at >= ${dateFrom} AND clicked_at <= ${dateTo}
      GROUP BY device_type
      ORDER BY count DESC
    `

    const byReferrer: any[] = await prisma.$queryRaw`
      SELECT 
        COALESCE(referrer, 'direct') as referrer,
        COUNT(id)::int as count
      FROM clicks 
      WHERE link_id = ${id}::uuid AND clicked_at >= ${dateFrom} AND clicked_at <= ${dateTo}
      GROUP BY COALESCE(referrer, 'direct')
      ORDER BY count DESC
      LIMIT 10
    `

    return reply.send({
      link_id: id,
      total_clicks: totalAndUnique?.total_clicks || 0,
      unique_clicks: totalAndUnique?.unique_clicks || 0,
      clicks_over_time: clicksOverTime.map(r => ({ timestamp: r.timestamp.toISOString(), count: r.count })),
      by_country: byCountry.map(r => ({ country: r.country, count: r.count })),
      by_device: byDevice.map(r => ({ device_type: r.device_type, count: r.count })),
      by_referrer: byReferrer.map(r => ({ referrer: r.referrer, count: r.count }))
    })
  })
}
