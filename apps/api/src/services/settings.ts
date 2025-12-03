import { getDb } from '../db'
import { hashPin, verifyPin } from '../lib/crypto'
import { Errors } from '../lib/errors'

export interface Settings {
  retentionDays: number
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  notificationCooldown: number
}

interface SettingRow {
  key: string
  value: string
}

export function getSettings(): Settings {
  const db = getDb()
  const rows = db.prepare('SELECT key, value FROM settings').all() as SettingRow[]

  const settingsMap = new Map(rows.map((row) => [row.key, row.value]))

  return {
    retentionDays: parseInt(settingsMap.get('retentionDays') ?? '14', 10),
    theme: (settingsMap.get('theme') as Settings['theme']) ?? 'dark',
    notificationsEnabled: settingsMap.get('notificationsEnabled') === 'true',
    quietHoursEnabled: settingsMap.get('quietHoursEnabled') === 'true',
    quietHoursStart: settingsMap.get('quietHoursStart') ?? '22:00',
    quietHoursEnd: settingsMap.get('quietHoursEnd') ?? '07:00',
    notificationCooldown: parseInt(settingsMap.get('notificationCooldown') ?? '60', 10),
  }
}

export function getSetting(key: string): string | null {
  const db = getDb()
  const row = db.prepare('SELECT value FROM settings WHERE key = ?').get(key) as
    | { value: string }
    | undefined

  return row?.value ?? null
}

export function updateSettings(updates: Partial<Settings>): Settings {
  const db = getDb()

  const stmt = db.prepare(`
    INSERT INTO settings (key, value, updatedAt)
    VALUES (?, ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `)

  const updateTransaction = db.transaction(() => {
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined) {
        stmt.run(key, String(value))
      }
    }
  })

  updateTransaction()

  return getSettings()
}

export async function updatePin(currentPin: string, newPin: string): Promise<void> {
  const db = getDb()

  // Validate new PIN format
  if (!/^\d{4,8}$/.test(newPin)) {
    throw Errors.badRequest('PIN must be 4-8 digits')
  }

  // Verify current PIN
  const setting = db.prepare('SELECT value FROM settings WHERE key = ?').get('pin') as
    | { value: string }
    | undefined

  if (!setting) {
    throw Errors.internal('PIN not configured')
  }

  const isValid = await verifyPin(currentPin, setting.value)
  if (!isValid) {
    throw Errors.invalidCredentials('Current PIN is incorrect')
  }

  // Hash and save new PIN
  const hashedPin = await hashPin(newPin)
  db.prepare(`
    INSERT INTO settings (key, value, updatedAt)
    VALUES ('pin', ?, unixepoch())
    ON CONFLICT(key) DO UPDATE SET value = excluded.value, updatedAt = excluded.updatedAt
  `).run(hashedPin)
}
