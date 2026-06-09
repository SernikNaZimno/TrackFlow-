import amqp from 'amqplib'
import { prisma } from './lib/prisma'
import { handleClickRecorded } from './consumers/click.consumer'

async function start() {
  console.log('Uruchamianie Workera TrackFlow...')
  
  try {
    // 1. Podłączenie do RabbitMQ
    const rabbitUrl = process.env.RABBITMQ_URL || 'amqp://trackflow:trackflow@localhost:5672'
    const connection = await amqp.connect(rabbitUrl)
    const channel = await connection.createChannel()
    
    // 2. Deklaracja i podpięcie kolejek
    await channel.assertExchange('trackflow.events', 'topic', { durable: true })
    await channel.assertQueue('trackflow.clicks', { durable: true })
    await channel.bindQueue('trackflow.clicks', 'trackflow.events', 'click.recorded')

    // Wymuszamy pobieranie max 1 wiadomości naraz (prefetch)
    await channel.prefetch(1)

    // 3. Połączenie z bazą Prisma zostało już nawiązane podczas importu/pierwszego użycia
    await prisma.$connect()

    // 4. Uruchomienie konsumerów
    channel.consume('trackflow.clicks', (msg) => handleClickRecorded(msg, channel), { noAck: false })
    
    console.log('Worker nasłuchuje zdarzeń RabbitMQ. Gotowy do pracy.')
  } catch (error) {
    console.error('Krytyczny błąd podczas startu Workera:', error)
    process.exit(1)
  }
}

start()
