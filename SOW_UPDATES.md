# ParcelGuard - SOW Update Requirements

This file tracks changes and additions that need to be incorporated into the Scope of Work document based on implementation learnings and new requirements.

---

## Critical Changes

### 1. Replace Frigate with Motion
**Reason:** Frigate with AI detection overwhelmed the Pi 4 (4GB), causing system crash shortly after startup.

**Action:**
- Remove all Frigate references
- Replace with Motion (lightweight motion detection daemon)
- Note: Frigate remains viable if Coral TPU is added later

**Impact:**
- Simpler setup
- No AI-based object detection (person vs car vs animal)
- Motion-triggered recording still works
- Significantly lower CPU/RAM usage

---

### 2. Add Tailscale for Remote Access
**Reason:** System will run on separate 4G network in communal area, need secure remote access.

**Action:**
- Add Tailscale installation to hub setup
- Document phone/laptop Tailscale setup
- Enables SSH, web app, and feed access from anywhere

**New dependency:** Tailscale account (free tier sufficient)

---

### 3. Multi-Network WiFi Configuration
**Reason:** Cameras need flexibility to connect to different networks without physical reconfiguration.

**Action:**
- Configure multiple WiFi networks with priorities on all Pi devices
- Include main network, guest network, mobile hotspot as fallback
- Enable SSH by default for remote WiFi changes
- Optional: Fallback AP mode if all networks fail

---

### 4. Automated Setup Scripts
**Reason:** Manual setup took excessive time; need repeatable process for reimaging or adding cameras.

**Action:**
- Create `setup-hub.sh` script covering:
  - OS configuration
  - Docker installation
  - Motion installation and config
  - Backend API setup
  - Storage configuration
  - Tailscale installation
  - Multi-network WiFi
  - SSH enabled
  
- Create `setup-camera.sh` script covering:
  - OS Lite configuration
  - Camera interface enabled
  - Streaming service setup
  - Multi-network WiFi with priorities
  - SSH enabled
  - Auto-start on boot

---

## Hardware Clarifications

### 5. Camera Module Options
**Learnings:**
- Standard square cameras (ZDE 5MP, Arducam B0033) work but are bulky
- Slim "spy" style cameras (ZeroCam, Arducam B006603) preferred for concealment
- Both use same OV5647 sensor - fully plug-and-play interchangeable
- No software changes required when swapping

**Update hardware spec:**
- Primary recommendation: ZeroCam from The Pi Hut (60 x 11.4mm, UK stock)
- Alternative: Arducam B006603 (60 x 11.5mm)
- Fallback: Standard square modules work fine for testing

---

### 6. SSD Not Required for Initial Setup
**Learnings:**
- Pi 4 boots from microSD regardless
- SSD is for video storage only
- System can run entirely from microSD for testing
- SSD can be added later with simple mount + config change

**Update setup docs:**
- Document SSD-less initial setup
- Document adding SSD post-installation

---

## Future Enhancements (Out of Scope for v1)

### 7. RTSP Camera Integration (Reolink, etc.)
**Context:** User has interest in adding commercial cameras with RTSP support.

**Candidates:**
- Reolink E1 (~£25) - basic PTZ
- Reolink E1 Zoom (~£80) - 4K, 3x optical zoom, RTSP/ONVIF
- Reolink TrackMix (~£115) - dual lens, auto-tracking

**Integration approach:**
- Add RTSP stream URL to Motion config
- No additional hardware needed
- Works alongside Pi Zero cameras

**Add to future roadmap in SOW.**

---

### 8. Existing Camera Integration (Nest, SimpliSafe)
**Context:** User has Nest Cam, Nest Doorbell, SimpliSafe cameras in flat.

**Assessment:**
- Google Nest: Possible but painful (Device Access Program, OAuth, WebRTC)
- SimpliSafe: No official API, video access locked down

**Recommendation:** Not worth pursuing. Easier to replace with RTSP-compatible cameras.

**Add to "Out of Scope" with brief explanation.**

---

### 9. DIY PTZ Camera
**Context:** User interested in building custom pan-tilt-zoom camera.

**Components:**
- Pi Zero + camera
- Servo-based pan-tilt bracket (~£15)
- Servo driver board (PCA9685)
- Optional: Motorized zoom lens (~£60-100)

**Estimated cost:** ~£55 without optical zoom

**Add to future roadmap as optional enhancement.**

---

## Documentation Updates Needed

### 10. Update Development/Deployment Plans
- Reflect Motion instead of Frigate
- Add Tailscale configuration step
- Add setup script usage instructions
- Update architecture diagrams if needed

### 11. Update HARDWARE_SPEC.md
- Add ZeroCam as primary camera recommendation
- Add note about SSD being optional for initial setup
- Add Tailscale to software stack

### 12. Update README.md (when created)
- Setup script usage
- Multi-network WiFi configuration
- Tailscale setup instructions
- Adding cameras to existing system

---

## Summary Checklist

When updating SOW, address:

- [x] Replace Frigate → Motion throughout
- [x] Add Tailscale to architecture and setup
- [ ] Add multi-network WiFi to camera setup phase
- [x] Add setup scripts to development phases
- [ ] Update camera recommendations (ZeroCam)
- [x] Clarify SSD as optional for initial setup
- [ ] Add Reolink/RTSP integration to future roadmap
- [ ] Add Nest/SimpliSafe to "Out of Scope" with explanation
- [ ] Add DIY PTZ to future roadmap
- [ ] Review and update architecture diagram

---

## Implementation Status (December 7, 2024)

### Completed Items

**System is fully operational with:**

1. **Hub (Pi 4)**
   - Hostname: `parcelguard-hub`
   - Local IP: `192.168.1.205`
   - Tailscale IP: `100.72.88.127`
   - Services: API, Nginx, MediaMTX, Motion

2. **Camera 1 (Pi Zero 2W)**
   - Hostname: `parcelguard-cam1`
   - Local IP: `192.168.1.133`
   - Tailscale IP: `100.120.125.42`
   - Streaming: 1080p/15fps @ 2Mbps H.264

3. **Camera 2 (Pi Zero 2W)**
   - Hostname: `parcelguard-cam2`
   - Local IP: `192.168.1.183`
   - Tailscale IP: `100.69.12.33`
   - Streaming: 1080p/15fps @ 2Mbps H.264

**Key Technical Decisions:**
- TCP transport for RTSP (eliminated packet loss over WiFi)
- Motion detection via Motion daemon (not Frigate)
- Tailscale VPN for cross-network access
- H.264 High profile with 2Mbps bitrate cap

**Setup Scripts Created:**
- `scripts/pi-hub/recover-hub.sh` - Full hub recovery (23 steps)
- `scripts/pi-zero/setup-camera.sh` - Camera setup (12 steps)

---

*Created: Session notes from initial implementation*
*Updated: December 7, 2024 - System operational*
