import json
import tempfile
import unittest
from pathlib import Path
from pose_library import LIMITS, save_pose, validate_frame


class PoseTests(unittest.TestCase):
    def test_shared_lengths_and_legacy_update(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            path.write_text(json.dumps({'clips': {}, 'poses': {}, 'finished_animations': {}}))
            frame = dict.fromkeys(LIMITS, 0)
            frame['farShoulderOffsetX'] = 13
            payload = {'kind': 'clip', 'name': 'Lengths', 'frames': [frame]*8, 'fps': 8,
                       'rig_lengths': {'nearShin': 94, 'farFoot': 30}}
            first = save_pose(payload, path)['record']
            self.assertEqual(first['rig_lengths']['nearShin'], 94)
            self.assertEqual(first['rig_lengths']['farShin'], 74)
            self.assertEqual(first['frames'][0]['farShoulderOffsetX'], 13)
            update = {k:v for k,v in payload.items() if k != 'rig_lengths'}
            second = save_pose({**update, 'mode': 'update', 'id': first['id'], 'expectedRecord': first}, path)['record']
            self.assertEqual(second['rig_lengths'], first['rig_lengths'])
            before = path.read_bytes()
            for value in ({'nearShin': 0}, {'farFoot': 251}, {'nearThigh': True}, {'unknown': 42}):
                with self.assertRaises(ValueError): save_pose({**payload, 'rig_lengths': value}, path)
                self.assertEqual(path.read_bytes(), before)

    def test_movement_speed_persistence_validation_and_legacy_update(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            path.write_text(json.dumps({'clips': {}, 'poses': {}}))
            payload = {'kind': 'clip', 'name': 'Speed', 'frames': [dict.fromkeys(LIMITS, 0)]*8, 'fps': 8, 'move_speed_pt_s': 12.5}
            first = save_pose(payload, path)['record']
            self.assertEqual(first['move_speed_pt_s'], 12.5)
            update = {**payload, 'mode': 'update', 'id': first['id'], 'expectedRecord': first}
            del update['move_speed_pt_s']
            second = save_pose(update, path)['record']
            self.assertEqual(second['move_speed_pt_s'], 12.5)
            before = path.read_bytes()
            for value in [-1, 1001, True, '12', None, float('nan'), float('inf')]:
                with self.assertRaises(ValueError): save_pose({**payload, 'move_speed_pt_s': value}, path)
                self.assertEqual(path.read_bytes(), before)
            zero = save_pose({**payload, 'move_speed_pt_s': 0}, path)['record']
            self.assertEqual(zero['move_speed_pt_s'], 0)
            legacy = {k:v for k,v in payload.items() if k != 'move_speed_pt_s'}
            self.assertEqual(save_pose(legacy, path)['record']['move_speed_pt_s'], 8)

    def test_update_is_scoped_backed_up_and_conflict_checked(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            path.write_text(json.dumps({'clips': {}, 'poses': {}}))
            frame = dict.fromkeys(LIMITS, 0)
            original = save_pose({'kind': 'clip', 'name': 'Moje', 'frames': [frame]*8, 'fps': 8}, path)['record']
            other = save_pose({'kind': 'clip', 'name': 'Moje', 'frames': [frame]*8, 'fps': 8}, path)['record']
            payload = {'kind': 'clip', 'mode': 'update', 'id': original['id'], 'name': 'Ignored rename',
                       'expectedRecord': original, 'frames': [{**frame, 'bodyY': 10}]*8, 'fps': 12}
            saved = save_pose(payload, path)
            loaded = json.loads(path.read_text())
            self.assertEqual(len(loaded['clips']), 2)
            self.assertEqual(loaded['clips'][other['id']], other)
            self.assertEqual(saved['record']['name'], 'Moje')
            self.assertEqual(saved['record']['id'], original['id'])
            self.assertEqual(saved['record']['frames'][0]['bodyY'], 10)
            self.assertEqual(json.loads((path.parent / saved['backup']).read_text())['record'], original)
            before = path.read_bytes()
            for invalid in [payload, {**payload, 'id': 'missing'}, {**payload, 'expectedRecord': saved['record'], 'fps': 99}]:
                with self.assertRaises(ValueError): save_pose(invalid, path)
                self.assertEqual(path.read_bytes(), before)
            self.assertEqual(len(list((path.parent / 'history').glob('*.json'))), 1)

    def test_legacy_width_defaults(self):
        legacy = {key: 0 for key in LIMITS if not key.endswith('Width')}
        loaded = validate_frame(legacy)
        self.assertEqual(loaded['shoulderWidth'], 100)
        self.assertEqual(loaded['pelvisWidth'], 100)
        self.assertNotIn('shoulderWidth', legacy)

    def test_joint_limits(self):
        frame = dict.fromkeys(LIMITS, 0)
        self.assertEqual(validate_frame(frame), frame)
        for key, (low, high) in LIMITS.items():
            for value in (low, high):
                self.assertEqual(validate_frame({**frame, key: value})[key], value)
            for value in (low-0.1, high+0.1, True, float('nan'), '1'):
                with self.assertRaises(ValueError): validate_frame({**frame, key: value})

    def test_append_and_reopen_without_overwrite(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            original = {'schema_version': 1, 'poses': {}, 'clips': {'original': {'name': 'Preserve'}}}
            path.write_text(json.dumps(original))
            frame = dict.fromkeys(LIMITS, 0)
            first = save_pose({'kind': 'pose', 'name': 'Došlap', 'frame': frame}, path)
            second = save_pose({'kind': 'pose', 'name': 'Došlap', 'frame': {**frame, 'bodyY': 12, 'shoulderWidth': -100, 'pelvisWidth': -50}}, path)
            clip = save_pose({'kind': 'clip', 'name': 'Moje chůze', 'frames': [frame]*8, 'fps': 8}, path)
            self.assertNotEqual(first['record']['id'], second['record']['id'])
            loaded = json.loads(path.read_text())
            self.assertEqual(loaded['clips']['original'], original['clips']['original'])
            self.assertEqual(len(loaded['poses']), 2)
            self.assertEqual(loaded['poses'][second['record']['id']]['frame']['shoulderWidth'], -100)
            self.assertEqual(loaded['poses'][second['record']['id']]['frame']['pelvisWidth'], -50)
            self.assertEqual(len(loaded['clips'][clip['record']['id']]['frames']), 8)
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                save_pose({'kind': 'pose', 'name': 'Bad', 'frame': {**frame, 'head': 181}}, path)
            self.assertEqual(path.read_bytes(), before)

    def test_saved_skeleton_can_be_updated_with_dimensions_and_backup(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            path.write_text(json.dumps({'clips': {}, 'poses': {}}))
            frame = dict.fromkeys(LIMITS, 0)
            original = save_pose({'kind': 'pose', 'name': 'Kostra', 'frame': frame,
                                  'rig_lengths': {'nearShin': 90},
                                  'joint_limits': {'nearKnee': [-120, 20]}}, path)['record']
            saved = save_pose({'kind': 'pose', 'mode': 'update', 'id': original['id'], 'name': 'Ignoruje se',
                               'expectedRecord': original, 'frame': {**frame, 'bodyY': 12},
                               'rig_lengths': {'nearShin': 96},
                               'joint_limits': {'nearKnee': [-90, 10]}}, path)
            self.assertEqual(saved['record']['name'], 'Kostra')
            self.assertEqual(saved['record']['frame']['bodyY'], 12)
            self.assertEqual(saved['record']['rig_lengths']['nearShin'], 96)
            self.assertEqual(saved['record']['joint_limits']['nearKnee'], [-90, 10])
            self.assertEqual(json.loads((path.parent / saved['backup']).read_text())['record'], original)

    def test_finished_animation_keeps_bitmap_and_skeleton_references(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            frame = dict.fromkeys(LIMITS, 0)
            skeleton = {'id': 'pose-1', 'name': 'Kostra', 'frames': [frame] * 8, 'fps': 8}
            path.write_text(json.dumps({'clips': {'pose-1': skeleton, 'pose-2': {**skeleton, 'id': 'pose-2'}}, 'poses': {}, 'finished_animations': {}}))
            bitmap = {'layers': ['head'], 'parts': {'head': {'offset': [0, 0], 'rotation': 0, 'scale': 1, 'scale_x': 1, 'scale_y': 1}}}
            original = save_pose({'kind': 'finished_animation', 'name': 'Hotová', 'frames': [frame] * 8, 'fps': 8,
                                  'skin_id': 'bezec-zombie-v1', 'skeleton_id': 'pose-1', 'bitmap': bitmap}, path)['record']
            self.assertEqual(original['skin_id'], 'bezec-zombie-v1')
            self.assertEqual(original['skeleton_id'], 'pose-1')
            updated = save_pose({'kind': 'finished_animation', 'mode': 'update', 'id': original['id'], 'name': 'Hotová',
                                 'expectedRecord': original, 'frames': [frame] * 8, 'fps': 9,
                                 'skin_id': 'bezec-zombie-v2', 'skeleton_id': 'pose-2', 'bitmap': bitmap}, path)['record']
            self.assertEqual(updated['skin_id'], 'bezec-zombie-v2')
            self.assertEqual(updated['skeleton_id'], 'pose-2')
            detached = save_pose({'kind': 'finished_animation', 'mode': 'update', 'id': updated['id'], 'name': 'Hotová',
                                  'expectedRecord': updated, 'frames': [frame] * 8, 'fps': 9,
                                  'skin_id': 'bezec-zombie-v2', 'bitmap': bitmap}, path)['record']
            self.assertNotIn('skeleton_id', detached)
            before = path.read_bytes()
            for key, value in [('skin_id', '../bad'), ('skeleton_id', '../bad'), ('skin_id', 4)]:
                with self.assertRaises(ValueError):
                    save_pose({'kind': 'finished_animation', 'name': 'Bad', 'frames': [frame] * 8, 'fps': 8,
                               'skin_id': 'bezec-zombie-v1', 'skeleton_id': 'pose-1', 'bitmap': bitmap, key: value}, path)
                self.assertEqual(path.read_bytes(), before)
            for bad in [None, {'layers': ['head'], 'parts': {}}, {'layers': ['head', 'head'], 'parts': {'head': {}}}]:
                with self.assertRaises(ValueError):
                    save_pose({'kind': 'finished_animation', 'name': 'Bad', 'frames': [frame] * 8, 'fps': 8,
                               'skin_id': 'bezec-zombie-v1', 'skeleton_id': 'pose-1', 'bitmap': bad}, path)


if __name__ == '__main__': unittest.main()
