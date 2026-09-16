"""Recoverable catalog-only deletion. Never removes graphics or embedded snapshots."""
import json
import uuid
from datetime import datetime, timezone


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
        if not entry or entry['collection'] != collection or entry['record'] != payload.get('expectedRecord'):
            raise ValueError('Položka koše se změnila; nic se neobnovilo.')
        previous = entry['record']
        if previous['id'] in records:
            raise ValueError('Toto ID už existuje. Obnova nic nepřepíše.')
        records[previous['id']] = previous
        del trash[identifier]
        result = {'id': previous['id'], 'record': previous}
    else:
        raise ValueError('Neznámá operace koše.')
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(catalog, ensure_ascii=False, indent=2)+'\n', encoding='utf-8')
    temporary.replace(path)
    return {**result, 'collection': collection, 'trash': trash}
