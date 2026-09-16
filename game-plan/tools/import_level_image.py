#!/usr/bin/env python3
"""Store a generated level master and crop it to the project's phone aspect."""

from __future__ import annotations

import argparse
import hashlib
import json
import re
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png


GAME_PLAN_ROOT = Path(__file__).resolve().parent.parent
LEVELS_ROOT = GAME_PLAN_ROOT / "graphics" / "levels"
CATALOG = LEVELS_ROOT / "levels.json"
SLUG = re.compile(r"^[a-z0-9][a-z0-9-]*$")
SOURCE_SIZE = (1536, 1024)
MASTER_SIZE = (1536, 704)


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def center_crop(image: RgbaImage) -> RgbaImage:
    width, height = MASTER_SIZE
    top = (image.height - height) // 2
    stride = image.width * 4
    pixels = bytearray(width * height * 4)
    for y in range(height):
        start = (top + y) * stride
        pixels[y * stride : (y + 1) * stride] = image.pixels[start : start + stride]
    return RgbaImage(width, height, bytes(pixels))


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("slug")
    parser.add_argument("display_name")
    parser.add_argument("source", type=Path)
    parser.add_argument("--mechanic", default=None)
    parser.add_argument("--variant", default="concept-v1")
    parser.add_argument("--title", default="")
    parser.add_argument("--description", default="")
    parser.add_argument("--prompt", type=Path)
    parser.add_argument("--keep-size", action="store_true",
                        help="Keep a generated wide master intact, without cropping or resampling")
    args = parser.parse_args()
    try:
        if not SLUG.fullmatch(args.slug):
            raise ValueError("invalid level slug")
        if not SLUG.fullmatch(args.variant):
            raise ValueError("invalid variant slug")
        catalog = json.loads(CATALOG.read_text(encoding="utf-8")) if CATALOG.exists() else {"schema_version": 1, "levels": {}}
        level = catalog["levels"].setdefault(args.slug, {
            "display_name": args.display_name, "selected_variant": None, "variants": {}})
        if args.variant in level["variants"]:
            raise ValueError("level variant already exists")
        prompt_text = args.prompt.read_text(encoding="utf-8") if args.prompt else None
        image = read_rgba_png(args.source)
        if not args.keep_size and (image.width, image.height) != SOURCE_SIZE:
            raise ValueError(f"expected {SOURCE_SIZE[0]}x{SOURCE_SIZE[1]} source")
        if args.keep_size and abs(image.width / image.height - MASTER_SIZE[0] / MASTER_SIZE[1]) > 0.03:
            raise ValueError("keep-size requires a wide master close to the 24:11 phone aspect")
        root = LEVELS_ROOT / args.slug / args.variant
        if root.exists():
            raise ValueError(f"{root}: level candidate already exists")
        root.mkdir(parents=True)
        source = root / "source.png"
        output = root / "background-master.png"
        shutil.copy2(args.source, source)
        master = image if args.keep_size else center_crop(image)
        write_rgba_png(output, master)
        mechanic = args.mechanic
        if mechanic is None:
            mechanic = next((v.get("mechanic", "") for v in level["variants"].values()), "")
        manifest = {
            "schema_version": 1,
            "level": args.slug,
            "display_name": args.display_name,
            "variant": args.variant,
            "title": args.title or args.display_name,
            "description": args.description,
            "status": "alternative",
            "generated_at": datetime.now(timezone.utc).isoformat(),
            "source": source.relative_to(GAME_PLAN_ROOT).as_posix(),
            "source_sha256": sha256(source),
            "background_master": output.relative_to(GAME_PLAN_ROOT).as_posix(),
            "background_sha256": sha256(output),
            "source_size": [image.width, image.height],
            "master_size": [master.width, master.height],
            "crop": {"x": 0, "y": 0 if args.keep_size else 160, "width": master.width, "height": master.height},
            "resampled": False,
            "layer_plan": {
                "far": "sky, horizon and distant silhouettes; parallax 0.1x",
                "middle": "near scenery and map identity; parallax 0.3x",
                "main": "terrain and gameplay mechanics; rebuilt from level data with physics",
            },
            "mechanic": mechanic,
        }
        if prompt_text is not None:
            prompt_path = root / "prompt.txt"
            prompt_path.write_text(prompt_text, encoding="utf-8")
            manifest["prompt"] = prompt_path.relative_to(GAME_PLAN_ROOT).as_posix()
            manifest["generation_mode"] = "built-in image_gen"
        (root / "manifest.json").write_text(
            json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
        )
        level["variants"][args.variant] = manifest
        CATALOG.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        print(f"Imported level {args.display_name}: {output}")
    except (OSError, TypeError, ValueError, json.JSONDecodeError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
