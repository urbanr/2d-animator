#!/usr/bin/env python3
"""Import the explicitly approved 2026-09-17 atlas, preserving every source pixel."""
import argparse
import json
import shutil
from pathlib import Path
from downscale_sprites import read_rgba_png, write_rgba_png
from import_generalissimus_parts import extract, padded_crop
from import_sprite_sheet import sha256, visible_bounds

ROOT = Path(__file__).resolve().parents[1] / 'graphics/bitmapove-predlohy'
ROWS = [
    (0, 328, [0, 277, 480, 765, 1010, 1254], ['head', 'neck', 'torso', 'pelvis', 'backpack']),
    (328, 637, [0, 235, 500, 720, 1005, 1254], ['nearUpperArm', 'nearForearm', 'farUpperArm', 'farForearm', 'tail']),
    (637, 945, [0, 270, 500, 760, 1000, 1254], ['nearThigh', 'nearShin', 'farThigh', 'farShin', None]),
    (945, 1254, [0, 245, 495, 758, 1000, 1254], ['nearFoot', 'farFoot', 'ratA', 'ratB', 'ratC']),
]
LABELS = dict(head='Hlava s korunou', neck='Krk', torso='Trup', pelvis='Pánev', backpack='Nádrž', tail='Ocas',
              nearUpperArm='Bližší nadloktí', nearForearm='Bližší předloktí s drápy', farUpperArm='Vzdálenější nadloktí', farForearm='Vzdálenější předloktí s drápy',
              nearThigh='Bližší stehno', nearShin='Bližší holeň', farThigh='Vzdálenější stehno', farShin='Vzdálenější holeň',
              nearFoot='Bližší chodidlo', farFoot='Vzdálenější chodidlo', ratA='Malá krysa A', ratB='Malá krysa B', ratC='Malá krysa C')

def import_parts(atlas, reference, target):
    if target.exists():
        raise ValueError('Cílová složka už existuje; import nic nepřepisuje.')
    sheet = read_rgba_png(atlas)
    if (sheet.width, sheet.height) != (1254, 1254):
        raise ValueError('Import vyžaduje schválený atlas 1254 × 1254.')
    if min(sheet.pixels[3::4]) != 0:
        raise ValueError('Schválený atlas má vlastní alfa kanál; očekávám původní PNG.')
    pending = {}
    for y, bottom, columns, keys in ROWS:
        for i, key in enumerate(keys):
            if key is None:
                continue
            rect = [columns[i], y, columns[i+1]-columns[i], bottom-y]
            cell = extract(sheet, rect)
            bounds = visible_bounds(cell)
            if not bounds:
                raise ValueError('Prázdný díl: '+key)
            crop = padded_crop(bounds, cell.width, cell.height)
            part = extract(cell, crop)
            pending[key] = (part, rect, [rect[0]+crop[0], rect[1]+crop[1], crop[2], crop[3]])
    (target/'source').mkdir(parents=True)
    (target/'parts').mkdir()
    shutil.copy2(atlas, target/'source/parts-atlas.png')
    shutil.copy2(reference, target/'source/character-reference.png')
    parts = {}
    for key, (image, cell, crop) in pending.items():
        output = target/'parts'/f'{key}.png'
        write_rgba_png(output, image)
        w,h = image.width,image.height
        start,end = [.5*w,.15*h],[.5*w,.85*h]
        if key.endswith('Forearm'): start,end=[.76*w,.16*h],[.28*w,.70*h]
        if key.endswith('Foot'): start,end=[.80*w,.25*h],[.22*w,.70*h]
        if key=='head': start,end=[.78*w,.75*h],[.50*w,.35*h]
        if key=='pelvis': start,end=[.5*w,-1.5*h],[.5*w,.60*h]
        if key=='tail': start,end=[.15*w,.10*h],[.65*w,.50*h]
        if key.startswith('rat'): start,end=[.5*w,.5*h],[.5*w,.9*h]
        parts[key] = dict(label=LABELS[key], file=f'parts/{key}.png',size=[w,h],source_cell=cell,source_rect=crop,
                          sha256=sha256(output),start=start,end=end,offset=[0,0],rotation=0,scale=1,bone=key,enabled=True,opacity=1)
        if key=='head': parts[key]['scale']=2
        if key=='tail' or key.startswith('rat'):
            parts[key].update(bone='pelvis' if key=='tail' else 'torso',enabled=False,fixed_length=60 if key=='tail' else 22)
    manifest=dict(schema_version=2,id=target.name,name='Matka všech krys · vzpřímený boss',rig='pose-rig-v1',facing='left',
                  status='approved-parts-initial-anchors',reference_image='source/character-reference.png',reference_label='Schválený celkový návrh · Matka všech krys na zadních',
                  source='source/parts-atlas.png',source_sha256=sha256(atlas),source_size=[1254,1254],background='original-alpha-preserved',resampled=False,
                  layers=['tail','backpack','farUpperArm','farForearm','farThigh','farShin','farFoot','nearThigh','nearShin','nearFoot','pelvis','torso','neck','head','nearUpperArm','nearForearm','ratA','ratB','ratC'],parts=parts)
    for relative in ['skin.json','parts.json','source/import-v1.json']:
        (target/relative).write_text(json.dumps(manifest,ensure_ascii=False,indent=2)+'\n')
    print(f'Imported {len(parts)} approved parts into {target}')

if __name__=='__main__':
    parser=argparse.ArgumentParser()
    parser.add_argument('atlas',type=Path)
    parser.add_argument('reference',type=Path)
    parser.add_argument('--target',type=Path,default=ROOT/'matka-vsech-krys-v1')
    args=parser.parse_args()
    import_parts(args.atlas,args.reference,args.target)
