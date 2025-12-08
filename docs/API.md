# ParcelGuard API Documentation

This document describes the ParcelGuard REST API. All endpoints use JSON for request and response bodies.

## Base URL

```
http://localhost:3000/api
```

## Authentication

Most endpoints require authentication via Bearer token. Obtain a token by logging in with your PIN.

```
Authorization: Bearer <token>
```

Endpoints marked with `No Auth` do not require authentication.

---

## Response Format

### Success Response

```json
{
  "success": true,
  "data": { ... }
}
```

### Error Response

```json
{
  "error": "ERROR_CODE",
  "message": "Human-readable error message"
}
```

### Common Error Codes

| Code | HTTP Status | Description |
|------|-------------|-------------|
| `BAD_REQUEST` | 400 | Invalid request parameters |
| `UNAUTHORIZED` | 401 | Missing or invalid authentication |
| `NOT_FOUND` | 404 | Resource not found |
| `CONFLICT` | 409 | Resource already exists |
| `INTERNAL_ERROR` | 500 | Server error |

---

## Endpoints

### Authentication

#### POST /api/auth/login

Authenticate with PIN and receive a session token.

**No Auth Required**

**Request Body:**
```json
{
  "pin": "1234"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "token": "abc123...",
    "expiresAt": 1701734400000
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid PIN

---

#### POST /api/auth/logout

Invalidate the current session.

**Response:**
```json
{
  "success": true
}
```

---

#### GET /api/auth/verify

Verify the current session is valid.

**Response:**
```json
{
  "success": true,
  "data": {
    "valid": true,
    "expiresAt": 1701734400000
  }
}
```

**Errors:**
- `401 UNAUTHORIZED` - Invalid or expired session

---

### Cameras

#### GET /api/cameras

List all configured cameras.

**Response:**
```json
{
  "success": true,
  "data": [
    {
      "id": "front-door",
      "name": "Front Door",
      "streamUrl": "rtsp://192.168.1.100:8554/stream",
      "status": "online",
      "lastSeen": 1701734400000,
      "settings": {
        "motionSensitivity": 50,
        "motionZones": [],
        "recordingSchedule": null,
        "notificationsEnabled": true
      },
      "createdAt": 1701648000000,
      "updatedAt": 1701734400000
    }
  ]
}
```

---

#### GET /api/cameras/:id

Get a single camera by ID.

**Parameters:**
- `id` (path) - Camera ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "front-door",
    "name": "Front Door",
    "streamUrl": "rtsp://192.168.1.100:8554/stream",
    "status": "online",
    "lastSeen": 1701734400000,
    "settings": { ... }
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Camera not found

---

#### POST /api/cameras

Create a new camera.

**Request Body:**
```json
{
  "id": "back-yard",
  "name": "Back Yard",
  "streamUrl": "rtsp://192.168.1.101:8554/stream",
  "motionSensitivity": 50,
  "notificationsEnabled": true
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `id` | string | Yes | Unique camera identifier |
| `name` | string | Yes | Display name |
| `streamUrl` | string | Yes | RTSP or HLS stream URL |
| `motionSensitivity` | number | No | 0-100, default 50 |
| `notificationsEnabled` | boolean | No | Default true |

**Response:** `201 Created`
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors:**
- `400 BAD_REQUEST` - Missing required fields
- `409 CONFLICT` - Camera ID already exists

---

#### PUT /api/cameras/:id

Update camera settings.

**Parameters:**
- `id` (path) - Camera ID

**Request Body:**
```json
{
  "name": "Front Door Camera",
  "streamUrl": "rtsp://192.168.1.100:8554/stream",
  "motionSensitivity": 75,
  "motionZones": [
    { "points": [[0,0], [100,0], [100,100], [0,100]] }
  ],
  "notificationsEnabled": false
}
```

All fields are optional - only include fields to update.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors:**
- `404 NOT_FOUND` - Camera not found

---

#### DELETE /api/cameras/:id

Delete a camera.

**Parameters:**
- `id` (path) - Camera ID

**Response:**
```json
{
  "success": true,
  "message": "Camera deleted"
}
```

**Errors:**
- `404 NOT_FOUND` - Camera not found

---

#### POST /api/cameras/:id/health

Receive health check from camera. Called by Pi Zero cameras.

**No Auth Required**

**Parameters:**
- `id` (path) - Camera ID

**Request Body:**
```json
{
  "temperature": 45.2,
  "uptime": "2d 5h 30m",
  "ip": "192.168.1.100"
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

#### POST /api/cameras/test-stream

Test if a stream URL is accessible.

**Request Body:**
```json
{
  "streamUrl": "rtsp://192.168.1.100:8554/stream"
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "accessible": true,
    "latency": 150
  }
}
```

Or on failure:
```json
{
  "success": true,
  "data": {
    "accessible": false,
    "error": "Connection timeout (10s)"
  }
}
```

---

### Events

#### GET /api/events

List motion events with filtering and pagination.

**Query Parameters:**

| Parameter | Type | Description |
|-----------|------|-------------|
| `cameraId` | string | Filter by camera |
| `startDate` | number | Unix timestamp (start of range) |
| `endDate` | number | Unix timestamp (end of range) |
| `startTime` | string | Time of day filter (HH:MM) |
| `endTime` | string | Time of day filter (HH:MM) |
| `isImportant` | boolean | Filter important events |
| `isFalseAlarm` | boolean | Filter false alarms |
| `page` | number | Page number (default: 1) |
| `pageSize` | number | Items per page (default: 20, max: 100) |

**Response:**
```json
{
  "success": true,
  "data": {
    "events": [
      {
        "id": "event-123",
        "cameraId": "front-door",
        "timestamp": 1701734400,
        "duration": 15,
        "thumbnailPath": "front-door/event-123.jpg",
        "videoPath": "front-door/event-123.mp4",
        "isImportant": false,
        "isFalseAlarm": false,
        "createdAt": 1701734400
      }
    ],
    "total": 150,
    "page": 1,
    "pageSize": 20,
    "hasMore": true
  }
}
```

---

#### GET /api/events/stats

Get event statistics.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 1250,
    "today": 23,
    "important": 15,
    "falseAlarms": 42
  }
}
```

---

#### GET /api/events/:id

Get a single event by ID.

**Parameters:**
- `id` (path) - Event ID

**Response:**
```json
{
  "success": true,
  "data": {
    "id": "event-123",
    "cameraId": "front-door",
    "timestamp": 1701734400,
    "duration": 15,
    "thumbnailPath": "front-door/event-123.jpg",
    "videoPath": "front-door/event-123.mp4",
    "isImportant": false,
    "isFalseAlarm": false,
    "createdAt": 1701734400
  }
}
```

**Errors:**
- `404 NOT_FOUND` - Event not found

---

#### PUT /api/events/:id

Update event flags.

**Parameters:**
- `id` (path) - Event ID

**Request Body:**
```json
{
  "isImportant": true,
  "isFalseAlarm": false
}
```

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

**Errors:**
- `404 NOT_FOUND` - Event not found

---

#### DELETE /api/events/:id

Delete a single event.

**Parameters:**
- `id` (path) - Event ID

**Response:**
```json
{
  "success": true,
  "message": "Event deleted"
}
```

**Errors:**
- `404 NOT_FOUND` - Event not found

---

#### POST /api/events/bulk-delete

Delete multiple events.

**Request Body:**
```json
{
  "ids": ["event-123", "event-456", "event-789"]
}
```

**Response:**
```json
{
  "success": true,
  "data": {
    "deletedCount": 3
  }
}
```

---

#### GET /api/events/:id/thumbnail

Get event thumbnail image.

**Parameters:**
- `id` (path) - Event ID

**Response:** `image/jpeg` binary data

**Headers:**
- `Content-Type: image/jpeg`
- `Cache-Control: public, max-age=31536000`

**Errors:**
- `404 NOT_FOUND` - Event or thumbnail not found

---

#### GET /api/events/:id/video

Stream event video clip.

**Parameters:**
- `id` (path) - Event ID

**Response:** `video/mp4` binary data

**Headers:**
- `Content-Type: video/mp4`
- `Accept-Ranges: bytes`

**Errors:**
- `404 NOT_FOUND` - Event or video not found

---

#### GET /api/events/:id/download

Download event video clip with proper filename.

**Parameters:**
- `id` (path) - Event ID

**Response:** `video/mp4` binary data

**Headers:**
- `Content-Type: video/mp4`
- `Content-Disposition: attachment; filename="parcelguard-front-door-2024-12-04T12-00-00.mp4"`

**Errors:**
- `404 NOT_FOUND` - Event or video not found

---

### Settings

#### GET /api/settings

Get application settings.

**Response:**
```json
{
  "success": true,
  "data": {
    "retentionDays": 30,
    "theme": "dark",
    "notificationsEnabled": true,
    "quietHoursEnabled": true,
    "quietHoursStart": "22:00",
    "quietHoursEnd": "07:00",
    "notificationCooldown": 60,
    "onboardingComplete": true
  }
}
```

---

#### PUT /api/settings

Update application settings.

**Request Body:**
```json
{
  "retentionDays": 14,
  "theme": "light",
  "notificationsEnabled": true,
  "quietHoursEnabled": true,
  "quietHoursStart": "23:00",
  "quietHoursEnd": "06:00",
  "notificationCooldown": 120
}
```

All fields are optional - only include fields to update.

**Response:**
```json
{
  "success": true,
  "data": { ... }
}
```

---

#### PUT /api/settings/pin

Change the login PIN.

**Request Body:**
```json
{
  "currentPin": "1234",
  "newPin": "5678"
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `currentPin` | string | Yes | Current PIN for verification |
| `newPin` | string | Yes | New PIN (4-8 digits) |

**Response:**
```json
{
  "success": true,
  "message": "PIN updated successfully"
}
```

**Errors:**
- `400 BAD_REQUEST` - Missing fields or invalid PIN format
- `401 UNAUTHORIZED` - Current PIN incorrect

---

### Notifications

#### GET /api/notifications/status

Get notification configuration status.

**Response:**
```json
{
  "success": true,
  "data": {
    "configured": true,
    "enabled": true,
    "quietHoursActive": false,
    "topic": "parcelguard-alerts"
  }
}
```

---

#### POST /api/notifications/test

Send a test notification.

**Response:**
```json
{
  "success": true,
  "message": "Test notification sent successfully"
}
```

**Errors:**
- `400 NOT_CONFIGURED` - NTFY_TOPIC not configured
- `500 NOTIFICATION_FAILED` - Failed to send notification

---

### System

#### GET /api/health

Basic health check endpoint.

**No Auth Required**

**Response:**
```json
{
  "status": "ok",
  "timestamp": 1701734400000,
  "version": "0.1.0"
}
```

---

#### GET /api/system/status

Get detailed system status.

**Response:**
```json
{
  "success": true,
  "data": {
    "version": "0.1.0",
    "uptime": 86400,
    "memory": {
      "used": 512000000,
      "total": 4096000000,
      "percentage": 12
    },
    "cameras": {
      "total": 4,
      "online": 3,
      "offline": 1
    }
  }
}
```

---

#### GET /api/system/storage

Get storage usage information.

**Response:**
```json
{
  "success": true,
  "data": {
    "total": 128849018880,
    "used": 64424509440,
    "available": 64424509440,
    "percentage": 50,
    "warning": false,
    "formatted": {
      "total": "120 GB",
      "used": "60 GB",
      "available": "60 GB"
    },
    "breakdown": {
      "clips": {
        "count": 1250,
        "size": 53687091200,
        "formatted": "50 GB"
      },
      "thumbnails": {
        "count": 1250,
        "size": 1073741824,
        "formatted": "1 GB"
      },
      "database": {
        "size": 52428800,
        "formatted": "50 MB"
      }
    }
  }
}
```

---

#### POST /api/system/storage/cleanup

Trigger manual storage cleanup (deletes events older than retention period).

**Response:**
```json
{
  "success": true,
  "data": {
    "eventsDeleted": 150,
    "filesDeleted": 300,
    "bytesFreed": 5368709120,
    "bytesFreedFormatted": "5 GB"
  }
}
```

---

### Motion Webhook

#### POST /api/motion/events

Receive motion events from Motion daemon.

**No Auth Required** (called internally by Motion)

**Request Body:**
```json
{
  "cameraId": "cam1",
  "eventId": "12345",
  "type": "start",
  "timestamp": 1701734400
}
```

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| `cameraId` | string | Yes | Camera identifier |
| `eventId` | string | Yes | Unique event identifier from Motion |
| `type` | string | Yes | Event type: `start` or `end` |
| `timestamp` | number | Yes | Unix timestamp (seconds) |

**Response:** `201 Created` for start events, `200 OK` for end events
```json
{
  "success": true,
  "data": {
    "id": "motion-cam1-12345",
    "cameraId": "cam1",
    "timestamp": 1701734400,
    "duration": null
  }
}
```

On `end` event, the duration is calculated from the actual video file length.

---

## Rate Limiting

Currently, there are no rate limits imposed on the API. This may change in future versions.

## Versioning

The API is currently at version 1.0 (unversioned URLs). Future breaking changes will be introduced with versioned URLs (e.g., `/api/v2/...`).
