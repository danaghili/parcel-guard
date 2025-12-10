# ParcelGuard - System Architecture

## Overview

ParcelGuard is a DIY multi-camera security system for monitoring communal areas in residential buildings, focused on detecting and recording parcel theft. The system consists of battery-powered camera units, a central processing hub, and a mobile-accessible web application.

**Version:** 0.10.0
**Last Updated:** December 9, 2024

---

## System Diagram

```
                                    INTERNET
                                        │
                    ┌───────────────────┴───────────────────┐
                    │                                       │
                    ▼                                       ▼
        ┌─────────────────────┐               ┌─────────────────────┐
        │   Tailscale Funnel  │               │     ntfy.sh         │
        │   (Public HTTPS)    │               │   (Push Notify)     │
        └──────────┬──────────┘               └──────────▲──────────┘
                   │                                     │
                   │ :80 (proxied)                       │
    ═══════════════╪═════════════════════════════════════╪══════════════════
                   │            TAILSCALE VPN            │
    ═══════════════╪═════════════════════════════════════╪══════════════════
                   │                                     │
                   ▼                                     │
    ┌──────────────────────────────────────────────────────────────────────┐
    │                         PI 4 HUB (100.72.88.127)                     │
    │                                                                      │
    │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌───────────────┐   │
    │  │   Nginx    │  │  Fastify   │  │   MQTT     │  │   MediaMTX    │   │
    │  │   :80      │◄─┤  API :3000 │◄─┤  Mosquitto │  │   (HLS :8888) │   │
    │  └─────┬──────┘  └─────┬──────┘  └──────┬─────┘  └───────▲───────┘   │
    │        │               │                │                │           │
    │        │ /streams/* ───────────────────────────────────►─┘           │
    │        │ (proxy)       │                │                            │
    │        │         ┌─────▼──────┐         │                            │
    │        │         │   SQLite   │         │ MQTT pub/sub               │
    │        │         │  Database  │         │ (events, status)           │
    │        │         └────────────┘         │                            │
    │        │                                │                            │
    │        │         ┌──────────────────────▼────────────────┐           │
    │        │         │       240GB SSD (/mnt/ssd)            │           │
    │  ┌─────▼──────┐  │  ┌──────────┐ ┌─────────┐ ┌─────────┐ │           │
    │  │  React PWA │  │  │  clips/  │ │ thumbs/ │ │  data/  │ │           │
    │  │  (static)  │  │  │  (video) │ │ (jpeg)  │ │ (db)    │ │           │
    │  └────────────┘  │  └──────────┘ └─────────┘ └─────────┘ │           │
    │                  └───────────────────────────────────────┘           │
    │                                                                      │
    │   MediaMTX receives RTSP from cameras on-demand, converts to HLS     │
    │   Nginx proxies /streams/* to MediaMTX for Funnel access             │
    └──────────────────────────────────────────────────────────────────────┘
                   ▲                                     ▲
                   │ RTSP :8554 (on-demand)              │ RTSP :8554
                   │ MQTT (status/events)                │ MQTT
                   │ (via Tailscale)                     │ (via Tailscale)
    ┌──────────────┴───────────────┐    ┌───────────────┴──────────────────┐
    │  PI ZERO 2W - CAM1           │    │  PI ZERO 2W - CAM2               │
    │  (100.120.125.42)            │    │  (100.69.12.33)                  │
    │                              │    │                                  │
    │  ┌─────────────────────────┐ │    │  ┌─────────────────────────┐     │
    │  │   Motion Detection      │ │    │  │   Motion Detection      │     │
    │  │   (on-device Python)    │ │    │  │   (on-device Python)    │     │
    │  │                         │ │    │  │                         │     │
    │  │  Camera Module 3        │ │    │  │  Camera Module 3        │     │
    │  │       ↓                 │ │    │  │       ↓                 │     │
    │  │  Picamera2 + OpenCV     │ │    │  │  Picamera2 + OpenCV     │     │
    │  │       ↓                 │ │    │  │       ↓                 │     │
    │  │  Motion → Record clip   │ │    │  │  Motion → Record clip   │     │
    │  │       ↓                 │ │    │  │       ↓                 │     │
    │  │  SCP to hub + MQTT      │ │    │  │  SCP to hub + MQTT      │     │
    │  └─────────────────────────┘ │    │  └─────────────────────────┘     │
    │                              │    │                                  │
    │  States: IDLE → MOTION →     │    │  States: IDLE → MOTION →         │
    │          UPLOADING → IDLE    │    │          UPLOADING → IDLE        │
    │          LIVE_VIEW (on-demand)    │          LIVE_VIEW (on-demand)   │
    │                              │    │                                  │
    │  Power: 20,000mAh USB Bank   │    │  Power: 20,000mAh USB Bank       │
    └──────────────────────────────┘    └──────────────────────────────────┘
```

---

## Hardware Components

### Central Hub

| Component | Specification | Purpose |
|-----------|---------------|---------|
| Raspberry Pi 4 | 4GB RAM | Central processing, API server, media server |
| Storage | microSD 32GB + 240GB SSD | OS boot + video/data storage (SSD) |
| Case | Argon ONE M.2 | Cooling + SSD mounting |
| Power | Official Pi 4 USB-C 5.1V 3A | Continuous power |
| Network | WiFi (home network) + Tailscale VPN | Local + remote access |

### Camera Units (×2)

| Component | Specification | Purpose |
|-----------|---------------|---------|
| Raspberry Pi Zero 2W | Headerless | Streaming unit |
| Camera | Camera Module 3 (or OV5647) | 1080p video capture |
| Storage | microSD 16GB | OS only (no local recording) |
| Power | 20,000mAh USB bank | ~36-48 hours runtime |
| Network | 4G WiFi + Tailscale VPN | Cross-network streaming |

### Network Topology

| Device | Local IP | Tailscale IP | Hostname |
|--------|----------|--------------|----------|
| Hub | 192.168.x.x | 100.72.88.127 | parcelguard-hub |
| Cam1 | 192.168.x.x | 100.120.125.42 | parcelguard-cam1 |
| Cam2 | 192.168.x.x | 100.69.12.33 | parcelguard-cam2 |

---

## Software Architecture

### Tech Stack

| Layer | Technology | Purpose |
|-------|------------|---------|
| Frontend | React 18 + TypeScript + Tailwind CSS | PWA mobile app |
| Backend | Node.js + Fastify + TypeScript | REST API server |
| Database | SQLite (better-sqlite3) | Data persistence |
| Streaming | MediaMTX | RTSP to HLS conversion (hub) |
| Motion | On-device Python | Motion detection + recording (cameras) |
| MQTT | Mosquitto | Camera status and event messaging |
| Notifications | ntfy.sh | Push notifications |
| Remote Access | Tailscale + Funnel | VPN + public HTTPS |

### Project Structure

```
parcelguard/
├── apps/
│   ├── api/                    # Backend API (Fastify)
│   │   ├── src/
│   │   │   ├── db/             # Database layer
│   │   │   │   ├── migrations/ # SQL schema migrations
│   │   │   │   ├── index.ts    # Database connection
│   │   │   │   └── seed.ts     # Development data seeding
│   │   │   ├── middleware/     # Auth middleware
│   │   │   ├── routes/         # API route handlers
│   │   │   │   ├── auth.ts     # /api/auth/*
│   │   │   │   ├── cameras.ts  # /api/cameras/*
│   │   │   │   ├── events.ts   # /api/events/*
│   │   │   │   ├── settings.ts # /api/settings/*
│   │   │   │   ├── system.ts   # /api/system/*
│   │   │   │   └── users.ts    # /api/users/*
│   │   │   ├── services/       # Business logic
│   │   │   │   ├── auth.ts     # Authentication
│   │   │   │   ├── cameras.ts  # Camera management
│   │   │   │   ├── events.ts   # Event CRUD
│   │   │   │   ├── notifications.ts  # Push notifications
│   │   │   │   ├── ntfy.ts     # ntfy.sh client
│   │   │   │   ├── storage.ts  # Disk management
│   │   │   │   └── users.ts    # User management
│   │   │   └── index.ts        # Server entry point
│   │   └── tests/              # Unit tests
│   │
│   └── web/                    # Frontend PWA (React)
│       ├── src/
│       │   ├── components/     # React components
│       │   │   ├── ui/         # Generic (Button, Modal, Toast)
│       │   │   ├── cameras/    # Camera-related
│       │   │   ├── events/     # Event-related
│       │   │   ├── settings/   # Settings-related
│       │   │   └── system/     # System health
│       │   ├── contexts/       # React contexts
│       │   │   ├── AuthContext.tsx    # Auth state
│       │   │   └── ToastContext.tsx   # Notifications
│       │   ├── hooks/          # Custom hooks
│       │   │   ├── useAuth.ts
│       │   │   ├── useHlsStream.ts
│       │   │   ├── useOfflineData.ts
│       │   │   └── ...
│       │   ├── lib/            # Utilities
│       │   │   └── api.ts      # API client
│       │   ├── pages/          # Page components
│       │   │   ├── Dashboard.tsx
│       │   │   ├── Live.tsx
│       │   │   ├── Events.tsx
│       │   │   ├── EventDetail.tsx
│       │   │   ├── Settings.tsx
│       │   │   ├── Users.tsx
│       │   │   ├── Cameras.tsx
│       │   │   ├── System.tsx
│       │   │   └── Login.tsx
│       │   └── App.tsx         # Router + providers
│       └── tests/              # Unit + E2E tests
│
├── packages/
│   └── shared/                 # Shared TypeScript types
│       └── src/types.ts
│
├── scripts/
│   ├── pi-hub/                 # Hub setup scripts
│   └── pi-zero/                # Camera setup scripts
│
└── config/
    └── motion/                 # Motion daemon configs
```

---

## Database Schema

```
┌─────────────────────────────────────────────────────────────────────────┐
│                              SQLite Database                            │
├─────────────────────────────────────────────────────────────────────────┤
│                                                                         │
│  ┌─────────────────┐       ┌─────────────────────────────────────────┐  │
│  │     users       │       │              motion_events              │  │
│  ├─────────────────┤       ├─────────────────────────────────────────┤  │
│  │ id (PK)         │       │ id (PK)                                 │  │
│  │ username (UQ)   │       │ cameraId (FK → cameras.id)              │  │
│  │ pinHash         │       │ timestamp                               │  │
│  │ displayName     │       │ duration                                │  │
│  │ isAdmin         │       │ thumbnailPath                           │  │
│  │ enabled         │       │ videoPath                               │  │
│  │ createdAt       │       │ isImportant                             │  │
│  │ updatedAt       │       │ isFalseAlarm                            │  │
│  └────────┬────────┘       │ createdAt                               │  │
│           │                └──────────────────┬──────────────────────┘  │
│           │                                   │                         │
│           ▼                                   ▼                         │
│  ┌─────────────────┐                ┌─────────────────┐                 │
│  │    sessions     │                │     cameras     │                 │
│  ├─────────────────┤                ├─────────────────┤                 │
│  │ id (PK)         │                │ id (PK)         │                 │
│  │ token (UQ)      │                │ name            │                 │
│  │ userId (FK)     │───────────────►│ streamUrl       │                 │
│  │ createdAt       │                │ status          │                 │
│  │ expiresAt       │                │ lastSeen        │                 │
│  └─────────────────┘                │ motionSensitivity│                │
│                                     │ motionZones     │                 │
│  ┌─────────────────┐                │ notificationsEnabled│             │
│  │    settings     │                │ createdAt       │                 │
│  ├─────────────────┤                │ updatedAt       │                 │
│  │ key (PK)        │                └─────────────────┘                 │
│  │ value           │                                                    │
│  │ updatedAt       │                                                    │
│  └─────────────────┘                                                    │
│                                                                         │
└─────────────────────────────────────────────────────────────────────────┘
```

### Key Tables

| Table | Purpose | Key Fields |
|-------|---------|------------|
| `users` | User accounts | username, pinHash, isAdmin, enabled |
| `sessions` | Auth sessions | token, userId, expiresAt |
| `cameras` | Camera config | name, streamUrl, status, notificationsEnabled |
| `motion_events` | Recorded events | cameraId, timestamp, videoPath, isImportant |
| `settings` | App settings | key-value pairs (theme, retention, quiet hours) |

---

## API Routes

### Authentication

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/auth/login` | No | Login with username + PIN |
| POST | `/api/auth/logout` | Yes | Invalidate session |
| GET | `/api/auth/verify` | Yes | Verify session validity |

### Users

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/users` | Admin | List all users |
| POST | `/api/users` | Admin | Create new user |
| GET | `/api/users/:id` | Yes | Get user details |
| PUT | `/api/users/:id` | Yes* | Update user |
| DELETE | `/api/users/:id` | Admin | Disable user |
| PUT | `/api/users/:id/pin` | Yes* | Change PIN |

*Self or admin

### Cameras

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/cameras` | Yes | List all cameras |
| POST | `/api/cameras` | Yes | Add new camera |
| GET | `/api/cameras/:id` | Yes | Get camera details |
| PUT | `/api/cameras/:id` | Yes | Update camera settings |
| DELETE | `/api/cameras/:id` | Yes | Remove camera |
| GET | `/api/cameras/:id/health` | No | Camera health check |
| POST | `/api/cameras/test-stream` | Yes | Test stream URL |

### Events

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/events` | Yes | List events (paginated, filterable) |
| GET | `/api/events/:id` | Yes | Get event details |
| PUT | `/api/events/:id` | Yes | Update event (important/false alarm) |
| DELETE | `/api/events/:id` | Yes | Delete event |
| POST | `/api/events/bulk-delete` | Yes | Delete multiple events |
| GET | `/api/events/:id/thumbnail` | Yes | Serve thumbnail image |
| GET | `/api/events/:id/video` | Yes | Serve video clip |
| GET | `/api/events/:id/download` | Yes | Download video clip |
| GET | `/api/events/stats` | Yes | Event statistics |

### System

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/system/status` | Yes | System health status |
| GET | `/api/system/storage` | Yes | Storage usage info |
| POST | `/api/system/storage/cleanup` | Yes | Trigger manual cleanup |

### Settings

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| GET | `/api/settings` | Yes | Get all settings |
| PUT | `/api/settings` | Yes | Update settings |
| GET | `/api/notifications/status` | Yes | Notification config status |
| POST | `/api/notifications/test` | Yes | Send test notification |

### Motion Webhook

| Method | Endpoint | Auth | Description |
|--------|----------|------|-------------|
| POST | `/api/motion/events` | No* | Receive motion events |

*Internal only (from Motion daemon)

---

## Frontend Pages

| Route | Component | Description |
|-------|-----------|-------------|
| `/` | Dashboard | Overview with camera status, recent events, quick stats |
| `/login` | Login | Username + PIN authentication |
| `/live` | Live | Camera grid with live HLS streams |
| `/camera/:id` | Camera | Single camera fullscreen view |
| `/events` | Events | Event list with filtering and pagination |
| `/events/:id` | EventDetail | Video player with event actions |
| `/settings` | Settings | App settings, theme, notifications |
| `/cameras` | Cameras | Camera management (add/edit/delete) |
| `/cameras/:id` | CameraSettings | Individual camera settings |
| `/users` | Users | User management (admin only) |
| `/system` | System | System health dashboard |

---

## Data Flow

### Live Streaming (On-Demand)

```
User opens Live View
        │
        ▼
API sends MQTT command: start_live_view
        │
        ▼
Camera receives command
        │
        ▼
Camera starts ffmpeg → RTSP to Hub MediaMTX
        │
        ▼
Hub MediaMTX (HLS :8888)
        │
        ▼
Nginx proxies /streams/{camId}/*
        │
        ▼
React PWA → HLS.js Player

(Stream stops after 2-minute idle timeout)
```

### Motion Detection & Recording (On-Device)

```
Camera Module 3
        │
        ▼
   Picamera2 (Python) ─────► Continuous capture
        │
        ▼
   OpenCV frame diff ─────► Detect Motion
        │
        ├─► No motion: Continue monitoring
        │
        └─► Motion detected:
                │
                ├─► H264 encoder records clip
                │   (30-second chunks)
                │
                └─► On motion end:
                        │
                        ├─► Generate thumbnail (ffmpeg)
                        │
                        ├─► SCP clip + thumbnail to hub
                        │   /mnt/ssd/parcelguard/clips/{camId}/
                        │   /mnt/ssd/parcelguard/thumbnails/
                        │
                        └─► MQTT publish: motion_end event
                                │
                                ▼
                        API receives event
                                │
                                ▼
                        Create motion_events record
                                │
                                ▼
                        Send ntfy.sh notification
```

### Authentication Flow

```
User enters username + PIN
        │
        ▼
POST /api/auth/login
        │
        ▼
Verify user exists & enabled
        │
        ▼
Compare PIN hash (bcrypt)
        │
        ▼
Create session (token, userId, expiresAt)
        │
        ▼
Return { token, user: { id, username, displayName, isAdmin } }
        │
        ▼
Store token in localStorage
        │
        ▼
Include token in Authorization header for API calls
```

---

## Data Lineage & Dependencies

This section documents how data flows through the system and what depends on what. **Use this to assess impact before making changes.**

### Core Entity Relationships

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           DATA LINEAGE MAP                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────┐         ┌─────────────┐         ┌──────────────┐               │
│  │  User   │────────►│   Session   │────────►│ AuthContext  │               │
│  │ (DB)    │         │    (DB)     │         │  (Frontend)  │               │
│  └────┬────┘         └─────────────┘         └──────┬───────┘               │
│       │                                             │                       │
│       │ isAdmin                                     │ user.isAdmin          │
│       ▼                                             ▼                       │
│  ┌─────────────────────────────────────────────────────────────────┐        │
│  │                    PERMISSION GATES                              │        │
│  │  • Users page visibility (admin only)                           │        │
│  │  • User CRUD operations (admin only)                            │        │
│  │  • Delete other users (admin only)                              │        │
│  └─────────────────────────────────────────────────────────────────┘        │
│                                                                             │
│  ┌─────────┐         ┌─────────────┐         ┌──────────────┐               │
│  │ Camera  │────────►│MotionEvent  │────────►│  EventCard   │               │
│  │  (DB)   │         │    (DB)     │         │  (Frontend)  │               │
│  └────┬────┘         └──────┬──────┘         └──────────────┘               │
│       │                     │                                               │
│       │                     │ thumbnailPath, videoPath                      │
│       │                     ▼                                               │
│       │              ┌─────────────┐                                        │
│       │              │ File System │                                        │
│       │              │ clips/      │                                        │
│       │              │ thumbnails/ │                                        │
│       │              └─────────────┘                                        │
│       │                                                                     │
│       │ streamUrl                                                           │
│       ▼                                                                     │
│  ┌──────────────────────────────────────────────────────────────────┐       │
│  │                    STREAM CONSUMERS                               │       │
│  │  • Motion daemon (motion.conf netcam_url)                        │       │
│  │  • MediaMTX (HLS conversion)                                     │       │
│  │  • CameraPlayer component (HLS.js)                               │       │
│  │  • Live page grid                                                │       │
│  └──────────────────────────────────────────────────────────────────┘       │
│                                                                             │
│  ┌─────────┐                                                                │
│  │Settings │────────────────────────────────────────────────────────┐       │
│  │  (DB)   │                                                        │       │
│  └────┬────┘                                                        │       │
│       │                                                             │       │
│       ├─► retentionDays ──► Storage cleanup service                 │       │
│       ├─► theme ──────────► ThemeProvider (CSS variables)           │       │
│       ├─► notificationsEnabled ──► Notification service             │       │
│       ├─► quietHours* ────► Notification service (suppress)         │       │
│       ├─► notificationCooldown ──► Notification service (debounce)  │       │
│       └─► onboardingComplete ──► OnboardingWizard visibility        │       │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Field-Level Impact Matrix

When changing a field, check all its consumers:

#### User Table

| Field | Consumers | Impact of Change |
|-------|-----------|------------------|
| `id` | sessions.userId, API routes, AuthContext | **CRITICAL** - FK constraint, breaks auth |
| `username` | Login form, user list, display | Medium - UI updates needed |
| `pinHash` | Auth service (login) | Low - internal only |
| `displayName` | AuthContext.user, Settings page, header | Low - display only |
| `isAdmin` | requireAdmin middleware, Users page, Settings link | **HIGH** - permission gates |
| `enabled` | Auth service (login rejection) | Medium - blocks login |

#### Camera Table

| Field | Consumers | Impact of Change |
|-------|-----------|------------------|
| `id` | motion_events.cameraId, Motion config, API routes | **CRITICAL** - FK, config files |
| `name` | CameraCard, EventCard, notifications, Motion config | Medium - display + config |
| `streamUrl` | Motion daemon, MediaMTX, CameraPlayer | **CRITICAL** - breaks streaming |
| `status` | CameraCard, Dashboard, System health | Low - display only |
| `lastSeen` | CameraCard (offline indicator) | Low - display only |
| `motionSensitivity` | Motion daemon config | Medium - requires Motion restart |
| `notificationsEnabled` | Notification service | Low - per-camera toggle |

#### MotionEvent Table

| Field | Consumers | Impact of Change |
|-------|-----------|------------------|
| `id` | API routes, EventCard links, video/thumbnail URLs | **CRITICAL** - breaks navigation |
| `cameraId` | Event filtering, EventCard display, FK | **HIGH** - FK constraint |
| `timestamp` | EventCard, EventList sorting, filtering | High - affects ordering |
| `thumbnailPath` | EventCard image, API thumbnail endpoint | Medium - breaks images |
| `videoPath` | EventDetail player, download, API video endpoint | Medium - breaks playback |
| `isImportant` | EventCard badge, filtering, retention (skip delete) | Medium - affects cleanup |
| `isFalseAlarm` | EventCard badge, filtering | Low - display only |

#### Settings Table

| Field | Consumers | Impact of Change |
|-------|-----------|------------------|
| `retentionDays` | Storage cleanup service, StorageSettings UI | Medium - affects auto-delete |
| `theme` | ThemeProvider, localStorage sync | Low - UI preference |
| `notificationsEnabled` | Notification service, NotificationSettings | Medium - disables alerts |
| `quietHoursStart/End` | Notification service | Low - time window only |
| `notificationCooldown` | Notification service | Low - debounce timing |

### Frontend State Dependencies

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                        FRONTEND STATE FLOW                                  │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  localStorage                                                               │
│  ├── auth_token ───────► ApiClient.token ───────► Authorization header      │
│  └── theme ────────────► ThemeProvider ─────────► CSS variables             │
│                                                                             │
│  AuthContext (global)                                                       │
│  ├── isAuthenticated ──► ProtectedRoute ────────► redirect to /login        │
│  ├── user.isAdmin ─────► Settings page ─────────► "User Management" link    │
│  │                   └─► Users page ────────────► route access              │
│  └── user.id ──────────► PIN change ────────────► API endpoint              │
│                                                                             │
│  ToastContext (global)                                                      │
│  └── toast() ──────────► Any component ─────────► success/error feedback    │
│                                                                             │
│  URL Query Params                                                           │
│  └── /events?cameraId=X&startDate=Y ──► EventFilters ──► eventsApi.list()   │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### API Response → Component Mapping

| API Endpoint | Response Data | Consuming Components |
|--------------|---------------|----------------------|
| `GET /api/auth/verify` | `{ user }` | AuthContext → entire app |
| `GET /api/cameras` | `Camera[]` | Dashboard, Live, CameraGrid, EventFilters |
| `GET /api/cameras/:id` | `Camera` | CameraSettings, Camera (fullscreen) |
| `GET /api/events` | `{ events, total, hasMore }` | Events page, EventList |
| `GET /api/events/:id` | `MotionEvent` | EventDetail page |
| `GET /api/events/stats` | `{ today, important, ... }` | Dashboard (EventStats) |
| `GET /api/users` | `User[]` | Users page (admin) |
| `GET /api/settings` | `Settings` | Settings page, NotificationSettings, ThemeToggle |
| `GET /api/system/status` | `{ version, uptime, memory, cameras }` | System page, Dashboard |
| `GET /api/system/storage` | `StorageStats` | System page, StorageSettings |

### File System Dependencies

```
/mnt/ssd/parcelguard/
├── data/parcelguard.db
│   └── Referenced by: DATABASE_PATH env var → API startup
│
├── clips/{cameraId}/{timestamp}.mp4
│   ├── Written by: On-device motion detection (SCP from camera)
│   ├── Referenced by: motion_events.videoPath
│   └── Served by: GET /api/events/:id/video
│
└── thumbnails/{cameraId}_{timestamp}.jpg
    ├── Written by: On-device motion detection (SCP from camera)
    ├── Referenced by: motion_events.thumbnailPath
    └── Served by: GET /api/events/:id/thumbnail
```

### Configuration File Dependencies

| Config File | Location | Affects |
|-------------|----------|---------|
| `mediamtx.yml` | Hub: `/home/dan/mediamtx.yml` | HLS stream conversion |
| `motion-detect.service` | Cameras: `/etc/systemd/system/` | On-device motion detection |
| `parcelguard-api.service` | Hub: `/etc/systemd/system/` | API server startup |
| `nginx parcelguard` | Hub: `/etc/nginx/sites-available/` | Static file + API proxy |

### Change Impact Checklist

Before modifying any of the following, check downstream consumers:

- [ ] **Database schema change?** → Check API routes, services, frontend types, test fixtures
- [ ] **API response format change?** → Check frontend api.ts types, consuming components
- [ ] **Camera streamUrl change?** → Update Motion config, restart Motion daemon
- [ ] **User permission change?** → Check requireAdmin middleware, frontend isAdmin gates
- [ ] **Settings key change?** → Check SettingsService, frontend settingsApi, UI components
- [ ] **File path change?** → Check Motion config, API file serving, nginx config

---

## Services (Hub)

| Service | Type | Port | Description |
|---------|------|------|-------------|
| parcelguard-api | systemd | 3000 | Fastify API server |
| nginx | systemd | 80 | Reverse proxy + static files |
| mediamtx | systemd | 8888 (HLS), 8554 (RTSP) | Media streaming server |
| mosquitto | systemd | 1883 | MQTT broker |
| tailscaled | systemd | - | Tailscale VPN daemon |

## Services (Cameras)

| Service | Type | Description |
|---------|------|-------------|
| motion-detect | systemd | On-device motion detection + recording |
| tailscaled | systemd | Tailscale VPN daemon |

### Systemd Services

```bash
# Check hub services
sudo systemctl status parcelguard-api nginx mediamtx mosquitto tailscaled

# View logs
journalctl -u parcelguard-api -f
journalctl -u mediamtx -f

# Check camera services (SSH to camera first)
sudo systemctl status motion-detect
journalctl -u motion-detect -f
```

---

## Storage Layout

### Hub (240GB SSD mounted at /mnt/ssd)

```
/mnt/ssd/parcelguard/
├── data/
│   └── parcelguard.db          # SQLite database (~4MB)
├── clips/
│   ├── cam1/
│   │   └── 20241207_143022.mp4 # Motion clips (~2-20MB each)
│   └── cam2/
│       └── 20241207_152145.mp4
└── thumbnails/
    ├── cam1_20241207_143022.jpg # Event thumbnails (~50KB each)
    └── cam2_20241207_152145.jpg
```

### Application Code (MicroSD)

```
/home/dan/
├── parcelguard-api/            # API server code
│   ├── dist/                   # Compiled TypeScript
│   └── node_modules/
├── parcel-guard/               # Git repo (web files served by nginx)
│   └── apps/web/dist/          # ** NGINX SERVES FROM HERE **
│       ├── assets/
│       └── index.html
└── mediamtx.yml                # MediaMTX configuration
```

### Retention Policy

- Default retention: 14 days
- Events marked "important" are never auto-deleted
- Manual cleanup available via Settings or API

---

## Security

### Authentication

- Multi-user system with username + PIN (4-8 digits)
- bcrypt password hashing (10 rounds)
- Session tokens (24-hour expiry)
- Rate limiting on login (5 attempts/minute)

### Network

- Tailscale VPN for cross-network access (encrypted)
- Tailscale Funnel for public HTTPS access
- No port forwarding required
- Internal services not exposed to internet

### Access Control

- Admin users can manage other users
- Non-admin users can only change their own PIN
- Camera health endpoint is unauthenticated (internal only)

---

## Environment Variables

### API Server

| Variable | Default | Description |
|----------|---------|-------------|
| `PORT` | 3000 | API server port |
| `NODE_ENV` | development | Environment mode |
| `DATABASE_PATH` | ./data/parcelguard.db | SQLite database path |
| `CLIPS_PATH` | ./clips | Video clips directory |
| `THUMBNAILS_PATH` | ./thumbnails | Thumbnail directory |
| `NTFY_TOPIC` | - | ntfy.sh topic for notifications |
| `NTFY_SERVER` | https://ntfy.sh | ntfy server URL |
| `APP_URL` | - | Base URL for deep links |

### Web App

| Variable | Default | Description |
|----------|---------|-------------|
| `VITE_API_URL` | /api | API base URL |

---

## Monitoring

### Health Checks

- Camera health: `/api/cameras/:id/health` (1-minute interval)
- System status: `/api/system/status`
- Storage usage: `/api/system/storage`

### Logs

```bash
# API logs
journalctl -u parcelguard-api -f

# Motion logs
journalctl -u motion -f
cat /var/log/motion/motion.log

# Nginx access logs
tail -f /var/log/nginx/access.log
```

---

## Deployment

### Access URLs

| Access Type | URL |
|-------------|-----|
| Local (same network) | http://parcelguard-hub.local |
| Tailscale VPN | http://100.72.88.127 |
| Public (Funnel) | https://parcelguard-hub.tail[xxxxx].ts.net |

### Default Credentials

- **Username:** admin
- **PIN:** 2808

---

*This document should be updated whenever significant architectural changes are made.*
