#!/bin/sh
# Exports the social graphics in social.html as PNGs into marketing/social/. Needs Google Chrome and internet (fonts).
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
shot() { "$CHROME" --headless=new --disable-gpu --hide-scrollbars --force-device-scale-factor=1 --virtual-time-budget=8000 \
  --window-size="$2" --screenshot="$PWD/social/$1.png" "file://$PWD/social.html#$1" 2>/dev/null; echo "social/$1.png"; }
for d in profile hl-events hl-how hl-reviews hl-december hl-contact; do shot $d 1080,1080; done
for d in carousel-1 carousel-2 carousel-3 carousel-4; do shot $d 1080,1350; done
shot story-december 1080,1920
