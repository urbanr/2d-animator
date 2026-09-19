import json
import tempfile
import unittest
from pathlib import Path

import animation_store


def record(identifier, name='Chůze'):
    return {'id': identifier, 'name': name, 'fps': 8, 'skin_id': 'skin-a',
            'frames': [{'bodyX': 0}] * 8, 'bitmap': {'parts': {}}}


class AnimationStoreTests(unittest.TestCase):
    def setUp(self):
        self.tmp = tempfile.TemporaryDirectory()
        self.path = Path(self.tmp.name) / 'animations.json'

    def tearDown(self):
        self.tmp.cleanup()

    def write(self, library):
        self.path.write_text(json.dumps(library, ensure_ascii=False), encoding='utf-8')

    def test_round_trip_keeps_records_and_shrinks_index(self):
        library = {'schema_version': 2,
                   'finished_animations': {'a': record('a'), 'b': record('b', 'Běh')},
                   'trash': {}}
        self.write(library)
        big = self.path.stat().st_size
        animation_store.save_library(self.path, animation_store.load_library(self.path))
        self.assertEqual(animation_store.load_library(self.path), library)
        self.assertLess(self.path.stat().st_size, big)
        self.assertEqual(sorted(p.name for p in (self.path.parent / 'items').glob('*.json')),
                         ['a.json', 'b.json'])

    def test_index_stub_lists_animation_without_opening_item(self):
        self.write({'finished_animations': {'a': record('a')}})
        animation_store.save_library(self.path, animation_store.load_library(self.path))
        stub = json.loads(self.path.read_text())['finished_animations']['a']
        self.assertEqual(stub['name'], 'Chůze')
        self.assertEqual(stub['frames'], 8)          # jen pocet, ne cele snimky
        self.assertEqual(stub['file'], 'items/a.json')

    def test_deleted_animation_leaves_no_orphan_file(self):
        self.write({'finished_animations': {'a': record('a'), 'b': record('b')}})
        library = animation_store.load_library(self.path)
        animation_store.save_library(self.path, library)
        del library['finished_animations']['b']
        animation_store.save_library(self.path, library)
        self.assertEqual([p.name for p in (self.path.parent / 'items').glob('*.json')], ['a.json'])

    def test_trash_record_moves_out_of_index_and_returns_unchanged(self):
        entry = {'collection': 'finished_animations', 'record': record('a'), 'deleted_at': 'now'}
        library = {'finished_animations': {}, 'trash': {'token': entry}}
        self.write(library)
        animation_store.save_library(self.path, animation_store.load_library(self.path))
        stub = json.loads(self.path.read_text())['trash']['token']
        self.assertEqual(stub['file'], 'trash/token.json')
        self.assertNotIn('record', stub)
        # Obnova z kose porovnava expectedRecord, takze se musi vratit presne puvodni tvar.
        self.assertEqual(animation_store.load_library(self.path)['trash']['token'], entry)

    def test_history_trash_entry_without_record_stays_untouched(self):
        entry = {'collection': 'finished_animations', 'record_id': 'a', 'name': 'Chůze',
                 'saved_at': 'now', 'history': 'history/x.json'}
        self.write({'finished_animations': {}, 'trash': {'token': entry}})
        animation_store.save_library(self.path, animation_store.load_library(self.path))
        self.assertEqual(json.loads(self.path.read_text())['trash']['token'], entry)

    def test_bank_without_animations_is_written_flat(self):
        library = {'schema_version': 2, 'clips': {'c': {'id': 'c'}}, 'trash': {}}
        self.write(library)
        animation_store.save_library(self.path, animation_store.load_library(self.path))
        self.assertEqual(json.loads(self.path.read_text()), library)
        self.assertFalse((self.path.parent / 'items').exists())

    def test_missing_item_file_is_reported(self):
        self.write({'finished_animations': {'a': {'id': 'a', 'file': 'items/a.json'}}})
        with self.assertRaises(ValueError):
            animation_store.load_library(self.path)


if __name__ == '__main__':
    unittest.main()
