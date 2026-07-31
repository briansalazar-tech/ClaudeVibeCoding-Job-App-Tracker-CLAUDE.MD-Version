import { z } from 'zod'

// Canonical enum values — imported by both db/schema.ts (Drizzle) and frontend components
export const STATUS_VALUES = [
  'applied',
  'screening',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'accepted',
  'rejected',
  'withdrawn',
] as const

export const SOURCE_VALUES = [
  'linkedin',
  'indeed',
  'referral',
  'company_site',
  'job_board',
  'recruiter',
  'other',
] as const

export const WORK_MODE_VALUES = ['remote', 'hybrid', 'onsite'] as const

export type Status = (typeof STATUS_VALUES)[number]
export type Source = (typeof SOURCE_VALUES)[number]
export type WorkMode = (typeof WORK_MODE_VALUES)[number]

// Pipeline order (for funnel chart — only forward-progress stages)
export const PIPELINE_ORDER: Status[] = [
  'applied',
  'screening',
  'interview_1',
  'interview_2',
  'interview_3',
  'offer',
  'accepted',
]
export const TERMINAL_STATUSES: Status[] = ['accepted', 'rejected', 'withdrawn']
// Any round of interviewing — grouped here so "interview rate" etc. don't have to
// enumerate all three rounds at every call site.
export const INTERVIEW_STATUSES: Status[] = ['interview_1', 'interview_2', 'interview_3']

const isoToday = () => new Date().toISOString().slice(0, 10)

export const applicationSchema = z
  .object({
    company: z.string().min(1, 'Company is required'),
    role: z.string().min(1, 'Role is required'),
    status: z.enum(STATUS_VALUES),
    appliedDate: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
      .refine((d) => d <= isoToday(), 'Applied date cannot be in the future'),
    // Optional — omitted means "auto-set to today", provided means the user is
    // manually overriding it (e.g. backfilling a historical last-contact date)
    lastUpdated: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Must be YYYY-MM-DD')
      .nullable()
      .optional(),
    source: z.enum(SOURCE_VALUES),
    location: z.string().nullable().optional(),
    workMode: z.enum(WORK_MODE_VALUES).nullable().optional(),
    salaryMin: z.number().int().positive().nullable().optional(),
    salaryMax: z.number().int().positive().nullable().optional(),
    salaryRequirement: z.number().int().positive().nullable().optional(),
    coverLetterSubmitted: z.boolean().default(false),
    url: z
      .string()
      .url('Must be a valid URL')
      .nullable()
      .optional()
      .or(z.literal('').transform(() => null)),
    contactName: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
  })
  .refine(
    (d) => d.salaryMin == null || d.salaryMax == null || d.salaryMin <= d.salaryMax,
    { message: 'Salary min must be ≤ salary max', path: ['salaryMax'] },
  )
  .refine((d) => d.lastUpdated == null || d.lastUpdated <= isoToday(), {
    message: 'Last updated cannot be in the future',
    path: ['lastUpdated'],
  })
  .refine((d) => d.lastUpdated == null || d.lastUpdated >= d.appliedDate, {
    message: 'Last updated cannot be before applied date',
    path: ['lastUpdated'],
  })

export type ApplicationFormValues = z.infer<typeof applicationSchema>

// Separate from applicationSchema (form) — DB always returns null, never undefined for nullable cols
export const applicationResponseSchema = z.object({
  id: z.string().uuid(),
  company: z.string(),
  role: z.string(),
  status: z.enum(STATUS_VALUES),
  appliedDate: z.string(),
  lastUpdated: z.string(),
  source: z.enum(SOURCE_VALUES),
  location: z.string().nullable(),
  workMode: z.enum(WORK_MODE_VALUES).nullable(),
  salaryMin: z.number().nullable(),
  salaryMax: z.number().nullable(),
  salaryRequirement: z.number().nullable(),
  coverLetterSubmitted: z.boolean(),
  url: z.string().nullable(),
  contactName: z.string().nullable(),
  notes: z.string().nullable(),
  deletedAt: z.string().nullable(),
})

export type Application = z.infer<typeof applicationResponseSchema>

// Status badge color map — single source of truth, reused by charts
export const STATUS_COLORS: Record<string, string> = {
  applied: 'bg-blue-100 text-blue-800 border-blue-200',
  screening: 'bg-amber-100 text-amber-800 border-amber-200',
  interview_1: 'bg-violet-100 text-violet-800 border-violet-200',
  interview_2: 'bg-purple-100 text-purple-800 border-purple-200',
  interview_3: 'bg-fuchsia-100 text-fuchsia-800 border-fuchsia-200',
  offer: 'bg-green-100 text-green-800 border-green-200',
  accepted: 'bg-emerald-600 text-white border-emerald-700',
  rejected: 'bg-red-100 text-red-800 border-red-200',
  withdrawn: 'bg-gray-100 text-gray-600 border-gray-200',
  ghosted: 'bg-slate-100 text-slate-500 border-slate-200',
}

// Hex colors for Recharts (cannot use Tailwind classes in SVG)
// Darker/more saturated than the badge palette on purpose — these render as
// solid fills on a white chart surface, where the pastel badge tones read as washed out.
// The three interview rounds are an ordinal progression, not independent categories, so they
// share one hue (violet) in monotone light→dark steps rather than three distinct hues — see
// scripts/validate_palette.js --ordinal in the dataviz skill, which is what these three steps
// were validated against (adjacent ΔL >= 0.06, light end >= 2:1 contrast).
export const STATUS_CHART_COLORS: Record<string, string> = {
  applied: '#3B82F6',
  screening: '#D97706',
  interview_1: '#A78BFA',
  interview_2: '#7C3AED',
  interview_3: '#5B21B6',
  offer: '#16A34A',
  accepted: '#065F46',
  rejected: '#EF4444',
  withdrawn: '#6B7280',
  ghosted: '#94A3B8',
}

export const SOURCE_LABELS: Record<string, string> = {
  linkedin: 'LinkedIn',
  indeed: 'Indeed',
  referral: 'Referral',
  company_site: 'Company Site',
  job_board: 'Job Board',
  recruiter: 'Recruiter',
  other: 'Other',
}

export const WORK_MODE_LABELS: Record<string, string> = {
  remote: 'Remote',
  hybrid: 'Hybrid',
  onsite: 'Onsite',
}

export const STATUS_LABELS: Record<string, string> = {
  applied: 'Applied',
  screening: 'Screening',
  interview_1: '1st Interview',
  interview_2: '2nd Interview',
  interview_3: '3rd Interview',
  offer: 'Offer',
  accepted: 'Accepted',
  rejected: 'Rejected',
  withdrawn: 'Withdrawn',
  ghosted: 'Ghosted',
}

export const patchStatusSchema = z.object({
  status: z.enum(STATUS_VALUES),
})
