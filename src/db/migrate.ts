import { readdirSync, readFileSync } from 'fs'
import { join } from 'path'
import { db } from './index'

const migrationsDir = join(process.cwd(), 'src', 'db', 'migrations')
const files = readdirSync(migrationsDir)
  .filter((f) => f.endsWith('.sql'))
  .sort()

for (const file of files) {
  const sql = readFileSync(join(migrationsDir, file), 'utf-8')
  try {
    db.exec(sql)
  } catch (err) {
    // CREATE TABLE IF NOT EXISTS is idempotent, but ALTER TABLE ADD COLUMN isn't —
    // re-running an already-applied migration hits this, and it's safe to skip.
    if (err instanceof Error && err.message.includes('duplicate column name')) continue
    throw err
  }
}

console.log(`Applied ${files.length} migration file(s)`)
