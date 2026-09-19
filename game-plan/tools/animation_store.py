"""Rozdeleny ulozny format banky animaci: index + jeden soubor na animaci.

Duvod: `animace/animations.json` narostl na 230 kB, protoze kazdy zaznam nese
snapshot kostry i bitmapy. Cist kvuli jedne animaci cely soubor je plytvani -
at uz to dela clovek, fulltext nebo agent.

Na disku:

    animace/animations.json      index: schema_version a u kazde animace i polozky
                                 kose jen stub {id, name, skin_id, fps, frames, file}
    animace/items/<id>.json      cely zaznam animace
    animace/trash/<token>.json   cely zaznam smazane animace

V pameti se nic nemeni: `load_library` vrati stejny slovnik jako drive
(`finished_animations` -> cele zaznamy), `save_library` ho zase rozlozi.
Volajici kod (save_pose, change_trash) proto pracuje dal se stejnym tvarem.

Starsi format (cele zaznamy primo v indexu) se cte beze zmeny - stub se pozna
podle klice `file`. Diky tomu je prechod obousmerny a migrace nemusi byt atomicka.
"""
import json
from pathlib import Path

ITEMS_DIRNAME = 'items'
TRASH_DIRNAME = 'trash'
COLLECTION = 'finished_animations'

# Co zustava v indexu, aby slo vypsat seznam animaci bez otevirani jednotlivych souboru.
STUB_KEYS = ('id', 'name', 'skin_id', 'fps', 'move_speed_pt_s', 'created_at', 'updated_at')


def _read_json(path):
    return json.loads(Path(path).read_text(encoding='utf-8'))


def _write_json(path, data):
    """Atomicky - stejne jako puvodni save_pose, aby pad uprostred nerozbil banku."""
    path = Path(path)
    temporary = path.with_name(path.name + '.tmp')
    temporary.write_text(json.dumps(data, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)


def is_stub(entry):
    return isinstance(entry, dict) and 'file' in entry


def _resolve(path, relative):
    target = Path(path).parent / relative
    if not target.is_file():
        raise ValueError(f'Banka animaci odkazuje na chybejici soubor {relative}.')
    return target


def load_library(path):
    """Nacte banku vcetne rozepsanych animaci. Vraci stejny tvar jako drive."""
    path = Path(path)
    library = _read_json(path)
    entries = library.get(COLLECTION)
    if not isinstance(entries, dict):
        return library
    for key, entry in list(entries.items()):
        if not is_stub(entry):
            continue
        entries[key] = _read_json(_resolve(path, entry['file']))

    # Kos: smazana animace nese cely zaznam, ktery by index zase nafoukl.
    for token, entry in list(library.get('trash', {}).items()):
        if not is_stub(entry):
            continue
        # `record_id` a `name` jsou jen zkratka pro vypis kose; v puvodnim
        # zaznamu nebyly, takze se pri nacteni zahazuji - jinak by se rozesel
        # `expectedRecord` pri obnove z kose.
        restored = {k: v for k, v in entry.items()
                    if k not in ('file', 'record_id', 'name')}
        restored['record'] = _read_json(_resolve(path, entry['file']))
        library['trash'][token] = restored
    return library


def save_library(path, library):
    """Ulozi banku; animace rozepise do items/ a v indexu necha jen stuby."""
    path = Path(path)
    entries = library.get(COLLECTION)
    if not isinstance(entries, dict):
        _write_json(path, library)
        return

    items_dir = path.parent / ITEMS_DIRNAME
    items_dir.mkdir(exist_ok=True)
    index = dict(library)
    stubs = {}
    for key, record in entries.items():
        if is_stub(record):        # uz je to stub - nemame z ceho psat soubor
            stubs[key] = record
            continue
        relative = f'{ITEMS_DIRNAME}/{key}.json'
        _write_json(path.parent / relative, record)
        stub = {field: record[field] for field in STUB_KEYS if field in record}
        stub['frames'] = len(record.get('frames', []))
        stub['file'] = relative
        stubs[key] = stub
    index[COLLECTION] = stubs

    trash_stubs = {}
    for token, entry in library.get('trash', {}).items():
        record = entry.get('record') if isinstance(entry, dict) else None
        if not isinstance(record, dict):
            trash_stubs[token] = entry          # stub na historii, nic k rozepsani
            continue
        relative = f'{TRASH_DIRNAME}/{token}.json'
        (path.parent / TRASH_DIRNAME).mkdir(exist_ok=True)
        _write_json(path.parent / relative, record)
        trash_stubs[token] = {**{k: v for k, v in entry.items() if k != 'record'},
                              'record_id': record.get('id'), 'name': record.get('name'),
                              'file': relative}
    if 'trash' in library:
        index['trash'] = trash_stubs

    _write_json(path, index)
    _prune(items_dir, {f'{key}.json' for key in stubs})
    _prune(path.parent / TRASH_DIRNAME,
           {Path(e['file']).name for e in trash_stubs.values() if is_stub(e)})


def _prune(directory, keep):
    """Osirele soubory po smazanych zaznamech - jinak je najde fulltext i grep."""
    if not directory.is_dir():
        return
    for orphan in directory.glob('*.json'):
        if orphan.name not in keep:
            orphan.unlink()
