import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { cors } from 'hono/cors'
import { logger } from 'hono/logger'
import { applicationsRouter } from './routes/applications'

const app = new Hono()

app.use('*', logger())
app.use('/api/*', cors({ origin: 'http://localhost:5173' }))

app.route('/api/applications', applicationsRouter)

app.get('/api/health', (c) => c.json({ ok: true }))

const PORT = 3001

serve({ fetch: app.fetch, port: PORT }, () => {
  console.log(`API server running on http://localhost:${PORT}`)
})
