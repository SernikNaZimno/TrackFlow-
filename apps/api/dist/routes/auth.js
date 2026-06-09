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
Object.defineProperty(exports, "__esModule", { value: true });
exports.default = authRoutes;
const zod_1 = require("zod");
const bcrypt = __importStar(require("bcrypt"));
const prisma_1 = require("../lib/prisma");
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email('Nieprawidłowy adres email'),
    password: zod_1.z.string().min(1, 'Hasło jest wymagane')
});
const changePasswordSchema = zod_1.z.object({
    current_password: zod_1.z.string().min(1, 'Aktualne hasło jest wymagane'),
    new_password: zod_1.z.string().min(8, 'Nowe hasło musi mieć minimum 8 znaków')
});
async function authRoutes(fastify) {
    // POST /auth/login
    fastify.post('/auth/login', async (request, reply) => {
        const parsed = loginSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                code: 'VALIDATION_ERROR',
                message: 'Błąd walidacji',
                details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        const { email, password } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { email } });
        if (!user) {
            return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy email lub hasło' });
        }
        const isMatch = await bcrypt.compare(password, user.passwordHash);
        if (!isMatch) {
            return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy email lub hasło' });
        }
        const token = fastify.jwt.sign({ sub: user.id, role: user.role });
        return reply.status(200).send({
            token,
            user: {
                id: user.id,
                email: user.email,
                role: user.role
            }
        });
    });
    // POST /auth/change-password
    fastify.post('/auth/change-password', { preValidation: [fastify.authenticate] }, async (request, reply) => {
        const parsed = changePasswordSchema.safeParse(request.body);
        if (!parsed.success) {
            return reply.status(400).send({
                code: 'VALIDATION_ERROR',
                message: 'Błąd walidacji',
                details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
            });
        }
        const userId = request.user.sub;
        const { current_password, new_password } = parsed.data;
        const user = await prisma_1.prisma.user.findUnique({ where: { id: userId } });
        if (!user) {
            return reply.status(404).send({ code: 'NOT_FOUND', message: 'Użytkownik nie znaleziony' });
        }
        const isMatch = await bcrypt.compare(current_password, user.passwordHash);
        if (!isMatch) {
            return reply.status(400).send({ code: 'INVALID_CREDENTIALS', message: 'Aktualne hasło jest nieprawidłowe' });
        }
        const newPasswordHash = await bcrypt.hash(new_password, 12);
        await prisma_1.prisma.user.update({
            where: { id: userId },
            data: { passwordHash: newPasswordHash }
        });
        return reply.status(200).send({ message: 'Hasło zmienione' });
    });
}
