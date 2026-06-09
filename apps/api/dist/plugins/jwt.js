"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const fastify_plugin_1 = __importDefault(require("fastify-plugin"));
const jwt_1 = __importDefault(require("@fastify/jwt"));
exports.default = (0, fastify_plugin_1.default)(async function (fastify, opts) {
    fastify.register(jwt_1.default, {
        secret: process.env.JWT_SECRET || 'super_secret_dev_key_123',
        sign: {
            expiresIn: '24h'
        }
    });
    fastify.decorate('authenticate', async function (request, reply) {
        try {
            await request.jwtVerify();
        }
        catch (err) {
            reply.status(401).send({ code: 'UNAUTHORIZED', message: 'Brak lub nieważny token JWT' });
        }
    });
});
