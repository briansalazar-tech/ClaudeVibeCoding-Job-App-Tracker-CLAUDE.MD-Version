import { v4 as uuidv4 } from 'uuid'
import { db } from '../../db/index'
import type { ApplicationFormValues, Application, Status, Source, WorkMode } from '../../lib/schemas'

const today = () => new Date().toISOString().slice(0, 10)

type DbRow = Record<string, unknown>

function mapRow(row: DbRow): Application {
  return {
    id: row.id as string,
    company: row.company as string,
    role: row.role as string,
    status: row.status as Status,
    appliedDate: row.applied_date as string,
    lastUpdated: row.last_updated as string,
    source: row.source as Source,
    location: (row.location as string | null) ?? null,
    workMode: (row.work_mode as WorkMode | null) ?? null,
    salaryMin: (row.salary_min as number | null) ?? null,
    salaryMax: (row.salary_max as number | null) ?? null,
    salaryRequirement: (row.salary_requirement as number | null) ?? null,
    coverLetterSubmitted: Boolean(row.cover_letter_submitted),
    url: (row.url as string | null) ?? null,
    contactName: (row.contact_name as string | null) ?? null,
    notes: (row.notes as string | null) ?? null,
    deletedAt: (row.deleted_at as string | null) ?? null,
  }
}

function safeUrl(url: unknown): string | null {
  return typeof url === 'string' && url.length > 0 ? url : null
}

export const applicationService = {
  getAll(): Application[] {
    const rows = db
      .prepare('SELECT * FROM applications WHERE deleted_at IS NULL ORDER BY applied_date DESC')
      .all() as DbRow[]
    return rows.map(mapRow)
  },

  getById(id: string): Application | undefined {
    const row = db
      .prepare('SELECT * FROM applications WHERE id = ? AND deleted_at IS NULL')
      .get(id) as DbRow | undefined
    return row ? mapRow(row) : undefined
  },

  create(input: ApplicationFormValues): Application {
    const id = uuidv4()
    const lastUpdated = input.lastUpdated ?? today()

    db.prepare(
      `INSERT INTO applications
         (id, company, role, status, applied_date, last_updated, source,
          location, work_mode, salary_min, salary_max, salary_requirement,
          cover_letter_submitted, url, contact_name, notes, deleted_at)
       VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,?,NULL)`,
    ).run(
      id,
      input.company,
      input.role,
      input.status,
      input.appliedDate,
      lastUpdated,
      input.source,
      input.location ?? null,
      input.workMode ?? null,
      input.salaryMin ?? null,
      input.salaryMax ?? null,
      input.salaryRequirement ?? null,
      input.coverLetterSubmitted ? 1 : 0,
      safeUrl(input.url),
      input.contactName ?? null,
      input.notes ?? null,
    )

    db.prepare(
      'INSERT INTO application_events (id, application_id, from_status, to_status, changed_at) VALUES (?,?,NULL,?,?)',
    ).run(uuidv4(), id, input.status, lastUpdated)

    return this.getById(id)!
  },

  createMany(inputs: ApplicationFormValues[]): Application[] {
    return inputs.map((input) => this.create(input))
  },

  update(id: string, input: Partial<ApplicationFormValues>): Application | undefined {
    const existing = this.getById(id)
    if (!existing) return undefined

    const now = today()
    const lastUpdated = input.lastUpdated ?? now
    const statusChanged = input.status != null && input.status !== existing.status

    // Always update all fields (merge input over existing)
    const merged = {
      company: input.company ?? existing.company,
      role: input.role ?? existing.role,
      status: input.status ?? existing.status,
      appliedDate: input.appliedDate ?? existing.appliedDate,
      source: input.source ?? existing.source,
      location: 'location' in input ? (input.location ?? null) : (existing.location ?? null),
      workMode: 'workMode' in input ? (input.workMode ?? null) : (existing.workMode ?? null),
      salaryMin: 'salaryMin' in input ? (input.salaryMin ?? null) : (existing.salaryMin ?? null),
      salaryMax: 'salaryMax' in input ? (input.salaryMax ?? null) : (existing.salaryMax ?? null),
      salaryRequirement:
        'salaryRequirement' in input
          ? (input.salaryRequirement ?? null)
          : (existing.salaryRequirement ?? null),
      coverLetterSubmitted:
        'coverLetterSubmitted' in input
          ? (input.coverLetterSubmitted ?? false)
          : existing.coverLetterSubmitted,
      url: 'url' in input ? safeUrl(input.url) : (existing.url ?? null),
      contactName:
        'contactName' in input ? (input.contactName ?? null) : (existing.contactName ?? null),
      notes: 'notes' in input ? (input.notes ?? null) : (existing.notes ?? null),
    }

    db.prepare(
      `UPDATE applications SET
         company=?,role=?,status=?,applied_date=?,source=?,
         location=?,work_mode=?,salary_min=?,salary_max=?,salary_requirement=?,
         cover_letter_submitted=?,url=?,contact_name=?,notes=?,last_updated=?
       WHERE id=?`,
    ).run(
      merged.company,
      merged.role,
      merged.status,
      merged.appliedDate,
      merged.source,
      merged.location,
      merged.workMode,
      merged.salaryMin,
      merged.salaryMax,
      merged.salaryRequirement,
      merged.coverLetterSubmitted ? 1 : 0,
      merged.url,
      merged.contactName,
      merged.notes,
      lastUpdated,
      id,
    )

    if (statusChanged && input.status != null) {
      db.prepare(
        'INSERT INTO application_events (id, application_id, from_status, to_status, changed_at) VALUES (?,?,?,?,?)',
      ).run(uuidv4(), id, existing.status, input.status, lastUpdated)
    }

    return this.getById(id)
  },

  softDelete(id: string): void {
    db.prepare('UPDATE applications SET deleted_at=? WHERE id=?').run(today(), id)
  },
}
