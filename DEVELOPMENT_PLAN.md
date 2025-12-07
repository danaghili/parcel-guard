# ParcelGuard - Development & Implementation Plan

## Overview

This document provides a phase-by-phase implementation plan for ParcelGuard. Each phase builds on the previous, with clear deliverables and acceptance criteria.

**Reference Documents:**
- `CLAUDE.md` - Coding standards and workflow
- `HARDWARE_SPEC.md` - Hardware components
- `SCOPE_OF_WORK.md` - Feature specifications
- `DEPLOYMENT_SPEC.md` - Deployment procedures
- `RECOVERY_NOTES.md` - Hub recovery procedures
- `SOW_UPDATES.md` - Scope changes and learnings

---

## Current Status (December 2024)

**Hub Status:** ✅ Fully operational
**Cameras:** Both cameras streaming 1080p/15fps via mediamtx with TCP transport
**Software:** Version 0.9.0 - Multi-user authentication with public access

**Access:**
- **Local:** http://parcelguard-hub.local
- **Public (Tailscale Funnel):** https://parcelguard-hub.tail1234.ts.net (check your actual URL)
- **Default Login:** username `admin`, PIN `2808`

**Tailscale IPs (for cross-network access):**
- Hub: `100.72.88.127`
- Cam1: `100.120.125.42`
- Cam2: `100.69.12.33`

**Key Decisions:**
- Replaced Frigate with Motion (lightweight motion detection) due to Pi 4 resource constraints
- Added multi-user authentication (v0.9.0) for shared household access
- Using Tailscale Funnel for public HTTPS access without port forwarding

---

## Phase Summary

| Phase | Name | Focus | Dependencies | Status |
|-------|------|-------|--------------|--------|
| 0 | Project Scaffolding | Monorepo setup, tooling, CI | None | ✅ Complete |
| 1 | Core Infrastructure | Camera streaming, hub setup, PWA shell | Phase 0 | ✅ Complete |
| 2 | Live View | Multi-camera grid, stream playback | Phase 1 | ✅ Complete |
| 3A | Motion Detection (Pre-Hardware) | Event API, storage management, webhook | Phase 2 | ✅ Complete |
| 3B | Motion Detection (Post-Hardware) | Motion config, real camera testing | Phase 3A + Hub | ⬜ Not started |
| 4 | Event Timeline & Playback | Event list, video player | Phase 3A | ✅ Complete |
| 5 | Notifications | Push alerts on motion | Phase 4 | ✅ Complete |
| 6A | Settings & Administration (Pre-Hardware) | Camera management UI, system settings, health dashboard | Phase 5 | ✅ Complete |
| 6B | Settings & Administration (Post-Hardware) | Motion zone editor, recording schedules, real system stats | Phase 6A + Hub | ⬜ Not started |
| 7A | Polish & Optimisation (Pre-Hardware) | Performance, UX, PWA, accessibility | Phase 6A | 🔄 In Progress |
| 7B | Polish & Optimisation (Post-Hardware) | Real stream testing, final validation | Phase 7A + Hub | ⬜ Not started |
| **H1** | **Hub Recovery** | **Reimage Pi 4, basic setup** | None | ✅ Complete |
| **H2** | **Hub Services** | **API, web app, nginx deployment** | H1 | ✅ Complete |
| **H3** | **Motion Integration** | **Motion daemon, event forwarding** | H2 | ✅ Complete |
| **H4** | **Remote Access** | **Tailscale VPN setup** | H2 | ✅ Complete |
| **H5** | **Setup Scripts** | **Automated setup for hub and cameras** | H3, H4 | ✅ Complete |
| **H6** | **Multi-User Auth** | **Username/PIN login, user management** | H2 | ✅ Complete |
| **H7** | **Public Access** | **Tailscale Funnel for HTTPS access** | H4 | ✅ Complete |

---

## Phase 0: Project Scaffolding ✅

### Objective
Set up the monorepo structure, development tooling, and CI pipeline.

### Tasks

#### 0.1 Monorepo Initialisation
- [x] Initialise npm workspace in project root
- [x] Create `apps/web` directory (React PWA)
- [x] Create `apps/api` directory (Node.js backend)
- [x] Create `packages/shared` directory (shared types/utilities)
- [x] Configure TypeScript project references

#### 0.2 Frontend Scaffolding (apps/web)
- [x] Scaffold Vite + React + TypeScript project
- [x] Configure Tailwind CSS
- [x] Set up path aliases (`@/components`, `@/hooks`, etc.)
- [x] Create base folder structure per CLAUDE.md
- [x] Add ESLint + Prettier configuration
- [x] Create `.env.example` with required variables

#### 0.3 Backend Scaffolding (apps/api)
- [x] Scaffold Fastify + TypeScript project
- [x] Configure SQLite with better-sqlite3
- [x] Set up path aliases
- [x] Create base folder structure per CLAUDE.md
- [x] Add ESLint + Prettier configuration
- [x] Create `.env.example` with required variables

#### 0.4 Shared Package (packages/shared)
- [x] Set up TypeScript package
- [x] Define shared types (Camera, Event, Settings, ApiError)
- [x] Configure exports for consumption by web/api

#### 0.5 Testing Setup
- [x] Configure Vitest for web package
- [x] Configure Vitest for api package
- [x] Set up Playwright for E2E tests
- [x] Create initial test scripts in package.json

#### 0.6 Development Scripts
- [x] Root `npm run dev` - starts both web and api
- [x] Root `npm run build` - builds both packages
- [x] Root `npm run test` - runs all tests
- [x] Root `npm run lint` - lints all packages
- [x] Root `npm run typecheck` - type checks all packages

#### 0.7 Documentation
- [x] Update README.md with setup instructions
- [x] Create CHANGELOG.md

### Deliverables
- Working monorepo with dev servers starting
- All linting/formatting passing
- Type checking passing
- Empty test suites running

### Acceptance Criteria
```bash
npm install        # Installs all dependencies
npm run dev        # Starts web on :5173, api on :3000
npm run build      # Builds both packages without errors
npm run test       # Test suites run (empty is fine)
npm run lint       # No linting errors
npm run typecheck  # No type errors
```

---

## Phase 1: Core Infrastructure ✅

### Objective
Establish camera streaming, hub services, and basic PWA shell with authentication.

### Tasks

#### 1.1 Pi Zero Camera Setup Scripts
- [x] Create `scripts/pi-zero/setup.sh` - initial camera setup
- [x] Create `scripts/pi-zero/start-stream.sh` - RTSP streaming
- [x] Create `scripts/pi-zero/health-check.sh` - status reporting
- [x] Create systemd service file templates
- [x] Document camera setup procedure
- [ ] Test streaming from Pi Zero to hub

#### 1.2 Pi 4 Hub Setup Scripts
- [x] Create `scripts/pi-hub/setup.sh` - initial hub setup
- [x] Create `scripts/pi-hub/install-deps.sh` - install Node, Nginx, etc.
- [x] Create Nginx configuration template
- [x] Create Frigate configuration template
- [x] Create systemd service file templates
- [x] Create `scripts/pi-hub/update.sh` - application update script
- [x] Create `scripts/pi-hub/backup.sh` - backup script
- [x] Document hub setup procedure

#### 1.3 Database Schema
- [x] Create `apps/api/src/db/migrations/001_initial_schema.sql`
- [x] Define `cameras` table
- [x] Define `motion_events` table
- [x] Define `settings` table
- [x] Define `sessions` table (for auth)
- [x] Create migration runner utility
- [x] Seed script for development data

**Schema Design:**
```sql
-- cameras
CREATE TABLE cameras (
  id TEXT PRIMARY KEY,
  name TEXT NOT NULL,
  streamUrl TEXT NOT NULL,
  status TEXT DEFAULT 'offline',
  lastSeen INTEGER,
  motionSensitivity INTEGER DEFAULT 50,
  motionZones TEXT DEFAULT '[]',
  notificationsEnabled INTEGER DEFAULT 1,
  createdAt INTEGER DEFAULT (unixepoch()),
  updatedAt INTEGER DEFAULT (unixepoch())
);

-- motion_events
CREATE TABLE motion_events (
  id TEXT PRIMARY KEY,
  cameraId TEXT NOT NULL,
  timestamp INTEGER NOT NULL,
  duration INTEGER,
  thumbnailPath TEXT,
  videoPath TEXT,
  isImportant INTEGER DEFAULT 0,
  isFalseAlarm INTEGER DEFAULT 0,
  createdAt INTEGER DEFAULT (unixepoch()),
  FOREIGN KEY (cameraId) REFERENCES cameras(id)
);

-- settings
CREATE TABLE settings (
  key TEXT PRIMARY KEY,
  value TEXT NOT NULL,
  updatedAt INTEGER DEFAULT (unixepoch())
);

-- sessions
CREATE TABLE sessions (
  id TEXT PRIMARY KEY,
  token TEXT UNIQUE NOT NULL,
  createdAt INTEGER DEFAULT (unixepoch()),
  expiresAt INTEGER NOT NULL
);
```

#### 1.4 Backend API Foundation
- [x] Set up Fastify server with plugins (cors, helmet, etc.)
- [x] Create database connection utility
- [x] Implement request logging
- [x] Create error handling middleware
- [x] Create base route structure

#### 1.5 Authentication API
- [x] `POST /api/auth/login` - validate PIN, create session
- [x] `POST /api/auth/logout` - invalidate session
- [x] `GET /api/auth/verify` - check session validity
- [x] Authentication middleware for protected routes
- [x] PIN hashing utility (bcrypt)

#### 1.6 Camera API (Basic)
- [x] `GET /api/cameras` - list all cameras
- [x] `GET /api/cameras/:id` - get camera details
- [x] `POST /api/cameras/:id/health` - receive health check from camera

#### 1.7 System API (Basic)
- [x] `GET /api/system/status` - basic hub health
- [x] `GET /api/settings` - get app settings
- [x] `PUT /api/settings` - update settings (including PIN)

#### 1.8 PWA Shell
- [x] Configure Vite PWA plugin
- [x] Create manifest.json
- [x] Create service worker (basic caching)
- [x] Set up React Router with routes:
  - `/login` - PIN entry
  - `/` - Dashboard (protected)
  - `/live` - Live view (protected)
  - `/events` - Events (protected, placeholder)
  - `/settings` - Settings (protected, placeholder)

#### 1.9 Authentication UI
- [x] Create PIN entry component
- [x] Create auth context/hook (`useAuth`)
- [x] Implement protected route wrapper
- [x] Session persistence (localStorage)
- [x] Auto-logout on session expiry

#### 1.10 Basic Layout
- [x] Create app shell layout (header, nav, content)
- [x] Create bottom navigation component
- [x] Create loading spinner component
- [x] Create error message component
- [x] Implement dark/light theme support (CSS variables)

### Deliverables
- Camera streaming to hub via RTSP
- Hub receiving camera health checks
- PWA loads and prompts for PIN
- Successful login shows dashboard shell
- Session persists across page reload

### Acceptance Criteria
- [ ] Pi Zero streams video accessible at `rtsp://camera-ip:8554/stream`
- [x] Hub API responds at `http://hub-ip:3000/api/system/status`
- [x] PWA loads at `http://hub-ip/`
- [x] Invalid PIN shows error
- [x] Valid PIN redirects to dashboard
- [x] Refresh maintains logged-in state
- [x] Logout returns to login screen

### Tests Required
**Unit:**
- [x] PIN validation logic
- [x] Session token generation
- [x] Auth middleware

**E2E:**
- [x] Login flow (valid/invalid PIN)
- [x] Protected route redirect
- [x] Logout flow

---

## Phase 2: Live View ✅

### Objective
Display live camera feeds in a responsive grid with single-camera fullscreen view.

### Tasks

#### 2.1 Stream Handling Utilities
- [x] Create HLS.js wrapper hook (`useHlsStream`)
- [x] Handle stream connection/disconnection
- [x] Implement auto-reconnection with backoff
- [x] Create stream status detection (loading, playing, error)

#### 2.2 Camera API Extensions
- [x] `GET /api/cameras/:id/stream` - get stream URL/config
- [x] Update camera status on health check
- [x] Track last-seen timestamp

#### 2.3 Camera Grid Component
- [x] Create `CameraGrid` component
- [x] Responsive grid layout (1-4 cameras)
- [x] Camera card with:
  - Video stream
  - Camera name overlay
  - Status indicator (online/offline)
  - Last seen time (if offline)
- [x] Handle camera click (navigate to single view)

#### 2.4 Single Camera View
- [x] Create `CameraView` page component
- [x] Fullscreen video display
- [x] Stream quality indicator
- [x] Back navigation
- [x] Quick settings access button
- [ ] Pinch-to-zoom (optional, stretch goal)

#### 2.5 Live View Page
- [x] Create `/live` page
- [x] Integrate camera grid
- [x] Add refresh button
- [ ] Add camera filter (if >4 cameras)
- [x] Loading skeleton while fetching cameras

#### 2.6 Dashboard Integration
- [x] Update dashboard to show camera grid summary
- [x] Show camera count and status summary
- [x] Quick link to full live view

#### 2.7 Offline Handling
- [x] Graceful display when camera offline
- [x] Retry connection button
- [x] Visual distinction for offline cameras

### Deliverables
- Live view showing all camera feeds
- Tap camera to view fullscreen
- Clear online/offline status
- Auto-reconnection on stream drop

### Acceptance Criteria
- [x] Live view loads within 3 seconds
- [x] All online cameras show video
- [x] Offline cameras show last-seen time
- [x] Tapping camera opens fullscreen view
- [x] Stream reconnects after network drop
- [x] Works on mobile viewport

### Tests Required
**Unit:**
- [x] Stream status detection
- [x] Reconnection logic
- [x] Grid layout calculation

**E2E:**
- [x] Navigate to live view
- [x] View single camera fullscreen
- [x] Return to grid
- [x] Handle offline camera display

---

## Phase 3: Motion Detection & Recording

### Objective
Integrate Frigate for motion detection, configure recording, and manage storage.

### Implementation Approach

> **Note:** Phase 3 is split into two stages:
> - **Stage A (Pre-Hardware):** Build backend APIs, event handling, and storage management using simulated events
> - **Stage B (Post-Hardware):** Configure Frigate with real cameras and tune motion detection
>
> This allows development to continue before hardware arrives. Stage A provides the foundation that Stage B plugs into.

### Tasks

#### 3.1 Frigate Integration (Stage B - Requires Hardware)
- [ ] Finalise Frigate configuration for all cameras
- [ ] Configure motion detection sensitivity
- [ ] Set up clip recording (pre-roll, post-roll)
- [ ] Configure snapshot generation
- [ ] Test motion detection triggers

#### 3.2 Frigate Event Webhook (Stage A - Pre-Hardware)
- [x] Create webhook endpoint `POST /api/frigate/events`
- [x] Parse Frigate event payload
- [x] Create motion_event record in database
- [x] Link to video clip and thumbnail paths
- [x] Handle event updates (end of motion)

#### 3.3 Event Storage Management (Stage A - Pre-Hardware)
- [x] Create storage monitoring service
- [x] Implement automatic cleanup (retention days)
- [x] Respect "important" flag (don't delete)
- [x] Create `GET /api/system/storage` endpoint
- [x] Alert when storage exceeds threshold

#### 3.4 Camera Settings API (Stage A - Pre-Hardware)
- [x] `PUT /api/cameras/:id` - update camera settings
- [x] Motion sensitivity setting
- [x] Notification enable/disable per camera
- [ ] Sync settings to Frigate config (restart required) (Stage B)

#### 3.5 Motion Zone Foundation (Stage A - Pre-Hardware)
- [x] Store motion zones in camera record
- [x] Define zone data structure (polygon coordinates)
- [x] API to update zones (UI in Phase 6)

#### 3.6 Event API (Stage A - Pre-Hardware)
- [x] `GET /api/events` - list events (paginated)
  - Filter by camera
  - Filter by date range
  - Filter by importance
- [x] `GET /api/events/:id` - get event details
- [x] `GET /api/events/:id/thumbnail` - serve thumbnail
- [x] `GET /api/events/:id/video` - serve video clip

#### 3.7 Event Simulation (Stage A - Pre-Hardware)
- [x] Create `scripts/simulate-events.ts` for development/testing
- [x] Generate realistic mock events with timestamps
- [x] Create sample thumbnail and video files
- [x] Seed database with simulated event history

### Deliverables

**Stage A (Pre-Hardware):**
- Event webhook receives and stores events
- Event API with filtering and pagination
- Storage management with retention cleanup
- Camera settings API
- Event simulation script for testing

**Stage B (Post-Hardware):**
- Motion detected and recorded automatically
- Events created in database with clips
- Thumbnails generated for each event

### Acceptance Criteria

**Stage A (Pre-Hardware):**
- [x] Simulated event creates database record
- [x] Event API returns filtered, paginated results
- [x] Thumbnail and video endpoints serve files
- [x] Storage cleanup removes old events (respects important flag)
- [x] Camera settings can be updated via API

**Stage B (Post-Hardware):**
- [ ] Motion in camera view triggers recording
- [ ] Recording includes 5s pre-roll, 10s post-roll
- [ ] Event appears in database within 5 seconds
- [ ] Clips older than retention period deleted

### Tests Required
**Unit:**
- [x] Frigate webhook parsing
- [x] Storage calculation
- [x] Retention cleanup logic
- [x] Event filtering logic
- [x] Pagination logic

**E2E:**
- [x] Create event via webhook
- [x] List events with filters
- [x] View event details
- [x] Serve thumbnail and video
- [ ] Trigger motion (manual test - Stage B)

---

## Phase 4: Event Timeline & Playback ✅

### Objective
Build event browsing interface with filtering and video playback.

### Tasks

#### 4.1 Event List Component
- [x] Create `EventList` component
- [x] Chronological list with infinite scroll
- [x] Event card showing:
  - Thumbnail
  - Camera name
  - Timestamp
  - Duration
  - Important/false alarm badges
- [ ] Pull-to-refresh (deferred to Phase 7)

#### 4.2 Event Filters
- [x] Create filter component
- [x] Filter by camera (dropdown)
- [x] Filter by date range (date picker + presets)
- [ ] Filter by time of day (deferred)
- [x] Filter by importance
- [x] Clear filters button
- [x] Persist filter state in URL

#### 4.3 Events Page
- [x] Create `/events` page
- [x] Integrate event list and filters
- [x] Empty state when no events
- [x] Loading skeleton (via stats component)

#### 4.4 Video Player Component
- [x] Create `EventPlayer` component
- [x] Play/pause controls
- [x] Seek bar with progress
- [x] Playback speed control (0.5x, 1x, 1.5x, 2x)
- [x] Fullscreen toggle
- [x] Time display (current/total)

#### 4.5 Event Detail Page
- [x] Create `/events/:id` page
- [x] Video player with clip
- [x] Event metadata display
- [ ] Navigation to prev/next event (deferred)
- [x] Actions:
  - Mark as important
  - Mark as false alarm
  - Delete event
  - Download clip

#### 4.6 Event Management API
- [x] `PUT /api/events/:id` - update event (important, false alarm) (Phase 3A)
- [x] `DELETE /api/events/:id` - delete single event (Phase 3A)
- [x] `POST /api/events/bulk-delete` - delete multiple events (Phase 3A)
- [x] `GET /api/events/:id/download` - download clip with proper headers (Phase 3A)

#### 4.7 Dashboard Events Widget
- [x] Show recent events on dashboard
- [x] Quick stats (today's count, important count)
- [x] Link to full events page

### Deliverables
- Scrollable event timeline with thumbnails
- Filterable by camera, date, importance
- Video playback with full controls
- Mark important / false alarm
- Delete and download clips

### Acceptance Criteria
- [x] Events load with pagination (20 per page)
- [x] Filters update list immediately
- [x] Video plays smoothly
- [x] Playback controls work correctly
- [x] Mark important persists to database
- [x] Delete removes event and clip
- [x] Download saves file to device

### Tests Required
**Unit:**
- [x] Event filtering logic
- [x] Component rendering
- [x] Filter state management

**E2E:**
- [x] Browse events list
- [x] Apply filters
- [x] View event detail
- [x] Mark important
- [x] Delete confirmation modal
- [x] Dashboard integration

---

## Phase 5: Notifications ✅

### Objective
Send push notifications on motion detection with configurable settings.

### Tasks

#### 5.1 Notification Service
- [x] Create notification service in API
- [ ] Support Web Push API (deferred to Phase 7)
- [x] Support ntfy.sh (primary provider)
- [ ] Support Pushover fallback (optional, not implemented)
- [x] Notification queuing (avoid spam)
- [x] Cooldown period between notifications

#### 5.2 ntfy.sh Integration
- [x] Create ntfy.sh HTTP client
- [x] Configure via `NTFY_TOPIC` environment variable
- [x] Support self-hosted ntfy servers via `NTFY_SERVER`
- [x] Include thumbnail attachments
- [x] Deep link to event detail

#### 5.3 Notification Triggers
- [x] Send notification on Frigate event (new motion)
- [x] Include camera name in notification
- [x] Include thumbnail via ntfy attachment
- [x] Deep link to event detail
- [x] Respect per-camera notification settings
- [x] Respect quiet hours

#### 5.4 Notification Settings API
- [x] `GET /api/notifications/status` - get notification status
- [x] `POST /api/notifications/test` - send test notification
- [x] Settings via existing `GET/PUT /api/settings`
- [x] Quiet hours start/end
- [x] Cooldown period
- [x] Per-camera enable/disable (via camera settings)

#### 5.5 Notification UI
- [x] Notification status display
- [x] Test notification button
- [x] Configuration warning when not set up

#### 5.6 Settings Page - Notifications
- [x] Quiet hours configuration
- [x] Cooldown period slider
- [x] Per-camera toggles
- [x] ntfy.sh topic display
- [x] Enable/disable global toggle

### Deliverables
- Push notifications on motion via ntfy.sh
- Configurable quiet hours
- Per-camera notification control
- Tap notification to open event

### Acceptance Criteria
- [x] Notification sends on new motion event
- [x] Notification shows camera name
- [x] Tap notification opens event detail (deep link)
- [x] No notifications during quiet hours
- [x] Cooldown prevents notification spam
- [x] Disabled camera doesn't send notifications

### Tests Required
**Unit:**
- [x] Quiet hours logic (including overnight)
- [x] Cooldown logic (per-camera)
- [x] Notification payload format
- [x] Notification status endpoint
- [x] Settings API integration

**E2E:**
- [x] Open notification settings modal
- [x] Display notification status
- [x] Configure quiet hours
- [x] Configure cooldown
- [x] Per-camera toggles
- [x] Test notification button visibility
- [x] Modal open/close functionality

---

## Phase 6: Settings & Administration

### Implementation Approach

> **Note:** Phase 6 is split into two stages:
> - **Stage A (Pre-Hardware):** Build camera management UI, system settings, and health dashboard using available APIs
> - **Stage B (Post-Hardware):** Add motion zone editor with live preview, recording schedules, real CPU temp, and service management
>
> This allows development to continue before hardware arrives. Stage A provides a complete admin interface that Stage B enhances.

---

## Phase 6A: Settings & Administration (Pre-Hardware) ✅

### Objective
Build camera management UI, system settings, and health dashboard.

### Tasks

#### 6A.1 API Client Extensions
- [x] `camerasApi.create(data)` - POST /api/cameras
- [x] `camerasApi.delete(id)` - DELETE /api/cameras/:id
- [x] `camerasApi.testStream(url)` - POST /api/cameras/test-stream
- [x] `settingsApi.updatePin(currentPin, newPin)` - PUT /api/settings/pin
- [x] `systemApi.storage()` - GET /api/system/storage
- [x] `systemApi.cleanup()` - POST /api/system/storage/cleanup

#### 6A.2 Backend: Test Stream Endpoint
- [x] `POST /api/cameras/test-stream` - validates stream URL is reachable
- [x] HTTP/HTTPS URL validation with HEAD request
- [x] RTSP URL format validation

#### 6A.3 Camera Management UI
- [x] Create `/cameras` page - list all cameras with status indicators
- [x] Create `AddCameraModal` component - add camera wizard
  - Enter stream URL
  - Test connection
  - Name camera
  - Save
- [x] Create `/cameras/:id` page - individual camera settings
  - Edit name
  - Motion sensitivity slider
  - Notification toggle
  - Delete camera (with confirmation)
- [x] Create `DeleteConfirmModal` - reusable delete confirmation

#### 6A.4 System Settings UI
- [x] Create `PinChangeModal` component
  - Current PIN validation
  - New PIN entry (4-8 digits)
  - Confirm new PIN
  - Error handling
- [x] Create `StorageSettings` component
  - Storage usage display
  - Retention days slider
  - Cleanup button
- [x] Create `ThemeToggle` component
  - Light/Dark/System options
  - Persist to settings API

#### 6A.5 System Health Dashboard
- [x] Create `/system` page
- [x] Create `SystemStats` component
  - Version info
  - Uptime display
  - Memory usage
- [x] Create `StorageChart` component
  - Total/used/available display
  - Breakdown by clips/thumbnails/database
  - Warning at 80% threshold
- [x] Create `CameraHealthTable` component
  - Camera list with status
  - Online/offline indicators
  - Last seen timestamps

#### 6A.6 Navigation Updates
- [x] Settings page links to /cameras
- [x] Settings page links to /system
- [x] Back navigation from sub-pages

### Deliverables
- Add/edit/remove cameras via UI
- PIN change with validation
- Storage management with cleanup
- Theme toggle
- System health monitoring

### Acceptance Criteria
- [x] Can add new camera via wizard
- [x] Can edit camera name and settings
- [x] Can delete camera (with confirmation)
- [x] PIN change works correctly
- [x] Storage settings update retention period
- [x] Theme toggle persists preference
- [x] System health shows memory, storage, uptime
- [x] Camera health table shows all cameras

### Tests Required
**Unit:**
- [x] PinChangeModal - validation, API calls
- [x] ThemeToggle - selection, persistence
- [x] StorageSettings - slider, cleanup
- [x] SystemStats - data display
- [x] CameraHealthTable - table rendering
- [x] DeleteConfirmModal - confirm/cancel

**E2E:**
- [x] Navigate to cameras page
- [x] Add camera button visibility
- [x] Camera not found handling
- [x] Settings page sections
- [x] Theme toggle options
- [x] Navigation to cameras/system
- [x] System health display
- [x] Storage information display
- [x] Camera health table

---

## Phase 6B: Settings & Administration (Post-Hardware) ⬜

### Objective
Add hardware-dependent features: motion zone editor, recording schedules, real system stats.

### Tasks

#### 6B.1 Motion Zone Editor
- [ ] Create `MotionZoneEditor` component
- [ ] Display live camera feed as background
- [ ] Draw polygon overlay on video
- [ ] Add/remove zone points
- [ ] Clear/reset zones
- [ ] Save zones to camera settings
- [ ] Integrate into camera settings page
- [ ] Sync zones to Frigate config

#### 6B.2 Recording Schedule
- [ ] Create `ScheduleEditor` component
- [ ] Weekly grid (days × hours)
- [ ] Toggle recording on/off per block
- [ ] Quick presets:
  - Always on
  - Delivery hours (7am-7pm weekdays)
  - Custom
- [ ] Save schedule to camera settings
- [ ] Sync schedule to Frigate config

#### 6B.3 Real System Stats
- [ ] CPU temperature from Pi hardware
- [ ] Service status (Frigate, API, Nginx)
- [ ] `POST /api/system/restart/:service` - restart service

#### 6B.4 Frigate Config Sync
- [ ] Update Frigate config on camera add/delete
- [ ] Update Frigate config on motion zone change
- [ ] Update Frigate config on schedule change
- [ ] Trigger Frigate restart when config changes

### Deliverables
- Visual motion zone editor with live preview
- Recording schedule configuration
- Real CPU temperature monitoring
- Service restart capability

### Acceptance Criteria
- [ ] Motion zone editor shows live video background
- [ ] Can draw and save polygon zones
- [ ] Recording schedule applies correctly
- [ ] CPU temperature displays from Pi
- [ ] Can restart services from UI

### Tests Required
**Unit:**
- Zone polygon validation
- Schedule parsing

**E2E:**
- Draw motion zone
- Set recording schedule
- View real CPU temp (manual test)

---

## Phase 7: Polish & Optimisation

### Implementation Approach

> **Note:** Phase 7 is split into two stages:
> - **Stage A (Pre-Hardware):** Performance optimisation, PWA enhancements, UX improvements, accessibility, and documentation
> - **Stage B (Post-Hardware):** Real stream testing, final validation with actual cameras, and production sign-off
>
> This allows development to continue before hardware arrives. Stage A delivers a polished, production-ready UI that Stage B validates with real hardware.

---

## Phase 7A: Polish & Optimisation (Pre-Hardware) 🔄

### Objective
Performance improvements, UX refinements, full PWA capabilities, and accessibility - all achievable without hardware.

### Tasks

#### 7A.1 Performance Optimisation
- [x] Lazy load event thumbnails (intersection observer)
- [x] Virtual scrolling for event list (>50 items)
- [x] Image optimisation (WebP thumbnails with Accept header negotiation)
- [x] API response caching (short TTL)
- [x] Code splitting for routes
- [x] HLS.js lazy loading (523KB loaded on-demand)

#### 7A.2 PWA Enhancements
- [x] Offline mode - view cached events
- [x] Background sync for actions taken offline
- [x] Install prompt (beforeinstallprompt)
- [x] App icon and splash screen
- [x] iOS standalone mode support

#### 7A.3 UX Improvements
- [x] Onboarding flow for first-time setup
- [x] Empty states with helpful prompts
- [x] Loading skeletons for all async content
- [x] Toast notifications for actions
- [x] Pull-to-refresh on all lists
- [x] Keyboard shortcuts (desktop)

#### 7A.4 Error Handling Polish
- [x] Friendly error messages (no stack traces)
- [x] Retry buttons for failed operations
- [x] Network status indicator
- [x] Auto-retry for transient failures

#### 7A.5 Accessibility
- [x] Keyboard navigation
- [x] Screen reader labels
- [x] Focus management
- [x] Colour contrast compliance
- [x] Reduced motion support

#### 7A.6 Pre-Hardware Testing
- [x] Full regression test suite (204 E2E tests, 154 unit tests)
- [ ] Cross-browser testing (Chrome, Safari, Firefox) - UI only
- [ ] Mobile device testing (iOS, Android) - UI only
- [x] Performance audit (Lighthouse) - Performance 86%, Accessibility 100%, Best Practices 100%, SEO 100%
- [ ] Security audit - application layer

#### 7A.7 Documentation
- [x] User guide (docs/USER_GUIDE.md)
- [x] Troubleshooting guide (docs/TROUBLESHOOTING.md)
- [x] API documentation (docs/API.md, docs/openapi.yaml)
- [x] Contribution guidelines (CONTRIBUTING.md)

### Deliverables
- Smooth, responsive application
- Full PWA install experience
- Offline capability for cached content
- Accessible interface
- Complete documentation

### Acceptance Criteria
- [ ] Lighthouse performance score >90 (with mock streams)
- [ ] Lighthouse PWA score 100
- [ ] Lighthouse accessibility score >90
- [ ] No console errors in production build
- [ ] Works offline for cached content
- [ ] Installs as native app on mobile
- [ ] All unit and E2E tests passing
- [ ] Documentation complete

### Tests Required
**Unit:**
- [x] Virtual scroll component (9 tests)
- [x] Offline cache logic (useOfflineData hook)
- [x] Background sync queue (useBackgroundSync hook)
- [x] Toast notification system (8 tests)
- [x] Keyboard navigation hooks

**E2E:**
- [ ] Install PWA flow
- [ ] Offline mode functionality
- [ ] Keyboard navigation paths
- [ ] Onboarding flow
- [ ] Pull-to-refresh behaviour

---

## Phase 7B: Polish & Optimisation (Post-Hardware) ⬜

### Objective
Final validation with real camera hardware and production environment sign-off.

### Tasks

#### 7B.1 Real Stream Performance
- [ ] Stream quality auto-adjustment based on network
- [ ] Test stream reconnection under real conditions
- [ ] Measure actual stream latency
- [ ] Validate HLS segment caching

#### 7B.2 Hardware Integration Testing
- [ ] Cross-browser testing with real camera streams
- [ ] Mobile device testing with real streams
- [ ] Test on actual Pi 4 hub hardware
- [ ] Validate CPU/memory usage under load

#### 7B.3 Production Validation
- [ ] Performance audit (Lighthouse) - real streams
- [ ] Security audit - full system including hardware
- [ ] Load testing with multiple simultaneous streams
- [ ] Battery/power testing for Pi Zero cameras

#### 7B.4 Final Sign-off
- [ ] End-to-end user acceptance testing
- [ ] Production deployment checklist
- [ ] Monitoring and alerting setup
- [ ] Backup and recovery verification

### Deliverables
- Production-validated system
- Confirmed performance under real conditions
- Complete security sign-off
- Deployment-ready application

### Acceptance Criteria
- [ ] All streams stable for 24+ hours
- [ ] Lighthouse performance score >90 with real streams
- [ ] No memory leaks after extended operation
- [ ] Security audit passed
- [ ] All acceptance criteria from previous phases verified with hardware

### Tests Required
**Manual:**
- [ ] 24-hour stability test
- [ ] Network interruption recovery
- [ ] Power failure recovery
- [ ] Multi-user concurrent access

---

## Phase H1: Hub Recovery ✅

### Objective
Reimage the Pi 4 hub after Frigate crash and establish basic system configuration.

### Prerequisites
- Raspberry Pi Imager installed on Mac
- microSD card (32GB+)
- Home WiFi credentials

### Tasks

#### H1.1 Reimage SD Card
- [ ] Download Raspberry Pi OS Lite (64-bit)
- [ ] Flash with Raspberry Pi Imager
- [ ] Configure during imaging:
  - Hostname: `ParcelGuard`
  - Username: `dan`
  - WiFi: Home network credentials
  - SSH: Enable with password authentication
  - Locale: Set timezone

#### H1.2 First Boot
- [ ] Insert SD card and power on Pi 4
- [ ] Wait for first boot to complete (~2-3 minutes)
- [ ] SSH to `dan@ParcelGuard.local` (or IP if .local fails)
- [ ] Verify network connectivity: `ping google.com`

#### H1.3 System Updates
```bash
sudo apt update && sudo apt upgrade -y
sudo reboot
```

#### H1.4 Install Core Dependencies
```bash
# Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Git
sudo apt install -y git

# Verify installations
node --version  # Should be v20.x
npm --version
git --version
```

#### H1.5 Mount SSD for Storage (DEFERRED)

> **Issue:** The Argon M.2 case has UAS compatibility issues with some SSDs. The ASMedia controller (174c:1156) crashes during format operations even with UAS disabled (`usb-storage.quirks=174c:1156:u`).
>
> **Current status:** Using SD card storage temporarily. SSD to be added later with compatible hardware.
>
> **Recommended SSDs for Argon M.2 case (reported working):**
> - Kingston A400 240GB/480GB (SA400M8)
> - Crucial MX500 M.2 SATA
> - Western Digital Green M.2 SATA
> - Samsung 860 EVO M.2 SATA
>
> **Important:** Must be M.2 **SATA**, not NVMe. The Argon M.2 SATA case doesn't support NVMe.
>
> **Alternative:** Use a USB 3.0 SATA enclosure with a 2.5" SSD instead of the M.2 slot.

When SSD is ready, follow these steps:
```bash
# Identify the SSD (usually /dev/sda)
lsblk

# Format the SSD (if new/unformatted) - WARNING: destroys all data
sudo mkfs.ext4 /dev/sda

# Create mount point
sudo mkdir -p /mnt/storage

# Get the UUID for reliable mounting
sudo blkid /dev/sda
# Note the UUID (e.g., UUID="xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx")

# Add to fstab for auto-mount on boot
sudo nano /etc/fstab
# Add this line (replace UUID with your value):
# UUID=xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx /mnt/storage ext4 defaults,noatime 0 2

# Mount now
sudo mount -a

# Verify mount
df -h /mnt/storage
```

#### H1.6 Create Storage Directories
```bash
sudo mkdir -p /mnt/storage/parcelguard/data
sudo mkdir -p /mnt/storage/parcelguard/clips/cam1
sudo mkdir -p /mnt/storage/parcelguard/clips/cam2
sudo mkdir -p /mnt/storage/parcelguard/thumbnails
sudo chown -R dan:dan /mnt/storage
```

### Deliverables
- Pi 4 running Raspberry Pi OS Lite (64-bit)
- SSH accessible
- Node.js 20 installed
- Storage directories created (SD card for now, SSD later)

### Acceptance Criteria
- [x] Can SSH to `dan@parcelguard-hub.local`
- [x] `node --version` returns v20.x
- [ ] `/mnt/storage/parcelguard/` exists with correct permissions
- [ ] (Deferred) SSD mounted and persists after reboot

---

## Phase H2: Hub Services ✅

### Objective
Deploy the ParcelGuard API and web application on the hub.

### Prerequisites
- Phase H1 complete
- GitHub repo accessible

### Tasks

#### H2.1 Clone Repository
```bash
cd ~
git clone https://github.com/danaghili/parcel-guard.git
cd parcel-guard
npm install
```

#### H2.2 Build Web Application
```bash
cd ~/parcel-guard/apps/web
npm run build
```

#### H2.3 Configure API Environment
```bash
cd ~/parcel-guard/apps/api
cp .env.example .env
# Edit .env with production values:
# DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db
# PORT=3000
# NODE_ENV=production
```

#### H2.4 Seed Database
```bash
cd ~/parcel-guard/apps/api
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx src/db/seed.ts
```

#### H2.5 Create API Systemd Service
```bash
sudo nano /etc/systemd/system/parcelguard-api.service
```

Contents:
```ini
[Unit]
Description=ParcelGuard API Server
After=network.target

[Service]
Type=simple
User=dan
WorkingDirectory=/home/dan/parcel-guard/apps/api
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db
Environment=PORT=3000
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl daemon-reload
sudo systemctl enable parcelguard-api
sudo systemctl start parcelguard-api
sudo systemctl status parcelguard-api
```

#### H2.6 Install and Configure Nginx
```bash
sudo apt install -y nginx
sudo nano /etc/nginx/sites-available/parcelguard
```

Contents:
```nginx
server {
    listen 80;
    server_name ParcelGuard.local;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_cache_bypass $http_upgrade;
    }

    location / {
        root /home/dan/parcel-guard/apps/web/dist;
        try_files $uri $uri/ /index.html;
    }
}
```

```bash
sudo ln -s /etc/nginx/sites-available/parcelguard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

#### H2.7 Test Core Functionality
- [ ] Access http://ParcelGuard.local in browser
- [ ] Login with PIN (default: 1234)
- [ ] Navigate to Live View
- [ ] Verify cameras show as online (health checks updating)
- [ ] View camera streams

### Deliverables
- API running as systemd service
- Web app served via Nginx
- Application accessible at http://ParcelGuard.local

### Acceptance Criteria
- [ ] `sudo systemctl status parcelguard-api` shows active
- [ ] http://ParcelGuard.local loads the PWA
- [ ] Can login and navigate the app
- [ ] Camera health checks are updating status
- [ ] Camera streams visible in Live View

---

## Phase H3: Motion Integration ✅

### Objective
Replace Frigate with Motion (lightweight motion detection daemon) and configure event forwarding.

### Prerequisites
- Phase H2 complete
- Cameras streaming via mediamtx

### Tasks

#### H3.1 Install Motion
```bash
sudo apt install -y motion
```

#### H3.2 Configure Motion for Camera 1
```bash
sudo mkdir -p /etc/motion
sudo nano /etc/motion/camera1.conf
```

Contents:
```conf
# Camera 1 Configuration
camera_name cam1
netcam_url rtsp://192.168.1.133:8554/stream
netcam_userpass :

# Detection settings
threshold 1500
minimum_motion_frames 3
event_gap 60

# Recording
movie_output on
movie_max_time 60
movie_quality 75
movie_codec mp4
movie_filename /mnt/storage/parcelguard/clips/cam1/%Y%m%d_%H%M%S

# Snapshots
picture_output first
picture_filename /mnt/storage/parcelguard/thumbnails/cam1_%Y%m%d_%H%M%S

# Event hooks
on_event_start /home/dan/parcel-guard/scripts/motion-event.sh start cam1 %v
on_event_end /home/dan/parcel-guard/scripts/motion-event.sh end cam1 %v

# Performance
framerate 5
width 640
height 480
```

#### H3.3 Configure Motion for Camera 2
```bash
sudo nano /etc/motion/camera2.conf
```

Contents (same as camera1.conf but with):
```conf
camera_name cam2
netcam_url rtsp://192.168.1.183:8554/stream
movie_filename /mnt/storage/parcelguard/clips/cam2/%Y%m%d_%H%M%S
picture_filename /mnt/storage/parcelguard/thumbnails/cam2_%Y%m%d_%H%M%S
on_event_start /home/dan/parcel-guard/scripts/motion-event.sh start cam2 %v
on_event_end /home/dan/parcel-guard/scripts/motion-event.sh end cam2 %v
```

#### H3.4 Configure Main Motion Config
```bash
sudo nano /etc/motion/motion.conf
```

Key settings:
```conf
daemon on
log_level 6
log_file /var/log/motion/motion.log

# Include camera configs
camera /etc/motion/camera1.conf
camera /etc/motion/camera2.conf

# Web control
webcontrol_port 8080
webcontrol_localhost off
```

#### H3.5 Create Event Forwarder Script
```bash
nano ~/parcel-guard/scripts/motion-event.sh
chmod +x ~/parcel-guard/scripts/motion-event.sh
```

Contents:
```bash
#!/bin/bash
# Forward motion events to ParcelGuard API

EVENT_TYPE=$1  # start or end
CAMERA_ID=$2
EVENT_ID=$3

API_URL="http://localhost:3000"

if [ "$EVENT_TYPE" == "start" ]; then
    curl -X POST "$API_URL/motion/events" \
        -H "Content-Type: application/json" \
        -d "{\"cameraId\": \"$CAMERA_ID\", \"eventId\": \"$EVENT_ID\", \"type\": \"start\"}"
elif [ "$EVENT_TYPE" == "end" ]; then
    curl -X POST "$API_URL/motion/events" \
        -H "Content-Type: application/json" \
        -d "{\"cameraId\": \"$CAMERA_ID\", \"eventId\": \"$EVENT_ID\", \"type\": \"end\"}"
fi
```

#### H3.6 Update API for Motion Events
- [ ] Create `/api/motion/events` endpoint (adapts existing Frigate webhook)
- [ ] Map Motion event format to existing event structure
- [ ] Link to video clips and thumbnails

#### H3.7 Start Motion Service
```bash
sudo systemctl enable motion
sudo systemctl start motion
sudo systemctl status motion
```

#### H3.8 Test Motion Detection
- [ ] Trigger motion in camera view
- [ ] Check `/var/log/motion/motion.log` for events
- [ ] Verify clip saved to `/mnt/storage/parcelguard/clips/`
- [ ] Verify thumbnail saved
- [ ] Check event appears in ParcelGuard app
- [ ] Verify notification sent (if configured)

### Deliverables
- Motion daemon running and detecting motion
- Events forwarded to ParcelGuard API
- Clips and thumbnails saved to storage
- Notifications triggered on motion

### Acceptance Criteria
- [ ] `sudo systemctl status motion` shows active
- [ ] Motion triggers recording within 2 seconds
- [ ] Events appear in ParcelGuard within 5 seconds
- [ ] Clips playable in app
- [ ] Thumbnails display correctly

---

## Phase H4: Remote Access ✅

### Objective
Configure Tailscale VPN for secure remote access to the system.

### Prerequisites
- Phase H2 complete
- Tailscale account (free tier)

### Tasks

#### H4.1 Install Tailscale on Hub
```bash
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```
- Follow the authentication link
- Approve the device in Tailscale admin console

#### H4.2 Configure Tailscale
```bash
# Get Tailscale IP
tailscale ip -4

# Enable SSH via Tailscale
sudo tailscale up --ssh
```

#### H4.3 Install Tailscale on Cameras (Optional)
If cameras need remote access:
```bash
# On each Pi Zero
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up
```

#### H4.4 Configure Phone/Laptop
- Install Tailscale app on phone
- Install Tailscale on laptop
- Login with same account
- Verify can see ParcelGuard in device list

#### H4.5 Test Remote Access
- [ ] Disconnect from home WiFi (use mobile data)
- [ ] Access http://[tailscale-ip] in browser
- [ ] Verify app loads and functions
- [ ] Test SSH via Tailscale: `ssh dan@[tailscale-ip]`

#### H4.6 Update Documentation
- [ ] Document Tailscale IP in RECOVERY_NOTES.md
- [ ] Add Tailscale setup to SETUP_GUIDE.md

### Deliverables
- Tailscale VPN configured on hub
- Remote access from phone/laptop
- SSH accessible via Tailscale

### Acceptance Criteria
- [ ] Can access http://[tailscale-ip] from mobile data
- [ ] App functions normally over Tailscale
- [ ] SSH works via Tailscale
- [ ] Latency acceptable for video streaming

---

## Phase H5: Setup Scripts ✅

### Objective
Create automated setup scripts for repeatable hub and camera configuration.

### Prerequisites
- Phases H1-H4 complete and tested
- All manual steps documented

### Tasks

#### H5.1 Create Hub Setup Script
Create `scripts/pi-hub/setup-hub.sh`:
```bash
#!/bin/bash
# Automated hub setup script
# Run after fresh Raspberry Pi OS Lite install

set -e  # Exit on error

echo "=== ParcelGuard Hub Setup ==="

# System updates
echo "Updating system..."
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
echo "Installing Node.js..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx

# Mount SSD (assumes already formatted as ext4)
echo "Mounting SSD..."
sudo mkdir -p /mnt/storage
SSD_UUID=$(sudo blkid -s UUID -o value /dev/sda)
if [ -n "$SSD_UUID" ]; then
    echo "UUID=$SSD_UUID /mnt/storage ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab
    sudo mount -a
else
    echo "WARNING: SSD not found at /dev/sda - using SD card for storage"
fi

# Create storage directories
echo "Creating storage directories..."
sudo mkdir -p /mnt/storage/parcelguard/{data,clips/cam1,clips/cam2,thumbnails}
sudo chown -R $USER:$USER /mnt/storage

# Clone repository
echo "Cloning repository..."
cd ~
git clone https://github.com/danaghili/parcel-guard.git
cd parcel-guard
npm install

# Build web app
echo "Building web app..."
cd apps/web
npm run build

# Configure and seed database
echo "Setting up database..."
cd ../api
cp .env.example .env
sed -i 's|DATABASE_PATH=.*|DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db|' .env
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx src/db/seed.ts

# Install systemd service
echo "Installing API service..."
sudo cp ~/parcel-guard/scripts/pi-hub/parcelguard-api.service /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable parcelguard-api
sudo systemctl start parcelguard-api

# Configure Nginx
echo "Configuring Nginx..."
sudo cp ~/parcel-guard/scripts/pi-hub/nginx-parcelguard.conf /etc/nginx/sites-available/parcelguard
sudo ln -sf /etc/nginx/sites-available/parcelguard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx

# Install Motion
echo "Installing Motion..."
sudo apt install -y motion
sudo cp ~/parcel-guard/config/motion/*.conf /etc/motion/
sudo systemctl enable motion
sudo systemctl start motion

# Install Tailscale
echo "Installing Tailscale..."
curl -fsSL https://tailscale.com/install.sh | sh
echo "Run 'sudo tailscale up' to authenticate"

echo "=== Setup Complete ==="
echo "Access the app at http://ParcelGuard.local"
```

#### H5.2 Create Camera Setup Script
Create `scripts/pi-zero/setup-camera.sh`:
```bash
#!/bin/bash
# Automated camera setup script
# Run after fresh Raspberry Pi OS Lite install

set -e

CAMERA_ID=${1:-cam1}
echo "=== ParcelGuard Camera Setup: $CAMERA_ID ==="

# System updates
sudo apt update && sudo apt upgrade -y

# Enable camera
echo "Enabling camera interface..."
sudo raspi-config nonint do_camera 0

# Install mediamtx
echo "Installing mediamtx..."
# [mediamtx installation steps]

# Configure streaming
echo "Configuring streaming service..."
# [streaming configuration]

# Configure multi-network WiFi
echo "Configuring WiFi networks..."
# [wpa_supplicant configuration with priorities]

# Install systemd service
sudo systemctl enable mediamtx
sudo systemctl start mediamtx

echo "=== Camera Setup Complete ==="
echo "Stream available at rtsp://$(hostname -I | awk '{print $1}'):8554/stream"
```

#### H5.3 Create Supporting Config Files
- [ ] `scripts/pi-hub/parcelguard-api.service` - systemd unit
- [ ] `scripts/pi-hub/nginx-parcelguard.conf` - nginx config
- [ ] `config/motion/motion.conf` - main motion config
- [ ] `config/motion/camera1.conf` - camera 1 config
- [ ] `config/motion/camera2.conf` - camera 2 config

#### H5.4 Create Multi-Network WiFi Config
```bash
# /etc/wpa_supplicant/wpa_supplicant.conf template
network={
    ssid="HomeNetwork"
    psk="password"
    priority=3
}
network={
    ssid="GuestNetwork"
    psk="password"
    priority=2
}
network={
    ssid="MobileHotspot"
    psk="password"
    priority=1
}
```

#### H5.5 Test Scripts
- [ ] Test hub setup on fresh SD card
- [ ] Test camera setup on fresh SD card
- [ ] Document any manual steps that can't be automated
- [ ] Update README with script usage

### Deliverables
- `scripts/pi-hub/setup-hub.sh` - one-command hub setup
- `scripts/pi-zero/setup-camera.sh` - one-command camera setup
- Supporting config files in repository
- Updated documentation

### Acceptance Criteria
- [ ] Hub setup script completes without errors
- [ ] Camera setup script completes without errors
- [ ] System functional after running scripts
- [ ] Multi-network WiFi working
- [ ] Scripts tested on fresh images

---

## Phase H6: Multi-User Authentication ✅

### Objective
Replace single-PIN authentication with multi-user support (username + PIN).

### Prerequisites
- Phase H2 complete
- Database migrations working

### Tasks

#### H6.1 Database Migration
- [x] Create `002_add_users.sql` migration
- [x] Create users table with username, pinHash, displayName, isAdmin, enabled
- [x] Add userId column to sessions table
- [x] Migrate existing PIN to admin user

#### H6.2 Backend User Service
- [x] Create user service (`apps/api/src/services/users.ts`)
- [x] User CRUD operations
- [x] PIN validation with bcrypt
- [x] Admin-only route middleware

#### H6.3 Backend API Routes
- [x] `GET /api/users` - List all users (admin only)
- [x] `POST /api/users` - Create user (admin only)
- [x] `GET /api/users/:id` - Get user details
- [x] `PUT /api/users/:id` - Update user
- [x] `DELETE /api/users/:id` - Disable user (admin only)
- [x] `PUT /api/users/:id/pin` - Change PIN
- [x] Update login to accept username + PIN

#### H6.4 Frontend Updates
- [x] Update Login page with username field
- [x] Update AuthContext with user info
- [x] Create User Management page (`/users`)
- [x] Update Settings page with user management link

#### H6.5 Testing
- [x] Update E2E tests for new login flow
- [x] Add user management tests

### Deliverables
- Multi-user login with username + PIN
- Admin user management UI
- Default admin user (admin/2808)

### Acceptance Criteria
- [x] Login requires username + PIN
- [x] Admin can create/edit/delete users
- [x] Non-admin users can change their own PIN
- [x] Sessions linked to specific users

---

## Phase H7: Public Access (Tailscale Funnel) ✅

### Objective
Enable public HTTPS access to ParcelGuard without port forwarding or custom domain.

### Prerequisites
- Phase H4 complete (Tailscale installed)

### Tasks

#### H7.1 Enable Tailscale Funnel
- [x] Run `tailscale funnel --bg 80` on hub
- [x] Accept Tailscale Funnel terms
- [x] Verify public URL works

#### H7.2 Configuration
- [x] Make Funnel persistent with `--bg` flag
- [x] Document public URL

### Deliverables
- Public HTTPS URL for ParcelGuard
- No port forwarding required
- No custom domain needed

### Acceptance Criteria
- [x] Can access ParcelGuard from any network via public URL
- [x] HTTPS certificate automatically managed by Tailscale
- [x] Funnel survives hub reboots

---

## Implementation Order

### Current Sequence (Post-Recovery)

The hub crashed after starting Frigate. We're now in recovery mode with a new approach:

```
COMPLETED (Pre-Hardware):
Phase 0 ─► Phase 1 ─► Phase 2 ─► Phase 3A ─► Phase 4 ─► Phase 5 ─► Phase 6A ─► Phase 7A (in progress)
   ✅         ✅         ✅          ✅          ✅         ✅          ✅            🔄

COMPLETED (Hardware Deployment):
H1 ────────► H2 ────────► H3 ────────► H4 ────────► H5 ────────► H6 ────────► H7
Hub          Hub          Motion       Tailscale    Setup        Multi-User   Public
Recovery     Services     Integration  VPN          Scripts      Auth         Access
   ✅           ✅            ✅            ✅           ✅            ✅           ✅

THEN (Post-Hardware Polish):
Phase 3B ─► Phase 6B ─► Phase 7B ─► Done
Motion      Motion       Final
Tuning      Zones        Validation
   ⬜          ⬜            ⬜
```

### Recommended Next Steps

All hardware deployment phases are complete. Remaining work:

1. **Phase 3B** - Tune motion detection sensitivity with real cameras
2. **Phase 6B** - Add motion zone editor UI with live preview
3. **Phase 7B** - Final hardware validation and production sign-off

### Completed Hardware Phases

1. ✅ **H1: Hub Recovery** - Reimaged SD card, installed OS and dependencies
2. ✅ **H2: Hub Services** - Deployed API and web app
3. ✅ **H3: Motion Integration** - Configured Motion daemon (replacing Frigate)
4. ✅ **H4: Remote Access** - Set up Tailscale VPN
5. ✅ **H5: Setup Scripts** - Automated setup for future recovery/deployment
6. ✅ **H6: Multi-User Auth** - Username/PIN login with user management
7. ✅ **H7: Public Access** - Tailscale Funnel for public HTTPS access

### Hardware-Independent Development Path

Phases 0-7A were developed without physical camera hardware:

| Phase | Hardware Required? | Notes |
|-------|-------------------|-------|
| 0-2 | No | ✅ Complete - Used mock data and HLS test streams |
| 3A | No | ✅ Complete - Event simulation script provides test data |
| 3B | **Hub Required** | Motion config tuning with real cameras |
| 4 | No | ✅ Complete - Uses events from 3A (simulated or real) |
| 5 | No | ✅ Complete - ntfy.sh notifications with simulated events |
| 6A | No | ✅ Complete - Camera management, settings, health dashboard |
| 6B | **Hub Required** | Motion zone editor needs live preview |
| 7A | No | 🔄 In Progress - Performance, PWA, accessibility |
| 7B | **Hub Required** | Real stream testing, final validation |
| H1-H7 | **Hub Required** | ✅ All hardware deployment phases complete |

### Key Change: Frigate → Motion

**Why the change:**
- Frigate with AI detection overwhelmed Pi 4 (4GB RAM)
- System crashed shortly after Frigate startup
- Motion is lightweight, no AI, much lower resource usage

**Trade-offs:**
- ❌ No AI-based object detection (person vs car vs animal)
- ✅ Much simpler setup
- ✅ Lower CPU/RAM usage
- ✅ Motion-triggered recording still works
- ✅ Can add Coral TPU later to enable Frigate if needed

### Parallel Work Opportunities

While waiting for hub recovery:
- Complete Phase 7A remaining tasks (cross-browser testing, security audit)
- Prepare Motion configuration files
- Create setup script templates

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Camera streaming instability | Test thoroughly in Phase H2, implement robust reconnection |
| Motion daemon resource usage | Motion is lightweight; monitor in Phase H3, adjust threshold if needed |
| Hub crash during setup | Test each service individually before enabling all; keep backups |
| Storage fills up | Implement early warning in Phase 3A ✅, conservative retention |
| Remote access security | Use Tailscale VPN (encrypted, requires auth) |
| Network unreliable | Multi-network WiFi with priorities; Tailscale for remote recovery |
| Power bank runtime | Test in deployment, document battery swap procedure |
| Hub becomes unreachable | Tailscale SSH provides backup access even if local network fails |

---

## Definition of Done (All Phases)

- [ ] All tasks completed
- [ ] No TypeScript errors
- [ ] No ESLint warnings
- [ ] Unit tests written and passing
- [ ] E2E tests written and passing
- [ ] Manual testing completed
- [ ] Documentation updated
- [ ] Code reviewed
- [ ] Merged to main

---

*Last Updated: December 7, 2024*
*Version: 2.2.0*

**Changelog:**
- v2.2.0: Added H6 (Multi-User Auth) and H7 (Tailscale Funnel). Version 0.9.0 deployed with username/PIN login and public HTTPS access.
- v2.1.0: All hardware phases (H1-H5) complete. System fully operational with Motion detection, Tailscale VPN, and automated setup scripts.
- v2.0.0: Major revision - Added hub recovery phases (H1-H5), replaced Frigate with Motion, added Tailscale for remote access
- v1.6.0: Phase 7A in progress, all pre-hardware phases complete
