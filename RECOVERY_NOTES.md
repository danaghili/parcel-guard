# ParcelGuard Recovery Notes

**Date:** December 5, 2025

## What Happened

The Pi 4 hub crashed after starting Frigate (motion detection software). After the crash, the Pi would boot but was unreachable over the network despite:
- WiFi showing connected
- Correct IP address (192.168.1.205)
- Mac seeing the Pi in ARP table
- SSH service running
- iptables flushed

Root cause unknown - possibly Frigate overwhelmed resources during startup, causing some network stack corruption.

**Decision:** Reimage the SD card and rebuild the hub.

---

## Current State

### What's Working
- **Cam1** (192.168.1.133): Streaming via mediamtx, health checks running
- **Cam2** (192.168.1.183): Streaming via mediamtx, health checks running
- **GitHub repo**: All code is up to date

### What Needs Rebuilding
- **Pi 4 Hub**: Needs reimaging and full setup

---

## Recovery Steps

### 1. Reimage Pi 4 SD Card

Use Raspberry Pi Imager with these settings:
- **OS:** Raspberry Pi OS Lite (64-bit)
- **Hostname:** ParcelGuard
- **Username:** dan
- **WiFi:** Your home network credentials
- **SSH:** Enable with password authentication

### 2. First Boot & Basic Setup

```bash
ssh dan@ParcelGuard.local

# Update system
sudo apt update && sudo apt upgrade -y

# Install Node.js 20
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Install git
sudo apt install -y git
```

### 3. Clone Repo & Install Dependencies

```bash
cd ~
git clone https://github.com/danaghili/parcel-guard.git
cd parcel-guard
npm install
```

### 4. Create Storage Directory

```bash
sudo mkdir -p /mnt/storage/parcelguard/data
sudo chown -R dan:dan /mnt/storage
```

### 5. Setup API Service

```bash
# Create service file
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
```

### 6. Seed Database

```bash
cd ~/parcel-guard/apps/api
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx src/db/seed.ts
```

### 7. Setup Nginx

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
sudo rm /etc/nginx/sites-enabled/default
sudo nginx -t
sudo systemctl restart nginx
```

### 8. Build Web App (on your Mac)

```bash
cd ~/parcel-guard/apps/web
npm run build
```

Then copy dist to Pi or use git.

### 9. Test Everything Before Frigate

- [ ] Can access http://ParcelGuard.local
- [ ] Can login to the app
- [ ] Cameras show as "online" (health checks should update them)
- [ ] Can view camera streams in the app

---

## Adding Frigate (AFTER everything else works)

### More Conservative Approach

1. **Install Docker** (same as before)
2. **Start with ONE camera only** - edit frigate.yml to disable cam2
3. **Use lower resources:**
   - Reduce fps from 5 to 3
   - Reduce shm-size from 256mb to 128mb
4. **Monitor resource usage** before adding second camera:
   ```bash
   htop
   docker stats frigate
   ```

### Frigate Directories

```bash
mkdir -p /mnt/storage/parcelguard/clips/cam1
mkdir -p /mnt/storage/parcelguard/clips/cam2
mkdir -p /mnt/storage/parcelguard/thumbnails
mkdir -p /mnt/storage/parcelguard/frigate
```

### Frigate Docker Command (conservative)

```bash
docker run -d \
  --name frigate \
  --restart=unless-stopped \
  --shm-size=128mb \
  -v /home/dan/parcel-guard/config/frigate.yml:/config/config.yml \
  -v /mnt/storage/parcelguard/frigate:/media/frigate \
  -v /mnt/storage/parcelguard/clips:/media/frigate/clips \
  -v /mnt/storage/parcelguard/thumbnails:/media/frigate/exports \
  -v /etc/localtime:/etc/localtime:ro \
  -p 5000:5000 \
  -p 8971:8971 \
  ghcr.io/blakeblackshear/frigate:stable-aarch64
```

Note: Removed `--privileged` flag and reduced shm-size.

---

## Camera IP Addresses

| Camera | Hostname | IP Address |
|--------|----------|------------|
| cam1 | parcelguard-cam1.local | 192.168.1.133 |
| cam2 | parcelguard-cam2.local | 192.168.1.183 |

---

## Files Already Updated in Repo

- `config/frigate.yml` - Uses IP addresses (not .local hostnames)
- `apps/api/src/routes/events.ts` - Has camera ID mapping for Frigate webhook

---

## Remaining Development Tasks

After hub is rebuilt:
1. Test motion detection end-to-end
2. Create event forwarder script (if needed)
3. Update SETUP_GUIDE.md with Frigate section
