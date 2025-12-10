import mqtt, { MqttClient } from 'mqtt'
import { updateCameraHealth } from './cameras'
import type { FastifyBaseLogger } from 'fastify'

// MQTT Topics
const TOPICS = {
  STATUS: 'parcelguard/+/status',      // Camera status updates (heartbeat)
  EVENT: 'parcelguard/+/event',        // Motion events from cameras
  COMMAND: (deviceId: string) => `parcelguard/${deviceId}/command`,
}

// Command types sent to cameras
export type CameraCommand =
  | { type: 'start_live_view' }
  | { type: 'stop_live_view' }
  | { type: 'pause_uploads' }
  | { type: 'resume_uploads' }

// Status message from camera
interface CameraStatus {
  deviceId: string
  state: 'idle' | 'motion' | 'uploading' | 'live' | 'live_motion'
  temperature?: number
  uptime?: number
  ip?: string
  timestamp: number
  uploads_paused?: boolean
  upload_queue_size?: number
  stream_ready?: boolean
}

// Event message from camera
interface CameraEvent {
  deviceId: string
  eventType: 'motion_start' | 'motion_end' | 'upload_complete'
  eventId?: string
  clipPath?: string
  thumbnailPath?: string
  timestamp: number
}

// Callbacks for external event handling
type StatusCallback = (status: CameraStatus) => void
type EventCallback = (event: CameraEvent) => void

class MQTTService {
  private client: MqttClient | null = null
  private log: FastifyBaseLogger | Console
  private brokerUrl: string
  private statusCallbacks: StatusCallback[] = []
  private eventCallbacks: EventCallback[] = []
  private connected = false
  private streamStatus: Map<string, boolean> = new Map()

  constructor(brokerUrl: string = 'mqtt://localhost:1883') {
    this.brokerUrl = brokerUrl
    this.log = console
  }

  setLogger(logger: FastifyBaseLogger): void {
    this.log = logger
  }

  async connect(): Promise<void> {
    if (this.client && this.connected) {
      this.log.info('MQTT already connected')
      return
    }

    return new Promise((resolve, reject) => {
      this.log.info(`Connecting to MQTT broker at ${this.brokerUrl}`)

      this.client = mqtt.connect(this.brokerUrl, {
        clientId: `parcelguard-hub-${Date.now()}`,
        clean: true,
        connectTimeout: 10000,
        reconnectPeriod: 5000,
      })

      this.client.on('connect', () => {
        this.connected = true
        this.log.info('MQTT connected successfully')

        // Subscribe to camera topics
        this.client!.subscribe([TOPICS.STATUS, TOPICS.EVENT], (err) => {
          if (err) {
            this.log.error({ err }, 'Failed to subscribe to MQTT topics')
            reject(err)
          } else {
            this.log.info('Subscribed to camera status and event topics')
            resolve()
          }
        })
      })

      this.client.on('message', (topic, payload) => {
        this.handleMessage(topic, payload)
      })

      this.client.on('error', (err) => {
        this.log.error({ err }, 'MQTT error')
      })

      this.client.on('offline', () => {
        this.connected = false
        this.log.warn('MQTT client offline')
      })

      this.client.on('reconnect', () => {
        this.log.info('MQTT reconnecting...')
      })

      // Reject after timeout if not connected
      setTimeout(() => {
        if (!this.connected) {
          reject(new Error('MQTT connection timeout'))
        }
      }, 15000)
    })
  }

  private handleMessage(topic: string, payload: Buffer): void {
    try {
      const message = JSON.parse(payload.toString())

      // Extract device ID from topic (parcelguard/{deviceId}/status or event)
      const parts = topic.split('/')
      if (parts.length < 3) return

      const deviceId = parts[1]
      const messageType = parts[2]

      if (messageType === 'status') {
        const status: CameraStatus = {
          deviceId,
          ...message,
          timestamp: message.timestamp || Date.now(),
        }
        this.handleStatus(status)
      } else if (messageType === 'event') {
        const event: CameraEvent = {
          deviceId,
          ...message,
          timestamp: message.timestamp || Date.now(),
        }
        this.handleEvent(event)
      }
    } catch (err) {
      this.log.error({ err, topic }, 'Failed to parse MQTT message')
    }
  }

  private handleStatus(status: CameraStatus): void {
    this.log.debug({ status }, 'Received camera status')

    // Track stream ready status if provided
    if (status.stream_ready !== undefined) {
      this.streamStatus.set(status.deviceId, status.stream_ready)
      this.log.info({ deviceId: status.deviceId, stream_ready: status.stream_ready }, 'Stream status updated')
    }

    // Update camera health in database
    try {
      updateCameraHealth(status.deviceId, {
        cameraId: status.deviceId,
        temperature: status.temperature || 0,
        uptime: status.uptime ? `${Math.floor(status.uptime / 60)}m` : 'unknown',
        ip: status.ip || 'unknown',
        timestamp: status.timestamp,
      })
    } catch (err) {
      // Camera might not exist yet, log but don't fail
      this.log.warn({ deviceId: status.deviceId, err }, 'Failed to update camera health')
    }

    // Notify registered callbacks
    this.statusCallbacks.forEach(cb => cb(status))
  }

  private handleEvent(event: CameraEvent): void {
    this.log.info({ event }, 'Received camera event')

    // Notify registered callbacks
    this.eventCallbacks.forEach(cb => cb(event))
  }

  /**
   * Send a command to a specific camera
   */
  sendCommand(deviceId: string, command: CameraCommand): boolean {
    if (!this.client || !this.connected) {
      this.log.error('Cannot send command: MQTT not connected')
      return false
    }

    const topic = TOPICS.COMMAND(deviceId)
    const payload = JSON.stringify({
      ...command,
      timestamp: Date.now(),
    })

    this.client.publish(topic, payload, { qos: 1 }, (err) => {
      if (err) {
        this.log.error({ err, deviceId, command }, 'Failed to send command')
      } else {
        this.log.info({ deviceId, command }, 'Command sent')
      }
    })

    return true
  }

  /**
   * Request a camera to start live streaming
   */
  startLiveView(deviceId: string): boolean {
    return this.sendCommand(deviceId, { type: 'start_live_view' })
  }

  /**
   * Request a camera to stop live streaming
   */
  stopLiveView(deviceId: string): boolean {
    return this.sendCommand(deviceId, { type: 'stop_live_view' })
  }

  /**
   * Pause uploads on a camera (frees bandwidth for live streaming)
   */
  pauseUploads(deviceId: string): boolean {
    return this.sendCommand(deviceId, { type: 'pause_uploads' })
  }

  /**
   * Resume uploads on a camera
   */
  resumeUploads(deviceId: string): boolean {
    return this.sendCommand(deviceId, { type: 'resume_uploads' })
  }

  /**
   * Pause uploads on all cameras (for bandwidth priority during live view)
   */
  pauseAllUploads(cameraIds: string[]): void {
    this.log.info({ cameraIds }, 'Pausing uploads on all cameras')
    for (const id of cameraIds) {
      this.pauseUploads(id)
    }
  }

  /**
   * Resume uploads on all cameras
   */
  resumeAllUploads(cameraIds: string[]): void {
    this.log.info({ cameraIds }, 'Resuming uploads on all cameras')
    for (const id of cameraIds) {
      this.resumeUploads(id)
    }
  }

  /**
   * Register a callback for camera status updates
   */
  onStatus(callback: StatusCallback): void {
    this.statusCallbacks.push(callback)
  }

  /**
   * Register a callback for camera events
   */
  onEvent(callback: EventCallback): void {
    this.eventCallbacks.push(callback)
  }

  /**
   * Check if connected to broker
   */
  isConnected(): boolean {
    return this.connected
  }

  /**
   * Get stream ready status for a camera
   */
  getStreamStatus(deviceId: string): boolean {
    return this.streamStatus.get(deviceId) ?? false
  }

  /**
   * Disconnect from broker
   */
  async disconnect(): Promise<void> {
    if (this.client) {
      return new Promise((resolve) => {
        this.client!.end(false, {}, () => {
          this.connected = false
          this.log.info('MQTT disconnected')
          resolve()
        })
      })
    }
  }
}

// Singleton instance
const mqttService = new MQTTService(process.env.MQTT_BROKER_URL || 'mqtt://localhost:1883')

export { mqttService, MQTTService }
export type { CameraStatus, CameraEvent }
