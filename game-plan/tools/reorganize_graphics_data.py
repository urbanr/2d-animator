#!/usr/bin/env python3
"""One-time, idempotent split of graphics data into six independent banks."""

from __future__ import annotations

import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GRAPHICS = ROOT / "graphics"
SEQUENCES = GRAPHICS / "bitmapove-sekvence"
TEMPLATES = GRAPHICS / "bitmapove-predlohy"
LEVELS = GRAPHICS / "levely"
SKELETONS = GRAPHICS / "kostry"
ANIMATIONS = GRAPHICS / "animace"
CHARACTERS = GRAPHICS / "postavy"

NEW_BANKS = {
    "bitmapove-sekvence",
    "bitmapove-predlohy",
    "levely",
    "kostry",
    "animace",
    "postavy",
}


def write_json(path: Path, value: object) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(value, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


def move(source: Path, target: Path) -> None:
    if not source.exists():
        return
    if target.exists():
        if target.is_dir() and not any(target.iterdir()):
            target.rmdir()
        else:
            raise RuntimeError(f"Cíl už existuje: {target}")
    target.parent.mkdir(parents=True, exist_ok=True)
    source.rename(target)


def replace_paths(path: Path, replacements: dict[str, str]) -> None:
    if not path.is_file() or path.suffix.lower() not in {".json", ".md", ".txt"}:
        return
    try:
        original = path.read_text(encoding="utf-8")
    except UnicodeDecodeError:
        return
    changed = original
    for old, new in replacements.items():
        changed = changed.replace(old, new)
    if changed != original:
        path.write_text(changed, encoding="utf-8")


def main() -> None:
    old_pose_store = GRAPHICS / "poses" / "poses.json"
    if not old_pose_store.exists() and all(
        path.exists()
        for path in (
            SKELETONS / "skeletons.json",
            ANIMATIONS / "animations.json",
            CHARACTERS / "game-characters.json",
            TEMPLATES / "skins.json",
            LEVELS / "levels.json",
            SEQUENCES / "sprite-variants.json",
        )
    ):
        print("Datové banky už jsou oddělené; nic se nemění.")
        return

    for directory in (SEQUENCES, TEMPLATES, LEVELS, SKELETONS, ANIMATIONS, CHARACTERS):
        directory.mkdir(parents=True, exist_ok=True)

    if old_pose_store.exists():
        old_library = json.loads(old_pose_store.read_text(encoding="utf-8"))
    else:
        raise RuntimeError("Chybí zdrojová banka koster.")

    clips = old_library.get("clips", {})
    named_clips = {
        identifier: record
        for identifier, record in clips.items()
        if isinstance(record, dict) and str(record.get("name", "")).strip()
    }
    write_json(
        SKELETONS / "skeletons.json",
        {
            "schema_version": 2,
            "colors": old_library.get("colors", {}),
            "clips": named_clips,
            "poses": {},
            "rigs": {},
            "trash": {},
        },
    )
    write_json(ANIMATIONS / "animations.json", {"schema_version": 2, "finished_animations": {}, "trash": {}})
    write_json(CHARACTERS / "game-characters.json", {"schema_version": 3, "characters": {}, "trash": {}})

    old_templates = GRAPHICS / "characters2"
    if old_templates.exists():
        move(old_templates / "bezec-zombie-v1", TEMPLATES / "bezec-zombie-v1")
        move(old_templates / "skins.json", TEMPLATES / "skins.json")
        move(old_templates / "README.md", TEMPLATES / "README.md")
        shutil.rmtree(old_templates)

    old_poses = GRAPHICS / "poses"
    if old_poses.exists():
        move(old_poses / "README.md", SKELETONS / "README.md")
        shutil.rmtree(old_poses)

    move(GRAPHICS / "levels", LEVELS)

    sequence_dirs = []
    for path in list(GRAPHICS.iterdir()):
        if not path.is_dir() or path.name in NEW_BANKS:
            continue
        sequence_dirs.append(path.name)
        move(path, SEQUENCES / path.name)

    for filename in (
        "sprite-variants.json",
        "sprite-frame-offsets.json",
        "game-sprites.generated.json",
        "asset-production-status.json",
        "GENERATION-RUN-2026-09-14.md",
        "LOWRES-MIGRATION.md",
    ):
        move(GRAPHICS / filename, SEQUENCES / filename)

    replacements = {
        "graphics/bitmapove-predlohy/": "graphics/bitmapove-predlohy/",
        "graphics/levely/": "graphics/levely/",
        "graphics/kostry/skeletons.json": "graphics/kostry/skeletons.json",
    }
    for slug in sequence_dirs:
        replacements[f"graphics/{slug}/"] = f"graphics/bitmapove-sekvence/{slug}/"

    for bank in (SEQUENCES, TEMPLATES, LEVELS, SKELETONS):
        for path in bank.rglob("*"):
            replace_paths(path, replacements)

    print(f"Kostry: {len(named_clips)}")
    print("Postavy: 0")
    print("Hotové animace: 0")
    print(f"Bitmapové sekvence: {len(sequence_dirs)} adresářů")
    print("Bitmapové předlohy: 1")


if __name__ == "__main__":
    main()
