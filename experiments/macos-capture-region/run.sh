#!/usr/bin/env bash
# Local, temporary research harness. No installation or persistent service.
set -euo pipefail
if [[ "$(uname -s)" != "Darwin" ]]; then
  echo "This research test requires macOS." >&2
  exit 1
fi
REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"
SOURCE="$REPO_ROOT/experiments/macos-capture-region/CaptureRegionLab.m"
BIN_DIR="$REPO_ROOT/.secure-display-local/bin"
BIN="$BIN_DIR/secure-display-region-lab"
mkdir -p "$BIN_DIR"
if ! command -v clang >/dev/null 2>&1; then
  echo "Install Apple's Xcode Command Line Tools: xcode-select --install" >&2
  exit 1
fi
echo "Building local macOS window-region experiment..."
clang -x objective-c -std=gnu11 -fobjc-arc -mmacosx-version-min=13.0 \
  -framework Cocoa -framework WebKit -framework CoreGraphics \
  -framework ApplicationServices -ldl \
  "$SOURCE" -o "$BIN"
echo "Opening capture-region lab. Changes apply ONLY to the lab's own window."
exec "$BIN"
