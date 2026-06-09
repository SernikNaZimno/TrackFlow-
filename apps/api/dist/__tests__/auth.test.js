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
const bcrypt = __importStar(require("bcrypt"));
const app_1 = require("../app");
const prisma_1 = require("../lib/prisma");
const app = (0, app_1.buildApp)();
(0, vitest_1.describe)('Auth Endpoints', () => {
    let testUserEmail = 'auth-test@test.com';
    let testPassword = 'testpassword123';
    let userId;
    (0, vitest_1.beforeAll)(async () => {
        await app.ready();
        const passwordHash = await bcrypt.hash(testPassword, 12);
        const user = await prisma_1.prisma.user.create({
            data: {
                email: testUserEmail,
                passwordHash,
                role: 'marketer'
            }
        });
        userId = user.id;
    });
    (0, vitest_1.afterAll)(async () => {
        await prisma_1.prisma.user.delete({ where: { id: userId } });
        await app.close();
        await prisma_1.prisma.$disconnect();
    });
    (0, vitest_1.it)('POST /auth/login - sukces zwraca token', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/auth/login')
            .send({ email: testUserEmail, password: testPassword });
        (0, vitest_1.expect)(response.status).toBe(200);
        (0, vitest_1.expect)(response.body).toHaveProperty('token');
        (0, vitest_1.expect)(response.body.user).toHaveProperty('email', testUserEmail);
        (0, vitest_1.expect)(response.body.user).toHaveProperty('role', 'marketer');
    });
    (0, vitest_1.it)('POST /auth/login - błąd przy złym haśle', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/auth/login')
            .send({ email: testUserEmail, password: 'wrongpassword' });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.code).toBe('INVALID_CREDENTIALS');
    });
    (0, vitest_1.it)('POST /auth/login - błąd walidacji (zły email format)', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/auth/login')
            .send({ email: 'not-an-email', password: 'asd' });
        (0, vitest_1.expect)(response.status).toBe(400);
        (0, vitest_1.expect)(response.body.code).toBe('VALIDATION_ERROR');
    });
    (0, vitest_1.it)('POST /auth/change-password - zablokowane bez tokenu', async () => {
        const response = await (0, supertest_1.default)(app.server)
            .post('/auth/change-password')
            .send({ current_password: testPassword, new_password: 'newpassword123' });
        (0, vitest_1.expect)(response.status).toBe(401);
        (0, vitest_1.expect)(response.body.code).toBe('UNAUTHORIZED');
    });
});
