# ParcelGuard Troubleshooting Guide

This guide helps you diagnose and resolve common issues with ParcelGuard.

## Table of Contents

- [Login Issues](#login-issues)
- [Camera Issues](#camera-issues)
- [Video Playback Issues](#video-playback-issues)
- [Notification Issues](#notification-issues)
- [Performance Issues](#performance-issues)
- [Storage Issues](#storage-issues)
- [PWA / Installation Issues](#pwa--installation-issues)
- [Server Issues](#server-issues)

---

## Login Issues

### "Invalid PIN" Error

**Symptoms:** PIN is rejected even when entering correct digits

**Solutions:**
1. Verify you're entering the correct PIN (4-8 digits)
2. Check if Caps Lock is affecting number pad input
3. Clear browser cache and try again
4. If you've forgotten your PIN, contact the system administrator

### Session Expired

**Symptoms:** Suddenly logged out or redirected to login

**Solutions:**
1. Sessions expire after a period of inactivity
2. Simply log in again with your PIN
3. If this happens frequently, check server time synchronization

### Can't Log In After Browser Update

**Symptoms:** Login fails after browser update

**Solutions:**
1. Clear browser storage for the ParcelGuard site
2. Try incognito/private mode
3. Check if JavaScript is enabled

---

## Camera Issues

### Camera Shows "Offline"

**Symptoms:** Camera status shows red dot, no live feed

**Possible Causes:**
1. Camera is powered off or disconnected
2. Network connectivity issue between camera and hub
3. Camera stream URL is incorrect
4. Camera software crashed

**Solutions:**
1. Check camera power and network connections
2. Verify camera is accessible from the hub network
3. Try accessing the stream URL directly in VLC or similar
4. Restart the camera if necessary
5. Check and update the stream URL in Settings > Cameras

### Stream URL Test Fails

**Symptoms:** "Stream not accessible" when adding camera

**Solutions:**
1. Verify the URL format:
   - RTSP: `rtsp://camera-ip:8554/stream`
   - HLS: `http://camera-ip/stream.m3u8`
2. Check if the camera requires authentication (add to URL)
3. Ensure the camera is on the same network as the hub
4. Check firewall rules aren't blocking the connection

### Camera Stream Keeps Reconnecting

**Symptoms:** Stream frequently disconnects and reconnects

**Possible Causes:**
1. Network instability
2. Camera overheating
3. Insufficient bandwidth

**Solutions:**
1. Check network quality between camera and hub
2. Ensure camera has adequate ventilation
3. Reduce stream quality/resolution if bandwidth limited
4. Check for network interference

### Black Screen on Live View

**Symptoms:** Camera shows online but video is black

**Solutions:**
1. Wait a few seconds for stream to initialize
2. Refresh the page
3. Check if camera lens is covered or in darkness
4. Verify camera IR/night vision is working

---

## Video Playback Issues

### Event Video Won't Play

**Symptoms:** Video fails to load or shows error

**Possible Causes:**
1. Video file corrupted
2. Video codec not supported
3. File was deleted from storage

**Solutions:**
1. Try downloading the video and playing locally
2. Check if thumbnail displays (indicates file exists)
3. Verify storage hasn't been cleaned up

### Video Playback is Choppy

**Symptoms:** Video stutters or buffers frequently

**Solutions:**
1. Check your internet connection
2. Try reducing playback speed
3. Wait for video to buffer before playing
4. Close other bandwidth-intensive applications

### Can't Download Event Video

**Symptoms:** Download button doesn't work or download fails

**Solutions:**
1. Check browser download settings
2. Try right-clicking the video and "Save as"
3. Verify sufficient disk space for download
4. Check browser popup blocker settings

---

## Notification Issues

### Not Receiving Notifications

**Symptoms:** Events occur but no notifications arrive

**Checklist:**
1. Notifications enabled in ParcelGuard settings?
2. ntfy app installed and subscribed to correct topic?
3. ntfy app notifications enabled in phone settings?
4. Quiet hours active?
5. Cooldown period active?
6. Per-camera notifications enabled for that camera?

**Solutions:**
1. Send a test notification from Settings > Notifications
2. Check ntfy app topic matches server NTFY_TOPIC
3. Verify ntfy app has notification permissions
4. Check phone isn't in Do Not Disturb mode

### Test Notification Works But Real Ones Don't

**Symptoms:** Test works but motion events don't trigger notifications

**Possible Causes:**
1. Cooldown period preventing rapid notifications
2. Camera-specific notifications disabled
3. Quiet hours active

**Solutions:**
1. Check cooldown setting (reduce if needed)
2. Enable notifications for the specific camera
3. Check quiet hours schedule

### Notifications Arrive Late

**Symptoms:** Notifications delayed by minutes

**Possible Causes:**
1. Battery optimization killing ntfy app
2. Poor network connectivity
3. ntfy server issues

**Solutions:**
1. Disable battery optimization for ntfy app
2. Check network connectivity
3. If self-hosting ntfy, check server logs

---

## Performance Issues

### App is Slow to Load

**Symptoms:** Long loading time on initial visit

**Solutions:**
1. Clear browser cache
2. Check internet connection speed
3. Install as PWA for faster subsequent loads
4. Reduce number of cameras if bandwidth limited

### Scrolling is Laggy on Events Page

**Symptoms:** Events list scrolls slowly with many items

**Solutions:**
1. This is normal for very large lists (100+ items)
2. Use filters to reduce displayed items
3. Virtual scrolling kicks in automatically at 50+ items
4. Consider deleting old events

### High CPU/Memory Usage

**Symptoms:** Browser or device running hot, fans spinning

**Possible Causes:**
1. Multiple live streams active
2. Many browser tabs open
3. Device underpowered

**Solutions:**
1. View fewer cameras simultaneously
2. Close unused browser tabs
3. Use a more powerful device

---

## Storage Issues

### "Storage Full" Warning

**Symptoms:** Warning about storage capacity

**Immediate Actions:**
1. Go to Settings > Storage
2. Click "Run Cleanup" to delete old events
3. Reduce retention period

**Long-Term Solutions:**
1. Add more storage to the hub
2. Reduce motion sensitivity to capture fewer events
3. Set shorter retention period

### Events Disappearing

**Symptoms:** Older events no longer visible

**Explanation:**
- Events older than the retention period are automatically deleted
- Important events are preserved during cleanup

**Solutions:**
1. Mark important events to prevent deletion
2. Increase retention period if storage allows
3. Download important videos before they're deleted

### Cleanup Takes Too Long

**Symptoms:** Cleanup operation runs for extended time

**Solutions:**
1. This is normal with thousands of events
2. Run cleanup during off-peak hours
3. Consider more aggressive retention settings

---

## PWA / Installation Issues

### Can't Install as App

**Symptoms:** No install option appears

**Possible Causes:**
1. Already installed
2. Browser doesn't support PWA
3. Not served over HTTPS

**Solutions:**
1. Check if ParcelGuard is already on home screen
2. Use Chrome, Edge, or Safari
3. Ensure accessing via HTTPS

### PWA Won't Open

**Symptoms:** App crashes or shows blank screen

**Solutions:**
1. Clear app data/cache
2. Uninstall and reinstall
3. Check for browser updates

### Offline Mode Not Working

**Symptoms:** App doesn't work when offline

**Possible Causes:**
1. Service worker not registered
2. Cache not populated

**Solutions:**
1. Visit the app while online first
2. Navigate to different pages to populate cache
3. Check if service worker is registered (DevTools > Application)

---

## Server Issues

### API Connection Failed

**Symptoms:** "Failed to load" errors throughout app

**Possible Causes:**
1. API server not running
2. Network issue between client and server
3. Server crashed

**Solutions:**
1. Check if API server is running
2. Verify network connectivity
3. Check server logs for errors
4. Restart API server if necessary

### Database Errors

**Symptoms:** Errors mentioning "database" or "sqlite"

**Possible Causes:**
1. Database file corrupted
2. Disk full
3. File permissions issue

**Solutions:**
1. Check disk space on server
2. Verify database file permissions
3. Restore from backup if corrupted

### High Server Load

**Symptoms:** Slow responses, timeouts

**Possible Causes:**
1. Too many concurrent streams
2. Storage disk slow
3. Server underpowered

**Solutions:**
1. Reduce number of active cameras
2. Upgrade to SSD storage
3. Consider more powerful hardware

---

## Getting More Help

If these solutions don't resolve your issue:

1. **Check Logs:** Server logs often contain detailed error information
2. **Check System Health:** Settings > System Health shows key metrics
3. **Browser DevTools:** Network and Console tabs show client-side errors
4. **Community:** Search or ask in project discussions

### Information to Collect

When reporting issues, include:
- ParcelGuard version (shown in Settings)
- Browser and version
- Device type (desktop/mobile, OS)
- Steps to reproduce the issue
- Any error messages
- Server logs (if accessible)
