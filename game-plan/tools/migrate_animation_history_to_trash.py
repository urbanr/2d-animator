#!/usr/bin/env python3
"""Expose existing animation history snapshots as recoverable trash versions."""
import json
import uuid
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
ANIMATIONS = ROOT / 'graphics' / 'animace' / 'animations.json'


def migrate(path=ANIMATIONS, history=None):
    path = Path(path)
    history = Path(history) if history is not None else path.parent / 'history'
    catalog = json.loads(path.read_text(encoding='utf-8'))
    trash = catalog.setdefault('trash', {})
    known = {entry.get('history') for entry in trash.values()}
    added = 0
    for token, entry in trash.items():
        if entry.get('saved_at') and isinstance(entry.get('record'), dict):
            record = entry.pop('record');reference = entry.get('history') or 'history/' + token + '.json'
            snapshot = path.parent / reference;snapshot.parent.mkdir(exist_ok=True)
            if not snapshot.exists():
                snapshot.write_text(json.dumps({'saved_at': entry['saved_at'], 'record': record}, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
            entry.update(record_id=record['id'], name=record['name'], history=reference);known.add(reference);added += 1
    for snapshot in sorted(history.glob('*.json')) if history.exists() else []:
        reference = 'history/' + snapshot.name
        if reference in known:
            continue
        value = json.loads(snapshot.read_text(encoding='utf-8'))
        record, saved_at = value.get('record'), value.get('saved_at')
        if not isinstance(record, dict) or not isinstance(record.get('id'), str) or not isinstance(saved_at, str):
            continue
        token = snapshot.stem
        if token in trash:
            token = str(uuid.uuid4())
        trash[token] = {'collection': 'finished_animations', 'record_id': record['id'],
                        'name': record['name'],
                        'saved_at': saved_at, 'history': reference}
        known.add(reference);added += 1
    if added:
        temporary = path.with_suffix('.json.tmp')
        temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
        temporary.replace(path)
    return added


if __name__ == '__main__':
    print(f'Added {migrate()} saved animation versions to trash.')
