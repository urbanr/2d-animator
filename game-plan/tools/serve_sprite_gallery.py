#!/usr/bin/env python3
"""Serve the local sprite gallery and persist per-frame placement edits."""

from __future__ import annotations

import argparse
import json
import sys
from functools import partial
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from threading import Lock
from urllib.parse import urlparse

from sprite_alignment import set_frame_offsets
from level_walk_line import set_walk_line
from build_level_gallery import build_level_data
from pose_library import save_pose, STORE as POSE_STORE
from cutout_characters import save_character, ROOT as CHARACTER_ROOT
from catalog_trash import change_trash
from sprite_variants import (
    DEFAULT_CATALOG,
    DEFAULT_GALLERY_DATA,
    DEFAULT_GAME_DATA,
    GAME_PLAN_ROOT,
    alignment_path_for,
    build_gallery_data,
    build_game_data,
)


MAX_REQUEST_BYTES = 128 * 1024
SAVE_LOCK = Lock()


class QuietThreadingHTTPServer(ThreadingHTTPServer):
    def handle_error(self, request: object, client_address: object) -> None:
        error = sys.exc_info()[1]
        if isinstance(error, (BrokenPipeError, ConnectionResetError)):
            return
        super().handle_error(request, client_address)


class SpriteGalleryHandler(SimpleHTTPRequestHandler):
    def log_message(self, format: str, *args: object) -> None:
        # Animated galleries request many local frames; keep the terminal quiet.
        return

    def end_headers(self) -> None:
        self.send_header("Cache-Control", "no-store")
        super().end_headers()

    def _json_response(self, status: int, payload: dict[str, object]) -> None:
        body = json.dumps(payload, ensure_ascii=False).encode("utf-8")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.end_headers()
        self.wfile.write(body)

    def do_POST(self) -> None:  # noqa: N802 - inherited HTTP API name
        endpoint = urlparse(self.path).path
        if endpoint not in ("/api/frame-offsets", "/api/level-walk-line", "/api/poses", "/api/game-characters"):
            self._json_response(404, {"ok": False, "error": "Neznámá adresa."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length <= 0 or length > MAX_REQUEST_BYTES:
                raise ValueError("Neplatná velikost požadavku.")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ValueError("Požadavek musí být objekt JSON.")
            with SAVE_LOCK:
                if endpoint == "/api/game-characters":
                    if payload.get('mode') in ('delete', 'restore'):
                        result = change_trash(payload, CHARACTER_ROOT/'game-characters.json', {'characters'})
                        self._json_response(200, {"ok": True, **result})
                        return
                    record = save_character(payload)
                    self._json_response(200, {"ok": True, "record": record})
                    return
                if endpoint == "/api/poses":
                    if payload.get('mode') in ('delete', 'restore'):
                        result = change_trash(payload, POSE_STORE, {'clips', 'finished_animations', 'poses', 'rigs'})
                        self._json_response(200, {"ok": True, **result})
                        return
                    result = save_pose(payload)
                    self._json_response(200, {"ok": True, **result})
                    return
                if endpoint == "/api/level-walk-line":
                    line = set_walk_line(payload.get("level"), payload.get("variant"), payload.get("y"))
                    build_level_data()
                    self._json_response(200, {"ok": True, "walkLine": line})
                    return
                normalized = set_frame_offsets(
                    alignment_path_for(DEFAULT_CATALOG),
                    payload.get("alignmentKey"),
                    payload.get("frames"),
                    payload.get("order"),
                )
                build_gallery_data(DEFAULT_CATALOG, DEFAULT_GALLERY_DATA)
                build_game_data(DEFAULT_CATALOG, DEFAULT_GAME_DATA)
        except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
            self._json_response(400, {"ok": False, "error": str(error)})
            return
        self._json_response(200, {"ok": True, "frames": normalized, "order": payload.get("order")})


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--host", default="127.0.0.1")
    parser.add_argument("--port", type=int, default=8765)
    return parser


def main() -> int:
    args = build_parser().parse_args()
    handler = partial(SpriteGalleryHandler, directory=str(Path(GAME_PLAN_ROOT)))
    server = QuietThreadingHTTPServer((args.host, args.port), handler)
    print(f"Sprite editor: http://{args.host}:{args.port}/tool/gallery.html", flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        server.server_close()
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
