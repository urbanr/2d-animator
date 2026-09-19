import json
import unittest
from pathlib import Path

import animation_store


class GraphicsDataBanksTests(unittest.TestCase):
    def test_clean_split_banks(self):
        graphics = Path(__file__).resolve().parents[1] / 'graphics'
        self.assertEqual(
            {path.name for path in graphics.iterdir() if path.is_dir() and path.name != 'migration-backups'},
            {'postavy', 'animace', 'bitmapove-sekvence', 'bitmapove-predlohy', 'levely', 'kostry'},
        )
        skeletons = json.loads((graphics / 'kostry/skeletons.json').read_text())
        # Přes adaptér: syrové čtení vrátí stuby bez skeleton_id a kontrola níž
        # by tiše neplatila.
        animations = animation_store.load_library(graphics / 'animace/animations.json')
        characters = json.loads((graphics / 'postavy/game-characters.json').read_text())
        templates = json.loads((graphics / 'bitmapove-predlohy/skins.json').read_text())
        # Banks are user-editable, so assert relationships rather than an empty seed.
        self.assertTrue(skeletons['clips'])
        for clip in skeletons['clips'].values():
            self.assertNotIn('bitmap', clip)
            self.assertTrue(1 <= len(clip['frames']) <= 256)
        for animation in animations['finished_animations'].values():
            self.assertIn(animation['skin_id'], templates['skins'])
            if animation.get('skeleton_id'):
                self.assertIn(animation['skeleton_id'], skeletons['clips'])
        for character in characters['characters'].values():
            self.assertNotIn('skin', character)
            self.assertNotIn('animation', character)
            for identifier in character['animation_ids']:
                self.assertIn(identifier, animations['finished_animations'])
        for key in ['bezec-zombie-v1', 'soudruh-generalissimus-v1', 'matka-vsech-krys-v1']:
            self.assertIn(key, templates['skins'])
            self.assertIn(key, templates['templates'])
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
