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

| Phase | Name | Focus | Dependencies |
|-------|------|-------|--------------|
| 0 | Project Scaffolding | Monorepo setup, tooling, CI | None |
| 1 | Core Infrastructure | Camera streaming, hub setup, PWA shell | Phase 0 |
| 2 | Live View | Multi-camera grid, stream playback | Phase 1 |
| 3 | Motion Detection & Recording | Frigate integration, clip storage | Phase 2 |
| 4 | Event Timeline & Playback | Event list, video player | Phase 3 |
| 5 | Notifications | Push alerts on motion | Phase 4 |
| 6 | Settings & Administration | Camera management, system config | Phase 5 |
| 7 | Polish & Optimisation | Performance, UX, full PWA | Phase 6 |

---

## Phase 0: Project Scaffolding

### Objective
Set up the monorepo structure, development tooling, and CI pipeline.

### Tasks

#### 0.1 Monorepo Initialisation
- [ ] Initialise npm workspace in project root
- [ ] Create `apps/web` directory (React PWA)
- [ ] Create `apps/api` directory (Node.js backend)
- [ ] Create `packages/shared` directory (shared types/utilities)
- [ ] Configure TypeScript project references

#### 0.2 Frontend Scaffolding (apps/web)
- [ ] Scaffold Vite + React + TypeScript project
- [ ] Configure Tailwind CSS
- [ ] Set up path aliases (`@/components`, `@/hooks`, etc.)
- [ ] Create base folder structure per CLAUDE.md
- [ ] Add ESLint + Prettier configuration
- [ ] Create `.env.example` with required variables

#### 0.3 Backend Scaffolding (apps/api)
- [ ] Scaffold Fastify + TypeScript project
- [ ] Configure SQLite with better-sqlite3
- [ ] Set up path aliases
- [ ] Create base folder structure per CLAUDE.md
- [ ] Add ESLint + Prettier configuration
- [ ] Create `.env.example` with required variables

#### 0.4 Shared Package (packages/shared)
- [ ] Set up TypeScript package
- [ ] Define shared types (Camera, Event, Settings, ApiError)
- [ ] Configure exports for consumption by web/api

#### 0.5 Testing Setup
- [ ] Configure Vitest for web package
- [ ] Configure Vitest for api package
- [ ] Set up Playwright for E2E tests
- [ ] Create initial test scripts in package.json

#### 0.6 Development Scripts
- [ ] Root `npm run dev` - starts both web and api
- [ ] Root `npm run build` - builds both packages
- [ ] Root `npm run test` - runs all tests
- [ ] Root `npm run lint` - lints all packages
- [ ] Root `npm run typecheck` - type checks all packages

#### 0.7 Documentation
- [ ] Update README.md with setup instructions
- [ ] Create CHANGELOG.md

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

## Phase 1: Core Infrastructure

### Objective
Establish camera streaming, hub services, and basic PWA shell with authentication.

### Tasks

#### 1.1 Pi Zero Camera Setup Scripts
- [ ] Create `scripts/pi-zero/setup.sh` - initial camera setup
- [ ] Create `scripts/pi-zero/start-stream.sh` - RTSP streaming
- [ ] Create `scripts/pi-zero/health-check.sh` - status reporting
- [ ] Create systemd service file templates
- [ ] Document camera setup procedure
- [ ] Test streaming from Pi Zero to hub

#### 1.2 Pi 4 Hub Setup Scripts
- [ ] Create `scripts/pi-hub/setup.sh` - initial hub setup
- [ ] Create `scripts/pi-hub/install-deps.sh` - install Node, Nginx, etc.
- [ ] Create Nginx configuration template
- [ ] Create Frigate configuration template
- [ ] Create systemd service file templates
- [ ] Create `scripts/pi-hub/update.sh` - application update script
- [ ] Create `scripts/pi-hub/backup.sh` - backup script
- [ ] Document hub setup procedure

#### 1.3 Database Schema
- [ ] Create `apps/api/src/db/migrations/001_initial_schema.sql`
- [ ] Define `cameras` table
- [ ] Define `motion_events` table
- [ ] Define `settings` table
- [ ] Define `sessions` table (for auth)
- [ ] Create migration runner utility
- [ ] Seed script for development data

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
- [ ] Set up Fastify server with plugins (cors, helmet, etc.)
- [ ] Create database connection utility
- [ ] Implement request logging
- [ ] Create error handling middleware
- [ ] Create base route structure

#### 1.5 Authentication API
- [ ] `POST /api/auth/login` - validate PIN, create session
- [ ] `POST /api/auth/logout` - invalidate session
- [ ] `GET /api/auth/verify` - check session validity
- [ ] Authentication middleware for protected routes
- [ ] PIN hashing utility (bcrypt)

#### 1.6 Camera API (Basic)
- [ ] `GET /api/cameras` - list all cameras
- [ ] `GET /api/cameras/:id` - get camera details
- [ ] `POST /api/cameras/:id/health` - receive health check from camera

#### 1.7 System API (Basic)
- [ ] `GET /api/system/status` - basic hub health
- [ ] `GET /api/settings` - get app settings
- [ ] `PUT /api/settings` - update settings (including PIN)

#### 1.8 PWA Shell
- [ ] Configure Vite PWA plugin
- [ ] Create manifest.json
- [ ] Create service worker (basic caching)
- [ ] Set up React Router with routes:
  - `/login` - PIN entry
  - `/` - Dashboard (protected)
  - `/live` - Live view (protected)
  - `/events` - Events (protected, placeholder)
  - `/settings` - Settings (protected, placeholder)

#### 1.9 Authentication UI
- [ ] Create PIN entry component
- [ ] Create auth context/hook (`useAuth`)
- [ ] Implement protected route wrapper
- [ ] Session persistence (localStorage)
- [ ] Auto-logout on session expiry

#### 1.10 Basic Layout
- [ ] Create app shell layout (header, nav, content)
- [ ] Create bottom navigation component
- [ ] Create loading spinner component
- [ ] Create error message component
- [ ] Implement dark/light theme support (CSS variables)

### Deliverables
- Camera streaming to hub via RTSP
- Hub receiving camera health checks
- PWA loads and prompts for PIN
- Successful login shows dashboard shell
- Session persists across page reload

### Acceptance Criteria
- [ ] Pi Zero streams video accessible at `rtsp://camera-ip:8554/stream`
- [ ] Hub API responds at `http://hub-ip:3000/api/system/status`
- [ ] PWA loads at `http://hub-ip/`
- [ ] Invalid PIN shows error
- [ ] Valid PIN redirects to dashboard
- [ ] Refresh maintains logged-in state
- [ ] Logout returns to login screen

### Tests Required
**Unit:**
- PIN validation logic
- Session token generation
- Auth middleware

**E2E:**
- Login flow (valid/invalid PIN)
- Protected route redirect
- Logout flow

---

## Phase 2: Live View

### Objective
Display live camera feeds in a responsive grid with single-camera fullscreen view.

### Tasks

#### 2.1 Stream Handling Utilities
- [ ] Create HLS.js wrapper hook (`useHlsStream`)
- [ ] Handle stream connection/disconnection
- [ ] Implement auto-reconnection with backoff
- [ ] Create stream status detection (loading, playing, error)

#### 2.2 Camera API Extensions
- [ ] `GET /api/cameras/:id/stream` - get stream URL/config
- [ ] Update camera status on health check
- [ ] Track last-seen timestamp

#### 2.3 Camera Grid Component
- [ ] Create `CameraGrid` component
- [ ] Responsive grid layout (1-4 cameras)
- [ ] Camera card with:
  - Video stream
  - Camera name overlay
  - Status indicator (online/offline)
  - Last seen time (if offline)
- [ ] Handle camera click (navigate to single view)

#### 2.4 Single Camera View
- [ ] Create `CameraView` page component
- [ ] Fullscreen video display
- [ ] Stream quality indicator
- [ ] Back navigation
- [ ] Quick settings access button
- [ ] Pinch-to-zoom (optional, stretch goal)

#### 2.5 Live View Page
- [ ] Create `/live` page
- [ ] Integrate camera grid
- [ ] Add refresh button
- [ ] Add camera filter (if >4 cameras)
- [ ] Loading skeleton while fetching cameras

#### 2.6 Dashboard Integration
- [ ] Update dashboard to show camera grid summary
- [ ] Show camera count and status summary
- [ ] Quick link to full live view

#### 2.7 Offline Handling
- [ ] Graceful display when camera offline
- [ ] Retry connection button
- [ ] Visual distinction for offline cameras

### Deliverables
- Live view showing all camera feeds
- Tap camera to view fullscreen
- Clear online/offline status
- Auto-reconnection on stream drop

### Acceptance Criteria
- [ ] Live view loads within 3 seconds
- [ ] All online cameras show video
- [ ] Offline cameras show last-seen time
- [ ] Tapping camera opens fullscreen view
- [ ] Stream reconnects after network drop
- [ ] Works on mobile viewport

### Tests Required
**Unit:**
- Stream status detection
- Reconnection logic
- Grid layout calculation

**E2E:**
- Navigate to live view
- View single camera fullscreen
- Return to grid
- Handle offline camera display

---

## Phase 3: Motion Detection & Recording

### Objective
Integrate Frigate for motion detection, configure recording, and manage storage.

### Tasks

#### 3.1 Frigate Integration
- [ ] Finalise Frigate configuration for all cameras
- [ ] Configure motion detection sensitivity
- [ ] Set up clip recording (pre-roll, post-roll)
- [ ] Configure snapshot generation
- [ ] Test motion detection triggers

#### 3.2 Frigate Event Webhook
- [ ] Create webhook endpoint `POST /api/frigate/events`
- [ ] Parse Frigate event payload
- [ ] Create motion_event record in database
- [ ] Link to video clip and thumbnail paths
- [ ] Handle event updates (end of motion)

#### 3.3 Event Storage Management
- [ ] Create storage monitoring service
- [ ] Implement automatic cleanup (retention days)
- [ ] Respect "important" flag (don't delete)
- [ ] Create `GET /api/system/storage` endpoint
- [ ] Alert when storage exceeds threshold

#### 3.4 Camera Settings API
- [ ] `PUT /api/cameras/:id` - update camera settings
- [ ] Motion sensitivity setting
- [ ] Notification enable/disable per camera
- [ ] Sync settings to Frigate config (restart required)

#### 3.5 Motion Zone Foundation
- [ ] Store motion zones in camera record
- [ ] Define zone data structure (polygon coordinates)
- [ ] API to update zones (UI in Phase 6)

#### 3.6 Event API
- [ ] `GET /api/events` - list events (paginated)
  - Filter by camera
  - Filter by date range
  - Filter by importance
- [ ] `GET /api/events/:id` - get event details
- [ ] `GET /api/events/:id/thumbnail` - serve thumbnail
- [ ] `GET /api/events/:id/video` - serve video clip

### Deliverables
- Motion detected and recorded automatically
- Events created in database with clips
- Thumbnails generated for each event
- Old clips cleaned up per retention policy

### Acceptance Criteria
- [ ] Motion in camera view triggers recording
- [ ] Recording includes 5s pre-roll, 10s post-roll
- [ ] Event appears in database within 5 seconds
- [ ] Thumbnail accessible via API
- [ ] Video clip accessible via API
- [ ] Clips older than retention period deleted
- [ ] "Important" clips not deleted

### Tests Required
**Unit:**
- Frigate webhook parsing
- Storage calculation
- Retention cleanup logic

**E2E:**
- Trigger motion (manual test)
- Verify event created
- Verify clip playable

---

## Phase 4: Event Timeline & Playback

### Objective
Build event browsing interface with filtering and video playback.

### Tasks

#### 4.1 Event List Component
- [ ] Create `EventList` component
- [ ] Chronological list with infinite scroll
- [ ] Event card showing:
  - Thumbnail
  - Camera name
  - Timestamp
  - Duration
  - Important/false alarm badges
- [ ] Pull-to-refresh

#### 4.2 Event Filters
- [ ] Create filter component
- [ ] Filter by camera (multi-select)
- [ ] Filter by date range (date picker)
- [ ] Filter by time of day
- [ ] Filter by importance
- [ ] Clear filters button
- [ ] Persist filter state in URL

#### 4.3 Events Page
- [ ] Create `/events` page
- [ ] Integrate event list and filters
- [ ] Empty state when no events
- [ ] Loading skeleton

#### 4.4 Video Player Component
- [ ] Create `VideoPlayer` component
- [ ] Play/pause controls
- [ ] Seek bar with progress
- [ ] Playback speed control (0.5x, 1x, 2x)
- [ ] Fullscreen toggle
- [ ] Time display (current/total)

#### 4.5 Event Detail Page
- [ ] Create `/events/:id` page
- [ ] Video player with clip
- [ ] Event metadata display
- [ ] Navigation to prev/next event
- [ ] Actions:
  - Mark as important
  - Mark as false alarm
  - Delete event
  - Download clip

#### 4.6 Event Management API
- [ ] `PUT /api/events/:id` - update event (important, false alarm)
- [ ] `DELETE /api/events/:id` - delete single event
- [ ] `POST /api/events/bulk-delete` - delete multiple events
- [ ] `GET /api/events/:id/download` - download clip with proper headers

#### 4.7 Dashboard Events Widget
- [ ] Show recent events on dashboard
- [ ] Quick stats (today's count, important count)
- [ ] Link to full events page

### Deliverables
- Scrollable event timeline with thumbnails
- Filterable by camera, date, time
- Video playback with full controls
- Mark important / false alarm
- Delete and download clips

### Acceptance Criteria
- [ ] Events load with pagination (20 per page)
- [ ] Filters update list immediately
- [ ] Video plays smoothly
- [ ] Playback controls work correctly
- [ ] Mark important persists to database
- [ ] Delete removes event and clip
- [ ] Download saves file to device

### Tests Required
**Unit:**
- Event filtering logic
- Pagination calculation
- Video player state

**E2E:**
- Browse events list
- Apply filters
- Play video
- Mark important
- Delete event
- Download clip

---

## Phase 5: Notifications

### Objective
Send push notifications on motion detection with configurable settings.

### Tasks

#### 5.1 Notification Service
- [ ] Create notification service in API
- [ ] Support Web Push API
- [ ] Support ntfy.sh fallback
- [ ] Support Pushover fallback (optional)
- [ ] Notification queuing (avoid spam)
- [ ] Cooldown period between notifications

#### 5.2 Web Push Setup
- [ ] Generate VAPID keys
- [ ] Create subscription endpoint `POST /api/notifications/subscribe`
- [ ] Store subscriptions in database
- [ ] Unsubscribe endpoint `POST /api/notifications/unsubscribe`

#### 5.3 Notification Triggers
- [ ] Send notification on Frigate event
- [ ] Include camera name in notification
- [ ] Include thumbnail if supported
- [ ] Deep link to event detail
- [ ] Respect per-camera notification settings
- [ ] Respect quiet hours

#### 5.4 Notification Settings API
- [ ] `GET /api/settings/notifications` - get notification config
- [ ] `PUT /api/settings/notifications` - update config
- [ ] Quiet hours start/end
- [ ] Cooldown period
- [ ] Per-camera enable/disable

#### 5.5 Notification UI
- [ ] Permission request flow
- [ ] Test notification button
- [ ] Subscription status display

#### 5.6 Settings Page - Notifications
- [ ] Quiet hours configuration
- [ ] Cooldown period slider
- [ ] Per-camera toggles
- [ ] Push permission status
- [ ] ntfy.sh topic configuration (optional)

### Deliverables
- Push notifications on motion
- Configurable quiet hours
- Per-camera notification control
- Tap notification to open event

### Acceptance Criteria
- [ ] Notification arrives within 10 seconds of motion
- [ ] Notification shows camera name
- [ ] Tap notification opens event detail
- [ ] No notifications during quiet hours
- [ ] Cooldown prevents notification spam
- [ ] Disabled camera doesn't send notifications

### Tests Required
**Unit:**
- Quiet hours logic
- Cooldown logic
- Notification payload format

**E2E:**
- Enable notifications
- Receive test notification
- Configure quiet hours
- Toggle camera notifications

---

## Phase 6: Settings & Administration

### Objective
Complete camera management, motion zone editor, recording schedules, and system health dashboard.

### Tasks

#### 6.1 Camera Management
- [ ] Create `/cameras` page - list all cameras
- [ ] Create `/cameras/add` page - add camera wizard
  - Enter stream URL
  - Test connection
  - Name camera
  - Save
- [ ] Create `/cameras/:id/settings` page
  - Edit name
  - View connection details
  - Motion sensitivity slider
  - Notification toggle
  - Delete camera (with confirmation)

#### 6.2 Camera API Extensions
- [ ] `POST /api/cameras` - add new camera
- [ ] `DELETE /api/cameras/:id` - remove camera
- [ ] `POST /api/cameras/:id/test` - test stream connection
- [ ] Update Frigate config on camera changes

#### 6.3 Motion Zone Editor
- [ ] Create `MotionZoneEditor` component
- [ ] Display camera feed as background
- [ ] Draw polygon overlay
- [ ] Add/remove zone points
- [ ] Clear/reset zones
- [ ] Save zones to camera settings
- [ ] Integrate into camera settings page

#### 6.4 Recording Schedule
- [ ] Create `ScheduleEditor` component
- [ ] Weekly grid (days × hours)
- [ ] Toggle recording on/off per block
- [ ] Quick presets:
  - Always on
  - Delivery hours (7am-7pm weekdays)
  - Custom
- [ ] Save schedule to camera settings
- [ ] API integration for schedule

#### 6.5 System Settings Page
- [ ] Storage retention period (days slider)
- [ ] App PIN change
- [ ] Theme toggle (light/dark)
- [ ] About section (version, links)

#### 6.6 System Health Dashboard
- [ ] Create `/system` page
- [ ] Hub stats:
  - CPU temperature
  - Storage usage (bar chart)
  - Uptime
  - Service status
- [ ] Per-camera stats:
  - Connection status
  - Last seen
  - Stream health
- [ ] Network diagnostics (ping test)

#### 6.7 System API Extensions
- [ ] `GET /api/system/health` - detailed system health
  - CPU temp
  - Memory usage
  - Disk usage
  - Service statuses
- [ ] `GET /api/system/cameras/health` - all camera health
- [ ] `POST /api/system/restart/:service` - restart service (with auth)

### Deliverables
- Add/edit/remove cameras via UI
- Visual motion zone editor
- Recording schedule configuration
- System health monitoring

### Acceptance Criteria
- [ ] Can add new camera via wizard
- [ ] Can edit camera name and settings
- [ ] Can delete camera (with confirmation)
- [ ] Motion zone editor saves valid polygons
- [ ] Recording schedule applies correctly
- [ ] System health shows accurate stats
- [ ] PIN change works correctly

### Tests Required
**Unit:**
- Zone polygon validation
- Schedule parsing
- Health stat calculations

**E2E:**
- Add camera flow
- Edit camera settings
- Draw motion zone
- Set recording schedule
- Change PIN
- View system health

---

## Phase 7: Polish & Optimisation

### Objective
Performance improvements, UX refinements, and full PWA capabilities.

### Tasks

#### 7.1 Performance Optimisation
- [ ] Lazy load event thumbnails (intersection observer)
- [ ] Virtual scrolling for event list (>100 items)
- [ ] Image optimisation (WebP thumbnails)
- [ ] API response caching (short TTL)
- [ ] Stream quality auto-adjustment based on network
- [ ] Code splitting for routes

#### 7.2 PWA Enhancements
- [ ] Offline mode - view cached events
- [ ] Background sync for actions taken offline
- [ ] Install prompt (beforeinstallprompt)
- [ ] App icon and splash screen
- [ ] iOS standalone mode support

#### 7.3 UX Improvements
- [ ] Onboarding flow for first-time setup
- [ ] Empty states with helpful prompts
- [ ] Loading skeletons for all async content
- [ ] Toast notifications for actions
- [ ] Pull-to-refresh on all lists
- [ ] Keyboard shortcuts (desktop)

#### 7.4 Error Handling Polish
- [ ] Friendly error messages (no stack traces)
- [ ] Retry buttons for failed operations
- [ ] Network status indicator
- [ ] Auto-retry for transient failures

#### 7.5 Accessibility
- [ ] Keyboard navigation
- [ ] Screen reader labels
- [ ] Focus management
- [ ] Colour contrast compliance
- [ ] Reduced motion support

#### 7.6 Final Testing
- [ ] Full regression test suite
- [ ] Cross-browser testing (Chrome, Safari, Firefox)
- [ ] Mobile device testing (iOS, Android)
- [ ] Performance audit (Lighthouse)
- [ ] Security audit

#### 7.7 Documentation
- [ ] User guide (README)
- [ ] Troubleshooting guide
- [ ] API documentation (OpenAPI spec)
- [ ] Contribution guidelines

### Deliverables
- Smooth, responsive application
- Full PWA install experience
- Offline capability
- Production-ready quality

### Acceptance Criteria
- [ ] Lighthouse performance score >90
- [ ] Lighthouse PWA score 100
- [ ] No console errors in production
- [ ] Works offline for cached content
- [ ] Installs as native app on mobile
- [ ] All tests passing

---

## Implementation Order

### Recommended Sequence

```
Phase 0 ─────► Phase 1 ─────► Phase 2 ─────► Phase 3
(Scaffolding)  (Infrastructure) (Live View)   (Recording)
                    │
                    ├─── Hardware setup can start here
                    │
                                                  │
                                                  ▼
              Phase 7 ◄───── Phase 6 ◄───── Phase 5 ◄───── Phase 4
              (Polish)       (Settings)    (Notifications)  (Events)
```

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

*Last Updated: [Date]*
*Version: 1.0.0*
