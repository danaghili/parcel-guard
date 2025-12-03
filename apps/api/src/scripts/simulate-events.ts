/**
 * Event Simulation Script
 *
 * Generates realistic mock motion events for development and testing.
 * Run with: npx tsx src/scripts/simulate-events.ts
 *
 * Options:
 *   --count=N     Number of events to generate (default: 20)
 *   --days=N      Spread events over N days (default: 7)
 *   --camera=ID   Generate events for specific camera (default: all)
 *   --clear       Clear existing events before generating
 */

import 'dotenv/config'
import { initDb } from '../db'
import { runMigrations } from '../db/migrate'
import { createEvent, deleteEvents, getEvents } from '../services/events'
import { getAllCameras, createCamera } from '../services/cameras'
import { randomUUID } from 'crypto'
import { mkdirSync, writeFileSync, existsSync } from 'fs'
import path from 'path'

// Parse command line arguments
const args = process.argv.slice(2)
const getArg = (name: string, defaultValue: string): string => {
  const arg = args.find((a) => a.startsWith(`--${name}=`))
  if (arg) {
    const value = arg.split('=')[1]
    return value ?? defaultValue
  }
  return defaultValue
}
const hasFlag = (name: string): boolean => args.includes(`--${name}`)

const EVENT_COUNT = parseInt(getArg('count', '20'), 10)
const DAYS_SPAN = parseInt(getArg('days', '7'), 10)
const SPECIFIC_CAMERA = getArg('camera', '')
const CLEAR_EXISTING = hasFlag('clear')

// Paths for generated files
const CLIPS_PATH = process.env.CLIPS_PATH ?? './data/clips'
const THUMBNAILS_PATH = process.env.THUMBNAILS_PATH ?? './data/thumbnails'

// Sample camera names if we need to create them
const SAMPLE_CAMERAS = [
  { id: 'cam1', name: 'Front Door', streamUrl: 'rtsp://192.168.1.21:8554/stream' },
  { id: 'cam2', name: 'Back Garden', streamUrl: 'rtsp://192.168.1.22:8554/stream' },
]

/**
 * Generate a placeholder thumbnail (1x1 pixel JPEG)
 */
function generatePlaceholderThumbnail(filePath: string): void {
  // Minimal valid JPEG (1x1 gray pixel)
  const jpegData = Buffer.from([
    0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01, 0x01, 0x00, 0x00, 0x01,
    0x00, 0x01, 0x00, 0x00, 0xff, 0xdb, 0x00, 0x43, 0x00, 0x08, 0x06, 0x06, 0x07, 0x06, 0x05, 0x08,
    0x07, 0x07, 0x07, 0x09, 0x09, 0x08, 0x0a, 0x0c, 0x14, 0x0d, 0x0c, 0x0b, 0x0b, 0x0c, 0x19, 0x12,
    0x13, 0x0f, 0x14, 0x1d, 0x1a, 0x1f, 0x1e, 0x1d, 0x1a, 0x1c, 0x1c, 0x20, 0x24, 0x2e, 0x27, 0x20,
    0x22, 0x2c, 0x23, 0x1c, 0x1c, 0x28, 0x37, 0x29, 0x2c, 0x30, 0x31, 0x34, 0x34, 0x34, 0x1f, 0x27,
    0x39, 0x3d, 0x38, 0x32, 0x3c, 0x2e, 0x33, 0x34, 0x32, 0xff, 0xc0, 0x00, 0x0b, 0x08, 0x00, 0x01,
    0x00, 0x01, 0x01, 0x01, 0x11, 0x00, 0xff, 0xc4, 0x00, 0x1f, 0x00, 0x00, 0x01, 0x05, 0x01, 0x01,
    0x01, 0x01, 0x01, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x01, 0x02, 0x03, 0x04,
    0x05, 0x06, 0x07, 0x08, 0x09, 0x0a, 0x0b, 0xff, 0xc4, 0x00, 0xb5, 0x10, 0x00, 0x02, 0x01, 0x03,
    0x03, 0x02, 0x04, 0x03, 0x05, 0x05, 0x04, 0x04, 0x00, 0x00, 0x01, 0x7d, 0x01, 0x02, 0x03, 0x00,
    0x04, 0x11, 0x05, 0x12, 0x21, 0x31, 0x41, 0x06, 0x13, 0x51, 0x61, 0x07, 0x22, 0x71, 0x14, 0x32,
    0x81, 0x91, 0xa1, 0x08, 0x23, 0x42, 0xb1, 0xc1, 0x15, 0x52, 0xd1, 0xf0, 0x24, 0x33, 0x62, 0x72,
    0x82, 0x09, 0x0a, 0x16, 0x17, 0x18, 0x19, 0x1a, 0x25, 0x26, 0x27, 0x28, 0x29, 0x2a, 0x34, 0x35,
    0x36, 0x37, 0x38, 0x39, 0x3a, 0x43, 0x44, 0x45, 0x46, 0x47, 0x48, 0x49, 0x4a, 0x53, 0x54, 0x55,
    0x56, 0x57, 0x58, 0x59, 0x5a, 0x63, 0x64, 0x65, 0x66, 0x67, 0x68, 0x69, 0x6a, 0x73, 0x74, 0x75,
    0x76, 0x77, 0x78, 0x79, 0x7a, 0x83, 0x84, 0x85, 0x86, 0x87, 0x88, 0x89, 0x8a, 0x92, 0x93, 0x94,
    0x95, 0x96, 0x97, 0x98, 0x99, 0x9a, 0xa2, 0xa3, 0xa4, 0xa5, 0xa6, 0xa7, 0xa8, 0xa9, 0xaa, 0xb2,
    0xb3, 0xb4, 0xb5, 0xb6, 0xb7, 0xb8, 0xb9, 0xba, 0xc2, 0xc3, 0xc4, 0xc5, 0xc6, 0xc7, 0xc8, 0xc9,
    0xca, 0xd2, 0xd3, 0xd4, 0xd5, 0xd6, 0xd7, 0xd8, 0xd9, 0xda, 0xe1, 0xe2, 0xe3, 0xe4, 0xe5, 0xe6,
    0xe7, 0xe8, 0xe9, 0xea, 0xf1, 0xf2, 0xf3, 0xf4, 0xf5, 0xf6, 0xf7, 0xf8, 0xf9, 0xfa, 0xff, 0xda,
    0x00, 0x08, 0x01, 0x01, 0x00, 0x00, 0x3f, 0x00, 0xfb, 0xd5, 0xdb, 0x20, 0xa8, 0xf1, 0x5e, 0x5b,
    0xc4, 0xb0, 0x60, 0x10, 0x8a, 0x78, 0x89, 0x01, 0x00, 0x0f, 0xff, 0xd9,
  ])

  const dir = path.dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  writeFileSync(filePath, jpegData)
}

/**
 * Generate a placeholder video file (minimal MP4)
 */
function generatePlaceholderVideo(filePath: string): void {
  // We'll just create an empty file for now - in a real scenario you'd have actual video
  const dir = path.dirname(filePath)
  if (!existsSync(dir)) {
    mkdirSync(dir, { recursive: true })
  }

  // Create a minimal file that indicates it's a placeholder
  writeFileSync(filePath, Buffer.from('PLACEHOLDER_VIDEO'))
}

/**
 * Generate random timestamp within the last N days
 */
function randomTimestamp(daysAgo: number): number {
  const now = Date.now()
  const msAgo = daysAgo * 24 * 60 * 60 * 1000
  const randomMs = Math.random() * msAgo
  return Math.floor((now - randomMs) / 1000) // Unix timestamp in seconds
}

/**
 * Generate random duration (5-120 seconds)
 */
function randomDuration(): number {
  return Math.floor(Math.random() * 115) + 5
}

/**
 * Main simulation function
 */
async function main(): Promise<void> {
  console.log('🎬 ParcelGuard Event Simulator')
  console.log('================================')
  console.log(`Events to generate: ${EVENT_COUNT}`)
  console.log(`Days span: ${DAYS_SPAN}`)
  console.log(`Specific camera: ${SPECIFIC_CAMERA || 'all'}`)
  console.log(`Clear existing: ${CLEAR_EXISTING}`)
  console.log('')

  // Initialize database
  initDb()
  runMigrations()

  // Get or create cameras
  let cameras = getAllCameras()

  if (cameras.length === 0) {
    console.log('📷 No cameras found, creating sample cameras...')
    for (const cam of SAMPLE_CAMERAS) {
      createCamera(cam)
      console.log(`   Created: ${cam.name} (${cam.id})`)
    }
    cameras = getAllCameras()
  }

  // Filter cameras if specific one requested
  if (SPECIFIC_CAMERA) {
    cameras = cameras.filter((c) => c.id === SPECIFIC_CAMERA)
    if (cameras.length === 0) {
      console.error(`❌ Camera '${SPECIFIC_CAMERA}' not found`)
      process.exit(1)
    }
  }

  console.log(`\n📷 Cameras: ${cameras.map((c) => c.name).join(', ')}`)

  // Clear existing events if requested
  if (CLEAR_EXISTING) {
    console.log('\n🗑️  Clearing existing events...')
    const existing = getEvents({}, 1, 10000)
    if (existing.events.length > 0) {
      const ids = existing.events.map((e) => e.id)
      deleteEvents(ids)
      console.log(`   Deleted ${ids.length} events`)
    }
  }

  // Generate events
  console.log('\n✨ Generating events...')

  const eventsPerCamera = Math.ceil(EVENT_COUNT / cameras.length)
  let totalGenerated = 0

  for (const camera of cameras) {
    const count = Math.min(eventsPerCamera, EVENT_COUNT - totalGenerated)

    for (let i = 0; i < count; i++) {
      const eventId = randomUUID()
      const timestamp = randomTimestamp(DAYS_SPAN)
      const duration = randomDuration()

      // Create file paths
      const thumbnailPath = `${camera.id}/${eventId}.jpg`
      const videoPath = `${camera.id}/${eventId}.mp4`

      // Generate placeholder files
      generatePlaceholderThumbnail(path.join(THUMBNAILS_PATH, thumbnailPath))
      generatePlaceholderVideo(path.join(CLIPS_PATH, videoPath))

      // Create event in database
      const event = createEvent({
        id: eventId,
        cameraId: camera.id,
        timestamp,
        duration,
        thumbnailPath,
        videoPath,
      })

      // Randomly mark some as important or false alarm
      if (Math.random() < 0.1) {
        // 10% chance of being important
        const { updateEvent } = await import('../services/events')
        updateEvent(event.id, { isImportant: true })
      } else if (Math.random() < 0.15) {
        // 15% chance of being false alarm
        const { updateEvent } = await import('../services/events')
        updateEvent(event.id, { isFalseAlarm: true })
      }

      totalGenerated++

      // Progress indicator
      if (totalGenerated % 5 === 0 || totalGenerated === EVENT_COUNT) {
        process.stdout.write(`\r   Generated ${totalGenerated}/${EVENT_COUNT} events`)
      }
    }
  }

  console.log('\n')

  // Summary
  const finalEvents = getEvents({}, 1, 1)
  console.log('📊 Summary')
  console.log('================================')
  console.log(`Total events in database: ${finalEvents.total}`)
  console.log(`Thumbnail directory: ${THUMBNAILS_PATH}`)
  console.log(`Clips directory: ${CLIPS_PATH}`)
  console.log('\n✅ Done!')
}

main().catch((error) => {
  console.error('❌ Error:', error)
  process.exit(1)
})
