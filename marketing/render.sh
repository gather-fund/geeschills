#!/bin/sh
# Exports print-ready PDFs (with 3 mm bleed) into marketing/print/. Needs Google Chrome and internet (fonts + QR library).
set -e
cd "$(dirname "$0")"
CHROME="/Applications/Google Chrome.app/Contents/MacOS/Google Chrome"
for f in flier business-card cooler-sticker; do
  "$CHROME" --headless=new --disable-gpu --no-pdf-header-footer --virtual-time-budget=8000 \
    --print-to-pdf="$PWD/print/gees-chills-$f.pdf" "file://$PWD/$f.html" 2>/dev/null
  echo "print/gees-chills-$f.pdf"
done
