import { buildApp } from './app'
import { initRabbitMQ, closeRabbitMQ } from './plugins/rabbitmq'

const server = buildApp()

async function start() {
  try {
    await initRabbitMQ()
    await server.listen({ port: 3000, host: '0.0.0.0' })
    console.log(`Serwer API nasłuchuje na porcie 3000`)
  } catch (err) {
    server.log.error(err)
    process.exit(1)
  }
}

// Graceful shutdown
process.on('SIGTERM', async () => {
  await closeRabbitMQ()
  process.exit(0)
})

start()
