"""Per-background walking baseline; normalized Y increases from top to bottom."""
import json
import math
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CATALOG = ROOT / "graphics" / "levely" / "levels.json"


def default_walk_line(slug, variant):
    # Starting estimates, not image detection or approved collision geometry.
    values = {"hrbitov": 0.72, "strecha-panelaku": 0.60, "prehrada": 0.48, "sidliste": 0.85}
    return {"y": values.get(slug, 0.80), "coordinate_system": "normalized-top-down", "reviewed": False}


def write_catalog(path, catalog):
    temporary = path.with_suffix(".json.tmp")
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    temporary.replace(path)


def set_walk_line(slug, variant, y, path=CATALOG):
    if not isinstance(slug, str) or not isinstance(variant, str):
        raise ValueError("Chybí level nebo varianta.")
    if isinstance(y, bool) or not isinstance(y, (float, int)) or not math.isfinite(y) or not 0 <= y <= 1:
        raise ValueError("Výška linky musí být číslo od 0 do 1.")
    catalog = json.loads(path.read_text(encoding="utf-8"))
    entry = catalog.get("levels", {}).get(slug, {}).get("variants", {}).get(variant)
    if entry is None:
        raise ValueError("Neznámý level nebo varianta.")
    line = {"y": y, "coordinate_system": "normalized-top-down", "reviewed": True}
    entry["walk_line"] = line
    write_catalog(path, catalog)
    return line
