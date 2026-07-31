// Schema documentation — the actual tables are created by the files in src/db/migrations/
// Enum values are in src/lib/schemas.ts so both API and frontend can import them without
// pulling in any Node.js-only dependencies.
export { STATUS_VALUES, SOURCE_VALUES, WORK_MODE_VALUES, PIPELINE_ORDER, TERMINAL_STATUSES } from '../lib/schemas'
export type { Status, Source, WorkMode } from '../lib/schemas'
