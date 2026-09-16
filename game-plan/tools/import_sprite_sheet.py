#!/usr/bin/env python3
"""Import one generated 4x2 sprite sheet into the project asset catalog."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from collections import deque
from datetime import datetime, timezone
from pathlib import Path

from downscale_sprites import MATTE_RGB, RgbaImage, read_rgba_png, write_rgba_png


TOOLS_ROOT = Path(__file__).resolve().parent
GAME_PLAN_ROOT = TOOLS_ROOT.parent
DEFAULT_CATALOG = GAME_PLAN_ROOT / "graphics" / "bitmapove-sekvence" / "sprite-variants.json"
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SHEET_SIZE = (1536, 1024)
CELL_SIZE = (384, 512)
FRAME_SIZE = (384, 480)
DEFAULT_SAFE_MARGIN = 16


def sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as handle:
        for block in iter(lambda: handle.read(1024 * 1024), b""):
            digest.update(block)
    return digest.hexdigest()


def crop_cell(
    sheet: RgbaImage, column: int, row: int,
    cell_size: tuple[int, int] = CELL_SIZE,
    frame_crop: tuple[int, int, int, int] = (0, 0, *FRAME_SIZE),
) -> RgbaImage:
    cell_width, cell_height = cell_size
    crop_x, crop_y, frame_width, frame_height = frame_crop
    if min(crop_x, crop_y) < 0 or min(frame_width, frame_height) <= 0:
        raise ValueError("invalid frame crop")
    if crop_x + frame_width > cell_width or crop_y + frame_height > cell_height:
        raise ValueError("frame crop must fit inside its cell")
    source_stride = sheet.width * 4
    output = bytearray(frame_width * frame_height * 4)
    source_x = column * cell_width + crop_x
    source_y = row * cell_height + crop_y
    if source_x < 0 or source_y < 0 or source_x + frame_width > sheet.width or source_y + frame_height > sheet.height:
        raise ValueError("cell is outside sheet")
    for local_y in range(frame_height):
        start = (source_y + local_y) * source_stride + source_x * 4
        end = start + frame_width * 4
        target = local_y * frame_width * 4
        output[target : target + frame_width * 4] = sheet.pixels[start:end]
    return RgbaImage(frame_width, frame_height, bytes(output))


def join_quad_sheets(first: RgbaImage, second: RgbaImage) -> RgbaImage:
    """Repack two 2x2 sheets into one 4x2 atlas without resampling artwork."""
    if (first.width, first.height) != (second.width, second.height):
        raise ValueError("quad sheets must have equal dimensions")
    if first.width % 2 or first.height % 2:
        raise ValueError("quad sheet dimensions must be divisible by two")
    cw, ch = first.width // 2, first.height // 2
    width, height = cw * 4, ch * 2
    pixels = bytearray(width * height * 4)
    for output_row, source in enumerate((first, second)):
        for index in range(4):
            frame = crop_cell(source, index % 2, index // 2, (cw, ch), (0, 0, cw, ch))
            for y in range(ch):
                dest = ((output_row * ch + y) * width + index * cw) * 4
                pixels[dest:dest + cw * 4] = frame.pixels[y * cw * 4:(y + 1) * cw * 4]
    return RgbaImage(width, height, bytes(pixels))


def _background_like(red: int, green: int, blue: int) -> bool:
    # ImageGen can add a gentle neutral gradient despite the requested #505050.
    # Restrict removal to neutral, mid-dark pixels connected to the cell boundary.
    return max(red, green, blue) - min(red, green, blue) <= 20 and 24 <= (red + green + blue) // 3 <= 145


def remove_connected_gray_background(image: RgbaImage) -> tuple[RgbaImage, int]:
    width, height = image.width, image.height
    pixels = image.pixels
    background = bytearray(width * height)
    queue: deque[int] = deque()

    def seed(x: int, y: int) -> None:
        index = y * width + x
        offset = index * 4
        if not background[index] and _background_like(*pixels[offset : offset + 3]):
            background[index] = 1
            queue.append(index)

    for x in range(width):
        seed(x, 0)
        seed(x, height - 1)
    for y in range(1, height - 1):
        seed(0, y)
        seed(width - 1, y)

    while queue:
        index = queue.popleft()
        x = index % width
        y = index // width
        offset = index * 4
        current = pixels[offset : offset + 3]
        for neighbour in (index - width, index + width, index - 1, index + 1):
            if neighbour < 0 or neighbour >= width * height or background[neighbour]:
                continue
            neighbour_x = neighbour % width
            if abs(neighbour_x - x) > 1:
                continue
            neighbour_offset = neighbour * 4
            colour = pixels[neighbour_offset : neighbour_offset + 3]
            if not _background_like(*colour):
                continue
            # Follow smooth gradients, but do not jump across a dark ink edge.
            if max(abs(colour[channel] - current[channel]) for channel in range(3)) > 18:
                continue
            background[neighbour] = 1
            queue.append(neighbour)

    result = bytearray(pixels)
    removed = 0
    for index, is_background in enumerate(background):
        if is_background:
            offset = index * 4
            result[offset : offset + 4] = bytes((*MATTE_RGB, 0))
            removed += 1
    return RgbaImage(width, height, bytes(result)), removed


def visible_bounds(image: RgbaImage, alpha_threshold: int = 16) -> tuple[int, int, int, int] | None:
    occupied = [
        index
        for index, alpha in enumerate(image.pixels[3::4])
        if alpha > alpha_threshold
    ]
    if not occupied:
        return None
    xs = [index % image.width for index in occupied]
    ys = [index // image.width for index in occupied]
    return min(xs), min(ys), max(xs), max(ys)


def safe_margins(image: RgbaImage, bounds: tuple[int, int, int, int]) -> dict[str, int]:
    left, top, right, bottom = bounds
    return {
        "left": left,
        "right": image.width - 1 - right,
        "top": top,
        "bottom": image.height - 1 - bottom,
    }


def register_character(
    catalog_path: Path,
    character: str,
    display_name: str,
    source_directory: str,
    set_current_source: bool,
    canvas_pixels: tuple[int, int],
) -> None:
    catalog = json.loads(catalog_path.read_text(encoding="utf-8"))
    characters = catalog.setdefault("characters", {})
    if character in characters:
        if not set_current_source:
            return
        characters[character]["source_directory"] = source_directory
    else:
        characters[character] = {
            "display_name": display_name,
            "source_directory": source_directory,
            "canvas_pixels": list(canvas_pixels),
            "texture_scale": 3,
            "fit": "contain",
            "anchor": "bottom-center",
            "selected_variant": None,
            "variants": {},
        }
    temporary = catalog_path.with_suffix(catalog_path.suffix + ".tmp")
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(catalog_path)


def import_sheet(
    source_sheet: Path,
    character: str,
    display_name: str,
    prefix: str,
    prompt_file: Path | None,
    catalog_path: Path,
    attempt: str,
    set_current_source: bool,
    canvas_pixels: tuple[int, int],
    safe_margin: int,
    second_sheet: Path | None = None,
    frame_crop: tuple[int, int, int, int] | None = None,
) -> dict[str, object]:
    if not SLUG.fullmatch(character):
        raise ValueError("character id may contain only lowercase letters, digits, and hyphens")
    if not prefix or "/" in prefix:
        raise ValueError("prefix must be a non-empty filename prefix")
    sheet = read_rgba_png(source_sheet)
    if second_sheet:
        sheet = join_quad_sheets(sheet, read_rgba_png(second_sheet))
    if frame_crop is None and (sheet.width, sheet.height) != SHEET_SIZE:
        raise ValueError(f"{source_sheet}: expected {SHEET_SIZE[0]}x{SHEET_SIZE[1]} sheet")
    if sheet.width % 4 or sheet.height % 2:
        raise ValueError("sheet dimensions must fit a 4x2 grid")
    cell_size = (sheet.width // 4, sheet.height // 2)
    crop = frame_crop or (0, 0, *FRAME_SIZE)

    if not SLUG.fullmatch(attempt):
        raise ValueError("attempt may contain only lowercase letters, digits, and hyphens")
    if safe_margin < 0:
        raise ValueError("safe margin must not be negative")
    prepared: list[tuple[RgbaImage, int, tuple[int, int, int, int], dict[str, int]]] = []
    for index in range(8):
        frame = crop_cell(sheet, index % 4, index // 4, cell_size, crop)
        transparent, removed = remove_connected_gray_background(frame)
        bounds = visible_bounds(transparent)
        if bounds is None:
            raise ValueError(f"frame {index + 1}: no visible artwork after background removal")
        margins = safe_margins(transparent, bounds)
        failing = [name for name, value in margins.items() if value < safe_margin]
        if failing:
            details = ", ".join(f"{name}={margins[name]}" for name in failing)
            raise ValueError(
                f"frame {index + 1}: artwork enters the {safe_margin}px safety zone ({details})"
            )
        prepared.append((transparent, removed, bounds, margins))
    root = GAME_PLAN_ROOT / "graphics" / "bitmapove-sekvence" / character / attempt
    source_directory = root / "source"
    frames_directory = root / "frames"
    if frames_directory.exists() and list(frames_directory.glob("*.png")):
        raise ValueError(f"{frames_directory}: frames already exist; keep the existing attempt immutable")
    source_directory.mkdir(parents=True, exist_ok=True)
    frames_directory.mkdir(parents=True, exist_ok=True)
    stored_sheet = source_directory / "sheet-v1.png"
    if stored_sheet.exists():
        raise ValueError(f"{stored_sheet}: source sheet already exists")
    if second_sheet:
        shutil.copy2(source_sheet, source_directory / "group-a.png")
        shutil.copy2(second_sheet, source_directory / "group-b.png")
        write_rgba_png(stored_sheet, sheet)
    else:
        shutil.copy2(source_sheet, stored_sheet)
    if prompt_file:
        shutil.copy2(prompt_file, source_directory / "prompt-v1.txt")

    files: list[dict[str, object]] = []
    for index, (transparent, removed, bounds, margins) in enumerate(prepared):
        output = frames_directory / f"{prefix}{index:02d}.png"
        write_rgba_png(output, transparent)
        files.append(
            {
                "index": index,
                "file": output.relative_to(GAME_PLAN_ROOT).as_posix(),
                "removed_background_pixels": removed,
                "visible_bounds": list(bounds),
                "safe_margins": margins,
                "sha256": sha256(output),
            }
        )

    if len({item["sha256"] for item in files}) != 8:
        raise ValueError("generated animation contains duplicate frames")
    frame_source = frames_directory.relative_to(GAME_PLAN_ROOT).as_posix()
    register_character(
        catalog_path,
        character,
        display_name,
        frame_source,
        set_current_source,
        canvas_pixels,
    )
    manifest = {
        "schema_version": 1,
        "character": character,
        "display_name": display_name,
        "imported_at": datetime.now(timezone.utc).isoformat(),
        "source": stored_sheet.relative_to(GAME_PLAN_ROOT).as_posix(),
        "source_sha256": sha256(stored_sheet),
        "sheet_size": [sheet.width, sheet.height],
        "cell_size": list(cell_size),
        "frame_size": list(crop[2:]),
        "shared_frame_crop": list(crop),
        "assembly": "two-2x2-sheets-no-resampling" if second_sheet else "single-sheet",
        "background_removal": "boundary-connected-neutral-gray-v1",
        "minimum_safe_margin": safe_margin,
        "files": files,
    }
    (source_directory / "import-v1.json").write_text(
        json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    return manifest


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("character")
    parser.add_argument("display_name")
    parser.add_argument("prefix")
    parser.add_argument("sheet", type=Path)
    parser.add_argument("--prompt-file", type=Path)
    parser.add_argument("--second-sheet", type=Path, help="assemble two equally sized 2x2 sheets without resampling")
    parser.add_argument("--frame-crop", help="shared local X,Y,WIDTH,HEIGHT crop; outer padding does not affect game scale")
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--attempt", default="rage-gray-v2")
    parser.add_argument("--set-current-source", action="store_true")
    parser.add_argument("--canvas", default="96x96", metavar="WIDTHxHEIGHT")
    parser.add_argument(
        "--safe-margin",
        type=int,
        default=DEFAULT_SAFE_MARGIN,
        help=f"reject artwork closer than this many pixels to a cropped frame edge (default: {DEFAULT_SAFE_MARGIN})",
    )
    args = parser.parse_args()
    try:
        canvas_parts = args.canvas.lower().split("x", 1)
        if len(canvas_parts) != 2:
            raise ValueError("canvas must use WIDTHxHEIGHT notation")
        canvas_pixels = (int(canvas_parts[0]), int(canvas_parts[1]))
        if min(canvas_pixels) <= 0:
            raise ValueError("canvas dimensions must be positive")
        frame_crop = tuple(int(v) for v in args.frame_crop.split(",")) if args.frame_crop else None
        if frame_crop is not None and len(frame_crop) != 4:
            raise ValueError("frame-crop must use X,Y,WIDTH,HEIGHT notation")
        manifest = import_sheet(
            args.sheet,
            args.character,
            args.display_name,
            args.prefix,
            args.prompt_file,
            args.catalog,
            args.attempt,
            args.set_current_source,
            canvas_pixels,
            args.safe_margin,
            args.second_sheet,
            frame_crop,
        )
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    print(f"Imported {manifest['display_name']}: {len(manifest['files'])} unique frames.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
