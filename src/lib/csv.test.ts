import { describe, it, expect } from 'vitest'
import { applicationsToCsv } from './csv'
import type { Application } from './schemas'

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    company: 'Test Co',
    role: 'Engineer',
    status: 'applied',
    appliedDate: '2026-01-01',
    lastUpdated: '2026-01-02',
    source: 'linkedin',
    location: null,
    workMode: null,
    salaryMin: null,
    salaryMax: null,
    url: null,
    contactName: null,
    notes: null,
    deletedAt: null,
    ...overrides,
  }
}

describe('applicationsToCsv', () => {
  it('returns just the header row for an empty array', () => {
    const csv = applicationsToCsv([])
    expect(csv).toBe(
      'Company,Role,Status,Applied Date,Last Updated,Source,Location,Work Mode,Salary Min,Salary Max,URL,Contact Name,Notes',
    )
  })

  it('renders human-readable labels for status, source, and work mode', () => {
    const csv = applicationsToCsv([
      makeApp({ status: 'interviewing', source: 'company_site', workMode: 'hybrid' }),
    ])
    const [, row] = csv.split('\r\n')
    expect(row).toContain('Interviewing')
    expect(row).toContain('Company Site')
    expect(row).toContain('Hybrid')
  })

  it('renders null fields as empty strings', () => {
    const csv = applicationsToCsv([makeApp()])
    const [, row] = csv.split('\r\n')
    expect(row).toBe('Test Co,Engineer,Applied,2026-01-01,2026-01-02,LinkedIn,,,,,,,')
  })

  it('quotes and escapes a field containing a comma', () => {
    const csv = applicationsToCsv([makeApp({ location: 'San Francisco, CA' })])
    const [, row] = csv.split('\r\n')
    expect(row).toContain('"San Francisco, CA"')
  })

  it('quotes and doubles embedded quotes', () => {
    const csv = applicationsToCsv([makeApp({ notes: 'Recruiter said "great fit"' })])
    const [, row] = csv.split('\r\n')
    expect(row).toContain('"Recruiter said ""great fit"""')
  })

  it('quotes a field containing a newline without splitting the row', () => {
    const csv = applicationsToCsv([makeApp({ notes: 'Line one\nLine two' })])
    // The row separator is \r\n; a bare \n inside a quoted field must not be mistaken for one
    const rows = csv.split('\r\n')
    expect(rows).toHaveLength(2)
    expect(rows[1]).toContain('"Line one\nLine two"')
  })

  it('includes raw salary numbers, not formatted currency', () => {
    const csv = applicationsToCsv([makeApp({ salaryMin: 120000, salaryMax: 150000 })])
    const [, row] = csv.split('\r\n')
    expect(row).toContain('120000,150000')
  })

  it('writes one row per application in order', () => {
    const csv = applicationsToCsv([
      makeApp({ company: 'Acme' }),
      makeApp({ company: 'Globex' }),
    ])
    const rows = csv.split('\r\n')
    expect(rows).toHaveLength(3)
    expect(rows[1]).toMatch(/^Acme,/)
    expect(rows[2]).toMatch(/^Globex,/)
  })
})
