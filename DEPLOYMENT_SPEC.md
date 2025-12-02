# ParcelGuard - Deployment Specification

## Overview

This document defines the deployment architecture, setup procedures, and maintenance processes for ParcelGuard. The system is designed to be self-hosted on a Raspberry Pi 4 hub with remote access capability.

---

## Architecture

```
                                    INTERNET
                                        │
                                        ▼
                            ┌───────────────────────┐
                            │   4G WiFi Router      │
                            │   (existing)          │
                            │                       │
                            │   Cloudflare Tunnel   │
                            │   ───────────────►    │──── Remote Access
                            └───────────┬───────────┘     (phone outside
                                        │                  local network)
                    ┌───────────────────┼───────────────────┐
                    │                   │                   │
                    │ WiFi              │ WiFi              │ WiFi
                    ▼                   ▼                   ▼
┌───────────────────────┐   ┌───────────────────────────────────────────────┐
│     Pi Zero 2 W       │   │                  Pi 4 Hub                     │
│     (Camera 1)        │   │                                               │
│                       │   │  ┌─────────┐ ┌─────────┐ ┌────────────────┐   │
│  ┌─────────────────┐  │   │  │  Nginx  │ │ Node.js │ │ Frigate/Motion │   │
│  │  rpicam-vid     │  │   │  │  :80    │ │ API     │ │ :5000          │   │
│  │  RTSP :8554     │──┼───┼─►│  :443   │ │ :3000   │ │                │   │
│  └─────────────────┘  │   │  └────┬────┘ └────┬────┘ └───────┬────────┘   │
└───────────────────────┘   │       │           │              │            │
                            │       └───────────┴──────────────┘            │
┌───────────────────────┐   │                      │                        │
│     Pi Zero 2 W       │   │               ┌──────▼──────┐                 │
│     (Camera 2)        │   │               │   SQLite    │                 │
│                       │   │               │   Database  │                 │
│  ┌─────────────────┐  │   │               └─────────────┘                 │
│  │  rpicam-vid     │  │   │                                               │
│  │  RTSP :8554     │──┼───┤               ┌─────────────┐                 │
│  └─────────────────┘  │   │               │  SSD 256GB  │                 │
└───────────────────────┘   │               │  /mnt/ssd   │                 │
                            │               │  - clips/   │                 │
                            │               │  - thumbs/  │                 │
                            │               └─────────────┘                 │
                            └───────────────────────────────────────────────┘
                                        ▲
                                        │ WiFi (local)
                                        ▼
                            ┌───────────────────────┐
                            │      Phone/PWA        │
                            │   (local access)      │
                            └───────────────────────┘
```

---

## Network Configuration

### IP Addressing

| Device | Hostname | Static IP | Purpose |
|--------|----------|-----------|---------|
| Pi 4 Hub | `parcelguard-hub` | `192.168.1.10` | Central server |
| Pi Zero 1 | `parcelguard-cam1` | `192.168.1.21` | Camera unit |
| Pi Zero 2 | `parcelguard-cam2` | `192.168.1.22` | Camera unit |

*Note: Adjust IP range to match your router's DHCP settings. Reserve these IPs in your router's admin panel.*

### Ports

| Port | Service | Access |
|------|---------|--------|
| 80 | Nginx (HTTP → HTTPS redirect) | Local + Remote |
| 443 | Nginx (PWA + API proxy) | Local + Remote |
| 3000 | Node.js API | Internal only |
| 5000 | Frigate/Motion | Internal only |
| 8554 | RTSP streams (cameras) | Internal only |

### Remote Access

Remote access is provided via **Cloudflare Tunnel** (free tier):

- No port forwarding required on router
- No static IP required
- HTTPS encryption included
- Access via subdomain: `parcelguard.yourdomain.com`

**Alternative options (if Cloudflare not suitable):**
- Tailscale (VPN-based, free tier available)
- WireGuard (self-hosted VPN)
- ngrok (simple but has limitations on free tier)

---

## Component Specifications

### Pi 4 Hub Services

| Service | Technology | Managed By | Auto-Start |
|---------|------------|------------|------------|
| Nginx | nginx | systemd | Yes |
| API Server | Node.js + Fastify | systemd | Yes |
| Motion Detection | Frigate or Motion | systemd/Docker | Yes |
| Tunnel | cloudflared | systemd | Yes |
| Database | SQLite | File-based | N/A |

### Pi Zero Camera Services

| Service | Technology | Managed By | Auto-Start |
|---------|------------|------------|------------|
| RTSP Stream | rpicam-vid | systemd | Yes |
| Health Check | Shell script | systemd timer | Yes |

---

## Directory Structure

### Pi 4 Hub

```
/home/pi/
├── parcelguard/
│   ├── apps/
│   │   ├── api/              # Backend API
│   │   └── web/              # Built PWA files
│   ├── scripts/
│   │   ├── setup-hub.sh      # Initial setup
│   │   ├── update.sh         # Update application
│   │   └── backup.sh         # Backup database + config
│   └── config/
│       ├── frigate.yml       # Frigate configuration
│       └── nginx.conf        # Nginx site config

/mnt/ssd/
├── parcelguard/
│   ├── data/
│   │   └── parcelguard.db    # SQLite database
│   ├── clips/                # Motion event recordings
│   │   └── {camera_id}/
│   │       └── {date}/
│   │           └── {timestamp}.mp4
│   ├── thumbnails/           # Event thumbnails
│   │   └── {event_id}.jpg
│   └── logs/                 # Application logs
```

### Pi Zero Cameras

```
/home/pi/
├── parcelguard/
│   ├── scripts/
│   │   ├── start-stream.sh   # Start RTSP stream
│   │   ├── health-check.sh   # Report status to hub
│   │   └── update.sh         # Update scripts from hub
│   └── config/
│       └── camera.conf       # Camera-specific settings
```

---

## Setup Procedures

### Prerequisites

- Raspberry Pi Imager installed on your computer
- SSH enabled on all devices
- All devices connected to the same WiFi network
- Domain name (for Cloudflare Tunnel) or Cloudflare account

---

### Phase 1: Pi 4 Hub Setup

#### 1.1 Flash OS

1. Use Raspberry Pi Imager
2. Select: **Raspberry Pi OS Lite (64-bit)**
3. Configure settings (gear icon):
   - Hostname: `parcelguard-hub`
   - Enable SSH (password or key)
   - Set username: `pi`
   - Set password: (secure password)
   - Configure WiFi
   - Set locale/timezone
4. Flash to microSD card
5. Insert card and boot Pi 4

#### 1.2 Initial System Setup

```bash
# SSH into the hub
ssh pi@parcelguard-hub.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install essential packages
sudo apt install -y \
  git \
  curl \
  nginx \
  sqlite3 \
  ffmpeg \
  python3-pip

# Install Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify installations
node --version  # Should show v20.x
npm --version
```

#### 1.3 Mount SSD

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
sudo chown -R pi:pi /mnt/ssd

# Create ParcelGuard directories
mkdir -p /mnt/ssd/parcelguard/{data,clips,thumbnails,logs}
```

#### 1.4 Clone Repository

```bash
# Clone ParcelGuard
cd /home/pi
git clone https://github.com/yourusername/parcelguard.git
cd parcelguard

# Install dependencies
cd apps/api && npm install
cd ../web && npm install && npm run build
```

#### 1.5 Configure Services

**API Service (`/etc/systemd/system/parcelguard-api.service`):**

```ini
[Unit]
Description=ParcelGuard API Server
After=network.target

[Service]
Type=simple
User=pi
WorkingDirectory=/home/pi/parcelguard/apps/api
ExecStart=/usr/bin/node dist/index.js
Restart=on-failure
RestartSec=10
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/mnt/ssd/parcelguard/data/parcelguard.db
Environment=CLIPS_PATH=/mnt/ssd/parcelguard/clips
Environment=PORT=3000

[Install]
WantedBy=multi-user.target
```

**Nginx Configuration (`/etc/nginx/sites-available/parcelguard`):**

```nginx
server {
    listen 80;
    server_name parcelguard-hub.local parcelguard.yourdomain.com;

    # Serve PWA static files
    root /home/pi/parcelguard/apps/web/dist;
    index index.html;

    # PWA routing - serve index.html for all routes
    location / {
        try_files $uri $uri/ /index.html;
    }

    # API proxy
    location /api/ {
        proxy_pass http://localhost:3000/;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_cache_bypass $http_upgrade;
    }

    # Video clips (direct serve from SSD)
    location /clips/ {
        alias /mnt/ssd/parcelguard/clips/;
        add_header Accept-Ranges bytes;
    }

    # Thumbnails
    location /thumbnails/ {
        alias /mnt/ssd/parcelguard/thumbnails/;
    }
}
```

```bash
# Enable site
sudo ln -s /etc/nginx/sites-available/parcelguard /etc/nginx/sites-enabled/
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl reload nginx

# Enable and start API
sudo systemctl enable parcelguard-api
sudo systemctl start parcelguard-api
```

#### 1.6 Install Frigate (Docker)

```bash
# Install Docker
curl -fsSL https://get.docker.com | sh
sudo usermod -aG docker pi

# Create Frigate config directory
mkdir -p /home/pi/parcelguard/config

# Create Frigate config (config/frigate.yml)
# See Frigate Configuration section below

# Run Frigate container
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --privileged \
  -v /home/pi/parcelguard/config/frigate.yml:/config/config.yml \
  -v /mnt/ssd/parcelguard/clips:/media/frigate/clips \
  -v /etc/localtime:/etc/localtime:ro \
  -p 5000:5000 \
  -p 8971:8971 \
  ghcr.io/blakeblackshear/frigate:stable
```

#### 1.7 Configure Remote Access (Cloudflare Tunnel)

```bash
# Install cloudflared
curl -L https://github.com/cloudflare/cloudflared/releases/latest/download/cloudflared-linux-arm64.deb -o cloudflared.deb
sudo dpkg -i cloudflared.deb

# Authenticate (follow browser prompts)
cloudflared tunnel login

# Create tunnel
cloudflared tunnel create parcelguard

# Configure tunnel (~/.cloudflared/config.yml)
cat << EOF > ~/.cloudflared/config.yml
tunnel: parcelguard
credentials-file: /home/pi/.cloudflared/<tunnel-id>.json

ingress:
  - hostname: parcelguard.yourdomain.com
    service: http://localhost:80
  - service: http_status:404
EOF

# Add DNS record
cloudflared tunnel route dns parcelguard parcelguard.yourdomain.com

# Install as service
sudo cloudflared service install
sudo systemctl enable cloudflared
sudo systemctl start cloudflared
```

---

### Phase 2: Pi Zero Camera Setup

#### 2.1 Flash OS

1. Use Raspberry Pi Imager
2. Select: **Raspberry Pi OS Lite (64-bit)**
3. Configure settings:
   - Hostname: `parcelguard-cam1` (or `cam2`)
   - Enable SSH
   - Set username: `pi`
   - Set password
   - Configure WiFi (same network as hub)
4. Flash to microSD card

#### 2.2 Initial Setup

```bash
# SSH into camera
ssh pi@parcelguard-cam1.local

# Update system
sudo apt update && sudo apt upgrade -y

# Enable camera interface
sudo raspi-config nonint do_camera 0

# Install required packages
sudo apt install -y libcamera-tools v4l-utils

# Test camera
libcamera-hello --list-cameras
```

#### 2.3 Configure RTSP Streaming

**Streaming Script (`/home/pi/parcelguard/scripts/start-stream.sh`):**

```bash
#!/bin/bash

# Camera configuration
CAMERA_ID="cam1"
RESOLUTION="1920x1080"
FRAMERATE="15"
BITRATE="2000000"
PORT="8554"

# Start RTSP stream using rpicam-vid + mediamtx
rpicam-vid \
  --camera 0 \
  --width 1920 \
  --height 1080 \
  --framerate $FRAMERATE \
  --bitrate $BITRATE \
  --codec h264 \
  --inline \
  --listen \
  -t 0 \
  -o tcp://0.0.0.0:$PORT
```

*Note: For proper RTSP, we'll use mediamtx (formerly rtsp-simple-server) as a lightweight RTSP server.*

```bash
# Install mediamtx
wget https://github.com/bluenviron/mediamtx/releases/download/v1.5.1/mediamtx_v1.5.1_linux_arm64v8.tar.gz
tar -xzf mediamtx_v1.5.1_linux_arm64v8.tar.gz
sudo mv mediamtx /usr/local/bin/
sudo mv mediamtx.yml /etc/
```

**Streaming Service (`/etc/systemd/system/parcelguard-camera.service`):**

```ini
[Unit]
Description=ParcelGuard Camera Stream
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
User=pi
ExecStart=/home/pi/parcelguard/scripts/start-stream.sh
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
```

```bash
# Enable and start
sudo systemctl enable parcelguard-camera
sudo systemctl start parcelguard-camera
```

#### 2.4 Health Check Script

**Health Check (`/home/pi/parcelguard/scripts/health-check.sh`):**

```bash
#!/bin/bash

HUB_API="http://192.168.1.10:3000"
CAMERA_ID="cam1"

# Get system stats
TEMP=$(vcgencmd measure_temp | grep -oP '[0-9.]+')
UPTIME=$(uptime -p)
IP=$(hostname -I | awk '{print $1}')

# Report to hub
curl -s -X POST "$HUB_API/api/cameras/$CAMERA_ID/health" \
  -H "Content-Type: application/json" \
  -d "{\"temperature\": $TEMP, \"uptime\": \"$UPTIME\", \"ip\": \"$IP\"}"
```

**Timer (`/etc/systemd/system/parcelguard-health.timer`):**

```ini
[Unit]
Description=ParcelGuard Health Check Timer

[Timer]
OnBootSec=1min
OnUnitActiveSec=1min

[Install]
WantedBy=timers.target
```

---

## Frigate Configuration

**`/home/pi/parcelguard/config/frigate.yml`:**

```yaml
mqtt:
  enabled: false

database:
  path: /media/frigate/frigate.db

cameras:
  cam1:
    ffmpeg:
      inputs:
        - path: rtsp://192.168.1.21:8554/stream
          roles:
            - detect
            - record
    detect:
      enabled: true
      width: 1920
      height: 1080
      fps: 5
    record:
      enabled: true
      retain:
        days: 14
        mode: motion
      events:
        retain:
          default: 30
          mode: motion
    snapshots:
      enabled: true
      retain:
        default: 30

  cam2:
    ffmpeg:
      inputs:
        - path: rtsp://192.168.1.22:8554/stream
          roles:
            - detect
            - record
    detect:
      enabled: true
      width: 1920
      height: 1080
      fps: 5
    record:
      enabled: true
      retain:
        days: 14
        mode: motion
      events:
        retain:
          default: 30
          mode: motion
    snapshots:
      enabled: true
      retain:
        default: 30

detectors:
  cpu1:
    type: cpu

record:
  enabled: true
  retain:
    days: 14
    mode: motion
  events:
    pre_capture: 5
    post_capture: 10
```

---

## Update Procedures

### Application Update

**Update Script (`/home/pi/parcelguard/scripts/update.sh`):**

```bash
#!/bin/bash
set -e

echo "=== ParcelGuard Update ==="
cd /home/pi/parcelguard

# Pull latest changes
echo "Pulling latest code..."
git pull origin main

# Update API
echo "Updating API..."
cd apps/api
npm install --production
npm run build

# Update Web
echo "Updating Web..."
cd ../web
npm install
npm run build

# Restart services
echo "Restarting services..."
sudo systemctl restart parcelguard-api
sudo systemctl reload nginx

echo "=== Update Complete ==="
```

### Camera Update

Updates pushed from hub:

```bash
# From hub, push scripts to camera
scp /home/pi/parcelguard/scripts/pi-zero/* pi@parcelguard-cam1.local:/home/pi/parcelguard/scripts/

# Restart camera service
ssh pi@parcelguard-cam1.local "sudo systemctl restart parcelguard-camera"
```

---

## Backup Procedures

### Database Backup

**Backup Script (`/home/pi/parcelguard/scripts/backup.sh`):**

```bash
#!/bin/bash

BACKUP_DIR="/mnt/ssd/parcelguard/backups"
DATE=$(date +%Y%m%d_%H%M%S)

mkdir -p $BACKUP_DIR

# Backup database
sqlite3 /mnt/ssd/parcelguard/data/parcelguard.db ".backup '$BACKUP_DIR/parcelguard_$DATE.db'"

# Backup configs
tar -czf "$BACKUP_DIR/config_$DATE.tar.gz" \
  /home/pi/parcelguard/config/ \
  /etc/nginx/sites-available/parcelguard

# Keep only last 7 backups
ls -t $BACKUP_DIR/parcelguard_*.db | tail -n +8 | xargs -r rm
ls -t $BACKUP_DIR/config_*.tar.gz | tail -n +8 | xargs -r rm

echo "Backup complete: $DATE"
```

**Daily Backup Timer (`/etc/systemd/system/parcelguard-backup.timer`):**

```ini
[Unit]
Description=Daily ParcelGuard Backup

[Timer]
OnCalendar=daily
Persistent=true

[Install]
WantedBy=timers.target
```

---

## Monitoring & Health Checks

### Hub Health

```bash
# Check all services
sudo systemctl status parcelguard-api nginx cloudflared

# Check Frigate
docker ps | grep frigate
docker logs frigate --tail 50

# Check disk usage
df -h /mnt/ssd

# Check system temperature
vcgencmd measure_temp
```

### Camera Health

```bash
# Check stream is running
sudo systemctl status parcelguard-camera

# Test stream locally
ffprobe rtsp://localhost:8554/stream

# Check temperature
vcgencmd measure_temp
```

---

## Troubleshooting

### Camera Not Streaming

```bash
# Check service status
sudo systemctl status parcelguard-camera

# Check camera detected
libcamera-hello --list-cameras

# Check for errors
journalctl -u parcelguard-camera -f
```

### Hub Can't See Camera

```bash
# Ping camera
ping parcelguard-cam1.local

# Test stream from hub
ffprobe rtsp://192.168.1.21:8554/stream

# Check camera is on network
arp -a | grep 192.168.1.2
```

### Remote Access Not Working

```bash
# Check tunnel status
sudo systemctl status cloudflared

# Check tunnel logs
journalctl -u cloudflared -f

# Verify DNS
nslookup parcelguard.yourdomain.com
```

### High CPU/Temperature

```bash
# Check processes
htop

# Check Frigate resource usage
docker stats frigate

# Reduce stream quality if needed (lower resolution/framerate)
```

---

## Security Considerations

### Network Security

- All components on private WiFi network
- No direct port forwarding to internet
- Cloudflare Tunnel provides encrypted HTTPS access
- API authentication required for all endpoints

### Application Security

- PIN/password required to access PWA
- Session tokens with expiry
- HTTPS only (enforced by Cloudflare)
- No default credentials

### Physical Security

- Hub located in resident's flat (secure)
- Camera units concealed
- Power banks accessible only for charging

---

## Recovery Procedures

### Hub Failure (SD Card Corruption)

1. Flash new SD card with Raspberry Pi OS
2. Run setup procedure (Phase 1)
3. Clone repository
4. Restore database from SSD backup: `cp /mnt/ssd/parcelguard/backups/latest.db /mnt/ssd/parcelguard/data/parcelguard.db`
5. Video clips are preserved on SSD

### Camera Failure

1. Flash new SD card
2. Run camera setup procedure (Phase 2)
3. Update hub configuration if IP changed

### SSD Failure

- Database and clips lost
- Re-run hub setup with new SSD
- Configure fresh database

**Prevention:** Consider periodic backup of database to external location (cloud storage, USB drive).

---

## Appendix: Static IP Configuration

If DHCP reservation isn't available on your router, configure static IP on each device:

**Edit `/etc/dhcpcd.conf`:**

```bash
interface wlan0
static ip_address=192.168.1.10/24  # Adjust per device
static routers=192.168.1.1
static domain_name_servers=192.168.1.1 8.8.8.8
```

---

*Last Updated: [Date]*
*Version: 1.0.0*
