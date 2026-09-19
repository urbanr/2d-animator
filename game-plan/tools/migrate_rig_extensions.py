"""Idempotent additive migration. Retains old pixels and all animation settings."""
import json
import shutil
from datetime import datetime, timezone
from pathlib import Path

import animation_store

ROOT = Path(__file__).resolve().parents[1] / 'graphics'


def migrate(root=ROOT):
    root = Path(root)
    catalog_path = root / 'bitmapove-predlohy/skins.json'
    catalog = json.loads(catalog_path.read_text())
    pending = {}
    for id, entry in catalog['skins'].items():
        path = catalog_path.parent / entry['path']
        skin = json.loads(path.read_text())
        before = json.dumps(skin, sort_keys=True)
        skin['schema_version'] = 2
        for key, part in skin['parts'].items():
            if key == 'shoulders':
                continue
            part.setdefault('bone', key)
            part.setdefault('enabled', True)
            part.setdefault('opacity', 1)
        references = {
            'bezec-zombie-v1': '../../bitmapove-sekvence/bezec/pose-zombie-v2/frames/bezec-zombie-00.png',
            'soudruh-generalissimus-v1': '../../bitmapove-sekvence/boss-soudruh-generalissimus/rage-gray-v3/frames/boss-soudruh-walk-00.png',
        }
        if id in references and (path.parent / references[id]).exists():
            skin.setdefault('reference_image', references[id])
            skin.setdefault('reference_label', 'Celá postava · existující kreslená reference')
        if json.dumps(skin, sort_keys=True) != before:
            pending[path] = skin
    for bank in ('kostry/skeletons.json', 'animace/animations.json'):
        path = root / bank
        # Banka animaci je rozdelena na index + items/; syrove cteni by tu
        # prepisovalo stuby misto skutecnych zaznamu.
        data = animation_store.load_library(path)
        before = json.dumps(data, sort_keys=True)
        data['rig_format_version'] = 2
        for collection in ('clips', 'poses', 'rigs', 'finished_animations'):
            for record in data.get(collection, {}).values():
                record.setdefault('extra_bones', {})
                for key, part in record.get('bitmap', {}).get('parts', {}).items():
                    part.setdefault('bone', key)
                    part.setdefault('enabled', True)
                    part.setdefault('opacity', 1)
        if json.dumps(data, sort_keys=True) != before:
            pending[path] = data
    if not pending:
        return None
    backup = root / 'migration-backups' / ('rig-v2-' + datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%S%fZ'))
    for path in pending:
        destination = backup / path.relative_to(root)
        destination.parent.mkdir(parents=True, exist_ok=True)
        shutil.copy2(path, destination)
    for path, data in pending.items():
        if path.name == 'skin.json':
            temporary = path.with_suffix('.json.tmp')
            temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n')
            temporary.replace(path)
        else:
            animation_store.save_library(path, data)
    return backup


if __name__ == '__main__':
    print(migrate() or 'Already migrated.')
