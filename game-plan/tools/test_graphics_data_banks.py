import json
import unittest
from pathlib import Path


class GraphicsDataBanksTests(unittest.TestCase):
    def test_clean_split_banks(self):
        graphics = Path(__file__).resolve().parents[1] / 'graphics'
        self.assertEqual(
            {path.name for path in graphics.iterdir() if path.is_dir()},
            {'postavy', 'animace', 'bitmapove-sekvence', 'bitmapove-predlohy', 'levely', 'kostry'},
        )
        skeletons = json.loads((graphics / 'kostry/skeletons.json').read_text())
        animations = json.loads((graphics / 'animace/animations.json').read_text())
        characters = json.loads((graphics / 'postavy/game-characters.json').read_text())
        templates = json.loads((graphics / 'bitmapove-predlohy/skins.json').read_text())
        self.assertEqual(len(skeletons['clips']), 3)
        self.assertEqual(skeletons['poses'], {})
        self.assertEqual(skeletons['trash'], {})
        self.assertEqual(animations['finished_animations'], {})
        self.assertEqual(animations['trash'], {})
        self.assertEqual(characters['characters'], {})
        self.assertEqual(characters['trash'], {})
        self.assertEqual(
            list(templates['skins']),
            ['bezec-zombie-v1', 'soudruh-generalissimus-v1'],
        )
        self.assertEqual(
            list(templates['templates']),
            ['bezec-zombie-v1', 'soudruh-generalissimus-v1'],
        )
        general = templates['templates']['soudruh-generalissimus-v1']
        self.assertTrue(general['animator_ready'])
        skin = json.loads((graphics / 'bitmapove-predlohy' / general['path']).read_text())
        self.assertEqual(len(skin['parts']), 14)
        self.assertEqual(set(skin['layers']), set(skin['parts']))
        for part in skin['parts'].values():
            self.assertEqual(len(part['start']), 2)
            self.assertEqual(len(part['end']), 2)


if __name__ == '__main__':
    unittest.main()
