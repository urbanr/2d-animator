"""Pose alternatives and explicit, conflict-checked animation updates with backups."""
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path

import animation_store

GRAPHICS = Path(__file__).resolve().parent.parent / 'graphics'
SKELETON_STORE = GRAPHICS / 'kostry' / 'skeletons.json'
ANIMATION_STORE = GRAPHICS / 'animace' / 'animations.json'
# Compatibility for older callers: the pose editor works with the skeleton bank.
STORE = SKELETON_STORE
LIMITS = {'bodyX': (-200, 200), 'bodyY': (-100, 100), 'bodyLean': (-180, 180), 'shoulders': (-180, 180), 'pelvis': (-180, 180),
          'shoulderWidth': (-300, 300), 'pelvisWidth': (-300, 300),
          'neck': (-180, 180), 'head': (-180, 180)}
for side in ('near', 'far'):
    for joint in ('Shoulder', 'Elbow', 'Hip', 'Knee'):
        LIMITS[side + joint] = (-180, 180)
    LIMITS[side + 'Foot'] = (-180, 180)
ROOT_OFFSETS = {side+joint+'Offset'+axis: (-100, 100) for side in ('near','far') for joint in ('Shoulder','Hip') for axis in ('X','Y')}
ROOT_OFFSETS.update({joint+'Offset'+axis: (-100,100) for joint in ('head','neck') for axis in ('X','Y')})
LIMITS.update(ROOT_OFFSETS)
ANGLE_KEYS = {key for key, bounds in LIMITS.items() if bounds == (-180, 180)}
DEFAULT_JOINT_LIMITS = {key: [-180, 180] for key in ANGLE_KEYS}
DEFAULT_LENGTHS = {side+bone: length for side in ('near','far') for bone,length in {'UpperArm':46,'Forearm':44,'Thigh':70,'Shin':74,'Foot':25}.items()}
PART_KEYS = set(DEFAULT_LENGTHS) | {'head', 'torso', 'backpack'}
DEFAULT_LENGTHS.update(head=21, neck=18, torso=94)
BASE_BONES = set(DEFAULT_LENGTHS) | {'pelvis', 'backpack', 'megaphone'}


def validate_extra_bones(value=None):
    value = {} if value is None else value
    if not isinstance(value, dict) or len(value) > 128:
        raise ValueError('Neplatné přidané kosti.')
    out = {}
    for key, bone in value.items():
        validate_reference(key, 'kost')
        if not key.startswith('extra_') or key in BASE_BONES or not isinstance(bone, dict) or set(bone) != {'label', 'parent', 'at', 'offset', 'length', 'angle'}:
            raise ValueError('Neplatná přidaná kost.')
        if not isinstance(bone['label'], str) or not 1 <= len(bone['label'].strip()) <= 100:
            raise ValueError('Neplatný název kosti.')
        if not isinstance(bone['offset'], list) or len(bone['offset']) != 2:
            raise ValueError('Neplatný posun kosti.')
        out[key] = dict(label=bone['label'], parent=validate_reference(bone['parent'], 'rodiče kosti'),
                        at=bounded(bone['at'], 0, 1), length=bounded(bone['length'], 1, 1000),
                        angle=bounded(bone['angle'], -180, 180), offset=[bounded(v, -2000, 2000) for v in bone['offset']])
    visited, active = set(), set()
    def visit(key):
        if key in BASE_BONES or key in visited:
            return
        if key in active or key not in out:
            raise ValueError('Kosti tvoří kruh nebo chybí rodič.')
        active.add(key)
        visit(out[key]['parent'])
        active.remove(key)
        visited.add(key)
    for key in out:
        visit(key)
    return out


def validate_extra_pose(value):
    if not isinstance(value, dict) or len(value) > 128:
        raise ValueError('Neplatná póza přidaných kostí.')
    out = {}
    for key, pose in value.items():
        validate_reference(key, 'kost')
        if not key.startswith('extra_') or not isinstance(pose, dict) or set(pose)-{'angle', 'x', 'y'}:
            raise ValueError('Neplatná póza přidané kosti.')
        out[key] = {k: bounded(v, -180 if k == 'angle' else -2000, 180 if k == 'angle' else 2000) for k, v in pose.items()}
    return out


def bounded(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'Neplatná hodnota úpravy ({low} až {high}).')
    return value


def validate_reference(value, label):
    if not isinstance(value, str) or not 1 <= len(value) <= 120 or any(not (ch.isalnum() or ch in '-_.:') for ch in value):
        raise ValueError(f'Neplatný odkaz na {label}.')
    return value


def validate_bitmap(value):
    if not isinstance(value, dict) or set(value) != {'layers', 'parts'}:
        raise ValueError('Animace musí obsahovat bitmapovou předlohu.')
    layers = value.get('layers')
    parts = value.get('parts')
    if (not isinstance(layers, list) or not layers or len(layers) != len(set(layers)) or
            any(not isinstance(key, str) or not key for key in layers) or not isinstance(parts, dict) or
            set(parts) != set(layers)):
        raise ValueError('Neplatná bitmapová předloha animace.')
    return {'layers': list(layers), 'parts': {key: validate_part_transform(parts[key]) for key in layers}}


def validate_joint_fade(value):
    if not isinstance(value, dict) or set(value)-{'start', 'end'}:
        raise ValueError('Neplatný přechod spoje.')
    out = {}
    for end, fade in value.items():
        if not isinstance(fade, dict) or not {'strength', 'radius', 'direction'} <= set(fade) or set(fade)-{'strength', 'radius', 'radius2', 'shape', 'onset', 'outset', 'direction', 'offset', 'angle'} or fade['direction'] not in ('outward', 'inward'):
            raise ValueError('Neplatný přechod spoje.')
        out[end] = {'strength': bounded(fade['strength'], 0, 1),
                    'radius': bounded(fade['radius'], 1, 2000), 'direction': fade['direction']}
        if 'radius2' in fade:
            out[end]['radius2'] = bounded(fade['radius2'], 1, 2000)
        if 'shape' in fade:
            if fade['shape'] not in ('ellipse', 'rectangle'):
                raise ValueError('Neplatný tvar přechodu spoje.')
            out[end]['shape'] = fade['shape']
        if 'onset' in fade:
            out[end]['onset'] = bounded(fade['onset'], 0, .95)
        if 'outset' in fade:
            out[end]['outset'] = bounded(fade['outset'], 0, .95)
        # Nabeh a dobeh se nesmi potkat ani prejet - mezi nimi zustava 10 %,
        # jinak by prechod zdegeneroval na skok.
        if out[end].get('onset', 0) + out[end].get('outset', 0) > .9 + 1e-9:
            raise ValueError('Náběh a doběh přechodu musí dělit aspoň 10 %.')
        if 'angle' in fade:
            out[end]['angle'] = bounded(fade['angle'], -180, 180)
        if 'offset' in fade:
            if not isinstance(fade['offset'], list) or len(fade['offset']) != 2:
                raise ValueError('Neplatný posun přechodu.')
            out[end]['offset'] = [bounded(v, -2000, 2000) for v in fade['offset']]
    return out


def validate_part_transform(value, exception=False):
    if not isinstance(value, dict) or set(value)-{'offset', 'pivot_offset', 'warp', 'rotation', 'scale', 'scale_x', 'scale_y', 'joint_fade', 'bone', 'source_part', 'enabled', 'opacity', 'fixed_length'}:
        raise ValueError('Neplatná úprava bitmapového dílu.')
    out = {}
    for key in ('bone', 'source_part'):
        if key in value:
            out[key] = validate_reference(value[key], key)
    if 'enabled' in value:
        if type(value['enabled']) is not bool:
            raise ValueError('Použití bitmapy musí být ano/ne.')
        out['enabled'] = value['enabled']
    if 'opacity' in value:
        out['opacity'] = bounded(value['opacity'], 0, 1)
    if 'fixed_length' in value:
        out['fixed_length'] = None if value['fixed_length'] is None else bounded(value['fixed_length'], .001, 2000)
    if 'pivot_offset' in value:
        if not isinstance(value['pivot_offset'], list) or len(value['pivot_offset']) != 2:
            raise ValueError('Rotační střed musí být dvojice čísel.')
        limit = 4000 if exception else 2000
        out['pivot_offset'] = [bounded(v, -limit, limit) for v in value['pivot_offset']]
    if 'joint_fade' in value:
        out['joint_fade'] = validate_joint_fade(value['joint_fade'])
    if 'offset' in value:
        if not isinstance(value['offset'], list) or len(value['offset']) != 2:
            raise ValueError('Posun musí být dvojice čísel.')
        limit = 4000 if exception else 2000
        out['offset'] = [bounded(v, -limit, limit) for v in value['offset']]
    if 'warp' in value:
        limit = 4000 if exception else 2000
        if (not isinstance(value['warp'], list) or len(value['warp']) != 4 or
                any(not isinstance(point, list) or len(point) != 2 for point in value['warp'])):
            raise ValueError('Warp musí obsahovat čtyři rohové posuny.')
        out['warp'] = [[bounded(axis, -limit, limit) for axis in point] for point in value['warp']]
    if 'rotation' in value:
        out['rotation'] = bounded(value['rotation'], -180, 180)
    for axis in ('scale', 'scale_x', 'scale_y'):
        if axis in value:
            out[axis] = bounded(value[axis], .01 if exception else .1, 100 if exception else 10)
    return out


def validate_frame_edits(value, frames, lengths):
    if value is None:
        return {}
    if not isinstance(value, dict):
        raise ValueError('Neplatné výjimky snímků.')
    out = {}
    for index, edit in value.items():
        if not isinstance(index, str) or index not in {str(i) for i in range(len(frames))} or not isinstance(edit, dict) or set(edit)-{'pose_base', 'lengths', 'parts'}:
            raise ValueError('Neplatný snímek výjimky.')
        out[index] = {}
        for section, entries in edit.items():
            allowed = {'pose_base': set(LIMITS), 'lengths': set(DEFAULT_LENGTHS), 'parts': PART_KEYS}[section]
            if not isinstance(entries, dict) or (section != 'parts' and set(entries)-allowed):
                raise ValueError('Neplatné položky výjimky.')
            result = {}
            for key, v in entries.items():
                if section == 'pose_base':
                    result[key] = bounded(v, *LIMITS[key])
                elif section == 'lengths':
                    result[key] = bounded(v, .02, 50)
                    bounded(lengths[key]*v, 5-1e-8, 250+1e-8)
                else:
                    validate_reference(key, 'bitmapový díl')
                    result[key] = validate_part_transform(v, exception=True)
            out[index][section] = result
    return out


def validate_lengths(value=None):
    if value is None:
        return dict(DEFAULT_LENGTHS)
    if not isinstance(value, dict) or set(value)-set(DEFAULT_LENGTHS):
        raise ValueError('Neplatné délky kostí.')
    result = {**DEFAULT_LENGTHS, **value}
    for key, length in result.items():
        if isinstance(length, bool) or not isinstance(length, (int,float)) or not math.isfinite(length) or not 5 <= length <= 250:
            raise ValueError(f'{key}: délka musí být 5 až 250.')
    return result


def validate_joint_limits(value=None):
    if value is None:
        return {key: list(bounds) for key, bounds in DEFAULT_JOINT_LIMITS.items()}
    if not isinstance(value, dict) or set(value)-ANGLE_KEYS:
        raise ValueError('Neplatné limity kloubů.')
    result = validate_joint_limits()
    for key, pair in value.items():
        if not isinstance(pair, list) or len(pair) != 2:
            raise ValueError('Limit kloubu musí obsahovat minimum a maximum.')
        low, high = pair
        low = bounded(low, -180, 180)
        high = bounded(high, -180, 180)
        if low > high:
            raise ValueError('Minimum kloubu nesmí být větší než maximum.')
        result[key] = [low, high]
    return result


def validate_frame(frame):
    # Legacy saved poses retain their original full-width geometry.
    extra_pose = frame.get('extra_pose') if isinstance(frame, dict) else None
    if isinstance(frame, dict):
        frame = {k: v for k, v in frame.items() if k != 'extra_pose'}
        frame = {**dict.fromkeys(ROOT_OFFSETS,0), 'bodyX': 0, 'shoulderWidth': 100, 'pelvisWidth': 100, 'bodyLean': 0, **frame}
    if not isinstance(frame, dict) or set(frame) != set(LIMITS):
        raise ValueError('Póza musí obsahovat všechny klouby.')
    result = {}
    for key, (low, high) in LIMITS.items():
        value = frame[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f'{key}: povolený rozsah je {low} až {high}.')
        result[key] = value
    if extra_pose is not None:
        result['extra_pose'] = validate_extra_pose(extra_pose)
    return result


def save_pose(payload, path=None):
    name = payload.get('name')
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
        raise ValueError('Zadej název do 100 znaků.')
    kind = payload.get('kind')
    record = {'id': str(uuid.uuid4()), 'name': name.strip(),
              'created_at': datetime.now(timezone.utc).isoformat()}
    if kind == 'pose':
        record['frame'] = validate_frame(payload.get('frame'))
        if 'rig_lengths' in payload:
            record['rig_lengths'] = validate_lengths(payload.get('rig_lengths'))
        if 'joint_limits' in payload:
            record['joint_limits'] = validate_joint_limits(payload.get('joint_limits'))
        collection = 'poses'
    elif kind == 'rig':
        record['rig_lengths'] = validate_lengths(payload.get('rig_lengths'))
        record['joint_limits'] = validate_joint_limits(payload.get('joint_limits'))
        collection = 'rigs'
    elif kind in ('clip', 'finished_animation'):
        frames = payload.get('frames')
        fps = payload.get('fps')
        if not isinstance(frames, list) or not 1 <= len(frames) <= 256:
            raise ValueError('Animace musí mít 1 až 256 snímků.')
        if type(fps) is not int or not 1 <= fps <= 30:
            raise ValueError('Rychlost musí být 1 až 30 snímků/s.')
        speed = payload.get('move_speed_pt_s', 8)
        if isinstance(speed, bool) or not isinstance(speed, (int, float)) or not math.isfinite(speed) or not 0 <= speed <= 1000:
            raise ValueError('Rychlost pohybu musí být 0 až 1000 herních bodů/s.')
        record.update(frames=[validate_frame(frame) for frame in frames], fps=fps, move_speed_pt_s=speed, rig_lengths=validate_lengths(payload.get('rig_lengths')), joint_limits=validate_joint_limits(payload.get('joint_limits')))
        if kind == 'finished_animation':
            record['skin_id'] = validate_reference(payload.get('skin_id'), 'bitmapovou předlohu')
            if payload.get('skeleton_id'):
                record['skeleton_id'] = validate_reference(payload.get('skeleton_id'), 'kosterní animaci')
            record['bitmap'] = validate_bitmap(payload.get('bitmap'))
        record['frame_edits'] = validate_frame_edits(payload.get('frame_edits'), record['frames'], record['rig_lengths'])
        collection = 'clips' if kind == 'clip' else 'finished_animations'
    else:
        raise ValueError('Neznámý typ záznamu.')
    record['extra_bones'] = validate_extra_bones(payload.get('extra_bones', (payload.get('expectedRecord') or {}).get('extra_bones')))
    extra_bones = record['extra_bones']
    for frame in record.get('frames', [record.get('frame', {})]):
        if set(frame.get('extra_pose', {}))-set(record['extra_bones']):
            raise ValueError('Snímek odkazuje na chybějící přidanou kost.')
    if kind == 'finished_animation':
        for key, part in record['bitmap']['parts'].items():
            if part.get('bone', key) not in BASE_BONES | set(record['extra_bones']):
                raise ValueError('Bitmapa odkazuje na chybějící kost.')
    path = Path(path) if path is not None else (ANIMATION_STORE if kind == 'finished_animation' else SKELETON_STORE)
    library = animation_store.load_library(path)
    library.setdefault(collection, {})
    if kind == 'finished_animation' and 'skeleton_id' in record:
        clips = library.get('clips', {})
        if not clips and path != SKELETON_STORE and SKELETON_STORE.exists():
            clips = json.loads(SKELETON_STORE.read_text(encoding='utf-8')).get('clips', {})
        if record['skeleton_id'] not in clips:
            raise ValueError('Vybraná kosterní animace neexistuje.')
    mode = payload.get('mode', 'create')
    backup = None
    if mode == 'update':
        if kind not in ('pose', 'clip', 'finished_animation', 'rig'):
            raise ValueError('Tento typ položky nelze přepsat.')
        target = payload.get('id')
        if not isinstance(target, str) or target not in library[collection]:
            raise ValueError('Vybraná položka neexistuje; nic se nepřepsalo.')
        previous = library[collection][target]
        if payload.get('expectedRecord') != previous:
            raise ValueError('Položka se mezitím změnila v jiné kartě. Nic se nepřepsalo. Ulož úpravy jako novou variantu nebo načti aktuální stav.')
        if kind == 'pose':
            updated = record
            record = {**previous, 'frame': updated['frame'], 'updated_at': datetime.now(timezone.utc).isoformat()}
            if 'rig_lengths' in updated:
                record['rig_lengths'] = updated['rig_lengths']
            if 'joint_limits' in updated:
                record['joint_limits'] = updated['joint_limits']
        elif kind == 'rig':
            record = {**previous, 'rig_lengths': record['rig_lengths'], 'joint_limits': record['joint_limits'], 'updated_at': datetime.now(timezone.utc).isoformat()}
        else:
            updated = record
            record = {**previous, 'frames': record['frames'], 'fps': record['fps'],
                  'move_speed_pt_s': record['move_speed_pt_s'] if 'move_speed_pt_s' in payload else previous.get('move_speed_pt_s', 8),
                  'rig_lengths': record['rig_lengths'] if 'rig_lengths' in payload else validate_lengths(previous.get('rig_lengths')),
                  'joint_limits': record['joint_limits'] if 'joint_limits' in payload else validate_joint_limits(previous.get('joint_limits')),
                  'updated_at': datetime.now(timezone.utc).isoformat()}
            for key in ('skin_id', 'bitmap', 'extra_bones'):
                if key in updated:
                    record[key] = updated[key]
            if kind == 'finished_animation':
                record.pop('skeleton_id', None)
                if 'skeleton_id' in updated:
                    record['skeleton_id'] = updated['skeleton_id']
            record['frame_edits'] = validate_frame_edits(payload.get('frame_edits', previous.get('frame_edits')), record['frames'], record['rig_lengths'])
        record['extra_bones'] = extra_bones
        backup_dir = path.parent / 'history'
        backup_dir.mkdir(exist_ok=True)
        backup_token = str(uuid.uuid4())
        backup_path = backup_dir / (backup_token + '.json')
        with backup_path.open('x', encoding='utf-8') as stream:
            json.dump({'saved_at': record['updated_at'], 'record': previous}, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        backup = str(backup_path.relative_to(path.parent))
        if kind in ('clip', 'finished_animation'):
            library.setdefault('trash', {})[backup_token] = {
                'collection': collection, 'record_id': previous['id'],
                'name': previous['name'],
                'saved_at': record['updated_at'], 'history': backup,
            }
    elif mode != 'create':
        raise ValueError('Neznámý způsob uložení.')
    library[collection][record['id']] = record
    animation_store.save_library(path, library)
    return {'collection': collection, 'record': record, 'backup': backup,
            'trash': library.get('trash', {})}
