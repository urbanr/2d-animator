"""Pose alternatives and explicit, conflict-checked animation updates with backups."""
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path

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
        if not isinstance(fade, dict) or not {'strength', 'radius', 'direction'} <= set(fade) or set(fade)-{'strength', 'radius', 'radius2', 'direction', 'offset', 'angle'} or fade['direction'] not in ('outward', 'inward'):
            raise ValueError('Neplatný přechod spoje.')
        out[end] = {'strength': bounded(fade['strength'], 0, 1),
                    'radius': bounded(fade['radius'], 1, 2000), 'direction': fade['direction']}
        if 'radius2' in fade:
            out[end]['radius2'] = bounded(fade['radius2'], 1, 2000)
        if 'angle' in fade:
            out[end]['angle'] = bounded(fade['angle'], -180, 180)
        if 'offset' in fade:
            if not isinstance(fade['offset'], list) or len(fade['offset']) != 2:
                raise ValueError('Neplatný posun přechodu.')
            out[end]['offset'] = [bounded(v, -2000, 2000) for v in fade['offset']]
    return out


def validate_part_transform(value, exception=False):
    if not isinstance(value, dict) or set(value)-{'offset', 'pivot_offset', 'rotation', 'scale', 'scale_x', 'scale_y', 'joint_fade'}:
        raise ValueError('Neplatná úprava bitmapového dílu.')
    out = {}
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
            if not isinstance(entries, dict) or set(entries)-allowed:
                raise ValueError('Neplatné položky výjimky.')
            result = {}
            for key, v in entries.items():
                if section == 'pose_base':
                    result[key] = bounded(v, *LIMITS[key])
                elif section == 'lengths':
                    result[key] = bounded(v, .02, 50)
                    bounded(lengths[key]*v, 5-1e-8, 250+1e-8)
                else:
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
    if isinstance(frame, dict):
        frame = {**dict.fromkeys(ROOT_OFFSETS,0), 'bodyX': 0, 'shoulderWidth': 100, 'pelvisWidth': 100, 'bodyLean': 0, **frame}
    if not isinstance(frame, dict) or set(frame) != set(LIMITS):
        raise ValueError('Póza musí obsahovat všechny klouby.')
    result = {}
    for key, (low, high) in LIMITS.items():
        value = frame[key]
        if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
            raise ValueError(f'{key}: povolený rozsah je {low} až {high}.')
        result[key] = value
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
        if not isinstance(frames, list) or not 2 <= len(frames) <= 32:
            raise ValueError('Animace musí mít 2 až 32 snímků.')
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
    path = Path(path) if path is not None else (ANIMATION_STORE if kind == 'finished_animation' else SKELETON_STORE)
    library = json.loads(path.read_text(encoding='utf-8'))
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
            for key in ('skin_id', 'bitmap'):
                if key in updated:
                    record[key] = updated[key]
            if kind == 'finished_animation':
                record.pop('skeleton_id', None)
                if 'skeleton_id' in updated:
                    record['skeleton_id'] = updated['skeleton_id']
            record['frame_edits'] = validate_frame_edits(payload.get('frame_edits', previous.get('frame_edits')), record['frames'], record['rig_lengths'])
        backup_dir = path.parent / 'history'
        backup_dir.mkdir(exist_ok=True)
        backup_path = backup_dir / (str(uuid.uuid4()) + '.json')
        with backup_path.open('x', encoding='utf-8') as stream:
            json.dump({'saved_at': record['updated_at'], 'record': previous}, stream, ensure_ascii=False, indent=2)
            stream.write('\n')
        backup = str(backup_path.relative_to(path.parent))
    elif mode != 'create':
        raise ValueError('Neznámý způsob uložení.')
    library[collection][record['id']] = record
    temporary = path.with_suffix('.json.tmp')
    temporary.write_text(json.dumps(library, ensure_ascii=False, indent=2) + '\n', encoding='utf-8')
    temporary.replace(path)
    return {'collection': collection, 'record': record, 'backup': backup}
