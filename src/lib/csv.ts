import { STATUS_LABELS, SOURCE_LABELS, WORK_MODE_LABELS, type Application } from './schemas'

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
    app.url ?? '',
    app.contactName ?? '',
    app.notes ?? '',
  ]
}

export function applicationsToCsv(applications: Application[]): string {
  const rows = [CSV_COLUMNS, ...applications.map(applicationToRow)]
  return rows.map((row) => row.map(escapeCsvField).join(',')).join('\r\n')
}
