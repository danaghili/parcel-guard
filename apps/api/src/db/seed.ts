import { getDb, closeDb } from './index'
import { runMigrations } from './migrate'
import { hashPin } from '../lib/crypto'
import { nanoid } from 'nanoid'

const DEFAULT_PIN = '1234'

async function seed(): Promise<void> {
  // Ensure migrations are run first
  runMigrations()

  const db = getDb()

  console.log('Seeding database...')

  // Hash the default PIN
  const hashedPin = await hashPin(DEFAULT_PIN)

  // Insert default settings
  const settingsStmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt)
    VALUES (?, ?, unixepoch())
  `)

  const settings = [
    ['pin', hashedPin],
    ['retentionDays', '14'],
    ['theme', 'dark'],
    ['notificationsEnabled', 'true'],
    ['quietHoursEnabled', 'false'],
    ['quietHoursStart', '22:00'],
    ['quietHoursEnd', '07:00'],
    ['notificationCooldown', '60'],
  ]

  for (const [key, value] of settings) {
    settingsStmt.run(key, value)
  }
  console.log('  Inserted default settings')
  console.log(`  Default PIN: ${DEFAULT_PIN}`)

  // Insert sample cameras (only if none exist)
  const existingCameras = db.prepare('SELECT COUNT(*) as count FROM cameras').get() as {
    count: number
  }

  if (existingCameras.count === 0) {
    const cameraStmt = db.prepare(`
      INSERT INTO cameras (id, name, streamUrl, status, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, unixepoch(), unixepoch())
    `)

    // Use HLS test streams for development (real RTSP streams won't work in browser)
    const cameras = [
      {
        id: nanoid(),
        name: 'Front Door',
        streamUrl: 'https://test-streams.mux.dev/x36xhzz/x36xhzz.m3u8',
        status: 'online',
      },
      {
        id: nanoid(),
        name: 'Lobby',
        streamUrl: 'https://bitdash-a.akamaihd.net/content/sintel/hls/playlist.m3u8',
        status: 'online',
      },
    ]

    for (const camera of cameras) {
      cameraStmt.run(camera.id, camera.name, camera.streamUrl, camera.status)
    }
    console.log(`  Inserted ${cameras.length} sample cameras`)
  } else {
    console.log(`  Skipping cameras (${existingCameras.count} already exist)`)
  }

  console.log('Seed complete!')
}

// Run if called directly
const isMainModule = import.meta.url === `file://${process.argv[1]}`
if (isMainModule) {
  seed()
    .then(() => {
      closeDb()
      process.exit(0)
    })
    .catch((error) => {
      console.error('Seed failed:', error)
      closeDb()
      process.exit(1)
    })
}

export { seed }
