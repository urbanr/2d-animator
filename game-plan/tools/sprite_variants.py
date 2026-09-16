#!/usr/bin/env python3
"""Create immutable sprite alternatives and regenerate selected game data."""

from __future__ import annotations

import argparse
import json
import re
import sys
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

from downscale_sprites import migrate
from sprite_alignment import (
    build_browser_data,
    catalog_alignment_key,
    get_frame_offsets,
    get_frame_order,
)


TOOLS_ROOT = Path(__file__).resolve().parent
GAME_PLAN_ROOT = TOOLS_ROOT.parent
DEFAULT_CATALOG = GAME_PLAN_ROOT / "graphics" / "sprite-variants.json"
DEFAULT_GAME_DATA = GAME_PLAN_ROOT / "graphics" / "game-sprites.generated.json"
DEFAULT_GALLERY_DATA = GAME_PLAN_ROOT / "tool" / "sprite-variants.generated.js"
VARIANT_ID = re.compile(r"^[a-z0-9][a-z0-9-]*$")
REQUIRED_SETTINGS = {
    "dark_strength",
    "lambda_value",
    "dark_threshold",
    "detail_floor",
    "photopea_brightness",
    "photopea_contrast",
    "photopea_darken_opacity",
    "outer_edge_strength",
    "ink_blackness_strength",
    "ink_blackness_threshold",
}


def read_json(path: Path) -> dict[str, object]:
    value = json.loads(path.read_text(encoding="utf-8"))
    if not isinstance(value, dict):
        raise ValueError(f"{path}: expected a JSON object")
    return value


def write_json(path: Path, value: dict[str, object]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    temporary = path.with_suffix(path.suffix + ".tmp")
    temporary.write_text(
        json.dumps(value, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    temporary.replace(path)


def load_profile(profile: str, overrides: list[str]) -> tuple[dict[str, object], dict[str, object]]:
    profile_path = TOOLS_ROOT / "profiles" / f"{profile}.json"
    document = read_json(profile_path)
    settings_value = document.get("settings")
    if not isinstance(settings_value, dict) or set(settings_value) != REQUIRED_SETTINGS:
        raise ValueError(f"{profile_path}: profile settings do not match the supported schema")
    settings = dict(settings_value)
    for item in overrides:
        if "=" not in item:
            raise ValueError(f"invalid override {item!r}; expected key=value")
        key, raw_value = item.split("=", 1)
        if key not in settings:
            raise ValueError(f"unknown profile setting {key!r}")
        old_value = settings[key]
        try:
            settings[key] = int(raw_value) if isinstance(old_value, int) else float(raw_value)
        except ValueError as error:
            raise ValueError(f"invalid value for {key}: {raw_value!r}") from error
    return document, settings


def game_plan_root_for(catalog_path: Path) -> Path:
    return catalog_path.resolve().parent.parent


def relative_to_game_plan(path: Path, game_plan_root: Path = GAME_PLAN_ROOT) -> str:
    return path.resolve().relative_to(game_plan_root.resolve()).as_posix()


def alignment_path_for(catalog_path: Path) -> Path:
    return catalog_path.resolve().parent / "sprite-frame-offsets.json"


def create_variant(
    catalog_path: Path,
    character_id: str,
    variant_id: str,
    profile_name: str,
    overrides: list[str],
    description: str,
    title: str = "",
    source_directory: str | None = None,
    fps: int = 8,
) -> dict[str, object]:
    if not VARIANT_ID.fullmatch(variant_id):
        raise ValueError("variant id may contain only lowercase letters, digits, and hyphens")
    catalog = read_json(catalog_path)
    characters = catalog.get("characters")
    if not isinstance(characters, dict) or character_id not in characters:
        raise ValueError(f"unknown character {character_id!r}")
    character = characters[character_id]
    if not isinstance(character, dict):
        raise ValueError(f"invalid catalog record for {character_id}")
    variants = character.get("variants")
    if not isinstance(variants, dict):
        raise ValueError(f"invalid variants for {character_id}")
    if variant_id in variants:
        raise ValueError(f"variant {character_id}/{variant_id} already exists")

    game_plan_root = game_plan_root_for(catalog_path)
    profile, settings = load_profile(profile_name, overrides)
    canvas = character.get("canvas_pixels")
    if not isinstance(canvas, list) or len(canvas) != 2:
        raise ValueError(f"invalid canvas for {character_id}")
    if not 1 <= fps <= 60:
        raise ValueError("fps must be between 1 and 60")
    source = (game_plan_root / (source_directory or str(character["source_directory"]))).resolve()
    relative_to_game_plan(source, game_plan_root)
    if len(list(source.glob("*.png"))) != 8:
        raise ValueError(f"{source}: a regular-enemy variant requires exactly 8 PNG source frames")
    output = source.parent / "variants" / variant_id
    if output.exists():
        raise ValueError(f"{output}: output already exists")
    manifest = migrate(
        source,
        output,
        width=int(canvas[0]),
        height=int(canvas[1]),
        dark_strength=float(settings["dark_strength"]),
        lambda_value=float(settings["lambda_value"]),
        dark_threshold=float(settings["dark_threshold"]),
        detail_floor=float(settings["detail_floor"]),
        overwrite=False,
        fit=str(character.get("fit", profile.get("fit", "contain"))),
        anchor=str(character.get("anchor", profile.get("anchor", "bottom-center"))),
        photopea_brightness=int(settings["photopea_brightness"]),
        photopea_contrast=float(settings["photopea_contrast"]),
        photopea_darken_opacity=float(settings["photopea_darken_opacity"]),
        outer_edge_strength=float(settings["outer_edge_strength"]),
        ink_blackness_strength=float(settings["ink_blackness_strength"]),
        ink_blackness_threshold=int(settings["ink_blackness_threshold"]),
        profile_name=profile_name,
    )
    variants[variant_id] = {
        "title": title or f"{character.get('display_name', character_id)} — {variant_id}",
        "path": relative_to_game_plan(output, game_plan_root),
        "profile": profile_name,
        "status": "alternative",
        "description": description or "Alternative preprocessing experiment.",
        "parameter_overrides": overrides,
        "created_at": manifest["generated_at"],
        "source_directory": relative_to_game_plan(source, game_plan_root),
        "fps": fps,
    }
    write_json(catalog_path, catalog)
    return manifest


def build_gallery_data(catalog_path: Path, output_path: Path) -> list[dict[str, object]]:
    catalog = read_json(catalog_path)
    game_plan_root = game_plan_root_for(catalog_path)
    alignment_path = alignment_path_for(catalog_path)
    characters = catalog.get("characters", {})
    if not isinstance(characters, dict):
        raise ValueError("catalog characters must be an object")
    items: list[dict[str, object]] = []
    for character_id, character_value in sorted(characters.items()):
        if not isinstance(character_value, dict):
            raise ValueError(f"invalid catalog record for {character_id}")
        variants = character_value.get("variants", {})
        if not isinstance(variants, dict):
            raise ValueError(f"invalid variants for {character_id}")
        selected = character_value.get("selected_variant")
        scale = int(character_value.get("texture_scale", 3))
        canvas = character_value.get("canvas_pixels", [96, 96])
        for variant_id, variant_value in variants.items():
            if not isinstance(variant_value, dict):
                raise ValueError(f"invalid variant {character_id}/{variant_id}")
            _, _, frames = validate_variant(game_plan_root, variant_value)
            is_selected = variant_id == selected
            review_status = str(variant_value.get("status", "alternative"))
            if is_selected:
                display_status, group, badge = "Produkční", "current", "current"
            elif review_status == "rejected":
                display_status, group, badge = "Zamítnuté", "rejected", "rejected"
            else:
                display_status, group, badge = "Alternativa", "trial", "trial"
            alignment_key = catalog_alignment_key(character_id, variant_id)
            items.append(
                {
                    "displayName": character_value.get("display_name", character_id),
                    "title": variant_value.get(
                        "title",
                        f"{character_value.get('display_name', character_id)} — {variant_id}",
                    ),
                    "status": display_status,
                    "group": group,
                    "badge": badge,
                    "character": character_id,
                    "variant": variant_id,
                    "fps": variant_value.get("fps", 8),
                    "alignmentKey": alignment_key,
                    "frameOffsets": get_frame_offsets(alignment_path, alignment_key),
                    "frameOrder": get_frame_order(alignment_path, alignment_key, variant_value.get("frame_order")),
                    "gameHeight": int(canvas[1]) // scale,
                    "note": variant_value.get("description", ""),
                    "frames": ["../" + relative_to_game_plan(frame, game_plan_root) for frame in sorted(frames)],
                    "link": "../" + str(variant_value["path"]) + "/",
                }
            )
    output_path.parent.mkdir(parents=True, exist_ok=True)
    temporary = output_path.with_suffix(output_path.suffix + ".tmp")
    temporary.write_text(
        "window.SPRITE_VARIANTS = "
        + json.dumps(items, ensure_ascii=False, indent=2)
        + ";\n",
        encoding="utf-8",
    )
    temporary.replace(output_path)
    build_browser_data(alignment_path, output_path.parent / "sprite-frame-offsets.generated.js")
    return items


def validate_variant(game_plan_root: Path, variant: dict[str, object]) -> tuple[Path, dict[str, object], list[Path]]:
    directory = game_plan_root / str(variant["path"])
    manifest_path = directory / "migration.json"
    manifest = read_json(manifest_path)
    frames = sorted(directory.glob("*.png"))
    if not frames:
        raise ValueError(f"{directory}: no PNG frames")
    if len(frames) != 8:
        raise ValueError(f"{directory}: expected exactly 8 PNG frames")
    if len(frames) != len(manifest.get("files", [])):
        raise ValueError(f"{directory}: frame count does not match migration.json")
    hashes = [str(record["output_sha256"]) for record in manifest["files"]]
    if len(set(hashes)) != len(hashes):
        raise ValueError(f"{directory}: animation contains duplicate frames")
    order = variant.get("frame_order", list(range(1, 9)))
    if (
        not isinstance(order, list)
        or len(order) != 8
        or any(type(index) is not int for index in order)
        or sorted(order) != list(range(1, 9))
    ):
        raise ValueError(f"{directory}: frame_order must contain each number 1 through 8 once")
    frames = [frames[index - 1] for index in order]
    return directory, manifest, frames


def build_game_data(catalog_path: Path, output_path: Path) -> dict[str, object]:
    catalog = read_json(catalog_path)
    game_plan_root = game_plan_root_for(catalog_path)
    sprites: dict[str, object] = {}
    characters = catalog.get("characters", {})
    alignment_path = alignment_path_for(catalog_path)
    if not isinstance(characters, dict):
        raise ValueError("catalog characters must be an object")
    for character_id, character_value in sorted(characters.items()):
        if not isinstance(character_value, dict):
            raise ValueError(f"invalid catalog record for {character_id}")
        selected = character_value.get("selected_variant")
        if selected is None:
            continue
        variants = character_value.get("variants", {})
        if not isinstance(variants, dict) or selected not in variants:
            raise ValueError(f"selected variant {character_id}/{selected} does not exist")
        variant = variants[selected]
        if not isinstance(variant, dict):
            raise ValueError(f"invalid selected variant {character_id}/{selected}")
        directory, manifest, frames = validate_variant(game_plan_root, variant)
        canvas = character_value["canvas_pixels"]
        scale = int(character_value["texture_scale"])
        checksums = {
            Path(str(record["output"])).name: record["output_sha256"]
            for record in manifest["files"]
        }
        offsets = get_frame_offsets(
            alignment_path,
            catalog_alignment_key(character_id, str(selected)),
        )
        order = get_frame_order(alignment_path, catalog_alignment_key(character_id, str(selected)), variant.get("frame_order"))
        canonical_frames = sorted(frames)
        frames = [canonical_frames[index - 1] for index in order]
        sprites[character_id] = {
            "variant": selected,
            "fps": variant.get("fps", 8),
            "profile": variant["profile"],
            "frame_size_pixels": canvas,
            "logical_size_points": [int(canvas[0]) // scale, int(canvas[1]) // scale],
            "texture_scale": scale,
            "anchor": character_value.get("anchor", "bottom-center"),
            "frame_offset_units": "frame-pixels",
            "frames": [
                {
                    "index": index,
                    "file": relative_to_game_plan(frame, game_plan_root),
                    "sha256": checksums[frame.name],
                    "offset_pixels": offsets[index],
                }
                for index, frame in enumerate(frames)
            ],
            "manifest": relative_to_game_plan(directory / "migration.json", game_plan_root),
        }
    result = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "generated_from": relative_to_game_plan(catalog_path, game_plan_root),
        "sprites": sprites,
    }
    write_json(output_path, result)
    return result


def select_variant(
    catalog_path: Path,
    output_path: Path,
    character_id: str,
    variant_id: str,
) -> dict[str, object]:
    catalog = read_json(catalog_path)
    characters = catalog.get("characters", {})
    if not isinstance(characters, dict) or character_id not in characters:
        raise ValueError(f"unknown character {character_id!r}")
    character = characters[character_id]
    if not isinstance(character, dict):
        raise ValueError(f"invalid catalog record for {character_id}")
    variants = character.get("variants", {})
    if not isinstance(variants, dict) or variant_id not in variants:
        raise ValueError(f"unknown variant {character_id}/{variant_id}")
    chosen = variants[variant_id]
    if not isinstance(chosen, dict):
        raise ValueError(f"invalid variant {character_id}/{variant_id}")
    validate_variant(game_plan_root_for(catalog_path), chosen)
    previous = character.get("selected_variant")
    if previous in variants and isinstance(variants[previous], dict):
        variants[previous]["status"] = "alternative"
    chosen["status"] = "production"
    character["selected_variant"] = variant_id
    write_json(catalog_path, catalog)
    return build_game_data(catalog_path, output_path)


def set_variant_status(
    catalog_path: Path,
    character_id: str,
    variant_id: str,
    status: str,
    description: str,
) -> None:
    catalog = read_json(catalog_path)
    characters = catalog.get("characters", {})
    if not isinstance(characters, dict) or character_id not in characters:
        raise ValueError(f"unknown character {character_id!r}")
    character = characters[character_id]
    variants = character.get("variants", {}) if isinstance(character, dict) else {}
    if not isinstance(variants, dict) or variant_id not in variants:
        raise ValueError(f"unknown variant {character_id}/{variant_id}")
    variant = variants[variant_id]
    if not isinstance(variant, dict):
        raise ValueError(f"invalid variant {character_id}/{variant_id}")
    variant["status"] = status
    if description:
        variant["description"] = description
    write_json(catalog_path, catalog)


def build_parser() -> argparse.ArgumentParser:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--catalog", type=Path, default=DEFAULT_CATALOG)
    parser.add_argument("--game-data", type=Path, default=DEFAULT_GAME_DATA)
    parser.add_argument("--gallery-data", type=Path, default=DEFAULT_GALLERY_DATA)
    commands = parser.add_subparsers(dest="command", required=True)
    create = commands.add_parser("create", help="create and register a new immutable alternative")
    create.add_argument("character")
    create.add_argument("variant")
    create.add_argument("--profile", default="enemy-production-v1")
    create.add_argument("--set", action="append", default=[], metavar="KEY=VALUE")
    create.add_argument("--description", default="")
    create.add_argument("--title", default="")
    create.add_argument("--source-directory", help="alternative source relative to game-plan; does not change the default source")
    create.add_argument("--fps", type=int, default=8)
    select = commands.add_parser("select", help="select a variant and rebuild game data")
    select.add_argument("character")
    select.add_argument("variant")
    status = commands.add_parser("set-status", help="set review status without selecting a variant")
    status.add_argument("character")
    status.add_argument("variant")
    status.add_argument("status")
    status.add_argument("--description", default="")
    commands.add_parser("build-game-data", help="rebuild data from current selections")
    return parser


def main(argv: Iterable[str] | None = None) -> int:
    args = build_parser().parse_args(argv)
    try:
        if args.command == "create":
            manifest = create_variant(
                args.catalog,
                args.character,
                args.variant,
                args.profile,
                args.set,
                args.description,
                args.title,
                args.source_directory,
                args.fps,
            )
            build_gallery_data(args.catalog, args.gallery_data)
            print(f"Created alternative {args.character}/{args.variant} with {len(manifest['files'])} frames.")
        elif args.command == "select":
            data = select_variant(
                args.catalog,
                args.game_data,
                args.character,
                args.variant,
            )
            build_gallery_data(args.catalog, args.gallery_data)
            print(f"Selected {args.character}/{args.variant}; game data now contains {len(data['sprites'])} sprite(s).")
        elif args.command == "set-status":
            set_variant_status(
                args.catalog,
                args.character,
                args.variant,
                args.status,
                args.description,
            )
            build_gallery_data(args.catalog, args.gallery_data)
            print(f"Updated {args.character}/{args.variant} to {args.status}.")
        else:
            data = build_game_data(args.catalog, args.game_data)
            build_gallery_data(args.catalog, args.gallery_data)
            print(f"Generated game data with {len(data['sprites'])} selected sprite(s).")
    except (OSError, KeyError, TypeError, ValueError) as error:
        print(f"error: {error}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
