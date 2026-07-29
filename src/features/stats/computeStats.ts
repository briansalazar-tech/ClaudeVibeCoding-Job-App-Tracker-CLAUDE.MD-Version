import { PIPELINE_ORDER, TERMINAL_STATUSES } from '@/lib/schemas'
import { daysBetween, isoToday } from '@/lib/format'
import type { Application } from '@/lib/schemas'

export type FunnelDatum = { stage: string; count: number }
export type WeeklyDatum = { weekLabel: string; weekStart: string; count: number }
export type SourceOutcomeDatum = {
  source: string
  active: number
  ghosted: number
  rejected: number
  withdrawn: number
  accepted: number
}
export type RateWithDenominator = {
  rate: number
  numerator: number
  denominator: number
}
export type SummaryStats = {
  totalApplied: number
  responseRate: RateWithDenominator
  interviewRate: RateWithDenominator
  offerRate: RateWithDenominator
  medianDaysToFirstResponse: number | null
}

export function isGhosted(app: Application, today = isoToday()): boolean {
  if (TERMINAL_STATUSES.includes(app.status as (typeof TERMINAL_STATUSES)[number])) return false
  return daysBetween(app.lastUpdated, today) >= 30
}

export function getEffectiveStatus(app: Application, today = isoToday()): string {
  return isGhosted(app, today) ? 'ghosted' : app.status
}

export function computeFunnelData(apps: Application[], today = isoToday()): FunnelDatum[] {
  const base: FunnelDatum[] = PIPELINE_ORDER.map((stage) => ({
    stage,
    count: apps.filter((a) => a.status === stage).length,
  }))
  return base.concat([{ stage: 'ghosted', count: apps.filter((a) => isGhosted(a, today)).length }])
}

// Returns the Monday of the ISO week containing the given date string
function getMondayOf(dateStr: string): Date {
  const d = new Date(dateStr + 'T00:00:00Z')
  const day = d.getUTCDay() // 0 = Sunday
  const diff = day === 0 ? -6 : 1 - day // adjust so Monday=0
  d.setUTCDate(d.getUTCDate() + diff)
  return d
}

function toIso(date: Date): string {
  return date.toISOString().slice(0, 10)
}

function addDays(date: Date, days: number): Date {
  const d = new Date(date)
  d.setUTCDate(d.getUTCDate() + days)
  return d
}

export function computeWeeklyApplications(
  apps: Application[],
  today = isoToday(),
  weeksBack = 12,
): WeeklyDatum[] {
  const thisMonday = getMondayOf(today)
  const buckets: WeeklyDatum[] = []

  for (let i = weeksBack - 1; i >= 0; i--) {
    const weekStart = addDays(thisMonday, -i * 7)
    const weekEnd = addDays(weekStart, 6)
    const weekStartStr = toIso(weekStart)
    const weekEndStr = toIso(weekEnd)

    const count = apps.filter((a) => a.appliedDate >= weekStartStr && a.appliedDate <= weekEndStr).length

    const monthDay = weekStart.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
      timeZone: 'UTC',
    })

    buckets.push({ weekLabel: monthDay, weekStart: weekStartStr, count })
  }

  return buckets
}

export function computeOutcomesBySource(
  apps: Application[],
  today = isoToday(),
): SourceOutcomeDatum[] {
  const sources = [...new Set(apps.map((a) => a.source))].sort()

  return sources.map((source) => {
    const group = apps.filter((a) => a.source === source)
    return {
      source,
      active: group.filter(
        (a) =>
          !TERMINAL_STATUSES.includes(a.status as (typeof TERMINAL_STATUSES)[number]) &&
          !isGhosted(a, today),
      ).length,
      ghosted: group.filter((a) => isGhosted(a, today)).length,
      rejected: group.filter((a) => a.status === 'rejected').length,
      withdrawn: group.filter((a) => a.status === 'withdrawn').length,
      accepted: group.filter((a) => a.status === 'accepted').length,
    }
  })
}

function median(numbers: number[]): number | null {
  if (numbers.length === 0) return null
  const sorted = [...numbers].sort((a, b) => a - b)
  const mid = Math.floor(sorted.length / 2)
  return sorted.length % 2 === 0 ? (sorted[mid - 1] + sorted[mid]) / 2 : sorted[mid]
}

export function computeSummaryStats(apps: Application[]): SummaryStats {
  const total = apps.length

  const responded = apps.filter((a) =>
    ['screening', 'interviewing', 'offer', 'accepted', 'rejected'].includes(a.status),
  ).length

  const interviewed = apps.filter((a) =>
    ['interviewing', 'offer', 'accepted'].includes(a.status),
  ).length

  const offered = apps.filter((a) => ['offer', 'accepted'].includes(a.status)).length

  // Days from appliedDate to lastUpdated for apps that have moved beyond 'applied'
  const progressedApps = apps.filter((a) => a.status !== 'applied')
  const daysList = progressedApps.map((a) => daysBetween(a.appliedDate, a.lastUpdated))

  return {
    totalApplied: total,
    responseRate: {
      rate: total > 0 ? responded / total : 0,
      numerator: responded,
      denominator: total,
    },
    interviewRate: {
      rate: total > 0 ? interviewed / total : 0,
      numerator: interviewed,
      denominator: total,
    },
    offerRate: {
      rate: total > 0 ? offered / total : 0,
      numerator: offered,
      denominator: total,
    },
    medianDaysToFirstResponse: median(daysList),
  }
}
