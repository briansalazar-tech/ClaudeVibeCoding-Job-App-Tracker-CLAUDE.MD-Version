import { Hono } from 'hono'
import { zValidator } from '@hono/zod-validator'
import { z } from 'zod'
import { applicationService } from '../services/applicationService'
import { applicationSchema, STATUS_VALUES } from '../../lib/schemas'

export const applicationsRouter = new Hono()
  .get('/', (c) => {
    const apps = applicationService.getAll()
    return c.json(apps)
  })
  .post('/', zValidator('json', applicationSchema), (c) => {
    const data = c.req.valid('json')
    const created = applicationService.create(data)
    return c.json(created, 201)
  })
  .post(
    '/import',
    zValidator('json', z.object({ applications: z.array(applicationSchema) })),
    (c) => {
      const { applications } = c.req.valid('json')
      const created = applicationService.createMany(applications)
      return c.json({ created }, 201)
    },
  )
  .get('/:id', (c) => {
    const id = c.req.param('id')
    const app = applicationService.getById(id)
    if (!app) return c.json({ error: 'Not found' }, 404)
    return c.json(app)
  })
  .put('/:id', zValidator('json', applicationSchema), (c) => {
    const id = c.req.param('id')
    const data = c.req.valid('json')
    const updated = applicationService.update(id, data)
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .patch('/:id/status', zValidator('json', z.object({ status: z.enum(STATUS_VALUES) })), (c) => {
    const id = c.req.param('id')
    const { status } = c.req.valid('json')
    const updated = applicationService.update(id, { status })
    if (!updated) return c.json({ error: 'Not found' }, 404)
    return c.json(updated)
  })
  .delete('/:id', (c) => {
    const id = c.req.param('id')
    applicationService.softDelete(id)
    return c.body(null, 204)
  })
