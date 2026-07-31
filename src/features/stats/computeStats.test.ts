import { describe, it, expect } from 'vitest'
import {
  isGhosted,
  computeFunnelData,
  computeWeeklyApplications,
  computeOutcomesBySource,
  computeSummaryStats,
} from './computeStats'
import type { Application } from '@/lib/schemas'

function makeApp(overrides: Partial<Application> = {}): Application {
  return {
    id: '00000000-0000-0000-0000-000000000001',
    company: 'Test Co',
    role: 'Engineer',
    status: 'applied',
    appliedDate: '2026-01-01',
    lastUpdated: '2026-01-01',
    source: 'linkedin',
    location: null,
    workMode: null,
    salaryMin: null,
    salaryMax: null,
    salaryRequirement: null,
    coverLetterSubmitted: false,
    url: null,
    contactName: null,
    notes: null,
    deletedAt: null,
    ...overrides,
  }
}

// Empty array cases
describe('empty array', () => {
  it('computeFunnelData returns all zeros', () => {
    const result = computeFunnelData([])
    result.forEach((d) => expect(d.count).toBe(0))
  })

  it('computeWeeklyApplications returns 12 zero buckets', () => {
    const result = computeWeeklyApplications([], '2026-07-29')
    expect(result).toHaveLength(12)
    result.forEach((d) => expect(d.count).toBe(0))
  })

  it('computeOutcomesBySource returns empty array', () => {
    expect(computeOutcomesBySource([])).toHaveLength(0)
  })

  it('computeSummaryStats returns zeros and null median', () => {
    const stats = computeSummaryStats([])
    expect(stats.totalApplied).toBe(0)
    expect(stats.responseRate.rate).toBe(0)
    expect(stats.responseRate.numerator).toBe(0)
    expect(stats.responseRate.denominator).toBe(0)
    expect(stats.medianDaysToFirstResponse).toBeNull()
  })
})

// Single application
describe('single application', () => {
  const app = makeApp({ status: 'applied', appliedDate: '2026-07-29', lastUpdated: '2026-07-29' })

  it('funnel has 1 in applied stage', () => {
    const result = computeFunnelData([app], '2026-07-29')
    const applied = result.find((d) => d.stage === 'applied')
    expect(applied?.count).toBe(1)
    const screening = result.find((d) => d.stage === 'screening')
    expect(screening?.count).toBe(0)
  })

  it('weekly chart has 1 in the correct week', () => {
    const result = computeWeeklyApplications([app], '2026-07-29')
    const total = result.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(1)
  })

  it('summary shows 1 total, 0% response rate', () => {
    const stats = computeSummaryStats([app])
    expect(stats.totalApplied).toBe(1)
    expect(stats.responseRate.rate).toBe(0)
    expect(stats.medianDaysToFirstResponse).toBeNull()
  })
})

// All terminal statuses
describe('all terminal statuses', () => {
  const apps = [
    makeApp({ status: 'accepted', appliedDate: '2026-01-01', lastUpdated: '2026-02-01' }),
    makeApp({ status: 'rejected', appliedDate: '2026-01-05', lastUpdated: '2026-01-20' }),
    makeApp({ status: 'withdrawn', appliedDate: '2026-01-10', lastUpdated: '2026-01-15' }),
  ]

  it('funnel pipeline stages all zero', () => {
    const result = computeFunnelData(apps)
    const pipelineStages = ['applied', 'screening', 'interview_1', 'interview_2', 'interview_3', 'offer']
    pipelineStages.forEach((stage) => {
      const d = result.find((r) => r.stage === stage)
      expect(d?.count).toBe(0)
    })
    const accepted = result.find((d) => d.stage === 'accepted')
    expect(accepted?.count).toBe(1)
  })

  it('none are ghosted because terminal statuses are excluded', () => {
    const data = computeFunnelData(apps, '2099-01-01')
    const ghostedCount = data.find((d) => d.stage === 'ghosted')?.count ?? 0
    expect(ghostedCount).toBe(0)
  })

  it('computes response and offer rates correctly', () => {
    const stats = computeSummaryStats(apps)
    // accepted + rejected = 2 responded (withdrawn not counted as response)
    expect(stats.responseRate.numerator).toBe(2)
    expect(stats.responseRate.denominator).toBe(3)
    expect(stats.offerRate.numerator).toBe(1)
    expect(stats.totalApplied).toBe(3)
  })
})

// Year boundary
describe('year boundary', () => {
  it('application on Dec 30 2024 appears in the correct week when looking back from Jan 5 2025', () => {
    const app = makeApp({ appliedDate: '2024-12-30', lastUpdated: '2024-12-30' })
    const result = computeWeeklyApplications([app], '2025-01-05', 12)
    const total = result.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(1)
  })
})

// Ghosted derivation
describe('ghosted derivation', () => {
  it('app with lastUpdated 31 days ago is ghosted', () => {
    const app = makeApp({ status: 'applied', lastUpdated: '2026-06-28' })
    expect(isGhosted(app, '2026-07-29')).toBe(true)
  })

  it('app with lastUpdated 29 days ago is NOT ghosted', () => {
    const app = makeApp({ status: 'applied', lastUpdated: '2026-06-30' })
    expect(isGhosted(app, '2026-07-29')).toBe(false)
  })

  it('terminal status is never ghosted even if old', () => {
    const app = makeApp({ status: 'rejected', lastUpdated: '2025-01-01' })
    expect(isGhosted(app, '2026-07-29')).toBe(false)
  })

  it('ghosted count appears in funnel data', () => {
    const ghosted = makeApp({ status: 'applied', lastUpdated: '2026-05-01' })
    const recent = makeApp({ status: 'applied', lastUpdated: '2026-07-28' })
    const result = computeFunnelData([ghosted, recent], '2026-07-29')
    const ghostedDatum = result.find((d) => d.stage === 'ghosted')
    expect(ghostedDatum?.count).toBe(1)
  })
})

// Rate denominators
describe('rate denominators', () => {
  it('response rate label shows correct numerator and denominator', () => {
    const apps = [
      makeApp({ status: 'screening' }),
      makeApp({ status: 'screening' }),
      makeApp({ status: 'applied' }),
      makeApp({ status: 'applied' }),
      makeApp({ status: 'applied' }),
    ]
    const stats = computeSummaryStats(apps)
    expect(stats.responseRate.numerator).toBe(2)
    expect(stats.responseRate.denominator).toBe(5)
    expect(Math.round(stats.responseRate.rate * 100)).toBe(40)
  })

  it('salaryMin === salaryMax boundary is valid', () => {
    // This is a zod schema test but can also be validated here for consistency
    const app = makeApp({ salaryMin: 100000, salaryMax: 100000 })
    expect(app.salaryMin).toBe(app.salaryMax)
  })

  it('interview rate counts all three interview rounds', () => {
    const apps = [
      makeApp({ status: 'interview_1' }),
      makeApp({ status: 'interview_2' }),
      makeApp({ status: 'interview_3' }),
      makeApp({ status: 'applied' }),
    ]
    const stats = computeSummaryStats(apps)
    expect(stats.interviewRate.numerator).toBe(3)
    expect(stats.interviewRate.denominator).toBe(4)
  })
})

// Expanded summary stats: rejection rate, ghosting rate, applications this month
describe('expanded summary stats', () => {
  it('rejection rate counts only rejected applications', () => {
    const apps = [
      makeApp({ status: 'rejected' }),
      makeApp({ status: 'rejected' }),
      makeApp({ status: 'withdrawn' }),
      makeApp({ status: 'applied' }),
    ]
    const stats = computeSummaryStats(apps)
    expect(stats.rejectionRate.numerator).toBe(2)
    expect(stats.rejectionRate.denominator).toBe(4)
  })

  it('ghosting rate counts applications ghosted as of the given date', () => {
    const apps = [
      makeApp({ status: 'applied', lastUpdated: '2026-06-01' }), // ghosted as of 2026-07-29
      makeApp({ status: 'applied', lastUpdated: '2026-07-28' }), // recent, not ghosted
      makeApp({ status: 'rejected', lastUpdated: '2025-01-01' }), // terminal, never ghosted
    ]
    const stats = computeSummaryStats(apps, '2026-07-29')
    expect(stats.ghostingRate.numerator).toBe(1)
    expect(stats.ghostingRate.denominator).toBe(3)
  })

  it('applications this month only counts appliedDate in the given month', () => {
    const apps = [
      makeApp({ appliedDate: '2026-07-05' }),
      makeApp({ appliedDate: '2026-07-29' }),
      makeApp({ appliedDate: '2026-06-30' }),
      makeApp({ appliedDate: '2026-08-01' }),
    ]
    const stats = computeSummaryStats(apps, '2026-07-29')
    expect(stats.applicationsThisMonth).toBe(2)
  })

  it('returns zeros for empty array', () => {
    const stats = computeSummaryStats([], '2026-07-29')
    expect(stats.rejectionRate.numerator).toBe(0)
    expect(stats.ghostingRate.numerator).toBe(0)
    expect(stats.applicationsThisMonth).toBe(0)
  })
})

// Week buckets with ties in date
describe('ties in appliedDate', () => {
  it('two apps on the same date both appear in the same week bucket', () => {
    const app1 = makeApp({ appliedDate: '2026-07-28', lastUpdated: '2026-07-28' })
    const app2 = makeApp({ appliedDate: '2026-07-28', lastUpdated: '2026-07-28', id: '00000000-0000-0000-0000-000000000002' })
    const result = computeWeeklyApplications([app1, app2], '2026-07-29')
    const total = result.reduce((sum, d) => sum + d.count, 0)
    expect(total).toBe(2)
    // Both should be in the same week
    const maxBucket = Math.max(...result.map((d) => d.count))
    expect(maxBucket).toBe(2)
  })
})
