#!/usr/bin/env python3
"""Build browser data for all generated level alternatives."""

import json
from level_walk_line import ROOT, CATALOG, default_walk_line, write_catalog


def build_level_data():
    catalog = json.loads(CATALOG.read_text(encoding="utf-8"))
    items = []
    changed = False
    game = {"schema_version": 1, "levels": {}}
    for slug, level in sorted(catalog["levels"].items()):
        exported = {"selected_variant": level.get("selected_variant"), "variants": {}}
        game["levels"][slug] = exported
        for variant_id, variant in sorted(level["variants"].items(), key=lambda pair: pair[1].get("generated_at", ""), reverse=True):
            if "walk_line" not in variant:
                variant["walk_line"] = default_walk_line(slug, variant_id)
                changed = True
            items.append({
                "id": slug, "name": level["display_name"],
                "title": variant.get("title", level["display_name"] + " — původní v1"),
                "description": variant.get("description", ""), "variant": variant_id,
                "status": "Produkční" if level.get("selected_variant") == variant_id else "Alternativa",
                "image": "../" + variant["background_master"], "source": "../" + variant["source"],
                "mechanic": variant.get("mechanic", ""), "size": variant["master_size"],
                "walkLine": variant["walk_line"],
            })
            exported["variants"][variant_id] = {
                "background_master": variant["background_master"], "master_size": variant["master_size"],
                "walk_line": variant["walk_line"],
            }
    if changed:
        write_catalog(CATALOG, catalog)
    (ROOT / "tool" / "level-variants.generated.js").write_text(
        "window.LEVEL_VARIANTS = " + json.dumps(items, ensure_ascii=False, indent=2) + ";\n", encoding="utf-8")
    write_catalog(ROOT / "graphics" / "levels" / "levels-game.generated.json", game)
    return len(items)


if __name__ == "__main__":
    print(f"Generated level gallery and game metadata for {build_level_data()} variant(s).")
