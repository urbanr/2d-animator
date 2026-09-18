import copy
import json
import tempfile
import unittest
from pathlib import Path
from pose_library import validate_extra_bones, validate_frame, validate_part_transform, save_pose, LIMITS
from migrate_rig_extensions import migrate


class RigExtensionsTest(unittest.TestCase):
    def test_validation_and_roundtrip(self):
        bones={'extra_rat':dict(label='Krysa', parent='nearForearm',at=1,offset=[0,0],length=40,angle=0)}
        self.assertEqual(validate_extra_bones(bones),bones)
        cyclic=copy.deepcopy(bones);cyclic['extra_rat']['parent']='extra_rat'
        with self.assertRaises(ValueError): validate_extra_bones(cyclic)
        transform=dict(bone='extra_rat',source_part='head',enabled=False,opacity=.4,fixed_length=40)
        self.assertEqual(validate_part_transform(transform),transform)
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'bank.json';path.write_text('{"finished_animations":{}}')
            frame=dict.fromkeys(LIMITS,0);frame['extra_pose']={'extra_rat':{'angle':45}}
            payload=dict(kind='finished_animation',name='Krysa',skin_id='test',frames=[frame],fps=8,extra_bones=bones,bitmap={'layers':['rat'],'parts':{'rat':transform}})
            record=save_pose(payload,path)['record']
            self.assertEqual(record['frames'][0]['extra_pose'],frame['extra_pose'])
            self.assertEqual(record['bitmap']['parts']['rat'],transform)
            self.assertEqual(record['extra_bones'],bones)
            payload.update(mode='update',id=record['id'],expectedRecord=record)
            self.assertEqual(save_pose(payload,path)['record']['extra_bones'],bones)
            pose=save_pose(dict(kind='pose',name='Póza',frame=frame,extra_bones=bones),path)['record']
            saved=save_pose(dict(kind='pose',name='Póza',frame=frame,extra_bones=bones,mode='update',id=pose['id'],expectedRecord=pose),path)['record']
            self.assertEqual(saved['extra_bones'],bones)
            with self.assertRaises(ValueError):save_pose(dict(kind='clip',name='Chyba',frames=[frame],fps=8,extra_bones={}),path)

    def test_migration_backup_and_idempotence(self):
        with tempfile.TemporaryDirectory() as folder:
            root=Path(folder)
            files={'bitmapove-predlohy/skins.json':{'skins':{'test':{'path':'test/skin.json'}}},
                   'bitmapove-predlohy/test/skin.json':{'schema_version':1,'parts':{'head':{'scale':1.8,'offset':[5,9]}},'layers':['head']},
                   'kostry/skeletons.json':{'clips':{'a':{'frames':[dict.fromkeys(LIMITS,0)]}}},
                   'animace/animations.json':{'finished_animations':{'a':{'bitmap':{'layers':['head'],'parts':{'head':{'rotation':18}}}}}}}
            for rel,value in files.items():
                path=root/rel;path.parent.mkdir(parents=True,exist_ok=True);path.write_text(json.dumps(value))
            backup=migrate(root)
            self.assertIsNotNone(backup)
            self.assertEqual(json.loads((backup/'bitmapove-predlohy/test/skin.json').read_text()),files['bitmapove-predlohy/test/skin.json'])
            self.assertEqual(json.loads((root/'bitmapove-predlohy/test/skin.json').read_text())['parts']['head']['scale'],1.8)
            self.assertIsNone(migrate(root))


if __name__=='__main__': unittest.main()
