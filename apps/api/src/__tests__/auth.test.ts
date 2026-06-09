import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import supertest from 'supertest'
import * as bcrypt from 'bcrypt'
import { buildApp } from '../app'
import { prisma } from '../lib/prisma'

const app = buildApp()

describe('Auth Endpoints', () => {
  let testUserEmail = 'auth-test@test.com'
  let testPassword = 'testpassword123'
  let userId: string

  beforeAll(async () => {
    await app.ready()
    const passwordHash = await bcrypt.hash(testPassword, 12)
    const user = await prisma.user.create({
      data: {
        email: testUserEmail,
        passwordHash,
        role: 'marketer'
      }
    })
    userId = user.id
  })

  afterAll(async () => {
    await prisma.user.delete({ where: { id: userId } })
    await app.close()
    await prisma.$disconnect()
  })

  it('POST /auth/login - sukces zwraca token', async () => {
    const response = await supertest(app.server)
      .post('/auth/login')
      .send({ email: testUserEmail, password: testPassword })

    expect(response.status).toBe(200)
    expect(response.body).toHaveProperty('token')
    expect(response.body.user).toHaveProperty('email', testUserEmail)
    expect(response.body.user).toHaveProperty('role', 'marketer')
  })

  it('POST /auth/login - błąd przy złym haśle', async () => {
    const response = await supertest(app.server)
      .post('/auth/login')
      .send({ email: testUserEmail, password: 'wrongpassword' })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('INVALID_CREDENTIALS')
  })

  it('POST /auth/login - błąd walidacji (zły email format)', async () => {
    const response = await supertest(app.server)
      .post('/auth/login')
      .send({ email: 'not-an-email', password: 'asd' })

    expect(response.status).toBe(400)
    expect(response.body.code).toBe('VALIDATION_ERROR')
  })

  it('POST /auth/change-password - zablokowane bez tokenu', async () => {
    const response = await supertest(app.server)
      .post('/auth/change-password')
      .send({ current_password: testPassword, new_password: 'newpassword123' })

    expect(response.status).toBe(401)
    expect(response.body.code).toBe('UNAUTHORIZED')
  })
})
