#!/bin/bash
# ParcelGuard Camera Setup Script
# Run this after reimaging a Pi Zero 2W with Raspberry Pi OS Lite (64-bit)
#
# Prerequisites:
# - Fresh Raspberry Pi OS Lite (64-bit) install
# - Hostname: parcelguard-cam1 (or cam2, cam3, etc.)
# - Username: dan
# - SSH enabled
# - Connected to WiFi
# - Camera enabled in raspi-config
#
# Usage:
#   chmod +x setup-camera.sh
#   CAMERA_ID=cam1 ./setup-camera.sh
#
# Or with custom hub IP:
#   CAMERA_ID=cam1 HUB_IP=192.168.1.205 ./setup-camera.sh

set -e

# Configuration
CAMERA_ID="${CAMERA_ID:-}"
HUB_IP="${HUB_IP:-parcelguard-hub.local}"

if [ -z "$CAMERA_ID" ]; then
    echo "Error: CAMERA_ID environment variable must be set"
    echo "Usage: CAMERA_ID=cam1 ./setup-camera.sh"
    exit 1
fi

echo "=========================================="
echo "ParcelGuard Camera Setup Script"
echo "=========================================="
echo ""
echo "Camera ID: $CAMERA_ID"
echo "Hub: $HUB_IP"
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

# Step 2: Install dependencies
print_step "Installing dependencies..."
sudo apt install -y ffmpeg bc

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

# Step 4: Install MediaMTX
print_step "Installing MediaMTX..."
cd ~
wget -q https://github.com/bluenviron/mediamtx/releases/download/v1.9.3/mediamtx_v1.9.3_linux_arm64v8.tar.gz
tar -xzf mediamtx_v1.9.3_linux_arm64v8.tar.gz
sudo mv mediamtx /usr/local/bin/
rm mediamtx_v1.9.3_linux_arm64v8.tar.gz

# Step 5: Configure MediaMTX
print_step "Configuring MediaMTX..."
sudo mkdir -p /etc/mediamtx
sudo tee /etc/mediamtx/mediamtx.yml > /dev/null << 'EOF'
rtspAddress: :8554
hlsAddress: :8888

paths:
  stream:
    source: publisher
EOF

# Step 6: Create MediaMTX Service
print_step "Creating MediaMTX systemd service..."
sudo tee /etc/systemd/system/mediamtx.service > /dev/null << 'EOF'
[Unit]
Description=MediaMTX RTSP Server
After=network.target

[Service]
Type=simple
User=dan
ExecStart=/usr/local/bin/mediamtx /etc/mediamtx/mediamtx.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable mediamtx
sudo systemctl start mediamtx

# Step 7: Create Camera Stream Script
print_step "Creating camera stream script..."
sudo tee /usr/local/bin/camera-stream.sh > /dev/null << 'EOF'
#!/bin/bash
exec rpicam-vid -t 0 --inline --width 1920 --height 1080 --framerate 15 --bitrate 2000000 --profile high --level 4.2 --codec h264 --listen --output - | ffmpeg -f h264 -i - -c:v copy -f rtsp rtsp://localhost:8554/stream
EOF
sudo chmod +x /usr/local/bin/camera-stream.sh

# Step 8: Create Camera Stream Service
print_step "Creating camera stream systemd service..."
sudo tee /etc/systemd/system/camera-stream.service > /dev/null << 'EOF'
[Unit]
Description=Camera Stream
After=network.target mediamtx.service
Wants=mediamtx.service

[Service]
ExecStart=/usr/local/bin/camera-stream.sh
Restart=always
RestartSec=5
User=dan

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable camera-stream
sudo systemctl start camera-stream

# Step 9: Create Health Check Script
print_step "Creating health check script..."
mkdir -p ~/parcel-guard/scripts
cat > ~/parcel-guard/scripts/health-check.sh << EOF
#!/bin/bash
# ParcelGuard Camera Health Check Script
# Sends periodic health updates to the hub API

HUB_URL="http://${HUB_IP}:3000"
CAMERA_ID="${CAMERA_ID}"
INTERVAL=30

echo "Starting health check for camera: \$CAMERA_ID"
echo "Hub URL: \$HUB_URL"
echo "Interval: \${INTERVAL}s"

while true; do
    # Get CPU temperature (millidegrees to degrees)
    TEMP_RAW=\$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0")
    TEMP=\$(echo "scale=1; \$TEMP_RAW / 1000" | bc)

    # Get uptime
    UPTIME=\$(uptime -p 2>/dev/null | sed 's/up //' || echo "unknown")

    # Get IP address
    IP=\$(hostname -I 2>/dev/null | awk '{print \$1}' || echo "unknown")

    # Send health check to hub
    RESPONSE=\$(curl -s -X POST \\
        -H "Content-Type: application/json" \\
        -d "{\"temperature\": \$TEMP, \"uptime\": \"\$UPTIME\", \"ip\": \"\$IP\"}" \\
        "\$HUB_URL/api/cameras/\$CAMERA_ID/health" 2>&1)

    if [ \$? -eq 0 ]; then
        echo "[\$(date '+%H:%M:%S')] Health check sent - Temp: \${TEMP}°C, IP: \$IP"
    else
        echo "[\$(date '+%H:%M:%S')] Health check failed: \$RESPONSE"
    fi

    sleep "\$INTERVAL"
done
EOF
chmod +x ~/parcel-guard/scripts/health-check.sh

# Step 10: Create Health Check Service
print_step "Creating health check systemd service..."
sudo tee /etc/systemd/system/health-check.service > /dev/null << EOF
[Unit]
Description=ParcelGuard Camera Health Check
After=network.target

[Service]
Type=simple
User=dan
ExecStart=/home/dan/parcel-guard/scripts/health-check.sh
Restart=always
RestartSec=30

[Install]
WantedBy=multi-user.target
EOF

sudo systemctl daemon-reload
sudo systemctl enable health-check
sudo systemctl start health-check

# Step 11: Verify Services
print_step "Verifying services..."
echo ""
echo "Service Status:"
echo "---------------"
systemctl is-active mediamtx && echo "mediamtx: RUNNING" || echo "mediamtx: FAILED"
systemctl is-active camera-stream && echo "camera-stream: RUNNING" || echo "camera-stream: FAILED"
systemctl is-active health-check && echo "health-check: RUNNING" || echo "health-check: FAILED"

# Get IP address
IP=$(hostname -I | awk '{print $1}')

echo ""
echo "=========================================="
echo -e "${GREEN}Camera Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Camera ID: $CAMERA_ID"
echo "IP Address: $IP"
echo "RTSP Stream: rtsp://$IP:8554/stream"
echo ""
echo "Update the hub's mediamtx.yml and motion configs with this IP:"
echo "  $IP"
echo ""
echo "Test the stream with:"
echo "  ffplay rtsp://$IP:8554/stream"
echo ""
