import hashlib
import json
import unittest
from pathlib import Path
from downscale_sprites import (ENEMY_PRODUCTION_V1,read_rgba_png,downscale,
                               apply_photopea_darken,apply_outer_edge_darken,apply_ink_blackness)


class GamePartsTests(unittest.TestCase):
    def test_generated_parts_match_approved_pipeline_and_sources(self):
        root=Path(__file__).resolve().parents[1]/'graphics/characters2/bezec-zombie-v1'
        skin=json.loads((root/'skin.json').read_text())
        manifest=json.loads((root/'game-192/manifest.json').read_text())
        self.assertEqual(manifest['settings'],ENEMY_PRODUCTION_V1)
        self.assertEqual(manifest['canvas_px'],[192,210])
        self.assertEqual(set(manifest['parts']),set(skin['layers']))
        settings=ENEMY_PRODUCTION_V1
        for key,part in manifest['parts'].items():
            with self.subTest(part=key):
                source_path=root/part['source_file'];output_path=root/part['file']
                self.assertEqual(hashlib.sha256(source_path.read_bytes()).hexdigest(),part['source_sha256'])
                self.assertEqual(hashlib.sha256(output_path.read_bytes()).hexdigest(),part['sha256'])
                source=read_rgba_png(source_path);output=read_rgba_png(output_path)
                self.assertEqual([output.width,output.height],part['size'])
                self.assertLess(output.width,source.width);self.assertLess(output.height,source.height)
                result=downscale(source,*part['size'],**{k:settings[k] for k in ['dark_strength','lambda_value','dark_threshold','detail_floor']})
                alpha=result.pixels[3::4]
                result=apply_photopea_darken(result,brightness=settings['photopea_brightness'],contrast=settings['photopea_contrast'],darken_opacity=settings['photopea_darken_opacity'])
                result=apply_outer_edge_darken(result,strength=settings['outer_edge_strength'])
                result=apply_ink_blackness(result,strength=settings['ink_blackness_strength'],threshold=settings['ink_blackness_threshold'])
                self.assertEqual(result.pixels,output.pixels)
                self.assertEqual(alpha,output.pixels[3::4])
                self.assertTrue(any(a>0 for a in alpha))
                self.assertTrue(any(a==0 for a in alpha))


if __name__=='__main__':unittest.main()
