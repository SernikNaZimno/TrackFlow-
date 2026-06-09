"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = redirectRoutes;
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../plugins/redis");
const rabbitmq_1 = require("../plugins/rabbitmq");
async function redirectRoutes(fastify) {
    // Krytyczny endpoint GET /:short_code
    fastify.get('/:short_code', async (request, reply) => {
        const { short_code } = request.params;
        const cacheKey = `link:${short_code}`;
        let linkData = await (0, redis_1.getCache)(cacheKey);
        if (!linkData) {
            // MISS: Fallback do PostgreSQL
            const dbLink = await prisma_1.prisma.link.findUnique({
                where: { shortCode: short_code }
            });
            if (!dbLink || dbLink.deletedAt) {
                return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' });
            }
            linkData = {
                id: dbLink.id,
                original_url: dbLink.originalUrl,
                expires_at: dbLink.expiresAt ? dbLink.expiresAt.toISOString() : null,
                is_active: dbLink.isActive
            };
            // Asynchroniczny zapis do cache (nie blokujemy zwracania 302)
            await (0, redis_1.setCache)(cacheKey, linkData, 86400); // 24h TTL
        }
        // Walidacja statusu i czasu
        if (!linkData.is_active) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' });
        }
        if (linkData.expires_at && new Date(linkData.expires_at) < new Date()) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje lub wygasł' });
        }
        // Publikacja zdarzenia click w RabbitMQ (asynchronicznie, nie blokuje 302)
        (0, rabbitmq_1.publishEvent)('click.recorded', {
            link_id: linkData.id,
            clicked_at: new Date().toISOString(),
            country: request.headers['cf-ipcountry'],
            device_type: request.headers['user-agent']?.includes('Mobile') ? 'mobile' : 'desktop',
            browser: request.headers['user-agent'],
            referrer: request.headers['referer'],
            ip_hash: request.ip
        });
        // Zwracamy 302 (Temporary Redirect)
        return reply
            .status(302)
            .header('Location', linkData.original_url)
            .header('Cache-Control', 'no-cache')
            .send();
    });
}
