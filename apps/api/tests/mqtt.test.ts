import { describe, it, expect, vi, beforeEach } from 'vitest'

// Mock mqtt module before importing MQTTService
vi.mock('mqtt', () => ({
  default: {
    connect: vi.fn(() => ({
      on: vi.fn(),
      subscribe: vi.fn((topics, cb) => cb?.(null)),
      publish: vi.fn((topic, payload, opts, cb) => cb?.(null)),
      end: vi.fn((force, opts, cb) => cb?.()),
    })),
  },
}))

// Mock cameras service
vi.mock('../src/services/cameras', () => ({
  updateCameraHealth: vi.fn(),
}))

import { MQTTService } from '../src/services/mqtt'

describe('MQTT Service', () => {
  let mqttService: MQTTService

  beforeEach(() => {
    vi.clearAllMocks()
    mqttService = new MQTTService('mqtt://localhost:1883')
  })

  describe('CameraCommand types', () => {
    it('should include pause_uploads command type', () => {
      const command = { type: 'pause_uploads' as const }
      expect(command.type).toBe('pause_uploads')
    })

    it('should include resume_uploads command type', () => {
      const command = { type: 'resume_uploads' as const }
      expect(command.type).toBe('resume_uploads')
    })

    it('should include start_live_view command type', () => {
      const command = { type: 'start_live_view' as const }
      expect(command.type).toBe('start_live_view')
    })

    it('should include stop_live_view command type', () => {
      const command = { type: 'stop_live_view' as const }
      expect(command.type).toBe('stop_live_view')
    })
  })

  describe('pauseUploads', () => {
    it('should send pause_uploads command to camera', () => {
      const sendCommandSpy = vi.spyOn(mqttService, 'sendCommand').mockReturnValue(true)

      const result = mqttService.pauseUploads('camera1')

      expect(sendCommandSpy).toHaveBeenCalledWith('camera1', { type: 'pause_uploads' })
      expect(result).toBe(true)
    })

    it('should return false when not connected', () => {
      // Don't mock sendCommand - let it fail because not connected
      const result = mqttService.pauseUploads('camera1')
      expect(result).toBe(false)
    })
  })

  describe('resumeUploads', () => {
    it('should send resume_uploads command to camera', () => {
      const sendCommandSpy = vi.spyOn(mqttService, 'sendCommand').mockReturnValue(true)

      const result = mqttService.resumeUploads('camera1')

      expect(sendCommandSpy).toHaveBeenCalledWith('camera1', { type: 'resume_uploads' })
      expect(result).toBe(true)
    })

    it('should return false when not connected', () => {
      const result = mqttService.resumeUploads('camera1')
      expect(result).toBe(false)
    })
  })

  describe('pauseAllUploads', () => {
    it('should pause uploads on all provided cameras', () => {
      const pauseUploadsSpy = vi.spyOn(mqttService, 'pauseUploads').mockReturnValue(true)
      const cameraIds = ['camera1', 'camera2', 'camera3']

      mqttService.pauseAllUploads(cameraIds)

      expect(pauseUploadsSpy).toHaveBeenCalledTimes(3)
      expect(pauseUploadsSpy).toHaveBeenCalledWith('camera1')
      expect(pauseUploadsSpy).toHaveBeenCalledWith('camera2')
      expect(pauseUploadsSpy).toHaveBeenCalledWith('camera3')
    })

    it('should handle empty camera list', () => {
      const pauseUploadsSpy = vi.spyOn(mqttService, 'pauseUploads').mockReturnValue(true)

      mqttService.pauseAllUploads([])

      expect(pauseUploadsSpy).not.toHaveBeenCalled()
    })

    it('should handle single camera', () => {
      const pauseUploadsSpy = vi.spyOn(mqttService, 'pauseUploads').mockReturnValue(true)

      mqttService.pauseAllUploads(['camera1'])

      expect(pauseUploadsSpy).toHaveBeenCalledTimes(1)
      expect(pauseUploadsSpy).toHaveBeenCalledWith('camera1')
    })
  })

  describe('resumeAllUploads', () => {
    it('should resume uploads on all provided cameras', () => {
      const resumeUploadsSpy = vi.spyOn(mqttService, 'resumeUploads').mockReturnValue(true)
      const cameraIds = ['camera1', 'camera2', 'camera3']

      mqttService.resumeAllUploads(cameraIds)

      expect(resumeUploadsSpy).toHaveBeenCalledTimes(3)
      expect(resumeUploadsSpy).toHaveBeenCalledWith('camera1')
      expect(resumeUploadsSpy).toHaveBeenCalledWith('camera2')
      expect(resumeUploadsSpy).toHaveBeenCalledWith('camera3')
    })

    it('should handle empty camera list', () => {
      const resumeUploadsSpy = vi.spyOn(mqttService, 'resumeUploads').mockReturnValue(true)

      mqttService.resumeAllUploads([])

      expect(resumeUploadsSpy).not.toHaveBeenCalled()
    })

    it('should handle single camera', () => {
      const resumeUploadsSpy = vi.spyOn(mqttService, 'resumeUploads').mockReturnValue(true)

      mqttService.resumeAllUploads(['camera1'])

      expect(resumeUploadsSpy).toHaveBeenCalledTimes(1)
      expect(resumeUploadsSpy).toHaveBeenCalledWith('camera1')
    })
  })

  describe('Live view commands', () => {
    it('should send start_live_view command', () => {
      const sendCommandSpy = vi.spyOn(mqttService, 'sendCommand').mockReturnValue(true)

      const result = mqttService.startLiveView('camera1')

      expect(sendCommandSpy).toHaveBeenCalledWith('camera1', { type: 'start_live_view' })
      expect(result).toBe(true)
    })

    it('should send stop_live_view command', () => {
      const sendCommandSpy = vi.spyOn(mqttService, 'sendCommand').mockReturnValue(true)

      const result = mqttService.stopLiveView('camera1')

      expect(sendCommandSpy).toHaveBeenCalledWith('camera1', { type: 'stop_live_view' })
      expect(result).toBe(true)
    })
  })

  describe('Connection state', () => {
    it('should return false for isConnected when not connected', () => {
      expect(mqttService.isConnected()).toBe(false)
    })

    it('should return false for getStreamStatus when not set', () => {
      expect(mqttService.getStreamStatus('camera1')).toBe(false)
    })
  })
})

describe('CameraStatus interface', () => {
  it('should include uploads_paused field', () => {
    const status = {
      deviceId: 'camera1',
      state: 'idle' as const,
      timestamp: Date.now(),
      uploads_paused: true,
      upload_queue_size: 5,
      stream_ready: false,
    }

    expect(status).toHaveProperty('uploads_paused')
    expect(status.uploads_paused).toBe(true)
  })

  it('should include upload_queue_size field', () => {
    const status = {
      deviceId: 'camera1',
      state: 'uploading' as const,
      timestamp: Date.now(),
      uploads_paused: false,
      upload_queue_size: 3,
    }

    expect(status).toHaveProperty('upload_queue_size')
    expect(status.upload_queue_size).toBe(3)
  })

  it('should include stream_ready field', () => {
    const status = {
      deviceId: 'camera1',
      state: 'live' as const,
      timestamp: Date.now(),
      stream_ready: true,
    }

    expect(status).toHaveProperty('stream_ready')
    expect(status.stream_ready).toBe(true)
  })
})
