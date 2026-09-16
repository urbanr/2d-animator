"""Game-character snapshots with explicit updates, conflict checks and backups."""
import json
import math
import uuid
import unicodedata
from pathlib import Path
from datetime import datetime, timezone
from pose_library import validate_frame, validate_lengths, validate_joint_limits, validate_frame_edits, validate_part_transform, bounded

ROOT=Path(__file__).resolve().parents[1]/'graphics/characters2'


def name_key(name):
    return ' '.join(unicodedata.normalize('NFC',name).split()).lower()


def validate_animation(clip, skin, active, animation_id=None):
    if not isinstance(clip,dict):
        raise ValueError('Chybí kostra animace.')
    name=clip.get('name')
    if not isinstance(name,str) or not 1<=len(name.strip())<=100:
        raise ValueError('Zadej název animace do 100 znaků.')
    frames=clip.get('frames');fps=clip.get('fps');speed=clip.get('move_speed_pt_s',8)
    if not isinstance(frames,list) or not 2<=len(frames)<=32 or type(fps) is not int or not 1<=fps<=30:
        raise ValueError('Neplatné snímky nebo tempo.')
    if isinstance(speed,bool) or not isinstance(speed,(int,float)) or not math.isfinite(speed) or not 0<=speed<=1000:
        raise ValueError('Neplatná rychlost.')
    animation={'id':animation_id or str(uuid.uuid4()),'name':name.strip(),
               'source_clip_id':str(clip.get('source_clip_id',clip.get('id','')))[:100],
               'fps':fps,'move_speed_pt_s':speed,'rig_lengths':validate_lengths(clip.get('rig_lengths')),
               'joint_limits':validate_joint_limits(clip.get('joint_limits')),
               'frames':[validate_frame(f) for f in frames]}
    animation['frame_edits']=validate_frame_edits(clip.get('frame_edits'),animation['frames'],animation['rig_lengths'])
    for edit in animation['frame_edits'].values():
        for key,part in edit.get('parts',{}).items():
            if key not in active:
                raise ValueError('Výjimka odkazuje na neznámý díl.')
            base=skin['parts'][key]
            for axis in ('scale','scale_x','scale_y'):
                bounded(base.get(axis,1)*part.get(axis,1),.1-1e-8,10+1e-8)
            for i,v in enumerate(part.get('offset',[0,0])):
                bounded(base.get('offset',[0,0])[i]+v,-2000-1e-8,2000+1e-8)
            for i,v in enumerate(part.get('pivot_offset',[0,0])):
                bounded(base.get('pivot_offset',[0,0])[i]+v,-2000-1e-8,2000+1e-8)
    return animation


def animations_for(record):
    animations=record.get('animations')
    if isinstance(animations,dict):
        return copy_json(animations),record.get('default_animation_id')
    legacy=record.get('animation')
    if isinstance(legacy,dict):
        identifier='legacy-'+str(record.get('id','animation'))
        return {identifier:{**copy_json(legacy),'id':identifier}},identifier
    return {},None


def copy_json(value):
    return json.loads(json.dumps(value))


def write_catalog(target, catalog):
    temp=target.with_suffix('.json.tmp');temp.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');temp.replace(target)


def backup_record(root, previous):
    backup=root/'history';backup.mkdir(exist_ok=True)
    (backup/(str(uuid.uuid4())+'.json')).write_text(json.dumps({'record':previous},ensure_ascii=False,indent=2)+'\n')


def save_character(payload, root=ROOT):
    target=root/'game-characters.json'
    catalog=json.loads(target.read_text()) if target.exists() else {'schema_version':2,'characters':{}}
    mode=payload.get('mode','create')
    if mode in ('animation-create','animation-update','animation-delete'):
        identifier=payload.get('id')
        if not isinstance(identifier,str) or identifier not in catalog['characters']:
            raise ValueError('Nejprve vyber uloženou postavu.')
        previous=catalog['characters'][identifier]
        if payload.get('expectedRecord')!=previous:
            raise ValueError('Postava se mezitím změnila v jiné kartě. Nic se nepřepsalo. Načti aktuální postavu.')
        record=copy_json(previous);animations,default_id=animations_for(record)
        skin=record['skin'];active=[key for key in skin['layers'] if key not in ('pelvis','shoulders')]
        animation_id=payload.get('animation_id')
        if mode=='animation-delete':
            if not isinstance(animation_id,str) or animation_id not in animations:
                raise ValueError('Animace už u postavy neexistuje.')
            del animations[animation_id]
            default_id=next(iter(animations),None) if default_id==animation_id else default_id
        else:
            if mode=='animation-update' and (not isinstance(animation_id,str) or animation_id not in animations):
                raise ValueError('Animace už u postavy neexistuje. Použij Uložit jako.')
            if mode=='animation-create':
                animation_id=str(uuid.uuid4())
            animation_payload=copy_json(payload.get('animation'))
            animation_payload['name']=payload.get('name',animation_payload.get('name','Animace'))
            animations[animation_id]=validate_animation(animation_payload,skin,active,animation_id)
            default_id=animation_id
        record.pop('animation',None);record['animations']=animations;record['default_animation_id']=default_id
        if default_id:
            record['animation']=copy_json(animations[default_id])
        record['renderer']='cutout-rig-v2';record['updated_at']=datetime.now(timezone.utc).isoformat()
        backup_record(root,previous);catalog['characters'][identifier]=record;catalog['schema_version']=2;write_catalog(target,catalog)
        return record

    name=payload.get('name')
    if not isinstance(name,str) or not 1<=len(name.strip())<=100:
        raise ValueError('Zadej název herní postavy do 100 znaků.')
    skins=json.loads((root/'skins.json').read_text())['skins']
    skin_id=payload.get('skin_id')
    if not isinstance(skin_id,str) or skin_id not in skins:
        raise ValueError('Neznámá bitmapová postava.')
    skin_path=(root/skins[skin_id]['path']).resolve()
    skin_path.relative_to(root.resolve())
    skin=json.loads(skin_path.read_text())
    # Only transforms and ordering are client-editable; never trust file paths.
    active=[key for key in skin['layers'] if key not in ('pelvis','shoulders')]
    layers=payload.get('layers',active)
    if not isinstance(layers,list) or any(not isinstance(k,str) for k in layers) or len(layers)!=len(active) or set(layers)!=set(active):
        raise ValueError('Pořadí musí obsahovat každý aktivní díl právě jednou.')
    skin['layers']=layers
    offsets=payload.get('part_offsets',{})
    if not isinstance(offsets,dict) or set(offsets)-set(active):
        raise ValueError('Neplatné ukotvení dílů.')
    for key,offset in offsets.items():
        if not isinstance(offset,list) or len(offset)!=2 or any(isinstance(v,bool) or not isinstance(v,(int,float)) or not math.isfinite(v) or abs(v)>2000 for v in offset):
            raise ValueError('Posun uchycení musí být dvojice čísel od −2000 do 2000.')
        skin['parts'][key]['offset']=offset
    transforms=payload.get('part_transforms',{})
    if not isinstance(transforms,dict) or set(transforms)-set(active):
        raise ValueError('Neplatné bitmapové díly.')
    for key,value in transforms.items():
        skin['parts'][key].update(validate_part_transform(value))
    motion=payload.get('motion',{})
    if not isinstance(motion,dict):
        raise ValueError('Neplatné nastavení rychlosti.')
    spread=motion.get('variation_percent',0)
    if isinstance(spread,bool) or not isinstance(spread,(int,float)) or not math.isfinite(spread) or not 0<=spread<=90:
        raise ValueError('Rozptyl rychlosti musí být 0 až 90 %.')
    clip=payload.get('animation')
    identifier=str(uuid.uuid4())
    record={'id':identifier,'name':name.strip(),'created_at':datetime.now(timezone.utc).isoformat(),
            'renderer':'cutout-rig-v2','skin_id':skin_id,'skin':skin,
            'asset_base':'graphics/characters2/'+skin_path.parent.relative_to(root.resolve()).as_posix()+'/',
            'rig_units_per_game_point':16,
            'motion':{'variation_percent':spread,'coupled_cadence':True,'sample_once_per_actor':True}}
    matches=[r for r in catalog['characters'].values() if name_key(r['name'])==name_key(name)]
    if mode=='create' and matches:
        raise ValueError('Postava s tímto názvem už existuje. Znovu klikni na Uložit jako a potvrď přepsání, nebo zadej jiný název. Nic se neuložilo.')
    if mode=='update':
        identifier=payload.get('id')
        if not isinstance(identifier,str) or identifier not in catalog['characters']:
            raise ValueError('Postava neexistuje. Použij Uložit jako.')
        previous=catalog['characters'][identifier]
        if name_key(previous['name'])!=name_key(name) and any(r['id']!=identifier for r in matches):
            raise ValueError('Jiná postava už má tento název. Nic se nepřepsalo.')
        if payload.get('expectedRecord')!=previous:
            raise ValueError('Postava se mezitím změnila v jiné kartě. Nic se nepřepsalo. Použij Uložit jako nebo načti aktuální postavu.')
        animations,default_id=animations_for(previous)
        if clip is not None:
            current_id=default_id or str(uuid.uuid4())
            animations[current_id]=validate_animation(clip,skin,active,current_id);default_id=current_id
        animations={key:validate_animation(value,skin,active,key) for key,value in animations.items()}
        record.update(id=identifier,created_at=previous['created_at'],updated_at=datetime.now(timezone.utc).isoformat(),animations=animations,default_animation_id=default_id)
        if default_id:
            record['animation']=copy_json(animations[default_id])
        backup_record(root,previous)
    elif mode!='create':
        raise ValueError('Neznámý způsob uložení.')
    else:
        animation=validate_animation(clip,skin,active)
        record['animations']={animation['id']:animation};record['default_animation_id']=animation['id'];record['animation']=copy_json(animation)
    catalog['characters'][identifier]=record
    catalog['schema_version']=2;write_catalog(target,catalog)
    return record
