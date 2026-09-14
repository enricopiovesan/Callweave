#!/bin/sh
set -eu

root=$(CDPATH= cd -- "$(dirname -- "$0")/.." && pwd)
app_root="$root/apps/CallweaveMac"
build_root="$app_root/.build/debug"
app="$app_root/.build/Callweave.app"

swift build --package-path "$app_root"
rm -rf "$app"
mkdir -p "$app/Contents/MacOS"
cp "$build_root/CallweaveMac" "$app/Contents/MacOS/CallweaveMac"
cp "$app_root/Info.plist" "$app/Contents/Info.plist"
codesign --force --sign - "$app"
open "$app"
