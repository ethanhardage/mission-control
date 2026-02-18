#!/bin/bash
# Mission Control Keep-Alive Daemon
# Keeps the server running forever

cd /data/.openclaw/workspace/mission-control

echo "🦞 Mission Control Keep-Alive Starting..."
echo "==========================================="
echo "Server will auto-restart if it crashes"
echo "Logs: /tmp/mission-control.log"
echo ""

while true; do
    echo "[$(date)] Starting server..."
    python3 -m http.server 8080 --bind 0.0.0.0
    echo "[$(date)] Server exited, restarting in 5 seconds..."
    sleep 5
done