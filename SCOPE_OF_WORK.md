# ParcelGuard - Scope of Work

## Project Overview

**Project Name:** ParcelGuard

**Purpose:** Multi-camera security system for monitoring communal areas in residential buildings, with focus on detecting and recording parcel theft.

**Target Users:** Residents of blocks of flats experiencing parcel theft, particularly where building management has declined to address the issue.

---

## Technical Architecture

### Frontend

- **Framework:** React (PWA)
- **Styling:** Tailwind CSS
- **State Management:** React Context / Zustand (TBD)
- **Build Tool:** Vite
- **Testing:** Playwright (E2E), Vitest (unit)

### Backend

- **Runtime:** Node.js with Express / Fastify
  - _Alternative:_ Python with FastAPI
- **Database:** SQLite (sufficient for single-hub deployment)
- **Video Processing:** Frigate or Motion daemon

### Camera Units

- **OS:** Raspberry Pi OS Lite
- **Streaming:** rpicam-vid (RTSP or HTTP)

### Communication

- **Live Streaming:** HLS or WebRTC
- **API:** REST (JSON)
- **Notifications:** Web Push API / ntfy.sh / Pushover

---

## Feature Specification

### Phase 1: Core Infrastructure

#### 1.1 Camera Streaming Setup

- [ ] Configure Pi Zero units with Raspberry Pi OS Lite
- [ ] Set up rpicam-vid for network streaming
- [ ] Establish reliable WiFi connectivity
- [ ] Test stream stability and latency

#### 1.2 Hub Configuration

- [ ] Install Raspberry Pi OS on Pi 4
- [ ] Configure SSD storage mount
- [ ] Install and configure Frigate/Motion
- [ ] Set up backend API service
- [ ] Configure auto-start on boot

#### 1.3 Basic PWA Shell

- [ ] React project scaffolding
- [ ] PWA manifest and service worker
- [ ] Basic routing structure
- [ ] Authentication system (PIN or password)

**Milestone:** Cameras streaming to hub, basic app loads

---

### Phase 2: Live View

#### 2.1 Multi-Camera Grid

- [ ] Dashboard showing all camera feeds in grid layout
- [ ] Camera name and status overlay
- [ ] Connection status indicator (online/offline)
- [ ] Last-seen timestamp for offline cameras

#### 2.2 Single Camera View

- [ ] Tap to expand camera to fullscreen
- [ ] Pinch-to-zoom functionality
- [ ] Stream quality indicator
- [ ] Quick-access to camera settings

#### 2.3 Stream Handling

- [ ] HLS.js integration for HTTP streams
- [ ] Auto-reconnection on stream drop
- [ ] Buffering/loading states
- [ ] Graceful degradation when camera offline

**Milestone:** Live viewing of all cameras from mobile device

---

### Phase 3: Motion Detection & Recording

#### 3.1 Motion Detection Configuration

- [ ] Frigate/Motion integration on hub
- [ ] Per-camera sensitivity settings
- [ ] Motion zone definition (mask areas to ignore)
- [ ] Minimum motion duration threshold

#### 3.2 Recording

- [ ] Pre-roll buffer (5-10 seconds before motion)
- [ ] Post-roll recording (10-30 seconds after motion stops)
- [ ] Clip file naming convention (camera_timestamp)
- [ ] Automatic clip segmentation

#### 3.3 Storage Management

- [ ] Automatic deletion of clips older than X days
- [ ] Storage usage monitoring
- [ ] Disk space alerts
- [ ] Manual retention override ("keep forever")

**Milestone:** Motion-triggered recording working, clips saved to SSD

---

### Phase 4: Event Timeline & Playback

#### 4.1 Event List

- [ ] Chronological list of motion events
- [ ] Thumbnail generation for each event
- [ ] Event metadata (camera, timestamp, duration)
- [ ] Filter by camera
- [ ] Filter by date range
- [ ] Filter by time of day

#### 4.2 Event Playback

- [ ] Video player for recorded clips
- [ ] Playback controls (play, pause, seek, speed)
- [ ] Fullscreen mode
- [ ] Skip to next/previous event

#### 4.3 Event Management

- [ ] Mark event as "important" (prevents auto-delete)
- [ ] Mark event as "false alarm" (for review/tuning)
- [ ] Delete individual events
- [ ] Bulk delete functionality
- [ ] Download clip to device

**Milestone:** Full event history browsable and playable in app

---

### Phase 5: Notifications

#### 5.1 Push Notification Setup

- [ ] Web Push API integration
- [ ] Notification permission request flow
- [ ] Fallback options (ntfy.sh, Pushover)

#### 5.2 Notification Content

- [ ] Motion detected alert
- [ ] Snapshot thumbnail in notification (where supported)
- [ ] Deep link to relevant event

#### 5.3 Notification Settings

- [ ] Enable/disable per camera
- [ ] Quiet hours configuration
- [ ] Notification grouping (avoid spam during continuous motion)
- [ ] Cooldown period between alerts

**Milestone:** Real-time push notifications on motion detection

---

### Phase 6: Settings & Administration

#### 6.1 Camera Management

- [ ] Add new camera (setup wizard)
- [ ] Remove camera
- [ ] Edit camera name
- [ ] Camera connection details
- [ ] Per-camera settings panel

#### 6.2 Motion Zone Editor

- [ ] Visual overlay on camera feed
- [ ] Draw/erase detection zones
- [ ] Invert zones (detect everywhere except)
- [ ] Save/reset zones

#### 6.3 Recording Schedule

- [ ] Enable/disable recording by time
- [ ] Day-of-week scheduling
- [ ] Quick presets (e.g., "Delivery hours 7am-7pm")

#### 6.4 System Settings

- [ ] Storage retention period
- [ ] Notification preferences
- [ ] App PIN/password change
- [ ] Theme (light/dark)

#### 6.5 System Health Dashboard

- [ ] Hub CPU temperature
- [ ] Hub storage usage (used/free)
- [ ] Hub uptime
- [ ] Per-camera connection status
- [ ] Network diagnostics

**Milestone:** Full administrative control via app

---

### Phase 7: Polish & Optimisation

#### 7.1 Performance

- [ ] Lazy loading of event thumbnails
- [ ] Virtual scrolling for long event lists
- [ ] Stream quality auto-adjustment based on network
- [ ] Offline mode (view cached events)

#### 7.2 UX Improvements

- [ ] Onboarding flow for first-time setup
- [ ] Empty states and helpful prompts
- [ ] Error handling and user feedback
- [ ] Loading skeletons

#### 7.3 PWA Features

- [ ] Install prompt
- [ ] Offline capability (cached UI, recent events)
- [ ] Background sync for notifications
- [ ] App icon and splash screen

**Milestone:** Production-ready application

---

## Screen Inventory

| Screen             | Description                         | Phase |
| ------------------ | ----------------------------------- | ----- |
| Login              | PIN/password entry                  | 1     |
| Dashboard          | Camera grid + recent events summary | 2     |
| Live View (Grid)   | Multi-camera live feeds             | 2     |
| Live View (Single) | Fullscreen single camera            | 2     |
| Events             | Timeline list of motion events      | 4     |
| Event Detail       | Single event playback               | 4     |
| Cameras            | List of configured cameras          | 6     |
| Camera Settings    | Individual camera configuration     | 6     |
| Motion Zones       | Visual zone editor                  | 6     |
| Schedule           | Recording schedule configuration    | 6     |
| Settings           | App and system settings             | 6     |
| System Health      | Hub status and diagnostics          | 6     |
| Add Camera         | Setup wizard for new cameras        | 6     |

---

## API Endpoints (Draft)

### Cameras

- `GET /api/cameras` - List all cameras
- `GET /api/cameras/:id` - Get camera details
- `POST /api/cameras` - Add new camera
- `PUT /api/cameras/:id` - Update camera settings
- `DELETE /api/cameras/:id` - Remove camera
- `GET /api/cameras/:id/stream` - Get stream URL

### Events

- `GET /api/events` - List events (paginated, filterable)
- `GET /api/events/:id` - Get event details
- `GET /api/events/:id/video` - Stream event video
- `GET /api/events/:id/thumbnail` - Get event thumbnail
- `PUT /api/events/:id` - Update event (mark important, etc.)
- `DELETE /api/events/:id` - Delete event

### System

- `GET /api/system/status` - Hub health status
- `GET /api/system/storage` - Storage usage
- `GET /api/settings` - Get app settings
- `PUT /api/settings` - Update settings

---

## Data Models (Draft)

### Camera

```typescript
interface Camera {
  id: string;
  name: string;
  streamUrl: string;
  status: "online" | "offline";
  lastSeen: Date;
  settings: {
    motionSensitivity: number; // 0-100
    motionZones: Zone[];
    recordingSchedule: Schedule;
    notificationsEnabled: boolean;
  };
}
```

### Event

```typescript
interface Event {
  id: string;
  cameraId: string;
  timestamp: Date;
  duration: number; // seconds
  thumbnailUrl: string;
  videoUrl: string;
  isImportant: boolean;
  isFalseAlarm: boolean;
}
```

### Settings

```typescript
interface Settings {
  retentionDays: number;
  quietHoursStart: string; // "22:00"
  quietHoursEnd: string; // "07:00"
  notificationCooldown: number; // seconds
  appPin: string; // hashed
}
```

---

## Non-Functional Requirements

### Performance

- Live stream latency: < 3 seconds
- Event list load time: < 1 second
- Thumbnail generation: < 5 seconds after event

### Reliability

- Auto-reconnect on stream drop
- Hub service auto-restart on crash
- Graceful handling of camera disconnection

### Security

- PIN/password protection on app
- Local network only (no cloud dependency)
- No external data transmission

### Storage

- Estimated 1GB per camera per day (motion-triggered)
- 256GB SSD = ~4 months retention (2 cameras)

---

## Out of Scope (v1)

- Cloud backup/sync
- Multi-user access control
- Audio recording
- Two-way communication
- Object detection (person vs. animal vs. vehicle)
- Integration with smart home systems
- Public sharing of clips

---

## Development Milestones Summary

| Phase | Description         | Key Deliverable                  |
| ----- | ------------------- | -------------------------------- |
| 1     | Core Infrastructure | Cameras streaming, app shell     |
| 2     | Live View           | View all cameras in real-time    |
| 3     | Motion & Recording  | Automatic clip capture           |
| 4     | Events & Playback   | Browse and watch recorded events |
| 5     | Notifications       | Push alerts on motion            |
| 6     | Settings & Admin    | Full system configuration        |
| 7     | Polish              | Production-ready PWA             |

---

## Legal Considerations

- **GDPR:** System captures footage of other residents and visitors
- **Signage:** Consider "CCTV in operation" notice (strengthens legal position if footage used as evidence)
- **Retention:** Don't keep footage longer than necessary (7-30 days typical)
- **Subject Access:** Anyone filmed can legally request their footage

_Note: This is not legal advice. Consult appropriate resources for compliance._
