#!/bin/bash
# SwiftConnect Server Launcher

echo "=========================================="
echo "   SwiftConnect Server"
echo "=========================================="
echo ""

cd "$(dirname "$0")/server"

# Check if node_modules exists
if [ ! -d "node_modules" ]; then
    echo "Installing dependencies..."
    npm install
fi

# Check if dist exists
if [ ! -d "dist" ]; then
    echo "Building server..."
    npm run build
fi

echo "Starting server on http://localhost:3000"
echo ""
echo "Press Ctrl+C to stop"
echo ""

node dist/index.js
