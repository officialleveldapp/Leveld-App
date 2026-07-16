#!/usr/bin/env bash
#
# Local dev launcher for Leveld.
#
#   ./.start-dev.sh            # backend + admin panel + mobile Metro (default)
#   ./.start-dev.sh all        # same as above
#   ./.start-dev.sh backend    # Django API only            -> http://localhost:8000
#   ./.start-dev.sh admin      # backend + admin dashboard   -> http://localhost:5173
#   ./.start-dev.sh mobile     # Metro bundler only (app must already be installed)
#   ./.start-dev.sh ios        # build + install + launch the app on a simulator, then Metro
#
# Notes
#  - The admin dashboard needs the local Django API (port 8000), so it always
#    starts the backend too.
#  - The mobile app's API target lives in ./.env (EXPO_PUBLIC_API_URL). It is
#    currently pointed at the live https://api.leveldai.com/api, so Metro alone
#    is enough to test against production. Use `ios` for a fresh native install.
#  - LANG/LC_ALL are forced to UTF-8 to avoid the CocoaPods ASCII-8BIT crash.

set -uo pipefail

ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$ROOT"

export LANG=en_US.UTF-8
export LC_ALL=en_US.UTF-8
export EXPO_NO_TELEMETRY=1

# --- iOS build constants ----------------------------------------------------
IOS_WORKSPACE="ios/boltexponativewind.xcworkspace"
IOS_SCHEME="boltexponativewind"
IOS_BUNDLE_ID="com.rahbe.leveld"
IOS_APP="ios/build/Build/Products/Debug-iphonesimulator/${IOS_SCHEME}.app"

PIDS=()

log()  { printf '\033[1;36m[dev]\033[0m %s\n' "$*"; }
warn() { printf '\033[1;33m[dev]\033[0m %s\n' "$*"; }
err()  { printf '\033[1;31m[dev]\033[0m %s\n' "$*" >&2; }

cleanup() {
  echo
  log "Shutting down..."
  for pid in "${PIDS[@]:-}"; do
    [ -n "${pid:-}" ] && kill "$pid" 2>/dev/null
  done
  # Kill any child process groups too (Metro/Vite spawn workers).
  for pid in "${PIDS[@]:-}"; do
    [ -n "${pid:-}" ] && pkill -P "$pid" 2>/dev/null
  done
  wait 2>/dev/null
  exit 0
}
trap cleanup INT TERM

start_backend() {
  if [ ! -x backend/venv/bin/python ]; then
    err "backend/venv not found. Create it first:"
    err "  cd backend && python3 -m venv venv && venv/bin/pip install -r requirements.txt"
    return 1
  fi
  log "Starting Django API on http://localhost:8000 ..."
  ( cd backend && DEBUG=True venv/bin/python manage.py runserver 8000 ) &
  PIDS+=("$!")
}

start_admin() {
  if [ ! -d admin-dashboard/node_modules ]; then
    log "Installing admin dashboard deps..."
    ( cd admin-dashboard && npm install )
  fi
  log "Starting admin dashboard on http://localhost:5173  (login at /)"
  ( cd admin-dashboard && npm run dev ) &
  PIDS+=("$!")
}

start_metro() {
  log "Starting Metro bundler on http://localhost:8081 ..."
  ( npx expo start --port 8081 ) &
  PIDS+=("$!")
}

pick_simulator() {
  # Prefer an already-booted iPhone simulator, else boot the first available one.
  local id
  id="$(xcrun simctl list devices booted 2>/dev/null | grep -Eo '[0-9A-Fa-f-]{36}' | head -1)"
  if [ -z "$id" ]; then
    id="$(xcrun simctl list devices available 2>/dev/null | grep -E 'iPhone' | grep -Eo '[0-9A-Fa-f-]{36}' | head -1)"
    [ -z "$id" ] && { err "No iPhone simulator found."; return 1; }
    log "Booting simulator $id ..."
    xcrun simctl boot "$id" 2>/dev/null
  fi
  open -a Simulator 2>/dev/null
  echo "$id"
}

build_and_launch_ios() {
  local sim_id
  sim_id="$(pick_simulator)" || return 1
  log "Building $IOS_SCHEME for the simulator (first build takes several minutes)..."
  xcodebuild \
    -workspace "$IOS_WORKSPACE" \
    -scheme "$IOS_SCHEME" \
    -configuration Debug \
    -sdk iphonesimulator \
    -destination "id=$sim_id" \
    -derivedDataPath ios/build \
    CODE_SIGNING_ALLOWED=NO \
    build || { err "xcodebuild failed."; return 1; }

  if [ ! -d "$IOS_APP" ]; then
    err "Build product not found at $IOS_APP"; return 1
  fi
  log "Installing app on simulator..."
  xcrun simctl install "$sim_id" "$IOS_APP" || return 1
  log "Launching $IOS_BUNDLE_ID ..."
  xcrun simctl launch "$sim_id" "$IOS_BUNDLE_ID" 2>/dev/null || true
}

TARGET="${1:-all}"

case "$TARGET" in
  backend)
    start_backend || exit 1
    ;;
  admin)
    start_backend || exit 1
    start_admin
    ;;
  mobile|metro)
    start_metro
    ;;
  ios)
    start_metro          # start Metro first so the app connects on launch
    build_and_launch_ios || warn "iOS build/launch failed; Metro is still running."
    ;;
  all)
    start_backend || exit 1
    start_admin
    start_metro
    ;;
  *)
    err "Unknown target: $TARGET"
    err "Usage: ./.start-dev.sh [all|backend|admin|mobile|ios]"
    exit 1
    ;;
esac

log "Running. Press Ctrl+C to stop everything."
wait
