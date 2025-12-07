import { getDb, closeDb } from './index'
import { runMigrations } from './migrate'
import { hashPin, generateId } from '../lib/crypto'
import { nanoid } from 'nanoid'

const DEFAULT_ADMIN_USERNAME = 'admin'
const DEFAULT_ADMIN_PIN = '2808'

async function seed(): Promise<void> {
  // Ensure migrations are run first
  runMigrations()

  const db = getDb()

  console.log('Seeding database...')

  // Create default admin user if no users exist
  const existingUsers = db.prepare('SELECT COUNT(*) as count FROM users').get() as {
    count: number
  }

  if (existingUsers.count === 0) {
    const hashedPin = await hashPin(DEFAULT_ADMIN_PIN)
    const userId = generateId()
    const now = Math.floor(Date.now() / 1000)

    db.prepare(`
      INSERT INTO users (id, username, pinHash, displayName, isAdmin, enabled, createdAt, updatedAt)
      VALUES (?, ?, ?, ?, 1, 1, ?, ?)
    `).run(userId, DEFAULT_ADMIN_USERNAME, hashedPin, 'Admin', now, now)

    console.log(`  Created admin user: ${DEFAULT_ADMIN_USERNAME}`)
    console.log(`  Default admin PIN: ${DEFAULT_ADMIN_PIN}`)
  } else {
    console.log(`  Skipping user creation (${existingUsers.count} users already exist)`)
  }

  // Insert default settings (without PIN - that's now per-user)
  const settingsStmt = db.prepare(`
    INSERT OR REPLACE INTO settings (key, value, updatedAt)
    VALUES (?, ?, unixepoch())
  `)

  const settings = [
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
