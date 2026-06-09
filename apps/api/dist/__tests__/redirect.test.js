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
(0, vitest_1.describe)('Redirect KRYTYCZNY (GET /:short_code)', () => {
    let validLink;
    let expiredLink;
    let userId;
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
        const passwordHash = await bcrypt.hash('test1234', 10);
        const user = await prisma_1.prisma.user.create({
            data: { email: 'redirect@test.com', passwordHash, role: 'marketer' }
        });
        userId = user.id;
        validLink = await prisma_1.prisma.link.create({
            data: {
                shortCode: 'vA1iD',
                originalUrl: 'https://valid.com',
                createdBy: user.id
            }
        });
        expiredLink = await prisma_1.prisma.link.create({
            data: {
                shortCode: 'eXp1R',
                originalUrl: 'https://expired.com',
                createdBy: user.id,
                expiresAt: new Date(Date.now() - 86400000) // Wczoraj
            }
        });
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.link.deleteMany();
        await prisma_1.prisma.user.deleteMany();
        await redis_1.redis.quit(); // Wyczyszczenie socketów
        await app.close();
        await prisma_1.prisma.$disconnect();
    });
    (0, vitest_1.it)('MISS: Powinno pobrać z PG i zrobić 302, a potem zapisać do Redis', async () => {
        await redis_1.redis.del(`link:${validLink.shortCode}`); // Wymuszamy MISS
        const response = await (0, supertest_1.default)(app.server).get(`/${validLink.shortCode}`);
        (0, vitest_1.expect)(response.status).toBe(302);
        (0, vitest_1.expect)(response.header.location).toBe(validLink.originalUrl);
        const cache = await redis_1.redis.get(`link:${validLink.shortCode}`);
        (0, vitest_1.expect)(cache).not.toBeNull();
    });
    (0, vitest_1.it)('HIT: Powinno natychmiast zwrócić 302 z Redis', async () => {
        const start = performance.now();
        const response = await (0, supertest_1.default)(app.server).get(`/${validLink.shortCode}`);
        const end = performance.now();
        (0, vitest_1.expect)(response.status).toBe(302);
        (0, vitest_1.expect)(response.header.location).toBe(validLink.originalUrl);
        // Czas powinien być ultra krótki (w teście lokalnym na RAM cache <5ms)
        (0, vitest_1.expect)(end - start).toBeLessThan(50);
    });
    (0, vitest_1.it)('EXPIRED: Wygasły link zwraca 404', async () => {
        const response = await (0, supertest_1.default)(app.server).get(`/${expiredLink.shortCode}`);
        (0, vitest_1.expect)(response.status).toBe(404);
        (0, vitest_1.expect)(response.body.code).toBe('NOT_FOUND');
    });
    (0, vitest_1.it)('NOT FOUND: Błędny short_code zwraca 404', async () => {
        const response = await (0, supertest_1.default)(app.server).get(`/noEx1st`);
        (0, vitest_1.expect)(response.status).toBe(404);
        (0, vitest_1.expect)(response.body.code).toBe('NOT_FOUND');
    });
});
