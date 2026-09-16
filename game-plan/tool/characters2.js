(async function(){
  'use strict';
  const R=window.PoseRig,C=window.CutoutRig,E=window.CutoutEditor,M=window.MotionPreview,$=id=>document.getElementById(id),copy=v=>JSON.parse(JSON.stringify(v));
  let skinURL=new URL('../graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json',location.href),skinCatalog,gameCatalog;
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
    low.save();low.imageSmoothingEnabled=true;low.imageSmoothingQuality='low';low.scale(pixelFrame.width/512,pixelFrame.height/560);
    drawRig(low,skin,gameImages,pose,{lengths:options.lengths});low.restore();
    context.save();context.imageSmoothingEnabled=true;context.imageSmoothingQuality='low';context.drawImage(pixelFrame,0,0,512,560);context.restore();
    if(options.skeleton)drawRig(context,skin,images,pose,{...options,skeletonOnly:true});
  }
  let skin,library,clip,phase=0,playing=false,visible=true,last=0,dirty=false,skeletonDirty=false,animationDirty=false,drag=null,history=[],future=[],saving=false;
  let skeletonTrash={},animationTrash={};
  let distance=0;
  const DEFAULT_ZOOM=.69,defaultPan=()=>({x:0,y:(M.GROUND_Y-280)*(1-DEFAULT_ZOOM)});
  let zoom=DEFAULT_ZOOM;
  let pan=defaultPan(),skinDirty=false,spread=15,delta=0;
  let characterId='',characterAnimationId='',characterSaving=false,skeletonId='',finishedAnimationId='';
  let selectedSkeleton='';
  $('editTarget').value='skeleton';$('editTool').value='rotate';$('editScope').value='frame';
  for(const help of document.querySelectorAll?.('.help')||[]){
    help.onclick=e=>{e.preventDefault();e.stopPropagation();help.classList.add('help-open');};
    help.onmouseleave=()=>help.classList.remove('help-open');
  }
  const toolChoices={editTool:{toolMove:'move',toolRotate:'rotate',toolSize:'size'}};
  function saveButtons(){
    const busy=saving||characterSaving;
    $('saveCharacter').disabled=busy;$('save').disabled=busy||!characterId;
    $('updateCharacter').disabled=busy||!characterId;
    $('updateAnimation').disabled=busy||!characterId||!characterAnimationId;
    $('assignAnimation').disabled=busy||!characterId;
    $('saveSkeleton').disabled=busy;$('updateSkeleton').disabled=busy||!library?.clips?.[skeletonId];$('deleteSkeleton').disabled=busy||!library?.clips?.[skeletonId];
    $('saveFinishedAnimation').disabled=busy;$('updateFinishedAnimation').disabled=busy||!library?.finished_animations?.[finishedAnimationId];$('deleteFinishedAnimation').disabled=busy||!library?.finished_animations?.[finishedAnimationId];
    $('deleteCharacter').disabled=busy||!characterId;
    $('deleteAnimation').disabled=busy||!characterId||!characterAnimationId;
    $('animationName').textContent=clip?.name||'';
    $('skeletonDirtyStar').hidden=!skeletonDirty;$('animationDirtyStar').hidden=!animationDirty;
  }
  function saveError(e){status(e instanceof TypeError||e.message==='Failed to fetch'?'Nelze se spojit s ukládáním. Použij http://127.0.0.1:8765/tool/preview.html?sekce=animator. Rozpracované změny zůstávají v editoru; můžeš stáhnout data jako zálohu.':e.message,true);}
  const status=(s,error=false)=>{$('status').textContent=s;$('status').classList.toggle('error',error);};
  async function getJSON(url){const r=await fetch(url,{cache:'no-store'});if(!r.ok)throw Error('Nelze načíst '+url);return r.json();}
  const index=()=>Math.floor(phase)%clip.frames.length;
  const scope=()=>$('editScope').value==='all'?'all':'frame';
  const snapshot=()=>copy({clip,skin,skinDirty,skeletonDirty,animationDirty,spread,skeletonId,finishedAnimationId,index:index(),selected:$('layerOrder').value,selectedSkeleton});
  function remember(){history.push(snapshot());future=[];if(history.length>60)history.shift();}
  function syncTools(){
    syncFade();
    for(const [group,choices] of Object.entries(toolChoices))for(const [id,value] of Object.entries(choices))$(id).setAttribute('aria-pressed',String($(group).value===value));
    $('editScope').setAttribute('aria-checked',String(scope()==='all'));
    $('editTarget').setAttribute('aria-checked',String($('editTarget').value==='bitmap'));
    const targetMode=$('editTarget').value==='bitmap'?'bitmap':'skeleton',scopeMode=scope()==='all'?'all':'frame',toolMode=$('editTool').value||'rotate';
    $('headerTarget').setAttribute('data-mode',targetMode);$('headerTarget').title=(targetMode==='bitmap'?'Bitmapa':'Kostra')+' · 1 nebo +';$('headerTarget').setAttribute('aria-label',targetMode==='bitmap'?'Upravuji bitmapu; přepnout na kostru':'Upravuji kostru; přepnout na bitmapu');
    $('headerScope').setAttribute('data-mode',scopeMode);$('headerScope').title=(scopeMode==='all'?'Animace':'Snímek')+' · 2 nebo Ě';$('headerScope').setAttribute('aria-label',scopeMode==='all'?'Úprava platí pro celou animaci; přepnout na snímek':'Úprava platí pro tento snímek; přepnout na animaci');
    const toolNames={move:'Posun',rotate:'Rotace',size:'Velikost'};$('headerTool').setAttribute('data-mode',toolMode);$('headerTool').title=toolNames[toolMode]+' · 3 nebo Š';$('headerTool').setAttribute('aria-label','Nástroj '+toolNames[toolMode]+'; přepnout na další nástroj');
    const [leanMin,leanMax]=R.rangeFor(clip,'bodyLean');$('lean').min=leanMin;$('lean').max=leanMax;
    $('undo').disabled=!history.length;$('redo').disabled=!future.length;
    $('resetFrame').disabled=!clip.frame_edits?.[index()]||!Object.keys(clip.frame_edits[index()]).length;
    $('editTools').classList.toggle('whole',scope()==='all');
    $('scopeNote').textContent=scope()==='all'?`Všech ${clip.frames.length} snímků · ${$('editTarget').value==='bitmap'?'posun vůči uchycení, velikost stejným poměrem':'zachovává rozdíly mezi snímky'}.`:`Jen aktuální snímek ${index()+1} · Celá animace je vypnutá.`;
    if(scope()==='all'&&$('editTarget').value==='bitmap'){
      const custom=Object.values(clip.frame_edits||{}).filter(e=>Object.keys(e.parts?.[$('layerOrder').value]||{}).length).length;
      if(custom)$('scopeNote').textContent+=` Dřívější výjimky tohoto dílu (${custom} snímků) zůstávají. Přepnutí je nesjednotí.`;
    }
  }
  function mark(kind='animation'){
    dirty=true;animationDirty=true;
    if(kind==='skeleton'){
      skeletonDirty=true;
      // The animation now owns a private rig snapshot instead of claiming that
      // it still equals a named entry in the skeleton bank.
      skeletonId='';
    }
    if(characterAnimationId){characterAnimationId='';characterAnimationOptions('');}
    options(finishedAnimationId);skeletonOptions();status('Neuložené změny');syncTools();saveButtons();
  }
  function syncFade(){
    const key=$('layerOrder').value,allowed=C.canFade(key)&&Boolean(skin.parts[key]);
    for(const id of ['fadeStrength','fadeRadius','fadeRadius2','fadeDirection','fadeEnd','fadeX','fadeY','fadeAngle'])$(id).disabled=!allowed;
    $('fadePart').textContent=skin.parts[key]?.label||'';
    if(!allowed)return;
    const f=C.fadeFor(C.partFor(skin,key,C.sample(clip,phase,$('smooth').checked)),$('fadeEnd').value||'start');
    for(const [id,value] of Object.entries({fadeStrength:Math.round(f.strength*100),fadeRadius:Math.round(f.radius),fadeRadius2:Math.round(f.radius2),fadeDirection:f.direction,fadeX:f.offset[0],fadeY:f.offset[1],fadeAngle:f.angle}))if(document.activeElement!==$(id))$(id).value=value;
    $('fadeValue').textContent=Math.round(f.strength*100)+' %';
  }
  function changeFade(values,record=true){
    const key=$('layerOrder').value;if(!C.canFade(key))return;
    freeze();const result=E.fadeChange(clip,skin,index(),key,$('fadeEnd').value||'start',values,scope());
    if(record)remember();({clip,skin}=result);skinDirty=true;mark('bitmap');thumbnails();draw();
  }
  $('fadeEnd').onchange=()=>draw();
  let fadeSliding=false;
  $('fadeStrength').oninput=()=>{changeFade({strength:R.clamp(Number($('fadeStrength').value)/100,0,1)},!fadeSliding);fadeSliding=true;};
  $('fadeStrength').onchange=()=>{changeFade({strength:R.clamp(Number($('fadeStrength').value)/100,0,1)},!fadeSliding);fadeSliding=false;};
  $('fadeStrength').onpointercancel=()=>{fadeSliding=false;};
  $('fadeRadius').onchange=()=>{const v=Number($('fadeRadius').value);if(Number.isFinite(v))changeFade({radius:R.clamp(v,1,2000)});};
  $('fadeDirection').onchange=()=>changeFade({direction:$('fadeDirection').value});
  $('fadeRadius2').onchange=()=>changeFade({radius2:R.clamp(Number($('fadeRadius2').value)||1,1,2000)});
  for(const [id,axis] of [['fadeX',0],['fadeY',1]])$(id).onchange=()=>{
    const value=Number($(id).value);if(!Number.isFinite(value))return;
    const f=C.fadeFor(C.partFor(skin,$('layerOrder').value,C.sample(clip,index(),false)),$('fadeEnd').value||'start');
    const offset=[...f.offset];offset[axis]=R.clamp(value,-2000,2000);changeFade({offset});
  };
  $('fadeAngle').onchange=()=>{const v=Number($('fadeAngle').value);if(Number.isFinite(v))changeFade({angle:R.clamp(v,-180,180)});};
  function layerOptions(selected=$('layerOrder').value){
    $('layerOrder').replaceChildren();for(const [i,key] of skin.layers.entries()){
      if(!skin.parts[key]||key==='shoulders')continue;
      const o=document.createElement('option');o.value=key;o.textContent=`${i+1}. ${skin.parts[key].label}`;$('layerOrder').append(o);
    }
    $('layerOrder').value=skin.layers.includes(selected)?selected:skin.layers[skin.layers.length-1];
    selectedSkeleton=E.handleForBone($('layerOrder').value)||'';
    const i=skin.layers.indexOf($('layerOrder').value);$('layerBack').disabled=i<=0;$('layerFront').disabled=i>=skin.layers.length-1;
  }
  function stop(){playing=false;phase=Math.floor(phase);distance=0;last=0;$('play').textContent='Přehrát';}
  function handles(pose=C.sample(clip,index(),false)){return R.handles(pose,pose.rig_lengths).filter(h=>!$('side').value||!h.side||h.side===$('side').value);}
  function fadeToggles(pose){
    const key=$('layerOrder').value;if(!C.canFade(key)||!skin.parts[key])return [];
    const part=C.partFor(skin,key,pose),m=C.matrix(part,C.bones(pose)[key]);
    return ['start','end'].map(end=>{const f=C.fadeGeometry(part,end),x=f.center[0]-f.ux*f.radius*.55,y=f.center[1]-f.uy*f.radius*.55;return {key,end,strength:f.strength,x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]};});
  }
  function draw(){
    const renderScale=stage.width/512;ctx.setTransform(renderScale,0,0,renderScale,0,0);
    const pose=C.sample(clip,phase,$('smooth').checked);
    ctx.clearRect(0,0,512,560);ctx.fillStyle='#505050';ctx.fillRect(0,0,512,560);
    ctx.save();ctx.translate(256+pan.x,280+pan.y);ctx.scale(zoom,zoom);ctx.translate(-256,-280);
    M.floor(ctx);ctx.save();ctx.translate($('travel').checked?M.offset(distance,-1):0,0);
    const bitmap=$('editTarget').value==='bitmap'||drag?.mode==='bitmap';
    paintCharacter(ctx,pose,{skeleton:$('bones').checked||$('edit').checked&&!bitmap});
    if($('edit').checked&&!bitmap){
      const active=new Set(E.selectedHandleKeys(pose,selectedSkeleton));
      for(const h of handles(pose)){
        ctx.beginPath();ctx.arc(512-h.point.x,h.point.y,7,0,Math.PI*2);ctx.fillStyle=active.has(h.key)?'#ffdc60':'#17251e';ctx.fill();ctx.strokeStyle=h.color;ctx.lineWidth=2;ctx.stroke();
      }
    }
    if($('edit').checked&&bitmap){
      const h=E.partHandles(skin,$('layerOrder').value,pose);
      if(h){
        ctx.strokeStyle='#ffe08b';ctx.lineWidth=1/zoom;ctx.setLineDash([4/zoom,3/zoom]);ctx.beginPath();
        h.corners.forEach((p,i)=>i?ctx.lineTo(p.x,p.y):ctx.moveTo(p.x,p.y));ctx.closePath();ctx.stroke();ctx.setLineDash([]);
        ctx.beginPath();ctx.moveTo(h.pivot.x,h.pivot.y);ctx.lineTo(h.rotate.x,h.rotate.y);ctx.stroke();
        for(const key of ['pivot','rotate','size']){
          const p=h[key],r=3/zoom;ctx.beginPath();if(key==='size')ctx.rect(p.x-r,p.y-r,r*2,r*2);else ctx.arc(p.x,p.y,r,0,Math.PI*2);
          ctx.fillStyle=key==='pivot'?'#26332c':'#ffe08b';ctx.fill();ctx.stroke();
        }
        for(const [axis,label] of [['width','↔'],['height','↕']]){
          const p=h[axis],r=5/zoom;ctx.fillStyle='#26332c';ctx.strokeStyle='#ffe08b';ctx.lineWidth=1/zoom;
          ctx.beginPath();ctx.rect(p.x-r*1.4,p.y-r,r*2.8,r*2);ctx.fill();ctx.stroke();
          ctx.fillStyle='#ffe08b';ctx.font=`${7/zoom}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(label,p.x,p.y);
        }
        const key=$('layerOrder').value,part=C.partFor(skin,key,pose);
        for(const end of ['start','end']){
          const f=C.fadeFor(part,end);if(!C.canFade(key)||!f.strength)continue;
          const g=C.fadeGeometry(part,end),a=g.center,angle=g.angle+Math.PI;
          ctx.save();ctx.transform(...C.matrix(part,C.bones(pose)[key]));ctx.strokeStyle='#80e6ff';
          ctx.lineWidth=2;ctx.setLineDash([4,4]);ctx.beginPath();ctx.ellipse(...a,f.radius,f.radius2,angle,-Math.PI/2,Math.PI/2);ctx.closePath();ctx.stroke();ctx.restore();
        }
      }
    }
    if($('edit').checked&&bitmap){
      for(const t of fadeToggles(pose)){
        ctx.beginPath();ctx.arc(t.x,t.y,4/zoom,0,Math.PI*2);ctx.fillStyle='#18373d';ctx.fill();ctx.strokeStyle='#80e6ff';ctx.lineWidth=1/zoom;ctx.stroke();
        ctx.fillStyle='#80e6ff';ctx.font=`${7/zoom}px sans-serif`;ctx.textAlign='center';ctx.textBaseline='middle';ctx.fillText(t.strength?'×':'+',t.x,t.y);
      }
    }
    if($('bones').checked||$('edit').checked&&!bitmap){
      const joints=C.bones(pose),visibleHandles=$('edit').checked&&!bitmap?handles(pose):[];
      for(const key of skin.layers.filter(C.canFade))for(const end of ['start','end']){
        const f=C.fadeFor(C.partFor(skin,key,pose),end);if(!f.strength)continue;
        const p=joints[key][end==='start'?0:1],isHandle=visibleHandles.some(h=>Math.hypot(512-h.point.x-p.x,h.point.y-p.y)<1e-6);
        ctx.save();ctx.strokeStyle='#80e6ff';ctx.lineWidth=isHandle?1:.7;
        ctx.beginPath();ctx.arc(p.x,p.y,isHandle?4:1.5,Math.PI,2*Math.PI);ctx.stroke();ctx.restore();
      }
    }
    ctx.restore();ctx.restore();$('zoomLabel').textContent=Math.round(zoom*100)+' %';
    const m=mini.getContext('2d');m.clearRect(0,0,mini.width,mini.height);m.save();m.scale(mini.width/512,mini.height/560);M.floor(m);m.translate($('travel').checked?M.offset(distance,-1):0,0);paintCharacter(m,pose);m.restore();
    $('frameLabel').textContent=`${index()+1} / ${clip.frames.length}`;
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
    $('clip').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='—';$('clip').append(blank);
    for(const c of Object.values(library.finished_animations||{})){const o=document.createElement('option');o.value=c.id;o.textContent=c.name;$('clip').append(o);}
    $('clip').value=library.finished_animations?.[selected]?selected:'';
  }
  function characterAnimations(record){
    return Object.fromEntries((record?.animation_ids||[]).filter(id=>library.finished_animations?.[id]).map(id=>[id,library.finished_animations[id]]));
  }
  function selectedCharacterAnimation(record){const animations=characterAnimations(record);return record?.default_animation_id&&animations[record.default_animation_id]?record.default_animation_id:Object.keys(animations)[0]||'';}
  function loadClip(record,{source='',assigned='',finished='',message='Načteno',skeletonClean=true,animationClean=true}={}){
    stop();clip=copy(record||{id:'',name:'Nová animace',fps:6,frames:[R.neutral(),R.neutral()]});if(source)clip.source_clip_id=source;clip.joint_limits=R.jointLimitsFor(clip);characterAnimationId=assigned;finishedAnimationId=finished;skeletonDirty=!skeletonClean;animationDirty=!animationClean;phase=0;dirty=skinDirty||skeletonDirty||animationDirty;history=[];future=[];options(finishedAnimationId);skeletonOptions();
    $('fps').value=clip.fps;$('undo').disabled=true;saveButtons();
    $('moveSpeed').value=M.speed(clip);
    characterAnimationOptions(assigned);thumbnails();draw();status(message+': '+clip.name+'.');
  }
  function skeletonForClip(record){
    if(library.clips?.[record?.skeleton_id])return record.skeleton_id;
    return '';
  }
  async function select(id,{confirmDiscard=true,syncAssets=true}={}){
    const record=library.finished_animations?.[id];if(!record)return false;
    if(confirmDiscard&&!confirm(`Zahodit aktuálně rozpracovanou animaci a načíst hotovou animaci „${record.name}“?\nBitmapová předloha a kostra se přepnou podle uložené animace. Animace vybraná u postavy se odpojí.`))return false;
    stop();
    try{
      if(syncAssets){const targetSkin=skinCatalog.skins?.[record.skin_id]?record.skin_id:$('skinSelect').value;if(targetSkin)await loadSkin(targetSkin);applyBitmap(record.bitmap);}
      skeletonId=skeletonForClip(record);skeletonOptions();
      loadClip(record,{source:record.skeleton_id||'',finished:id,message:'Načtená hotová animace'});return true;
    }catch(e){saveError(e);return false;}
  }
  function change(fn){stop();const p={...R.neutral(),...clip.frames[index()]};fn(p);remember();clip=E.poseChange(clip,index(),p,scope());mark('skeleton');thumbnails();draw();}
  function download(blob,name){const u=URL.createObjectURL(blob),a=document.createElement('a');a.href=u;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function exportCanvas(canvas,name){canvas.toBlob(blob=>{if(blob)download(blob,name);else status('Export PNG se nezdařil.',true);},'image/png');}
  function bitmapOptions(selected=''){
    $('skinSelect').replaceChildren();for(const [id,entry] of Object.entries(skinCatalog.skins||{})){const o=document.createElement('option');o.value=id;o.textContent=entry.name;$('skinSelect').append(o);}
    $('skinSelect').value=skinCatalog.skins?.[selected]?selected:Object.keys(skinCatalog.skins||{})[0]||'';
  }
  async function loadSkin(id,snapshot){
    const entry=skinCatalog.skins[id];if(!entry)throw Error('Neznámá bitmapová předloha');
    skinURL=new URL('../graphics/bitmapove-predlohy/'+entry.path,location.href);skin=copy(snapshot||await getJSON(skinURL));skin.layers=skin.layers.filter(k=>k!=='shoulders');skinDirty=false;
    if(!snapshot)for(const key of skin.layers.filter(C.canFade))for(const end of ['start','end']){const part=skin.parts[key];part.joint_fade??={};part.joint_fade[end]??={...C.fadeFor(part,end),strength:.65};}
    $('parts').replaceChildren();for(const key of Object.keys(images)){delete images[key];delete hitMasks[key];delete gameImages[key];delete gameMasks[key];}
    gameManifest=null;
    await Promise.all(Object.entries(skin.parts).filter(([key])=>skin.layers.includes(key)).map(async([key,part])=>{
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
    $('nearLegend').textContent='Bližší: '+(skin.parts.nearFoot?.label||'díly');
    $('farLegend').textContent='Vzdálenější: '+(skin.parts.farFoot?.label||'díly');
    layerOptions();
  }
  function bitmapSnapshot(){
    const layers=skin.layers.filter(key=>key!=='shoulders');
    return {layers:copy(layers),parts:Object.fromEntries(layers.map(key=>[key,{offset:copy(skin.parts[key].offset||[0,0]),rotation:skin.parts[key].rotation||0,
      ...(skin.parts[key].pivot_offset?{pivot_offset:copy(skin.parts[key].pivot_offset)}:{}),...(skin.parts[key].joint_fade?{joint_fade:copy(skin.parts[key].joint_fade)}:{}),
      ...Object.fromEntries(['scale','scale_x','scale_y'].map(axis=>[axis,skin.parts[key][axis]||1]))}]))};
  }
  function applyBitmap(bitmap){
    if(!bitmap?.layers||!bitmap?.parts)return;
    const active=skin.layers.filter(key=>key!=='shoulders');
    if(bitmap.layers.length!==active.length||bitmap.layers.some(key=>!active.includes(key)))return;
    skin.layers=copy(bitmap.layers);for(const key of skin.layers)if(bitmap.parts[key])Object.assign(skin.parts[key],copy(bitmap.parts[key]));layerOptions();
  }
  function gameOptions(selected=''){
    $('gameCharacter').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Nová postava';$('gameCharacter').append(blank);
    for(const r of Object.values(gameCatalog.characters)){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;$('gameCharacter').append(o);}
    $('gameCharacter').value=selected;
    characterAnimationOptions(characterAnimationId);
    trashOptions();
  }
  function characterAnimationOptions(selected=''){
    const record=gameCatalog?.characters?.[characterId],animations=characterAnimations(record);$('characterAnimation').replaceChildren();
    const blank=document.createElement('option');blank.value='';blank.textContent=record?'—':'Nejprve vyber postavu';$('characterAnimation').append(blank);
    for(const animation of Object.values(animations)){const o=document.createElement('option');o.value=animation.id;o.textContent=animation.name;$('characterAnimation').append(o);}
    $('characterAnimation').value=animations[selected]?selected:'';$('characterAnimation').disabled=!record||!Object.keys(animations).length;
  }
  async function loadCharacterAnimation(id){
    const animation=library.finished_animations?.[id];if(!animation)return;
    await loadSkin(animation.skin_id);applyBitmap(animation.bitmap);const source=library.clips[animation.skeleton_id]?animation.skeleton_id:'';
    skeletonId=source;skeletonOptions();loadClip(copy(animation),{source,assigned:id,finished:id,message:'Načtená animace postavy'});
  }
  function trashOptions(){
    const selected=$('trash').value;$('trash').replaceChildren();
    for(const [source,catalog] of [['characters',gameCatalog],['clips',library],['finished_animations',library],['poses',library]])for(const [id,item] of Object.entries(catalog?.trash||{})){
      if(item.collection!==source)continue;
      const o=document.createElement('option');o.value=source+':'+id;o.textContent=(source==='characters'?'Postava: ':source==='clips'?'Kosterní animace: ':source==='poses'?'Póza: ':'Hotová animace: ')+item.record.name;$('trash').append(o);
    }
    $('trash').value=[...$('trash').children].some(o=>o.value===selected)?selected:$('trash').children[0]?.value||'';
    $('restoreDeleted').disabled=!$('trash').children.length||saving||characterSaving;
  }
  async function catalogAction(collection,restore=false){
    if(saving||characterSaving)return;
    let id=collection==='characters'?characterId:collection==='clips'?skeletonId:finishedAnimationId,catalog=collection==='characters'?gameCatalog:library;
    if(restore){const selection=$('trash').value.split(':');collection=selection[0];id=selection[1];catalog=collection==='characters'?gameCatalog:library;}
    const record=restore?catalog.trash?.[id]?.record:catalog[collection]?.[id];if(!record)return;
    if(!confirm(`${restore?'Obnovit':'Přesunout do koše'} ${collection==='characters'?'postavu':collection==='clips'?'kosterní animaci':collection==='poses'?'pózu':'hotovou animaci'} „${record.name}“?\nZdrojové obrázky a kopie v jiných postavách zůstanou. ${restore?'':'Smazání lze vrátit v Koši. Rozpracované úpravy zůstanou v editoru.'}`))return;
    stop();characterSaving=true;saveButtons();
    try{
      const response=await fetch(collection==='characters'?'/api/game-characters':'/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({mode:restore?'restore':'delete',collection,id,expectedRecord:copy(record)})});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Operace koše selhala.');
      if(collection==='characters')gameCatalog.trash=result.trash;
      else{
        if(collection==='finished_animations')animationTrash=result.trash;else skeletonTrash=result.trash;
        library.trash={...skeletonTrash,...animationTrash};
      }
      if(restore)catalog[collection][result.id]=result.record;
      else{delete catalog[collection][id];if(collection==='characters'&&characterId===id){characterId='';characterAnimationId='';skinDirty=true;dirty=true;}else if(collection==='clips'&&skeletonId===id){skeletonId='';skeletonDirty=true;dirty=true;}else if(collection==='finished_animations'&&finishedAnimationId===id){finishedAnimationId='';animationDirty=true;clip.id='';dirty=true;}}
      gameOptions(characterId);options(finishedAnimationId);skeletonOptions();trashOptions();draw();
      status(restore?'Položka obnovena z koše.':'Položka je v koši. Rozpracovaná kopie zůstala v editoru; můžeš ji Uložit jako novou.');
    }catch(e){saveError(e);}finally{characterSaving=false;saveButtons();trashOptions();}
  }

  function skeletonOptions(){
    $('skeletonSelect').replaceChildren();const blank=document.createElement('option');blank.value='';blank.textContent='Vlastní nepojmenovaná kostra';$('skeletonSelect').append(blank);
    for(const r of Object.values(library.clips||{})){const o=document.createElement('option');o.value=r.id;o.textContent=r.name;$('skeletonSelect').append(o);}
    $('skeletonSelect').value=library.clips?.[skeletonId]?skeletonId:'';$('skeletonCount').textContent=`Automaticky načteno: ${Object.keys(library.clips||{}).length} kosterních animací.`;
  }
  function skeletonEdits(){
    const edits={};for(const [i,edit] of Object.entries(clip.frame_edits||{})){
      const clean={};if(edit.pose_base)clean.pose_base=copy(edit.pose_base);if(edit.lengths)clean.lengths=copy(edit.lengths);
      if(Object.keys(clean).length)edits[i]=clean;
    }return edits;
  }
  async function saveSkeleton(overwrite){
    if(saving||characterSaving)return;
    let previous=library.clips?.[skeletonId],name=previous?.name||'Moje kosterní animace';
    if(overwrite&&!previous)return;
    if(!overwrite){name=prompt('Název kosterní animace',name)?.trim();if(!name)return;previous=Object.values(library.clips||{}).find(r=>characterNameKey(r.name)===characterNameKey(name));}
    if(previous&&!confirm('Přepsat kosterní animaci „'+previous.name+'“ se zálohou?'))return;
    const payload={kind:'clip',name,frames:copy(clip.frames),fps:clip.fps,move_speed_pt_s:M.speed(clip),rig_lengths:R.lengthsFor(clip),joint_limits:R.jointLimitsFor(clip),frame_edits:skeletonEdits()};
    if(previous)Object.assign(payload,{mode:'update',id:previous.id,expectedRecord:copy(previous)});
    saving=true;saveButtons();
    try{const r=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Uložení kostry se nezdařilo.');
      library.clips??={};library.clips[result.record.id]=result.record;skeletonId=result.record.id;skeletonDirty=false;dirty=skinDirty||animationDirty;skeletonOptions();saveButtons();status('Kosterní animace uložená: '+result.record.name+'. Bitmapová předloha se do ní neukládá.');
    }catch(e){saveError(e);}finally{saving=false;saveButtons();}
  }
  $('saveSkeleton').onclick=()=>saveSkeleton(false);$('updateSkeleton').onclick=()=>saveSkeleton(true);
  $('deleteSkeleton').onclick=()=>catalogAction('clips');
  $('skeletonSelect').onchange=async()=>{
    const previous=skeletonId,next=$('skeletonSelect').value,record=library.clips?.[next];if(!record){skeletonId='';saveButtons();return;}
    if(!confirm(`Zahodit aktuálně rozpracovanou animaci a načíst kosterní animaci „${record.name}“?\nBitmapová předloha zůstane vybraná a animace postavy se odpojí.`)){$('skeletonSelect').value=previous;return;}
    skeletonId=next;loadClip({...copy(record),id:'',name:'Nová hotová animace · '+record.name},{source:next,message:'Načtená kosterní animace',skeletonClean:true,animationClean:false});skeletonOptions();characterAnimationId='';characterAnimationOptions('');status('Kosterní animace „'+record.name+'“ načtena. Kombinace s bitmapou je rozpracovaná (*).');
  };
  async function saveFinished(overwrite){
    if(saving||characterSaving)return;
    const previous=library.finished_animations?.[finishedAnimationId];if(overwrite&&!previous){status('Nejprve vyber uloženou hotovou animaci nebo použij plus.',true);return;}
    const name=overwrite?previous.name:prompt('Název hotové animace',clip.name||'Moje animace')?.trim();if(!name)return;
    if(!confirm(overwrite?`Přepsat hotovou animaci „${previous.name}“ se zálohou?`:`Přidat do knihovny hotovou animaci „${name}“?`))return;
    const payload=finishedPayload(name);
    if(skeletonId)payload.skeleton_id=skeletonId;
    if(overwrite)Object.assign(payload,{mode:'update',id:previous.id,expectedRecord:copy(previous)});
    const snapshot=JSON.stringify(clip);saving=true;saveButtons();
    try{const response=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Uložení hotové animace se nezdařilo.');
      library.finished_animations??={};library.finished_animations[result.record.id]=result.record;const changed=snapshot!==JSON.stringify(clip);
      if(!changed)loadClip(result.record,{source:result.record.skeleton_id||skeletonId,finished:result.record.id,message:overwrite?'Hotová animace aktualizována':'Hotová animace přidána',skeletonClean:!skeletonDirty});else{finishedAnimationId=result.record.id;options(finishedAnimationId);saveButtons();status('Animace byla uložena, novější rozpracované změny zůstaly v editoru.');}
    }catch(e){saveError(e);}finally{saving=false;saveButtons();}
  }
  function finishedPayload(name){const payload={kind:'finished_animation',name,frames:copy(clip.frames),fps:clip.fps,move_speed_pt_s:M.speed(clip),rig_lengths:R.lengthsFor(clip),joint_limits:R.jointLimitsFor(clip),frame_edits:copy(clip.frame_edits||{}),skin_id:$('skinSelect').value,bitmap:bitmapSnapshot()};if(skeletonId)payload.skeleton_id=skeletonId;return payload;}
  $('updateFinishedAnimation').onclick=()=>saveFinished(true);$('saveFinishedAnimation').onclick=()=>saveFinished(false);$('deleteFinishedAnimation').onclick=()=>catalogAction('finished_animations');
  $('deleteCharacter').onclick=()=>catalogAction('characters');
  $('restoreDeleted').onclick=()=>catalogAction(null,true);
  try{
    const [skeletonCatalog,animationCatalog]=await Promise.all([getJSON('../graphics/kostry/skeletons.json'),getJSON('../graphics/animace/animations.json')]);
    [skinCatalog,gameCatalog]=await Promise.all([getJSON('../graphics/bitmapove-predlohy/skins.json'),getJSON('../graphics/postavy/game-characters.json')]);
    skeletonTrash=skeletonCatalog.trash||{};animationTrash=animationCatalog.trash||{};
    library={...skeletonCatalog,finished_animations:animationCatalog.finished_animations||{},trash:{...skeletonTrash,...animationTrash}};
    bitmapOptions();
    await loadSkin(Object.keys(skinCatalog.skins)[0]);gameOptions();skeletonOptions();
    skeletonId=library.clips[skin.default_clip]?skin.default_clip:Object.keys(library.clips)[0]||'';
    loadClip(library.clips[skeletonId],{source:skeletonId,message:'Načtená kosterní animace',animationClean:false});
    for(const id of ['skinSelect','saveCharacter','play','previous','next','clip','fps','moveSpeed','bodyY','up','down','lean','exportFrame','exportSheet','exportRig'])$(id).disabled=false;
    saveButtons();
    playing=true;$('play').textContent='Pozastavit';
  }catch(e){status(e.message,true);return;}
  function screen(e){const r=stage.getBoundingClientRect();return {x:(e.clientX-r.left)*512/r.width,y:(e.clientY-r.top)*560/r.height};}
  function setZoom(value,at={x:256,y:280}){
    const next=Math.max(.4,Math.min(4,value)),ratio=next/zoom;
    pan={x:at.x-256-(at.x-256-pan.x)*ratio,y:at.y-280-(at.y-280-pan.y)*ratio};zoom=next;draw();
  }
  stage.onwheel=e=>{e.preventDefault();setZoom(window.EditorView.zoom(zoom,e.deltaY),Number.isFinite(e.clientX)?screen(e):undefined);};
  stage.oncontextmenu=e=>e.preventDefault(); // Ctrl-drag is an edit, including on macOS.
  $('zoomOut').onclick=()=>setZoom(zoom/1.2);$('zoomIn').onclick=()=>setZoom(zoom*1.2);$('zoomReset').onclick=()=>{pan=defaultPan();zoom=DEFAULT_ZOOM;draw();};
  $('renderMode').onchange=()=>{stage.style.imageRendering='auto';thumbnails();draw();};
  $('skinSelect').onchange=async()=>{if(skinDirty&&!confirm('Zahodit neuložené úpravy bitmapových dílů?')){$('skinSelect').value=skin.id;return;}stop();try{await loadSkin($('skinSelect').value);mark('bitmap');thumbnails();draw();}catch(e){status(e.message,true);}};
  $('layerOrder').onchange=()=>{layerOptions();cursor();draw();};
  function reorder(step){const key=$('layerOrder').value,i=skin.layers.indexOf(key),j=i+step;if(i<0||j<0||j>=skin.layers.length)return;remember();[skin.layers[i],skin.layers[j]]=[skin.layers[j],skin.layers[i]];skinDirty=true;mark('bitmap');layerOptions(key);thumbnails();draw();}
  $('layerBack').onclick=()=>reorder(-1);$('layerFront').onclick=()=>reorder(1);
  $('anchorReset').onclick=()=>{stop();const key=$('layerOrder').value;remember();({clip,skin}=E.partChange(clip,skin,index(),key,{offset:[0,0]},scope()));skinDirty=true;mark('bitmap');thumbnails();draw();};
  $('spread').value=spread;
  $('spread').onchange=()=>{remember();spread=R.clamp(Number($('spread').value)||0,0,90);$('spread').value=spread;delta=R.clamp(delta,-spread,spread);$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=delta;mark('animation');draw();};
  $('rateDelta').oninput=()=>{delta=R.clamp(Number($('rateDelta').value)||0,-spread,spread);draw();};
  $('randomRate').onclick=()=>{delta=M.variation(spread);$('rateDelta').value=delta;draw();};
  const characterNameKey=name=>name.normalize('NFC').trim().replace(/\s+/gu,' ').toLowerCase();
  async function saveCharacter(overwrite=false){
    if(saving||characterSaving)return;
    let previous=gameCatalog.characters[characterId],name=previous?.name;
    if(overwrite&&!previous){status('Novou postavu nejprve ulož přes plus.',true);return;}
    if(overwrite&&!confirm(`Uložit změny postavy „${previous.name}“?\nPřiřazené animace se mění jen jejich vlastními tlačítky.`))return;
    characterSaving=true;saveButtons();
    try{
      if(!overwrite){
        // Refresh before resolving names: another tab may have saved a character.
        const fresh=await getJSON('../graphics/postavy/game-characters.json');
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
            const choice=prompt('Tento název má více starších postav. Kterou přepsat? Zadej číslo:\n'+matches.map((r,i)=>`${i+1}. ${r.name} · ${Object.values(characterAnimations(r))[0]?.name||'bez animace'} · ID ${r.id.slice(-8)}`).join('\n'),'1');
            if(choice===null)continue;
            const n=Number(choice);if(!Number.isInteger(n)||n<1||n>matches.length){status('Vyber číslo existující postavy.',true);continue;}
            previous=matches[n-1];
          }
          if(!confirm(`Postava „${previous.name}“ už existuje. Chceš ji přepsat?\n\nAno (OK): přepsat se zálohou.\nNe (Zrušit): zpět k zadání názvu.`))continue;
          overwrite=true;name=previous.name;break;
        }
      }
      if(!overwrite&&!confirm(`Vytvořit novou postavu „${name}“ s aktuální animací?`)){status('Ukládání zrušeno. Rozpracované změny zůstávají.');return;}
      stop();
      const snapshot=JSON.stringify({clip,skin,spread});
      const payload={name,motion:{variation_percent:spread}};
      if(!overwrite){
        if(!finishedAnimationId){
          const savedResponse=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(finishedPayload(clip.name||'Animace'))}),saved=await savedResponse.json();if(!savedResponse.ok||!saved.ok)throw Error(saved.error||'Nejdřív se nepodařilo uložit animaci postavy.');
          library.finished_animations[saved.record.id]=saved.record;finishedAnimationId=saved.record.id;options(finishedAnimationId);
        }
        payload.animation_id=finishedAnimationId;
      }
      if(overwrite)Object.assign(payload,{mode:'update',id:previous.id,expectedRecord:copy(previous)});
      const r=await fetch('/api/game-characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Uložení se nezdařilo.');
      gameCatalog.characters[result.record.id]=result.record;characterId=result.record.id;characterAnimationId=overwrite&&characterAnimationId?characterAnimationId:selectedCharacterAnimation(result.record);gameOptions(characterId);
      if(snapshot===JSON.stringify({clip,skin,spread})){skinDirty=false;if(!overwrite)dirty=false;}
      status('Postava uložená: '+result.record.name+(overwrite?'. Animace zůstává samostatná a předchozí stav postavy je v záloze.':'.'));
    }catch(e){saveError(e);}finally{characterSaving=false;saveButtons();}
  }
  $('saveCharacter').onclick=()=>saveCharacter(false);$('updateCharacter').onclick=()=>saveCharacter(true);
  $('gameCharacter').onchange=async()=>{
    const r=gameCatalog.characters[$('gameCharacter').value];if(!r){characterId='';characterAnimationId='';characterAnimationOptions();saveButtons();return;}
    if(dirty&&!confirm('Načíst postavu a zahodit neuložené úpravy?')){$('gameCharacter').value=characterId;return;}
    stop();try{spread=r.motion?.variation_percent||0;delta=0;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=0;characterId=r.id;characterAnimationId=selectedCharacterAnimation(r);gameOptions(characterId);if(characterAnimationId)await loadCharacterAnimation(characterAnimationId);else{const source=library.clips[skin.default_clip]?skin.default_clip:Object.keys(library.clips)[0]||'';skeletonId=source;loadClip(library.clips[source],{source,message:'Načtená kosterní animace',animationClean:false});}}catch(e){status(e.message,true);}
  };
  $('characterAnimation').onchange=async()=>{const next=$('characterAnimation').value;if(!next)return;if(dirty&&!confirm('Načíst jinou animaci postavy a zahodit neuložené úpravy animace?')){$('characterAnimation').value=characterAnimationId;return;}await loadCharacterAnimation(next);};
  $('play').onclick=()=>{if(playing)stop();else{playing=true;$('play').textContent='Pozastavit';}draw();};
  $('previous').onclick=()=>{stop();phase=(index()+clip.frames.length-1)%clip.frames.length;draw();};
  $('next').onclick=()=>{stop();phase=(index()+1)%clip.frames.length;draw();};
  for(const id of ['smooth','bones','side'])$(id).onchange=draw;
  $('edit').onchange=()=>{if($('edit').checked)stop();draw();};
  $('clip').onchange=async()=>{const previous=finishedAnimationId,next=$('clip').value;if(!next){finishedAnimationId='';saveButtons();return;}if(!await select(next))$('clip').value=previous;};
  $('fps').onchange=()=>{stop();remember();clip.fps=Math.max(1,Math.min(30,Math.round(Number($('fps').value)||6)));$('fps').value=clip.fps;mark('skeleton');draw();};
  $('moveSpeed').onchange=()=>{stop();remember();const value=Number($('moveSpeed').value);clip.move_speed_pt_s=Number.isFinite(value)?R.clamp(value,0,1000):M.DEFAULT_SPEED;$('moveSpeed').value=clip.move_speed_pt_s;mark('skeleton');draw();};
  $('travel').onchange=()=>{distance=0;draw();};
  $('up').onclick=e=>change(p=>p.bodyY=R.clamp((p.bodyY||0)-(e.shiftKey?10:1),-100,100));
  $('down').onclick=e=>change(p=>p.bodyY=R.clamp((p.bodyY||0)+(e.shiftKey?10:1),-100,100));
  $('lean').onchange=()=>change(p=>p.bodyLean=Number($('lean').value));
  $('bodyY').onchange=()=>change(p=>p.bodyY=R.clamp(Number($('bodyY').value)||0,-100,100));
  function restore(old){stop();skeletonId=old.skeletonId||'';finishedAnimationId=old.finishedAnimationId||'';clip=old.clip;clip.joint_limits=R.jointLimitsFor(clip);skin=old.skin;skinDirty=old.skinDirty;skeletonDirty=true;animationDirty=true;dirty=true;characterAnimationId='';spread=old.spread;phase=old.index;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;delta=R.clamp(delta,-spread,spread);$('rateDelta').value=delta;$('fps').value=clip.fps;$('moveSpeed').value=M.speed(clip);characterAnimationOptions('');skeletonOptions();options(finishedAnimationId);status('Neuložené změny');syncTools();saveButtons();layerOptions(old.selected);selectedSkeleton=old.selectedSkeleton??selectedSkeleton;thumbnails();draw();}
  $('undo').onclick=()=>{if(!history.length||drag)return;const old=history.pop();future.push({...snapshot(),index:old.index});restore(old);};
  $('redo').onclick=()=>{if(!future.length||drag)return;const next=future.pop();history.push({...snapshot(),index:next.index});restore(next);};
  $('resetFrame').onclick=()=>{if(!clip.frame_edits?.[index()])return;stop();remember();clip=E.resetFrame(clip,index());mark('skeleton');thumbnails();draw();};
  for(const id of ['editTarget','editScope','editTool'])$(id).onchange=()=>{cursor();draw();};
  for(const [group,choices] of Object.entries(toolChoices))for(const [id,value] of Object.entries(choices))$(id).onclick=()=>{$(group).value=value;$(group).onchange();};
  $('editScope').onclick=()=>{$('editScope').value=scope()==='all'?'frame':'all';$('editScope').onchange();};
  $('editTarget').onclick=()=>{$('editTarget').value=$('editTarget').value==='bitmap'?'skeleton':'bitmap';$('editTarget').onchange();};
  $('headerTarget').onclick=()=>$('editTarget').onclick();
  $('headerScope').onclick=()=>$('editScope').onclick();
  $('headerTool').onclick=()=>{const order=['move','rotate','size'],next=order[(order.indexOf($('editTool').value)+1)%order.length],button={move:'toolMove',rotate:'toolRotate',size:'toolSize'}[next];$(button).onclick();};
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

  let partsDrag=null;
  function placeParts(x,y){
    const box=$('stageWrap').getBoundingClientRect(),p=$('partsTools').getBoundingClientRect();
    $('partsTools').style.left=R.clamp(x,0,Math.max(0,box.width-p.width))+'px';$('partsTools').style.top=R.clamp(y,0,Math.max(0,box.height-p.height))+'px';
  }
  $('partsCollapse').onclick=()=>{const hidden=!$('partsBody').hidden;$('partsBody').hidden=hidden;$('partsCollapse').textContent=hidden?'+':'−';$('partsCollapse').setAttribute('aria-expanded',String(!hidden));$('partsCollapse').setAttribute('aria-label',hidden?'Rozbalit díly':'Sbalit díly');placeParts(parseFloat($('partsTools').style.left)||266,parseFloat($('partsTools').style.top)||8);};
  $('partsGrip').onpointerdown=e=>{if(e.target.closest('button')||e.button!==0)return;const p=$('partsTools').getBoundingClientRect(),b=$('stageWrap').getBoundingClientRect();partsDrag={id:e.pointerId,x:e.clientX,y:e.clientY,left:p.left-b.left,top:p.top-b.top};e.preventDefault();$('partsGrip').setPointerCapture(e.pointerId);};
  $('partsGrip').onpointermove=e=>{if(partsDrag?.id===e.pointerId)placeParts(partsDrag.left+e.clientX-partsDrag.x,partsDrag.top+e.clientY-partsDrag.y);};
  $('partsGrip').onpointerup=$('partsGrip').onpointercancel=e=>{partsDrag=null;if($('partsGrip').hasPointerCapture(e.pointerId))$('partsGrip').releasePointerCapture(e.pointerId);};
  window.addEventListener('resize',()=>placeParts(parseFloat($('partsTools').style.left)||266,parseFloat($('partsTools').style.top)||8));


  let stageHeight=null,stageDrag=null;
  function syncStageResolution(cssWidth){
    const size=window.EditorView.backingSize(cssWidth,window.devicePixelRatio||1);
    if(stage.width===size.width&&stage.height===size.height)return false;
    stage.width=size.width;stage.height=size.height;return true;
  }
  function fitStage(height=stageHeight){
    const parent=$('stageWrap').parentElement?.getBoundingClientRect(),available=Math.max(1,(parent?.width||stage.getBoundingClientRect().width)-36);
    const size=window.EditorView.stageSize(height,available,window.innerHeight||900);
    $('stageWrap').style.width=size.width+'px';$('stageWrap').style.height=size.height+'px';
    const resolutionChanged=syncStageResolution(size.width);
    placePanel(parseFloat($('editTools').style.left)||8,parseFloat($('editTools').style.top)||8);
    placeParts(parseFloat($('partsTools').style.left)||266,parseFloat($('partsTools').style.top)||8);
    if(resolutionChanged&&clip)draw();
  }
  $('stageResize').onpointerdown=e=>{if(e.button!==0)return;e.preventDefault();e.stopPropagation();stageDrag={id:e.pointerId,y:e.clientY,height:$('stageWrap').getBoundingClientRect().height};$('stageResize').setPointerCapture(e.pointerId);};
  $('stageResize').onpointermove=e=>{if(stageDrag?.id!==e.pointerId)return;e.preventDefault();stageHeight=stageDrag.height+e.clientY-stageDrag.y;fitStage(stageHeight);};
  $('stageResize').onpointerup=$('stageResize').onpointercancel=e=>{stageDrag=null;if($('stageResize').hasPointerCapture(e.pointerId))$('stageResize').releasePointerCapture(e.pointerId);};
  $('stageResize').ondblclick=()=>{stageHeight=null;fitStage();};
  $('stageResize').onkeydown=e=>{if(!['ArrowUp','ArrowDown','Home'].includes(e.key))return;e.preventDefault();stageHeight=e.key==='Home'?null:$('stageWrap').getBoundingClientRect().height+(e.key==='ArrowUp'?-20:20);fitStage();};
  window.addEventListener('resize',()=>fitStage());fitStage();
  function pointer(e){const p=screen(e);return window.EditorView.point(p.x,p.y,zoom,true,pan);}
  function cursor(e={}){
    const bitmap=$('editTarget').value==='bitmap';
    const tool=drag?.mode==='bitmap'?drag.tool:bitmap&&e.shiftKey?'pivot':e.ctrlKey&&e.altKey?'size':bitmap&&e.ctrlKey?'height':bitmap&&e.altKey?'width':e.altKey?'move':e.ctrlKey?'length':$('editTool').value;
    stage.style.cursor=drag?.mode==='pan'?'grabbing':tool==='pivot'?'crosshair':tool==='fade'||tool==='height'||tool==='heightHandle'?'ns-resize':tool==='width'||tool==='widthHandle'||tool==='length'?'ew-resize':tool==='size'?'nwse-resize':tool==='move'?'move':'grab';
    $('gestureHint').textContent=tool==='height'?'Ctrl + tah dolů/nahoru: výška bitmapy · šířka a kostra se nemění':tool==='width'?'Option + tah doprava/doleva: šířka bitmapy · výška a kostra se nemění':bitmap?'Bitmapa: Ctrl = výška · Option = šířka · Ctrl+Option = obojí · posun: nástroj Posun':'Ctrl: délka kosti · Option: posun bitmapy · Ctrl+Option: velikost bitmapy';
    $('gestureHint').textContent+=' · Pravý tah ↓/↑: zprůhlednit / zneprůhlednit spoj';
    if(bitmap)$('gestureHint').textContent+=' · Shift+tah: rotační střed · ↔ / ↕: šířka / výška';
    $('gestureHint').textContent+=' · 1/+: kostra/bitmapa · 2/Ě: snímek/animace · 3/Š: nástroj · Mezerník: přehrát/pauza · Y: zpět · X/C: vpřed · WASD: posun · Q/E: rotace';
  }
  let keyboardEdit=null;
  window.addEventListener('keydown',e=>{
    cursor(e);
    const target=e.target||document.activeElement,key=e.key?.toLowerCase();
    if(e.defaultPrevented||e.isComposing||['INPUT','TEXTAREA','SELECT'].includes(target?.tagName)||target?.isContentEditable||target?.closest?.('[contenteditable=true]'))return;
    if(key==='escape'){target?.blur?.();keyboardEdit=null;return;}
    if((e.metaKey||e.ctrlKey)&&key==='z'){e.preventDefault();(e.shiftKey?$('redo'):$('undo')).onclick();keyboardEdit=null;return;}
    if(e.metaKey||e.ctrlKey||e.altKey||drag||!visible)return;
    if(['+','1'].includes(key)){e.preventDefault();if(!e.repeat)$('headerTarget').onclick();keyboardEdit=null;return;}
    if(['2','ě'].includes(key)){e.preventDefault();if(!e.repeat)$('headerScope').onclick();keyboardEdit=null;return;}
    if(['3','š'].includes(key)){e.preventDefault();if(!e.repeat)$('headerTool').onclick();keyboardEdit=null;return;}
    if(key===' '){e.preventDefault();if(!e.repeat)$('play').onclick();keyboardEdit=null;return;}
    if(['y','x','c'].includes(key)){e.preventDefault();keyboardEdit=null;$(key==='y'?'previous':'next').onclick();return;}
    const move=['w','a','s','d'].includes(key),rotate=['q','e'].includes(key);
    if(!move&&!rotate)return;
    e.preventDefault();
    if(!$('edit').checked){status('Pro úpravu dílu klávesami zapni úpravy myší.');return;}
    freeze();const selected=$('layerOrder').value,pose=C.sample(clip,index(),false),part=C.partFor(skin,selected,pose);
    if($('editTarget').value==='skeleton'){
      const selectedHandle=selectedSkeleton||E.handleForBone(selected),h=handles(pose).find(h=>h.key===selectedHandle);
      if(!h)return;
      const step=e.shiftKey?10:1;
      let end={x:h.point.x+(key==='a'?step:key==='d'?-step:0),y:h.point.y+(key==='w'?-step:key==='s'?step:0)};
      if(rotate){
        const pivot=h.key==='bodyY'?R.points(pose,pose.rig_lengths).hipCenter:h.pivot;
        if(!pivot)return;
        const a=(key==='q'?1:-1)*step*Math.PI/180,dx=h.point.x-pivot.x,dy=h.point.y-pivot.y;
        end={x:pivot.x+dx*Math.cos(a)-dy*Math.sin(a),y:pivot.y+dx*Math.sin(a)+dy*Math.cos(a)};
      }
      const next=E.dragSkeleton(clip,index(),h.key,h.point,end,{scope:scope(),tool:rotate?'rotate':'move'});
      if(JSON.stringify(next)===JSON.stringify(clip))return;
      const token=[key,e.shiftKey,h.key,index(),scope()].join(':');
      if(!e.repeat||keyboardEdit!==token)remember();keyboardEdit=token;clip=next;mark('skeleton');thumbnails();draw();return;
    }
    const step=e.shiftKey?10:1;
    const values=rotate?{rotation:part.rotation+(key==='q'?-1:1)*(e.shiftKey?10:1)}:
      {offset:C.moveAttachment(part,C.bones(pose)[selected],key==='a'?-step:key==='d'?step:0,key==='w'?-step:key==='s'?step:0).offset};
    const token=[key,e.shiftKey,selected,index(),scope()].join(':');
    if(!e.repeat||keyboardEdit!==token)remember();keyboardEdit=token;
    ({clip,skin}=E.partChange(clip,skin,index(),selected,values,scope()));skinDirty=true;mark('bitmap');thumbnails();draw();
  });
  window.addEventListener('keyup',e=>{keyboardEdit=null;cursor(e);});window.addEventListener('blur',()=>{keyboardEdit=null;cursor();});cursor();
  const travelX=()=>$('travel').checked?M.offset(distance,-1):0;
  function freeze(){const d=distance;phase=Math.round(phase)%clip.frames.length;stop();distance=d;}
  stage.onpointerdown=e=>{
    if(![0,2].includes(e.button)||drag)return;
    if(e.button===0&&!e.ctrlKey&&!e.altKey&&!e.shiftKey&&$('edit').checked&&$('editTarget').value==='bitmap'){const p=pointer(e),pose=C.sample(clip,phase,$('smooth').checked),t=fadeToggles(pose).find(t=>Math.hypot(t.x-(512-p.x-travelX()),t.y-p.y)<9/zoom);const grips=$('editTarget').value==='bitmap'?E.partHandles(skin,$('layerOrder').value,pose):null,gripHit=grips&&['rotate','size','width','height','pivot'].some(k=>Math.hypot(grips[k].x-(512-p.x-travelX()),grips[k].y-p.y)<Math.min(12/zoom,t?Math.hypot(t.x-(512-p.x-travelX()),t.y-p.y):Infinity));if(t&&!gripHit){e.preventDefault();$('fadeEnd').value=t.end;changeFade({strength:t.strength?0:.65});return;}}
    const right=e.button===2,bitmapMode=$('editTarget').value==='bitmap',bitmap=bitmapMode;
    if(bitmap&&$('edit').checked){
      const p=pointer(e),pose=C.sample(clip,phase,$('smooth').checked);
      const point={x:512-p.x-travelX(),y:p.y},selected=$('layerOrder').value;
      const grips=$('editTarget').value==='bitmap'?E.partHandles(skin,selected,pose):null;
      const grip=grips&&!right?['rotate','size','width','height','pivot'].map(k=>({k,d:Math.hypot(point.x-grips[k].x,point.y-grips[k].y)})).sort((a,b)=>a.d-b.d).find(v=>v.d<12/zoom)?.k:null;
      let endHit=null;
      if(right&&bitmapMode&&C.canFade(selected)){
        const part=C.partFor(skin,selected,pose),m=C.matrix(part,C.bones(pose)[selected]);
        endHit=['start','end'].map(end=>{const a=C.fadeGeometry(part,end).anchor;return {end,d:Math.hypot(point.x-(m[0]*a[0]+m[2]*a[1]+m[4]),point.y-(m[1]*a[0]+m[3]*a[1]+m[5]))};}).sort((a,b)=>a.d-b.d).find(v=>v.d<14/zoom);
      }
      const key=endHit||grip?selected:C.hitTest(skin,pixelMode()?gameMasks:hitMasks,pose,point,{ignoreFade:right});
      if(endHit)$('fadeEnd').value=endHit.end;
      if(key){
        if(right&&!C.canFade(key)){e.preventDefault();return;}
        freeze();layerOptions(key);
        const frozen=C.sample(clip,index(),false),h=E.partHandles(skin,key,frozen);
        const tool=right?'fade':bitmapMode&&e.shiftKey?'pivot':e.ctrlKey&&e.altKey?'size':bitmapMode&&e.ctrlKey?'height':bitmapMode&&e.altKey?'width':grip==='rotate'?'rotate':grip==='size'?'size':grip==='width'?'widthHandle':grip==='height'?'heightHandle':grip==='pivot'||e.altKey?'move':$('editTool').value||'rotate';
        e.preventDefault();drag={mode:'bitmap',tool,scope:scope(),index:index(),id:e.pointerId,key,grab:point,part:C.partFor(skin,key,frozen),bone:C.bones(frozen)[key],pivot:h.pivot,clip:copy(clip),skin:copy(skin),changed:false};stage.setPointerCapture(e.pointerId);cursor(e);draw();return;
      }
    }
    if(right){e.preventDefault();return;}
    const p=pointer(e),visiblePoint={x:p.x+travelX(),y:p.y};
    let h=handles(C.sample(clip,phase,$('smooth').checked)).map(h=>({...h,d:Math.hypot(h.point.x-visiblePoint.x,h.point.y-visiblePoint.y)})).sort((a,b)=>a.d-b.d)[0];
    if(!bitmap&&$('edit').checked&&(!h||h.d>14/zoom)){
      const pose=C.sample(clip,phase,$('smooth').checked),key=C.hitTest(skin,pixelMode()?gameMasks:hitMasks,pose,{x:512-visiblePoint.x,y:visiblePoint.y});
      const handle=key&&handles(pose).find(v=>v.key===E.handleForBone(key));if(handle)h={...handle,d:0};
    }
    if(bitmap||!$('edit').checked||!h||h.d>14/zoom){if(e.ctrlKey||e.altKey)return;e.preventDefault();drag={mode:'pan',id:e.pointerId,grab:screen(e),pan:{...pan}};stage.setPointerCapture(e.pointerId);cursor(e);return;}
    freeze();const part=E.boneForHandle(h.key)||{head:'head',neck:'head',bodyY:'torso',bodyLean:'torso'}[h.key];if(part)layerOptions(part);selectedSkeleton=h.key;
    e.preventDefault();drag={mode:'skeleton',id:e.pointerId,key:h.key,index:index(),start:handles().find(v=>v.key===h.key).point,grab:p,clip:copy(clip),scope:scope(),tool:$('editTool').value||'rotate',ctrlKey:e.ctrlKey,resize:$('resizeBones').checked,changed:false};stage.setPointerCapture(e.pointerId);draw();
  };
  stage.onpointermove=e=>{
    cursor(e);
    if(!drag||drag.id!==e.pointerId)return;
    if(drag.mode==='pan'){const p=screen(e);pan={x:drag.pan.x+p.x-drag.grab.x,y:drag.pan.y+p.y-drag.grab.y};draw();return;}
    if(drag.mode==='bitmap'){
      const p=pointer(e),point={x:512-p.x-travelX(),y:p.y};let values;
      if(drag.tool==='fade')values={strength:R.clamp(C.fadeFor(drag.part,$('fadeEnd').value||'start').strength+(point.y-drag.grab.y)/150,0,1)};
      else if(drag.tool==='pivot')values={pivot_offset:C.movePivot(drag.part,drag.bone,point.x-drag.grab.x,point.y-drag.grab.y)};
      else if(drag.tool==='move')values={offset:C.moveAttachment(drag.part,drag.bone,point.x-drag.grab.x,point.y-drag.grab.y).offset};
      else if(drag.tool==='rotate')values={rotation:drag.part.rotation+(Math.atan2(point.y-drag.pivot.y,point.x-drag.pivot.x)-Math.atan2(drag.grab.y-drag.pivot.y,drag.grab.x-drag.pivot.x))*180/Math.PI};
      else if(drag.tool==='widthHandle'||drag.tool==='heightHandle'){
        const axis=drag.tool==='widthHandle'?'scale_x':'scale_y',m=C.matrix(drag.part,drag.bone),i=axis==='scale_x'?0:2;
        const projection=p=>(p.x-drag.pivot.x)*m[i]+(p.y-drag.pivot.y)*m[i+1],before=projection(drag.grab);
        values={[axis]:drag.part[axis]*R.clamp(Math.abs(before)>1e-8?projection(point)/before:1,.05,20)};
      }
      else if(drag.tool==='height')values={scale_y:drag.part.scale_y*Math.exp(R.clamp((point.y-drag.grab.y)/100,-10,10))};
      else if(drag.tool==='width')values={scale_x:drag.part.scale_x*Math.exp(R.clamp((point.x-drag.grab.x)/100,-10,10))};
      else values={scale:drag.part.scale*Math.hypot(point.x-drag.pivot.x,point.y-drag.pivot.y)/Math.max(1,Math.hypot(drag.grab.x-drag.pivot.x,drag.grab.y-drag.pivot.y))};
      const result=drag.tool==='pivot'?E.pivotChange(drag.clip,drag.skin,drag.index,drag.key,values.pivot_offset,drag.scope):drag.tool==='fade'?E.fadeChange(drag.clip,drag.skin,drag.index,drag.key,$('fadeEnd').value||'start',values,drag.scope):E.partChange(drag.clip,drag.skin,drag.index,drag.key,values,drag.scope);
      if(JSON.stringify(result)===JSON.stringify({clip,skin}))return;
      if(!drag.changed){remember();drag.changed=true;}({clip,skin}=result);skinDirty=true;mark('bitmap');thumbnails();draw();return;
    }
    const p=pointer(e),end={x:drag.start.x+p.x-drag.grab.x,y:drag.start.y+p.y-drag.grab.y};
    const updated=E.dragSkeleton(drag.clip,drag.index,drag.key,drag.start,end,drag);
    if(JSON.stringify(updated)===JSON.stringify(clip))return;
    if(!drag.changed){remember();drag.changed=true;}
    clip=updated;mark('skeleton');thumbnails();draw();
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
  async function saveCharacterAnimation(overwrite=false,special=false){
    if(saving||characterSaving)return;
    const previous=gameCatalog.characters[characterId];if(!previous){status('Nejprve vyber nebo vytvoř postavu.',true);return;}
    const existing=special&&!animationDirty&&finishedAnimationId&&library.finished_animations[finishedAnimationId];
    const name=existing?.name||prompt(special?'Název animace přiřazené postavě':'Název nové animace postavy',clip.name)?.trim();if(!name)return;
    if(!confirm(existing?`Přiřadit existující animaci „${name}“ k postavě „${previous.name}“?`:`Uložit novou animaci „${name}“ a přiřadit ji k postavě „${previous.name}“?`))return;
    stop();saving=true;saveButtons();
    try{
      let animationId=existing?.id;
      if(!animationId){
        const savedResponse=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(finishedPayload(name))}),saved=await savedResponse.json();if(!savedResponse.ok||!saved.ok)throw Error(saved.error||'Uložení animace se nezdařilo.');
        library.finished_animations[saved.record.id]=saved.record;animationId=saved.record.id;
      }
      const payload={mode:'animation-link',id:characterId,animation_id:animationId,make_default:true,expectedRecord:copy(previous)};
      const r=await fetch('/api/game-characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Přiřazení animace se nezdařilo. Animace zůstala bezpečně uložená ve společné knihovně.');
      gameCatalog.characters[result.record.id]=result.record;characterAnimationId=animationId;finishedAnimationId=animationId;clip.id=animationId;clip.name=name;clip.source_clip_id=skeletonId;animationDirty=false;gameOptions(characterId);options(finishedAnimationId);dirty=skinDirty||skeletonDirty;thumbnails();draw();
      status('Nová animace je uložená ve společné knihovně a přilinkovaná k postavě. Předchozí odkazy zůstaly zachované.');
    }catch(e){saveError(e);}finally{saving=false;saveButtons();}
  }
  async function deleteCharacterAnimation(){
    if(saving||characterSaving)return;const previous=gameCatalog.characters[characterId],assigned=characterAnimations(previous)[characterAnimationId];if(!previous||!assigned)return;
    if(!confirm(`Odebrat odkaz na animaci „${assigned.name}“ z postavy „${previous.name}“?\nAnimace zůstane ve společné knihovně beze změny.`))return;
    stop();saving=true;saveButtons();
    try{const payload={mode:'animation-unlink',id:characterId,animation_id:characterAnimationId,expectedRecord:copy(previous)},r=await fetch('/api/game-characters',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)}),result=await r.json();if(!r.ok||!result.ok)throw Error(result.error||'Odebrání odkazu se nezdařilo.');
      gameCatalog.characters[result.record.id]=result.record;characterAnimationId=selectedCharacterAnimation(result.record);gameOptions(characterId);if(characterAnimationId)await loadCharacterAnimation(characterAnimationId);else{const source=library.clips[skin.default_clip]?skin.default_clip:Object.keys(library.clips)[0]||'';skeletonId=source;loadClip(library.clips[source],{source,message:'Načtená kosterní animace',animationClean:false});}status('Odkaz byl z postavy odebrán. Animace zůstává ve společné knihovně.');
    }catch(e){saveError(e);}finally{saving=false;saveButtons();}
  }
  $('save').onclick=()=>saveCharacterAnimation(false);$('updateAnimation').onclick=()=>saveCharacterAnimation(true);$('assignAnimation').onclick=()=>saveCharacterAnimation(false,true);$('deleteAnimation').onclick=deleteCharacterAnimation;
  $('importDraft').onchange=async()=>{
    const file=$('importDraft').files?.[0];if(!file)return;
    try{
      const d=JSON.parse(await file.text()),c=d.clip,s=d.skin;
      if(!skinCatalog.skins[s?.id]||!c||!Array.isArray(c.frames)||c.frames.length<2||c.frames.length>32||!Number.isInteger(c.fps)||c.fps<1||c.fps>30)throw Error('Neplatná záloha postavy.');
      for(const frame of c.frames)for(const [key,,lo,hi] of R.fields){const v=frame[key]??R.neutral()[key];if(!Number.isFinite(v)||v<lo||v>hi)throw Error('Neplatné klouby v záloze.');}
      for(const [key,v] of Object.entries(c.rig_lengths||{}))if(!(key in R.defaultLengths())||!Number.isFinite(v)||v<5||v>250)throw Error('Neplatné délky v záloze.');
      const allowedLimits=R.defaultJointLimits();for(const [key,pair] of Object.entries(c.joint_limits||{}))if(!(key in allowedLimits)||!Array.isArray(pair)||pair.length!==2||pair.some(v=>!Number.isFinite(v)||v<-180||v>180)||pair[0]>pair[1])throw Error('Neplatné limity kloubů v záloze.');
      c.joint_limits=R.jointLimitsFor(c);
      const base=await getJSON(new URL('../graphics/bitmapove-predlohy/'+skinCatalog.skins[s.id].path,location.href));
      const keys=base.layers.filter(k=>k!=='shoulders'),layers=s.layers.filter(k=>k!=='shoulders');
      if(layers.length!==keys.length||new Set(layers).size!==keys.length||layers.some(k=>!keys.includes(k)))throw Error('Neplatné pořadí dílů.');
      base.layers=layers;
      for(const k of keys){
        const part=s.parts[k]||{},o=part.offset||[0,0],rotation=part.rotation??0,scales=Object.fromEntries(['scale','scale_x','scale_y'].map(axis=>[axis,part[axis]??1]));
        if(!Array.isArray(o)||o.length!==2||o.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)||!Number.isFinite(rotation)||Math.abs(rotation)>180||Object.values(scales).some(v=>!Number.isFinite(v)||v<.1||v>10))throw Error('Neplatná úprava bitmapy.');
        Object.assign(base.parts[k],{offset:o,rotation,...scales});
        if(part.pivot_offset!==undefined){
          if(!Array.isArray(part.pivot_offset)||part.pivot_offset.length!==2||part.pivot_offset.some(v=>!Number.isFinite(v)||Math.abs(v)>2000))throw Error('Neplatný rotační střed.');
          base.parts[k].pivot_offset=copy(part.pivot_offset);
        }
        if(part.joint_fade!==undefined)base.parts[k].joint_fade=copy(C.validateFade(part.joint_fade));
      }
      E.validateEdits(c,base);
      if(dirty&&!confirm('Nahradit rozpracované změny zálohou?'))return;
      stop();await loadSkin(s.id,base);characterId='';gameOptions();
      spread=R.clamp(Number(d.motion?.variation_percent)||0,0,90);delta=0;$('spread').value=spread;$('rateDelta').min=-spread;$('rateDelta').max=spread;$('rateDelta').value=0;
      loadClip({...copy(c),id:'character:import',source_clip_id:c.id},{message:'Načtená rozpracovaná záloha'});skinDirty=true;mark('bitmap');status('Záloha načtena. Ulož ji jako postavu nebo hotovou animaci; původní soubory se nezměnily.');
    }catch(e){status(e.message,true);}finally{$('importDraft').value='';}
  };
  $('exportFrame').onclick=()=>{const c=document.createElement('canvas');c.width=pixelMode()?pixelFrame.width:512;c.height=pixelMode()?pixelFrame.height:560;const x=c.getContext('2d');x.scale(c.width/512,c.height/560);x.imageSmoothingEnabled=true;x.imageSmoothingQuality='low';drawRig(x,skin,activeImages(),C.sample(clip,phase,$('smooth').checked));exportCanvas(c,pixelMode()?'postava-game-192.png':'postava-detail.png');};
  $('exportSheet').onclick=()=>{const c=document.createElement('canvas'),w=pixelMode()?pixelFrame.width:512,h=pixelMode()?pixelFrame.height:560;c.width=4*w;c.height=Math.ceil(clip.frames.length/4)*h;const x=c.getContext('2d');x.imageSmoothingEnabled=true;x.imageSmoothingQuality='low';clip.frames.forEach((p,i)=>{x.save();x.translate(i%4*w,Math.floor(i/4)*h);x.scale(w/512,h/560);drawRig(x,skin,activeImages(),C.sample(clip,i,false));x.restore();});exportCanvas(c,pixelMode()?'postava-game-192-sheet.png':'postava-detail-sheet.png');};
  $('exportRig').onclick=()=>download(new Blob([JSON.stringify({schema_version:1,skin,asset_base:'graphics/bitmapove-predlohy/'+skinCatalog.skins[$('skinSelect').value].path.replace(/[^/]+$/,''),clip:{...copy(clip),rig_lengths:R.lengthsFor(clip),move_speed_pt_s:M.speed(clip)},motion:{variation_percent:spread,coupled_cadence:true,sample_once_per_actor:true},rig_units_per_game_point:M.UNITS_PER_POINT,interpolation:'shortest-angle',frames_include_endpoint_duplicate:false},null,2)],{type:'application/json'}),'postava-cutout.json');
  window.addEventListener('beforeunload',e=>{if(dirty){e.preventDefault();e.returnValue='';}});
  window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='preview-visibility'){visible=Boolean(e.data.visible);last=0;}});
  function tick(now){const dt=last?Math.min(.1,(now-last)/1000):0;last=now;if(visible&&!document.hidden&&playing){const rates=M.rates(clip,delta);phase=(phase+dt*rates.fps)%clip.frames.length;if($('travel').checked)distance=(distance+rates.speed*dt)%48;draw();}requestAnimationFrame(tick);}requestAnimationFrame(tick);
})();
