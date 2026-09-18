"""Append or reload PNG parts and replace a reference image, with conflict checks and backups."""
import base64
import hashlib
import json
import struct
import uuid
import zlib
from pathlib import Path
from downscale_sprites import read_rgba_png
from pose_library import BASE_BONES

ROOT = Path(__file__).resolve().parents[1] / 'graphics/bitmapove-predlohy'


def save_template_image(payload, root=ROOT):
    root = Path(root).resolve()
    catalog = json.loads((root / 'skins.json').read_text())
    entry = catalog.get('templates', catalog.get('skins', {})).get(payload.get('id'))
    if not entry:
        raise ValueError('Neznámá bitmapová předloha.')
    target = (root / entry['path']).resolve()
    if not target.is_relative_to(root):
        raise ValueError('Neplatná cesta předlohy.')
    skin = json.loads(target.read_text())
    if payload.get('expectedRecord') != skin:
        raise ValueError('Předloha se mezitím změnila. Obnov stránku a přidej díl znovu.')
    mode = payload.get('mode')
    if mode not in ('add-part', 'replace-part', 'reference'):
        raise ValueError('Neplatná operace předlohy.')
    replaced = None
    if mode == 'replace-part':
        replaced = skin.get('parts', {}).get(payload.get('part'))
        if not replaced or replaced.get('source_part'):
            raise ValueError('Neznámý bitmapový díl předlohy.')
    label = payload.get('label', replaced['label'] if replaced else '')
    if not isinstance(label, str):
        raise ValueError('Název musí být text.')
    label = label.strip()
    if not 1 <= len(label) <= 100:
        raise ValueError('Zadej název do 100 znaků.')
    try:
        raw = base64.b64decode(payload.get('png', ''), validate=True)
    except (ValueError, TypeError) as error:
        raise ValueError('Neplatný PNG soubor.') from error
    if not 24 <= len(raw) <= 16 * 1024 * 1024 or raw[:8] != b'\x89PNG\r\n\x1a\n':
        raise ValueError('Vyber PNG do 16 MB.')
    width, height = struct.unpack('>II', raw[16:24])
    if not 1 <= width <= 8192 or not 1 <= height <= 8192 or width * height > 16_777_216:
        raise ValueError('Obrázek smí mít nejvýše 16 megapixelů.')
    token = uuid.uuid4().hex
    folder = target.parent / ('source' if mode == 'reference' else 'parts')
    folder.mkdir(exist_ok=True)
    image_path = folder / (token + '.png')
    with image_path.open('xb') as stream:
        stream.write(raw)
    try:
        image = read_rgba_png(image_path)
        if not any(image.pixels[3::4]):
            raise ValueError('Obrázek je úplně průhledný.')
    except (ValueError, struct.error, zlib.error, IndexError) as error:
        image_path.unlink()
        raise ValueError('PNG nelze načíst. Použij běžný 8bitový RGB nebo RGBA PNG.') from error
    previous = json.loads(target.read_text())
    relative = str(image_path.relative_to(target.parent))
    if mode == 'reference':
        skin['reference_image'] = relative
        skin['reference_label'] = label
    elif mode == 'replace-part':
        part = skin['parts'][payload['part']]
        # Joint handles are calibrated in pixels: rescale them when the redrawn part changed size.
        old_width, old_height = part.get('size', [width, height])
        if [old_width, old_height] != [width, height] and old_width and old_height:
            for handle in ('start', 'end'):
                if isinstance(part.get(handle), list) and len(part[handle]) == 2:
                    part[handle] = [part[handle][0] * width / old_width, part[handle][1] * height / old_height]
        part.update({'label': label, 'file': relative, 'size': [width, height],
            'sha256': hashlib.sha256(raw).hexdigest()})
    else:
        bone = payload.get('bone', 'torso')
        if bone not in BASE_BONES:
            image_path.unlink()
            raise ValueError('Neznámá výchozí kost.')
        key = 'part_' + token
        skin.setdefault('parts', {})[key] = {'label': label, 'file': relative, 'size': [width, height],
            'start': [width / 2, height * .25], 'end': [width / 2, height * .75 if height > 1 else 1.5],
            'bone': bone, 'enabled': False, 'opacity': 1, 'fixed_length': 40,
            'sha256': hashlib.sha256(raw).hexdigest(), 'offset': [0, 0], 'rotation': 0, 'scale': 1}
        skin.setdefault('layers', []).append(key)
    skin['schema_version'] = 2
    history = target.parent / 'history'
    history.mkdir(exist_ok=True)
    (history / (token + '.json')).write_text(json.dumps(previous, ensure_ascii=False, indent=2) + '\n')
    temporary = target.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(skin, ensure_ascii=False, indent=2) + '\n')
    temporary.replace(target)
    return {'record': skin, 'file': relative}
