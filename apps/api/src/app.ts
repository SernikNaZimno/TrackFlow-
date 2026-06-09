import Fastify from 'fastify'
import jwtPlugin from './plugins/jwt'
import authRoutes from './routes/auth'
import linksRoutes from './routes/links'
import redirectRoutes from './routes/redirect'

export function buildApp() {
  const app = Fastify({
    logger: process.env.NODE_ENV === 'test' ? false : true,
    trustProxy: true
  })

  // Pluginy
  app.register(jwtPlugin)

  // Ścieżki
  app.register(authRoutes)
  app.register(linksRoutes)
  
  // Endpoint GET /:short_code powinien być ostatni w kolejności ładowania pluginów!
  app.register(redirectRoutes)

  return app
}
