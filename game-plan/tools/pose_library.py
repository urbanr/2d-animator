"""Pose alternatives and explicit, conflict-checked animation updates with backups."""
import json
import math
import uuid
from datetime import datetime, timezone
from pathlib import Path

STORE = Path(__file__).resolve().parent.parent / 'graphics' / 'poses' / 'poses.json'
LIMITS = {'bodyX': (-200, 200), 'bodyY': (-100, 100), 'bodyLean': (-45, 45), 'shoulders': (-20, 20), 'pelvis': (-20, 20),
          'shoulderWidth': (-100, 100), 'pelvisWidth': (-100, 100),
          'neck': (-180, 180), 'head': (-30, 30)}
for side in ('near', 'far'):
    for joint in ('Shoulder', 'Elbow', 'Hip', 'Knee'):
        LIMITS[side + joint] = (-180, 180)
    LIMITS[side + 'Foot'] = (-180, 180)
ROOT_OFFSETS = {side+joint+'Offset'+axis: (-100, 100) for side in ('near','far') for joint in ('Shoulder','Hip') for axis in ('X','Y')}
ROOT_OFFSETS.update({joint+'Offset'+axis: (-100,100) for joint in ('head','neck') for axis in ('X','Y')})
LIMITS.update(ROOT_OFFSETS)
DEFAULT_LENGTHS = {side+bone: length for side in ('near','far') for bone,length in {'UpperArm':46,'Forearm':44,'Thigh':70,'Shin':74,'Foot':25}.items()}
PART_KEYS = set(DEFAULT_LENGTHS) | {'head', 'torso', 'backpack'}
DEFAULT_LENGTHS.update(head=21, neck=18, torso=94)


def bounded(value, low, high):
    if isinstance(value, bool) or not isinstance(value, (int, float)) or not math.isfinite(value) or not low <= value <= high:
        raise ValueError(f'Neplatná hodnota úpravy ({low} až {high}).')
    return value


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


def save_pose(payload, path=STORE):
    name = payload.get('name')
    if not isinstance(name, str) or not 1 <= len(name.strip()) <= 100:
        raise ValueError('Zadej název do 100 znaků.')
    kind = payload.get('kind')
    record = {'id': str(uuid.uuid4()), 'name': name.strip(),
              'created_at': datetime.now(timezone.utc).isoformat()}
    if kind == 'pose':
        record['frame'] = validate_frame(payload.get('frame'))
        collection = 'poses'
    elif kind == 'rig':
        record['rig_lengths'] = validate_lengths(payload.get('rig_lengths'))
        collection = 'rigs'
    elif kind == 'clip':
        frames = payload.get('frames')
        fps = payload.get('fps')
        if not isinstance(frames, list) or not 2 <= len(frames) <= 32:
            raise ValueError('Animace musí mít 2 až 32 snímků.')
        if type(fps) is not int or not 1 <= fps <= 30:
            raise ValueError('Rychlost musí být 1 až 30 snímků/s.')
        speed = payload.get('move_speed_pt_s', 8)
        if isinstance(speed, bool) or not isinstance(speed, (int, float)) or not math.isfinite(speed) or not 0 <= speed <= 1000:
            raise ValueError('Rychlost pohybu musí být 0 až 1000 herních bodů/s.')
        record.update(frames=[validate_frame(frame) for frame in frames], fps=fps, move_speed_pt_s=speed, rig_lengths=validate_lengths(payload.get('rig_lengths')))
        record['frame_edits'] = validate_frame_edits(payload.get('frame_edits'), record['frames'], record['rig_lengths'])
        collection = 'clips'
    else:
        raise ValueError('Neznámý typ záznamu.')
    library = json.loads(path.read_text(encoding='utf-8'))
    library.setdefault(collection, {})
    mode = payload.get('mode', 'create')
    backup = None
    if mode == 'update':
        if kind not in ('clip', 'rig'):
            raise ValueError('Přepsat lze pouze animaci.')
        target = payload.get('id')
        if not isinstance(target, str) or target not in library[collection]:
            raise ValueError('Vybraná animace neexistuje; nic se nepřepsalo.')
        previous = library[collection][target]
        if payload.get('expectedRecord') != previous:
            raise ValueError('Animace se mezitím změnila v jiné kartě. Nic se nepřepsalo. Ulož úpravy jako novou variantu nebo načti aktuální stav.')
        if kind == 'rig':
            record = {**previous, 'rig_lengths': record['rig_lengths'], 'updated_at': datetime.now(timezone.utc).isoformat()}
        else:
            record = {**previous, 'frames': record['frames'], 'fps': record['fps'],
                  'move_speed_pt_s': record['move_speed_pt_s'] if 'move_speed_pt_s' in payload else previous.get('move_speed_pt_s', 8),
                  'rig_lengths': record['rig_lengths'] if 'rig_lengths' in payload else validate_lengths(previous.get('rig_lengths')),
                  'updated_at': datetime.now(timezone.utc).isoformat()}
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
