#!/usr/bin/env python3
"""Build the auditable generated/not-generated inventory for game art."""

from __future__ import annotations

import json
from datetime import datetime, timezone
from pathlib import Path


ROOT = Path(__file__).resolve().parent.parent
GRAPHICS = ROOT / "graphics"
SEQUENCES = GRAPHICS / "bitmapove-sekvence"
OUTPUT = SEQUENCES / "asset-production-status.json"

REGULAR = [
    ("loudac", "Loudač"), ("bezec", "Běžec"), ("boxer", "Boxer"),
    ("stitonos", "Štítonoš"), ("lezec", "Lezec"), ("hazec", "Házeč"),
    ("puskar", "Puškař"), ("sebevrah-s-bombou", "Sebevrah s bombou"),
    ("zlodej", "Zloděj"), ("vozik", "Vozík"), ("rojnice", "Rojnice (30 krys)"),
    ("saman", "Šaman"), ("duchodce-s-holi", "Důchodce s holí"),
    ("kopac", "Kopáč"), ("cernobylak", "Černobylák"),
    ("nosic-zebriku", "Nosič žebříku"), ("hejno-holubu", "Hejno holubů"),
    ("knez-zkazy", "Kněz zkázy"),
    ("chlap-s-traktorovou-pneumatikou", "Chlap s traktorovou pneumatikou"),
    ("prodavac", "Prodavač"), ("ozrala", "Ožrala"), ("fotograf", "Fotograf"),
    ("spekoun", "Špekoun"), ("sekta-zrcadel", "Sekta zrcadel"),
    ("babka-dealerka", "Babka dealerka"), ("chlap-v-bubline", "Chlap v bublině"),
    ("snehulak-z-popela", "Sněhulák z popela"),
    ("krizenec-prasete-a-motorky", "Kříženec prasete a motorky"),
    ("zubar", "Zubař"), ("chlap-s-mikrovlnkou", "Chlap s mikrovlnkou"),
    ("kolona-duchodcu-na-vozikach", "Kolona důchodců na vozících"),
    ("ex", "Ex"), ("vlk-v-prestrojeni-za-kutila", "Vlk v přestrojení za Kutila"),
]

BOSSES = [
    ("boss-babicka-s-valeckem", "Babička s válečkem"),
    ("boss-traktor", "Traktor"), ("boss-kolos-z-lednicek", "Kolos z ledniček"),
    ("boss-byvaly-starosta", "Bývalý starosta"), ("prerostly-kanec", "Přerostlý kanec"),
    ("boss-tchyne", "Tchyně"), ("boss-zeppelin-z-matraci", "Zeppelin z matrací"),
    ("boss-dvojcata", "Dvojčata"), ("procedural-previous-run", "Ty z minulého běhu"),
    ("boss-matka-vsech-krys", "Matka všech krys"), ("boss-retez", "Řetěz"),
    ("boss-soudruh-generalissimus", "Soudruh Generalissimus"),
    ("boss-profesor-relativita", "Profesor Relativita"),
]

LEVELS = [
    ("rovina-u-dalnice", "Rovina u dálnice"), ("svah", "Svah"),
    ("most-pres-propast", "Most přes propast"), ("skladka", "Skládka"),
    ("strecha-panelaku", "Střecha paneláku"), ("zamrzly-rybnik", "Zamrzlý rybník"),
    ("vrakoviste-aut", "Vrakoviště aut"), ("tunel-metra", "Tunel metra"),
    ("prehrada", "Přehrada"), ("kolotoc-z-pouti", "Kolotoč z pouti"),
    ("telocvicna", "Tělocvična"), ("hrbitov", "Hřbitov"),
    ("benzinka", "Benzinka"), ("sidliste", "Sídliště"),
]


def main() -> None:
    catalog = json.loads((GRAPHICS / "bitmapove-sekvence" / "sprite-variants.json").read_text(encoding="utf-8"))
    characters = catalog["characters"]
    level_catalog = json.loads((GRAPHICS / "levely" / "levels.json").read_text(encoding="utf-8"))

    regular = []
    for slug, name in REGULAR:
        entry = characters.get(slug)
        regular.append({
            "id": slug, "name": name, "generated": bool(entry and entry.get("variants")),
            "selected_variant": entry.get("selected_variant") if entry else None,
            "review": "production" if entry and entry.get("selected_variant") else "needs-review",
            "variants": sorted(entry.get("variants", {})) if entry else [],
        })

    bosses = []
    for slug, name in BOSSES:
        if slug == "procedural-previous-run":
            bosses.append({"id": slug, "name": name, "generated": False, "review": "not-needed",
                           "reason": "Vzniká za běhu jako kopie skutečné pevnosti z předchozí prohry."})
            continue
        if slug == "prerostly-kanec":
            frames = sorted((SEQUENCES / slug / "rage-gray-v2" / "frames").glob("*.png"))
            bosses.append({"id": slug, "name": name, "generated": len(frames) == 8,
                           "review": "existing-candidate", "frames": len(frames)})
            continue
        entry = characters.get(slug)
        bosses.append({"id": slug, "name": name, "generated": bool(entry and entry.get("variants")),
                       "selected_variant": entry.get("selected_variant") if entry else None,
                       "review": "needs-review", "variants": sorted(entry.get("variants", {})) if entry else []})

    levels = []
    for slug, name in LEVELS:
        entry = level_catalog["levels"].get(slug)
        levels.append({"id": slug, "name": name, "generated": bool(entry and entry.get("variants")),
                       "selected_variant": entry.get("selected_variant") if entry else None,
                       "review": "needs-review", "variants": sorted(entry.get("variants", {})) if entry else []})

    output = {
        "schema_version": 1,
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "summary": {
            "regular_characters": {"generated": sum(item["generated"] for item in regular), "total": len(regular)},
            "static_bosses": {"generated": sum(item["generated"] for item in bosses if item["id"] != "procedural-previous-run"), "total": len(bosses) - 1},
            "procedural_bosses": {"not_needed": 1, "total": 1},
            "levels": {"generated": sum(item["generated"] for item in levels), "total": len(levels)},
        },
        "regular_characters": regular,
        "bosses": bosses,
        "levels": levels,
        "extra_existing_character": {"id": "chuchvalec", "generated": True, "review": "existing-art"},
    }
    OUTPUT.write_text(json.dumps(output, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(json.dumps(output["summary"], ensure_ascii=False))


if __name__ == "__main__":
    main()
