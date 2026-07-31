import { describe, it, expect } from 'vitest'
import {
  applicationsToCsv,
  parseCsv,
  parseApplicationsCsv,
  csvRecordToApplication,
  buildCsvTemplate,
} from './csv'
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

describe('parseCsv', () => {
  it('parses plain comma-separated rows', () => {
    expect(parseCsv('a,b,c\r\n1,2,3')).toEqual([
      ['a', 'b', 'c'],
      ['1', '2', '3'],
    ])
  })

  it('handles quoted fields with embedded commas, quotes, and newlines', () => {
    const text = 'Company,Notes\r\nAcme,"Said ""hi"", then\nfollowed up"'
    expect(parseCsv(text)).toEqual([
      ['Company', 'Notes'],
      ['Acme', 'Said "hi", then\nfollowed up'],
    ])
  })

  it('strips a leading UTF-8 BOM', () => {
    expect(parseCsv('﻿a,b\r\n1,2')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })

  it('drops trailing blank lines', () => {
    expect(parseCsv('a,b\r\n1,2\r\n\r\n')).toEqual([
      ['a', 'b'],
      ['1', '2'],
    ])
  })
})

describe('csvRecordToApplication', () => {
  const validRecord = {
    Company: 'Acme',
    Role: 'Engineer',
    Status: 'Interviewing',
    'Applied Date': '2026-01-01',
    'Last Updated': '2026-01-05',
    Source: 'Company Site',
    Location: 'Remote',
    'Work Mode': 'Remote',
    'Salary Min': '100000',
    'Salary Max': '150000',
    URL: 'https://acme.com/jobs/1',
    'Contact Name': 'Jane',
    Notes: 'Looks good',
  }

  it('maps a fully valid record with no warnings', () => {
    const { values, warnings } = csvRecordToApplication(validRecord)
    expect(warnings).toEqual([])
    expect(values).toEqual({
      company: 'Acme',
      role: 'Engineer',
      status: 'interviewing',
      appliedDate: '2026-01-01',
      lastUpdated: '2026-01-05',
      source: 'company_site',
      location: 'Remote',
      workMode: 'remote',
      salaryMin: 100000,
      salaryMax: 150000,
      url: 'https://acme.com/jobs/1',
      contactName: 'Jane',
      notes: 'Looks good',
    })
  })

  it('matches raw lowercase enum values as well as display labels', () => {
    const { values, warnings } = csvRecordToApplication({
      ...validRecord,
      Status: 'interviewing',
      Source: 'company_site',
    })
    expect(values.status).toBe('interviewing')
    expect(values.source).toBe('company_site')
    expect(warnings).toEqual([])
  })

  it('fills a placeholder and warns when company or role is missing', () => {
    const { values, warnings } = csvRecordToApplication({ ...validRecord, Company: '', Role: '' })
    expect(values.company).toBe('Unknown Company')
    expect(values.role).toBe('Unknown Role')
    expect(warnings).toContain('Missing company — filled with a placeholder')
    expect(warnings).toContain('Missing role — filled with a placeholder')
  })

  it('defaults status to applied and warns when missing or unrecognized', () => {
    const missing = csvRecordToApplication({ ...validRecord, Status: '' })
    expect(missing.values.status).toBe('applied')
    expect(missing.warnings).toContain('Missing status — set to Applied')

    const unrecognized = csvRecordToApplication({ ...validRecord, Status: 'Ghosted' })
    expect(unrecognized.values.status).toBe('applied')
    expect(unrecognized.warnings.some((w) => w.includes('Unrecognized status'))).toBe(true)
  })

  it('defaults appliedDate to today when missing or in the future', () => {
    const { values, warnings } = csvRecordToApplication({ ...validRecord, 'Applied Date': '2099-01-01' })
    expect(values.appliedDate).not.toBe('2099-01-01')
    expect(warnings.some((w) => w.includes('applied date'))).toBe(true)
  })

  it('drops lastUpdated when it predates appliedDate', () => {
    const { values, warnings } = csvRecordToApplication({
      ...validRecord,
      'Applied Date': '2026-01-15',
      'Last Updated': '2026-01-01',
    })
    expect(values.lastUpdated).toBeNull()
    expect(warnings.some((w) => w.includes('last updated'))).toBe(true)
  })

  it('drops an unparseable salary and warns', () => {
    const { values, warnings } = csvRecordToApplication({ ...validRecord, 'Salary Min': 'lots' })
    expect(values.salaryMin).toBeNull()
    expect(warnings.some((w) => w.includes('salary min'))).toBe(true)
  })

  it('drops both salaries and warns when min exceeds max', () => {
    const { values, warnings } = csvRecordToApplication({
      ...validRecord,
      'Salary Min': '200000',
      'Salary Max': '100000',
    })
    expect(values.salaryMin).toBeNull()
    expect(values.salaryMax).toBeNull()
    expect(warnings.some((w) => w.includes('greater than salary max'))).toBe(true)
  })

  it('drops a malformed URL and warns', () => {
    const { values, warnings } = csvRecordToApplication({ ...validRecord, URL: 'not-a-url' })
    expect(values.url).toBeNull()
    expect(warnings.some((w) => w.includes('Invalid URL'))).toBe(true)
  })

  it('leaves an unrecognized work mode blank and warns, but stays silent when blank to begin with', () => {
    const unrecognized = csvRecordToApplication({ ...validRecord, 'Work Mode': 'Space Station' })
    expect(unrecognized.values.workMode).toBeNull()
    expect(unrecognized.warnings.some((w) => w.includes('work mode'))).toBe(true)

    const blank = csvRecordToApplication({ ...validRecord, 'Work Mode': '' })
    expect(blank.values.workMode).toBeNull()
    expect(blank.warnings.some((w) => w.includes('work mode'))).toBe(false)
  })
})

describe('parseApplicationsCsv', () => {
  it('parses a header + multiple data rows into applications', () => {
    const csv = [
      'Company,Role,Status,Applied Date,Last Updated,Source,Location,Work Mode,Salary Min,Salary Max,URL,Contact Name,Notes',
      'Acme,Engineer,Applied,2026-01-01,,LinkedIn,,,,,,,',
      'Globex,Manager,Offer,2026-01-02,,Referral,,,,,,,',
    ].join('\r\n')

    const rows = parseApplicationsCsv(csv)
    expect(rows).toHaveLength(2)
    expect(rows[0].values.company).toBe('Acme')
    expect(rows[1].values.company).toBe('Globex')
  })

  it('round-trips the downloadable template with no warnings', () => {
    const rows = parseApplicationsCsv(buildCsvTemplate())
    expect(rows).toHaveLength(1)
    expect(rows[0].warnings).toEqual([])
  })
})
