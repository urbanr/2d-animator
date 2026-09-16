#!/usr/bin/env python3
"""Register the already split Generalissimus parts as a PoseRig skin."""

from __future__ import annotations

import json
from pathlib import Path


ROOT = (
    Path(__file__).resolve().parents[1]
    / "graphics"
    / "bitmapove-predlohy"
    / "soudruh-generalissimus-v1"
)

# Authored in the coordinates of the cropped PNG files. These are anatomical
# attachments, not automatically detected alpha bounds. They preserve the
# intentionally left-facing diagonals of the far arm and both legs.
ANCHORS = {
    "head": ([200, 230], [122, 126]),
    "torso": ([155, 42], [143, 256]),
    "pelvis": ([124, -90], [124, 180]),
    "megaphone": ([174, 38], [174, 158]),
    "nearUpperArm": ([78, 24], [76, 220]),
    "nearForearm": ([96, 24], [76, 236]),
    "farUpperArm": ([55, 18], [176, 218]),
    "farForearm": ([166, 15], [57, 231]),
    "nearThigh": ([160, 24], [62, 251]),
    "nearShin": ([104, 22], [73, 253]),
    "farThigh": ([50, 23], [116, 255]),
    "farShin": ([41, 21], [73, 254]),
    "nearFoot": ([181, 49], [35, 49]),
    "farFoot": ([170, 49], [31, 49]),
}

LAYERS = [
    "farUpperArm",
    "farForearm",
    "farFoot",
    "farThigh",
    "farShin",
    "nearFoot",
    "nearThigh",
    "nearShin",
    "pelvis",
    "torso",
    "head",
    "nearUpperArm",
    "megaphone",
    "nearForearm",
]


def main() -> None:
    source = ROOT / "parts.json"
    target = ROOT / "skin.json"
    if target.exists():
        raise ValueError(f"Refusing to overwrite immutable skin: {target}")
    parts_manifest = json.loads(source.read_text(encoding="utf-8"))
    if set(ANCHORS) != set(parts_manifest["parts"]):
        raise ValueError("Anchor keys differ from imported bitmap parts")

    parts = {}
    for key, record in parts_manifest["parts"].items():
        start, end = ANCHORS[key]
        parts[key] = {**record, "start": start, "end": end}

    skin = {
        "schema_version": 1,
        "id": "soudruh-generalissimus-v1",
        "name": "Soudruh Generalissimus · cutout v1",
        "status": "experiment",
        "rig": "pose-rig-v1",
        "facing": "left",
        "default_clip": "48d0d886-4cf4-4a6b-a540-ee3139e228e2",
        "source_sha256": parts_manifest["source_sha256"],
        "source_size": parts_manifest["source_size"],
        "background": "boundary-connected-neutral-gray-v1",
        "layers": LAYERS,
        "parts": parts,
    }
    target.write_text(
        json.dumps(skin, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(f"Registered {len(parts)} Generalissimus parts in {target}")


if __name__ == "__main__":
    main()
