#!/usr/bin/env bash
# Build square App Icon set from assets/images/logo.png (any aspect ratio).
# Uses black letterboxing to match the logo artwork.
#
# IMPORTANT: `app.json` → `expo.icon` does NOT update checked-in iOS assets. The home-screen
# icon comes from ios/.../AppIcon.appiconset. Re-run this script after changing logo.png,
# then rebuild the app (delete the app from the device/simulator if the icon looks cached).
set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${ROOT}/assets/images/logo.png"
OUT="${ROOT}/ios/boltexponativewind/Images.xcassets/AppIcon.appiconset"
MASTER="${OUT}/App-Icon-1024x1024@1x.png"

if [[ ! -f "$SRC" ]]; then
  echo "Missing $SRC"
  exit 1
fi

mkdir -p "$OUT"

# Fit inside 1024 box, then pad to 1024×1024 (Apple requires square icons).
TMP="${OUT}/._icon-temp-scaled.png"
sips -Z 1024 "$SRC" --out "$TMP" >/dev/null
sips -p 1024 1024 --padColor 000000 "$TMP" --out "$MASTER" >/dev/null
rm -f "$TMP"

# Ensure App Store icon has no transparency (avoids validation issues).
sips -s format png "$MASTER" --deleteColorManagementProperties "$MASTER" -o "$MASTER" >/dev/null 2>&1 || true

sizes=(20 29 40 58 60 76 80 87 120 152 167 180)
for px in "${sizes[@]}"; do
  sips -z "$px" "$px" "$MASTER" --out "${OUT}/icon-${px}.png" >/dev/null
done

echo "Wrote App Icon set from $SRC → $OUT (master $MASTER)"
