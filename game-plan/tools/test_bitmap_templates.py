import base64
import copy
import json
import tempfile
import unittest
from pathlib import Path
from bitmap_templates import save_template_image
from downscale_sprites import RgbaImage, write_rgba_png, read_rgba_png
from import_generalissimus_parts import extract
from import_sprite_sheet import sha256


class BitmapTemplatesTest(unittest.TestCase):
    def test_append_reference_conflict_and_backups(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'test').mkdir()
            original={'parts':{'head':{'file':'head.png'}},'layers':['head']}
            (root/'skins.json').write_text(json.dumps({'skins':{'test':{'path':'test/skin.json'}}}))
            target=root/'test/skin.json';target.write_text(json.dumps(original))
            png=root/'tiny.png';write_rgba_png(png,RgbaImage(2,2,bytes([255,0,0,255]*4)))
            payload=dict(id='test',mode='add-part',label='Krysa',expectedRecord=original,png=base64.b64encode(png.read_bytes()).decode())
            result=save_template_image(payload,root)['record']
            self.assertEqual(result['parts']['head'],original['parts']['head'])
            added=result['parts'][result['layers'][-1]]
            self.assertFalse(added['enabled']);self.assertEqual(added['fixed_length'],40)
            self.assertEqual(len(list((root/'test/history').glob('*.json'))),1)
            with self.assertRaises(ValueError):save_template_image(payload,root)
            payload.update(expectedRecord=result,mode='reference')
            updated=save_template_image(payload,root)['record']
            self.assertEqual(updated['parts'],result['parts']);self.assertTrue((root/'test'/updated['reference_image']).exists())
            before=target.read_bytes();payload.update(expectedRecord=updated,png=base64.b64encode(b'broken').decode())
            with self.assertRaises(ValueError):save_template_image(payload,root)
            self.assertEqual(target.read_bytes(),before)

    def test_replace_part_reloads_the_image_and_rescales_its_handles(self):
        with tempfile.TemporaryDirectory() as tmp:
            root=Path(tmp);(root/'test').mkdir()
            original={'parts':{'head':{'label':'Hlava','file':'head.png','size':[2,4],
                'start':[1,1],'end':[1,3],'bone':'head','enabled':True,'sha256':'old'},
                'clone':{'label':'Kopie','file':'head.png','source_part':'head'}},'layers':['head','clone']}
            (root/'skins.json').write_text(json.dumps({'skins':{'test':{'path':'test/skin.json'}}}))
            target=root/'test/skin.json';target.write_text(json.dumps(original))
            png=root/'bigger.png';write_rgba_png(png,RgbaImage(4,8,bytes([0,255,0,255]*32)))
            payload=dict(id='test',mode='replace-part',part='head',expectedRecord=original,
                png=base64.b64encode(png.read_bytes()).decode())
            head=save_template_image(payload,root)['record']['parts']['head']
            # The drawing is swapped in place: label, bone and switch survive, handles follow the new size.
            self.assertEqual(head['label'],'Hlava');self.assertEqual(head['bone'],'head');self.assertTrue(head['enabled'])
            self.assertEqual(head['size'],[4,8]);self.assertEqual(head['start'],[2,2]);self.assertEqual(head['end'],[2,6])
            self.assertNotEqual(head['sha256'],'old')
            self.assertTrue((root/'test'/head['file']).exists())
            self.assertEqual(len(list((root/'test/history').glob('*.json'))),1)
            # An attachment is not a part of the template and cannot be reloaded here.
            with self.assertRaises(ValueError):
                save_template_image(dict(payload,part='clone',expectedRecord=json.loads(target.read_text())),root)
            with self.assertRaises(ValueError):
                save_template_image(dict(payload,part='missing',expectedRecord=json.loads(target.read_text())),root)

    def test_approved_rat_parts_are_exact_unscaled_crops(self):
        root=Path(__file__).resolve().parents[1]/'graphics/bitmapove-predlohy/matka-vsech-krys-v1'
        manifest=json.loads((root/'parts.json').read_text())
        self.assertEqual(len(manifest['parts']),19)
        atlas=read_rgba_png(root/manifest['source'])
        self.assertEqual(sha256(root/manifest['source']),manifest['source_sha256'])
        for part in manifest['parts'].values():
            image=read_rgba_png(root/part['file'])
            self.assertEqual(image.pixels,extract(atlas,part['source_rect']).pixels)
            self.assertEqual(sha256(root/part['file']),part['sha256'])
            self.assertEqual([image.width,image.height],part['size'])

if __name__=='__main__':unittest.main()
