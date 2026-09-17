"""Recoverable catalog-only deletion. Never removes graphics or embedded snapshots."""
import json
import re
import uuid
from datetime import datetime, timezone
from pathlib import Path


def restored_name(name, records, replacing_id=None):
    """Return a readable, unique name for an item brought back from Trash."""
    base = re.sub(r' - koš(?: \d+)?$', '', name, flags=re.IGNORECASE).rstrip()
    prefix = f'{base} - koš'
    taken = {record.get('name', '').strip().casefold()
             for identifier, record in records.items() if identifier != replacing_id}
    candidate, number = prefix, 2
    while candidate.casefold() in taken:
        candidate = f'{prefix} {number}'
        number += 1
    return candidate


def change_trash(payload, path, allowed):
    collection = payload.get('collection')
    if collection not in allowed:
        raise ValueError('Neznámý druh položky.')
    catalog = json.loads(path.read_text(encoding='utf-8'))
    records = catalog[collection]
    mode, identifier = payload.get('mode'), payload.get('id')
    if not isinstance(identifier, str):
        raise ValueError('Chybí identifikátor položky.')
    trash = catalog.setdefault('trash', {})
    if mode == 'delete':
        previous = records.get(identifier)
        if previous is None or previous != payload.get('expectedRecord'):
            raise ValueError('Položka už neexistuje nebo se změnila v jiné kartě. Obnov seznam; nic se nesmazalo.')
        token = str(uuid.uuid4())
        trash[token] = {'collection': collection, 'record': previous,
                        'deleted_at': datetime.now(timezone.utc).isoformat()}
        del records[identifier]
        result = {'id': identifier, 'trash_id': token, 'record': previous}
    elif mode == 'restore':
        entry = trash.get(identifier)
        version = bool(entry and entry.get('saved_at'))
        expected_ok = entry == payload.get('expectedVersion') if version else bool(entry and entry.get('record') == payload.get('expectedRecord'))
        if not entry or entry['collection'] != collection or not expected_ok:
            raise ValueError('Položka koše se změnila; nic se neobnovilo.')
        selected_history = None
        if version and entry.get('history'):
            history_root = (Path(path).parent / 'history').resolve()
            selected_history = (Path(path).parent / entry['history']).resolve()
            if selected_history.parent != history_root or selected_history.suffix != '.json' or not selected_history.is_file():
                raise ValueError('Záloha animace už neexistuje; nic se neobnovilo.')
            snapshot = json.loads(selected_history.read_text(encoding='utf-8'))
            previous = snapshot.get('record')
            if not isinstance(previous, dict) or previous.get('id') != entry.get('record_id') or previous.get('name') != entry.get('name'):
                raise ValueError('Záloha animace neodpovídá Koši; nic se neobnovilo.')
        else:
            previous = entry['record']
        # Restore is a copy operation. Keep the Trash entry so the same saved
        # state can be recovered repeatedly. Reuse the original ID only when it
        # is free (this preserves existing links after a normal deletion);
        # otherwise create a sibling record instead of replacing active data.
        restored_id = previous['id'] if previous['id'] not in records else str(uuid.uuid4())
        previous = {**previous, 'id': restored_id,
                    'name': restored_name(previous['name'], records)}
        records[restored_id] = previous
        result = {'id': restored_id, 'record': previous,
                  'replaced': False, 'copied': True}
    else:
        raise ValueError('Neznámá operace koše.')
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temporary.replace(path)
    return {**result, 'collection': collection, 'trash': trash}
