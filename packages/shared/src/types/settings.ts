export interface NotificationSettings {
  enabled: boolean
  quietHoursEnabled: boolean
  quietHoursStart: string // "HH:mm" format
  quietHoursEnd: string // "HH:mm" format
  cooldownSeconds: number
}

export interface AppSettings {
  retentionDays: number
  notifications: NotificationSettings
  theme: 'light' | 'dark' | 'system'
}

export interface SystemStatus {
  cpuTemperature: number
  memoryUsage: {
    used: number
    total: number
    percentage: number
  }
  diskUsage: {
    used: number
    total: number
    percentage: number
  }
  uptime: number // seconds
  services: {
    api: 'running' | 'stopped' | 'error'
    frigate: 'running' | 'stopped' | 'error'
    nginx: 'running' | 'stopped' | 'error'
  }
}
