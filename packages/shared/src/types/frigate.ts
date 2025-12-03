/**
 * Frigate event webhook payload
 * @see https://docs.frigate.video/integrations/api/#event-webhook
 */
export interface FrigateEventPayload {
  type: 'new' | 'update' | 'end'
  before: FrigateEventData
  after: FrigateEventData
}

export interface FrigateEventData {
  id: string
  camera: string
  frame_time: number // Unix timestamp (float)
  snapshot_time: number // Unix timestamp (float)
  label: string // Object type: person, car, etc.
  sub_label: string | null
  top_score: number
  false_positive: boolean
  start_time: number // Unix timestamp (float)
  end_time: number | null // Unix timestamp (float), null if ongoing
  score: number
  box: [number, number, number, number] // [x, y, width, height] normalized 0-1
  area: number
  ratio: number
  region: [number, number, number, number]
  stationary: boolean
  motionless_count: number
  position_changes: number
  current_zones: string[]
  entered_zones: string[]
  has_clip: boolean
  has_snapshot: boolean
  attributes: Record<string, unknown>
  current_attributes: FrigateAttribute[]
}

export interface FrigateAttribute {
  label: string
  score: number
  box: [number, number, number, number]
}

/**
 * Simplified event type for our internal use
 */
export interface FrigateWebhookEvent {
  eventId: string
  cameraId: string
  type: 'new' | 'update' | 'end'
  startTime: number // Unix timestamp (seconds)
  endTime: number | null
  duration: number | null // seconds
  label: string
  score: number
  hasClip: boolean
  hasSnapshot: boolean
  zones: string[]
}

/**
 * Parse Frigate webhook payload into our simplified format
 */
export function parseFrigateEvent(payload: FrigateEventPayload): FrigateWebhookEvent {
  const data = payload.after
  const startTime = Math.floor(data.start_time)
  const endTime = data.end_time ? Math.floor(data.end_time) : null

  return {
    eventId: data.id,
    cameraId: data.camera,
    type: payload.type,
    startTime,
    endTime,
    duration: endTime ? endTime - startTime : null,
    label: data.label,
    score: data.top_score,
    hasClip: data.has_clip,
    hasSnapshot: data.has_snapshot,
    zones: data.current_zones,
  }
}
