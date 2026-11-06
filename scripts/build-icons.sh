#!/usr/bin/env bash
# Regenerate app icons from assets/source/logo.jpg with Inkscape.
# The black background is keyed to transparency by brightness; iOS gets an
# opaque icon because App Store icons can't contain transparent pixels.
set -euo pipefail
cd "$(git rev-parse --show-toplevel)"

INKSCAPE=${INKSCAPE:-$(command -v inkscape || echo "$HOME/Applications/Inkscape.app/Contents/MacOS/inkscape")}
SRC="$PWD/assets/source/logo.jpg"
SIZE=1408 # source is square
TMP=$(mktemp -d)
trap 'rm -rf "$TMP"' EXIT

# $1 name, $2 scale of logo within the canvas, $3 "keyed" or "opaque"
svg() {
  local offset filter="" bg=""
  offset=$(awk "BEGIN { print $SIZE * (1 - $2) / 2 }")
  if [[ $3 == keyed ]]; then
    filter='filter="url(#key)"'
  else
    bg="<rect width=\"$SIZE\" height=\"$SIZE\" fill=\"#000\"/>"
  fi
  cat > "$TMP/$1.svg" <<SVG
<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink"
     width="$SIZE" height="$SIZE" viewBox="0 0 $SIZE $SIZE">
  <defs>
    <!-- alpha = 3*(r+g+b) - 0.45: black and JPEG noise vanish, colors stay opaque -->
    <filter id="key" color-interpolation-filters="sRGB" x="0" y="0" width="1" height="1">
      <feColorMatrix type="matrix" values="1 0 0 0 0  0 1 0 0 0  0 0 1 0 0  3 3 3 0 -0.45"/>
    </filter>
  </defs>
  $bg
  <g transform="translate($offset $offset) scale($2)">
    <image xlink:href="file://$SRC" width="$SIZE" height="$SIZE" $filter/>
  </g>
</svg>
SVG
  local mode=RGBA_8
  [[ $3 == opaque ]] && mode=RGB_8
  "$INKSCAPE" "$TMP/$1.svg" --export-type=png --export-width=1024 --export-png-color-mode=$mode \
    --export-filename="assets/$1.png" 2>/dev/null
  echo "assets/$1.png"
}

svg icon 1 opaque            # iOS + fallback icon
svg logo 1 keyed             # transparent logo for splash and in-app use
svg adaptive-icon 0.68 keyed # Android foreground, shrunk into the adaptive-icon safe zone
