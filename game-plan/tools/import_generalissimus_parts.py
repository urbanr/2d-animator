#!/usr/bin/env python3
"""Split the approved Generalissimus 4x4 atlas without resampling its art."""

from __future__ import annotations

import argparse
import json
import shutil
from pathlib import Path

from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png
from import_sprite_sheet import remove_connected_gray_background, sha256, visible_bounds


GAME_PLAN_ROOT = Path(__file__).resolve().parents[1]
DEFAULT_TARGET = (
    GAME_PLAN_ROOT
    / "graphics"
    / "bitmapove-predlohy"
    / "soudruh-generalissimus-v1"
)

# Column boundaries follow the even 4x4 layout. Row boundaries are authored
# around the actual gutters because the generated first and third rows are a
# few pixels taller. Pixels are only sliced; they are never resampled.
PARTS = [
    ("head", "Hlava a krk", [0, 0, 314, 320]),
    ("torso", "Trup", [314, 0, 313, 320]),
    ("pelvis", "Pánev", [627, 0, 314, 320]),
    ("megaphone", "Amplion", [941, 0, 313, 320]),
    ("nearUpperArm", "Bližší nadloktí", [0, 320, 314, 307]),
    ("nearForearm", "Bližší předloktí a ruka", [314, 320, 313, 307]),
    ("farUpperArm", "Vzdálenější nadloktí", [627, 320, 314, 307]),
    ("farForearm", "Vzdálenější předloktí a ruka", [941, 320, 313, 307]),
    ("nearThigh", "Bližší stehno", [0, 627, 314, 320]),
    ("nearShin", "Bližší lýtko", [314, 627, 313, 320]),
    ("farThigh", "Vzdálenější stehno", [627, 627, 314, 320]),
    ("farShin", "Vzdálenější lýtko", [941, 627, 313, 320]),
    ("nearFoot", "Bližší bota", [0, 947, 314, 307]),
    ("farFoot", "Vzdálenější bota", [314, 947, 313, 307]),
]


def extract(image: RgbaImage, rect: list[int]) -> RgbaImage:
    x, y, width, height = rect
    rows = []
    for row in range(height):
        start = ((y + row) * image.width + x) * 4
        rows.append(image.pixels[start : start + width * 4])
    return RgbaImage(width, height, b"".join(rows))


def padded_crop(bounds: tuple[int, int, int, int], width: int, height: int) -> list[int]:
    left, top, right, bottom = bounds
    x = max(0, left - 3)
    y = max(0, top - 3)
    crop_right = min(width - 1, right + 3)
    crop_bottom = min(height - 1, bottom + 3)
    return [x, y, crop_right - x + 1, crop_bottom - y + 1]


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("source", type=Path)
    parser.add_argument("--target", type=Path, default=DEFAULT_TARGET)
    args = parser.parse_args()

    target = args.target.resolve()
    source_dir = target / "source"
    parts_dir = target / "parts"
    source_dir.mkdir(parents=True, exist_ok=True)
    parts_dir.mkdir(parents=True, exist_ok=True)

    stored_source = source_dir / "parts-atlas.png"
    manifest_path = target / "parts.json"
    import_path = source_dir / "import-v1.json"
    occupied = [manifest_path, import_path]
    occupied.extend(parts_dir / f"{key}.png" for key, _, _ in PARTS)
    existing = [path for path in occupied if path.exists()]
    if existing:
        raise ValueError("Refusing to overwrite: " + ", ".join(map(str, existing)))

    sheet = read_rgba_png(args.source)
    if (sheet.width, sheet.height) != (1254, 1254):
        raise ValueError("Expected a 1254x1254 atlas")
    if any(alpha < 255 for alpha in sheet.pixels[3::4]):
        raise ValueError("Expected the selected opaque gray-background atlas")

    if stored_source.exists():
        if sha256(stored_source) != sha256(args.source):
            raise ValueError(f"Different source already stored at {stored_source}")
    else:
        shutil.copy2(args.source, stored_source)
    result: dict[str, object] = {
        "schema_version": 1,
        "id": "soudruh-generalissimus-v1",
        "name": "Soudruh Generalissimus · bitmapové díly v1",
        "status": "parts-only-not-registered",
        "facing": "left",
        "source": "source/parts-atlas.png",
        "source_size": [sheet.width, sheet.height],
        "source_sha256": sha256(stored_source),
        "background_removal": "boundary-connected-neutral-gray-v1",
        "resampled": False,
        "order": [key for key, _, _ in PARTS],
        "parts": {},
    }
    pending_parts = []

    for key, label, cell_rect in PARTS:
        cell = extract(sheet, cell_rect)
        clean, removed = remove_connected_gray_background(cell)
        bounds = visible_bounds(clean)
        if not bounds:
            raise ValueError(f"Empty part: {key}")
        left, top, right, bottom = bounds
        margins = {
            "left": left,
            "top": top,
            "right": cell.width - 1 - right,
            "bottom": cell.height - 1 - bottom,
        }
        if min(margins.values()) < 2:
            raise ValueError(f"Part crosses its authored cell: {key}: {margins}")
        crop = padded_crop(bounds, cell.width, cell.height)
        part = extract(clean, crop)
        global_rect = [
            cell_rect[0] + crop[0],
            cell_rect[1] + crop[1],
            crop[2],
            crop[3],
        ]
        pending_parts.append({
            "key": key,
            "label": label,
            "part": part,
            "source_cell": cell_rect,
            "source_rect": global_rect,
            "removed_background_pixels": removed,
            "cell_margins": margins,
        })

    import_parts = []
    for pending in pending_parts:
        key = pending["key"]
        part = pending.pop("part")
        output = parts_dir / f"{key}.png"
        write_rgba_png(output, part)
        part_record = {
            "label": pending["label"],
            "file": f"parts/{key}.png",
            "size": [part.width, part.height],
            "source_cell": pending["source_cell"],
            "source_rect": pending["source_rect"],
            "sha256": sha256(output),
        }
        result["parts"][key] = part_record
        import_parts.append(
            {
                "key": key,
                "removed_background_pixels": pending["removed_background_pixels"],
                "cell_margins": pending["cell_margins"],
                **part_record,
            }
        )

    manifest_path.write_text(
        json.dumps(result, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    import_path.write_text(
        json.dumps(
            {
                "schema_version": 1,
                "source_sha256": result["source_sha256"],
                "source_size": result["source_size"],
                "background_removal": result["background_removal"],
                "resampled": False,
                "parts": import_parts,
            },
            ensure_ascii=False,
            indent=2,
        )
        + "\n",
        encoding="utf-8",
    )
    print(f"Imported {len(PARTS)} parts into {target}")


if __name__ == "__main__":
    main()
