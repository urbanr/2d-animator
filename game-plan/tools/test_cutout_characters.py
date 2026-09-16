import json
import tempfile
import unittest
from pathlib import Path

from cutout_characters import save_character


class CharacterTests(unittest.TestCase):
    def setUp(self):
        self.temp = tempfile.TemporaryDirectory(); self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name); (self.root / 'zombie').mkdir()
        (self.root / 'skins.json').write_text(json.dumps({'skins': {'zombie': {'path': 'zombie/skin.json'}}}))
        self.skin = {'parts': {'head': {'file': 'head.png'}}, 'layers': ['head']}
        (self.root / 'zombie/skin.json').write_text(json.dumps(self.skin))
        self.animations = self.root / 'poses.json'
        self.animations.write_text(json.dumps({'finished_animations': {
            'walk': {'id': 'walk', 'name': 'Chůze'}, 'sprint': {'id': 'sprint', 'name': 'Sprint'}}}))
        self.payload = {'name': 'Moje zombie', 'animation_id': 'walk'}

    def save(self, payload):
        return save_character(payload, self.root, self.animations)

    def test_character_stores_only_animation_links(self):
        first = self.save(self.payload)
        self.assertEqual(first['animation_ids'], ['walk'])
        self.assertEqual(first['default_animation_id'], 'walk')
        self.assertNotIn('animation', first); self.assertNotIn('animations', first)
        self.assertNotIn('skin', first); self.assertNotIn('skin_id', first)
        self.assertEqual(json.loads((self.root/'game-characters.json').read_text())['schema_version'], 3)

    def test_link_unlink_preserves_shared_animation(self):
        first = self.save(self.payload)
        linked = self.save({'mode': 'animation-link', 'id': first['id'], 'animation_id': 'sprint',
                            'expectedRecord': first, 'make_default': True})
        self.assertEqual(linked['animation_ids'], ['walk', 'sprint'])
        self.assertEqual(linked['default_animation_id'], 'sprint')
        unlinked = self.save({'mode': 'animation-unlink', 'id': first['id'], 'animation_id': 'sprint',
                              'expectedRecord': linked})
        self.assertEqual(unlinked['animation_ids'], ['walk'])
        self.assertEqual(unlinked['default_animation_id'], 'walk')
        self.assertIn('sprint', json.loads(self.animations.read_text())['finished_animations'])
        self.assertEqual(len(list((self.root/'history').glob('*.json'))), 2)

    def test_unknown_animation_never_writes(self):
        before = self.animations.read_bytes()
        with self.assertRaisesRegex(ValueError, 'neexistuje'):
            self.save({**self.payload, 'animation_id': 'missing'})
        self.assertEqual(self.animations.read_bytes(), before)
        self.assertFalse((self.root/'game-characters.json').exists())

    def test_duplicate_name_update_backup_and_conflict(self):
        first = self.save(self.payload); path = self.root/'game-characters.json'; before = path.read_bytes()
        with self.assertRaisesRegex(ValueError, 'už existuje'):
            self.save({**self.payload, 'name': '  MOJE   ZOMBIE  '})
        self.assertEqual(path.read_bytes(), before)
        updated = self.save({**self.payload, 'mode': 'update', 'id': first['id'], 'expectedRecord': first, 'name': 'Updated'})
        self.assertEqual(updated['animation_ids'], ['walk'])
        self.assertEqual(json.loads(next((self.root/'history').glob('*.json')).read_text())['record'], first)
        with self.assertRaises(ValueError): self.save({**self.payload, 'mode': 'update', 'id': first['id'], 'expectedRecord': first})

    def test_only_motion_remains_a_character_attribute(self):
        payload = {**self.payload, 'motion': {'variation_percent': 25}}
        saved = self.save(payload)
        self.assertEqual(saved['motion']['variation_percent'], 25)
        self.assertNotIn('skin', saved)

    def test_invalid_character_fields_never_change_catalog(self):
        self.save(self.payload); target = self.root/'game-characters.json'; before = target.read_bytes()
        invalid = [{**self.payload, 'name': ''}, {**self.payload, 'skin_id': 'zombie'},
                   {**self.payload, 'animation_id': 'missing'}, {**self.payload, 'layers': ['head']},
                   {**self.payload, 'part_offsets': {'head': [0, 0]}},
                   {**self.payload, 'motion': {'variation_percent': 91}}]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError): self.save(payload)
            self.assertEqual(target.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
