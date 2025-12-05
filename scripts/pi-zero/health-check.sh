#!/bin/bash
# ParcelGuard Camera Health Check Script
# Sends periodic health updates to the hub API

# Configuration - set these for your environment
HUB_URL="${HUB_URL:-http://ParcelGuard.local:3000}"
CAMERA_ID="${CAMERA_ID:-}"
INTERVAL="${INTERVAL:-30}"

# Validate camera ID is set
if [ -z "$CAMERA_ID" ]; then
    echo "Error: CAMERA_ID environment variable must be set"
    exit 1
fi

echo "Starting health check for camera: $CAMERA_ID"
echo "Hub URL: $HUB_URL"
echo "Interval: ${INTERVAL}s"

while true; do
    # Get CPU temperature (millidegrees to degrees)
    TEMP_RAW=$(cat /sys/class/thermal/thermal_zone0/temp 2>/dev/null || echo "0")
    TEMP=$(echo "scale=1; $TEMP_RAW / 1000" | bc)

    # Get uptime
    UPTIME=$(uptime -p 2>/dev/null | sed 's/up //' || echo "unknown")

    # Get IP address
    IP=$(hostname -I 2>/dev/null | awk '{print $1}' || echo "unknown")

    # Send health check to hub
    RESPONSE=$(curl -s -X POST \
        -H "Content-Type: application/json" \
        -d "{\"temperature\": $TEMP, \"uptime\": \"$UPTIME\", \"ip\": \"$IP\"}" \
        "$HUB_URL/api/cameras/$CAMERA_ID/health" 2>&1)

    if [ $? -eq 0 ]; then
        echo "[$(date '+%H:%M:%S')] Health check sent - Temp: ${TEMP}°C, IP: $IP"
    else
        echo "[$(date '+%H:%M:%S')] Health check failed: $RESPONSE"
    fi

    sleep "$INTERVAL"
done
