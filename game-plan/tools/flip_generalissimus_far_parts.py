#!/usr/bin/env python3
"""Flip selected Generalissimus far-side parts and all dependent metadata."""

from __future__ import annotations

import json
from pathlib import Path

from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png
from import_sprite_sheet import sha256


ROOT = (
    Path(__file__).resolve().parents[1]
    / "graphics"
    / "bitmapove-predlohy"
    / "soudruh-generalissimus-v1"
)
TARGETS = ("farUpperArm", "farThigh", "farShin")
TRANSFORM = "horizontal-flip-around-vertical-axis"


def flip_horizontal(image: RgbaImage) -> RgbaImage:
    rows = []
    for y in range(image.height):
        start = y * image.width * 4
        row = image.pixels[start : start + image.width * 4]
        rows.append(
            b"".join(
                row[x * 4 : x * 4 + 4] for x in range(image.width - 1, -1, -1)
            )
        )
    return RgbaImage(image.width, image.height, b"".join(rows))


def write_json(path: Path, value: dict) -> None:
    path.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )


def main() -> None:
    parts_path = ROOT / "parts.json"
    skin_path = ROOT / "skin.json"
    import_path = ROOT / "source" / "import-v1.json"
    parts = json.loads(parts_path.read_text(encoding="utf-8"))
    skin = json.loads(skin_path.read_text(encoding="utf-8")) if skin_path.exists() else None
    imported = json.loads(import_path.read_text(encoding="utf-8"))
    imported_by_key = {part["key"]: part for part in imported["parts"]}

    already_flipped = [
        key for key in TARGETS if parts["parts"][key].get("bitmap_transform") == TRANSFORM
    ]
    if already_flipped:
        raise ValueError("Refusing to flip twice: " + ", ".join(already_flipped))

    for key in TARGETS:
        record = parts["parts"][key]
        image_path = ROOT / record["file"]
        image = read_rgba_png(image_path)
        write_rgba_png(image_path, flip_horizontal(image))
        digest = sha256(image_path)

        record["sha256"] = digest
        record["bitmap_transform"] = TRANSFORM
        imported_by_key[key]["sha256"] = digest
        imported_by_key[key]["bitmap_transform"] = TRANSFORM

        if skin is not None:
            skin_part = skin["parts"][key]
            width = skin_part["size"][0]
            skin_part["start"][0] = width - skin_part["start"][0]
            skin_part["end"][0] = width - skin_part["end"][0]
            skin_part["sha256"] = digest
            skin_part["bitmap_transform"] = TRANSFORM

    transform_record = {"operation": TRANSFORM, "parts": list(TARGETS)}
    parts["postprocess"] = transform_record
    imported["postprocess"] = transform_record
    write_json(parts_path, parts)
    write_json(import_path, imported)
    if skin is not None:
        skin["postprocess"] = transform_record
        write_json(skin_path, skin)

    print("Flipped Generalissimus parts: " + ", ".join(TARGETS))


if __name__ == "__main__":
    main()
