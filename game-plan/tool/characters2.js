(async function(){
  'use strict';
  const R=window.PoseRig,C=window.CutoutRig,E=window.CutoutEditor,M=window.MotionPreview,$=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v));
  let skinURL=new URL('../graphics/characters2/bezec-zombie-v1/skin.json',location.href),skinCatalog,gameCatalog;
  const stage=$('stage'),ctx=stage.getContext('2d'),mini=$('mini'),images={},hitMasks={};
  const gameImages={},gameMasks={},pixelFrame=document.createElement('canvas');
  let gameManifest=null;
  mini.width=192;mini.height=210;pixelFrame.width=192;pixelFrame.height=210;
  const pixelMode=()=>$('renderMode').value==='game'&&Boolean(gameManifest);
  const activeImages=()=>pixelMode()?gameImages:images;
  const drawRig=(context,skin,images,pose,options={})=>C.draw(context,skin,images,pose,{...options,createCanvas:()=>document.createElement('canvas')});
  function paintCharacter(context,pose,options={}){
    if(!pixelMode()){drawRig(context,skin,images,pose,options);return;}
    const low=pixelFrame.getContext('2d');low.clearRect(0,0,pixelFrame.width,pixelFrame.height);
    low.save();low.imageSmoothingEnabled=false;low.scale(pixelFrame.width/512,pixelFrame.height/560);
    drawRig(low,skin,gameImages,pose,{lengths:options.lengths});low.restore();
    context.save();context.imageSmoothingEnabled=false;context.drawImage(pixelFrame,0,0,512,560);context.restore();
    if(options.skeleton)drawRig(context,skin,images,pose,{...options,skeletonOnly:true});
  }
  let skin,library,clip,phase=0,playing=false,visible=true,last=0,dirty=false,drag=null,history=[],future=[],saving=false;
  let distance=0;
  let zoom=1;
  let pan={x:0,y:0},skinDirty=false,spread=15,delta=0;
  let characterId='',characterSaving=false;
  $('editTarget').value='skeleton';$('editTool').value='rotate';$('editScope').value='frame';
  const toolChoices={editTool:{toolMove:'move',toolRotate:'rotate',toolSize:'size'}};
  const animationId=()=>clip?.id?.startsWith('character:')?(library.clips[clip.source_clip_id]?clip.source_clip_id:null):clip?.id;
  function saveButtons(){
    const busy=saving||characterSaving;
    $('saveCharacter').disabled=busy;$('save').disabled=busy;
    $('updateCharacter').disabled=busy||!characterId;
    $('updateAnimation').disabled=busy||!animationId();
    $('deleteCharacter').disabled=busy||!characterId;
    $('deleteAnimation').disabled=busy||!animationId();
    $('animationName').textContent=clip?.name||'';
  }
  function saveError(e){status(e instanceof TypeError||e.message==='Failed to fetch'?'Nelze se spojit s ukládáním. Použij http://127.0.0.1:8765/tool/preview.html?sekce=postavy2. Rozpracované změny zůstávají v editoru; můžeš stáhnout data jako zálohu.':e.message,true);}
  const status=(s,error=false)=>{$('status').textContent=s;$('status').classList.toggle('error',error);};
  async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Nelze načíst '+url);return r.json();}
  const index=()=>Math.floor(phase)%clip.frames.length;
  const scope=()=>$('editScope').value==='all'?'all':'frame';
  const snapshot=()=>copy({clip,skin,skinDirty,spread,index:index(),selected:$('layerOrder').value});
  function remember(){history.push(snapshot());future=[];if(history.length>60)history.shift();}
  function syncTools(){
    syncFade();
    for(const [group,choices] of Object.entries(toolChoices))for(const [id,value] of Object.entries(choices))$(id).setAttribute('aria-pressed',String($(group).value===value));
    $('editScope').setAttribute('aria-checked',String(scope()==='all'));
    $('editTarget').setAttribute('aria-checked',String($('editTarget').value==='bitmap'));
    $('undo').disabled=!history.length;$('redo').disabled=!future.length;
    $('resetFrame').disabled=!clip.frame_edits?.[index()]||!Object.keys(clip.frame_edits[index()]).length;
    $('editTools').classList.toggle('whole',scope()==='all');
    $('scopeNote').textContent=scope()==='all'?`Všech ${clip.frames.length} snímků · ${$('editTarget').value==='bitmap'?'posun vůči uchycení, velikost stejným poměrem':'zachovává rozdíly mezi pózami'}.`:`Jen aktuální snímek ${index()+1} · Celá animace je vypnutá.`;
    if(scope()==='all'&&$('editTarget').value==='bitmap'){
      const custom=Object.values(clip.frame_edits||{}).filter(e=>Object.keys(e.parts?.[$('layerOrder').value]||{}).length).length;
      if(custom)$('scopeNote').textContent+=` Dřívější výjimky tohoto dílu (${custom} snímků) zůstávají. Přepnutí je nesjednotí.`;
    }
  }
  function mark(){dirty=true;status('Neuložené změny — celou kombinaci včetně bitmapových výjimek uložíš v části Postava.');syncTools();}
  function syncFade(){
    const key=$('layerOrder').value,allowed=C.canFade(key)&&Boolean(skin.parts[key]);
    for(const id of ['fadeStrength','fadeRadius','fadeDirection','fadeEnd','fadeClear','fadeX','fadeY','fadeAngle'])$(id).disabled=!allowed;
    $('fadePart').textContent=skin.parts[key]?.label||'';
    if(!allowed)return;
    const f=C.fadeFor(C.partFor(skin,key,C.sample(clip,phase,$('smooth').checked)),$('fadeEnd').value||'start');
    for(const [id,value] of Object.entries({fadeStrength:Math.round(f.strength*100),fadeRadius:Math.round(f.radius),fadeDirection:f.direction,fadeX:f.offset[0],fadeY:f.offset[1],fadeAngle:f.angle}))if(document.activeElement!==$(id))$(id).value=value;
    $('fadeValue').textContent=Math.round(f.strength*100)+' %';
  }
  function changeFade(values,record=true){
    const key=$('layerOrder').value;if(!C.canFade(key))return;
    freeze();const result=E.fadeChange(clip,skin,index(),key,$('fadeEnd').value||'start',values,scope());
    if(record)remember();({clip,skin}=result);skinDirty=true;mark();thumbnails();draw();
  }
  $('fadeEnd').onchange=()=>draw();
  let fadeSliding=false;
  $('fadeStrength').oninput=()=>{changeFade({strength:R.clamp(Number($('fadeStrength').value)/100,0,1)},!fadeSliding);fadeSliding=true;};
  $('fadeStrength').onchange=()=>{changeFade({strength:R.clamp(Number($('fadeStrength').value)/100,0,1)},!fadeSliding);fadeSliding=false;};
  $('fadeStrength').onpointercancel=()=>{fadeSliding=false;};
  $('fadeRadius').onchange=()=>{const v=Number($('fadeRadius').value);if(Number.isFinite(v))changeFade({radius:R.clamp(v,1,2000)});};
  $('fadeDirection').onchange=()=>changeFade({direction:$('fadeDirection').value});
  $('fadeClear').onclick=()=>changeFade({strength:0});
  for(const [id,axis] of [['fadeX',0],['fadeY',1]])$(id).onchange=()=>{
    const value=Number($(id).value);if(!Number.isFinite(value))return;
    const f=C.fadeFor(C.partFor(skin,$('layerOrder').value,C.sample(clip,index(),false)),$('fadeEnd').value||'start');
    const offset=[...f.offset];offset[axis]=R.clamp(value,-2000,2000);changeFade({offset});
  };
  $('fadeAngle').onchange=()=>{const v=Number($('fadeAngle').value);if(Number.isFinite(v))changeFade({angle:R.clamp(v,-180,180)});};
  $('fadePreset').onclick=()=>{
    freeze();remember();
    for(const key of skin.layers.filter(C.canFade)){
      const part=skin.parts[key];part.joint_fade??={};part.joint_fade.start={...C.fadeFor(part),strength:.65,direction:'outward'};
    }
    $('editTarget').value='bitmap';$('fadeEnd').value='start';skinDirty=true;mark();thumbnails();draw();
    status('Přechody spojů nastavené. U předloktí jen loket směrem do paže; ruka se nemění. Změnu můžeš vrátit přes Zpět nebo uložit jako novou postavu.');
  };
  function layerOptions(selected=$('layerOrder').value){
    $('layerOrder').replaceChildren();for(const [i,key] of skin.layers.entries()){
      if(!skin.parts[key]||['pelvis','shoulders'].includes(key))continue;
      const o=document.createElement('option');o.value=key;o.textContent=`${i+1}. ${skin.parts[key].label}`;$('layerOrder').append(o);
    }
    $('layerOrder').value=skin.layers.includes(selected)?selected:skin.layers[skin.layers.length-1];
    const i=skin.layers.indexOf($('layerOrder').value);$('layerBack').disabled=i<=0;$('layerFront').disabled=i>=skin.layers.length-1;
  }
  function stop(){playing=false;phase=Math.floor(phase);distance=0;last=0;$('play').textContent='Přehrát';}
  function handles(pose=C.sample(clip,index(),false)){return R.handles(pose,pose.rig_lengths).filter(h=>!$('side').value||!h.side||h.side===$('side').value);}
  function draw(){
    const pose=C.sample(clip,phase,$('smooth').checked);
    ctx.clearRect(0,0,512,560);ctx.fillStyle='#505050';ctx.fillRect(0,0,512,560);
    ctx.save();ctx.translate(256+pan.x,280+pan.y);ctx.scale(zoom,zoom);ctx.translate(-256,-280);
    M.floor(ctx);ctx.save();ctx.translate($('travel').checked?M.offset(distance,-1):0,0);
    const bitmap=$('editTarget').value==='bitmap'||drag?.mode==='bitmap';
    paintCharacter(ctx,pose,{skeleton:$('bones').checked||$('edit').checked&&!bitmap});
    if($('edit').checked&&!bitmap){
      for(const h of handles(pose)){
        ctx.beginPath();ctx.arc(512-h.point.x,h.point.y,7,0,Math.PI*2);ctx.fillStyle='#17251e';ctx.fill();ctx.strokeStyle=h.color;ctx.lineWidth=2;ctx.stroke();
      }
    }
    if($('edit').checked&&bitmap){
      const h=E.partHandles(skin,$('layerOrder').value,pose);
      if(h){
        ctx.strokeStyle='#ffe08b';ctx.lineWidth=1/zoom;ctx.setLineDash([4/zoom,3/zoom]);ctx.beginPath();
        h.corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(h.pivot.x,h.pivot.y);ctx.lineTo(h.rotate.x,h.rotate.y);ctx.stroke();
        for(const key of ['pivot','rotate','size']){
          const p=h[key],r=6/zoom;ctx.beginPath();if(key==='size')ctx.rect(p.x-r,p.y-r,r*2,r*2);else ctx.arc(p.x,p.y,r,0,Math.PI*2);
          ctx.fillStyle=key==='pivot'?'#26332c':'#ffe08b';ctx.fill();ctx.stroke();
        }
        const key=$('layerOrder').value,part=C.partFor(skin,key,pose),end=$('fadeEnd').value||'start',f=C.fadeFor(part,end);
        if(C.canFade(key)&&f.strength){
          const g=C.fadeGeometry(part,end),a=g.center,angle=g.angle+Math.PI;
          ctx.save();ctx.transform(...C.matrix(part,C.bones(pose)[key]));ctx.strokeStyle='#80e6ff';
          ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.arc(...a,f.radius,angle-Math.PI/2,angle+Math.PI/2);ctx.closePath();ctx.stroke();ctx.restore();
        }
      }
    }
    if($('bones').checked||$('edit').checked&&!bitmap){
      const joints=C.bones(pose);
      for(const key of skin.layers.filter(C.canFade))for(const end of ['start','end']){
        const f=C.fadeFor(C.partFor(skin,key,pose),end);if(!f.strength)continue;
        const p=joints[key][end==='start'?0:1];ctx.save();ctx.strokeStyle='#80e6ff';ctx.lineWidth=2/zoom;
        ctx.beginPath();ctx.arc(p.x,p.y,9/zoom,Math.PI,2*Math.PI);ctx.stroke();ctx.restore();
      }
    }
    ctx.restore();ctx.restore();$('zoomLabel').textContent=Math.round(zoom*100)+' %';
    const m=mini.getContext('2d');m.clearRect(0,0,mini.width,mini.height);m.save();m.scale(mini.width/512,mini.height/560);M.floor(m);m.translate($('travel').checked?M.offset(distance,-1):0,0);paintCharacter(m,pose);m.restore();
    $('frameLabel').textContent=`${index()+1} / ${clip.frames.length}${playing?' · přehrávání':''}`;
    $('lean').value=clip.frames[index()].bodyLean||0;
    $('bodyY').value=clip.frames[index()].bodyY||0;
    const rates=M.rates(clip,delta);$('rateInfo').textContent=`${delta>=0?'+':''}${delta.toFixed(0)} % · ${rates.speed.toFixed(1)} bodů/s · ${rates.fps.toFixed(1)} sn./s`;
    [...$('frames').children].forEach((b,i)=>b.setAttribute('aria-pressed',String(i===index())));
    syncTools();
  }
  function thumbnails(){
    $('frames').replaceChildren();
    clip.frames.forEach((p,i)=>{
      const b=document.createElement('button'),c=document.createElement('canvas'),label=document.createElement('span');
      c.width=128;c.height=140;const x=c.getContext('2d');x.scale(.25,.25);M.floor(x);paintCharacter(x,C.sample(clip,i,false));
      const edited=Boolean(clip.frame_edits?.[i]&&Object.keys(clip.frame_edits[i]).length);
      label.textContent=String(i+1)+(edited?' ●':'');b.classList.toggle('has-edit',edited);b.append(c,label);b.setAttribute('aria-label','Snímek '+(i+1)+(edited?' · vlastní úpravy':''));
      b.onclick=()=>{stop();phase=i;draw();};$('frames').append(b);
    });
  }
  function options(selected){
    $('clip').replaceChildren();for(const c of Object.values(library.clips)){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;$('clip').append(o);}
    if(!selected){const o=document.createElement('option');o.value='';o.textContent='Nová / rozpracovaná animace';$('clip').append(o);}
    $('clip').value=selected;
  }
  function select(id){
    stop();clip=copy(library.clips[id]||{id:'',name:'Nová animace',fps:6,frames:[R.neutral(),R.neutral()]});phase=0;dirty=skinDirty;history=[];future=[];options(clip.id);
    $('fps').value=clip.fps;$('undo').disabled=true;saveButtons();
    $('moveSpeed').value=M.speed(clip);
    thumbnails();draw();status('Načteno: '+clip.name+'. Původní animace je beze změny.');
  }
  function change(fn){stop();const p={...R.neutral(),...clip.frames[index()]};fn(p);remember();clip=E.poseChange(clip,index(),p,scope());mark();thumbnails();draw();}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function exportCanvas(canvas,name){canvas.toBlob(blob=>{if(blob)download(blob,name);else status('Export PNG se nezdařil.',true);},'image/png');}
  async function loadSkin(id,snapshot){
    const entry=skinCatalog.skins[id];if(!entry)throw Error('Neznámá postava');
    skinURL=new URL('../graphics/characters2/'+entry.path,location.href);skin=copy(snapshot||await getJSON(skinURL));skin.layers=skin.layers.filter(k=>!['pelvis','shoulders'].includes(k));skinDirty=false;
    $('parts').replaceChildren();for(const key of Object.keys(images)){delete images[key];delete hitMasks[key];delete gameImages[key];delete gameMasks[key];}
    gameManifest=null;
    await Promise.all(Object.entries(skin.parts).filter(([key])=>!['pelvis','shoulders'].includes(key)).map(async([key,part])=>{
      const img=new Image();img.src=new URL(part.file,skinURL).href;await img.decode();images[key]=img;
      const maskCanvas=document.createElement('canvas');maskCanvas.width=img.naturalWidth;maskCanvas.height=img.naturalHeight;
      const maskContext=maskCanvas.getContext('2d',{willReadFrequently:true});maskContext.drawImage(img,0,0);
      hitMasks[key]=maskContext.getImageData(0,0,maskCanvas.width,maskCanvas.height);
      const f=document.createElement('figure'),a=document.createElement('a'),label=document.createElement('figcaption');a.href=img.src;a.append(img.cloneNode());label.textContent=part.label;f.append(a,label);$('parts').append(f);
    }));
    const gamePath=skin.game_textures||entry.game_textures;
    if(gamePath){
      gameManifest=await getJSON(new URL(gamePath,skinURL));skin.game_textures=gamePath;
      [pixelFrame.width,pixelFrame.height]=gameManifest.canvas_px;
      await Promise.all(Object.entries(gameManifest.parts).map(async([key,part])=>{
        const img=new Image();img.src=new URL(part.file,skinURL).href;await img.decode();gameImages[key]=img;
        const canvas=document.createElement('canvas');canvas.width=img.naturalWidth;canvas.height=img.naturalHeight;
        const x=canvas.getContext('2d',{willReadFrequently:true});x.drawImage(img,0,0);
        const data=x.getImageData(0,0,canvas.width,canvas.height);
        gameMasks[key]={width:data.width,height:data.height,data:data.data,sourceWidth:part.source_size[0],sourceHeight:part.source_size[1]};
      }));
    }
    $('renderMode').disabled=!gameManifest;
    if(!gameManifest)$('renderMode').value='detail';
    $('skinSelect').value=id;
    layerOptions();
  }
  function gameOptions(selected=''){
    $('gameCharacter').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Nová postava';$('gameCharacter').append(blank);
    for(const r of Object.values(gameCatalog.characters)){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;$('gameCharacter').append(o);}
    $('gameCharacter').value=selected;
    trashOptions();
  }
  function trashOptions(){
    const selected=$('trash').value;$('trash').replaceChildren();
    for(const [source,catalog] of [['characters',gameCatalog],['clips',library]])for(const [id,item] of Object.entries(catalog?.trash||{})){
      if(item.collection!==source)continue;
      const o=document.createElement('option');o.value=source+':'+id;o.textContent=(source==='characters'?'Postava: ':'Animace: ')+item.record.name;$('trash').append(o);
    }
    $('trash').value=[...$('trash').children].some(o=>o.value===selected)?selected:$('trash').children[0]?.value||'';
    $('restoreDeleted').disabled=!$('trash').children.length||saving||characterSaving;
  }
  async function catalogAction(collection,restore=false){
    if(saving||characterSaving)return;
    let id=collection==='characters'?characterId:animationId(),catalog=collection==='characters'?gameCatalog:library;
    if(restore){const selection=$('trash').value.split(':');collection=selection[0];id=selection[1];catalog=collection==='characters'?gameCatalog:library;}
    const record=restore?catalog.trash?.[id]?.record:catalog[collection]?.[id];if(!record)return;
    if(!confirm(`${restore?'Obnovit':'Přesunout do koše'} ${collection==='characters'?'postavu':'animaci'} „${record.name}“?\nZdrojové obrázky a kopie v jiných postavách zůstanou. ${restore?'':'Smazání lze vrátit v Koši. Rozpracované úpravy zůstanou v editoru.'}`))return;
    stop();characterSaving=true;saveButtons();
    try{
      const response=await fetch(collection==='characters'?'/api/game-characters':'/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:restore?'restore':'delete',collection,id,expectedRecord:copy(record)})});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Operace koše selhala.');
      catalog.trash=result.trash;
      if(restore)catalog[collection][result.id]=result.record;
      else{delete catalog[collection][id];if(collection==='characters'&&characterId===id){characterId='';skinDirty=true;dirty=true;}else if(collection==='clips'&&clip.id===id){clip.id='';dirty=true;}}
      gameOptions(characterId);options(clip.id);trashOptions();draw();
      status(restore?'Položka obnovena z koše.':'Položka je v koši. Rozpracovaná kopie zůstala v editoru; můžeš ji Uložit jako novou.');
    }catch(e){saveError(e);}finally{characterSaving=false;saveButtons();trashOptions();}
  }
  $('deleteCharacter').onclick=()=>catalogAction('characters');
  $('deleteAnimation').onclick=()=>catalogAction('clips');
  $('restoreDeleted').onclick=()=>catalogAction(null,true);
  try{
    [skinCatalog,library,gameCatalog]=await Promise.all([getJSON('../graphics/characters2/skins.json'),getJSON('../graphics/poses/poses.json'),getJSON('../graphics/characters2/game-characters.json')]);
    for(const [id,entry] of Object.entries(skinCatalog.skins)){const o=document.createElement('option');o.value=id;o.textContent=entry.name;$('skinSelect').append(o);}
    await loadSkin(Object.keys(skinCatalog.skins)[0]);gameOptions();
    select(library.clips[skin.default_clip]?skin.default_clip:Object.keys(library.clips)[0]);
    for(const id of ['skinSelect','saveCharacter','play','previous','next','clip','reload','fps','moveSpeed','bodyY','up','down','lean','save','exportFrame','exportSheet','exportRig'])$(id).disabled=false;
    playing=true;$('play').textContent='Pozastavit';
  }catch(e){status(e.message,true);return;}
  function screen(e){const r=stage.getBoundingClientRect();return {x:(e.clientX-r.left)*512/r.width,y:(e.clientY-r.top)*560/r.height};}
  function setZoom(value,at={x:256,y:280}){
    const next=Math.max(.4,Math.min(4,value)),ratio=next/zoom;
    pan={x:at.x-256-(at.x-256-pan.x)*ratio,y:at.y-280-(at.y-280-pan.y)*ratio};zoom=next;draw();
  }
  stage.onwheel=e=>{e.preventDefault();setZoom(window.EditorView.zoom(zoom,e.deltaY),Number.isFinite(e.clientX)?screen(e):undefined);};
  stage.oncontextmenu=e=>e.preventDefault(); // Ctrl-drag is an edit, including on macOS.
  $('zoomOut').onclick=()=>setZoom(zoom/1.2);$('zoomIn').onclick=()=>setZoom(zoom*1.2);$('zoomReset').onclick=()=>{pan={x:0,y:0};zoom=1;draw();};
  $('renderMode').onchange=()=>{stage.style.imageRendering=pixelMode()?'pixelated':'auto';thumbnails();draw();};
  $('skinSelect').onchange=async()=>{if(skinDirty&&!confirm('Zahodit neuložené úpravy bitmapových dílů?')){$('skinSelect').value=skin.id;return;}stop();try{await loadSkin($('skinSelect').value);thumbnails();draw();}catch(e){status(e.message,true);}};
  $('layerOrder').onchange=()=>{layerOptions();$('editTarget').value='bitmap';cursor();draw();};
  function reorder(step){const key=$('layerOrder').value,i=skin.layers.indexOf(key),j=i+step;if(i<0||j<0||j>=skin.layers.length)return;remember();[skin.layers[i],skin.layers[j]]=[skin.layers[j],skin.layers[i]];skinDirty=true;mark();layerOptions(key);thumbnails();draw();}
  $('layerBack').onclick=()=>reorder(-1);$('layerFront').onclick=()=>reorder(1);
  $('anchorReset').onclick=()=>{stop();const key=$('layerOrder').value;remember();({clip,skin}=E.partChange(clip,skin,index(),key,{offset:[0,0]},scope()));skinDirty=true;mark();thumbnails();draw();};
  $('spread').value=spread;
  $('spread').onchange=()=>{remember();spread=R.clamp(Number($('spread').value)||0,0,90);$('spread').value=spread;delta=R.clamp(delta,-spread,spread);$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=delta;skinDirty=true;mark();draw();};
  $('rateDelta').oninput=()=>{delta=R.clamp(Number($('rateDelta').value)||0,-spread,spread);draw();};
  $('randomRate').onclick=()=>{delta=M.variation(spread);$('rateDelta').value=delta;draw();};
  const characterNameKey=name=>name.normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
  async function saveCharacter(overwrite=false){
    if(saving||characterSaving)return;
    let previous=gameCatalog.characters[characterId],name=previous?.name;
    if(overwrite&&!previous){status('Novou postavu nejprve ulož přes Uložit jako.',true);return;}
    characterSaving=true;saveButtons();
    try{
      if(!overwrite){
        // Refresh before resolving names: another tab may have saved a character.
        const fresh=await getJSON('../graphics/characters2/game-characters.json');
        gameCatalog=fresh;gameOptions(characterId);
        let proposed=name||'Běžec – zombie';
        while(true){
          name=prompt('Název postavy',proposed)?.trim();
          if(!name){status('Ukládání zrušeno. Rozpracované změny zůstávají.');return;}
          proposed=name;
          const matches=Object.values(gameCatalog.characters).filter(r=>characterNameKey(r.name)===characterNameKey(name));
          if(!matches.length){previous=null;break;}
          previous=matches.find(r=>r.id===characterId)||matches[0];
          if(matches.length>1&&!matches.some(r=>r.id===characterId)){
            const choice=prompt('Tento název má více starších postav. Kterou přepsat? Zadej číslo:\n'+matches.map((r,i)=>`${i+1}. ${r.name} · ${r.animation?.name||'animace'} · ID ${r.id.slice(-8)}`).join('\n'),'1');
            if(choice===null)continue;
            const n=Number(choice);if(!Number.isInteger(n)||n<1||n>matches.length){status('Vyber číslo existující postavy.',true);continue;}
            previous=matches[n-1];
          }
          if(!confirm(`Postava „${previous.name}“ už existuje. Chceš ji přepsat?\n\nAno (OK): přepsat se zálohou.\nNe (Zrušit): zpět k zadání názvu.`))continue;
          overwrite=true;name=previous.name;break;
        }
      }
      stop();
      const snapshot=JSON.stringify({clip,skin,spread});
      const payload={name,skin_id:$('skinSelect').value,layers:skin.layers,part_offsets:Object.fromEntries(skin.layers.map(k=>[k,skin.parts[k].offset||[0,0]])),motion:{variation_percent:spread},animation:{...copy(clip),id:animationId()||'',rig_lengths:R.lengthsFor(clip),move_speed_pt_s:M.speed(clip)}};
      payload.part_transforms=Object.fromEntries(skin.layers.map(k=>[k,{offset:skin.parts[k].offset||[0,0],rotation:skin.parts[k].rotation||0,
        ...(skin.parts[k].joint_fade?{joint_fade:skin.parts[k].joint_fade}:{}),
        ...Object.fromEntries(['scale','scale_x','scale_y'].map(axis=>[axis,skin.parts[k][axis]||1]))}]));
      if(overwrite)Object.assign(payload,{mode:'update',id:previous.id,expectedRecord:copy(previous)});
      const r=await fetch('/api/game-characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Uložení se nezdařilo.');
      gameCatalog.characters[result.record.id]=result.record;characterId=result.record.id;gameOptions(characterId);
      if(snapshot===JSON.stringify({clip,skin,spread})){dirty=false;skinDirty=false;}
      status('Postava uložená: '+result.record.name+(overwrite?'. Předchozí stav je v záloze.':'.'));
    }catch(e){saveError(e);}finally{characterSaving=false;saveButtons();}
  }
  $('saveCharacter').onclick=()=>saveCharacter(false);$('updateCharacter').onclick=()=>saveCharacter(true);
  $('gameCharacter').onchange=async()=>{
    const r=gameCatalog.characters[$('gameCharacter').value];if(!r){characterId='';saveButtons();return;}
    if(dirty&&!confirm('Načíst postavu a zahodit neuložené úpravy?')){$('gameCharacter').value=characterId;return;}
    stop();try{await loadSkin(r.skin_id,r.skin);spread=r.motion?.variation_percent||0;delta=0;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=0;const id='character:'+r.id;library.clips[id]={...copy(r.animation),id,name:r.animation.name||r.name};characterId=r.id;select(id);}catch(e){status(e.message,true);}
  };
  $('play').onclick=()=>{if(playing)stop();else{playing=true;$('play').textContent='Pozastavit';}draw();};
  $('previous').onclick=()=>{stop();phase=(index()+clip.frames.length-1)%clip.frames.length;draw();};
  $('next').onclick=()=>{stop();phase=(index()+1)%clip.frames.length;draw();};
  for(const id of ['smooth','bones','side'])$(id).onchange=draw;
  $('edit').onchange=()=>{if($('edit').checked)stop();draw();};
  $('clip').onchange=()=>{if(dirty&&!confirm('Zahodit neuložené změny pohybu?')){$('clip').value=clip.id;return;}select($('clip').value);};
  $('reload').onclick=async()=>{
    if(dirty&&!confirm('Zahodit neuložené změny a načíst uložené pózy?'))return;
    try{const fresh=await getJSON('../graphics/poses/poses.json');library=fresh;select(library.clips[clip.id]?clip.id:Object.keys(library.clips)[0]);trashOptions();}catch(e){status(e.message,true);}
  };
  $('fps').onchange=()=>{stop();remember();clip.fps=Math.max(1,Math.min(30,Math.round(Number($('fps').value)||6)));$('fps').value=clip.fps;mark();draw();};
  $('moveSpeed').onchange=()=>{stop();remember();const value=Number($('moveSpeed').value);clip.move_speed_pt_s=Number.isFinite(value)?R.clamp(value,0,1000):M.DEFAULT_SPEED;$('moveSpeed').value=clip.move_speed_pt_s;mark();draw();};
  $('travel').onchange=()=>{distance=0;draw();};
  $('up').onclick=e=>change(p=>p.bodyY=R.clamp((p.bodyY||0)-(e.shiftKey?10:1),-100,100));
  $('down').onclick=e=>change(p=>p.bodyY=R.clamp((p.bodyY||0)+(e.shiftKey?10:1),-100,100));
  $('lean').onchange=()=>change(p=>p.bodyLean=Number($('lean').value));
  $('bodyY').onchange=()=>change(p=>p.bodyY=R.clamp(Number($('bodyY').value)||0,-100,100));
  function restore(old){stop();clip=old.clip;skin=old.skin;skinDirty=old.skinDirty;spread=old.spread;phase=old.index;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;delta=R.clamp(delta,-spread,spread);$('rateDelta').value=delta;$('fps').value=clip.fps;$('moveSpeed').value=M.speed(clip);mark();layerOptions(old.selected);thumbnails();draw();}
  $('undo').onclick=()=>{if(!history.length||drag)return;const old=history.pop();future.push({...snapshot(),index:old.index});restore(old);};
  $('redo').onclick=()=>{if(!future.length||drag)return;const next=future.pop();history.push({...snapshot(),index:next.index});restore(next);};
  $('resetFrame').onclick=()=>{if(!clip.frame_edits?.[index()])return;stop();remember();clip=E.resetFrame(clip,index());mark();thumbnails();draw();};
  for(const id of ['editTarget','editScope','editTool'])$(id).onchange=()=>{cursor();draw();};
  for(const [group,choices] of Object.entries(toolChoices))for(const [id,value] of Object.entries(choices))$(id).onclick=()=>{$(group).value=value;$(group).onchange();};
  $('editScope').onclick=()=>{$('editScope').value=scope()==='all'?'frame':'all';$('editScope').onchange();};
  $('editTarget').onclick=()=>{$('editTarget').value=$('editTarget').value==='bitmap'?'skeleton':'bitmap';$('editTarget').onchange();};
  let panelDrag=null;
  function placePanel(x,y){
    const box=$('stageWrap').getBoundingClientRect(),p=$('editTools').getBoundingClientRect();
    $('editTools').style.left=R.clamp(x,0,Math.max(0,box.width-p.width))+'px';$('editTools').style.top=R.clamp(y,0,Math.max(0,box.height-p.height))+'px';
  }
  $('toolCollapse').onclick=()=>{const hidden=!$('toolBody').hidden;$('toolBody').hidden=hidden;$('toolCollapse').textContent=hidden?'+':'−';$('toolCollapse').setAttribute('aria-expanded',String(!hidden));$('toolCollapse').setAttribute('aria-label',hidden?'Rozbalit ovládání':'Sbalit ovládání');placePanel(parseFloat($('editTools').style.left)||8,parseFloat($('editTools').style.top)||8);};
  $('toolGrip').onpointerdown=e=>{if(e.target.closest('button')||e.button!==0)return;const p=$('editTools').getBoundingClientRect(),b=$('stageWrap').getBoundingClientRect();panelDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:p.left-b.left,top:p.top-b.top};e.preventDefault();$('toolGrip').setPointerCapture(e.pointerId);};
  $('toolGrip').onpointermove=e=>{if(panelDrag?.id===e.pointerId)placePanel(panelDrag.left+e.clientX-panelDrag.x,panelDrag.top+e.clientY-panelDrag.y);};
  $('toolGrip').onpointerup=$('toolGrip').onpointercancel=e=>{panelDrag=null;if($('toolGrip').hasPointerCapture(e.pointerId))$('toolGrip').releasePointerCapture(e.pointerId);};
  window.addEventListener('resize',()=>placePanel(parseFloat($('editTools').style.left)||8,parseFloat($('editTools').style.top)||8));
  function pointer(e){const p=screen(e);return window.EditorView.point(p.x,p.y,zoom,true,pan);}
  function cursor(e={}){
    const bitmap=$('editTarget').value==='bitmap';
    const tool=drag?.mode==='bitmap'?drag.tool:e.ctrlKey&&e.altKey?'size':bitmap&&e.ctrlKey?'height':bitmap&&e.altKey?'width':e.altKey?'move':e.ctrlKey?'length':$('editTool').value;
    stage.style.cursor=drag?.mode==='pan'?'grabbing':tool==='fade'||tool==='height'?'ns-resize':tool==='width'||tool==='length'?'ew-resize':tool==='size'?'nwse-resize':tool==='move'?'move':'grab';
    $('gestureHint').textContent=tool==='height'?'Ctrl + tah dolů/nahoru: výška bitmapy · šířka a kostra se nemění':tool==='width'?'Option + tah doprava/doleva: šířka bitmapy · výška a kostra se nemění':bitmap?'Bitmapa: Ctrl = výška · Option = šířka · Ctrl+Option = obojí · posun: nástroj Posun':'Ctrl: délka kosti · Option: posun bitmapy · Ctrl+Option: velikost bitmapy';
    $('gestureHint').textContent+=' · Pravý tah ↓/↑: zprůhlednit / zneprůhlednit spoj';
  }
  window.addEventListener('keydown',e=>{cursor(e);if((e.metaKey||e.ctrlKey)&&e.key?.toLowerCase()==='z'&&!['INPUT','TEXTAREA','SELECT'].includes(e.target?.tagName)&&!e.target?.isContentEditable){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).onclick();}});
  window.addEventListener('keyup',cursor);window.addEventListener('blur',()=>cursor());cursor();
  const travelX=()=>$('travel').checked?M.offset(distance,-1):0;
  function freeze(){const d=distance;phase=Math.round(phase)%clip.frames.length;stop();distance=d;}
  stage.onpointerdown=e=>{
    if(![0,2].includes(e.button)||drag)return;
    const right=e.button===2,bitmapMode=$('editTarget').value==='bitmap',bitmap=right||e.altKey||bitmapMode;
    if(bitmap&&$('edit').checked){
      const p=pointer(e),pose=C.sample(clip,phase,$('smooth').checked);
      const point={x:512-p.x-travelX(),y:p.y},selected=$('layerOrder').value;
      const grips=$('editTarget').value==='bitmap'?E.partHandles(skin,selected,pose):null;
      const grip=grips&&!right?['rotate','size','pivot'].find(k=>Math.hypot(point.x-grips[k].x,point.y-grips[k].y)<12/zoom):null;
      let endHit=null;
      if(right&&bitmapMode&&C.canFade(selected)){
        const part=C.partFor(skin,selected,pose),m=C.matrix(part,C.bones(pose)[selected]);
        endHit=['start','end'].map(end=>{const a=C.fadeGeometry(part,end).anchor;return {end,d:Math.hypot(point.x-(m[0]*a[0]+m[2]*a[1]+m[4]),point.y-(m[1]*a[0]+m[3]*a[1]+m[5]))};}).sort((a,b)=>a.d-b.d).find(v=>v.d<14/zoom);
      }
      const key=endHit||grip?selected:C.hitTest(skin,pixelMode()?gameMasks:hitMasks,pose,point,{ignoreFade:right});
      if(endHit)$('fadeEnd').value=endHit.end;
      if(key){
        if(right&&!C.canFade(key)){e.preventDefault();status('Tělo ani doplněk nemají přechody spojů. Vyber ruku, nohu nebo hlavu.');return;}
        freeze();layerOptions(key);$('editTarget').value='bitmap';
        const frozen=C.sample(clip,index(),false),h=E.partHandles(skin,key,frozen);
        const tool=right?'fade':e.ctrlKey&&e.altKey?'size':bitmapMode&&e.ctrlKey?'height':bitmapMode&&e.altKey?'width':grip==='rotate'?'rotate':grip==='size'?'size':grip==='pivot'||e.altKey?'move':$('editTool').value||'rotate';
        e.preventDefault();drag={mode:'bitmap',tool,scope:scope(),index:index(),id:e.pointerId,key,grab:point,part:C.partFor(skin,key,frozen),bone:C.bones(frozen)[key],pivot:h.pivot,clip:copy(clip),skin:copy(skin),changed:false};stage.setPointerCapture(e.pointerId);cursor(e);draw();return;
      }
    }
    if(right){e.preventDefault();return;}
    const p=pointer(e),visiblePoint={x:p.x+travelX(),y:p.y};
    const h=handles(C.sample(clip,phase,$('smooth').checked)).map(h=>({...h,d:Math.hypot(h.point.x-visiblePoint.x,h.point.y-visiblePoint.y)})).sort((a,b)=>a.d-b.d)[0];
    if(bitmap||!$('edit').checked||!h||h.d>14/zoom){if(e.ctrlKey||e.altKey)return;e.preventDefault();drag={mode:'pan',id:e.pointerId,grab:screen(e),pan:{...pan}};stage.setPointerCapture(e.pointerId);cursor(e);return;}
    freeze();e.preventDefault();drag={mode:'skeleton',id:e.pointerId,key:h.key,index:index(),start:handles().find(v=>v.key===h.key).point,grab:p,clip:copy(clip),scope:scope(),tool:$('editTool').value||'rotate',ctrlKey:e.ctrlKey,resize:$('resizeBones').checked,changed:false};stage.setPointerCapture(e.pointerId);draw();
  };
  stage.onpointermove=e=>{
    cursor(e);
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.mode==='pan'){const p=screen(e);pan={x:drag.pan.x+p.x-drag.grab.x,y:drag.pan.y+p.y-drag.grab.y};draw();return;}
    if(drag.mode==='bitmap'){
      const p=pointer(e),point={x:512-p.x-travelX(),y:p.y};let values;
      if(drag.tool==='fade')values={strength:R.clamp(C.fadeFor(drag.part,$('fadeEnd').value||'start').strength+(point.y-drag.grab.y)/150,0,1)};
      else if(drag.tool==='move')values={offset:C.moveAttachment(drag.part,drag.bone,point.x-drag.grab.x,point.y-drag.grab.y).offset};
      else if(drag.tool==='rotate')values={rotation:drag.part.rotation+(Math.atan2(point.y-drag.pivot.y,point.x-drag.pivot.x)-Math.atan2(drag.grab.y-drag.pivot.y,drag.grab.x-drag.pivot.x))*180/Math.PI};
      else if(drag.tool==='height')values={scale_y:drag.part.scale_y*Math.exp(R.clamp((point.y-drag.grab.y)/100,-10,10))};
      else if(drag.tool==='width')values={scale_x:drag.part.scale_x*Math.exp(R.clamp((point.x-drag.grab.x)/100,-10,10))};
      else values={scale:drag.part.scale*Math.hypot(point.x-drag.pivot.x,point.y-drag.pivot.y)/Math.max(1,Math.hypot(drag.grab.x-drag.pivot.x,drag.grab.y-drag.pivot.y))};
      const result=drag.tool==='fade'?E.fadeChange(drag.clip,drag.skin,drag.index,drag.key,$('fadeEnd').value||'start',values,drag.scope):E.partChange(drag.clip,drag.skin,drag.index,drag.key,values,drag.scope);
      if(JSON.stringify(result)===JSON.stringify({clip,skin}))return;
      if(!drag.changed){remember();drag.changed=true;}({clip,skin}=result);skinDirty=true;mark();thumbnails();draw();return;
    }
    const p=pointer(e),end={x:drag.start.x+p.x-drag.grab.x,y:drag.start.y+p.y-drag.grab.y};
    const updated=E.dragSkeleton(drag.clip,drag.index,drag.key,drag.start,end,drag);
    if(JSON.stringify(updated)===JSON.stringify(clip))return;
    if(!drag.changed){remember();drag.changed=true;}
    clip=updated;mark();thumbnails();draw();
  };
  function finish(e){if(!drag||drag.id!==e.pointerId)return;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);cursor(e);thumbnails();draw();}
  stage.onpointerup=finish;stage.onpointercancel=finish;stage.onlostpointercapture=finish;
  const touches=new Map();let pinch=null;
  const downPointer=stage.onpointerdown,movePointer=stage.onpointermove;
  stage.onpointerdown=e=>{
    if(e.pointerType==='touch'){
      touches.set(e.pointerId,screen(e));
      if(touches.size===2){
        const [a,b]=[...touches.values()];drag=null;
        pinch={center:{x:(a.x+b.x)/2,y:(a.y+b.y)/2},span:Math.max(1,Math.hypot(a.x-b.x,a.y-b.y)),zoom,pan:{...pan}};
        e.preventDefault();stage.setPointerCapture(e.pointerId);return;
      }
    }
    downPointer(e);
  };
  stage.onpointermove=e=>{
    if(touches.has(e.pointerId))touches.set(e.pointerId,screen(e));
    if(pinch&&touches.size===2){
      const [a,b]=[...touches.values()],center={x:(a.x+b.x)/2,y:(a.y+b.y)/2};
      zoom=R.clamp(pinch.zoom*Math.hypot(a.x-b.x,a.y-b.y)/pinch.span,.4,4);const ratio=zoom/pinch.zoom;
      pan={x:center.x-256-(pinch.center.x-256-pinch.pan.x)*ratio,y:center.y-280-(pinch.center.y-280-pinch.pan.y)*ratio};
      e.preventDefault();draw();return;
    }
    movePointer(e);
  };
  const endPointer=e=>{touches.delete(e.pointerId);if(pinch){pinch=null;drag=null;if(stage.hasPointerCapture(e.pointerId))stage.releasePointerCapture(e.pointerId);thumbnails();draw();return;}finish(e);};
  stage.onpointerup=endPointer;stage.onpointercancel=endPointer;stage.onlostpointercapture=endPointer;
  async function saveAnimation(overwrite=false){
    if(saving||characterSaving)return;
    const id=animationId(),previous=library.clips[id];
    if(overwrite&&!previous){status('Novou animaci nejprve ulož přes Uložit jako.',true);return;}
    const name=overwrite?previous.name:prompt('Název nové animace',clip.name+' · kopie')?.trim();if(!name)return;
    stop();saving=true;saveButtons();
    const snapshot=copy(clip);
    try{
      const payload={kind:'clip',name,frames:snapshot.frames,fps:snapshot.fps,move_speed_pt_s:M.speed(snapshot),rig_lengths:R.lengthsFor(snapshot),frame_edits:snapshot.frame_edits||{}};
      if(overwrite)Object.assign(payload,{mode:'update',id,expectedRecord:copy(previous)});
      const r=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Uložení se nezdařilo.');
      library.clips[result.record.id]=result.record;
      if(JSON.stringify(clip)===JSON.stringify(snapshot)){if(characterId)skinDirty=true;select(result.record.id);status('Animace uložená.'+(overwrite?' Předchozí stav je v záloze.':'')+(skinDirty?' Změny postavy ještě ulož v části Postava.':''));}
      else status('Kopie byla uložena; novější rozpracované změny ještě uložené nejsou.');
    }catch(e){saveError(e);}finally{saving=false;saveButtons();}
  }
  $('save').onclick=()=>saveAnimation(false);$('updateAnimation').onclick=()=>saveAnimation(true);
  $('importDraft').onchange=async()=>{
    const file=$('importDraft').files?.[0];if(!file)return;
    try{
      const d=JSON.parse(await file.text()),c=d.clip,s=d.skin;
      if(!skinCatalog.skins[s?.id]||!c||!Array.isArray(c.frames)||c.frames.length<2||c.frames.length>32||!Number.isInteger(c.fps)||c.fps<1||c.fps>30)throw Error('Neplatná záloha postavy.');
      for(const frame of c.frames)for(const [key,,lo,hi] of R.fields){const v=frame[key]??R.neutral()[key];if(!Number.isFinite(v)||v<lo||v>hi)throw Error('Neplatné klouby v záloze.');}
      for(const [key,v] of Object.entries(c.rig_lengths||{}))if(!(key in R.defaultLengths())||!Number.isFinite(v)||v<5||v>250)throw Error('Neplatné délky v záloze.');
      const base=await getJSON(new URL('../graphics/characters2/'+skinCatalog.skins[s.id].path,location.href));
      const keys=base.layers.filter(k=>!['pelvis','shoulders'].includes(k)),layers=s.layers.filter(k=>!['pelvis','shoulders'].includes(k));
      if(layers.length!==keys.length||new Set(layers).size!==keys.length||layers.some(k=>!keys.includes(k)))throw Error('Neplatné pořadí dílů.');
      base.layers=layers;
      for(const k of keys){
        const part=s.parts[k]||{},o=part.offset||[0,0],rotation=part.rotation??0,scales=Object.fromEntries(['scale','scale_x','scale_y'].map(axis=>[axis,part[axis]??1]));
        if(!Array.isArray(o)||o.length!==2||o.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)||!Number.isFinite(rotation)||Math.abs(rotation)>180||Object.values(scales).some(v=>!Number.isFinite(v)||v<.1||v>10))throw Error('Neplatná úprava bitmapy.');
        Object.assign(base.parts[k],{offset:o,rotation,...scales});
        if(part.joint_fade!==undefined)base.parts[k].joint_fade=copy(C.validateFade(part.joint_fade));
      }
      E.validateEdits(c,base);
      if(dirty&&!confirm('Nahradit rozpracované změny zálohou?'))return;
      stop();await loadSkin(s.id,base);characterId='';gameOptions();
      const id='character:import';library.clips[id]={...copy(c),id,source_clip_id:c.id};
      spread=R.clamp(Number(d.motion?.variation_percent)||0,0,90);delta=0;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=0;
      select(id);skinDirty=true;mark();status('Záloha načtena. Ulož ji jako postavu; původní soubory se nezměnily.');
    }catch(e){status(e.message,true);}finally{$('importDraft').value='';}
  };
  $('exportFrame').onclick=()=>{const c=document.createElement('canvas');c.width=pixelMode()?pixelFrame.width:512;c.height=pixelMode()?pixelFrame.height:560;const x=c.getContext('2d');x.scale(c.width/512,c.height/560);x.imageSmoothingEnabled=!pixelMode();drawRig(x,skin,activeImages(),C.sample(clip,phase,$('smooth').checked));exportCanvas(c,pixelMode()?'postava-game-192.png':'postava-detail.png');};
  $('exportSheet').onclick=()=>{const c=document.createElement('canvas'),w=pixelMode()?pixelFrame.width:512,h=pixelMode()?pixelFrame.height:560;c.width=4*w;c.height=Math.ceil(clip.frames.length/4)*h;const x=c.getContext('2d');x.imageSmoothingEnabled=!pixelMode();clip.frames.forEach((p,i)=>{x.save();x.translate(i%4*w,Math.floor(i/4)*h);x.scale(w/512,h/560);drawRig(x,skin,activeImages(),C.sample(clip,i,false));x.restore();});exportCanvas(c,pixelMode()?'postava-game-192-sheet.png':'postava-detail-sheet.png');};
  $('exportRig').onclick=()=>download(new Blob([JSON.stringify({schema_version:1,skin,asset_base:'graphics/characters2/'+skinCatalog.skins[$('skinSelect').value].path.replace(/[^/]+$/,''),clip:{...copy(clip),rig_lengths:R.lengthsFor(clip),move_speed_pt_s:M.speed(clip)},motion:{variation_percent:spread,coupled_cadence:true,sample_once_per_actor:true},rig_units_per_game_point:M.UNITS_PER_POINT,interpolation:'shortest-angle',frames_include_endpoint_duplicate:false},null,2)],{type:'application/json'}),'postava-cutout.json');
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='preview-visibility'){visible=Boolean(e.data.visible);last=0;}});
  function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(visible&&!document.hidden&&playing){const rates=M.rates(clip,delta);phase=(phase+dt*rates.fps)%clip.frames.length;if($('travel').checked)distance=(distance+rates.speed*dt)%48;draw();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();
