const API_BASE = import.meta.env.VITE_API_URL ?? ''

interface ApiOptions extends RequestInit {
  requireAuth?: boolean
}

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
    const { requireAuth = true, ...fetchOptions } = options

    const headers: HeadersInit = {
      'Content-Type': 'application/json',
      ...fetchOptions.headers,
    }

    if (requireAuth && this.token) {
      ;(headers as Record<string, string>)['Authorization'] = `Bearer ${this.token}`
    }

    const response = await fetch(`${API_BASE}${endpoint}`, {
      ...fetchOptions,
      headers,
    })

    const data = await response.json()

    if (!response.ok) {
      throw new ApiError(response.status, data.error, data.message)
    }

    return data
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

// Auth API
export const authApi = {
  login: async (pin: string): Promise<{ token: string; expiresAt: number }> => {
    const response = await api.post<{ success: true; data: { token: string; expiresAt: number } }>(
      '/api/auth/login',
      { pin },
      { requireAuth: false },
    )
    return response.data
  },

  logout: async (): Promise<void> => {
    await api.post('/api/auth/logout')
  },

  verify: async (): Promise<{ valid: boolean; expiresAt: number }> => {
    const response = await api.get<{ success: true; data: { valid: boolean; expiresAt: number } }>(
      '/api/auth/verify',
    )
    return response.data
  },
}

// Cameras API
export const camerasApi = {
  list: async (): Promise<Camera[]> => {
    const response = await api.get<{ success: true; data: Camera[] }>('/api/cameras')
    return response.data
  },

  get: async (id: string): Promise<Camera> => {
    const response = await api.get<{ success: true; data: Camera }>(`/api/cameras/${id}`)
    return response.data
  },
}

// System API
export const systemApi = {
  status: async (): Promise<SystemStatus> => {
    const response = await api.get<{ success: true; data: SystemStatus }>('/api/system/status')
    return response.data
  },

  health: async (): Promise<{ status: string; timestamp: number; version: string }> => {
    const response = await api.get<{ status: string; timestamp: number; version: string }>(
      '/api/health',
      { requireAuth: false },
    )
    return response
  },
}

// Settings API
export const settingsApi = {
  get: async (): Promise<Settings> => {
    const response = await api.get<{ success: true; data: Settings }>('/api/settings')
    return response.data
  },

  update: async (settings: Partial<Settings>): Promise<Settings> => {
    const response = await api.put<{ success: true; data: Settings }>('/api/settings', settings)
    return response.data
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

interface Settings {
  retentionDays: number
  theme: 'light' | 'dark' | 'system'
  notificationsEnabled: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string
  quietHoursEnd: string
  notificationCooldown: number
}
