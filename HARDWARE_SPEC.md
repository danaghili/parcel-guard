# ParcelGuard - Hardware Specification

## Overview

DIY security camera system for monitoring communal areas in a block of flats, designed to detect and record parcel theft. Multi-camera setup streaming to a central hub for motion detection, recording, and notifications.

## Architecture

```
┌─────────────────┐     ┌─────────────────┐
│  Pi Zero + Cam  │     │  Pi Zero + Cam  │
│   (Camera 1)    │     │   (Camera 2)    │
└────────┬────────┘     └────────┬────────┘
         │ WiFi                  │ WiFi
         └──────────┬────────────┘
                    ▼
         ┌─────────────────────┐
         │   Raspberry Pi 4    │
         │   (Central Hub)     │
         │   - Motion detection│
         │   - Recording       │
         │   - API server      │
         └──────────┬──────────┘
                    │ WiFi
         ┌──────────▼──────────┐
         │    4G WiFi Router   │
         │    (existing)       │
         └──────────┬──────────┘
                    │ Internet
                    ▼
         ┌─────────────────────┐
         │     React PWA       │
         │   (mobile app)      │
         └─────────────────────┘
```

---

## Central Hub

| Component       | Specification                               | Purpose                                                     | Supplier            |
| --------------- | ------------------------------------------- | ----------------------------------------------------------- | ------------------- |
| Raspberry Pi 4  | 4GB RAM                                     | Central processing, motion detection, recording, API server | -                   |
| Power Supply    | Official Pi 4 USB-C 5.1V 3A (UK plug)       | Reliable power for Pi 4                                     | The Pi Hut / Amazon |
| Case            | Argon ONE M.2 (or similar with SSD support) | Cooling + SSD mounting                                      | -                   |
| Storage (OS)    | MicroSD 32GB                                | Boot drive                                                  | -                   |
| Storage (Video) | M.2 SATA SSD 256GB                          | Video clip storage                                          | -                   |

### Hub Notes

- Hub can be located in resident's flat (just needs to be on same WiFi network as cameras)
- SSD provides reliable storage for constant read/write of video recordings
- 256GB should store several weeks of motion-triggered clips

---

## Camera Units (×2)

| Component             | Specification            | Purpose                          | Supplier  |
| --------------------- | ------------------------ | -------------------------------- | --------- |
| Raspberry Pi Zero 2 W | Headerless               | Camera streaming unit            | -         |
| Camera Module         | ZDE 5MP OV5647 1080p     | Video capture                    | Amazon UK |
| Storage               | MicroSD 16GB+            | OS only (no local recording)     | -         |
| Power                 | 20,000mAh USB power bank | Portable power (~2 days runtime) | -         |
| Power Cable           | USB-A to Micro USB       | Connects power bank to Pi Zero   | -         |

### Camera Specifications (ZDE 5MP OV5647)

- Sensor: 5MP OV5647
- Resolution: 2592 × 1944 (stills), 1080p @ 30fps (video)
- Interface: CSI (15-pin, includes Pi Zero 22-pin adapter cable)
- Module size: 23.5 × 23.5 × 1mm

### Power Calculations

- Pi Zero 2 W + camera streaming: ~400mA average
- 20,000mAh battery: ~36-48 hours runtime (accounting for conversion losses)
- Recommendation: 2 power banks per camera (one in use, one charging)

### Concealment Considerations

- Units should be hidden (inside everyday objects, behind panels, etc.)
- Camera lens requires only 3-4mm hole for visibility
- No weatherproofing required (indoor use)
- Keep units small and discreet

---

## Network

| Component | Specification                                | Notes                        |
| --------- | -------------------------------------------- | ---------------------------- |
| Router    | Mobile 4G WiFi (existing)                    | Already available            |
| Protocol  | WiFi (2.4GHz for better range through walls) | All units connect wirelessly |

---

## Software Stack (Planned)

### Camera Units (Pi Zero 2 W)

- Raspberry Pi OS Lite (headless)
- rpicam-vid or similar for RTSP/HTTP streaming
- Lightweight, stream-only (no local processing)

### Central Hub (Pi 4)

- Raspberry Pi OS
- Frigate or Motion for motion detection
- Node.js/Express or Python FastAPI for backend API
- Video storage management

### Mobile App

- React PWA
- Live view, event playback, notifications
- Installable on phone, works offline for cached content

---

## Future Expansion

- Additional camera units (hub can handle 3-4 streams)
- PIR motion sensors for hardware-triggered recording
- IR illuminators for improved night vision
- Solar panel charging for power banks (if near windows)
