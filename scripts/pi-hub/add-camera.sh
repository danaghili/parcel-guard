#!/bin/bash
# ParcelGuard Hub - Add New Camera Script
# Run this on the hub when adding a new camera
#
# Usage:
#   ./add-camera.sh cam3
#   ./add-camera.sh cam3 "Front Door"

set -e

CAMERA_ID="${1:-}"
CAMERA_NAME="${2:-Camera ${1#cam}}"

if [ -z "$CAMERA_ID" ]; then
    echo "Usage: ./add-camera.sh <camera_id> [camera_name]"
    echo ""
    echo "Examples:"
    echo "  ./add-camera.sh cam3"
    echo "  ./add-camera.sh cam3 \"Front Door\""
    exit 1
fi

# Colors
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

print_step() {
    echo -e "${GREEN}[STEP]${NC} $1"
}

print_warn() {
    echo -e "${YELLOW}[WARN]${NC} $1"
}

echo "=========================================="
echo "ParcelGuard Hub - Add Camera"
echo "=========================================="
echo ""
echo "Camera ID: $CAMERA_ID"
echo "Camera Name: $CAMERA_NAME"
echo ""

# Step 1: Create clips directory
print_step "Creating clips directory..."
mkdir -p /mnt/ssd/parcelguard/clips/${CAMERA_ID}
echo "Created /mnt/ssd/parcelguard/clips/${CAMERA_ID}"

# Step 2: Add to MediaMTX config
print_step "Checking MediaMTX configuration..."
MEDIAMTX_CONFIG="/home/dan/mediamtx.yml"

if grep -q "^  ${CAMERA_ID}:" "$MEDIAMTX_CONFIG" 2>/dev/null; then
    print_warn "Camera ${CAMERA_ID} already in MediaMTX config"
else
    echo "Adding ${CAMERA_ID} to MediaMTX config..."
    # Append camera path to config
    cat >> "$MEDIAMTX_CONFIG" << EOF
  ${CAMERA_ID}:
    source: publisher
EOF
    echo "Added ${CAMERA_ID} to $MEDIAMTX_CONFIG"

    # Restart MediaMTX
    print_step "Restarting MediaMTX..."
    sudo systemctl restart mediamtx
    sleep 2
    if systemctl is-active --quiet mediamtx; then
        echo "MediaMTX restarted successfully"
    else
        print_warn "MediaMTX may have failed to restart. Check: journalctl -u mediamtx -f"
    fi
fi

# Step 3: Register camera in database via API
print_step "Registering camera in database..."
RTSP_URL="rtsp://localhost:8554/${CAMERA_ID}"

RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${CAMERA_ID}\", \"name\": \"${CAMERA_NAME}\", \"streamUrl\": \"${RTSP_URL}\"}" \
    "http://localhost:3000/api/cameras" 2>&1) || true

if echo "$RESULT" | grep -q '"success":true'; then
    echo "Camera registered successfully"
elif echo "$RESULT" | grep -q "already exists"; then
    print_warn "Camera ${CAMERA_ID} already exists in database"
else
    print_warn "Could not register via API: $RESULT"
    echo "You can add it manually via the web UI"
fi

# Step 4: Show camera setup command
echo ""
echo "=========================================="
echo -e "${GREEN}Hub setup complete for ${CAMERA_ID}!${NC}"
echo "=========================================="
echo ""
echo "NEXT: Set up the camera device"
echo ""
echo "1. Flash Pi Zero 2W with Raspberry Pi OS Lite (64-bit)"
echo "   - Hostname: parcelguard-${CAMERA_ID}"
echo "   - Username: dan"
echo "   - Enable SSH"
echo "   - Configure WiFi"
echo ""
echo "2. Copy and run setup script on the camera:"
echo "   scp /home/dan/parcel-guard/scripts/pi-zero/setup-camera.sh dan@parcelguard-${CAMERA_ID}.local:~/"
echo "   ssh dan@parcelguard-${CAMERA_ID}.local"
echo "   chmod +x setup-camera.sh"
echo "   CAMERA_ID=${CAMERA_ID} HUB_IP=\$(tailscale ip -4) ./setup-camera.sh"
echo ""
echo "3. Or if using Tailscale IP directly:"
echo "   CAMERA_ID=${CAMERA_ID} HUB_IP=100.72.88.127 ./setup-camera.sh"
echo ""
