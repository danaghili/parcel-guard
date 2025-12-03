/**
 * Notification service for ParcelGuard
 *
 * Handles motion alert notifications with:
 * - Quiet hours enforcement
 * - Per-camera cooldown to prevent spam
 * - Per-camera notification toggles
 * - Global notification enable/disable
 */

import { getSettings } from './settings'
import { getCameraById } from './cameras'
import { sendNtfyNotification, getNtfyConfig } from './ntfy'
import type { Camera } from '@parcelguard/shared'

export interface MotionEvent {
  id: string
  cameraId: string
  timestamp: number
  thumbnailPath: string | null
}

// In-memory cooldown tracking per camera
const lastNotificationTime = new Map<string, number>()

/**
 * Parse HH:mm time string to minutes since midnight
 */
function parseTimeToMinutes(time: string): number {
  const [hours, minutes] = time.split(':').map(Number)
  return (hours ?? 0) * 60 + (minutes ?? 0)
}

/**
 * Check if current time is within quiet hours
 */
export function isQuietHours(): boolean {
  const settings = getSettings()

  if (!settings.quietHoursEnabled) {
    return false
  }

  const now = new Date()
  const currentMinutes = now.getHours() * 60 + now.getMinutes()

  const startMinutes = parseTimeToMinutes(settings.quietHoursStart)
  const endMinutes = parseTimeToMinutes(settings.quietHoursEnd)

  // Handle overnight quiet hours (e.g., 22:00 - 07:00)
  if (startMinutes > endMinutes) {
    // Quiet hours span midnight
    return currentMinutes >= startMinutes || currentMinutes < endMinutes
  } else {
    // Normal range (e.g., 01:00 - 06:00)
    return currentMinutes >= startMinutes && currentMinutes < endMinutes
  }
}

/**
 * Check if we can send a notification for a camera (cooldown check)
 * Also updates the last notification time if allowed
 */
export function canSendNotification(cameraId: string): boolean {
  const settings = getSettings()
  const cooldownMs = settings.notificationCooldown * 1000

  const lastTime = lastNotificationTime.get(cameraId) ?? 0
  const now = Date.now()

  if (now - lastTime < cooldownMs) {
    return false
  }

  // Update last notification time
  lastNotificationTime.set(cameraId, now)
  return true
}

/**
 * Reset cooldown for a camera (useful for testing)
 */
export function resetCooldown(cameraId?: string): void {
  if (cameraId) {
    lastNotificationTime.delete(cameraId)
  } else {
    lastNotificationTime.clear()
  }
}

/**
 * Get the base URL for the app (for deep links)
 */
function getAppBaseUrl(): string {
  return process.env.APP_URL || 'http://localhost:5173'
}

/**
 * Get the API base URL (for thumbnail attachments)
 */
function getApiBaseUrl(): string {
  return process.env.API_URL || 'http://localhost:3000'
}

/**
 * Format timestamp for notification message
 */
function formatTime(timestamp: number): string {
  const date = new Date(timestamp * 1000)
  return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

/**
 * Send a motion alert notification
 *
 * Checks all conditions before sending:
 * 1. Global notifications enabled
 * 2. Per-camera notifications enabled
 * 3. Not in quiet hours
 * 4. Cooldown period passed
 */
export async function sendMotionAlert(
  event: MotionEvent,
  camera: Camera,
): Promise<{ sent: boolean; reason?: string }> {
  const settings = getSettings()
  const config = getNtfyConfig()

  // Check if ntfy is configured
  if (!config) {
    return { sent: false, reason: 'ntfy not configured' }
  }

  // Check global notifications enabled
  if (!settings.notificationsEnabled) {
    return { sent: false, reason: 'notifications disabled globally' }
  }

  // Check per-camera notifications enabled
  if (!camera.settings?.notificationsEnabled) {
    return { sent: false, reason: 'notifications disabled for camera' }
  }

  // Check quiet hours
  if (isQuietHours()) {
    return { sent: false, reason: 'quiet hours active' }
  }

  // Check cooldown
  if (!canSendNotification(camera.id)) {
    return { sent: false, reason: 'cooldown active' }
  }

  // Build notification
  const title = `Motion Detected: ${camera.name}`
  const message = `Motion detected at ${formatTime(event.timestamp)}`
  const clickUrl = `${getAppBaseUrl()}/events/${event.id}`

  // Attach thumbnail if available
  let attachUrl: string | undefined
  if (event.thumbnailPath) {
    attachUrl = `${getApiBaseUrl()}/api/events/${event.id}/thumbnail`
  }

  try {
    await sendNtfyNotification({
      topic: config.topic,
      title,
      message,
      priority: 'high',
      tags: ['camera', 'motion_sensor'],
      click: clickUrl,
      attach: attachUrl,
    })

    return { sent: true }
  } catch (error) {
    const errorMessage = error instanceof Error ? error.message : 'Unknown error'
    return { sent: false, reason: errorMessage }
  }
}

/**
 * Send motion alert by camera ID (convenience wrapper)
 */
export async function sendMotionAlertByCameraId(
  event: MotionEvent,
): Promise<{ sent: boolean; reason?: string }> {
  const camera = getCameraById(event.cameraId)

  if (!camera) {
    return { sent: false, reason: 'camera not found' }
  }

  return sendMotionAlert(event, camera)
}

/**
 * Check if notifications are configured and working
 */
export function isNotificationConfigured(): boolean {
  const config = getNtfyConfig()
  return config !== null
}

/**
 * Get notification status summary
 */
export function getNotificationStatus(): {
  configured: boolean
  enabled: boolean
  quietHoursActive: boolean
  topic: string | null
} {
  const settings = getSettings()
  const config = getNtfyConfig()

  return {
    configured: config !== null,
    enabled: settings.notificationsEnabled,
    quietHoursActive: isQuietHours(),
    topic: config?.topic ?? null,
  }
}
