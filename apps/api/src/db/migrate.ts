import fs from 'fs'
import path from 'path'
import { fileURLToPath } from 'url'
import { getDb, closeDb } from './index'

const __dirname = path.dirname(fileURLToPath(import.meta.url))
const MIGRATIONS_DIR = path.join(__dirname, 'migrations')

export function runMigrations(): void {
  const db = getDb()

  // Create migrations tracking table
  db.exec(`
    CREATE TABLE IF NOT EXISTS _migrations (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL,
      appliedAt INTEGER DEFAULT (unixepoch())
    )
  `)

  // Get applied migrations
  const applied = new Set(
    db
      .prepare('SELECT name FROM _migrations')
      .all()
      .map((row) => (row as { name: string }).name),
  )

  // Get migration files
  const files = fs
    .readdirSync(MIGRATIONS_DIR)
    .filter((f) => f.endsWith('.sql'))
    .sort()

  // Apply pending migrations
  for (const file of files) {
    if (applied.has(file)) {
      console.log(`  Skipping ${file} (already applied)`)
      continue
    }

    console.log(`  Applying ${file}...`)
    const sql = fs.readFileSync(path.join(MIGRATIONS_DIR, file), 'utf-8')

    db.transaction(() => {
      db.exec(sql)
      db.prepare('INSERT INTO _migrations (name) VALUES (?)').run(file)
    })()

    console.log(`  Applied ${file}`)
  }
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  console.log('Running migrations...')
  try {
    runMigrations()
    console.log('Migrations complete!')
  } catch (error) {
    console.error('Migration failed:', error)
    process.exit(1)
  } finally {
    closeDb()
  }
}
