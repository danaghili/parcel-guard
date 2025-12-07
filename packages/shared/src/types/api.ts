import type { User } from './user'

export interface ApiError {
  error: string
  message: string
  details?: unknown
}

export interface ApiResponse<T> {
  success: true
  data: T
}

export interface ApiErrorResponse {
  success: false
  error: ApiError
}

export type ApiResult<T> = ApiResponse<T> | ApiErrorResponse

export interface AuthSession {
  token: string
  expiresAt: number
  user: User
}

export interface LoginRequest {
  username: string
  pin: string
}

export interface LoginResponse {
  token: string
  expiresAt: number
  user: User
}
