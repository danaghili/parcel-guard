/**
 * ntfy.sh notification client
 *
 * Simple HTTP-based push notifications via ntfy.sh
 * @see https://docs.ntfy.sh/publish/
 */

export interface NtfyOptions {
  topic: string
  title: string
  message: string
  priority?: 'min' | 'low' | 'default' | 'high' | 'urgent'
  tags?: string[]
  click?: string // URL to open when notification is clicked
  attach?: string // URL to attachment (e.g., thumbnail)
}

export interface NtfyConfig {
  server: string
  topic: string
}

/**
 * Get ntfy configuration from environment
 */
export function getNtfyConfig(): NtfyConfig | null {
  const topic = process.env.NTFY_TOPIC
  if (!topic) {
    return null
  }

  return {
    server: process.env.NTFY_SERVER || 'https://ntfy.sh',
    topic,
  }
}

/**
 * Send a notification via ntfy.sh
 */
export async function sendNtfyNotification(options: NtfyOptions): Promise<void> {
  const config = getNtfyConfig()
  if (!config) {
    throw new Error('ntfy.sh not configured: NTFY_TOPIC environment variable not set')
  }

  const url = `${config.server}/${options.topic}`

  const headers: Record<string, string> = {
    'Content-Type': 'text/plain',
  }

  if (options.title) {
    headers['X-Title'] = options.title
  }

  if (options.priority && options.priority !== 'default') {
    headers['X-Priority'] = options.priority
  }

  if (options.tags && options.tags.length > 0) {
    headers['X-Tags'] = options.tags.join(',')
  }

  if (options.click) {
    headers['X-Click'] = options.click
  }

  if (options.attach) {
    headers['X-Attach'] = options.attach
  }

  const response = await fetch(url, {
    method: 'POST',
    headers,
    body: options.message,
  })

  if (!response.ok) {
    const errorText = await response.text().catch(() => 'Unknown error')
    throw new Error(`ntfy.sh request failed: ${response.status} ${response.statusText} - ${errorText}`)
  }
}

/**
 * Send a test notification
 */
export async function sendTestNotification(topic: string): Promise<void> {
  const config = getNtfyConfig()
  if (!config) {
    throw new Error('ntfy.sh not configured: NTFY_TOPIC environment variable not set')
  }

  await sendNtfyNotification({
    topic: topic || config.topic,
    title: 'ParcelGuard Test',
    message: 'This is a test notification from ParcelGuard. If you see this, notifications are working!',
    priority: 'default',
    tags: ['white_check_mark', 'test'],
  })
}
