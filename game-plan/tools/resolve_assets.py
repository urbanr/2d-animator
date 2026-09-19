#!/usr/bin/env python3
"""Rozplete retez datovych bank: postava -> animace -> kostra/skin -> soubory.

Smysl: odpovedet na "co vsechno drzi tahle postava" bez cteni 230 kB JSONu.

    tools/resolve_assets.py                 # seznam postav
    tools/resolve_assets.py generalis       # retez pro postavu (substring jmena nebo id)
    tools/resolve_assets.py check           # integritni kontrola vsech bank
    tools/resolve_assets.py generalis --json

Cte jen katalogy, nic nezapisuje.
"""
import json
import sys
import unicodedata
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import animation_store  # noqa: E402

GRAPHICS = Path(__file__).resolve().parents[1] / "graphics"
BANKS = {
    "animations": "animace/animations.json",
    "skeletons": "kostry/skeletons.json",
    "skins": "bitmapove-predlohy/skins.json",
    "characters": "postavy/game-characters.json",
}


def load(name):
    path = GRAPHICS / BANKS[name]
    # Banka animaci je rozdelena na index + items/ - adapter ji slozi zpatky.
    if name == "animations":
        return animation_store.load_library(path)
    return json.loads(path.read_text())


def fold(text):
    """Porovnani bez diakritiky a velikosti pismen - uzivatel pise 'bezec', ne 'Běžec'."""
    nfkd = unicodedata.normalize("NFKD", text.lower())
    return "".join(c for c in nfkd if not unicodedata.combining(c))


def kb(obj):
    return len(json.dumps(obj, ensure_ascii=False)) // 1024


def resolve_skin(skins, skin_id):
    """Vrati (zaznam v skins.json, nactene skin.json, adresar skinu)."""
    entry = skins.get("skins", {}).get(skin_id)
    if entry is None:
        return None, None, None
    path = GRAPHICS / "bitmapove-predlohy" / entry["path"]
    detail = json.loads(path.read_text()) if path.is_file() else None
    return entry, detail, path.parent


def describe(character, banks):
    """Kompletni retez jedne postavy jako slovnik - spolecny zaklad textu i --json."""
    animations, skins = banks["animations"], banks["skins"]
    out = {
        "id": character["id"],
        "name": character.get("name"),
        "renderer": character.get("renderer"),
        "default_animation_id": character.get("default_animation_id"),
        "animations": [],
        "problems": [],
    }
    for aid in character.get("animation_ids", []):
        anim = animations.get("finished_animations", {}).get(aid)
        if anim is None:
            out["problems"].append(f"animation_id {aid} neni ve finished_animations")
            continue
        skin_id = anim.get("skin_id")
        entry, detail, skin_dir = resolve_skin(skins, skin_id) if skin_id else (None, None, None)
        if skin_id and entry is None:
            out["problems"].append(f"animace {aid}: skin_id {skin_id} neni v skins.json")
        missing = []
        parts = (detail or {}).get("parts", {})
        for part in parts.values():
            if not (skin_dir / part["file"]).is_file():
                missing.append(part["file"])
        if missing:
            out["problems"].append(f"skin {skin_id}: chybi {len(missing)} dilu ({missing[0]} ...)")
        out["animations"].append({
            "id": aid,
            "name": anim.get("name"),
            "frames": len(anim.get("frames", [])),
            "fps": anim.get("fps"),
            "move_speed_pt_s": anim.get("move_speed_pt_s"),
            "size_kb": kb(anim),
            "skin_id": skin_id,
            "skin_name": (entry or {}).get("name"),
            "skin_dir": str(skin_dir.relative_to(GRAPHICS.parent)) if skin_dir else None,
            "default_clip": (detail or {}).get("default_clip"),
            "parts": len(parts),
            "missing_files": missing,
        })
    return out


def print_chain(info):
    print(f"{info['name']}  [{info['id'][:8]}]")
    print(f"  renderer: {info['renderer']}   animaci: {len(info['animations'])}")
    for a in info["animations"]:
        star = "*" if a["id"] == info["default_animation_id"] else "-"
        print(f"  {star} {a['name']}  [{a['id'][:8]}]  {a['frames']} snimku @{a['fps']}fps"
              f"  {a['move_speed_pt_s']} pt/s  {a['size_kb']} kB")
        print(f"      skin: {a['skin_id']} ({a['skin_name']})  {a['parts']} dilu"
              f"  {'CHYBI ' + str(len(a['missing_files'])) if a['missing_files'] else 'soubory OK'}")
        print(f"      clip: {a['default_clip']}")
        print(f"      dir:  {a['skin_dir']}")
    for p in info["problems"]:
        print(f"  ! {p}")


def cmd_list(banks):
    chars = banks["characters"].get("characters", {})
    anims = banks["animations"].get("finished_animations", {})
    print(f"postav: {len(chars)}   hotovych animaci: {len(anims)}"
          f"   skinu: {len(banks['skins'].get('skins', {}))}"
          f"   klipu: {len(banks['skeletons'].get('clips', {}))}")
    for c in chars.values():
        print(f"  {c.get('name')}  [{c['id'][:8]}]  animaci: {len(c.get('animation_ids', []))}")


def cmd_check(banks):
    """Najde viseci odkazy napric bankami. Navratovy kod 1 = neco je rozbite."""
    problems = []
    anims = banks["animations"].get("finished_animations", {})
    skins = banks["skins"].get("skins", {})
    clips = banks["skeletons"].get("clips", {})

    for c in banks["characters"].get("characters", {}).values():
        for aid in c.get("animation_ids", []):
            if aid not in anims:
                problems.append(f"postava {c.get('name')}: viseci animation_id {aid}")
        did = c.get("default_animation_id")
        if did and did not in c.get("animation_ids", []):
            problems.append(f"postava {c.get('name')}: default_animation_id neni v animation_ids")

    for aid, a in anims.items():
        sid = a.get("skin_id")
        if not sid:
            problems.append(f"animace {a.get('name')} [{aid[:8]}]: chybi povinny skin_id")
        elif sid not in skins:
            problems.append(f"animace {a.get('name')} [{aid[:8]}]: viseci skin_id {sid}")

    for sid in skins:
        _, detail, skin_dir = resolve_skin(banks["skins"], sid)
        if detail is None:
            problems.append(f"skin {sid}: nejde nacist skin.json")
            continue
        clip = detail.get("default_clip")
        if clip and clip not in clips:
            problems.append(f"skin {sid}: viseci default_clip {clip}")
        missing = [p["file"] for p in detail.get("parts", {}).values()
                   if not (skin_dir / p["file"]).is_file()]
        if missing:
            problems.append(f"skin {sid}: chybi {len(missing)} dilu ({missing[0]} ...)")

    for p in problems:
        print(f"! {p}")
    print(f"{'OK - zadny viseci odkaz' if not problems else str(len(problems)) + ' problemu'}")
    return 1 if problems else 0


def main(argv):
    as_json = "--json" in argv
    args = [a for a in argv if not a.startswith("--")]
    banks = {name: load(name) for name in BANKS}

    if not args:
        return cmd_list(banks) or 0
    if args[0] == "check":
        return cmd_check(banks)

    needle = fold(args[0])
    hits = [c for c in banks["characters"].get("characters", {}).values()
            if needle in fold(c.get("name", "")) or c["id"].startswith(args[0])]
    if not hits:
        print(f"zadna postava neodpovida {args[0]!r}")
        return 1
    for c in hits:
        info = describe(c, banks)
        if as_json:
            print(json.dumps(info, ensure_ascii=False, indent=2))
        else:
            print_chain(info)
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
