# ParcelGuard - Development & Implementation Plan

## Overview

This document provides a phase-by-phase implementation plan for ParcelGuard. Each phase builds on the previous, with clear deliverables and acceptance criteria.

**Reference Documents:**
- `CLAUDE.md` - Coding standards and workflow
- `HARDWARE_SPEC.md` - Hardware components
- `SCOPE_OF_WORK.md` - Feature specifications
- `DEPLOYMENT_SPEC.md` - Deployment procedures

---

## Phase Summary

| Phase | Name | Focus | Dependencies | Status |
|-------|------|-------|--------------|--------|
| 0 | Project Scaffolding | Monorepo setup, tooling, CI | None | ✅ Complete |
| 1 | Core Infrastructure | Camera streaming, hub setup, PWA shell | Phase 0 | ✅ Complete |
| 2 | Live View | Multi-camera grid, stream playback | Phase 1 | ✅ Complete |
| 3A | Motion Detection (Pre-Hardware) | Event API, storage management, webhook | Phase 2 | ✅ Complete |
| 3B | Motion Detection (Post-Hardware) | Frigate config, real camera testing | Phase 3A + Hardware | ⬜ Not started |
| 4 | Event Timeline & Playback | Event list, video player | Phase 3A | ✅ Complete |
| 5 | Notifications | Push alerts on motion | Phase 4 | ✅ Complete |
| 6A | Settings & Administration (Pre-Hardware) | Camera management UI, system settings, health dashboard | Phase 5 | ✅ Complete |
| 6B | Settings & Administration (Post-Hardware) | Motion zone editor, recording schedules, real system stats | Phase 6A + Hardware | ⬜ Not started |
| 7A | Polish & Optimisation (Pre-Hardware) | Performance, UX, PWA, accessibility | Phase 6A | ⬜ Not started |
| 7B | Polish & Optimisation (Post-Hardware) | Real stream testing, final validation | Phase 7A + Hardware | ⬜ Not started |

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

## Phase 7A: Polish & Optimisation (Pre-Hardware) ⬜

### Objective
Performance improvements, UX refinements, full PWA capabilities, and accessibility - all achievable without hardware.

### Tasks

#### 7A.1 Performance Optimisation
- [x] Lazy load event thumbnails (intersection observer)
- [x] Virtual scrolling for event list (>50 items)
- [ ] Image optimisation (WebP thumbnails)
- [ ] API response caching (short TTL)
- [x] Code splitting for routes

#### 7A.2 PWA Enhancements
- [x] Offline mode - view cached events
- [ ] Background sync for actions taken offline
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
- [ ] Auto-retry for transient failures

#### 7A.5 Accessibility
- [x] Keyboard navigation
- [x] Screen reader labels
- [x] Focus management
- [x] Colour contrast compliance
- [x] Reduced motion support

#### 7A.6 Pre-Hardware Testing
- [ ] Full regression test suite
- [ ] Cross-browser testing (Chrome, Safari, Firefox) - UI only
- [ ] Mobile device testing (iOS, Android) - UI only
- [ ] Performance audit (Lighthouse) - mock streams
- [ ] Security audit - application layer

#### 7A.7 Documentation
- [ ] User guide (README)
- [ ] Troubleshooting guide
- [ ] API documentation (OpenAPI spec)
- [ ] Contribution guidelines

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
- [ ] Virtual scroll component
- [ ] Offline cache logic
- [ ] Background sync queue
- [ ] Toast notification system
- [ ] Keyboard navigation hooks

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

## Implementation Order

### Recommended Sequence

```
                                              ┌─────────────────┐     ┌─────────────────┐     ┌─────────────────┐
                                              │  Phase 3B       │     │  Phase 6B       │     │  Phase 7B       │
                                              │  (Post-Hardware)│     │  (Post-Hardware)│     │  (Post-Hardware)│
                                              │  Frigate Config │     │  Motion Zones   │     │  Final Valid.   │
                                              └────────┬────────┘     └────────┬────────┘     └────────┬────────┘
                                                       │                       │                       │
                                                       │ Hardware arrives      │                       │
                                                       │                       │                       │
Phase 0 ─────► Phase 1 ─────► Phase 2 ─────► Phase 3A ─┴───► Phase 4 ───► Phase 5 ───► Phase 6A ─┴──► Phase 7A ─┴──► Done
(Scaffolding)  (Infrastructure) (Live View)   (Pre-Hardware)    (Events UI)  (Notify)     (Pre-Hardware)   (Pre-Hardware)
     ✅              ✅              ✅            ✅              ✅            ✅              ✅
                                               Event API         Events List  ntfy.sh      Camera Mgmt UI   Performance
                                               Storage Mgmt      Video Player Quiet Hours  System Settings  PWA/A11y
                                                                              Cooldowns    Health Dashboard Documentation
```

### Hardware-Independent Development Path

The system is designed so that **Phases 0-7A** can be developed without physical camera hardware:

| Phase | Hardware Required? | Notes |
|-------|-------------------|-------|
| 0-2 | No | ✅ Complete - Used mock data and HLS test streams |
| 3A | No | ✅ Complete - Event simulation script provides test data |
| 3B | **Yes** | Frigate configuration requires real cameras |
| 4 | No | ✅ Complete - Uses events from 3A (simulated or real) |
| 5 | No | ✅ Complete - ntfy.sh notifications with simulated events |
| 6A | No | ✅ Complete - Camera management, settings, health dashboard |
| 6B | **Yes** | Motion zone editor needs live preview, real CPU temp |
| 7A | No | Performance, PWA, accessibility, documentation |
| 7B | **Yes** | Real stream testing, hardware validation, production sign-off |

### Parallel Work Opportunities

- **Phase 0-1:** Hardware setup (Pi Zero, Pi 4) can happen in parallel with software scaffolding
- **Phase 1:** Camera scripts and API can be developed in parallel
- **Phase 2-3:** Frontend components and Frigate config can be developed in parallel
- **Phase 6:** Different settings sections can be built independently

---

## Risk Mitigation

| Risk | Mitigation |
|------|------------|
| Camera streaming instability | Test thoroughly in Phase 1, implement robust reconnection |
| Frigate resource usage on Pi 4 | Monitor in Phase 3, adjust detection settings if needed |
| Storage fills up | Implement early warning in Phase 3, conservative retention |
| Remote access security | Use Cloudflare Tunnel (encrypted), require auth |
| Power bank runtime | Test in Phase 1, document battery swap procedure |

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

*Last Updated: December 2024*
*Version: 1.5.0*
