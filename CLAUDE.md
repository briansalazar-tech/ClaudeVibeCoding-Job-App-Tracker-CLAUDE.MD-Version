# CLAUDE.md

Guidance for Claude Code when working in this repository.

## Project

A single-user web app for tracking job applications. Two things matter most:

1. **The table** — every submitted application, sortable and filterable, fast to scan and fast to edit.
2. **The stats row** — charts pinned above the table summarizing the pipeline at a glance.

This is a personal tool, not a multi-tenant SaaS. Prefer the simplest thing that works. No auth, no
org/team concepts, no roles unless explicitly asked for.

## Stack

- **Vite + React 19 + TypeScript** (strict mode)
- **Tailwind CSS v4** for styling
- **shadcn/ui** for primitives (Table, Dialog, Select, Badge, Button, Form)
- **TanStack Table** for the applications table (sorting, filtering, column visibility)
- **Recharts** for charts
- **React Hook Form + Zod** for the add/edit form; Zod schemas are the single source of truth for types
- **Hono + SQLite (better-sqlite3) + Drizzle ORM** for the API and persistence
- **Vitest + React Testing Library** for tests

If a task needs a library not listed here, propose it before installing.

## Commands

```bash
npm run dev          # Vite dev server + API, port 5173
npm run build        # typecheck + production build
npm run typecheck    # tsc --noEmit
npm run lint         # eslint
npm run test         # vitest run
npm run test:watch   # vitest
npm run db:generate  # generate Drizzle migration from schema changes
npm run db:migrate   # apply migrations
npm run db:seed      # load sample applications for local dev
```

Always run `npm run typecheck` and `npm run test` before declaring a task done.

## Layout

```
src/
  api/                  # Hono routes, thin — validate, call a service, return
  db/
    schema.ts           # Drizzle table definitions
    migrations/
  features/
    applications/
      ApplicationsTable.tsx
      ApplicationForm.tsx
      ImportCsvDialog.tsx  # template download + CSV upload + import results
      columns.tsx          # TanStack column defs
      useApplications.ts
    stats/
      StatsRow.tsx      # chart container
      charts/           # one file per chart
      computeStats.ts   # pure functions, heavily unit-tested
  components/ui/        # shadcn — do not hand-edit, regenerate via CLI
  lib/
    schemas.ts          # Zod schemas + inferred types
    format.ts           # date/currency/salary formatting
    csv.ts              # CSV generation + parsing (pure) for Export/Import CSV
```

Feature-first, not type-first. A new feature gets a folder under `src/features/`, not files scattered
across `components/`, `hooks/`, and `utils/`.

## Data model

`applications` table:

| Field | Type | Notes |
|---|---|---|
| `id` | uuid | primary key |
| `company` | text | required |
| `role` | text | required |
| `status` | enum | see below |
| `appliedDate` | date | required, ISO `YYYY-MM-DD` |
| `lastUpdated` | date | auto-set on any edit; manually overridable via the form |
| `source` | enum | `linkedin` \| `referral` \| `company_site` \| `job_board` \| `recruiter` \| `other` |
| `location` | text | nullable |
| `workMode` | enum | `remote` \| `hybrid` \| `onsite` — nullable |
| `salaryMin` / `salaryMax` | integer | nullable, whole dollars, no decimals |
| `url` | text | nullable, link to the posting |
| `contactName` | text | nullable |
| `notes` | text | nullable, markdown allowed |

**Status pipeline** (ordered — order is meaningful for the funnel chart):
`applied` → `screening` → `interview_1` → `interview_2` → `interview_3` → `offer` → `accepted`,
with terminal states `rejected` and `withdrawn` reachable from any stage, and `ghosted` derived
(not stored) when a non-terminal application has had no update in 30+ days. The three interview
rounds (labeled "1st/2nd/3rd Interview") are grouped in `INTERVIEW_STATUSES` — use that constant
instead of re-enumerating all three at call sites that mean "any interview round" (interview rate,
response rate, etc.).

Rules:
- Never hard-delete. Soft-delete with `deletedAt` and filter it out at the query layer.
- Status changes append to an `application_events` table (`applicationId`, `fromStatus`, `toStatus`,
  `changedAt`) — this is what makes time-series charts possible. Don't skip the event write.
- Dates are stored as ISO date strings, not timestamps. No timezone math anywhere.

## The table

- Default sort: `appliedDate` descending.
- Column filters on `status`, `source`, and `company` (text search). Filter state lives in the URL
  query string so a filtered view is shareable and survives reload.
- `status` renders as a colored `Badge`. Keep the status→color map in one exported constant and reuse
  it in the charts so colors are consistent across the whole app.
- Row click opens an edit dialog, not a separate route.
- Inline status change via a dropdown in the status cell — this is the single most-used action in the
  app, so it should never require opening a dialog.
- Empty state: a real empty state with a call to action, not a blank table.
- Virtualize only if row count exceeds ~500. Don't pre-optimize.
- **Export CSV** button sits next to Add Application in the toolbar. Exports the table's
  currently filtered rows (not the full dataset) — export is a view of what's on screen, same
  principle as the charts. CSV generation is a pure function (`lib/csv.ts`); the DOM-triggered
  download lives in the component, not in `lib/`, since `lib/` is shared with the Node build and
  has no DOM lib available.
- **Import CSV** button (`ImportCsvDialog.tsx`) also sits in the toolbar next to Add Application.
  The dialog offers a "Download Template" (header row + one filled-out example row, generated by
  `buildCsvTemplate()`) and a file picker. Import is best-effort, never rejection-first: every row
  in the file gets imported, and any missing or invalid cell (blank company, unrecognized status,
  a URL that doesn't parse, `salaryMin > salaryMax`, etc.) falls back to a safe default rather than
  failing the row — `csvRecordToApplication()` in `lib/csv.ts` returns both the coerced values and
  a list of human-readable warnings per row. After import, the dialog shows which rows need a
  second look; the user fixes them the normal way, by clicking into the row and editing it — there
  is no separate "fix flagged rows" UI. Bulk creation goes through `POST /api/applications/import`
  (`applicationService.createMany`), which still validates each row against `applicationSchema`
  server-side — the leniency lives entirely in the client-side CSV→form-values mapping, not in a
  relaxed server contract.

## The charts

Four charts in the stats row, responsive: 4-across on desktop, 2×2 on tablet, stacked on mobile.

1. **Funnel** — count at each pipeline stage, in pipeline order.
2. **Applications over time** — bar chart, weekly buckets, last 12 weeks.
3. **Outcomes by source** — stacked bar, so it's clear which channels actually convert.
4. **Summary tiles** — total applied, response rate, interview rate, offer rate, median days to
   first response. Numbers, not a chart, but it lives in the same row.

Chart rules:
- All aggregation happens in `computeStats.ts` as pure functions over the applications array.
  Charts receive finished data and render it. No `.filter().reduce()` chains inside JSX.
- Every chart respects the table's active filters. Filtering to `source: referral` updates the charts
  too — they are views of the same dataset, not independent widgets.
- Handle the zero-data case explicitly. A funnel chart with no applications should say so, not render
  an empty axis.
- Rates are computed against a stated denominator and labeled with it. "Response rate 40% (8 of 20)"
  not a bare percentage.
- `interview_1`/`interview_2`/`interview_3` share one hue (violet) at monotone lightness steps in
  `STATUS_CHART_COLORS`, rather than three unrelated hues — they're an ordinal progression, not
  independent categories, so they're validated as an ordinal ramp, not three categorical slots.
  Badges (`STATUS_COLORS`) still give them three distinct named colors (violet/purple/fuchsia)
  since a small text-bearing pill doesn't need the same adjacency-CVD treatment a bare chart fill
  does. Re-validate with the dataviz skill's `validate_palette.js` before changing either.
- Don't animate on every re-render. Animation on mount only.

## Color Pallet

The web application will use the following color pallet:
- Website header and navigation: #233D4D
- Body and background: #EAECF0
- Text: #FE7F2D
- Accents: #FE7F2D

## Conventions

- No `any`. No non-null assertions (`!`) — narrow properly.
- Derive types from Zod schemas with `z.infer`. Don't maintain a parallel `interface`.
- Named exports only, except for route-level page components.
- `async/await`, never raw `.then()` chains.
- Tailwind utilities inline; no CSS modules, no styled-components. Extract a component before
  extracting a class.
- Comments explain *why*, not *what*. Skip them if the code is clear.
- Keep components under ~150 lines. If one grows past that, the aggregation logic probably belongs in
  a hook or a pure function.

## Testing

- `computeStats.ts` gets thorough unit tests: empty array, single application, all-terminal statuses,
  applications spanning a year boundary, ties in date sorting.
- Table gets integration tests for sort, filter, and inline status change.
- Zod schemas get tests for the rejection cases (`salaryMin > salaryMax`, future `appliedDate`,
  malformed URL).
- Don't test shadcn primitives or Recharts internals.

## Things to avoid

- Adding auth, user accounts, or a `users` table.
- Reaching for a global state manager. Server state via a data-fetching hook plus URL params for
  filter state is sufficient.
- A backend framework heavier than Hono.
- Building an analytics dashboard beyond the four charts above without being asked.
- Silently changing the status enum values — they're persisted and referenced in chart logic.