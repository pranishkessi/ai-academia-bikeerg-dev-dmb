#!/usr/bin/env bash
set -u

PROJECT_DIR="/home/demonstrator/ai-academia-bikeerg-dev-dmb"
BOOT_LOG_DIR="$PROJECT_DIR/boot_log"
BOOT_LOG="$BOOT_LOG_DIR/boot.log"

if [[ "${RUN_LOGGED:-0}" == "1" ]]; then
  mkdir -p "$BOOT_LOG_DIR"

  # Log only when running in kiosk/boot mode
  exec &> "$BOOT_LOG"

  echo "Boot launch started at $(date)"
else
  # No logging at all for manual runs
  echo "Manual launch started at $(date) (no log file)"
fi

export DISPLAY=:0

cd "$PROJECT_DIR" || exit 1

echo "Activating Python virtual environment..."
source "$PROJECT_DIR/venv/bin/activate"

echo "Cleaning old backend/frontend processes if any..."

pkill -f "uvicorn src.api.main:app" 2>/dev/null || true
pkill -f "npm run dev" 2>/dev/null || true
pkill -f "vite" 2>/dev/null || true

sleep 2

echo "Starting FastAPI backend..."
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload &

BACKEND_PID=$!
echo "Backend PID: $BACKEND_PID"

echo "Starting Vite frontend..."
cd "$PROJECT_DIR/frontend" || exit 1
npm run dev &

FRONTEND_PID=$!
echo "Frontend PID: $FRONTEND_PID"

echo "Waiting for backend to become available at http://localhost:8080 ..."
until curl -s http://localhost:8080 > /dev/null; do
  echo "… backend not up yet, retrying..."
  sleep 1
done
echo "Backend is now reachable."

echo "Waiting for frontend to become available at http://localhost:5173 ..."
until curl -s http://localhost:5173 > /dev/null; do
  echo "… frontend not up yet, retrying..."
  sleep 1
done
echo "Frontend is now reachable."

if [[ "${SKIP_CHROMIUM:-0}" == "1" ]]; then
  echo "🖥️ SKIP_CHROMIUM=1 set → not launching browser here."
  echo "✅ Backend and frontend startup completed."
  echo "👀 Keeping service alive and monitoring backend/frontend..."

  cleanup() {
    echo "🛑 Stopping backend/frontend..."
    kill "$BACKEND_PID" "$FRONTEND_PID" 2>/dev/null || true
    pkill -f "uvicorn src.api.main:app" 2>/dev/null || true
    pkill -f "npm run dev" 2>/dev/null || true
    pkill -f "vite" 2>/dev/null || true
  }

  trap cleanup EXIT INT TERM

  while true; do
    if ! kill -0 "$BACKEND_PID" 2>/dev/null; then
      echo "❌ Backend process stopped unexpectedly."
      exit 1
    fi

    if ! kill -0 "$FRONTEND_PID" 2>/dev/null; then
      echo "❌ Frontend process stopped unexpectedly."
      exit 1
    fi

    sleep 5
  done
fi

echo "Launching Chromium browser in kiosk mode..."

mkdir -p /home/demonstrator/.config/chromium-kiosk

chromium \
  --kiosk "http://localhost:5173" \
  --no-first-run \
  --no-default-browser-check \
  --noerrdialogs \
  --disable-background-networking \
  --disable-component-update \
  --disable-default-apps \
  --disable-infobars \
  --disable-session-crashed-bubble \
  --disable-notifications \
  --disable-geolocation \
  --disable-pinch \
  --overscroll-history-navigation=0 \
  --password-store=basic \
  --autoplay-policy=no-user-gesture-required \
  --force-device-scale-factor=0.9 \
  --disable-features=Translate,PermissionQuietChip,QuieterPermission,NotificationTriggers,MediaRouter \
  --user-data-dir=/home/demonstrator/.config/chromium-kiosk \
  >/dev/null 2>&1 &