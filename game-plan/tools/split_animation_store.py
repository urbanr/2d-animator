#!/usr/bin/env python3
"""Jednorazova migrace: rozepsat animace/animations.json na index + items/ + trash/.

Puvodni soubor se nejdriv zazalohuje do history/, aby byl krok vratny i bez gitu.
Spusteni je idempotentni - druhy beh uz jen prepise stejny vysledek.

    tools/split_animation_store.py [--dry-run]
"""
import json
import shutil
import sys
from datetime import datetime, timezone
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import animation_store  # noqa: E402

STORE = Path(__file__).resolve().parents[1] / 'graphics' / 'animace' / 'animations.json'


def main(dry_run=False):
    library = animation_store.load_library(STORE)
    animations = library.get(animation_store.COLLECTION, {})
    trash = library.get('trash', {})
    before = STORE.stat().st_size
    print(f'pred:  {STORE.name} {before // 1024} kB, {len(animations)} animaci, {len(trash)} v kosi')
    if dry_run:
        print('dry-run: nic se nezapsalo')
        return 0

    backup_dir = STORE.parent / 'history'
    backup_dir.mkdir(exist_ok=True)
    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    backup = backup_dir / f'animations-before-split-{stamp}.json'
    shutil.copy2(STORE, backup)
    print(f'zaloha: {backup.relative_to(STORE.parents[2])}')

    animation_store.save_library(STORE, library)

    after = STORE.stat().st_size
    items = sorted((STORE.parent / animation_store.ITEMS_DIRNAME).glob('*.json'))
    bin_dir = STORE.parent / animation_store.TRASH_DIRNAME
    trashed = sorted(bin_dir.glob('*.json')) if bin_dir.is_dir() else []
    print(f'po:    {STORE.name} {after // 1024} kB (index), '
          f'{len(items)} souboru v items/, {len(trashed)} v trash/')

    # Kontrola, ze se nic neztratilo - jinak je migrace k nicemu.
    reloaded = animation_store.load_library(STORE)
    if reloaded.get(animation_store.COLLECTION) != animations:
        print('CHYBA: zaznamy animaci se po rozepsani neshoduji!')
        return 1
    if json.dumps(reloaded.get('trash'), sort_keys=True) != json.dumps(trash, sort_keys=True):
        print('CHYBA: kos se po rozepsani neshoduje!')
        return 1
    print('kontrola: data po nacteni sedi')
    return 0


if __name__ == '__main__':
    sys.exit(main('--dry-run' in sys.argv[1:]))
