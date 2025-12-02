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
}

export interface LoginRequest {
  pin: string
}

export interface LoginResponse {
  session: AuthSession
}
