import json
import tempfile
import unittest
from pathlib import Path

from migrate_animation_links import migrate
from pose_library import LIMITS


class AnimationLinkMigrationTests(unittest.TestCase):
    def test_embedded_animation_and_bitmap_move_to_shared_library(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            poses_dir = root / 'poses'; characters_dir = root / 'characters'
            poses_dir.mkdir(); characters_dir.mkdir()
            poses_path = poses_dir / 'poses.json'; characters_path = characters_dir / 'game-characters.json'
            frame = dict.fromkeys(LIMITS, 0)
            skeleton = {'id': 'walk', 'name': 'Chůze', 'frames': [frame] * 8, 'fps': 8}
            poses_path.write_text(json.dumps({'schema_version': 1, 'clips': {'walk': skeleton}, 'poses': {}}))
            skin = {'layers': ['head'], 'parts': {'head': {'file': 'head.png', 'offset': [12, -8],
                    'rotation': 7, 'scale': 1, 'scale_x': 1.2, 'scale_y': .9}}}
            animation = {**skeleton, 'name': 'Zombie chůze', 'source_clip_id': 'walk'}
            characters_path.write_text(json.dumps({'schema_version': 2, 'characters': {'zombie': {
                'id': 'zombie', 'name': 'Zombie', 'skin_id': 'zombie-template', 'skin': skin,
                'asset_base': 'legacy/', 'rig_units_per_game_point': 16,
                'animation': animation, 'motion': {'variation_percent': 15}}}}))

            self.assertEqual(migrate(poses_path, characters_path), 0)
            poses = json.loads(poses_path.read_text()); characters = json.loads(characters_path.read_text())
            character = characters['characters']['zombie']; animation_id = character['animation_ids'][0]
            self.assertEqual(character['default_animation_id'], animation_id)
            for key in ('animation', 'animations', 'skin', 'skin_id', 'asset_base', 'rig_units_per_game_point'):
                self.assertNotIn(key, character)
            finished = poses['finished_animations'][animation_id]
            self.assertEqual(finished['skeleton_id'], 'walk')
            self.assertEqual(finished['skin_id'], 'zombie-template')
            self.assertEqual(finished['bitmap']['parts']['head']['offset'], [12, -8])
            self.assertEqual(finished['bitmap']['parts']['head']['scale_x'], 1.2)
            self.assertEqual(len(list((poses_dir / 'history').glob('pre-animation-links-*.json'))), 1)
            self.assertEqual(len(list((characters_dir / 'history').glob('pre-animation-links-*.json'))), 1)
            before_poses = poses_path.read_bytes(); before_characters = characters_path.read_bytes()
            self.assertEqual(migrate(poses_path, characters_path), 0)
            self.assertEqual(poses_path.read_bytes(), before_poses)
            self.assertEqual(characters_path.read_bytes(), before_characters)


if __name__ == '__main__':
    unittest.main()
