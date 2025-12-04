# ParcelGuard User Guide

Welcome to ParcelGuard, your DIY security system for monitoring communal areas and protecting deliveries.

## Table of Contents

- [Getting Started](#getting-started)
- [Dashboard](#dashboard)
- [Live View](#live-view)
- [Events](#events)
- [Settings](#settings)
- [Notifications](#notifications)
- [Offline Mode](#offline-mode)
- [Keyboard Shortcuts](#keyboard-shortcuts)
- [Mobile App Installation](#mobile-app-installation)

---

## Getting Started

### First-Time Setup

When you first log in to ParcelGuard, you'll be guided through a setup wizard:

1. **Welcome** - Overview of ParcelGuard features
2. **Add Camera** - Connect your first camera by entering its stream URL
3. **Notifications** - Configure push notifications (optional)
4. **Complete** - You're ready to start monitoring!

### Logging In

1. Open ParcelGuard in your browser
2. Enter your 4-8 digit PIN
3. You'll be redirected to the Dashboard

---

## Dashboard

The Dashboard provides a quick overview of your security system:

### Stats Grid
- **Cameras Online** - Number of cameras currently streaming
- **Events Today** - Motion events detected today
- **Important** - Events you've marked as important
- **Total Events** - Total recorded events

### Camera List
View all configured cameras with their current status (online/offline). Tap any camera to view its live feed.

### Recent Events
Shows the 5 most recent motion events with thumbnails. Tap to view full details.

### Quick Actions
- **Live View** - Jump to multi-camera view
- **Events** - Browse all recorded events

---

## Live View

The Live View displays all your camera feeds simultaneously.

### Grid Layout
- Cameras automatically arrange in a responsive grid
- 1 camera: Full screen
- 2 cameras: Side by side
- 3-4 cameras: 2x2 grid
- 5+ cameras: Optimized grid

### Single Camera View
Tap any camera in the grid to view it full screen:
- Swipe or use controls to exit full screen
- Video automatically reconnects if the stream drops

### Camera Status
- **Green dot** - Camera is online and streaming
- **Red dot** - Camera is offline or unreachable

---

## Events

The Events page shows all motion events captured by your cameras.

### Browsing Events

Events display as cards with:
- Thumbnail preview
- Camera name
- Timestamp
- Duration
- Badges (Important, False Alarm)

### Filtering Events

Use the filter controls to narrow down events:
- **Camera** - Filter by specific camera
- **Date Range** - Use preset ranges (Today, Last 7 Days, etc.) or custom dates
- **Important Only** - Show only events marked as important
- **Hide False Alarms** - Exclude events marked as false alarms

### Event Details

Tap an event card to view:
- Full video playback with controls
- Playback speed (0.5x, 1x, 1.5x, 2x)
- Full screen mode

### Event Actions

- **Mark Important** - Flag significant events for easy reference
- **Mark False Alarm** - Mark non-events (reduces clutter)
- **Delete** - Permanently remove the event
- **Download** - Save the video clip to your device

### Infinite Scroll

Scroll to the bottom to automatically load more events. For large event lists (50+), items outside your viewport are optimized for performance.

---

## Settings

### Appearance

**Theme** - Choose between:
- Light mode
- Dark mode
- System (follows your device preference)

### Manage

- **Cameras** - Add, edit, or remove cameras
- **System Health** - View system stats and storage usage

### Account

- **Change PIN** - Update your login PIN (4-8 digits)

### System

- **Storage** - View usage and configure retention period
- **Notifications** - Configure push notification settings

---

## Notifications

ParcelGuard uses [ntfy.sh](https://ntfy.sh) for push notifications.

### Setup

1. Install the ntfy app on your phone ([iOS](https://apps.apple.com/app/ntfy/id1625396347) / [Android](https://play.google.com/store/apps/details?id=io.heckel.ntfy))
2. Subscribe to your unique topic in the ntfy app
3. The server admin configures the `NTFY_TOPIC` environment variable

### Configuration

In Settings > Notifications:
- **Enable/Disable** - Turn notifications on or off
- **Quiet Hours** - Set times when notifications are muted
- **Cooldown** - Minimum time between notifications (prevents spam)
- **Per-Camera** - Enable/disable notifications for each camera

### Testing

Use the "Send Test Notification" button to verify your setup is working.

---

## Offline Mode

ParcelGuard works even when you lose internet connectivity:

### Cached Data

When offline, you can still:
- View the Dashboard (with cached data)
- Browse recent events
- View cached thumbnails

A "Cached" badge appears when displaying offline data, showing when it was last updated.

### Automatic Sync

When you come back online:
- Fresh data is automatically fetched
- Cached data is updated in the background
- You'll see the most recent information

### Limitations

While offline, you cannot:
- Stream live video
- Take actions (delete, mark important)
- Receive new notifications

---

## Keyboard Shortcuts

For desktop users, ParcelGuard supports keyboard navigation:

| Key | Action |
|-----|--------|
| `1` | Go to Dashboard |
| `2` | Go to Live View |
| `3` | Go to Events |
| `4` | Go to Settings |
| `Esc` | Go back / Close modal |
| `/` | Focus search (when available) |

---

## Mobile App Installation

ParcelGuard is a Progressive Web App (PWA) that can be installed on your device.

### iOS (Safari)

1. Open ParcelGuard in Safari
2. Tap the Share button (box with arrow)
3. Scroll down and tap "Add to Home Screen"
4. Name it "ParcelGuard" and tap "Add"

### Android (Chrome)

1. Open ParcelGuard in Chrome
2. Tap the menu (three dots)
3. Tap "Install app" or "Add to Home Screen"
4. Confirm the installation

### Desktop (Chrome/Edge)

1. Look for the install icon in the address bar
2. Or use the menu: Install ParcelGuard

### Benefits of Installing

- Launch from your home screen like a native app
- Full screen experience (no browser UI)
- Faster loading with cached resources
- Works offline with cached data

---

## Tips & Best Practices

### Camera Placement
- Position cameras to cover entry points and package delivery areas
- Ensure adequate lighting for clear footage
- Avoid pointing cameras directly at bright lights

### Event Management
- Regularly mark false alarms to train your awareness
- Star important events so they're easy to find later
- Review and delete unnecessary events to save storage

### Storage
- Set retention days based on your storage capacity
- Use the cleanup function if storage gets full
- Important events are preserved during cleanup

### Security
- Use a strong, unique PIN
- Don't share your PIN or leave the app logged in on shared devices
- Log out when using shared computers

---

## Support

If you encounter issues:

1. Check the [Troubleshooting Guide](./TROUBLESHOOTING.md)
2. Verify your camera streams are accessible
3. Check system health in Settings
4. Review the server logs for errors

For hardware setup, see the [Setup Guide](../SETUP_GUIDE.md).
