// Camera types
export type {
  Camera,
  CameraHealth,
  CameraSettings,
  CameraStatus,
  MotionZone,
  RecordingSchedule,
} from './types/camera'

// Event types
export type { EventFilters, MotionEvent, PaginatedEvents } from './types/event'

// Frigate types
export type {
  FrigateAttribute,
  FrigateEventData,
  FrigateEventPayload,
  FrigateWebhookEvent,
} from './types/frigate'
export { parseFrigateEvent } from './types/frigate'

// Settings types
export type { AppSettings, NotificationSettings, SystemStatus } from './types/settings'

// User types
export type {
  User,
  CreateUserRequest,
  UpdateUserRequest,
  UpdatePinRequest,
} from './types/user'

// API types
export type {
  ApiError,
  ApiErrorResponse,
  ApiResponse,
  ApiResult,
  AuthSession,
  LoginRequest,
  LoginResponse,
} from './types/api'
