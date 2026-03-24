if [[ "$RUN_LOGGED" == "1" ]]; then
  # Log only when running in kiosk/boot mode
  exec &> /home/pranish/ai-academia-bikeerg/boot.log
  echo "🚀 Boot launch started at $(date)"
else
  # No logging at all for manual runs
  echo "📦 Manual launch started at $(date) (no log file)"
fi

export DISPLAY=:0
cd /home/pranish/ai-academia-bikeerg

echo "🐍 Activating Python virtual environment..."
source venv/bin/activate

echo "🚀 Starting FastAPI backend..."
uvicorn src.api.main:app --host 0.0.0.0 --port 8080 --reload &

echo "🌐 Starting Vite frontend..."
cd frontend
npm run dev &

# Wait for frontend to be reachable
echo "⏳ Waiting for frontend to become available at http://localhost:5173 ..."
until curl -s http://localhost:5173 > /dev/null; do
  echo "… frontend not up yet, retrying..."
  sleep 1
done
echo "✅ Frontend is now reachable."

# If running under Openbox kiosk, let systemd launch Chromium so it can auto-restart.
if [[ "$SKIP_CHROMIUM" == "1" ]]; then
  echo "🖥️ SKIP_CHROMIUM=1 set → not launching browser here (systemd will do it)."
  exit 0
fi

echo "🖥️ Launching Chromium browser in kiosk mode..."
# Use a dedicated, clean profile so prompts don’t reappear
mkdir -p /home/pranish/.config/chromium-kiosk

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
  --user-data-dir=/home/pranish/.config/chromium-kiosk \
  >/dev/null 2>&1 &

