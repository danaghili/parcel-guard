# ParcelGuard - Deployment Specification

## Overview

This document defines the deployment architecture, setup procedures, and maintenance processes for ParcelGuard. The system is designed to be self-hosted on a Raspberry Pi 4 hub with remote access via Tailscale.

**Version:** 0.10.0
**Last Updated:** December 9, 2024

---

## Architecture

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
    │  Power: 20,000mAh USB Bank   │    │  Power: 20,000mAh USB Bank       │
    └──────────────────────────────┘    └──────────────────────────────────┘
```

---

## Network Configuration

### IP Addressing (Tailscale)

| Device | Tailscale IP | Hostname | Purpose |
|--------|--------------|----------|---------|
| Pi 4 Hub | 100.72.88.127 | parcelguard-hub | Central server |
| Pi Zero 1 | 100.120.125.42 | parcelguard-cam1 | Camera unit |
| Pi Zero 2 | 100.69.12.33 | parcelguard-cam2 | Camera unit |

*Note: Tailscale IPs are stable and work across different physical networks.*

### Ports

| Port | Service | Access |
|------|---------|--------|
| 80 | Nginx (PWA + API proxy) | Tailscale + Funnel |
| 3000 | Node.js API | Internal only |
| 8554 | RTSP streams (MediaMTX) | Internal only |
| 8888 | HLS streams (MediaMTX) | Via Nginx proxy |
| 1883 | MQTT (Mosquitto) | Internal only |

### Remote Access

Remote access is provided via **Tailscale Funnel** (free tier):

- No port forwarding required on router
- No static IP required
- HTTPS encryption included
- Works across different networks (4G, WiFi, etc.)
- Access via: `https://parcelguard-hub.tail[xxxxx].ts.net`

---

## Component Specifications

### Pi 4 Hub Services

| Service | Technology | Managed By | Port | Auto-Start |
|---------|------------|------------|------|------------|
| Nginx | nginx | systemd | 80 | Yes |
| API Server | Node.js + Fastify | systemd | 3000 | Yes |
| MediaMTX | mediamtx | systemd | 8554, 8888 | Yes |
| MQTT Broker | Mosquitto | systemd | 1883 | Yes |
| Tailscale | tailscaled | systemd | - | Yes |
| Database | SQLite | File-based | N/A | N/A |

### Pi Zero Camera Services

| Service | Technology | Managed By | Auto-Start |
|---------|------------|------------|------------|
| Motion Detection | Python (Picamera2 + OpenCV) | systemd | Yes |
| Tailscale | tailscaled | systemd | Yes |

---

## Directory Structure

### Pi 4 Hub

```
/home/dan/
├── parcelguard-api/           # Backend API (deployed)
│   ├── dist/                  # Compiled TypeScript
│   ├── node_modules/
│   └── package.json
├── parcelguard-web/           # Built PWA files (deployed)
│   ├── assets/
│   ├── index.html
│   └── sw.js
└── mediamtx.yml               # MediaMTX configuration

/mnt/ssd/parcelguard/          # 240GB SSD (all data)
├── data/
│   └── parcelguard.db         # SQLite database
├── clips/                     # Motion event recordings
│   ├── cam1/
│   │   └── 20241207_143022.mp4
│   └── cam2/
│       └── 20241207_152145.mp4
└── thumbnails/                # Event thumbnails
    ├── cam1_20241207_143022.jpg
    └── cam2_20241207_152145.jpg
```

### Pi Zero Cameras

```
/home/dan/
├── motion-detect.py           # Main motion detection script
├── motion-detect.env          # Configuration (camera ID, hub IP, etc.)
└── .ssh/
    └── id_ed25519             # SSH key for SCP to hub

/dev/shm/parcelguard/          # RAM disk (temporary files)
├── buffer.h264                # Circular buffer for recording
└── current_clip.mp4           # Current recording in progress
```

---

## Setup Procedures

### Prerequisites

- Raspberry Pi Imager installed on your computer
- SSH enabled on all devices
- Tailscale account (free tier)
- All devices connected to internet (any network)

---

### Phase 1: Pi 4 Hub Setup

#### 1.1 Flash OS

1. Use Raspberry Pi Imager
2. Select: **Raspberry Pi OS Lite (64-bit)**
3. Configure settings (gear icon):
   - Hostname: `parcelguard-hub`
   - Enable SSH (password or key)
   - Set username: `dan`
   - Set password: (secure password)
   - Configure WiFi
   - Set locale/timezone
4. Flash to microSD card
5. Insert card and boot Pi 4

#### 1.2 Initial System Setup

```bash
# SSH into the hub
ssh dan@parcelguard-hub.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  git \
  curl \
  nginx \
  sqlite3 \
  ffmpeg \
  mosquitto \
  mosquitto-clients

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should show v20.x
npm --version
```

#### 1.3 Install Tailscale

```bash
# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh

# Start Tailscale and authenticate
sudo tailscale up

# Enable Tailscale Funnel for public HTTPS
sudo tailscale funnel --bg 80

# Check status
tailscale status
```

#### 1.4 Mount SSD

```bash
# Identify SSD (usually /dev/sda1 with Argon ONE case)
lsblk

# Create mount point
sudo mkdir -p /mnt/ssd

# Format SSD (CAUTION: erases all data)
sudo mkfs.ext4 /dev/sda1

# Get UUID
sudo blkid /dev/sda1

# Add to fstab for auto-mount (replace UUID)
echo "UUID=your-uuid-here /mnt/ssd ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab

# Mount
sudo mount -a

# Set ownership
sudo chown -R dan:dan /mnt/ssd

# Create ParcelGuard directories
mkdir -p /mnt/ssd/parcelguard/{data,clips,thumbnails}
mkdir -p /mnt/ssd/parcelguard/clips/{cam1,cam2}
```

#### 1.5 Deploy Application

```bash
# Clone and build locally, then copy to hub
# OR copy pre-built files directly

# Create directories
mkdir -p /home/dan/parcelguard-api
mkdir -p /home/dan/parcelguard-web

# Copy API files (from local machine)
scp -r apps/api/dist/* dan@100.72.88.127:/home/dan/parcelguard-api/
scp apps/api/package*.json dan@100.72.88.127:/home/dan/parcelguard-api/

# Copy Web files
scp -r apps/web/dist/* dan@100.72.88.127:/home/dan/parcelguard-web/

# On hub, install production dependencies
cd /home/dan/parcelguard-api
npm install --production
```

#### 1.6 Configure Services

**API Service (`/etc/systemd/system/parcelguard-api.service`):**

```ini
[Unit]
Description=ParcelGuard API Server
After=network.target mosquitto.service

[Service]
Type=simple
User=dan
WorkingDirectory=/home/dan/parcelguard-api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/mnt/ssd/parcelguard/data/parcelguard.db
Environment=CLIPS_PATH=/mnt/ssd/parcelguard/clips
Environment=THUMBNAILS_PATH=/mnt/ssd/parcelguard/thumbnails
Environment=PORT=3000
Environment=MQTT_BROKER=mqtt://localhost:1883
Environment=NTFY_TOPIC=parcelguard
Environment=APP_URL=https://parcelguard-hub.tail[xxxxx].ts.net

[Install]
WantedBy=multi-user.target
```

**Nginx Configuration (`/etc/nginx/sites-available/parcelguard`):**

```nginx
server {
    listen 80;
    server_name _;

    # Serve PWA static files
    root /home/dan/parcelguard-web;
    index index.html;

    # PWA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/api/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # HLS streams proxy
    location /streams/ {
        proxy_pass http://localhost:8888/;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_buffering off;
    }
}
```

```bash
# Enable site
sudo ln -sf /etc/nginx/sites-available/parcelguard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Enable and start API
sudo systemctl enable parcelguard-api
sudo systemctl start parcelguard-api
```

#### 1.7 Install MediaMTX

```bash
# Download MediaMTX
wget https://github.com/bluenviron/mediamtx/releases/download/v1.5.1/mediamtx_v1.5.1_linux_arm64v8.tar.gz
tar -xzf mediamtx_v1.5.1_linux_arm64v8.tar.gz
sudo mv mediamtx /usr/local/bin/
```

**MediaMTX Configuration (`/home/dan/mediamtx.yml`):**

```yaml
# Listen on all interfaces for RTSP
rtspAddress: :8554
hlsAddress: :8888

# HLS settings (optimized for low latency)
hlsSegmentDuration: 1s
hlsSegmentCount: 3
hlsPartDuration: 200ms

# Path configuration
paths:
  cam1:
    source: publisher
  cam2:
    source: publisher
```

**MediaMTX Service (`/etc/systemd/system/mediamtx.service`):**

```ini
[Unit]
Description=MediaMTX RTSP/HLS Server
After=network.target

[Service]
Type=simple
User=dan
WorkingDirectory=/home/dan
ExecStart=/usr/local/bin/mediamtx /home/dan/mediamtx.yml
Restart=on-failure
RestartSec=5

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable mediamtx
sudo systemctl start mediamtx
```

#### 1.8 Configure MQTT

```bash
# Mosquitto is already installed
# No special configuration needed for local use
sudo systemctl enable mosquitto
sudo systemctl start mosquitto

# Test MQTT
mosquitto_sub -t "parcelguard/#" -v &
mosquitto_pub -t "parcelguard/test" -m "hello"
```

---

### Phase 2: Pi Zero Camera Setup

#### 2.1 Flash OS

1. Use Raspberry Pi Imager
2. Select: **Raspberry Pi OS Lite (64-bit)**
3. Configure settings:
   - Hostname: `parcelguard-cam1` (or `cam2`)
   - Enable SSH
   - Set username: `dan`
   - Set password
   - Configure WiFi
4. Flash to microSD card

#### 2.2 Initial Setup

```bash
# SSH into camera
ssh dan@parcelguard-cam1.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install required packages
sudo apt install -y \
  python3-picamera2 \
  python3-opencv \
  python3-numpy \
  ffmpeg \
  paho-mqtt

# Install Tailscale
curl -fsSL https://tailscale.com/install.sh | sh
sudo tailscale up

# Test camera
libcamera-hello --list-cameras
```

#### 2.3 SSH Key Setup (for SCP to Hub)

```bash
# On camera, generate SSH key
ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""

# Copy public key to hub
ssh-copy-id dan@100.72.88.127

# Test passwordless SSH
ssh dan@100.72.88.127 "echo 'SSH works!'"
```

#### 2.4 Deploy Motion Detection Script

Copy `motion-detect.py` to the camera:

```bash
scp /tmp/motion-detect-v2.py dan@100.120.125.42:/home/dan/motion-detect.py
```

**Configuration File (`/home/dan/motion-detect.env`):**

```bash
CAMERA_ID=cam1
HUB_IP=100.72.88.127
HUB_USER=dan
RTSP_URL=rtsp://100.72.88.127:8554/cam1
MQTT_BROKER=100.72.88.127
MOTION_SENSITIVITY=50
```

**Systemd Service (`/etc/systemd/system/motion-detect.service`):**

```ini
[Unit]
Description=ParcelGuard Motion Detection
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=dan
WorkingDirectory=/home/dan
EnvironmentFile=/home/dan/motion-detect.env
ExecStart=/usr/bin/python3 /home/dan/motion-detect.py
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
sudo systemctl enable motion-detect
sudo systemctl start motion-detect
```

---

## Update Procedures

### API Update

```bash
# On local machine, build and deploy
cd apps/api
npm run build

# Copy to hub
scp -r dist/* dan@100.72.88.127:/home/dan/parcelguard-api/

# On hub, restart service
ssh dan@100.72.88.127 "sudo systemctl restart parcelguard-api"
```

### Web Update

```bash
# On local machine, build
cd apps/web
npm run build

# Copy to hub
scp -r dist/* dan@100.72.88.127:/home/dan/parcelguard-web/

# No restart needed (static files)
```

### Camera Update

```bash
# Push updated script to camera
scp /tmp/motion-detect-v2.py dan@100.120.125.42:/home/dan/motion-detect.py

# Restart service
ssh dan@100.120.125.42 "sudo systemctl restart motion-detect"
```

---

## Backup Procedures

### Database Backup

```bash
#!/bin/bash
# backup.sh

BACKUP_DIR="/mnt/ssd/parcelguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
sqlite3 /mnt/ssd/parcelguard/data/parcelguard.db ".backup '$BACKUP_DIR/parcelguard_$DATE.db'"

# Keep only last 7 backups
ls -t $BACKUP_DIR/parcelguard_*.db | tail -n +8 | xargs -r rm

echo "Backup complete: $DATE"
```

---

## Monitoring & Health Checks

### Hub Health

```bash
# Check all services
sudo systemctl status parcelguard-api nginx mediamtx mosquitto tailscaled

# View API logs
journalctl -u parcelguard-api -f

# Check disk usage
df -h /mnt/ssd

# Check system temperature
vcgencmd measure_temp

# Check MQTT traffic
mosquitto_sub -t "parcelguard/#" -v
```

### Camera Health

```bash
# SSH to camera
ssh dan@100.120.125.42

# Check service
sudo systemctl status motion-detect

# View logs
journalctl -u motion-detect -f

# Check temperature
vcgencmd measure_temp

# Check camera
libcamera-hello --list-cameras
```

---

## Troubleshooting

### Camera Not Streaming

```bash
# Check motion-detect service
sudo systemctl status motion-detect
journalctl -u motion-detect -f

# Check camera detected
libcamera-hello --list-cameras

# Test RTSP to hub manually
ffmpeg -f lavfi -i testsrc=duration=5:size=640x480:rate=30 \
  -c:v libx264 -f rtsp rtsp://100.72.88.127:8554/test
```

### Hub Can't See Camera

```bash
# Check Tailscale connectivity
tailscale ping 100.120.125.42

# Check camera is online in Tailscale
tailscale status

# Check MQTT messages from camera
mosquitto_sub -h localhost -t "parcelguard/cam1/#" -v
```

### Remote Access Not Working

```bash
# Check Tailscale Funnel status
tailscale funnel status

# Re-enable Funnel
sudo tailscale funnel --bg 80

# Check nginx is running
sudo systemctl status nginx

# Test locally first
curl http://localhost/api/health
```

### Events Not Recording

```bash
# On camera, check motion-detect logs
journalctl -u motion-detect -f

# Check SCP to hub works
scp /tmp/test.txt dan@100.72.88.127:/tmp/

# Check hub clips directory permissions
ls -la /mnt/ssd/parcelguard/clips/

# Check MQTT event messages
mosquitto_sub -h 100.72.88.127 -t "parcelguard/+/events" -v
```

---

## Security Considerations

### Network Security

- All components communicate via Tailscale VPN (encrypted)
- No direct port forwarding to internet
- Tailscale Funnel provides HTTPS-only access
- API authentication required for all endpoints

### Application Security

- PIN required to access PWA (4-8 digits)
- Session tokens with 24-hour expiry
- HTTPS only (enforced by Funnel)
- Rate limiting on login (5 attempts/minute)

### Physical Security

- Hub located in resident's flat (secure)
- Camera units concealed
- Power banks accessible only for charging

---

## Recovery Procedures

### Hub Failure (SD Card Corruption)

1. Flash new SD card with Raspberry Pi OS
2. Run hub setup procedure (Phase 1)
3. Mount existing SSD (data preserved!)
4. Deploy application files
5. Database and clips are preserved on SSD

### Camera Failure

1. Flash new SD card
2. Run camera setup procedure (Phase 2)
3. Configure with same camera ID
4. No data loss (recordings on hub)

### SSD Failure

- Database and clips lost
- Re-run hub setup with new SSD
- Seed new database with cameras

**Prevention:** Enable daily database backups to external location.

---

## Quick Reference

### Service Commands

```bash
# Hub
sudo systemctl status parcelguard-api nginx mediamtx mosquitto
sudo systemctl restart parcelguard-api
journalctl -u parcelguard-api -f

# Camera
sudo systemctl status motion-detect
sudo systemctl restart motion-detect
journalctl -u motion-detect -f
```

### Useful Paths

| Location | Path |
|----------|------|
| Database | `/mnt/ssd/parcelguard/data/parcelguard.db` |
| Clips | `/mnt/ssd/parcelguard/clips/` |
| Thumbnails | `/mnt/ssd/parcelguard/thumbnails/` |
| API Code | `/home/dan/parcelguard-api/` |
| Web Files | `/home/dan/parcelguard-web/` |
| MediaMTX Config | `/home/dan/mediamtx.yml` |
| Nginx Config | `/etc/nginx/sites-available/parcelguard` |

### Access URLs

| Access Type | URL |
|-------------|-----|
| Tailscale VPN | http://100.72.88.127 |
| Public (Funnel) | https://parcelguard-hub.tail[xxxxx].ts.net |
| API Health | http://100.72.88.127:3000/api/health |
| HLS Streams | http://100.72.88.127:8888/cam1/ |

### Default Credentials

- **Username:** admin
- **PIN:** 2808

---

*Last Updated: December 9, 2024*
*Version: 0.10.0*
