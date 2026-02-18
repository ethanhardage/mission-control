#!/bin/bash
# Croati Mission Control - Launch Script
# Starts a simple HTTP server for the dashboard

DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PORT="${1:-8080}"

echo "🦞 Croati Mission Control"
echo "========================"
echo ""
echo "Starting server on port $PORT..."
echo ""
echo "Dashboard URL: http://localhost:$PORT"
echo "API Endpoint:  http://localhost:$PORT/api/status.json"
echo ""

# Check if Python is available
if command -v python3 &> /dev/null; then
    echo "Using Python 3 HTTP server..."
    cd "$DIR" && python3 -m http.server $PORT
elif command -v python &> /dev/null; then
    echo "Using Python 2 HTTP server..."
    cd "$DIR" && python -m SimpleHTTPServer $PORT
elif command -v node &> /dev/null; then
    echo "Using Node.js HTTP server..."
    cd "$DIR" && npx -y http-server -p $PORT
else
    echo "❌ Error: No suitable server found."
    echo "Please install Python or Node.js."
    exit 1
fi