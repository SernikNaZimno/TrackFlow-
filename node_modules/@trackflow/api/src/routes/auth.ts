import { FastifyInstance } from 'fastify'
import { z } from 'zod'
import * as bcrypt from 'bcrypt'
import { prisma } from '../lib/prisma'

const loginSchema = z.object({
  email: z.string().email('Nieprawidłowy adres email'),
  password: z.string().min(1, 'Hasło jest wymagane')
})

const changePasswordSchema = z.object({
  current_password: z.string().min(1, 'Aktualne hasło jest wymagane'),
  new_password: z.string().min(8, 'Nowe hasło musi mieć minimum 8 znaków')
})

export default async function authRoutes(fastify: FastifyInstance) {
  
  // POST /auth/login
  fastify.post('/auth/login', async (request, reply) => {
    const parsed = loginSchema.safeParse(request.body)
    
    if (!parsed.success) {
      return reply.status(400).send({
        code: 'VALIDATION_ERROR',
        message: 'Błąd walidacji',
        details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
      })
    }

    const { email, password } = parsed.data

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user) {
      return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy email lub hasło' })
    }

    const isMatch = await bcrypt.compare(password, user.passwordHash)
    if (!isMatch) {
      return reply.status(401).send({ code: 'INVALID_CREDENTIALS', message: 'Nieprawidłowy email lub hasło' })
    }

    const token = fastify.jwt.sign({ sub: user.id, role: user.role })

    return reply.status(200).send({
      token,
      user: {
        id: user.id,
        email: user.email,
        role: user.role
      }
    })
  })

  // POST /auth/change-password
  fastify.post(
    '/auth/change-password',
    { preValidation: [fastify.authenticate] },
    async (request, reply) => {
      const parsed = changePasswordSchema.safeParse(request.body)
      
      if (!parsed.success) {
        return reply.status(400).send({
          code: 'VALIDATION_ERROR',
          message: 'Błąd walidacji',
          details: parsed.error.errors.map(e => ({ field: e.path.join('.'), message: e.message }))
        })
      }

      const userId = request.user.sub
      const { current_password, new_password } = parsed.data

      const user = await prisma.user.findUnique({ where: { id: userId } })
      if (!user) {
        return reply.status(404).send({ code: 'NOT_FOUND', message: 'Użytkownik nie znaleziony' })
      }

      const isMatch = await bcrypt.compare(current_password, user.passwordHash)
      if (!isMatch) {
        return reply.status(400).send({ code: 'INVALID_CREDENTIALS', message: 'Aktualne hasło jest nieprawidłowe' })
      }

      const newPasswordHash = await bcrypt.hash(new_password, 12)
      await prisma.user.update({
        where: { id: userId },
        data: { passwordHash: newPasswordHash }
      })

      return reply.status(200).send({ message: 'Hasło zmienione' })
    }
  )
}
