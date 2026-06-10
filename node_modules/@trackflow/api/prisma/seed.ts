import { PrismaClient } from '@prisma/client'
import * as bcrypt from 'bcrypt'
import * as crypto from 'crypto'

const prisma = new PrismaClient()

async function main() {
  console.log('Rozpoczynam seedowanie bazy danych...')

  // 1. Czyszczenie starych danych
  await prisma.click.deleteMany()
  await prisma.report.deleteMany()
  await prisma.link.deleteMany()
  await prisma.user.deleteMany()

  // 2. Tworzenie użytkowników
  const marketer = await prisma.user.create({
    data: {
      email: 'marketer@test.com',
      passwordHash: await bcrypt.hash('test123', 12),
      role: 'marketer',
    }
  })

  const client = await prisma.user.create({
    data: {
      email: 'client@test.com',
      passwordHash: await bcrypt.hash('test123', 12),
      role: 'client',
      agencyClientName: 'Firma Testowa Sp. z o.o.',
    }
  })

  // 3. Tworzenie linków z kampaniami
  const links = await Promise.all([
    { shortCode: 'xK9mP', originalUrl: 'https://example.com/landing-1', campaignName: 'Email Q1 2025' },
    { shortCode: 'aB3cD', originalUrl: 'https://example.com/landing-2', campaignName: 'Social Media Marzec' },
    { shortCode: 'zX7vW', originalUrl: 'https://google.com', campaignName: 'SEM Kampania' },
    { shortCode: 'mN5pQ', originalUrl: 'https://facebook.com', campaignName: null },
    { shortCode: 'rT2yU', originalUrl: 'https://instagram.com', campaignName: 'Instagram Stories' },
  ].map(link => prisma.link.create({
    data: { ...link, createdBy: marketer.id, clientId: client.id }
  })))

  // 4. Tworzenie 100 kliknięć z ostatnich 7 dni z różnymi danymi
  const countries = ['PL', 'DE', 'US', 'GB', 'FR']
  const devices   = ['mobile', 'desktop', 'tablet']
  const browsers  = ['Chrome', 'Safari', 'Firefox', 'Edge']
  const referrers = ['instagram.com', 'facebook.com', 'google.com', null]

  for (let i = 0; i < 100; i++) {
    const daysAgo = Math.floor(Math.random() * 7)
    const clickedAt = new Date()
    clickedAt.setDate(clickedAt.getDate() - daysAgo)

    await prisma.click.create({
      data: {
        linkId: links[Math.floor(Math.random() * links.length)].id,
        clickedAt,
        country: countries[Math.floor(Math.random() * countries.length)],
        city: ['Warszawa', 'Kraków', 'Gdańsk', 'Wrocław', 'Poznań'][Math.floor(Math.random() * 5)],
        deviceType: devices[Math.floor(Math.random() * devices.length)],
        browser: browsers[Math.floor(Math.random() * browsers.length)],
        os: ['Windows', 'macOS', 'Linux', 'iOS', 'Android'][Math.floor(Math.random() * 5)],
        referrer: referrers[Math.floor(Math.random() * referrers.length)],
        ipHash: crypto.createHash('sha256').update(Math.random().toString()).digest('hex'),
        eventId: crypto.randomUUID(),
      }
    })
  }

  console.log('✅ Seedowanie zakończone!')
  console.log(`📊 Dane:`)
  console.log(`   - Użytkownicy: 2`)
  console.log(`   - Linki: ${links.length}`)
  console.log(`   - Kliknięcia: 100`)
}

main()
  .catch(e => {
    console.error(e)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
