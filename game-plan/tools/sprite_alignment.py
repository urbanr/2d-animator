#!/usr/bin/env python3
"""Store reversible per-frame sprite placement corrections."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


FRAME_COUNT = 8
MAX_ABS_OFFSET = 2048


def empty_offsets(frame_count: int = FRAME_COUNT) -> list[dict[str, int]]:
    return [{"x": 0, "y": 0} for _ in range(frame_count)]


def normalize_frame_order(value: object, frame_count: int = FRAME_COUNT) -> list[int]:
    if value is None:
        return list(range(1, frame_count + 1))
    if (
        not isinstance(value, list)
        or len(value) != frame_count
        or any(type(index) is not int for index in value)
        or sorted(value) != list(range(1, frame_count + 1))
    ):
        raise ValueError(f"frame order must contain each number 1 through {frame_count} once")
    return list(value)


def get_frame_order(path: Path, key: str, default: object = None) -> list[int]:
    record = read_alignment_store(path)["animations"].get(key, {})
    return normalize_frame_order(record.get("frame_order", default))


def validate_alignment_key(key: object) -> str:
    if not isinstance(key, str) or not key.strip():
        raise ValueError("alignment key must be a non-empty string")
    if len(key) > 512 or any(ord(character) < 32 for character in key):
        raise ValueError("alignment key is too long or contains control characters")
    return key


def normalize_offsets(value: object, frame_count: int = FRAME_COUNT) -> list[dict[str, int]]:
    if value is None:
        return empty_offsets(frame_count)
    if not isinstance(value, list) or len(value) != frame_count:
        raise ValueError(f"frame offsets must contain exactly {frame_count} records")
    normalized: list[dict[str, int]] = []
    for index, record in enumerate(value):
        if not isinstance(record, dict) or set(record) != {"x", "y"}:
            raise ValueError(f"frame offset {index + 1} must contain only x and y")
        x, y = record["x"], record["y"]
        if isinstance(x, bool) or isinstance(y, bool) or not isinstance(x, int) or not isinstance(y, int):
            raise ValueError(f"frame offset {index + 1} must use integer pixels")
        if abs(x) > MAX_ABS_OFFSET or abs(y) > MAX_ABS_OFFSET:
            raise ValueError(f"frame offset {index + 1} exceeds the safety limit")
        normalized.append({"x": x, "y": y})
    return normalized


def read_alignment_store(path: Path) -> dict[str, object]:
    if not path.exists():
        return {
            "schema_version": 1,
            "units": "frame-pixels",
            "animations": {},
        }
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict) or value.get("schema_version") != 1:
        raise ValueError(f"{path}: unsupported alignment document")
    animations = value.get("animations")
    if not isinstance(animations, dict):
        raise ValueError(f"{path}: animations must be an object")
    return value


def write_alignment_store(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def get_frame_offsets(path: Path, key: str, frame_count: int = FRAME_COUNT) -> list[dict[str, int]]:
    store = read_alignment_store(path)
    animations = store["animations"]
    assert isinstance(animations, dict)
    record = animations.get(key)
    if record is None:
        return empty_offsets(frame_count)
    if not isinstance(record, dict):
        raise ValueError(f"{path}: invalid alignment record for {key}")
    return normalize_offsets(record.get("frames"), frame_count)


def set_frame_offsets(path: Path, key: object, offsets: object, order: object = None) -> list[dict[str, int]]:
    clean_key = validate_alignment_key(key)
    normalized = normalize_offsets(offsets)
    normalized_order = normalize_frame_order(order) if order is not None else None
    store = read_alignment_store(path)
    animations = store["animations"]
    assert isinstance(animations, dict)
    existing = animations.get(clean_key)
    record = dict(existing) if isinstance(existing, dict) else {}
    record["frames"] = normalized
    if normalized_order is not None:
        record["frame_order"] = normalized_order
    record["updated_at"] = datetime.now(timezone.utc).isoformat()
    animations[clean_key] = record
    write_alignment_store(path, store)
    return normalized


def build_browser_data(store_path: Path, output_path: Path) -> dict[str, list[dict[str, int]]]:
    store = read_alignment_store(store_path)
    animations = store["animations"]
    assert isinstance(animations, dict)
    browser: dict[str, list[dict[str, int]]] = {}
    orders: dict[str, list[int]] = {}
    for key, record in animations.items():
        if not isinstance(record, dict):
            raise ValueError(f"{store_path}: invalid alignment record for {key}")
        browser[str(key)] = normalize_offsets(record.get("frames"))
        if "frame_order" in record:
            orders[str(key)] = normalize_frame_order(record["frame_order"])
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(
        "window.SPRITE_FRAME_OFFSETS = "
        + json.dumps(browser, ensure_ascii=False, indent=2)
        + ";\nwindow.SPRITE_FRAME_ORDERS = "
        + json.dumps(orders, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    temporary.replace(output_path)
    return browser


def catalog_alignment_key(character_id: str, variant_id: str) -> str:
    return f"{character_id}/{variant_id}"
