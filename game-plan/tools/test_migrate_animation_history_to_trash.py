import json
import tempfile
import unittest
from pathlib import Path

from migrate_animation_history_to_trash import migrate


class AnimationHistoryMigrationTests(unittest.TestCase):
    def test_history_becomes_idempotent_timestamped_trash(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp);history = root / 'history';history.mkdir();path = root / 'animations.json'
            record = {'id': 'animation-1', 'name': 'Chůze', 'frames': [{}, {}]}
            path.write_text(json.dumps({'finished_animations': {'animation-1': record}, 'trash': {}}))
            (history / 'version-1.json').write_text(json.dumps({'saved_at': '2026-09-17T10:20:30+00:00', 'record': record}))
            self.assertEqual(migrate(path, history), 1)
            entry = json.loads(path.read_text())['trash']['version-1']
            self.assertEqual(entry['collection'], 'finished_animations')
            self.assertEqual(entry['record_id'], record['id'])
            self.assertEqual(entry['name'], record['name'])
            self.assertNotIn('record', entry)
            self.assertEqual(entry['saved_at'], '2026-09-17T10:20:30+00:00')
            self.assertEqual(entry['history'], 'history/version-1.json')
            before = path.read_bytes();self.assertEqual(migrate(path, history), 0);self.assertEqual(path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
