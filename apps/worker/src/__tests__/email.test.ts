import { describe, it, expect, beforeAll } from 'vitest'
import { sendEmail } from '../services/email.service'

describe('Email Service', () => {
  beforeAll(() => {
    // Gwarantujemy poprawne mapowanie sieci dla Mailhoga w teście
    process.env.SMTP_HOST = '127.0.0.1'
  })

  it.skip('Powinien wysłać e-mail powitalny/alert przez Mailhog (SMTP)', async () => {
    const info = await sendEmail(
      'tester@trackflow.local', 
      'Test Alertu', 
      'email-alert-no-clicks', 
      { shortCode: 'T3stcd', originalUrl: 'https://test.com' }
    )
    
    expect(info).toBeDefined()
    expect(info.messageId).toBeDefined()
    expect(info.response).toContain('250')
  })
})