const API_BASE = import.meta.env.VITE_API_URL ?? ''

// Retry configuration
const MAX_RETRIES = 3
const INITIAL_RETRY_DELAY = 1000 // 1 second
const MAX_RETRY_DELAY = 10000 // 10 seconds

// HTTP status codes that should trigger a retry
const RETRYABLE_STATUS_CODES = [408, 429, 500, 502, 503, 504]

interface ApiOptions extends RequestInit {
  requireAuth?: boolean
  retry?: boolean // Enable/disable retry for this request (default: true for GET, false for mutations)
  maxRetries?: number // Override max retries for this request
  useCache?: boolean // Enable response caching for this request (default: false)
  cacheTtl?: number // Cache TTL in milliseconds (default: 30000)
}

/**
 * Check if an error is retryable (network error or server error)
 */
function isRetryableError(error: unknown, status?: number): boolean {
  // Network errors (fetch throws TypeError for network issues)
  if (error instanceof TypeError) {
    return true
  }
  // Server errors that might be transient
  if (status && RETRYABLE_STATUS_CODES.includes(status)) {
    return true
  }
  return false
}

/**
 * Calculate delay with exponential backoff and jitter
 */
function getRetryDelay(attempt: number): number {
  const baseDelay = INITIAL_RETRY_DELAY * Math.pow(2, attempt)
  const jitter = Math.random() * 0.3 * baseDelay // Add 0-30% jitter
  return Math.min(baseDelay + jitter, MAX_RETRY_DELAY)
}

/**
 * Sleep for a given number of milliseconds
 */
function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms))
}

/**
 * Simple in-memory cache with TTL
 */
interface CacheEntry<T> {
  data: T
  expiresAt: number
}

class ApiCache {
  private cache = new Map<string, CacheEntry<unknown>>()
  private defaultTtl = 30000 // 30 seconds default

  get<T>(key: string): T | null {
    const entry = this.cache.get(key)
    if (!entry) return null
    if (Date.now() > entry.expiresAt) {
      this.cache.delete(key)
      return null
    }
    return entry.data as T
  }

  set<T>(key: string, data: T, ttl?: number): void {
    this.cache.set(key, {
      data,
      expiresAt: Date.now() + (ttl ?? this.defaultTtl),
    })
  }

  invalidate(pattern?: string): void {
    if (!pattern) {
      this.cache.clear()
      return
    }
    // Invalidate keys matching pattern
    for (const key of this.cache.keys()) {
      if (key.includes(pattern)) {
        this.cache.delete(key)
      }
    }
  }

  // Clean up expired entries periodically
  cleanup(): void {
    const now = Date.now()
    for (const [key, entry] of this.cache.entries()) {
      if (now > entry.expiresAt) {
        this.cache.delete(key)
      }
    }
  }
}

const apiCache = new ApiCache()

// Cleanup expired cache entries every 60 seconds
setInterval(() => apiCache.cleanup(), 60000)

class ApiClient {
  private token: string | null = null

  constructor() {
    this.token = localStorage.getItem('auth_token')
  }

  setToken(token: string | null): void {
    this.token = token
    if (token) {
      localStorage.setItem('auth_token', token)
    } else {
      localStorage.removeItem('auth_token')
    }
  }

  getToken(): string | null {
    return this.token
  }

  private async request<T>(
    endpoint: string,
    options: ApiOptions = {},
  ): Promise<T> {
    const { requireAuth = true, retry, maxRetries = MAX_RETRIES, useCache = false, cacheTtl, ...fetchOptions } = options

    // By default, only retry GET requests (safe to retry)
    const shouldRetry = retry ?? fetchOptions.method === 'GET'

    // Generate cache key for GET requests
    const cacheKey = `${fetchOptions.method ?? 'GET'}:${endpoint}`

    // Check cache first for GET requests with caching enabled
    if (useCache && fetchOptions.method === 'GET') {
      const cached = apiCache.get<T>(cacheKey)
      if (cached) {
        return cached
      }
    }

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (requireAuth && this.token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    let lastError: Error | null = null
    let attempt = 0

    while (attempt <= (shouldRetry ? maxRetries : 0)) {
      try {
        const response = await fetch(`${API_BASE}${endpoint}`, {
          ...fetchOptions,
          headers,
        })

        // Check if we should retry based on status code
        if (!response.ok && shouldRetry && isRetryableError(null, response.status) && attempt < maxRetries) {
          attempt++
          const delay = getRetryDelay(attempt - 1)
          console.debug(`API request to ${endpoint} failed with status ${response.status}, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`)
          await sleep(delay)
          continue
        }

        const data = await response.json()

        if (!response.ok) {
          throw new ApiError(response.status, data.error, data.message)
        }

        // Cache successful GET responses if caching is enabled
        if (useCache && fetchOptions.method === 'GET') {
          apiCache.set(cacheKey, data, cacheTtl)
        }

        return data
      } catch (error) {
        lastError = error as Error

        // Don't retry ApiErrors (they're already processed responses)
        if (error instanceof ApiError) {
          throw error
        }

        // Check if this is a retryable network error
        if (shouldRetry && isRetryableError(error) && attempt < maxRetries) {
          attempt++
          const delay = getRetryDelay(attempt - 1)
          console.debug(`API request to ${endpoint} failed with network error, retrying in ${Math.round(delay)}ms (attempt ${attempt}/${maxRetries})`)
          await sleep(delay)
          continue
        }

        // Not retryable or max retries exceeded
        throw error
      }
    }

    // Should not reach here, but just in case
    throw lastError ?? new Error('Request failed after max retries')
  }

  /**
   * Invalidate cached responses matching a pattern
   */
  invalidateCache(pattern?: string): void {
    apiCache.invalidate(pattern)
  }

  async get<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'GET' })
  }

  async post<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'POST',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async put<T>(endpoint: string, body?: unknown, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, {
      ...options,
      method: 'PUT',
      body: body ? JSON.stringify(body) : undefined,
    })
  }

  async delete<T>(endpoint: string, options?: ApiOptions): Promise<T> {
    return this.request<T>(endpoint, { ...options, method: 'DELETE' })
  }
}

export class ApiError extends Error {
  constructor(
    public status: number,
    public code: string,
    message: string,
  ) {
    super(message)
    this.name = 'ApiError'
  }
}

export const api = new ApiClient()

// User type for auth responses
export interface User {
  id: string
  username: string
  displayName: string | null
  isAdmin: boolean
  enabled: boolean
  createdAt: number
}

// Auth API
export const authApi = {
  login: async (username: string, pin: string): Promise<{ token: string; expiresAt: number; user: User }> => {
    const response = await api.post<{ success: true; data: { token: string; expiresAt: number; user: User } }>(
      '/api/auth/login',
      { username, pin },
      { requireAuth: false },
    )
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  verify: async (): Promise<{ valid: boolean; expiresAt: number; user: User }> => {
    const response = await api.get<{ success: true; data: { valid: boolean; expiresAt: number; user: User } }>(
      '/api/auth/verify',
    )
    return response.data
  },
}

// Users API (admin only)
export const usersApi = {
  list: async (): Promise<User[]> => {
    const response = await api.get<{ success: true; data: User[] }>('/api/users')
    return response.data
  },

  get: async (id: string): Promise<User> => {
    const response = await api.get<{ success: true; data: User }>(`/api/users/${id}`)
    return response.data
  },

  create: async (data: { username: string; pin: string; displayName?: string; isAdmin?: boolean }): Promise<User> => {
    const response = await api.post<{ success: true; data: User }>('/api/users', data)
    return response.data
  },

  update: async (id: string, data: { displayName?: string; isAdmin?: boolean; enabled?: boolean }): Promise<User> => {
    const response = await api.put<{ success: true; data: User }>(`/api/users/${id}`, data)
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/users/${id}`)
  },

  updatePin: async (id: string, newPin: string, currentPin?: string): Promise<void> => {
    await api.put(`/api/users/${id}/pin`, { newPin, currentPin })
  },
}

// Cameras API
export const camerasApi = {
  list: async (): Promise<Camera[]> => {
    const response = await api.get<{ success: true; data: Camera[] }>('/api/cameras', {
      useCache: true,
      cacheTtl: 15000, // 15 seconds - cameras don't change often
    })
    return response.data
  },

  get: async (id: string): Promise<Camera> => {
    const response = await api.get<{ success: true; data: Camera }>(`/api/cameras/${id}`, {
      useCache: true,
      cacheTtl: 15000,
    })
    return response.data
  },

  create: async (data: CreateCameraInput): Promise<Camera> => {
    const response = await api.post<{ success: true; data: Camera }>('/api/cameras', data)
    api.invalidateCache('/api/cameras') // Invalidate camera list cache
    return response.data
  },

  update: async (id: string, data: UpdateCameraInput): Promise<Camera> => {
    const response = await api.put<{ success: true; data: Camera }>(`/api/cameras/${id}`, data)
    api.invalidateCache('/api/cameras') // Invalidate camera caches
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/cameras/${id}`)
    api.invalidateCache('/api/cameras') // Invalidate camera caches
  },

  testStream: async (streamUrl: string): Promise<StreamTestResult> => {
    const response = await api.post<{ success: true; data: StreamTestResult }>(
      '/api/cameras/test-stream',
      { streamUrl },
    )
    return response.data
  },

  startLiveView: async (id: string): Promise<void> => {
    await api.post(`/api/cameras/${id}/live/start`, {})
  },

  stopLiveView: async (id: string): Promise<void> => {
    await api.post(`/api/cameras/${id}/live/stop`, {})
  },

  getStreamStatus: async (id: string): Promise<boolean> => {
    const response = await api.get<{ success: true; data: { ready: boolean } }>(
      `/api/cameras/${id}/stream-status`,
    )
    return response.data.ready
  },
}

// System API
export const systemApi = {
  status: async (): Promise<SystemStatus> => {
    const response = await api.get<{ success: true; data: SystemStatus }>('/api/system/status', {
      useCache: true,
      cacheTtl: 10000, // 10 seconds - status changes frequently
    })
    return response.data
  },

  health: async (): Promise<{ status: string; timestamp: number; version: string }> => {
    const response = await api.get<{ status: string; timestamp: number; version: string }>(
      '/api/health',
      { requireAuth: false, useCache: true, cacheTtl: 5000 }, // 5 seconds
    )
    return response
  },

  storage: async (): Promise<StorageStats> => {
    const response = await api.get<{ success: true; data: StorageStats }>('/api/system/storage')
    return response.data
  },

  cleanup: async (): Promise<CleanupResult> => {
    const response = await api.post<{ success: true; data: CleanupResult }>(
      '/api/system/storage/cleanup',
      {},
    )
    return response.data
  },
}

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await api.get<{ success: true; data: Settings }>('/api/settings', {
      useCache: true,
      cacheTtl: 30000, // 30 seconds - settings rarely change
    })
    return response.data
  },

  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await api.put<{ success: true; data: Settings }>('/api/settings', settings)
    api.invalidateCache('/api/settings') // Invalidate settings cache
    return response.data
  },

  getNotificationStatus: async (): Promise<NotificationStatus> => {
    const response = await api.get<{ success: true; data: NotificationStatus }>(
      '/api/notifications/status',
      { useCache: true, cacheTtl: 30000 },
    )
    return response.data
  },

  testNotification: async (): Promise<{ success: boolean; message: string }> => {
    const response = await api.post<{ success: boolean; message: string }>(
      '/api/notifications/test',
      {},
    )
    return response
  },
}

// Events API
export const eventsApi = {
  list: async (
    filters: EventFilters = {},
    page = 1,
    pageSize = 20,
  ): Promise<PaginatedEvents> => {
    const params = new URLSearchParams()
    if (filters.cameraId) params.set('cameraId', filters.cameraId)
    if (filters.startDate) params.set('startDate', filters.startDate.toString())
    if (filters.endDate) params.set('endDate', filters.endDate.toString())
    if (filters.startTime) params.set('startTime', filters.startTime)
    if (filters.endTime) params.set('endTime', filters.endTime)
    if (filters.isImportant !== undefined) params.set('isImportant', filters.isImportant.toString())
    if (filters.isFalseAlarm !== undefined) params.set('isFalseAlarm', filters.isFalseAlarm.toString())
    params.set('page', page.toString())
    params.set('pageSize', pageSize.toString())

    const response = await api.get<{ success: true; data: PaginatedEvents }>(
      `/api/events?${params.toString()}`,
    )
    return response.data
  },

  get: async (id: string): Promise<MotionEvent> => {
    const response = await api.get<{ success: true; data: MotionEvent }>(`/api/events/${id}`)
    return response.data
  },

  getStats: async (): Promise<EventStats> => {
    const response = await api.get<{ success: true; data: EventStats }>('/api/events/stats', {
      useCache: true,
      cacheTtl: 15000, // 15 seconds - stats shown on dashboard
    })
    return response.data
  },

  update: async (
    id: string,
    data: { isImportant?: boolean; isFalseAlarm?: boolean },
  ): Promise<MotionEvent> => {
    const response = await api.put<{ success: true; data: MotionEvent }>(`/api/events/${id}`, data)
    api.invalidateCache('/api/events') // Invalidate event caches
    return response.data
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/api/events/${id}`)
    api.invalidateCache('/api/events') // Invalidate event caches
  },

  bulkDelete: async (ids: string[]): Promise<{ deletedCount: number }> => {
    const response = await api.post<{ success: true; data: { deletedCount: number } }>(
      '/api/events/bulk-delete',
      { ids },
    )
    api.invalidateCache('/api/events') // Invalidate event caches
    return response.data
  },

  // URL builders for media (use token in URL for authenticated requests)
  getThumbnailUrl: (id: string): string => {
    return `${API_BASE}/api/events/${id}/thumbnail`
  },

  getVideoUrl: (id: string): string => {
    return `${API_BASE}/api/events/${id}/video`
  },

  getDownloadUrl: (id: string): string => {
    return `${API_BASE}/api/events/${id}/download`
  },
}

// Types (simplified versions - full types in @parcelguard/shared)
export interface Camera {
  id: string
  name: string
  streamUrl: string
  status: 'online' | 'offline'
  lastSeen: number | null
  settings?: {
    motionSensitivity: number
    motionZones: unknown[]
    recordingSchedule: unknown | null
    notificationsEnabled: boolean
  }
  createdAt?: number
  updatedAt?: number
}

interface SystemStatus {
  version: string
  uptime: number
  memory: {
    used: number
    total: number
    percentage: number
  }
  cameras: {
    total: number
    online: number
    offline: number
  }
}

export interface Settings {
  retentionDays: number
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  notificationCooldown: number
  onboardingComplete: boolean
}

export interface NotificationStatus {
  configured: boolean
  enabled: boolean
  quietHoursActive: boolean
  topic: string | null
}

// Event types
export interface MotionEvent {
  id: string
  cameraId: string
  timestamp: number
  duration: number | null
  thumbnailPath: string | null
  videoPath: string | null
  isImportant: boolean
  isFalseAlarm: boolean
  createdAt: number
}

export interface EventFilters {
  cameraId?: string
  startDate?: number
  endDate?: number
  startTime?: string
  endTime?: string
  isImportant?: boolean
  isFalseAlarm?: boolean
}

export interface PaginatedEvents {
  events: MotionEvent[]
  total: number
  page: number
  pageSize: number
  hasMore: boolean
}

export interface EventStats {
  total: number
  today: number
  important: number
  falseAlarms: number
}

// Camera input types
export interface CreateCameraInput {
  id: string
  name: string
  streamUrl: string
  motionSensitivity?: number
  notificationsEnabled?: boolean
}

export interface UpdateCameraInput {
  name?: string
  streamUrl?: string
  motionSensitivity?: number
  notificationsEnabled?: boolean
}

export interface StreamTestResult {
  accessible: boolean
  latency?: number
  error?: string
}

// Storage types
export interface StorageStats {
  total: number
  used: number
  available: number
  percentage: number
  warning: boolean
  formatted: {
    total: string
    used: string
    available: string
  }
  breakdown: {
    clips: { count: number; size: number; formatted: string }
    thumbnails: { count: number; size: number; formatted: string }
    database: { size: number; formatted: string }
  }
}

export interface CleanupResult {
  eventsDeleted: number
  filesDeleted: number
  bytesFreed: number
}
