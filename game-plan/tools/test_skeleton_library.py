import json
import tempfile
import unittest
from pathlib import Path
from pose_library import save_pose, validate_joint_fade, validate_frame, LIMITS
from catalog_trash import change_trash


class SkeletonTests(unittest.TestCase):
    def test_save_overwrite_conflict_backup_trash_restore(self):
        with tempfile.TemporaryDirectory() as tmp:
            path = Path(tmp) / 'poses.json'
            path.write_text(json.dumps({'clips': {}, 'poses': {}}))
            payload = {'kind': 'rig', 'name': 'Kostra', 'rig_lengths': {'head': 30, 'neck': 25, 'torso': 110}, 'joint_limits': {'bodyLean': [-180, 180]}}
            original = save_pose(payload, path)['record']
            self.assertNotIn('frames', original)
            self.assertEqual(original['joint_limits']['bodyLean'], [-180, 180])
            for limits in ({'unknown': [-180, 180]}, {'bodyLean': [-181, 180]}, {'bodyLean': [20, -20]}):
                with self.assertRaises(ValueError):
                    save_pose({**payload, 'joint_limits': limits}, path)
            result = save_pose({**payload, 'mode': 'update', 'id': original['id'], 'expectedRecord': original, 'rig_lengths': {'head': 35}}, path)
            self.assertEqual(result['record']['rig_lengths']['head'], 35)
            self.assertEqual(json.loads((path.parent / result['backup']).read_text())['record'], original)
            before = path.read_bytes()
            with self.assertRaises(ValueError):
                save_pose({**payload, 'mode': 'update', 'id': original['id'], 'expectedRecord': original}, path)
            self.assertEqual(path.read_bytes(), before)
            removed = change_trash({'mode': 'delete', 'collection': 'rigs', 'id': original['id'], 'expectedRecord': result['record']}, path, {'rigs'})
            trash_id = next(iter(removed['trash']))
            restored = change_trash({'mode': 'restore', 'collection': 'rigs', 'id': trash_id, 'expectedRecord': result['record']}, path, {'rigs'})
            self.assertEqual(restored['record'], {**result['record'], 'name': 'Kostra - koš'})
            self.assertIn(trash_id, restored['trash'])

    def test_ellipse_and_head_fields_roundtrip(self):
        f = {'start': {'strength': .65, 'radius': 20, 'radius2': 60, 'shape': 'rectangle', 'onset': .4, 'direction': 'outward'}}
        self.assertEqual(validate_joint_fade(f), f)
        for bad in [0, 2001, True, float('nan')]:
            with self.assertRaises(ValueError):
                validate_joint_fade({'start': {**f['start'], 'radius2': bad}})
        for key, bad in [('shape', 'triangle'), ('onset', .96), ('onset', True)]:
            with self.assertRaises(ValueError):
                validate_joint_fade({'start': {**f['start'], key: bad}})
        frame = dict.fromkeys(LIMITS, 0)
        frame['headOffsetX'] = 15
        frame['neckOffsetY'] = -10
        self.assertEqual(validate_frame(frame), frame)


if __name__ == '__main__':
    unittest.main()
