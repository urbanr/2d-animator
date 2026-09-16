"""Game-character snapshots with explicit updates, conflict checks and backups."""
import json
import math
import uuid
import unicodedata
from pathlib import Path
from datetime import datetime, timezone

ROOT=Path(__file__).resolve().parents[1]/'graphics/characters2'
ANIMATION_STORE=Path(__file__).resolve().parents[1]/'graphics/poses/poses.json'


def name_key(name):
    return ' '.join(unicodedata.normalize('NFC',name).split()).lower()


def animations_for(record):
    identifiers=record.get('animation_ids',[])
    if not isinstance(identifiers,list) or any(not isinstance(value,str) for value in identifiers) or len(identifiers)!=len(set(identifiers)):
        raise ValueError('Postava má neplatné odkazy na animace.')
    default_id=record.get('default_animation_id')
    if default_id is not None and default_id not in identifiers:
        raise ValueError('Výchozí animace není přiřazená postavě.')
    return list(identifiers),default_id


def animation_library(path):
    data=json.loads(path.read_text())
    animations=data.get('finished_animations',{})
    if not isinstance(animations,dict):
        raise ValueError('Knihovna animací je poškozená.')
    return animations


def validate_animation_id(value, animations):
    if not isinstance(value,str) or value not in animations:
        raise ValueError('Vybraná animace neexistuje ve společné knihovně.')
    return value


def copy_json(value):
    return json.loads(json.dumps(value))


def write_catalog(target, catalog):
    temp=target.with_suffix('.json.tmp');temp.write_text(json.dumps(catalog,ensure_ascii=False,indent=2)+'\n');temp.replace(target)


def backup_record(root, previous):
    backup=root/'history';backup.mkdir(exist_ok=True)
    (backup/(str(uuid.uuid4())+'.json')).write_text(json.dumps({'record':previous},ensure_ascii=False,indent=2)+'\n')


def save_character(payload, root=ROOT, animation_store=ANIMATION_STORE):
    target=root/'game-characters.json'
    catalog=json.loads(target.read_text()) if target.exists() else {'schema_version':3,'characters':{}}
    mode=payload.get('mode','create')
    if mode in ('animation-link','animation-unlink'):
        identifier=payload.get('id')
        if not isinstance(identifier,str) or identifier not in catalog['characters']:
            raise ValueError('Nejprve vyber uloženou postavu.')
        previous=catalog['characters'][identifier]
        if payload.get('expectedRecord')!=previous:
            raise ValueError('Postava se mezitím změnila v jiné kartě. Nic se nepřepsalo. Načti aktuální postavu.')
        record=copy_json(previous);animation_ids,default_id=animations_for(record)
        animation_id=payload.get('animation_id')
        if mode=='animation-unlink':
            if not isinstance(animation_id,str) or animation_id not in animation_ids:
                raise ValueError('Animace už u postavy není přiřazená.')
            animation_ids.remove(animation_id)
            default_id=animation_ids[0] if default_id==animation_id and animation_ids else None
        else:
            animation_id=validate_animation_id(animation_id,animation_library(animation_store))
            if animation_id not in animation_ids:animation_ids.append(animation_id)
            if payload.get('make_default',True):default_id=animation_id
        record.pop('animation',None);record.pop('animations',None);record['animation_ids']=animation_ids;record['default_animation_id']=default_id
        record['renderer']='cutout-rig-v2';record['updated_at']=datetime.now(timezone.utc).isoformat()
        backup_record(root,previous);catalog['characters'][identifier]=record;catalog['schema_version']=3;write_catalog(target,catalog)
        return record

    name=payload.get('name')
    if not isinstance(name,str) or not 1<=len(name.strip())<=100:
        raise ValueError('Zadej název herní postavy do 100 znaků.')
    if {'skin_id','skin','layers','part_offsets','part_transforms','animation','animations'}.intersection(payload):
        raise ValueError('Bitmapa a její úpravy patří hotové animaci, ne postavě.')
    motion=payload.get('motion',{})
    if not isinstance(motion,dict):
        raise ValueError('Neplatné nastavení rychlosti.')
    spread=motion.get('variation_percent',0)
    if isinstance(spread,bool) or not isinstance(spread,(int,float)) or not math.isfinite(spread) or not 0<=spread<=90:
        raise ValueError('Rozptyl rychlosti musí být 0 až 90 %.')
    animation_id=payload.get('animation_id')
    if animation_id is not None:
        animation_id=validate_animation_id(animation_id,animation_library(animation_store))
    identifier=str(uuid.uuid4())
    record={'id':identifier,'name':name.strip(),'created_at':datetime.now(timezone.utc).isoformat(),
            'renderer':'cutout-rig-v2',
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
        animation_ids,default_id=animations_for(previous)
        if animation_id is not None and animation_id not in animation_ids:animation_ids.append(animation_id);default_id=animation_id
        record.update(id=identifier,created_at=previous['created_at'],updated_at=datetime.now(timezone.utc).isoformat(),animation_ids=animation_ids,default_animation_id=default_id)
        backup_record(root,previous)
    elif mode!='create':
        raise ValueError('Neznámý způsob uložení.')
    else:
        record['animation_ids']=[animation_id] if animation_id else [];record['default_animation_id']=animation_id
    catalog['characters'][identifier]=record
    record.pop('animation',None);record.pop('animations',None)
    catalog['schema_version']=3;write_catalog(target,catalog)
    return record
