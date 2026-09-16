#!/usr/bin/env python3
"""Create calibrated cutout textures with the approved deterministic finishing profile."""
import argparse
import json
import math
import subprocess
from pathlib import Path
from downscale_sprites import ENEMY_PRODUCTION_V1, migrate

ROOT=Path(__file__).resolve().parents[1]


def build(skin_path, width=192):
    skin_path=Path(skin_path).resolve()
    skin=json.loads(skin_path.read_text())
    destination=skin_path.parent/f'game-{width}'
    if destination.exists():
        raise ValueError(f'{destination} již existuje; původní variantu nepřepisuji.')
    if not 96<=width<=512:
        raise ValueError('Šířka musí být 96 až 512 px.')
    bones=json.loads(subprocess.check_output(['node','-e',
        "const R=require(process.argv[1]),C=require(process.argv[2]);process.stdout.write(JSON.stringify(C.bones(R.neutral())));",
        str(ROOT/'tool/pose-rig.js'),str(ROOT/'tool/cutout-rig.js')],text=True))
    destination.mkdir()
    manifest={'schema_version':1,'skin_id':skin['id'],'profile':'enemy-production-v1',
              'settings':ENEMY_PRODUCTION_V1,'canvas_px':[width,round(width*560/512)],
              'rig_canvas':[512,560],'coordinate_space':'original-source-pixels',
              'description':'Textures only. Keep original attachment anchors, offsets and rig geometry.', 'parts':{}}
    for key in skin['layers']:
        if key not in bones:
            continue
        part=skin['parts'][key]
        # Pixel density follows each part's actual attachment scale, not its atlas crop size.
        a,b=bones[key]
        scale=math.hypot(b['x']-a['x'],b['y']-a['y'])/math.dist(part['start'],part['end'])*width/512
        w,h=[max(1,min(size,math.ceil(size*scale))) for size in part['size']]
        result=migrate(skin_path.parent/part['file'],destination/(key+'.png'),width=w,height=h,
                       fit='stretch',anchor='center',overwrite=False,profile_name='enemy-production-v1',**ENEMY_PRODUCTION_V1)
        record=result['files'][0]
        manifest['parts'][key]={'file':f'game-{width}/{key}.png','size':[w,h],
                                'source_file':part['file'],'source_size':part['size'],
                                'source_sha256':record['source_sha256'],'sha256':record['output_sha256']}
    (destination/'manifest.json').write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    return destination


if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('skin',type=Path)
    parser.add_argument('--width',type=int,default=192)
    args=parser.parse_args()
    print(build(args.skin,args.width))
