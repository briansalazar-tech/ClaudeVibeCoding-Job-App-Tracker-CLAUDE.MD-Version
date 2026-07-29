import { readFileSync } from 'fs'
import { join } from 'path'
import { db } from './index'

const sql = readFileSync(join(process.cwd(), 'src', 'db', 'migrations', '0000_initial.sql'), 'utf-8')
db.exec(sql)
console.log('Migration applied successfully')
