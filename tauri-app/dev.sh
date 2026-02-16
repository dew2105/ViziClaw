#!/usr/bin/env bash

echo "========================================"
echo "  ViziClaw Desktop — Dev Launcher"
echo "========================================"
echo ""

# Navigate to the script's own directory (tauri-app/)
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"
cd "$SCRIPT_DIR"

# --- Kill stale processes ---

echo "Cleaning up stale processes..."

# Kill anything listening on port 1420 (Vite dev server)
lsof -ti:1420 | xargs kill -9 2>/dev/null || true

# Kill any running viziclaw-desktop processes
pkill -f viziclaw-desktop 2>/dev/null || true

# Kill any lingering tauri dev CLI processes
pkill -f "tauri dev" 2>/dev/null || true

# Brief pause to let ports fully release
sleep 1

# --- From here on, fail on errors ---
set -e

# Ensure npm dependencies are installed
if [ ! -d "node_modules" ]; then
  echo "node_modules not found — running npm install..."
  npm install
fi

# Launch Tauri dev (foreground so Ctrl+C kills everything)
echo "Starting tauri dev..."
echo ""
npm run tauri dev
