# ParcelGuard Setup Guide

A step-by-step guide to assembling and configuring your ParcelGuard security system.

---

## Table of Contents

1. [Parts Checklist](#1-parts-checklist)
2. [Tools Required](#2-tools-required)
3. [Hub Assembly (Pi 4)](#3-hub-assembly-pi-4)
4. [Camera Unit Assembly (Pi Zero)](#4-camera-unit-assembly-pi-zero)
5. [Preparing SD Cards](#5-preparing-sd-cards)
6. [First Boot - Hub](#6-first-boot---hub)
7. [First Boot - Cameras](#7-first-boot---cameras)
8. [Testing the System](#8-testing-the-system)
9. [Concealment Tips](#9-concealment-tips)
10. [Troubleshooting](#10-troubleshooting)
11. [Upgrades](#11-upgrades)

---

## 1. Parts Checklist

Before starting, verify you have all components.

### Hub (Central Server)

| Item | Qty | Notes |
|------|-----|-------|
| Raspberry Pi 4 (4GB RAM) | 1 | 4GB recommended for running Frigate |
| Official Pi 4 USB-C Power Supply (5.1V 3A) | 1 | UK plug, must be 3A for reliable operation |
| Argon ONE M.2 Case (or similar) | 1 | Provides cooling and SSD mounting |
| MicroSD Card (32GB+) | 1 | For the operating system (use 64GB+ if not using SSD initially) |
| Ethernet Cable (optional) | 1 | For initial setup if WiFi is problematic |

### Hub Upgrades (Install Later)

| Item | Qty | Notes |
|------|-----|-------|
| M.2 SATA SSD (256GB) | 1 | For video storage - **must be SATA, not NVMe** |

### Per Camera Unit (×2)

| Item | Qty | Notes |
|------|-----|-------|
| Raspberry Pi Zero 2 W | 1 | Must be the "2 W" version (has WiFi) |
| Camera Module (ZDE 5MP OV5647) | 1 | Includes ribbon cable and Zero adapter (can upgrade later) |
| MicroSD Card (16GB+) | 1 | For the operating system |
| 20,000mAh USB Power Bank | 2 | Two per camera (one in use, one charging) |
| USB-A to Micro USB Cable | 1 | Short cable preferred (30cm) |

### Camera Upgrades (Optional)

| Item | Qty | Notes |
|------|-----|-------|
| Upgraded Camera Module | Per camera | Smaller form factor with same OV5647 sensor |

> **Note:** The initial cameras work fine - upgrades are optional for better concealment with smaller chips.

### Accessories

| Item | Qty | Notes |
|------|-----|-------|
| MicroSD Card Reader | 1 | For flashing SD cards from your computer |
| Mini HDMI to HDMI Adapter/Cable | 1 | Optional - for debugging Pi Zero |
| Micro USB OTG Adapter | 1 | Optional - for connecting keyboard to Pi Zero |

---

## 2. Tools Required

- Small Phillips screwdriver (for Argon case)
- Computer with SD card slot or USB card reader
- Internet connection
- Mobile phone (for testing the PWA)

**Software to download:**
- [Raspberry Pi Imager](https://www.raspberrypi.com/software/) - Install on your computer

---

## 3. Hub Assembly (Pi 4)

> **Note:** This guide gets you up and running WITHOUT the SSD first. The SSD can be installed later once you have the correct SATA model - see [Section 11: Upgrades](#11-upgrades).

### Step 3.1: Prepare the Argon ONE Case

1. Unbox the Argon ONE M.2 case
2. Locate all parts:
   - Top cover (with fan and ports)
   - Bottom base (M.2 SSD bay)
   - Thermal pads
   - Screws
   - GPIO extension board

### Step 3.2: Apply Thermal Pads

1. Locate the thermal pads (usually included with the case)
2. Apply thermal pads to the Pi 4's CPU and RAM chips:
   - Large pad on the main CPU (center of board)
   - Smaller pads on RAM chips if provided
3. Remove the protective film from both sides of each pad

### Step 3.3: Install the Pi 4

1. Align the Pi 4 with the case, GPIO pins facing the extension board
2. Gently press the Pi 4 onto the GPIO extension connector
3. Ensure all ports align with the case openings
4. The board should sit flat with thermal pads making contact with the case lid

### Step 3.4: Close the Case

1. Position the top cover over the Pi 4
2. Insert and tighten the 4 corner screws
3. Don't overtighten - snug is sufficient

### Step 3.5: Set Aside (Don't power on yet!)

1. Set the case aside - we'll flash the SD card first
2. DO NOT insert the SD card or connect power yet

---

## 4. Camera Unit Assembly (Pi Zero)

Repeat these steps for each camera unit.

### Step 4.1: Inspect the Camera Module

1. Unbox the camera module carefully
2. You should have:
   - Camera board with lens
   - Standard ribbon cable (for full-size Pi)
   - Pi Zero adapter ribbon cable (shorter, different width connectors)
3. **Handle by the edges only** - don't touch the lens or ribbon contacts

### Step 4.2: Identify the Correct Cable

The Pi Zero uses a **smaller camera connector** than the Pi 4. You need the adapter cable:
- One end: Narrow (fits Pi Zero) - usually 22-pin
- Other end: Wide (fits camera module) - usually 15-pin

### Step 4.3: Connect Cable to Camera Module

1. On the camera board, locate the ribbon connector
2. Gently pull up the black/brown locking tab (it hinges, don't remove it)
   - **Tip:** Use your fingernail to gently lift both sides evenly
   - It only lifts about 1-2mm - don't force it further
3. Insert the **wide end** of the ribbon cable:
   - Silver contacts facing DOWN (toward the camera board)
   - Blue backing facing UP
   - The cable should slide in easily - if it won't go, check the tab is fully lifted
4. Push the locking tab back down to secure
   - You should feel a slight click
   - The cable should NOT pull out easily when locked

### Step 4.4: Connect Cable to Pi Zero

1. Locate the camera connector on the Pi Zero (labeled "CAMERA")
2. Gently pull up the locking tab
3. Insert the **narrow end** of the ribbon cable:
   - Silver contacts facing DOWN (toward the Pi Zero board)
   - Blue backing facing UP
4. Push the locking tab back down firmly

### Step 4.5: Verify Connection

- The ribbon should be straight, not twisted
- Both ends should be fully inserted and locked
- The cable should have a little slack (don't stretch it tight)

### Step 4.6: Set Aside

1. Place the assembled camera unit somewhere safe
2. DO NOT connect power yet - we need to flash the SD card first

---

## 5. Preparing SD Cards

You'll flash 3 SD cards total: 1 for the hub, 2 for cameras.

### Step 5.1: Download and Install Raspberry Pi Imager

1. Go to https://www.raspberrypi.com/software/
2. Download for your operating system
3. Install and open the application

### Step 5.2: Flash the Hub SD Card

1. Insert the 32GB SD card into your computer

2. In Raspberry Pi Imager:
   - Click **"Choose Device"** → Select **"Raspberry Pi 4"**
   - Click **"Choose OS"** → **"Raspberry Pi OS (other)"** → **"Raspberry Pi OS Lite (64-bit)"**
   - Click **"Choose Storage"** → Select your SD card

3. Click the **gear icon** (or Ctrl+Shift+X) for advanced options:

   **General tab:**
   - ✅ Set hostname: `ParcelGuard`
   - ✅ Set username and password:
     - Username: `dan`
     - Password: (choose a secure password - write it down!)
   - ✅ Configure wireless LAN:
     - SSID: (your WiFi network name)
     - Password: (your WiFi password)
     - Country: GB (or your country code)
   - ✅ Set locale settings:
     - Time zone: Europe/London (or your timezone)
     - Keyboard layout: gb (or your layout)

   **Services tab:**
   - ✅ Enable SSH
   - Select "Use password authentication"

4. Click **"Save"**

5. Click **"Write"** and confirm
   - This will erase the SD card and flash the OS
   - Wait for it to complete and verify

6. Remove the SD card and label it "HUB"

### Step 5.3: Flash Camera SD Cards

Repeat for each camera (2 total):

1. Insert a 16GB SD card

2. In Raspberry Pi Imager:
   - Click **"Choose Device"** → Select **"Raspberry Pi Zero 2 W"**
   - Click **"Choose OS"** → **"Raspberry Pi OS (other)"** → **"Raspberry Pi OS Lite (64-bit)"**
   - Click **"Choose Storage"** → Select your SD card

3. Click the **gear icon** for advanced options:

   **For Camera 1:**
   - Hostname: `parcelguard-cam1`
   - Username: `dan`
   - Password: (same as hub, or different - write it down!)
   - WiFi: (same network as hub)
   - Timezone and keyboard: (same as hub)
   - ✅ Enable SSH

   **For Camera 2:**
   - Hostname: `parcelguard-cam2`
   - (All other settings same as Camera 1)

4. Click **"Save"**, then **"Write"**

5. Label the SD cards "CAM1" and "CAM2"

---

## 6. First Boot - Hub

### Step 6.1: Insert SD Card and Power On

1. Insert the "HUB" SD card into the Pi 4's slot (bottom of Argon case)
2. Connect the USB-C power supply
3. The power LED should light up, and you'll see activity on the green LED

### Step 6.2: Wait for First Boot

- First boot takes 2-5 minutes (system expands filesystem and configures)
- The Pi will reboot automatically once during this process
- Wait until activity settles down

### Step 6.3: Find the Hub on Your Network

From your computer, try to connect:

```bash
# Try hostname first
ping ParcelGuard.local

# If that doesn't work, find it by IP
# On Mac/Linux:
arp -a | grep -i raspberry

# Or check your router's admin page for connected devices
```

### Step 6.4: SSH into the Hub

```bash
ssh dan@ParcelGuard.local
# Enter the password you set during flashing
```

If `ParcelGuard.local` doesn't resolve, use the IP address:
```bash
ssh dan@192.168.1.xxx
```

### Step 6.5: Update the System

```bash
sudo apt update && sudo apt upgrade -y
```

This may take 5-10 minutes. Let it complete.

### Step 6.6: Install Required Packages

```bash
sudo apt install -y \
  git \
  curl \
  nginx \
  sqlite3 \
  ffmpeg \
  python3-pip
```

### Step 6.7: Install Node.js

```bash
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Verify
node --version   # Should show v20.x.x
npm --version
```

### Step 6.8: Create Storage Directories

We'll use the SD card for storage initially. When you install the SSD later (see [Section 11: Upgrades](#11-upgrades)), you'll migrate the data.

```bash
# Create storage directory on SD card
sudo mkdir -p /mnt/storage
sudo chown -R dan:dan /mnt/storage

# Create ParcelGuard directories
mkdir -p /mnt/storage/parcelguard/{data,clips,thumbnails,logs,backups}

# Verify
ls -la /mnt/storage/parcelguard/
```

> **Note:** SD card storage works fine for testing and initial setup. For long-term use with better performance and longevity, install an SSD later - see [Section 11: Upgrades](#11-upgrades).

### Step 6.9: Clone ParcelGuard

```bash
cd /home/dan
git clone https://github.com/yourusername/parcelguard.git
cd parcelguard

# Install dependencies
npm install

# Build shared package
npm run build -w packages/shared

# Build API
npm run build -w apps/api

# Build Web
npm run build -w apps/web
```

### Step 6.10: Continue with DEPLOYMENT_SPEC.md

For the remaining hub configuration (systemd services, Nginx, Frigate, Cloudflare Tunnel), follow the detailed instructions in [DEPLOYMENT_SPEC.md](./DEPLOYMENT_SPEC.md) starting from section **"1.5 Configure Services"**.

---

## 7. First Boot - Cameras

Complete these steps for each camera unit.

### Step 7.1: Insert SD Card and Power On

1. Insert the appropriate SD card (CAM1 or CAM2)
2. Connect the USB power bank via the micro USB **power** port (not the data port)
   - **IMPORTANT:** Pi Zero 2 W has TWO micro USB ports:
     - The one closer to the HDMI port is for **POWER** (use this one!)
     - The one in the middle is for **DATA** (don't use for power)
   - If you plug into the wrong port, nothing will happen
3. Wait 2-3 minutes for first boot

### Step 7.2: SSH into the Camera

```bash
# For Camera 1
ssh dan@parcelguard-cam1.local

# For Camera 2
ssh dan@parcelguard-cam2.local
```

### Step 7.3: Update and Enable Camera

```bash
# Update system
sudo apt update && sudo apt upgrade -y

# Enable the camera interface
sudo raspi-config nonint do_camera 0

# Reboot to apply
sudo reboot
```

### Step 7.4: Test the Camera

After reboot, SSH back in and test:

```bash
# Check camera is detected
rpicam-hello --list-cameras

# You should see output like:
# Available cameras
# -----------------
# 0 : ov5647 [2592x1944] (/base/soc/i2c0mux/i2c@1/ov5647@36)

# Take a test photo
rpicam-still -o test.jpg

# If this works, your camera is connected correctly!
```

> **Note:** Older guides may reference `libcamera-hello` and `libcamera-still`. On Raspberry Pi OS Bookworm and later, these have been renamed to `rpicam-hello` and `rpicam-still`.

### Step 7.5: Install Streaming Software

```bash
# Install required packages
sudo apt install -y libcamera-tools v4l-utils ffmpeg

# Download mediamtx (RTSP server)
wget https://github.com/bluenviron/mediamtx/releases/download/v1.5.1/mediamtx_v1.5.1_linux_arm64v8.tar.gz
tar -xzf mediamtx_v1.5.1_linux_arm64v8.tar.gz
sudo mv mediamtx /usr/local/bin/

# Create mediamtx config directory and move config
sudo mkdir -p /etc/mediamtx
sudo mv mediamtx.yml /etc/mediamtx/mediamtx.yml
```

### Step 7.6: Configure Camera Streaming

**Create the camera streaming script:**

```bash
sudo nano /usr/local/bin/camera-stream.sh
```

Add these two lines exactly (type them, don't copy-paste to avoid formatting issues):

```bash
#!/bin/bash
rpicam-vid -t 0 --inline --width 1920 --height 1080 --framerate 15 --codec h264 --output - | ffmpeg -f h264 -i - -c:v copy -f rtsp rtsp://localhost:8554/stream
```

Save (Ctrl+X, Y, Enter) and make executable:

```bash
sudo chmod +x /usr/local/bin/camera-stream.sh
```

**Configure mediamtx:**

```bash
sudo nano /etc/mediamtx/mediamtx.yml
```

Find the `paths:` section at the bottom of the file and replace it with:

```yaml
paths:
  stream:
    source: publisher
```

Save the file.

### Step 7.7: Test Streaming

You need two SSH sessions to the camera for testing.

**Session 1 - Start mediamtx:**

```bash
mediamtx
```

You should see "configuration loaded from /etc/mediamtx/mediamtx.yml" and listeners opening.

**Session 2 - Start the camera stream:**

```bash
ssh dan@parcelguard-cam1.local
/usr/local/bin/camera-stream.sh
```

You should see ffmpeg output showing it's streaming.

**Test from your computer:**

Open VLC → Media → Open Network Stream → Enter:

```
rtsp://parcelguard-cam1.local:8554/stream
```

If you see video, it's working! Press Ctrl+C in both SSH sessions to stop.

### Step 7.8: Set Up Services (Auto-start)

Create systemd services so streaming starts automatically on boot.

**Camera stream service:**

```bash
sudo nano /etc/systemd/system/camera-stream.service
```

```ini
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
```

**Mediamtx service:**

```bash
sudo nano /etc/systemd/system/mediamtx.service
```

```ini
[Unit]
Description=MediaMTX RTSP Server
After=network.target

[Service]
ExecStart=/usr/local/bin/mediamtx /etc/mediamtx/mediamtx.yml
Restart=always
RestartSec=5

[Install]
WantedBy=multi-user.target
```

**Enable and start the services:**

```bash
sudo systemctl daemon-reload
sudo systemctl enable mediamtx camera-stream
sudo systemctl start mediamtx
sudo systemctl start camera-stream
```

**Verify both are running:**

```bash
sudo systemctl status mediamtx
sudo systemctl status camera-stream
```

### Step 7.9: Set Up Health Checks

The cameras need to send health checks to the hub so they show as "Online" in the app.

**Create the health check script:**

```bash
sudo nano /usr/local/bin/parcelguard-health-check.sh
```

Type this exactly:

```bash
#!/bin/bash
HUB_URL="${HUB_URL:-http://ParcelGuard.local:3000}"
CAMERA_ID="${CAMERA_ID:-}"
INTERVAL="${INTERVAL:-30}"

if [ -z "$CAMERA_ID" ]; then
    echo "Error: CAMERA_ID must be set"
    exit 1
fi

while true; do
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0")
    TEMP=$(echo "scale=1; $TEMP_RAW / 1000" | bc)
    UPTIME=$(uptime -p 2>/dev/null | sed 's/up //' || echo "unknown")
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")

    curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"temperature\": $TEMP, \"uptime\": \"$UPTIME\", \"ip\": \"$IP\"}" \
        "$HUB_URL/api/cameras/$CAMERA_ID/health" > /dev/null 2>&1

    sleep "$INTERVAL"
done
```

Save and make executable:

```bash
sudo chmod +x /usr/local/bin/parcelguard-health-check.sh
```

**Create the systemd service:**

```bash
sudo nano /etc/systemd/system/parcelguard-health.service
```

```ini
[Unit]
Description=ParcelGuard Camera Health Check
After=network-online.target
Wants=network-online.target

[Service]
Type=simple
ExecStart=/usr/local/bin/parcelguard-health-check.sh
Restart=always
RestartSec=10
Environment=HUB_URL=http://ParcelGuard.local:3000
Environment=CAMERA_ID=YOUR_CAMERA_ID_HERE
Environment=INTERVAL=30

[Install]
WantedBy=multi-user.target
```

> **Important:** Replace `YOUR_CAMERA_ID_HERE` with your actual camera ID from the database. You can find it by running on the hub: `sqlite3 /mnt/storage/parcelguard/data/parcelguard.db "SELECT id, name FROM cameras;"`

Save, then enable and start:

```bash
sudo systemctl daemon-reload
sudo systemctl enable parcelguard-health
sudo systemctl start parcelguard-health
sudo systemctl status parcelguard-health
```

### Step 7.10: Repeat for Camera 2

Repeat steps 7.1-7.9 for your second camera, using:
- Hostname: `parcelguard-cam2`
- SD card labeled "CAM2"
- Different CAMERA_ID in the health check service

---

## 8. Testing the System

### Step 8.1: Test Camera Streams

From the hub, test that you can see each camera:

```bash
# Test Camera 1
ffprobe rtsp://parcelguard-cam1.local:8554/stream

# Test Camera 2
ffprobe rtsp://parcelguard-cam2.local:8554/stream
```

You should see stream information (resolution, codec, etc.) if working.

### Step 8.2: Test the Web Interface

1. On your phone or computer, open a browser
2. Navigate to: `http://ParcelGuard.local`
3. You should see the ParcelGuard interface

### Step 8.3: Test Live View

1. In the web interface, navigate to the Live View
2. Verify each camera feed is visible
3. Check for smooth playback (some delay is normal)

### Step 8.4: Test Motion Detection

1. Walk in front of a camera
2. Check that an event is recorded
3. Verify you can play back the recorded clip

### Step 8.5: Test Remote Access (Tailscale Funnel)

1. Disconnect your phone from WiFi (use mobile data)
2. Navigate to your Tailscale Funnel URL (e.g., `https://parcelguard-hub.tail1234.ts.net`)
3. Verify you can access the system remotely
4. Login with username `admin` and PIN `2808`

---

## 9. Concealment Tips

### Camera Placement

- Position cameras to cover entry points and parcel drop areas
- Ensure good lighting (cameras struggle in very dark conditions)
- Avoid pointing directly at windows (backlight causes silhouettes)

### Hiding Camera Units

**Ideas for concealment:**
- Inside a tissue box with small hole for lens
- Behind a plant pot with lens peeking through
- Inside a fake book on a shelf
- Behind a decorative item with drilled hole
- Inside an electrical junction box (non-functional)

**Key requirements:**
- Camera lens needs clear line of sight (even small obstructions blur image)
- Hole should be just large enough for lens (3-5mm)
- Ensure ventilation for the Pi Zero (it generates heat)
- Keep power bank accessible for swapping/charging

### Power Bank Management

- Label power banks clearly (Camera 1 Primary, Camera 1 Backup, etc.)
- Set a schedule to swap batteries (e.g., every 2 days)
- Keep a charging station with backup banks ready
- Consider a small UPS for the hub if power is unreliable

---

## 10. Troubleshooting

### Pi Won't Boot

**Symptoms:** No activity LEDs, or constant blinking

**Solutions:**
1. Re-flash the SD card
2. Try a different SD card
3. Check power supply is adequate (Pi 4 needs 3A)
4. For Pi Zero, ensure using the correct USB port for power

### Can't Find Pi on Network

**Solutions:**
1. Wait longer (first boot can take 5+ minutes)
2. Check WiFi credentials were entered correctly
3. Connect Pi to monitor/TV to see boot messages
4. Try Ethernet connection for hub (temporarily)
5. Check your router for connected devices

### Camera Not Detected

**Symptoms:** `rpicam-hello --list-cameras` shows no cameras

**Solutions:**
1. Check ribbon cable is fully inserted at both ends
2. Verify cable is the correct type (Zero adapter cable)
3. Check cable isn't twisted or damaged
4. Ensure camera interface is enabled: `sudo raspi-config` → Interface Options → Camera
5. Reboot after enabling camera

### Camera Stream Won't Start

**Solutions:**
1. Test camera with `rpicam-still -o test.jpg`
2. Check mediamtx is running: `systemctl status mediamtx`
3. Check for port conflicts: `netstat -tlnp | grep 8554`
4. Review logs: `journalctl -u parcelguard-camera -f`

### Hub Can't Connect to Camera Stream

**Solutions:**
1. Verify camera IP: `ping parcelguard-cam1.local`
2. Test stream locally on camera first
3. Check firewall isn't blocking port 8554
4. Verify both devices are on same network

### High CPU Temperature

**Symptoms:** Pi is throttling, sluggish performance

**Solutions:**
1. Ensure thermal pads are properly applied
2. Check Argon case fan is spinning
3. Improve ventilation around the device
4. Reduce stream quality if needed (lower resolution)

### SSD Not Detected (After Upgrade)

If you've installed an SSD per [Section 11: Upgrades](#11-upgrades) and it's not working:

**Solutions:**
1. Verify it's a SATA SSD (not NVMe) - the Argon case does NOT support NVMe
2. Check M.2 is fully seated in slot
3. Try reseating the SSD
4. Test SSD in another computer if possible

---

## Quick Reference

### Default Hostnames

| Device | Hostname | Default User |
|--------|----------|--------------|
| Hub (ParcelGuard) | `ParcelGuard.local` | dan |
| Camera 1 | `parcelguard-cam1.local` | dan |
| Camera 2 | `parcelguard-cam2.local` | dan |

### Important Ports

| Port | Service |
|------|---------|
| 22 | SSH |
| 80 | Web interface (Nginx) |
| 3000 | API server |
| 5000 | Frigate |
| 8554 | Camera RTSP streams |

### Useful Commands

```bash
# Check service status
sudo systemctl status parcelguard-api
sudo systemctl status nginx

# View logs
journalctl -u parcelguard-api -f

# Check disk space
df -h

# Check temperature
vcgencmd measure_temp

# Restart a service
sudo systemctl restart parcelguard-api
```

---

## Next Steps

Once your system is assembled and running:

1. Set up Tailscale Funnel for public HTTPS access (see below)
2. Create user accounts for family members
3. Set up automated backups
4. Fine-tune motion detection sensitivity
5. Install upgrades (SSD, new cameras) - see [Section 11: Upgrades](#11-upgrades)

For detailed configuration, refer to [DEPLOYMENT_SPEC.md](./DEPLOYMENT_SPEC.md).

### Setting Up Tailscale Funnel (Public Access)

Tailscale Funnel allows anyone to access ParcelGuard via HTTPS without installing any apps.

```bash
# On the hub, enable Funnel for port 80
tailscale funnel 80
```

This gives you a public URL like `https://parcelguard-hub.tail1234.ts.net` that works from anywhere.

To make it persistent across reboots:

```bash
# Run in background
tailscale funnel --bg 80
```

### Creating User Accounts

1. Login as admin (username: `admin`, PIN: `2808`)
2. Go to Settings → User Management
3. Click "Add User" to create accounts for family members
4. Each user gets their own username and PIN

---

## 11. Upgrades

Once your system is tested and working, you can install these upgrades for improved performance and concealment.

### 11.1: Install M.2 SATA SSD

**When to do this:** After the system is fully working with SD card storage.

**Requirements:**
- M.2 SATA SSD (256GB+) - **MUST be SATA, not NVMe**
- The Argon ONE case only supports M.2 SATA drives
- Common compatible drives: Samsung 860 EVO, Crucial MX500, WD Blue

#### Step 1: Prepare for Migration

SSH into the hub and stop services:

```bash
ssh dan@ParcelGuard.local

# Stop ParcelGuard services
sudo systemctl stop parcelguard-api
sudo systemctl stop frigate

# Back up existing data (optional but recommended)
tar -czvf ~/parcelguard-backup.tar.gz /mnt/storage/parcelguard/
```

#### Step 2: Shut Down and Install SSD

```bash
sudo shutdown now
```

1. Disconnect power from the Pi 4
2. Remove the 4 screws from the bottom of the Argon case
3. Carefully remove the bottom cover
4. Locate the M.2 SATA slot inside
5. Insert your M.2 SSD at a 30° angle into the slot
6. Press down and secure with the small screw provided
7. Replace the bottom cover and screws
8. Reconnect power

#### Step 3: Partition and Format the SSD

SSH back in once the Pi boots:

```bash
ssh dan@ParcelGuard.local

# Check the SSD is detected
lsblk

# You should see something like:
# sda      8:0    0 238.5G  0 disk

# Create a partition
sudo fdisk /dev/sda
# Type: n (new), p (primary), 1, Enter, Enter, w (write)

# Format the SSD
sudo mkfs.ext4 /dev/sda1
```

#### Step 4: Mount the SSD

```bash
# Create mount point
sudo mkdir -p /mnt/ssd

# Get the UUID
sudo blkid /dev/sda1
# Note the UUID value (looks like: xxxxxxxx-xxxx-xxxx-xxxx-xxxxxxxxxxxx)

# Add to fstab (replace YOUR-UUID-HERE with actual UUID)
echo "UUID=YOUR-UUID-HERE /mnt/ssd ext4 defaults,noatime 0 2" | sudo tee -a /etc/fstab

# Mount it
sudo mount -a

# Set ownership
sudo chown -R dan:dan /mnt/ssd

# Verify
df -h /mnt/ssd
```

#### Step 5: Migrate Data to SSD

```bash
# Create directories on SSD
mkdir -p /mnt/ssd/parcelguard/{data,clips,thumbnails,logs,backups}

# Copy existing data from SD card storage
cp -r /mnt/storage/parcelguard/* /mnt/ssd/parcelguard/

# Update symlink to point to new location
sudo rm -rf /mnt/storage
sudo ln -s /mnt/ssd /mnt/storage

# Verify the symlink works
ls -la /mnt/storage/parcelguard/
```

#### Step 6: Restart Services

```bash
# Start services
sudo systemctl start parcelguard-api
sudo systemctl start frigate

# Verify everything is working
sudo systemctl status parcelguard-api
sudo systemctl status frigate
```

#### Step 7: Clean Up (Optional)

Once you've verified everything works with the SSD:

```bash
# Remove the backup if not needed
rm ~/parcelguard-backup.tar.gz
```

---

### 11.2: Upgrade Camera Modules

**When to do this:** After cameras are tested and working, if you want smaller form factors for better concealment.

**Why upgrade:** The initial ZDE 5MP OV5647 cameras work fine but have larger PCBs. Cameras with smaller chips are easier to conceal in discreet housings.

#### Step 1: Order Compatible Cameras

Look for camera modules with:
- **Same sensor:** OV5647 (5MP) for compatibility
- **Smaller PCB:** Look for "spy camera" or "pinhole camera" variants
- **Pi Zero ribbon cable:** Must include or be compatible with the narrow Zero connector

#### Step 2: Power Down Camera Unit

```bash
ssh dan@parcelguard-cam1.local
sudo shutdown now
```

Disconnect the power bank.

#### Step 3: Swap Camera Module

1. Gently lift the locking tab on the Pi Zero camera connector
2. Remove the old ribbon cable
3. Connect the new camera module's ribbon cable:
   - Silver contacts facing DOWN (toward the Pi Zero board)
   - Blue backing facing UP
4. Push the locking tab back down firmly

#### Step 4: Test New Camera

Power on and SSH back in:

```bash
ssh dan@parcelguard-cam1.local

# Test camera is detected
rpicam-hello --list-cameras

# Take a test photo
rpicam-still -o test.jpg
```

If the camera is detected and takes photos, it's working correctly.

#### Step 5: Verify Streaming

```bash
# Check the streaming service
sudo systemctl status parcelguard-camera

# From the hub, test the stream
# ssh dan@ParcelGuard.local
# ffprobe rtsp://parcelguard-cam1.local:8554/stream
```

Repeat for each camera you want to upgrade.

---

*Last Updated: December 2024*
