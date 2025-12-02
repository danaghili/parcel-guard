export class ApiError extends Error {
  public readonly statusCode: number
  public readonly code: string
  public readonly details?: unknown

  constructor(statusCode: number, code: string, message: string, details?: unknown) {
    super(message)
    this.name = 'ApiError'
    this.statusCode = statusCode
    this.code = code
    this.details = details
  }

  toJSON(): { error: string; message: string; details?: unknown } {
    return {
      error: this.code,
      message: this.message,
      ...(this.details !== undefined && { details: this.details }),
    }
  }
}

// Common error factories
export const Errors = {
  unauthorized: (message = 'Authentication required'): ApiError =>
    new ApiError(401, 'UNAUTHORIZED', message),

  invalidCredentials: (message = 'Invalid PIN'): ApiError =>
    new ApiError(401, 'INVALID_CREDENTIALS', message),

  forbidden: (message = 'Access denied'): ApiError =>
    new ApiError(403, 'FORBIDDEN', message),

  notFound: (resource: string): ApiError =>
    new ApiError(404, 'NOT_FOUND', `${resource} not found`),

  badRequest: (message: string, details?: unknown): ApiError =>
    new ApiError(400, 'BAD_REQUEST', message, details),

  internal: (message = 'Internal server error'): ApiError =>
    new ApiError(500, 'INTERNAL_ERROR', message),
}
