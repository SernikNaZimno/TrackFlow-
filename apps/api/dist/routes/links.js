"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = linksRoutes;
const zod_1 = require("zod");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../plugins/redis");
const shortCode_1 = require("../utils/shortCode");
const postLinkSchema = zod_1.z.object({
    original_url: zod_1.z.string().url('Nieprawidłowy URL').max(2048),
    campaign_name: zod_1.z.string().max(255).nullable().optional(),
    client_id: zod_1.z.string().uuid().nullable().optional(),
    expires_at: zod_1.z.string().datetime().nullable().optional()
});
const patchLinkSchema = zod_1.z.object({
    campaign_name: zod_1.z.string().max(255).nullable().optional(),
    expires_at: zod_1.z.string().datetime().nullable().optional(),
    is_active: zod_1.z.boolean().optional()
});
async function linksRoutes(fastify) {
    // Wymagamy autentykacji we wszystkich endpointach tutaj
    fastify.addHook('preValidation', fastify.authenticate);
    // GET /api/links
    fastify.get('/api/links', async (request, reply) => {
        if (request.user.role !== 'marketer') {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Tylko marketerzy mogą listować wszystkie linki' });
        }
        const query = request.query;
        const page = parseInt(query.page || '1', 10);
        const limit = Math.min(parseInt(query.limit || '20', 10), 100);
        const search = query.search || '';
        const clientId = query.client_id || undefined;
        const activeOnly = query.active_only === 'true';
        const whereClause = {
            createdBy: request.user.sub,
            deletedAt: null
        };
        if (clientId)
            whereClause.clientId = clientId;
        if (activeOnly) {
            whereClause.isActive = true;
            whereClause.OR = [
                { expiresAt: null },
                { expiresAt: { gt: new Date() } }
            ];
        }
        if (search) {
            whereClause.OR = [
                { shortCode: { contains: search, mode: 'insensitive' } },
                { originalUrl: { contains: search, mode: 'insensitive' } }
            ];
        }
        const [total, links] = await Promise.all([
            prisma_1.prisma.link.count({ where: whereClause }),
            prisma_1.prisma.link.findMany({
                where: whereClause,
                skip: (page - 1) * limit,
                take: limit,
                orderBy: { createdAt: 'desc' },
                include: {
                    _count: { select: { clicks: true } }
                }
            })
        ]);
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        const data = links.map(link => ({
            id: link.id,
            short_code: link.shortCode,
            short_url: `${baseUrl}/${link.shortCode}`,
            original_url: link.originalUrl,
            campaign_name: link.campaignName,
            client_id: link.clientId,
            created_by: link.createdBy,
            expires_at: link.expiresAt,
            is_active: link.isActive,
            total_clicks: link._count.clicks,
            created_at: link.createdAt
        }));
        return reply.send({ data, total, page, limit });
    });
    // POST /api/links
    fastify.post('/api/links', async (request, reply) => {
        if (request.user.role !== 'marketer') {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Tylko marketerzy mogą tworzyć linki' });
        }
        const parsed = postLinkSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                code: 'VALIDATION_ERROR',
                message: 'Błąd walidacji',
                details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        const { original_url, campaign_name, client_id, expires_at } = parsed.data;
        if (client_id) {
            const clientUser = await prisma_1.prisma.user.findUnique({ where: { id: client_id } });
            if (!clientUser || clientUser.role !== 'client') {
                return reply.status(400).send({ code: 'VALIDATION_ERROR', message: 'Nieprawidłowy ID klienta' });
            }
        }
        let shortCode = '';
        let attempts = 0;
        let savedLink = null;
        // Generowanie z weryfikacją kolizji (do 3 prób)
        while (attempts < 3 && !savedLink) {
            shortCode = (0, shortCode_1.generateShortCode)();
            try {
                savedLink = await prisma_1.prisma.link.create({
                    data: {
                        shortCode,
                        originalUrl: original_url,
                        campaignName: campaign_name || null,
                        clientId: client_id || null,
                        createdBy: request.user.sub,
                        expiresAt: expires_at ? new Date(expires_at) : null
                    }
                });
            }
            catch (err) {
                if (err.code === 'P2002' && err.meta?.target?.includes('short_code')) {
                    // Kolizja short_code - spróbuj ponownie
                    attempts++;
                }
                else {
                    throw err;
                }
            }
        }
        if (!savedLink) {
            return reply.status(500).send({ code: 'INTERNAL_ERROR', message: 'Nie udało się wygenerować unikalnego short code po 3 próbach' });
        }
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return reply.status(201).send({
            id: savedLink.id,
            short_code: savedLink.shortCode,
            short_url: `${baseUrl}/${savedLink.shortCode}`,
            original_url: savedLink.originalUrl,
            campaign_name: savedLink.campaignName,
            client_id: savedLink.clientId,
            created_by: savedLink.createdBy,
            expires_at: savedLink.expiresAt,
            is_active: savedLink.isActive,
            total_clicks: 0,
            created_at: savedLink.createdAt
        });
    });
    // GET /api/links/:id
    fastify.get('/api/links/:id', async (request, reply) => {
        const { id } = request.params;
        const link = await prisma_1.prisma.link.findUnique({
            where: { id },
            include: { _count: { select: { clicks: true } } }
        });
        if (!link || link.deletedAt) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje' });
        }
        if (request.user.role === 'client' && link.clientId !== request.user.sub) {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Brak dostępu do tego linku' });
        }
        if (request.user.role === 'marketer' && link.createdBy !== request.user.sub) {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Brak dostępu do tego linku' });
        }
        const baseUrl = process.env.BASE_URL || 'http://localhost:3000';
        return reply.send({
            id: link.id,
            short_code: link.shortCode,
            short_url: `${baseUrl}/${link.shortCode}`,
            original_url: link.originalUrl,
            campaign_name: link.campaignName,
            client_id: link.clientId,
            created_by: link.createdBy,
            expires_at: link.expiresAt,
            is_active: link.isActive,
            total_clicks: link._count.clicks,
            created_at: link.createdAt
        });
    });
    // PATCH /api/links/:id
    fastify.patch('/api/links/:id', async (request, reply) => {
        if (request.user.role !== 'marketer') {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Tylko marketerzy mogą edytować linki' });
        }
        const { id } = request.params;
        const parsed = patchLinkSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                code: 'VALIDATION_ERROR',
                message: 'Błąd walidacji',
                details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        const link = await prisma_1.prisma.link.findUnique({ where: { id } });
        if (!link || link.deletedAt) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje' });
        }
        if (link.createdBy !== request.user.sub) {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Możesz edytować tylko swoje linki' });
        }
        const updatedLink = await prisma_1.prisma.link.update({
            where: { id },
            data: {
                campaignName: parsed.data.campaign_name !== undefined ? parsed.data.campaign_name : link.campaignName,
                expiresAt: parsed.data.expires_at !== undefined ? (parsed.data.expires_at ? new Date(parsed.data.expires_at) : null) : link.expiresAt,
                isActive: parsed.data.is_active !== undefined ? parsed.data.is_active : link.isActive
            }
        });
        // Inwalidacja w Redis!
        await redis_1.redis.del(`link:${link.shortCode}`).catch(() => { });
        return reply.send(updatedLink);
    });
    // DELETE /api/links/:id
    fastify.delete('/api/links/:id', async (request, reply) => {
        if (request.user.role !== 'marketer') {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Tylko marketerzy mogą usuwać linki' });
        }
        const { id } = request.params;
        const link = await prisma_1.prisma.link.findUnique({ where: { id } });
        if (!link || link.deletedAt) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Link nie istnieje' });
        }
        if (link.createdBy !== request.user.sub) {
            return reply.status(403).send({ code: 'FORBIDDEN', message: 'Możesz usunąć tylko swoje linki' });
        }
        // Soft delete
        await prisma_1.prisma.link.update({
            where: { id },
            data: { deletedAt: new Date() }
        });
        // Inwalidacja w Redis!
        await redis_1.redis.del(`link:${link.shortCode}`).catch(() => { });
        return reply.status(204).send();
    });
}
