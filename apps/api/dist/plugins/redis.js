"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.redis = void 0;
exports.getCache = getCache;
exports.setCache = setCache;
const ioredis_1 = __importDefault(require("ioredis"));
const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379';
exports.redis = new ioredis_1.default(redisUrl, {
    maxRetriesPerRequest: 3,
    retryStrategy(times) {
        const delay = Math.min(times * 50, 2000);
        return delay;
    }
});
exports.redis.on('error', (err) => {
    console.warn('[REDIS ERROR] Wystąpił błąd połączenia z Redis. Fallback do PostgreSQL włączony.', err.message);
});
async function getCache(key) {
    try {
        const data = await exports.redis.get(key);
        return data ? JSON.parse(data) : null;
    }
    catch (error) {
        console.warn(`[REDIS WARN] Nie udało się odczytać klucza: ${key}.`, error);
        return null; // Zwracamy null na błędzie -> wymusi to fallback do Postgres
    }
}
async function setCache(key, value, ttlSeconds = 86400) {
    try {
        await exports.redis.set(key, JSON.stringify(value), 'EX', ttlSeconds);
    }
    catch (error) {
        console.warn(`[REDIS WARN] Nie udało się zapisać klucza: ${key}.`, error);
    }
}
