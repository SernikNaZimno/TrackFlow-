"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const vitest_1 = require("vitest");
const supertest_1 = __importDefault(require("supertest"));
const app_1 = require("../app");
const prisma_1 = require("../lib/prisma");
const redis_1 = require("../plugins/redis");
const bcrypt = __importStar(require("bcrypt"));
const app = (0, app_1.buildApp)();
(0, vitest_1.describe)('CRUD Linków', () => {
    let marketerToken;
    let clientToken;
    let marketerId;
    let linkId;
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
        const passwordHash = await bcrypt.hash('test1234', 10);
        const marketer = await prisma_1.prisma.user.create({
            data: { email: 'links-marketer@test.com', passwordHash, role: 'marketer' }
        });
        marketerId = marketer.id;
        const client = await prisma_1.prisma.user.create({
            data: { email: 'links-client@test.com', passwordHash, role: 'client' }
        });
        marketerToken = app.jwt.sign({ sub: marketer.id, role: marketer.role });
        clientToken = app.jwt.sign({ sub: client.id, role: client.role });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.link.deleteMany();
        await prisma_1.prisma.user.deleteMany();
        await redis_1.redis.quit();
        await app.close();
        await prisma_1.prisma.$disconnect();
    });
    (0, vitest_1.it)('POST /api/links - pozwala marketerowi stworzyć link', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/api/links')
            .set('Authorization', `Bearer ${marketerToken}`)
            .send({ original_url: 'https://jestesmy-super.pl', campaign_name: 'Test' });
        (0, vitest_1.expect)(response.status).toBe(201);
        (0, vitest_1.expect)(response.body).toHaveProperty('id');
        (0, vitest_1.expect)(response.body).toHaveProperty('short_code');
        (0, vitest_1.expect)(response.body.short_code.length).toBe(6);
        linkId = response.body.id;
    });
    (0, vitest_1.it)('POST /api/links - blokuje klienta (role client)', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/api/links')
            .set('Authorization', `Bearer ${clientToken}`)
            .send({ original_url: 'https://jestesmy-super.pl' });
        (0, vitest_1.expect)(response.status).toBe(403);
    });
    (0, vitest_1.it)('GET /api/links - pobiera zpaginowaną listę linków dla marketera', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .get('/api/links?page=1&limit=10')
            .set('Authorization', `Bearer ${marketerToken}`);
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.data).toBeInstanceOf(Array);
        (0, vitest_1.expect)(response.body.total).toBeGreaterThanOrEqual(1);
    });
    (0, vitest_1.it)('PATCH /api/links/:id - pozwala aktualizować link (np. is_active)', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .patch(`/api/links/${linkId}`)
            .set('Authorization', `Bearer ${marketerToken}`)
            .send({ is_active: false });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body.isActive).toBe(false);
    });
    (0, vitest_1.it)('DELETE /api/links/:id - wykonuje soft delete', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .delete(`/api/links/${linkId}`)
            .set('Authorization', `Bearer ${marketerToken}`);
        (0, vitest_1.expect)(response.status).toBe(204);
        // Weryfikacja soft delete
        const inDb = await prisma_1.prisma.link.findUnique({ where: { id: linkId } });
        (0, vitest_1.expect)(inDb?.deletedAt).not.toBeNull();
    });
});
