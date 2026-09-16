import copy
import json
import tempfile
import unittest
import io
from unittest.mock import patch
from pathlib import Path
from catalog_trash import change_trash


class TrashTests(unittest.TestCase):
    def test_http_dispatch_uses_trash_and_preserves_other_records(self):
        import serve_sprite_gallery as server
        handler = object.__new__(server.SpriteGalleryHandler)
        responses = []
        handler._json_response = lambda status, payload: responses.append((status, payload))
        def post(endpoint, payload):
            body = json.dumps(payload).encode()
            handler.path = endpoint
            handler.headers = {'Content-Length': str(len(body))}
            handler.rfile = io.BytesIO(body)
            handler.do_POST()
            return responses[-1]
        with patch.object(server, 'SKELETON_STORE', self.path):
            status, result = post('/api/poses', self.request())
            self.assertEqual(status, 200)
            status, _ = post('/api/poses', self.request('restore', id=result['trash_id']))
            self.assertEqual(status, 200)
            self.assertEqual(post('/api/poses', self.request(expectedRecord={}))[0], 400)
        character_path = self.path.parent/'game-characters.json'
        character_path.write_text(json.dumps(self.catalog))
        with patch.object(server, 'CHARACTER_ROOT', self.path.parent):
            status, result = post('/api/game-characters', self.request(collection='characters', id='three', expectedRecord=self.catalog['characters']['three']))
            self.assertEqual(status, 200)
            self.assertEqual(json.loads(character_path.read_text())['characters'], {})

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.path = Path(self.temp.name)/'catalog.json'
        self.record = {'id': 'one', 'name': 'Moje', 'frames': [{'x': 1}]}
        self.catalog = {'clips': {'one': self.record}, 'poses': {'two': {'id': 'two', 'name': 'Pose'}},
                        'characters': {'three': {'id': 'three', 'animation': copy.deepcopy(self.record)}}}
        self.path.write_text(json.dumps(self.catalog))

    def request(self, mode='delete', **kw):
        return {'mode': mode, 'collection': 'clips', 'id': 'one', 'expectedRecord': self.record, **kw}

    def test_delete_restore_last_clip_preserves_other_collections_and_snapshot(self):
        deleted = change_trash(self.request(), self.path, {'clips', 'poses'})
        catalog = json.loads(self.path.read_text())
        self.assertEqual(catalog['clips'], {})
        self.assertEqual(catalog['poses'], self.catalog['poses'])
        self.assertEqual(catalog['characters'], self.catalog['characters'])
        self.assertEqual(catalog['trash'][deleted['trash_id']]['record'], self.record)
        change_trash(self.request('restore', id=deleted['trash_id']), self.path, {'clips', 'poses'})
        restored = json.loads(self.path.read_text())
        self.assertEqual(restored['clips'], self.catalog['clips'])
        self.assertEqual(restored['trash'], {})

    def test_pose_and_character_deletion_are_independent(self):
        for collection, identifier in [('poses', 'two'), ('characters', 'three')]:
            result = change_trash(self.request(collection=collection, id=identifier,
                expectedRecord=self.catalog[collection][identifier]), self.path, {collection})
            self.assertEqual(result['record'], self.catalog[collection][identifier])
        self.assertEqual(json.loads(self.path.read_text())['clips'], self.catalog['clips'])

    def test_stale_unknown_and_cross_catalog_requests_never_write(self):
        before = self.path.read_bytes()
        for payload in [self.request(expectedRecord={}), self.request(id='../evil'),
                        self.request(collection='characters'), self.request('restore'), self.request('purge')]:
            with self.assertRaises(ValueError):
                change_trash(payload, self.path, {'clips', 'poses'})
            self.assertEqual(self.path.read_bytes(), before)

    def test_restore_never_overwrites_existing_id(self):
        deleted = change_trash(self.request(), self.path, {'clips'})
        catalog = json.loads(self.path.read_text())
        catalog['clips']['one'] = {'id': 'one', 'name': 'new'}
        self.path.write_text(json.dumps(catalog))
        before = self.path.read_bytes()
        with self.assertRaises(ValueError):
            change_trash(self.request('restore', id=deleted['trash_id']), self.path, {'clips'})
        self.assertEqual(self.path.read_bytes(), before)


if __name__ == '__main__':
    unittest.main()
