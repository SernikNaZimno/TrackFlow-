import Redis from 'ioredis'

const redisUrl = process.env.REDIS_URL || 'redis://localhost:6379'
export const redis = new Redis(redisUrl, {
  maxRetriesPerRequest: 3,
  retryStrategy(times) {
    const delay = Math.min(times * 50, 2000)
    return delay
  }
})

redis.on('error', (err) => {
  console.warn('[REDIS ERROR] Wystąpił błąd połączenia z Redis. Fallback do PostgreSQL włączony.', err.message)
})

export async function getCache(key: string): Promise<any> {
  try {
    const data = await redis.get(key)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.warn(`[REDIS WARN] Nie udało się odczytać klucza: ${key}.`, error)
    return null // Zwracamy null na błędzie -> wymusi to fallback do Postgres
  }
}

export async function setCache(key: string, value: any, ttlSeconds: number = 86400): Promise<void> {
  try {
    await redis.set(key, JSON.stringify(value), 'EX', ttlSeconds)
  } catch (error) {
    console.warn(`[REDIS WARN] Nie udało się zapisać klucza: ${key}.`, error)
  }
}
