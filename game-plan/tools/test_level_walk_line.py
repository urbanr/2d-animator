import json
import tempfile
import unittest
from pathlib import Path
from unittest.mock import patch

from level_walk_line import set_walk_line
import build_level_gallery as builder


class WalkLineTests(unittest.TestCase):
    def test_save_rebuild_and_reject_invalid_values(self):
        with tempfile.TemporaryDirectory() as tmp:
            root = Path(tmp)
            (root / 'graphics/levely').mkdir(parents=True)
            (root / 'tool').mkdir()
            path = root / 'graphics/levely/levels.json'
            variant = {'background_master': 'image.png', 'source': 'source.png', 'master_size': [1536, 704]}
            path.write_text(json.dumps({'levels': {'test': {'display_name': 'Test', 'selected_variant': 'v1',
                'variants': {'v1': dict(variant), 'v2': dict(variant)}}}}))
            with patch.multiple(builder, ROOT=root, CATALOG=path):
                self.assertEqual(builder.build_level_data(), 2)
                set_walk_line('test', 'v2', 0.42, path)
                builder.build_level_data()
                builder.build_level_data()
            result = json.loads(path.read_text())['levels']['test']
            self.assertEqual(result['selected_variant'], 'v1')
            self.assertEqual(result['variants']['v1']['walk_line']['y'], 0.8)
            self.assertEqual(result['variants']['v2']['walk_line']['y'], 0.42)
            exported = json.loads((root / 'graphics/levely/levels-game.generated.json').read_text())
            self.assertEqual(exported['levels']['test']['variants']['v2']['walk_line'], result['variants']['v2']['walk_line'])
            for y in [-1, 1.1, True, '0.4', None, float('nan'), float('inf')]:
                before = path.read_bytes()
                with self.assertRaises(ValueError):
                    set_walk_line('test', 'v2', y, path)
                self.assertEqual(path.read_bytes(), before)
            with self.assertRaises(ValueError):
                set_walk_line('missing', 'v2', 0.5, path)
            for y in [0, 1]:
                self.assertEqual(set_walk_line('test', 'v2', y, path)['y'], y)


if __name__ == '__main__':
    unittest.main()
