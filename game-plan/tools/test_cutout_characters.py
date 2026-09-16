import copy
import json
import tempfile
import unittest
from pathlib import Path
from cutout_characters import save_character
from pose_library import LIMITS


class CharacterTests(unittest.TestCase):
    def test_rotation_pivot_roundtrip(self):
        payload=copy.deepcopy(self.payload)
        payload['part_transforms']={'head':{'pivot_offset':[10,-20]}}
        payload['animation']['frame_edits']={'0':{'parts':{'head':{'pivot_offset':[4,8]}}}}
        saved=save_character(payload,self.root)
        self.assertEqual(saved['skin']['parts']['head']['pivot_offset'],[10,-20])
        self.assertEqual(saved['animation']['frame_edits'],payload['animation']['frame_edits'])
        before=(self.root/'game-characters.json').read_bytes()
        for bad in [[True,0],[2001,0],[1],[1,float('nan')]]:
            with self.assertRaises(ValueError):
                save_character({**payload,'part_transforms':{'head':{'pivot_offset':bad}}},self.root)
            self.assertEqual((self.root/'game-characters.json').read_bytes(),before)

    def test_joint_fade_roundtrip_and_invalid_input(self):
        fade = {'start': {'strength': .65, 'radius': 40, 'direction': 'outward'}}
        payload = copy.deepcopy(self.payload)
        payload['part_transforms'] = {'head': {'joint_fade': fade}}
        payload['animation']['frame_edits'] = {'0': {'parts': {'head': {'joint_fade': {
            'end': {'strength': .2, 'radius': 18, 'direction': 'inward'}}}}}}
        saved = save_character(payload, self.root)
        self.assertEqual(saved['skin']['parts']['head']['joint_fade'], fade)
        self.assertEqual(saved['animation']['frame_edits'], payload['animation']['frame_edits'])
        self.assertEqual(json.loads((self.root/'zombie/skin.json').read_text()), self.skin)
        before = (self.root/'game-characters.json').read_bytes()
        for bad in [None, [], {'file': 'evil'}, {'start': {'strength': True, 'radius': 40, 'direction': 'outward'}},
                    {'start': {'strength': .5, 'radius': 0, 'direction': 'outward'}},
                    {'start': {'strength': 2, 'radius': 40, 'direction': 'outward'}},
                    {'start': {'strength': .5, 'radius': 40, 'direction': 'sideways'}}]:
            with self.assertRaises(ValueError):
                save_character({**payload, 'part_transforms': {'head': {'joint_fade': bad}}}, self.root)
            self.assertEqual((self.root/'game-characters.json').read_bytes(), before)

    def test_duplicate_name_requires_explicit_update(self):
        first=save_character(self.payload,self.root)
        path=self.root/'game-characters.json'
        before=path.read_bytes()
        for name in ('Moje zombie','  MOJE   ZOMBIE  '):
            with self.assertRaisesRegex(ValueError,'už existuje'):
                save_character({**self.payload,'name':name},self.root)
            self.assertEqual(path.read_bytes(),before)
        updated=save_character({**self.payload,'mode':'update','id':first['id'],'expectedRecord':first},self.root)
        self.assertEqual(updated['id'],first['id'])
        self.assertEqual(len(json.loads(path.read_text())['characters']),1)
        backups=list((self.root/'history').glob('*.json'))
        self.assertEqual(json.loads(backups[0].read_text())['record'],first)

    def test_scoped_bitmap_and_pose_edits_roundtrip(self):
        payload=copy.deepcopy(self.payload)
        payload['part_transforms']={'head':{'offset':[10,-4],'rotation':24,'scale':1.3,'scale_x':1.2,'scale_y':.9}}
        edits={'0':{'pose_base':{'bodyY':-12},'lengths':{'nearShin':1.2},
                    'parts':{'head':{'offset':[3,5],'rotation':-8,'scale':.8,'scale_x':.7,'scale_y':1.5}}}}
        payload['animation']['frame_edits']=edits
        saved=save_character(payload,self.root)
        self.assertEqual(saved['animation']['frame_edits'],edits)
        self.assertEqual(saved['skin']['parts']['head']['rotation'],24)
        self.assertEqual(saved['skin']['parts']['head']['scale'],1.3)
        self.assertEqual(saved['skin']['parts']['head']['scale_x'],1.2)
        self.assertEqual(saved['skin']['parts']['head']['scale_y'],.9)
        self.assertEqual(json.loads((self.root/'game-characters.json').read_text())['characters'][saved['id']],saved)
        before=(self.root/'game-characters.json').read_bytes()
        for bad in [{'8':{}},{'0':{'lengths':{'nearShin':100}}},{'0':{'parts':{'head':{'scale':100}}}},
                    {'0':{'parts':{'head':{'file':'../evil'}}}},{'0':{'pose_base':{'bodyY':True}}},
                    {'0':{'parts':{'head':{'scale_x':100}}}},{'0':{'parts':{'head':{'scale_y':False}}}}]:
            with self.assertRaises(ValueError):save_character({**payload,'animation':{**payload['animation'],'frame_edits':bad}},self.root)
            self.assertEqual((self.root/'game-characters.json').read_bytes(),before)
        with self.assertRaises(ValueError):save_character({**payload,'part_transforms':{'head':{'scale':float('nan')}}},self.root)

    def test_update_backs_up_and_rejects_stale_version(self):
        first=save_character(self.payload,self.root)
        other=save_character({**self.payload,'name':'Jiná postava'},self.root)
        payload={**self.payload,'mode':'update','id':first['id'],'expectedRecord':first,'name':'Updated'}
        updated=save_character(payload,self.root)
        self.assertEqual(updated['id'],first['id'])
        self.assertEqual(updated['created_at'],first['created_at'])
        self.assertIn('updated_at',updated)
        catalog=json.loads((self.root/'game-characters.json').read_text())
        self.assertEqual(catalog['characters'][other['id']],other)
        backups=list((self.root/'history').glob('*.json'))
        self.assertEqual(len(backups),1)
        self.assertEqual(json.loads(backups[0].read_text())['record'],first)
        before=(self.root/'game-characters.json').read_bytes()
        with self.assertRaises(ValueError):save_character(payload,self.root)
        self.assertEqual((self.root/'game-characters.json').read_bytes(),before)

    def setUp(self):
        self.temp = tempfile.TemporaryDirectory()
        self.addCleanup(self.temp.cleanup)
        self.root = Path(self.temp.name)
        (self.root / 'zombie').mkdir()
        (self.root / 'skins.json').write_text(json.dumps({'skins': {'zombie': {'path': 'zombie/skin.json'}}}))
        self.skin = {'parts': {'head': {'file': 'head.png'}}, 'layers': ['head']}
        (self.root / 'zombie/skin.json').write_text(json.dumps(self.skin))
        self.payload = {'name': 'Moje zombie', 'skin_id': 'zombie', 'animation': {
            'id': 'original', 'name': 'Moje chůze', 'frames': [dict.fromkeys(LIMITS, 0) for _ in range(8)],
            'fps': 8, 'move_speed_pt_s': 13.5, 'rig_lengths': {'nearShin': 94}}}

    def test_append_snapshot_and_reopen(self):
        before = copy.deepcopy(self.payload)
        first = save_character(self.payload, self.root)
        second = save_character({**self.payload,'name':'Druhá postava'}, self.root)
        self.assertNotEqual(first['id'], second['id'])
        self.assertEqual(self.payload, before)
        self.payload['animation']['frames'][0]['bodyY'] = 77
        (self.root / 'zombie/skin.json').write_text('{}')
        saved = json.loads((self.root / 'game-characters.json').read_text())['characters']
        self.assertEqual(saved[first['id']], first)
        self.assertEqual(first['skin'], self.skin)
        self.assertEqual(first['animation']['frames'][0]['bodyY'], 0)
        self.assertEqual(first['animation']['rig_lengths']['nearShin'], 94)
        self.assertEqual(first['animation']['rig_lengths']['farShin'], 74)
        self.assertEqual(first['animation']['move_speed_pt_s'], 13.5)
        self.assertEqual(first['asset_base'], 'graphics/characters2/zombie/')

    def test_invalid_input_never_changes_catalog(self):
        save_character(self.payload, self.root)
        target = self.root / 'game-characters.json'
        before = target.read_bytes()
        invalid = [{**self.payload, 'name': ''}, {**self.payload, 'skin_id': '../elsewhere'},
                   {**self.payload, 'animation': None}]
        for key, values in {'rig_lengths': [{'nearShin': 0}, {'unknown': 42}, {'nearShin': True}],
                            'fps': [True, 0, 31], 'frames': [[]],
                            'move_speed_pt_s': [-1, True, float('nan')]}.items():
            invalid += [{**self.payload, 'animation': {**self.payload['animation'], key: value}} for value in values]
        for payload in invalid:
            with self.subTest(payload=payload), self.assertRaises(ValueError):
                save_character(payload, self.root)
            self.assertEqual(target.read_bytes(), before)

    def test_attachment_offsets_and_motion_roundtrip(self):
        payload={**self.payload, 'layers':['head'], 'part_offsets':{'head':[12,-8]}, 'motion':{'variation_percent':25}}
        saved=save_character(payload,self.root)
        self.assertEqual(saved['skin']['parts']['head']['offset'],[12,-8])
        self.assertEqual(saved['motion'],{'variation_percent':25,'coupled_cadence':True,'sample_once_per_actor':True})
        self.assertEqual(json.loads((self.root/'zombie/skin.json').read_text()),self.skin)
        before=(self.root/'game-characters.json').read_bytes()
        for changed in [{'layers':['head','head']},{'layers':[]},{'part_offsets':{'nope':[0,0]}},
                        {'part_offsets':{'head':[True,0]}},{'part_offsets':{'head':[2001,0]}},
                        {'motion':None},{'motion':{'variation_percent':-1}},{'motion':{'variation_percent':91}}]:
            with self.assertRaises(ValueError):save_character({**payload,**changed},self.root)
            self.assertEqual((self.root/'game-characters.json').read_bytes(),before)


if __name__ == '__main__':
    unittest.main()
