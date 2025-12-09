#!/bin/bash
# ParcelGuard Camera Setup Script
# Run this after reimaging a Pi Zero 2W with Raspberry Pi OS Lite (64-bit)
#
# Prerequisites:
# - Fresh Raspberry Pi OS Lite (64-bit) install
# - Hostname: parcelguard-cam1 (or cam2, cam3, etc.)
# - Username: dan
# - SSH enabled
# - Connected to WiFi (or will configure during setup)
#
# Usage:
#   scp setup-camera.sh dan@<camera-ip>:~/
#   ssh dan@<camera-ip>
#   chmod +x setup-camera.sh
#   CAMERA_ID=cam1 ./setup-camera.sh
#
# Or with custom hub IP:
#   CAMERA_ID=cam3 HUB_IP=100.72.88.127 ./setup-camera.sh
#
# To configure WiFi during setup:
#   CAMERA_ID=cam1 WIFI_SSID="MyNetwork" WIFI_PASSWORD="secret" ./setup-camera.sh

set -e

# Configuration
CAMERA_ID="${CAMERA_ID:-}"
HUB_IP="${HUB_IP:-100.72.88.127}"
HUB_USER="${HUB_USER:-dan}"
MQTT_BROKER="${MQTT_BROKER:-$HUB_IP}"
WIFI_SSID="${WIFI_SSID:-}"
WIFI_PASSWORD="${WIFI_PASSWORD:-}"
WIFI_SSID_2="${WIFI_SSID_2:-}"
WIFI_PASSWORD_2="${WIFI_PASSWORD_2:-}"
WIFI_COUNTRY="${WIFI_COUNTRY:-AU}"

if [ -z "$CAMERA_ID" ]; then
    echo "Error: CAMERA_ID environment variable must be set"
    echo "Usage: CAMERA_ID=cam1 ./setup-camera.sh"
    echo ""
    echo "Optional environment variables:"
    echo "  HUB_IP         - Hub Tailscale IP (default: 100.72.88.127)"
    echo "  WIFI_SSID      - Primary WiFi network name"
    echo "  WIFI_PASSWORD  - Primary WiFi password"
    echo "  WIFI_SSID_2    - Secondary WiFi network (e.g., 4G hotspot)"
    echo "  WIFI_PASSWORD_2- Secondary WiFi password"
    echo "  WIFI_COUNTRY   - WiFi country code (default: AU)"
    exit 1
fi

echo "=========================================="
echo "ParcelGuard Camera Setup Script"
echo "=========================================="
echo ""
echo "Camera ID: $CAMERA_ID"
echo "Hub IP: $HUB_IP"
echo "Hub User: $HUB_USER"
echo "MQTT Broker: $MQTT_BROKER"
if [ -n "$WIFI_SSID" ]; then
    echo "WiFi SSID: $WIFI_SSID"
fi
if [ -n "$WIFI_SSID_2" ]; then
    echo "WiFi SSID 2: $WIFI_SSID_2"
fi
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

# Step 0: Configure WiFi (if WIFI_SSID provided)
if [ -n "$WIFI_SSID" ]; then
    print_step "Configuring WiFi networks..."

    # Set WiFi country
    sudo raspi-config nonint do_wifi_country "$WIFI_COUNTRY"

    # Configure WiFi using nmcli (NetworkManager) - default on newer Raspberry Pi OS
    if command -v nmcli &> /dev/null; then
        # Add primary WiFi network
        echo "Adding primary WiFi: $WIFI_SSID"
        nmcli connection delete "$WIFI_SSID" 2>/dev/null || true
        sudo nmcli device wifi connect "$WIFI_SSID" password "$WIFI_PASSWORD" || true

        # Add secondary WiFi network if provided (fallback network, lower priority)
        if [ -n "$WIFI_SSID_2" ]; then
            echo "Adding secondary WiFi: $WIFI_SSID_2"
            nmcli connection delete "$WIFI_SSID_2" 2>/dev/null || true
            sudo nmcli connection add type wifi con-name "$WIFI_SSID_2" ssid "$WIFI_SSID_2" \
                wifi-sec.key-mgmt wpa-psk wifi-sec.psk "$WIFI_PASSWORD_2" \
                connection.autoconnect yes connection.autoconnect-priority 5
        fi

        # Set primary network as higher priority (priority 10 > 5)
        sudo nmcli connection modify "$WIFI_SSID" connection.autoconnect-priority 10 2>/dev/null || true

        echo "WiFi networks configured via NetworkManager"
        echo "Networks will auto-connect based on availability"
    else
        # Fallback to wpa_supplicant for older systems
        sudo tee -a /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null << EOF

network={
    ssid="$WIFI_SSID"
    psk="$WIFI_PASSWORD"
    key_mgmt=WPA-PSK
    priority=10
}
EOF
        # Add secondary network if provided
        if [ -n "$WIFI_SSID_2" ]; then
            sudo tee -a /etc/wpa_supplicant/wpa_supplicant.conf > /dev/null << EOF

network={
    ssid="$WIFI_SSID_2"
    psk="$WIFI_PASSWORD_2"
    key_mgmt=WPA-PSK
    priority=5
}
EOF
        fi
        sudo wpa_cli -i wlan0 reconfigure
        echo "WiFi configured via wpa_supplicant"
    fi

    # Wait for connection
    echo "Waiting for WiFi connection..."
    sleep 5

    # Verify connection
    if ping -c 1 8.8.8.8 &> /dev/null; then
        echo "WiFi connected successfully"
        echo "IP Address: $(hostname -I | awk '{print $1}')"
    else
        print_warn "WiFi may not be connected. Check credentials and try again."
    fi

    # Show configured networks
    echo ""
    echo "Configured WiFi networks:"
    nmcli connection show | grep wifi || true
fi

# Step 1: System Updates
print_step "Updating system packages..."
sudo apt update && sudo apt upgrade -y

# Step 2: Install dependencies
print_step "Installing dependencies..."
sudo apt install -y \
    python3-picamera2 \
    python3-opencv \
    python3-numpy \
    python3-paho-mqtt \
    ffmpeg

# Step 3: Disable WiFi Power Management
print_step "Disabling WiFi power management..."
sudo iw wlan0 set power_save off 2>/dev/null || print_warn "Could not disable WiFi power save"

# Make it permanent via NetworkManager
sudo mkdir -p /etc/NetworkManager/conf.d
sudo tee /etc/NetworkManager/conf.d/wifi-powersave.conf > /dev/null << 'EOF'
[connection]
wifi.powersave = 2
EOF

# Step 4: Install Tailscale
print_step "Installing Tailscale for cross-network access..."
curl -fsSL https://tailscale.com/install.sh | sh
print_warn "Run 'sudo tailscale up' after setup to authenticate"

# Step 5: Create RAM disk mount for temporary files
print_step "Setting up RAM disk for temporary files..."
sudo mkdir -p /dev/shm/parcelguard
sudo chown dan:dan /dev/shm/parcelguard

# Add to fstab for persistence (tmpfs is already mounted, just ensure directory exists on boot)
echo '#!/bin/bash
mkdir -p /dev/shm/parcelguard
chown dan:dan /dev/shm/parcelguard
exit 0' | sudo tee /etc/rc.local > /dev/null
sudo chmod +x /etc/rc.local

# Step 6: Generate SSH key for SCP to hub
print_step "Setting up SSH key for hub access..."
if [ ! -f ~/.ssh/id_ed25519 ]; then
    ssh-keygen -t ed25519 -f ~/.ssh/id_ed25519 -N ""
    echo ""
    echo -e "${YELLOW}IMPORTANT: Copy this SSH key to the hub:${NC}"
    echo "Run this command:"
    echo "  ssh-copy-id ${HUB_USER}@${HUB_IP}"
    echo ""
    echo "Press Enter after you've copied the key..."
    read -r
else
    print_warn "SSH key already exists"
fi

# Step 7: Download motion detection script from hub
print_step "Downloading motion detection script..."
# First, try to get it from the hub
if scp ${HUB_USER}@${HUB_IP}:/tmp/motion-detect-v2.py ~/motion-detect.py 2>/dev/null; then
    echo "Downloaded motion-detect.py from hub"
else
    print_warn "Could not download from hub. You'll need to copy motion-detect.py manually."
    echo "  scp motion-detect.py dan@<this-camera>:~/"
fi

# Step 8: Create configuration file
print_step "Creating configuration file..."
cat > ~/motion-detect.env << EOF
CAMERA_ID=${CAMERA_ID}
HUB_IP=${HUB_IP}
HUB_USER=${HUB_USER}
RTSP_URL=rtsp://${HUB_IP}:8554/${CAMERA_ID}
MQTT_BROKER=${MQTT_BROKER}
MOTION_SENSITIVITY=50
CLIPS_PATH=/mnt/ssd/parcelguard/clips/${CAMERA_ID}
THUMBNAILS_PATH=/mnt/ssd/parcelguard/thumbnails
EOF

echo "Configuration saved to ~/motion-detect.env"

# Step 9: Create systemd service
print_step "Creating motion-detect systemd service..."
sudo tee /etc/systemd/system/motion-detect.service > /dev/null << EOF
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
EOF

sudo systemctl daemon-reload
sudo systemctl enable motion-detect

# Step 10: Create clips directory on hub
print_step "Creating clips directory on hub..."
ssh ${HUB_USER}@${HUB_IP} "mkdir -p /mnt/ssd/parcelguard/clips/${CAMERA_ID}" 2>/dev/null || \
    print_warn "Could not create clips directory on hub. Create it manually."

# Step 11: Add camera to hub database
print_step "Registering camera with hub..."
RTSP_URL="rtsp://${HUB_IP}:8554/${CAMERA_ID}"

# Get Tailscale IP if available
TAILSCALE_IP=$(tailscale ip -4 2>/dev/null || echo "")
if [ -n "$TAILSCALE_IP" ]; then
    echo "Tailscale IP: $TAILSCALE_IP"
fi

# Try to register camera via API
REGISTER_RESULT=$(curl -s -X POST \
    -H "Content-Type: application/json" \
    -d "{\"id\": \"${CAMERA_ID}\", \"name\": \"Camera ${CAMERA_ID#cam}\", \"streamUrl\": \"${RTSP_URL}\"}" \
    "http://${HUB_IP}:3000/api/cameras" 2>&1) || true

if echo "$REGISTER_RESULT" | grep -q "success"; then
    echo "Camera registered successfully"
elif echo "$REGISTER_RESULT" | grep -q "already exists"; then
    print_warn "Camera already registered in hub"
else
    print_warn "Could not register camera via API. Add it manually in the web UI."
fi

# Step 12: Final instructions
echo ""
echo "=========================================="
echo -e "${GREEN}Camera Setup Complete!${NC}"
echo "=========================================="
echo ""
echo "Camera ID: $CAMERA_ID"
echo "Hub IP: $HUB_IP"
echo ""
echo "NEXT STEPS:"
echo ""
echo "1. Authenticate Tailscale (if not done):"
echo "   sudo tailscale up"
echo ""
echo "2. Get your Tailscale IP:"
echo "   tailscale ip -4"
echo ""
echo "3. Copy the motion detection script if download failed:"
echo "   scp motion-detect.py dan@$(hostname -I | awk '{print $1}'):~/"
echo ""
echo "4. Start the motion detection service:"
echo "   sudo systemctl start motion-detect"
echo ""
echo "5. Check service status:"
echo "   sudo systemctl status motion-detect"
echo "   journalctl -u motion-detect -f"
echo ""
echo "6. Add camera to hub's MediaMTX config if needed:"
echo "   Edit /home/dan/mediamtx.yml on the hub and add:"
echo "   paths:"
echo "     ${CAMERA_ID}:"
echo "       source: publisher"
echo ""
echo "TROUBLESHOOTING:"
echo ""
echo "WiFi issues:"
echo "  # Check WiFi status"
echo "  nmcli device status"
echo "  nmcli connection show"
echo ""
echo "  # Reconnect to WiFi"
echo "  sudo nmcli device wifi connect \"SSID\" password \"PASSWORD\""
echo ""
echo "  # Check IP address"
echo "  hostname -I"
echo ""
echo "Camera issues:"
echo "  # Test camera"
echo "  libcamera-hello --list-cameras"
echo ""
echo "  # Check motion-detect logs"
echo "  journalctl -u motion-detect -f"
echo ""
