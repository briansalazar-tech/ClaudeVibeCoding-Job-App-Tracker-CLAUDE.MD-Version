import { describe, it, expect } from 'vitest'
import { applicationSchema } from './schemas'

const validBase = {
  company: 'Acme',
  role: 'Engineer',
  status: 'applied' as const,
  appliedDate: '2026-01-01',
  source: 'linkedin' as const,
}

describe('applicationSchema', () => {
  it('accepts a valid minimal input', () => {
    const result = applicationSchema.safeParse(validBase)
    expect(result.success).toBe(true)
  })

  it('rejects when salaryMin > salaryMax', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      salaryMin: 200000,
      salaryMax: 100000,
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const paths = result.error.errors.map((e) => e.path.join('.'))
      expect(paths).toContain('salaryMax')
    }
  })

  it('accepts when salaryMin === salaryMax', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      salaryMin: 100000,
      salaryMax: 100000,
    })
    expect(result.success).toBe(true)
  })

  it('rejects a future appliedDate', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      appliedDate: '2099-12-31',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message)
      expect(messages.some((m) => m.includes('future'))).toBe(true)
    }
  })

  it('rejects a malformed URL', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      url: 'not-a-valid-url',
    })
    expect(result.success).toBe(false)
    if (!result.success) {
      const messages = result.error.errors.map((e) => e.message)
      expect(messages.some((m) => m.toLowerCase().includes('url'))).toBe(true)
    }
  })

  it('accepts a valid URL', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      url: 'https://example.com/jobs/123',
    })
    expect(result.success).toBe(true)
  })

  it('accepts an empty string URL (converts to null)', () => {
    const result = applicationSchema.safeParse({
      ...validBase,
      url: '',
    })
    expect(result.success).toBe(true)
  })

  it('rejects missing company', () => {
    const result = applicationSchema.safeParse({ ...validBase, company: '' })
    expect(result.success).toBe(false)
  })

  it('rejects missing role', () => {
    const result = applicationSchema.safeParse({ ...validBase, role: '' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid status', () => {
    const result = applicationSchema.safeParse({ ...validBase, status: 'hired' })
    expect(result.success).toBe(false)
  })

  it('rejects invalid source', () => {
    const result = applicationSchema.safeParse({ ...validBase, source: 'twitter' })
    expect(result.success).toBe(false)
  })
})
