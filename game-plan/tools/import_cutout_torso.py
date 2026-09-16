"""Replace only the trial's torso attachment, retaining the original skin and pixels."""
import json
from import_cutout_trial import ROOT, extract
from downscale_sprites import read_rgba_png, write_rgba_png
from import_sprite_sheet import remove_connected_gray_background, visible_bounds, sha256

source=ROOT/'source/torso-v2-generated.png'
raw=read_rgba_png(source)
clean,_=remove_connected_gray_background(raw)
b=visible_bounds(clean)
rect=[b[0]-3,b[1]-3,b[2]-b[0]+7,b[3]-b[1]+7]
part=extract(clean,rect)
output=ROOT/'parts/torso-v2.png'
backup=ROOT/'source/skin-before-torso-fix.json'
if output.exists() or backup.exists():
    raise ValueError('Torso correction already imported')
write_rgba_png(output,part)
skin_path=ROOT/'skin.json'
backup.write_bytes(skin_path.read_bytes())
skin=json.loads(skin_path.read_text())
# Authored source-pixel attachment points scaled only for generator canvas dimensions.
def point(x,y):return [x/931*raw.width-rect[0],y/1690*raw.height-rect[1]]
skin['parts']['torso']={'label':'Trup bez přikreslené paže','file':'parts/torso-v2.png',
    'size':[part.width,part.height],'start':point(475,460),'end':point(490,1100),
    'source_rect':rect,'source':'source/torso-v2-generated.png','source_sha256':sha256(source),
    'sha256':sha256(output)}
skin_path.write_text(json.dumps(skin,ensure_ascii=False,indent=2)+'\n')
print('Imported corrected torso:',part.width,part.height)
