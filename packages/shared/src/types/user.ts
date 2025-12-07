export interface User {
  id: string
  username: string
  displayName: string | null
  isAdmin: boolean
  enabled: boolean
  createdAt: number
}

export interface CreateUserRequest {
  username: string
  pin: string
  displayName?: string
  isAdmin?: boolean
}

export interface UpdateUserRequest {
  displayName?: string
  isAdmin?: boolean
  enabled?: boolean
}

export interface UpdatePinRequest {
  currentPin?: string
  newPin: string
}
