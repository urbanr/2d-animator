#!/usr/bin/env python3
"""Import authored part regions and attachment points. Never resample the art."""
import json
from pathlib import Path
from downscale_sprites import RgbaImage, read_rgba_png, write_rgba_png
from import_sprite_sheet import remove_connected_gray_background, visible_bounds, sha256

ROOT=Path(__file__).resolve().parents[1]/'graphics/characters2/bezec-zombie-v1'
# Rectangles and joints are authored for this specific 1254px atlas, not auto-fitted per pose.
PARTS=[
 ('head','Hlava a krk',[0,0,355,320],[177,266],[177,204]),
 ('torso','Trup',[355,0,272,320],[475,103],[475,272]),
 ('pelvis','Pánev',[627,0,315,320],[735,132],[735,222]),
 ('backpack','Nádrž',[942,0,312,320],[1105,132],[1105,420]),
 ('nearUpperArm','Bližší paže',[0,320,314,307],[168,367],[173,540]),
 ('nearForearm','Bližší předloktí a ruka',[314,320,313,307],[473,366],[464,575]),
 ('farUpperArm','Vzdálenější paže',[627,320,315,307],[780,374],[780,547]),
 ('farForearm','Vzdálenější předloktí a ruka',[942,320,312,307],[1100,363],[1082,575]),
 ('nearThigh','Bližší stehno',[0,627,314,320],[166,670],[139,846]),
 ('nearShin','Bližší lýtko',[314,627,313,320],[473,697],[478,881]),
 ('farThigh','Vzdálenější stehno',[627,627,315,320],[779,672],[795,858]),
 ('farShin','Vzdálenější lýtko',[942,627,312,320],[1100,694],[1108,879]),
 ('nearFoot','Bližší červená bota',[0,947,314,307],[237,1040],[82,1040]),
 ('farFoot','Vzdálenější hnědá bota',[314,947,313,307],[541,1040],[386,1040]),
]


def extract(image,rect):
    x,y,w,h=rect
    return RgbaImage(w,h,b''.join(image.pixels[((y+j)*image.width+x)*4:((y+j)*image.width+x+w)*4] for j in range(h)))


def main():
    source=ROOT/'source/parts-atlas.png'
    sheet=read_rgba_png(source)
    if (sheet.width,sheet.height)!=(1254,1254):
        raise ValueError('Atlas dimensions differ from the authored regions')
    target=ROOT/'skin.json'
    if target.exists():
        raise ValueError('Existing skin is immutable; use a new version')
    (ROOT/'parts').mkdir(exist_ok=True)
    has_alpha=any(a<255 for a in sheet.pixels[3::4])
    skin={'schema_version':1,'id':'bezec-zombie-v1','name':'Běžec · zombie cutout v1',
          'status':'experiment','rig':'pose-rig-v1','facing':'left','default_clip':'6a4fa087-fbbf-42cd-82ae-49b53a510bf5',
          'source_sha256':sha256(source),'source_size':[1254,1254],
          'background':'preserved-generated-alpha' if has_alpha else 'connected-gray',
          'layers':['farUpperArm','farForearm','farFoot','farThigh','farShin',
                    'nearFoot','nearThigh','nearShin','backpack','torso','head','nearUpperArm','nearForearm'],
          'parts':{}}
    for key,label,rect,start,end in PARTS:
        part=extract(sheet,rect)
        if not has_alpha:
            part,_=remove_connected_gray_background(part)
        bounds=visible_bounds(part)
        if not bounds:
            raise ValueError('Empty part: '+key)
        x0,y0,x1,y1=bounds
        if min(x0,y0,part.width-1-x1,part.height-1-y1)<2:
            raise ValueError('Part crosses authored region: '+key)
        crop=[max(0,x0-3),max(0,y0-3),min(part.width,x1+4)-max(0,x0-3),min(part.height,y1+4)-max(0,y0-3)]
        cropped=extract(part,crop)
        path=ROOT/'parts'/f'{key}.png'
        if path.exists():
            raise ValueError('Existing part: '+key)
        write_rgba_png(path,cropped)
        origin=[rect[0]+crop[0],rect[1]+crop[1]]
        skin['parts'][key]={'label':label,'file':f'parts/{key}.png','size':[cropped.width,cropped.height],
                           'start':[start[i]-origin[i] for i in range(2)],'end':[end[i]-origin[i] for i in range(2)],
                           'source_rect':[origin[0],origin[1],cropped.width,cropped.height],'sha256':sha256(path)}
    target.write_text(json.dumps(skin,ensure_ascii=False,indent=2)+'\n')
    print('Imported',len(skin['parts']),'bitmap parts, original alpha:',has_alpha)


if __name__=='__main__':
    main()
