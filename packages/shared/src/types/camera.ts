export type CameraStatus = 'online' | 'offline'

export interface MotionZone {
  id: string
  points: Array<{ x: number; y: number }>
}

export interface RecordingSchedule {
  enabled: boolean
  days: {
    monday: boolean
    tuesday: boolean
    wednesday: boolean
    thursday: boolean
    friday: boolean
    saturday: boolean
    sunday: boolean
  }
  startTime: string // "HH:mm" format
  endTime: string // "HH:mm" format
}

export interface CameraSettings {
  motionSensitivity: number // 0-100
  motionZones: MotionZone[]
  recordingSchedule: RecordingSchedule | null
  notificationsEnabled: boolean
  rotation: number // 0, 90, 180, or 270 degrees
}

export interface Camera {
  id: string
  name: string
  streamUrl: string
  status: CameraStatus
  lastSeen: number | null // Unix timestamp
  settings: CameraSettings
  createdAt: number
  updatedAt: number
}

export interface CameraHealth {
  cameraId: string
  temperature: number
  uptime: string
  ip: string
  timestamp: number
}
