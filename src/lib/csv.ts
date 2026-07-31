import {
  STATUS_VALUES,
  STATUS_LABELS,
  SOURCE_VALUES,
  SOURCE_LABELS,
  WORK_MODE_VALUES,
  WORK_MODE_LABELS,
  type Application,
  type ApplicationFormValues,
  type Status,
  type Source,
  type WorkMode,
} from './schemas'
import { isoToday } from './format'

const CSV_COLUMNS = [
  'Company',
  'Role',
  'Status',
  'Applied Date',
  'Last Updated',
  'Source',
  'Location',
  'Work Mode',
  'Salary Min',
  'Salary Max',
  'Salary Requirement',
  'Cover Letter Submitted',
  'URL',
  'Contact Name',
  'Notes',
]

function escapeCsvField(value: string): string {
  return /[",\r\n]/.test(value) ? `"${value.replace(/"/g, '""')}"` : value
}

function applicationToRow(app: Application): string[] {
  return [
    app.company,
    app.role,
    STATUS_LABELS[app.status] ?? app.status,
    app.appliedDate,
    app.lastUpdated,
    SOURCE_LABELS[app.source] ?? app.source,
    app.location ?? '',
    app.workMode ? (WORK_MODE_LABELS[app.workMode] ?? app.workMode) : '',
    app.salaryMin != null ? String(app.salaryMin) : '',
    app.salaryMax != null ? String(app.salaryMax) : '',
    app.salaryRequirement != null ? String(app.salaryRequirement) : '',
    app.coverLetterSubmitted ? 'Yes' : 'No',
    app.url ?? '',
    app.contactName ?? '',
    app.notes ?? '',
  ]
}

export function applicationsToCsv(applications: Application[]): string {
  const rows = [CSV_COLUMNS, ...applications.map(applicationToRow)]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

const TEMPLATE_EXAMPLE_ROW = [
  'Acme Corp',
  'Software Engineer',
  'Applied',
  '2026-01-15',
  '2026-01-15',
  'LinkedIn',
  'San Francisco, CA',
  'Remote',
  '120000',
  '160000',
  '150000',
  'Yes',
  'https://acme.com/jobs/123',
  'Jane Doe',
  'Found through a recruiter reach-out',
]

// A starter file for the Import CSV dialog — same columns as the export, plus one filled-out
// example row so the expected format (dates, status/source/work-mode labels) is self-evident.
export function buildCsvTemplate(): string {
  const rows = [CSV_COLUMNS, TEMPLATE_EXAMPLE_ROW]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}

// RFC4180-ish parser: handles quoted fields containing commas, quotes ("" escape), and newlines.
export function parseCsv(text: string): string[][] {
  const src = text.startsWith('﻿') ? text.slice(1) : text
  const rows: string[][] = []
  let row: string[] = []
  let field = ''
  let inQuotes = false

  for (let i = 0; i < src.length; i++) {
    const char = src[i]
    if (inQuotes) {
      if (char === '"') {
        if (src[i + 1] === '"') {
          field += '"'
          i++
        } else {
          inQuotes = false
        }
      } else {
        field += char
      }
    } else if (char === '"') {
      inQuotes = true
    } else if (char === ',') {
      row.push(field)
      field = ''
    } else if (char === '\r') {
      // skip — the row terminates on the \n that follows (or end of input)
    } else if (char === '\n') {
      row.push(field)
      rows.push(row)
      row = []
      field = ''
    } else {
      field += char
    }
  }
  if (field.length > 0 || row.length > 0) {
    row.push(field)
    rows.push(row)
  }

  return rows.filter((r) => !(r.length === 1 && r[0].trim() === ''))
}

function recordsFromRows(rows: string[][]): Record<string, string>[] {
  if (rows.length === 0) return []
  const [header, ...dataRows] = rows
  return dataRows
    .filter((r) => r.some((cell) => cell.trim() !== ''))
    .map((r) => {
      const record: Record<string, string> = {}
      header.forEach((col, i) => {
        record[col.trim()] = (r[i] ?? '').trim()
      })
      return record
    })
}

function matchEnum<T extends string>(
  raw: string,
  values: readonly T[],
  labels: Record<string, string>,
): T | null {
  const needle = raw.trim().toLowerCase()
  if (!needle) return null
  return (
    values.find((v) => v.toLowerCase() === needle) ??
    values.find((v) => (labels[v] ?? v).toLowerCase() === needle) ??
    null
  )
}

function isValidIsoDate(value: string): boolean {
  return /^\d{4}-\d{2}-\d{2}$/.test(value)
}

function parsePositiveInt(raw: string | undefined): number | null {
  if (!raw?.trim()) return null
  const n = Number(raw.replace(/[$,]/g, ''))
  return Number.isInteger(n) && n > 0 ? n : null
}

function isValidUrl(raw: string): boolean {
  try {
    new URL(raw)
    return true
  } catch {
    return false
  }
}

export type ImportedRow = {
  values: ApplicationFormValues
  // Human-readable notes on fields that were missing/invalid and got a fallback —
  // surfaced to the user so they know what to go edit after import.
  warnings: string[]
}

// Best-effort mapping: every row is imported, and anything missing or unparseable falls
// back to a safe default (rather than rejecting the row) so the user can fix it afterward
// by editing the application, same as any other row in the table.
export function csvRecordToApplication(record: Record<string, string>): ImportedRow {
  const warnings: string[] = []
  const today = isoToday()

  const company = record['Company'] || ''
  if (!company) warnings.push('Missing company — filled with a placeholder')

  const role = record['Role'] || ''
  if (!role) warnings.push('Missing role — filled with a placeholder')

  let appliedDate = record['Applied Date'] || ''
  if (!isValidIsoDate(appliedDate) || appliedDate > today) {
    warnings.push(
      appliedDate ? 'Invalid or future applied date — set to today' : 'Missing applied date — set to today',
    )
    appliedDate = today
  }

  const statusRaw = record['Status'] || ''
  const status: Status | null = matchEnum(statusRaw, STATUS_VALUES, STATUS_LABELS)
  if (!status) {
    warnings.push(statusRaw ? `Unrecognized status "${statusRaw}" — set to Applied` : 'Missing status — set to Applied')
  }

  const sourceRaw = record['Source'] || ''
  const source: Source | null = matchEnum(sourceRaw, SOURCE_VALUES, SOURCE_LABELS)
  if (!source) {
    warnings.push(sourceRaw ? `Unrecognized source "${sourceRaw}" — set to Other` : 'Missing source — set to Other')
  }

  const workModeRaw = record['Work Mode'] || ''
  const workMode: WorkMode | null = workModeRaw
    ? matchEnum(workModeRaw, WORK_MODE_VALUES, WORK_MODE_LABELS)
    : null
  if (workModeRaw && !workMode) {
    warnings.push(`Unrecognized work mode "${workModeRaw}" — left blank`)
  }

  let lastUpdated: string | null = record['Last Updated'] || null
  if (
    lastUpdated &&
    (!isValidIsoDate(lastUpdated) || lastUpdated > today || lastUpdated < appliedDate)
  ) {
    warnings.push('Invalid last updated date — left blank (defaults to today)')
    lastUpdated = null
  }

  let salaryMin = parsePositiveInt(record['Salary Min'])
  if (record['Salary Min']?.trim() && salaryMin == null) {
    warnings.push('Invalid salary min — left blank')
  }
  let salaryMax = parsePositiveInt(record['Salary Max'])
  if (record['Salary Max']?.trim() && salaryMax == null) {
    warnings.push('Invalid salary max — left blank')
  }
  if (salaryMin != null && salaryMax != null && salaryMin > salaryMax) {
    warnings.push('Salary min was greater than salary max — both left blank')
    salaryMin = null
    salaryMax = null
  }

  const salaryRequirement = parsePositiveInt(record['Salary Requirement'])
  if (record['Salary Requirement']?.trim() && salaryRequirement == null) {
    warnings.push('Invalid salary requirement — left blank')
  }

  const coverLetterRaw = (record['Cover Letter Submitted'] || '').trim().toLowerCase()
  const coverLetterSubmitted = coverLetterRaw === 'yes'
  if (coverLetterRaw && coverLetterRaw !== 'yes' && coverLetterRaw !== 'no') {
    warnings.push(`Unrecognized cover letter value "${record['Cover Letter Submitted']}" — set to No`)
  }

  const urlRaw = record['URL'] || ''
  let url: string | null = null
  if (urlRaw) {
    if (isValidUrl(urlRaw)) {
      url = urlRaw
    } else {
      warnings.push(`Invalid URL "${urlRaw}" — left blank`)
    }
  }

  return {
    values: {
      company: company || 'Unknown Company',
      role: role || 'Unknown Role',
      status: status ?? 'applied',
      appliedDate,
      lastUpdated,
      source: source ?? 'other',
      location: record['Location'] || null,
      workMode,
      salaryMin,
      salaryMax,
      salaryRequirement,
      coverLetterSubmitted,
      url,
      contactName: record['Contact Name'] || null,
      notes: record['Notes'] || null,
    },
    warnings,
  }
}

export function parseApplicationsCsv(text: string): ImportedRow[] {
  return recordsFromRows(parseCsv(text)).map(csvRecordToApplication)
}
