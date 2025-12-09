# ParcelGuard: On-Device Motion Detection System

## Statement of Work

**Version:** 1.0  
**Date:** December 2024  
**Author:** Dan / Claude

---

## 1. Executive Summary

This document outlines the architecture and implementation plan for ParcelGuard's on-device motion detection system. The system uses Raspberry Pi Zero 2 W units with ZeroCam NOIR modules to provide intelligent, bandwidth-efficient surveillance over a 4G connection.

**Key design principles:**

- Motion detection happens entirely on-device using GPU-accelerated motion vectors
- Zero bandwidth consumed during idle monitoring
- Rolling 1080p buffer ensures no footage is lost when motion triggers
- Live view available on-demand at 720p without disrupting detection
- Events uploaded to central database only when motion confirmed

---

## 2. System Architecture Overview

```
     COMMUNAL HALLWAY (4G)                         YOUR FLAT (Broadband)
┌─────────────────────────────────┐          ┌────────────────────────────────┐
│  parcelguard-cam1 (Pi Zero 2W)  │          │   parcelguard-hub (Pi 4)       │
│  ┌───────────┐  ┌─────────────┐ │          │                                │
│  │  ZeroCam  │  │ GPU Encoder │ │          │  ┌─────────────────────────┐   │
│  │   NOIR    │─▶│ + Motion    │ │          │  │     API Server          │   │
│  └───────────┘  │   Vectors   │ │          │  │  - Receives events      │   │
│                 └──────┬──────┘ │          │  │  - Serves to app        │   │
│                        │        │          │  │  - Proxies live view    │   │
│              ┌─────────┴──────┐ │          │  └───────────┬─────────────┘   │
│              │ Rolling Buffer │ │          │              │                 │
│              │  10s @ 1080p   │ │          │  ┌───────────┴─────────────┐   │
│              │    [tmpfs]     │ │          │  │      SQLite DB          │   │
│              └───────┬────────┘ │          │  │  - events               │   │
│                      │          │          │  │  - devices              │   │
│            ┌─────────┴────────┐ │          │  └─────────────────────────┘   │
│            │  State Machine   │ │          │                                │
│            └────────┬─────────┘ │          │  ┌─────────────────────────┐   │
│                     │           │          │  │    Video Storage        │   │
│  ┌──────────────────┴─────────┐ │          │  │  /var/parcelguard/      │   │
│  │ RTSP Server (on-demand)    │ │          │  │       videos/           │   │
│  └──────────────────┬─────────┘ │          │  └─────────────────────────┘   │
│                     │           │          │                                │
│  parcelguard-cam2   │           │          │  ┌─────────────────────────┐   │
│  (same setup)       │           │          │  │   MQTT Broker           │   │
│                     │           │          │  │   (mosquitto)           │   │
└─────────────────────┼───────────┘          │  └───────────┬─────────────┘   │
                      │                      │              │                 │
                      │ 4G (metered)         └──────────────┼─────────────────┘
                      │                                     │
                      │   ┌─────────────────────────────────┘
                      │   │
                      ▼   ▼
              ┌───────────────────┐
              │   4G Router       │
              │  (shared by cams) │
              └─────────┬─────────┘
                        │
                        │ Internet
                        ▼
              ┌───────────────────┐
              │  Your broadband   │
              │    router         │
              └─────────┬─────────┘
                        │
            ┌───────────┴───────────┐
            │                       │
            ▼                       ▼
    ┌──────────────┐       ┌──────────────┐
    │ parcelguard- │       │  Mobile App  │
    │     hub      │       │  (remote)    │
    └──────────────┘       └──────────────┘

DATA COSTS:
  4G (metered):  Camera events → Hub
                 Camera live view → Hub (when requested)
                 MQTT commands ← Hub

  Broadband:     Hub → App (free, unmetered)

IDLE STATE 4G USAGE: ~1 KB/min (MQTT heartbeat only)
```

---

## 3. Operating Modes & State Machine

### 3.1 States

| State              | Capture         | Live Stream    | Motion Detection | Network Usage             | Description        |
| ------------------ | --------------- | -------------- | ---------------- | ------------------------- | ------------------ |
| `IDLE`             | 1080p buffer    | Off            | Active (GPU)     | Heartbeat only (~1KB/min) | Default state      |
| `MOTION_DETECTED`  | 1080p recording | Off            | Active           | Queued upload             | Event in progress  |
| `UPLOADING`        | 1080p buffer    | Off            | Active           | Active (upload)           | Sending event      |
| `LIVE_VIEW`        | 1080p buffer    | 720p streaming | Active           | Active (stream)           | User watching      |
| `LIVE_VIEW_MOTION` | 1080p recording | 720p streaming | Active           | Active (both)             | Motion during live |

### 3.2 State Transitions

```
                    ┌──────────────────────────────────────┐
                    │                                      │
                    ▼                                      │
              ┌──────────┐                                 │
       ┌─────▶│   IDLE   │◀─────────────────────┐         │
       │      └────┬─────┘                      │         │
       │           │                            │         │
       │           │ motion detected            │         │
       │           ▼                            │         │
       │    ┌──────────────────┐                │         │
       │    │ MOTION_DETECTED  │────────────────┤         │
       │    └────────┬─────────┘                │         │
       │             │                          │         │
       │             │ motion ends +            │ upload  │
       │             │ cooldown expires         │ complete│
       │             ▼                          │         │
       │      ┌─────────────┐                   │         │
       │      │  UPLOADING  │───────────────────┘         │
       │      └─────────────┘                             │
       │                                                  │
       │ live view    ┌─────────────┐    live view        │
       │ requested    │  LIVE_VIEW  │    ended            │
       └──────────────┤             ├─────────────────────┘
                      └──────┬──────┘
                             │
                             │ motion detected
                             ▼
                   ┌───────────────────┐
                   │ LIVE_VIEW_MOTION  │
                   └───────────────────┘
```

---

## 4. Technical Specifications

### 4.1 Estimated 4G Data Usage (Cameras)

**This is the critical metric — all camera traffic is metered.**

| Activity               | Data per event | Frequency  | Monthly estimate |
| ---------------------- | -------------- | ---------- | ---------------- |
| MQTT heartbeat         | ~1 KB/min      | Continuous | ~45 MB           |
| Motion event (30 sec)  | ~15-20 MB      | ~5/day     | ~2.5 GB          |
| Motion event (60 sec)  | ~30-40 MB      | ~2/day     | ~2 GB            |
| Live view (per minute) | ~15-20 MB      | On-demand  | Variable         |

**Typical monthly usage per camera:**

| Scenario        | Events/day | Live view/month | Total 4G |
| --------------- | ---------- | --------------- | -------- |
| Low activity    | 2-3        | 30 min          | ~2 GB    |
| Medium activity | 5-8        | 1 hour          | ~5 GB    |
| High activity   | 10+        | 2 hours         | ~10 GB   |

**With 2 cameras, budget for 4-20 GB/month depending on activity.**

**Compared to constant streaming:**

- 720p continuous (2 cams): **~1.5 TB/month**
- This architecture (medium): **~10 GB/month** (99% reduction)

**Hub → App traffic (your broadband, unmetered):**
Viewing events and live streams from the app goes through your home broadband, not the cameras' 4G.

### 4.2 Hardware Requirements (Per Camera Unit)

| Component | Specification         | Notes                                     |
| --------- | --------------------- | ----------------------------------------- |
| SBC       | Raspberry Pi Zero 2 W | Quad-core Cortex-A53, 512MB RAM           |
| Camera    | ZeroCam NOIR (OV5647) | Legacy stack compatible                   |
| Storage   | 16GB+ microSD         | Class 10 / A1 minimum                     |
| Power     | 5V 2.5A               | Adequate headroom for sustained encoding  |
| Cooling   | Heatsink recommended  | Prevents thermal throttling during events |

### 4.3 Video Specifications

| Stream           | Resolution | FPS | Codec            | Bitrate  | Purpose                       |
| ---------------- | ---------- | --- | ---------------- | -------- | ----------------------------- |
| Buffer/Record    | 1920×1080  | 24  | H.264 (hardware) | 4-6 Mbps | Always running, event capture |
| Live View        | 1280×720   | 24  | H.264 (hardware) | 2-3 Mbps | **On-demand only** via RTSP   |
| Motion Detection | N/A        | N/A | Motion vectors   | ~1 KB/s  | GPU-extracted during encoding |

**Key bandwidth savings:** In IDLE state, the camera uses approximately **1KB/minute** for MQTT heartbeat only. No video data leaves the device until an event occurs or live view is requested.

### 4.4 Buffer Specifications

| Parameter           | Value       | Rationale                           |
| ------------------- | ----------- | ----------------------------------- |
| Pre-roll buffer     | 10 seconds  | Capture activity leading to trigger |
| Post-roll recording | 10 seconds  | Continue after motion stops         |
| Cooldown period     | 5 seconds   | Prevent rapid re-triggering         |
| Max event duration  | 5 minutes   | Prevent runaway recordings          |
| Buffer storage      | RAM (tmpfs) | Reduce SD card wear                 |

### 4.5 Motion Detection Parameters

| Parameter          | Default    | Range        | Notes                              |
| ------------------ | ---------- | ------------ | ---------------------------------- |
| `motion_threshold` | 60         | 10-200       | Vector magnitude sum to trigger    |
| `motion_frames`    | 3          | 1-10         | Consecutive frames above threshold |
| `detection_zones`  | Full frame | Configurable | Mask areas to ignore               |
| `sensitivity`      | Medium     | Low/Med/High | Preset threshold profiles          |

---

## 5. Software Architecture

### 5.1 Technology Stack

**Camera Units (parcelguard-cam1, parcelguard-cam2)**

| Layer            | Technology                    | Notes                                    |
| ---------------- | ----------------------------- | ---------------------------------------- |
| OS               | Raspberry Pi OS Lite (Legacy) | Minimal footprint, legacy camera support |
| Camera Interface | picamera (Python)             | GPU motion vector access                 |
| Application      | Python 3.9+                   | Main control logic                       |
| MQTT Client      | paho-mqtt                     | Communication with hub                   |
| HTTP Client      | aiohttp / requests            | Event upload to hub                      |

**Hub (parcelguard-hub)**

| Layer         | Technology            | Notes                               |
| ------------- | --------------------- | ----------------------------------- |
| OS            | Raspberry Pi OS       | Full desktop not required           |
| Database      | SQLite3               | Events, devices, settings           |
| MQTT Broker   | Mosquitto             | Local broker, exposed via 4G router |
| API Server    | FastAPI / Flask       | Receives events, serves app         |
| Storage       | Local filesystem      | /var/parcelguard/videos             |
| Reverse Proxy | Caddy / nginx         | HTTPS termination, auth             |
| Remote Access | Tailscale / WireGuard | Secure tunnel to hub (optional)     |

### 5.2 Module Structure

**Camera (parcelguard-cam1, parcelguard-cam2)**

```
parcelguard-camera/
├── config/
│   ├── config.yaml           # Device configuration
│   └── zones.json            # Motion detection zones
├── src/
│   ├── __init__.py
│   ├── main.py               # Entry point, state machine
│   ├── camera.py             # Camera control, picamera wrapper
│   ├── motion.py             # Motion vector analysis
│   ├── buffer.py             # Rolling buffer management
│   ├── recorder.py           # Event recording logic
│   ├── uploader.py           # HTTP upload to hub
│   ├── live_stream.py        # RTSP server for live view
│   ├── mqtt_client.py        # Command/control interface
│   └── utils/
│       ├── logging.py        # Structured logging
│       └── health.py         # Health check endpoint
├── tests/
├── scripts/
│   ├── install.sh            # Deployment script
│   └── update.sh             # OTA update script
├── systemd/
│   └── parcelguard-camera.service
├── requirements.txt
└── README.md
```

**Hub (parcelguard-hub)**

```
parcelguard-hub/
├── config/
│   └── config.yaml           # Hub configuration
├── src/
│   ├── __init__.py
│   ├── main.py               # Entry point
│   ├── api/
│   │   ├── __init__.py
│   │   ├── routes.py         # API endpoints
│   │   ├── events.py         # Event CRUD
│   │   ├── devices.py        # Device management
│   │   └── live.py           # Live view proxy
│   ├── db/
│   │   ├── __init__.py
│   │   ├── database.py       # SQLite connection
│   │   └── models.py         # Data models
│   ├── mqtt_broker.py        # Mosquitto management
│   ├── storage.py            # Video file management
│   ├── retention.py          # Cleanup old files
│   └── notifications.py      # Push notifications (Pushover/ntfy)
├── tests/
├── scripts/
│   └── install.sh
├── systemd/
│   └── parcelguard-hub.service
├── requirements.txt
└── README.md
```

### 5.3 Core Classes

#### CameraController

```python
class CameraController:
    """
    Manages picamera instance and coordinates streams.

    The camera always captures at 1080p to a rolling buffer.
    720p live streaming is started/stopped on-demand via MQTT commands.
    Uses picamera's splitter to output multiple resolutions when needed.
    """

    def __init__(self, config: CameraConfig):
        self.config = config
        self.camera: picamera.PiCamera = None
        self.motion_analyser: MotionAnalyser = None
        self.buffer: RollingBuffer = None
        self.live_stream_active: bool = False

    async def start_idle_monitoring(self) -> None:
        """
        Start 1080p capture with motion detection.
        No network usage - buffer stored locally in RAM.
        """

    async def start_recording(self) -> str:
        """
        Begin recording event from buffer, returns event_id.
        Saves pre-roll buffer and continues recording.
        """

    async def stop_recording(self) -> Path:
        """Stop recording, finalize file, return path for upload."""

    async def start_live_stream(self) -> str:
        """
        Start 720p RTSP stream on-demand.
        Uses splitter port 2 to avoid interrupting 1080p buffer.
        Returns stream URL for client.
        """

    async def stop_live_stream(self) -> None:
        """Stop live stream, continue 1080p buffering."""
```

#### MotionAnalyser

```python
class MotionAnalyser(picamera.array.PiMotionAnalysis):
    """
    GPU motion vector analysis with configurable zones and thresholds.
    """

    def __init__(self, camera: picamera.PiCamera, config: MotionConfig):
        super().__init__(camera)
        self.config = config
        self.callback: Callable = None
        self.consecutive_frames = 0
        self.zone_mask: np.ndarray = None

    def analyse(self, motion_data: np.ndarray) -> None:
        """
        Called by picamera for each frame's motion vectors.
        Near-zero CPU cost - vectors computed by GPU during encoding.
        """

    def set_motion_callback(self, callback: Callable[[MotionEvent], None]) -> None:
        """Register callback for motion detection events."""

    def load_zone_mask(self, zones: List[Zone]) -> None:
        """Load detection zones, mask ignored areas."""
```

#### RollingBuffer

```python
class RollingBuffer:
    """
    RAM-based circular buffer for pre-roll footage.
    Uses tmpfs to avoid SD card wear.
    """

    def __init__(self, duration_seconds: int = 10, storage_path: Path = Path('/dev/shm/parcelguard')):
        self.duration = duration_seconds
        self.storage_path = storage_path
        self.segments: Deque[BufferSegment] = deque()

    def write_segment(self, data: bytes, timestamp: float) -> None:
        """Add segment to buffer, evict old segments."""

    def get_buffer_contents(self) -> bytes:
        """Return concatenated buffer for pre-roll."""

    def clear(self) -> None:
        """Clear buffer contents."""
```

#### StateMachine

```python
class CameraStateMachine:
    """
    Core state machine managing camera operating modes.
    """

    class State(Enum):
        IDLE = "idle"
        MOTION_DETECTED = "motion_detected"
        UPLOADING = "uploading"
        LIVE_VIEW = "live_view"
        LIVE_VIEW_MOTION = "live_view_motion"

    def __init__(self, camera: CameraController, uploader: EventUploader):
        self.state = self.State.IDLE
        self.camera = camera
        self.uploader = uploader
        self.current_event: Optional[Event] = None

    async def handle_motion_detected(self, event: MotionEvent) -> None:
        """Transition to recording state on motion."""

    async def handle_motion_ended(self) -> None:
        """Transition to upload state after cooldown."""

    async def handle_live_view_requested(self) -> str:
        """Start live stream, return URL."""

    async def handle_live_view_ended(self) -> None:
        """Stop live stream, return to appropriate state."""
```

---

## 6. Communication Protocol

### 6.1 Network Topology (Tailscale)

All devices are on the same Tailscale network, making connectivity straightforward:

```
Tailscale Network (100.x.x.x)
┌────────────────────────────────────────────────────────────┐
│                                                            │
│  ┌─────────────────┐  ┌─────────────────┐                 │
│  │ parcelguard-cam1│  │ parcelguard-cam2│                 │
│  │  100.x.x.10     │  │  100.x.x.11     │                 │
│  │  (4G)           │  │  (4G)           │                 │
│  └────────┬────────┘  └────────┬────────┘                 │
│           │                    │                          │
│           └──────────┬─────────┘                          │
│                      │                                    │
│                      ▼                                    │
│           ┌─────────────────────┐                         │
│           │  parcelguard-hub    │                         │
│           │  100.x.x.1          │                         │
│           │  (Broadband)        │                         │
│           │                     │                         │
│           │  :1883 - MQTT       │                         │
│           │  :8080 - API        │                         │
│           └──────────┬──────────┘                         │
│                      │                                    │
│                      ▼                                    │
│           ┌─────────────────────┐                         │
│           │  Your phone/laptop  │                         │
│           │  (Tailscale client) │                         │
│           └─────────────────────┘                         │
│                                                            │
└────────────────────────────────────────────────────────────┘
```

**Advantages:**

- No port forwarding required
- Encrypted end-to-end (WireGuard)
- Works through NAT on both 4G and home broadband
- MagicDNS: cameras can use `parcelguard-hub` hostname instead of IP

### 6.2 MQTT Topics (broker on hub)

| Topic                             | Direction    | Payload       | Purpose                   |
| --------------------------------- | ------------ | ------------- | ------------------------- |
| `parcelguard/{device_id}/status`  | Camera → Hub | JSON status   | Heartbeat, state updates  |
| `parcelguard/{device_id}/command` | Hub → Camera | JSON command  | Remote control            |
| `parcelguard/{device_id}/event`   | Camera → Hub | JSON metadata | Motion event notification |
| `parcelguard/hub/status`          | Hub → All    | JSON          | Hub status broadcast      |

### 6.3 Command Messages

```json
// Request live view
{
    "command": "start_live_view",
    "request_id": "uuid",
    "timestamp": "2024-12-09T10:30:00Z"
}

// Stop live view
{
    "command": "stop_live_view",
    "request_id": "uuid"
}

// Update configuration
{
    "command": "update_config",
    "request_id": "uuid",
    "config": {
        "motion_threshold": 80,
        "sensitivity": "high"
    }
}

// Restart camera service
{
    "command": "restart",
    "request_id": "uuid"
}
```

### 6.4 Event Messages

```json
{
  "event_type": "motion_detected",
  "device_id": "cam1",
  "event_id": "evt_abc123",
  "timestamp": "2024-12-09T10:30:00Z",
  "duration_seconds": 15,
  "motion_score": 127,
  "zones_triggered": ["entrance"]
}
```

### 6.5 Hub API Endpoints

| Method | Endpoint                    | Purpose                       |
| ------ | --------------------------- | ----------------------------- |
| POST   | `/api/events`               | Camera uploads event metadata |
| POST   | `/api/events/{id}/video`    | Camera uploads video file     |
| GET    | `/api/events`               | App lists events              |
| GET    | `/api/events/{id}`          | App gets event details        |
| GET    | `/api/events/{id}/video`    | App streams video             |
| GET    | `/api/devices`              | App lists cameras             |
| GET    | `/api/devices/{id}/live`    | App requests live stream URL  |
| POST   | `/api/devices/{id}/command` | App sends command to camera   |

---

## 7. Database Schema (SQLite on Hub)

### 7.1 Tables

#### devices

```sql
CREATE TABLE devices (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_name TEXT NOT NULL,
    device_id TEXT UNIQUE NOT NULL,  -- e.g., 'cam1', 'cam2'
    location TEXT,
    config TEXT DEFAULT '{}',        -- JSON string
    last_seen TEXT,                  -- ISO 8601 timestamp
    status TEXT DEFAULT 'offline',   -- online, offline, recording
    created_at TEXT DEFAULT (datetime('now')),
    updated_at TEXT DEFAULT (datetime('now'))
);
```

#### events

```sql
CREATE TABLE events (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    device_id TEXT NOT NULL,
    event_type TEXT NOT NULL,        -- 'motion', 'manual', 'scheduled'
    started_at TEXT NOT NULL,        -- ISO 8601 timestamp
    ended_at TEXT,
    duration_seconds INTEGER,
    video_filename TEXT,             -- relative path in /var/parcelguard/videos/
    thumbnail_filename TEXT,
    motion_score INTEGER,
    zones_triggered TEXT,            -- JSON array as string
    metadata TEXT DEFAULT '{}',      -- JSON string
    viewed INTEGER DEFAULT 0,        -- boolean: 0 or 1
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (device_id) REFERENCES devices(device_id)
);

-- Indexes for common queries
CREATE INDEX idx_events_device_time ON events(device_id, started_at DESC);
CREATE INDEX idx_events_unviewed ON events(viewed) WHERE viewed = 0;
CREATE INDEX idx_events_date ON events(date(started_at));
```

#### event_clips

```sql
-- For longer events split into chunks
CREATE TABLE event_clips (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    event_id INTEGER NOT NULL,
    sequence_number INTEGER NOT NULL,
    video_filename TEXT NOT NULL,
    duration_seconds INTEGER,
    created_at TEXT DEFAULT (datetime('now')),

    FOREIGN KEY (event_id) REFERENCES events(id) ON DELETE CASCADE,
    UNIQUE(event_id, sequence_number)
);
```

### 7.2 File Storage Structure

```
/var/parcelguard/
├── videos/
│   ├── 2024/
│   │   └── 12/
│   │       └── 09/
│   │           ├── cam1_20241209_143052.h264
│   │           ├── cam1_20241209_143052.mp4   (transcoded)
│   │           └── cam2_20241209_151230.h264
│   └── thumbnails/
│       └── 2024/
│           └── 12/
│               └── 09/
│                   ├── cam1_20241209_143052.jpg
│                   └── cam2_20241209_151230.jpg
├── db/
│   └── parcelguard.db
└── logs/
    └── parcelguard.log
```

### 7.3 Retention Policy

```python
# Configurable in hub settings
RETENTION_DAYS = 30          # Auto-delete videos older than this
RETENTION_MIN_FREE_GB = 10   # Delete oldest if disk space below this
MAX_EVENT_DURATION = 300     # 5 minutes max per event
```

---

## 8. Implementation Phases

### Phase 1: Core Motion Detection (Week 1-2)

**Deliverables:**

- [ ] Pi Zero 2 W base image with legacy camera stack
- [ ] `CameraController` class with 1080p capture
- [ ] `MotionAnalyser` with GPU motion vectors
- [ ] Basic threshold-based motion detection
- [ ] Console logging of motion events

**Acceptance Criteria:**

- Motion detected within 500ms of movement
- CPU usage < 15% during idle monitoring
- False positive rate < 5% in target environment

### Phase 2: Rolling Buffer & Recording (Week 2-3)

**Deliverables:**

- [ ] `RollingBuffer` implementation in tmpfs
- [ ] `Recorder` class for event capture
- [ ] Pre-roll + post-roll concatenation
- [ ] Local file output with proper timestamps

**Acceptance Criteria:**

- 10-second pre-roll captured for all events
- No frame drops during buffer → recording transition
- Video files playable in standard players

### Phase 3: Upload Pipeline (Week 3-4)

**Deliverables:**

- [ ] Hub API endpoints for receiving events
- [ ] Camera upload client with retry logic
- [ ] Thumbnail generation (first frame or motion frame)
- [ ] SQLite event metadata recording

**Acceptance Criteria:**

- Events uploaded to hub within 60 seconds of completion
- Failed uploads retried with exponential backoff
- No data loss on temporary network failures

### Phase 4: State Machine & Live View (Week 4-5)

**Deliverables:**

- [ ] Full state machine implementation
- [ ] MQTT command interface
- [ ] 720p RTSP live stream on-demand
- [ ] Concurrent motion detection during live view

**Acceptance Criteria:**

- State transitions complete within 1 second
- Live view latency < 2 seconds
- Motion detection continues during live view

### Phase 5: Hardening & Deployment (Week 5-6)

**Deliverables:**

- [ ] Systemd service with auto-restart
- [ ] Health monitoring endpoint
- [ ] OTA update mechanism
- [ ] Configuration hot-reload
- [ ] Comprehensive logging

**Acceptance Criteria:**

- Service recovers from crashes within 30 seconds
- Logs shipped to central location
- Configuration changes applied without restart

---

## 9. Testing Strategy

### 9.1 Unit Tests

| Module             | Test Coverage                                             |
| ------------------ | --------------------------------------------------------- |
| `motion.py`        | Threshold logic, zone masking, consecutive frame counting |
| `buffer.py`        | Segment management, eviction, concatenation               |
| `state_machine.py` | All state transitions, edge cases                         |

### 9.2 Integration Tests

| Test               | Description                               |
| ------------------ | ----------------------------------------- |
| Motion → Recording | Verify buffer capture and recording start |
| Recording → Upload | Verify file finalization and upload       |
| Live View + Motion | Verify concurrent operation               |
| Network Failure    | Verify retry logic and local queuing      |

### 9.3 Performance Benchmarks

| Metric         | Target  | Method                           |
| -------------- | ------- | -------------------------------- |
| Idle CPU       | < 15%   | `htop` monitoring over 1 hour    |
| Recording CPU  | < 40%   | Monitor during continuous motion |
| Memory usage   | < 200MB | Including buffer                 |
| Motion latency | < 500ms | Timestamp comparison             |
| Thermal        | < 70°C  | Sustained operation test         |

### 9.4 Field Testing

- [ ] 24-hour unattended operation
- [ ] Various lighting conditions
- [ ] Multiple motion scenarios (walking, parcel delivery, false triggers)
- [ ] Network interruption recovery
- [ ] Power cycle recovery

---

## 10. Risk Mitigation

| Risk                    | Likelihood | Impact | Mitigation                                                 |
| ----------------------- | ---------- | ------ | ---------------------------------------------------------- |
| SD card failure         | Medium     | High   | Use tmpfs for buffer, minimize writes, wear leveling       |
| Thermal throttling      | Medium     | Medium | Heatsink, reduce FPS if needed, thermal monitoring         |
| 4G data overrun         | Low        | Medium | Strict upload controls, compression tuning, alerts         |
| Motion false positives  | Medium     | Low    | Zone masking, threshold tuning, ML classification (future) |
| picamera library issues | Low        | High   | Pin library version, test thoroughly before deployment     |

---

## 11. Future Enhancements

**Not in scope for v1, but planned:**

1. **Person detection** — TFLite model to filter false positives (requires more CPU)
2. **Multi-camera correlation** — Link events across cameras
3. **Mobile app** — Push notifications, live view access
4. **Local recording fallback** — Save to USB drive if network unavailable
5. **Audio detection** — Microphone integration for sound-triggered events
6. **Time-lapse mode** — Periodic snapshots during extended idle

---

## 12. Appendix

### A. Boot Configuration

`/boot/firmware/config.txt` additions:

```ini
# Legacy camera stack
dtoverlay=ov5647
camera_auto_detect=0
start_x=1
gpu_mem=128

# Overclock (optional, improves encoding headroom)
arm_freq=1200
over_voltage=4

# Disable unused interfaces
dtparam=audio=off
dtparam=i2c_arm=off
dtparam=spi=off
```

### B. Dependencies

**Camera (requirements.txt)**

```
picamera==1.13
numpy>=1.21.0
requests>=2.28.0
paho-mqtt>=1.6.0
pyyaml>=6.0
python-dotenv>=1.0.0
```

**Hub (requirements.txt)**

```
fastapi>=0.100.0
uvicorn>=0.23.0
paho-mqtt>=1.6.0
pyyaml>=6.0
python-dotenv>=1.0.0
httpx>=0.24.0          # For push notifications
aiofiles>=23.0.0       # Async file handling
python-multipart>=0.0.6 # File uploads
```

### C. Environment Variables

**Camera (.env)**

```bash
# Hub connection (via Tailscale)
HUB_URL=http://parcelguard-hub:8080  # MagicDNS hostname
HUB_API_KEY=xxxxx                     # Shared secret for auth

# MQTT (via Tailscale)
MQTT_BROKER=parcelguard-hub           # MagicDNS hostname
MQTT_PORT=1883
MQTT_USER=camera
MQTT_PASS=xxxxx

# Device identity
DEVICE_ID=cam1                        # or cam2
DEVICE_NAME="Front Hallway"

# Motion detection
MOTION_THRESHOLD=60
BUFFER_SECONDS=10
```

**Hub (.env)**

```bash
# API
API_HOST=0.0.0.0                      # Listen on all interfaces (Tailscale + local)
API_PORT=8080
API_KEY=xxxxx                         # Must match cameras

# MQTT
MQTT_HOST=0.0.0.0
MQTT_PORT=1883

# Storage
VIDEO_PATH=/var/parcelguard/videos
DB_PATH=/var/parcelguard/db/parcelguard.db

# Retention
RETENTION_DAYS=30
MIN_FREE_GB=10

# Notifications (optional)
NTFY_TOPIC=parcelguard                # Or use Pushover
PUSHOVER_USER_KEY=xxxxx
PUSHOVER_API_TOKEN=xxxxx
```

---

**Document Control**

| Version | Date     | Author     | Changes     |
| ------- | -------- | ---------- | ----------- |
| 1.0     | Dec 2024 | Dan/Claude | Initial SOW |
