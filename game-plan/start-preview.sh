#!/bin/sh
set -eu

cd "$(dirname "$0")"

url="http://127.0.0.1:8765/tool/preview.html"
python3 tools/serve_sprite_gallery.py &
server_pid=$!

cleanup() {
  kill "$server_pid" 2>/dev/null || true
}
trap cleanup EXIT INT TERM

sleep 1
open "$url"
wait "$server_pid"
