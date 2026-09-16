#!/usr/bin/env python3
"""Move embedded character animations into the shared animation library.

The migration is intentionally one-way and idempotent. It writes complete
pre-migration backups before replacing either catalog.
"""
import copy
import json
from datetime import datetime, timezone
from pathlib import Path

from pose_library import save_pose


ROOT = Path(__file__).resolve().parents[1]
POSES = ROOT / 'graphics/poses/poses.json'
CHARACTERS = ROOT / 'graphics/characters2/game-characters.json'
TRANSFORM_KEYS = ('offset', 'pivot_offset', 'rotation', 'scale', 'scale_x', 'scale_y', 'joint_fade')


def bitmap_snapshot(skin):
    layers = [key for key in skin['layers'] if key not in ('pelvis', 'shoulders')]
    parts = {}
    for key in layers:
        source = skin['parts'][key]
        parts[key] = {name: copy.deepcopy(source[name]) for name in TRANSFORM_KEYS if name in source}
        parts[key].setdefault('offset', [0, 0])
        parts[key].setdefault('rotation', 0)
        for axis in ('scale', 'scale_x', 'scale_y'):
            parts[key].setdefault(axis, 1)
    return {'layers': layers, 'parts': parts}


def embedded_animations(character):
    if isinstance(character.get('animations'), dict):
        return list(character['animations'].items()), character.get('default_animation_id')
    if isinstance(character.get('animation'), dict):
        return [('legacy', character['animation'])], 'legacy'
    return [], None


def migrate(poses_path=POSES, characters_path=CHARACTERS):
    poses = json.loads(poses_path.read_text())
    characters = json.loads(characters_path.read_text())
    legacy_keys = {'animation', 'animations', 'skin', 'skin_id', 'asset_base', 'rig_units_per_game_point'}
    if characters.get('schema_version') == 3 and all(not legacy_keys.intersection(item) for item in characters.get('characters', {}).values()):
        print('Animation links already migrated.')
        return 0

    stamp = datetime.now(timezone.utc).strftime('%Y%m%dT%H%M%SZ')
    pose_history = poses_path.parent / 'history'; pose_history.mkdir(exist_ok=True)
    character_history = characters_path.parent / 'history'; character_history.mkdir(exist_ok=True)
    (pose_history / f'pre-animation-links-{stamp}.json').write_text(json.dumps(poses, ensure_ascii=False, indent=2) + '\n')
    (character_history / f'pre-animation-links-{stamp}.json').write_text(json.dumps(characters, ensure_ascii=False, indent=2) + '\n')

    temporary = poses_path.with_name('poses.animation-links.tmp.json')
    temporary.write_text(json.dumps(poses, ensure_ascii=False, indent=2) + '\n')
    created = 0
    for character in characters.get('characters', {}).values():
        refs = []
        default_ref = None
        entries, old_default = embedded_animations(character)
        skin = character.get('skin')
        skin_id = character.get('skin_id')
        for old_id, animation in entries:
            skeleton_id = animation.get('source_clip_id') or animation.get('id')
            if skeleton_id not in poses.get('clips', {}):
                raise ValueError(f'{character["name"]}: animace {animation.get("name")} nemá existující kostru.')
            payload = {
                'kind': 'finished_animation', 'name': animation.get('name') or f'Animace · {character["name"]}',
                'frames': animation.get('frames'), 'fps': animation.get('fps'),
                'move_speed_pt_s': animation.get('move_speed_pt_s', 8),
                'rig_lengths': animation.get('rig_lengths'), 'joint_limits': animation.get('joint_limits'),
                'frame_edits': animation.get('frame_edits', {}), 'skin_id': skin_id,
                'skeleton_id': skeleton_id, 'bitmap': bitmap_snapshot(skin),
            }
            saved = save_pose(payload, temporary)['record']
            refs.append(saved['id']); created += 1
            if old_id == old_default or default_ref is None:
                default_ref = saved['id']
        for key in legacy_keys:
            character.pop(key, None)
        character['animation_ids'] = refs
        character['default_animation_id'] = default_ref
        character['renderer'] = 'cutout-rig-v2'
        character['updated_at'] = datetime.now(timezone.utc).isoformat()

    migrated_poses = json.loads(temporary.read_text())
    temporary.unlink()
    poses_tmp = poses_path.with_suffix('.json.migration.tmp')
    chars_tmp = characters_path.with_suffix('.json.migration.tmp')
    characters['schema_version'] = 3
    poses_tmp.write_text(json.dumps(migrated_poses, ensure_ascii=False, indent=2) + '\n')
    chars_tmp.write_text(json.dumps(characters, ensure_ascii=False, indent=2) + '\n')
    poses_tmp.replace(poses_path); chars_tmp.replace(characters_path)
    print(f'Migrated {created} animations; characters now contain links only.')
    return 0


def main():
    return migrate()


if __name__ == '__main__':
    raise SystemExit(main())
