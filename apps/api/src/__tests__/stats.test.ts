import 'dotenv/config'
import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import * as crypto from 'crypto'
import { buildApp } from '../app'
import { prisma } from '../lib/prisma'
import { redis } from '../plugins/redis'
import * as bcrypt from 'bcrypt'

const app = buildApp()

describe('Statystyki Linków', () => {
  let marketerToken: string
  let clientToken: string
  let linkId: string

  beforeAll(async () => {
    await app.ready()
    const passwordHash = await bcrypt.hash('stats123', 10)
    
    const marketer = await prisma.user.create({
      data: { email: 'stats-marketer@test.com', passwordHash, role: 'marketer' }
    })
    
    const client = await prisma.user.create({
      data: { email: 'stats-client@test.com', passwordHash, role: 'client' }
    })

    marketerToken = app.jwt.sign({ sub: marketer.id, role: marketer.role })
    clientToken = app.jwt.sign({ sub: client.id, role: client.role })

    const link = await prisma.link.create({
      data: {
        shortCode: 'stA7s',
        originalUrl: 'https://stats.com',
        createdBy: marketer.id,
        clientId: client.id // Przypisane do naszego klienta
      }
    })
    linkId = link.id

    // Generowanie fałszywych kliknięć do statystyk
    await prisma.click.createMany({
      data: [
        {
          linkId,
          clickedAt: new Date(),
          country: 'PL',
          deviceType: 'mobile',
          referrer: 'facebook.com',
          ipHash: crypto.createHash('sha256').update('1.1.1.1').digest('hex'),
          eventId: crypto.randomUUID()
        },
        {
          linkId,
          clickedAt: new Date(Date.now() - 3600000), // godzina temu
          country: 'PL',
          deviceType: 'desktop',
          referrer: null, // "direct"
          ipHash: crypto.createHash('sha256').update('1.1.1.1').digest('hex'), // Ten sam user (ip_hash)
          eventId: crypto.randomUUID()
        },
        {
          linkId,
          clickedAt: new Date(Date.now() - 7200000), // 2 godziny temu
          country: 'US',
          deviceType: 'desktop',
          referrer: 'google.com',
          ipHash: crypto.createHash('sha256').update('8.8.8.8').digest('hex'), // Inny user
          eventId: crypto.randomUUID()
        }
      ]
    })
  })

  afterAll(async () => {
    await prisma.click.deleteMany()
    await prisma.link.deleteMany()
    await prisma.user.deleteMany()
    await redis.quit()
    await app.close()
    await prisma.$disconnect()
  })

  it('Pobiera zagregowane statystyki jako Marketer (total 3, unique 2)', async () => {
    const response = await supertest(app.server)
      .get(`/api/links/${linkId}/stats`)
      .set('Authorization', `Bearer ${marketerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.total_clicks).toBe(3)
    expect(response.body.unique_clicks).toBe(2)
    
    // Testowanie poprawnego rzutowania null -> 'direct' w referrerach
    const directReferrer = response.body.by_referrer.find((r: any) => r.referrer === 'direct')
    expect(directReferrer).toBeDefined()
    expect(directReferrer.count).toBe(1)

    const plCountry = response.body.by_country.find((c: any) => c.country === 'PL')
    expect(plCountry.count).toBe(2)
  })

  it('Pozwala Klientowi pobrać statystyki (ponieważ link jest mu przypisany)', async () => {
    const response = await supertest(app.server)
      .get(`/api/links/${linkId}/stats`)
      .set('Authorization', `Bearer ${clientToken}`)

    expect(response.status).toBe(200)
    expect(response.body.total_clicks).toBe(3)
  })

  it('Możliwość zmiany okresu (period=hour)', async () => {
    const response = await supertest(app.server)
      .get(`/api/links/${linkId}/stats?period=hour`)
      .set('Authorization', `Bearer ${marketerToken}`)

    expect(response.status).toBe(200)
    expect(response.body.clicks_over_time).toBeInstanceOf(Array)
    expect(response.body.clicks_over_time.length).toBeGreaterThan(0) 
  })
})