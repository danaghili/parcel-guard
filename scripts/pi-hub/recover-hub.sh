#!/bin/bash
# ParcelGuard Hub Recovery Script
# Run this after reimaging the Pi 4 with Raspberry Pi OS Lite (64-bit)
#
# Prerequisites:
# - Fresh Raspberry Pi OS Lite (64-bit) install
# - Hostname: parcelguard-hub
# - Username: dan
# - SSH enabled
# - Connected to WiFi
#
# Usage: curl the script or copy it over, then run:
#   chmod +x recover-hub.sh
#   ./recover-hub.sh

set -e

echo "=========================================="
echo "ParcelGuard Hub Recovery Script"
echo "=========================================="
echo ""

# Colors for output
RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m' # No Color

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

print_error() {
    echo -e "${RED}[ERROR]${NC} $1"
}

# Step 1: System Updates
print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install Node.js 20 and other dependencies
print_step "Installing Node.js 20 and dependencies..."
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs git nginx motion

# Verify Node.js
node_version=$(node --version)
echo "Node.js version: $node_version"

# Step 3: Disable WiFi Power Management
print_step "Disabling WiFi power management..."
sudo iw wlan0 set power_save off || print_warn "Could not disable WiFi power save"

# Make it permanent via NetworkManager
sudo mkdir -p /etc/NetworkManager/conf.d
sudo tee /etc/NetworkManager/conf.d/wifi-powersave.conf > /dev/null << 'EOF'
[connection]
wifi.powersave = 2
EOF

# Also via rc.local as backup
echo '#!/bin/bash
iw wlan0 set power_save off
exit 0' | sudo tee /etc/rc.local > /dev/null
sudo chmod +x /etc/rc.local

# Step 4: Create Storage Directories
print_step "Creating storage directories..."
sudo mkdir -p /mnt/storage/parcelguard/{data,clips/cam1,clips/cam2,thumbnails}
sudo chown -R dan:dan /mnt/storage

# Step 5: Clone Repository
print_step "Cloning ParcelGuard repository..."
cd ~
if [ -d "parcel-guard" ]; then
    print_warn "Repository already exists, pulling latest..."
    cd parcel-guard
    git pull
else
    git clone https://github.com/danaghili/parcel-guard.git
    cd parcel-guard
fi

# Step 6: Install Dependencies
print_step "Installing npm dependencies..."
npm install

# Step 7: Build Shared Package
print_step "Building shared package..."
cd ~/parcel-guard/packages/shared
npm run build

# Step 8: Build Web App
print_step "Building web application..."
cd ~/parcel-guard/apps/web
npm run build

# Step 9: Configure API
print_step "Configuring API..."
cd ~/parcel-guard/apps/api
cat > .env << 'EOF'
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db
CLIPS_PATH=/mnt/storage/parcelguard/clips
THUMBNAILS_PATH=/mnt/storage/parcelguard/thumbnails
PORT=3000
NODE_ENV=production
EOF

# Step 10: Seed Database
print_step "Seeding database..."
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx src/db/seed.ts

# Step 11: Set Default PIN
print_step "Setting default PIN (1234)..."
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx -e "
import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
const db = new Database(process.env.DATABASE_PATH);
const hash = bcrypt.hashSync('1234', 10);
db.prepare(\"INSERT OR REPLACE INTO settings (key, value) VALUES ('pin', ?)\").run(hash);
console.log('PIN set to 1234');
"

# Step 12: Add Cameras
print_step "Adding cameras to database..."
DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db npx tsx -e "
import Database from 'better-sqlite3';
const db = new Database(process.env.DATABASE_PATH);
db.prepare(\"INSERT OR REPLACE INTO cameras (id, name, streamUrl, status) VALUES ('cam1', 'Camera 1', 'http://parcelguard-hub.local:8888/cam1/index.m3u8', 'online')\").run();
db.prepare(\"INSERT OR REPLACE INTO cameras (id, name, streamUrl, status) VALUES ('cam2', 'Camera 2', 'http://parcelguard-hub.local:8888/cam2/index.m3u8', 'online')\").run();
console.log('Cameras added');
"

# Step 13: Create API Service
print_step "Creating API systemd service..."
sudo tee /etc/systemd/system/parcelguard-api.service > /dev/null << 'EOF'
[Unit]
Description=ParcelGuard API Server
After=network.target

[Service]
Type=simple
User=dan
WorkingDirectory=/home/dan/parcel-guard/apps/api
Environment=NODE_ENV=production
Environment=DATABASE_PATH=/mnt/storage/parcelguard/data/parcelguard.db
Environment=CLIPS_PATH=/mnt/storage/parcelguard/clips
Environment=THUMBNAILS_PATH=/mnt/storage/parcelguard/thumbnails
Environment=PORT=3000
ExecStart=/usr/bin/npx tsx src/index.ts
Restart=always
RestartSec=10

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable parcelguard-api
sudo systemctl start parcelguard-api

# Step 14: Configure Nginx
print_step "Configuring Nginx..."
sudo tee /etc/nginx/sites-available/parcelguard > /dev/null << 'EOF'
server {
    listen 80;
    server_name parcelguard-hub.local;

    location /api/ {
        proxy_pass http://127.0.0.1:3000/api/;
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
EOF

sudo ln -sf /etc/nginx/sites-available/parcelguard /etc/nginx/sites-enabled/
sudo rm -f /etc/nginx/sites-enabled/default
chmod 755 /home/dan
chmod -R 755 /home/dan/parcel-guard/apps/web/dist
sudo nginx -t
sudo systemctl restart nginx

# Step 15: Install MediaMTX
print_step "Installing MediaMTX for stream conversion..."
cd ~
wget -q https://github.com/bluenviron/mediamtx/releases/download/v1.9.3/mediamtx_v1.9.3_linux_arm64v8.tar.gz
tar -xzf mediamtx_v1.9.3_linux_arm64v8.tar.gz
sudo mv mediamtx /usr/local/bin/
rm mediamtx_v1.9.3_linux_arm64v8.tar.gz

# Step 16: Configure MediaMTX (with TCP transport to avoid packet loss)
print_step "Configuring MediaMTX..."
cat > ~/mediamtx.yml << 'EOF'
hlsAddress: :8888

paths:
  cam1:
    source: rtsp://192.168.1.133:8554/stream
    rtspTransport: tcp
  cam2:
    source: rtsp://192.168.1.183:8554/stream
    rtspTransport: tcp
EOF

# Step 17: Create MediaMTX Service
print_step "Creating MediaMTX systemd service..."
sudo tee /etc/systemd/system/mediamtx.service > /dev/null << 'EOF'
[Unit]
Description=MediaMTX RTSP to HLS Server
After=network.target

[Service]
Type=simple
User=dan
ExecStart=/usr/local/bin/mediamtx /home/dan/mediamtx.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mediamtx
sudo systemctl start mediamtx

# Step 18: Configure Motion
print_step "Configuring Motion..."

# Main motion.conf
sudo tee /etc/motion/motion.conf > /dev/null << 'EOF'
daemon off
log_level 6

webcontrol_port 8080
webcontrol_localhost off

camera /etc/motion/camera1.conf
camera /etc/motion/camera2.conf
EOF

# Camera 1 config
sudo tee /etc/motion/camera1.conf > /dev/null << 'EOF'
camera_name cam1
netcam_url rtsp://192.168.1.133:8554/stream

threshold 1500
minimum_motion_frames 3
event_gap 60

movie_output on
movie_max_time 60
movie_quality 75
movie_codec mp4
movie_filename /mnt/storage/parcelguard/clips/cam1/%Y%m%d_%H%M%S

picture_output first
picture_filename /mnt/storage/parcelguard/thumbnails/cam1_%Y%m%d_%H%M%S

on_event_start /home/dan/parcel-guard/scripts/motion-event.sh start cam1 %v
on_event_end /home/dan/parcel-guard/scripts/motion-event.sh end cam1 %v

framerate 5
width 640
height 480
EOF

# Camera 2 config
sudo tee /etc/motion/camera2.conf > /dev/null << 'EOF'
camera_name cam2
netcam_url rtsp://192.168.1.183:8554/stream

threshold 1500
minimum_motion_frames 3
event_gap 60

movie_output on
movie_max_time 60
movie_quality 75
movie_codec mp4
movie_filename /mnt/storage/parcelguard/clips/cam2/%Y%m%d_%H%M%S

picture_output first
picture_filename /mnt/storage/parcelguard/thumbnails/cam2_%Y%m%d_%H%M%S

on_event_start /home/dan/parcel-guard/scripts/motion-event.sh start cam2 %v
on_event_end /home/dan/parcel-guard/scripts/motion-event.sh end cam2 %v

framerate 5
width 640
height 480
EOF

# Step 19: Create Motion Event Script
print_step "Creating motion event webhook script..."
cat > ~/parcel-guard/scripts/motion-event.sh << 'EOF'
#!/bin/bash
EVENT_TYPE=$1
CAMERA_ID=$2
EVENT_ID=$3
TIMESTAMP=$(date +%s)

API_URL="http://localhost:3000/api"

if [ "$EVENT_TYPE" = "start" ]; then
    curl -s -X POST "$API_URL/motion/events" \
        -H "Content-Type: application/json" \
        -d "{\"cameraId\": \"$CAMERA_ID\", \"eventId\": \"$EVENT_ID\", \"type\": \"start\", \"timestamp\": $TIMESTAMP}"
elif [ "$EVENT_TYPE" = "end" ]; then
    curl -s -X POST "$API_URL/motion/events" \
        -H "Content-Type: application/json" \
        -d "{\"cameraId\": \"$CAMERA_ID\", \"eventId\": \"$EVENT_ID\", \"type\": \"end\", \"timestamp\": $TIMESTAMP}"
fi
EOF
chmod +x ~/parcel-guard/scripts/motion-event.sh

# Step 20: Set Motion Storage Permissions
print_step "Setting storage permissions for Motion..."
sudo chown -R motion:motion /mnt/storage/parcelguard/clips
sudo chown -R motion:motion /mnt/storage/parcelguard/thumbnails
sudo chmod -R 755 /mnt/storage/parcelguard/clips
sudo chmod -R 755 /mnt/storage/parcelguard/thumbnails

# Step 21: Enable and Start Motion
print_step "Starting Motion service..."
sudo systemctl enable motion
sudo systemctl start motion

# Step 22: Verify Services
print_step "Verifying services..."
echo ""
echo "Service Status:"
echo "---------------"
systemctl is-active parcelguard-api && echo "parcelguard-api: RUNNING" || echo "parcelguard-api: FAILED"
systemctl is-active nginx && echo "nginx: RUNNING" || echo "nginx: FAILED"
systemctl is-active mediamtx && echo "mediamtx: RUNNING" || echo "mediamtx: FAILED"
systemctl is-active motion && echo "motion: RUNNING" || echo "motion: FAILED"

echo ""
echo "=========================================="
echo -e "${GREEN}Recovery Complete!${NC}"
echo "=========================================="
echo ""
echo "Access the app at: http://parcelguard-hub.local"
echo "Default PIN: 1234"
echo ""
echo "Camera IPs configured:"
echo "  - cam1: 192.168.1.133"
echo "  - cam2: 192.168.1.183"
echo ""
echo "If camera IPs have changed, update these files and restart:"
echo "  ~/mediamtx.yml"
echo "  /etc/motion/camera1.conf"
echo "  /etc/motion/camera2.conf"
echo ""
echo "Then restart services:"
echo "  sudo systemctl restart mediamtx motion"
echo ""
