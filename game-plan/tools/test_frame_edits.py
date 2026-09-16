import copy
import json
import tempfile
import unittest
from pathlib import Path
from pose_library import LIMITS, save_pose


class FrameEditsTests(unittest.TestCase):
    def test_pose_save_update_reset_and_legacy_preservation(self):
        with tempfile.TemporaryDirectory() as folder:
            path=Path(folder)/'poses.json'
            path.write_text(json.dumps({'clips':{},'poses':{}}))
            edits={'0':{'pose_base':{'bodyY':0},'lengths':{'nearFoot':1.2},'parts':{'nearFoot':{'rotation':12,'scale':1.1,'offset':[1,2]}}}}
            payload={'kind':'clip','name':'Test','fps':8,'frames':[dict.fromkeys(LIMITS,0) for _ in range(8)],'frame_edits':edits}
            saved=save_pose(payload,path)['record']
            self.assertEqual(saved['frame_edits'],edits)
            legacy={k:v for k,v in payload.items() if k!='frame_edits'}
            saved=save_pose({**legacy,'mode':'update','id':saved['id'],'expectedRecord':saved},path)['record']
            self.assertEqual(saved['frame_edits'],edits)
            reset=save_pose({**payload,'frame_edits':{},'mode':'update','id':saved['id'],'expectedRecord':saved},path)['record']
            self.assertEqual(reset['frame_edits'],{})
            before=path.read_bytes()
            for bad in [[],{'01':{}},{'0':{'parts':{'head':{'scale':0}}}},{'0':{'pose_base':{'bogus':3}}}]:
                with self.assertRaises(ValueError):save_pose({**payload,'frame_edits':bad},path)
                self.assertEqual(path.read_bytes(),before)
            self.assertEqual(payload['frame_edits'],edits)


if __name__=='__main__':unittest.main()
