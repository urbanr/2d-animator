const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const R=require('./pose-rig.js'),C=require('./cutout-rig.js'),copy=v=>JSON.parse(JSON.stringify(v));
const skin=JSON.parse(fs.readFileSync(__dirname+'/../graphics/characters2/bezec-zombie-v1/skin.json'));
const gameManifest=JSON.parse(fs.readFileSync(__dirname+'/../graphics/characters2/bezec-zombie-v1/game-192/manifest.json'));
const exportedSizes=[];
const zombie=copy({...R.zombieClips()[0],id:skin.default_clip});
const store={clips:{[zombie.id]:copy(zombie),walk:{id:'walk',...R.referenceGaitClips()[0]}}};
const gameStore={characters:{}};
const translations=[];
const smoothingWrites=[];
const paint=new Proxy({},{get:(target,key)=>key==='translate'?(x,y)=>translations.push([x,y]):key==='getImageData'?(x,y,width,height)=>({width,height,data:new Uint8ClampedArray(width*height*4).fill(255)}):()=>{}});
function element(){return {children:[],style:{},value:'',textContent:'',disabled:false,checked:false,classList:{toggle(){}},
 append(...a){this.children.push(...a);},replaceChildren(){this.children=[];},setAttribute(k,v){this[k]=v;},
 getContext(){const owner=this;return new Proxy(paint,{set:(target,key,value)=>{if(key==='imageSmoothingEnabled'||key==='imageSmoothingQuality'){owner[key]=value;smoothingWrites.push([key,value]);}if(key==='fillStyle')owner.fillColor=value;return true;},get:(target,key)=>key==='transform'?(...matrix)=>{owner.matrices??=[];owner.matrices.push(matrix);}:key==='clearRect'?()=>{owner.fills=[];}:key==='arc'?(...arc)=>{owner.lastArc=arc;}:key==='fill'?()=>{owner.fills??=[];owner.fills.push({color:owner.fillColor,arc:owner.lastArc});}:target[key]});},getBoundingClientRect:()=>({left:0,top:0,width:512,height:560}),
 setPointerCapture(id){this.capture=id;},hasPointerCapture(id){return this.capture===id;},releasePointerCapture(){this.capture=null;},
 toBlob(fn){exportedSizes.push([this.width,this.height]);fn(new Blob(['png']));},click(){}};}
const ids=['stage','mini','status','frameLabel','frames','lean','smooth','edit','resizeBones','bones','side','clip','name','fps','moveSpeed','travel','bodyY','zoomIn','zoomOut','zoomReset','zoomLabel','skinSelect','gameCharacter','characterName','saveCharacter','undo','play','previous','next','reload','up','down','save','exportFrame','exportSheet','exportRig','parts'];
ids.push('layerOrder','layerBack','layerFront','anchorReset','spread','rateDelta','randomRate','rateInfo');
ids.push('updateCharacter','updateAnimation','animationName','importDraft','renderMode');
ids.push('editScope','editTarget','editTool','editTools','scopeNote','redo','resetFrame','stageWrap','toolGrip','toolBody','toolCollapse','gestureHint');
ids.push('targetSkeleton','targetBitmap','toolMove','toolRotate','toolSize');
ids.push('partsTools','partsGrip','partsBody','partsCollapse','fadeRadius2','skeletonSelect','saveSkeleton','updateSkeleton','deleteSkeleton');
ids.push('fadeStrength','fadeRadius','fadeDirection','fadeEnd','fadeClear','fadePreset','fadePart','fadeValue');
ids.push('fadeX','fadeY','fadeAngle','deleteCharacter','deleteAnimation','trash','restoreDeleted');
const elements=Object.fromEntries(ids.map(id=>[id,element()]));elements.smooth.checked=true;elements.side.value='near';
elements.toolBody.hidden=true;elements.partsBody.hidden=true;
elements.editScope.value='frame';elements.editTarget.value='skeleton';elements.editTool.value='rotate';
elements.edit.checked=true;elements.resizeBones.checked=true;
let confirmed=true,fail=false,seq=0,raf,downloads=0;
const promptAnswers=[],confirmAnswers=[],characterPosts=[],questions=[];
const events={};
class Image{async decode(){const p=[...Object.values(skin.parts),...Object.values(gameManifest.parts)].find(p=>this.src.endsWith(p.file));[this.naturalWidth,this.naturalHeight]=p.size;}cloneNode(){return new Image();}}
const url=URL;url.createObjectURL=()=>{downloads++;return 'blob:test';};url.revokeObjectURL=()=>{};
const context=vm.createContext({URL:url,Blob,Image,setTimeout:()=>{},confirm:q=>{questions.push(q);return confirmAnswers.length?confirmAnswers.shift():confirmed;},prompt:(q,value)=>{questions.push(q);return promptAnswers.length?promptAnswers.shift():q.includes('postavy')?(elements.characterName.value||value):(elements.name.value||value);},
 location:new URL('http://127.0.0.1:8765/tool/characters2.html'),parent:{},
 requestAnimationFrame:fn=>{raf=fn;},
 window:{PoseRig:R,CutoutRig:C,CutoutEditor:require('./cutout-editor.js'),EditorView:require('./editor-view.js'),MotionPreview:require('./motion-preview.js'),addEventListener:(type,fn)=>events[type]=fn},
 document:{getElementById:id=>elements[id],createElement:element},
 fetch:async(url,options)=>{
  if(!options||!options.method)return {ok:true,json:async()=>copy(String(url).endsWith('manifest.json')?gameManifest:String(url).endsWith('skins.json')?{skins:{'bezec-zombie-v1':{name:'Zombie',path:'bezec-zombie-v1/skin.json'}}}:String(url).endsWith('game-characters.json')?gameStore:String(url).endsWith('skin.json')?skin:store)};
  const p=JSON.parse(options.body);
  if(['delete','restore'].includes(p.mode)){
    if(fail)return {ok:false,json:async()=>({ok:false,error:'Trash failed'})};
    const catalog=url==='/api/poses'?store:gameStore;catalog.trash??={};
    if(p.mode==='delete'){
      assert.deepEqual(p.expectedRecord,catalog[p.collection][p.id]);
      catalog.trash['trash-'+p.id]={collection:p.collection,record:copy(p.expectedRecord)};delete catalog[p.collection][p.id];
      return {ok:true,json:async()=>({ok:true,id:p.id,trash:copy(catalog.trash)})};
    }
    const entry=catalog.trash[p.id];assert.deepEqual(p.expectedRecord,entry.record);catalog[p.collection][entry.record.id]=copy(entry.record);delete catalog.trash[p.id];
    return {ok:true,json:async()=>({ok:true,id:entry.record.id,record:entry.record,trash:copy(catalog.trash)})};
  }
  if(url==='/api/game-characters'){
    characterPosts.push(copy(p));
    assert.equal(p.skin_id,'bezec-zombie-v1');
    const savedSkin=copy(skin);savedSkin.layers=p.layers;for(const [k,v] of Object.entries(p.part_offsets))savedSkin.parts[k].offset=v;
    for(const [k,v] of Object.entries(p.part_transforms||{}))Object.assign(savedSkin.parts[k],v);
    if(p.mode==='update')assert.deepEqual(p.expectedRecord,gameStore.characters[p.id]);
    const record={...p,id:p.mode==='update'?p.id:'game-1',skin:savedSkin,animation:{...p.animation,source_clip_id:p.animation.id}};delete record.expectedRecord;gameStore.characters[record.id]=copy(record);
    return {ok:true,json:async()=>({ok:true,record})};
  }
  assert.equal(url,'/api/poses');
  if(p.kind==='rig'){store.rigs??={};if(p.mode==='update')assert.deepEqual(p.expectedRecord,store.rigs[p.id]);const record={id:p.id||'rig-test',name:p.name,rig_lengths:p.rig_lengths};store.rigs[record.id]=copy(record);return {ok:true,json:async()=>({ok:true,record})};}
  assert.equal(p.kind,'clip');
  if(p.mode==='update')assert.deepEqual(p.expectedRecord,store.clips[p.id]);else assert.ok(!p.id);
  if(fail)return {ok:false,json:async()=>({ok:false,error:'Save failed'})};
  const record={...p,id:p.mode==='update'?p.id:'saved-'+(++seq)};delete record.kind;delete record.expectedRecord;store.clips[record.id]=record;
  return {ok:true,json:async()=>({ok:true,record})};
 }});
(async()=>{
 await vm.runInContext(fs.readFileSync(__dirname+'/characters2.js','utf8'),context);
 assert.equal(elements.parts.children.length,13);assert.equal(elements.frames.children.length,8);assert.equal(elements.play.disabled,false);
 assert.equal(elements.editScope['aria-checked'],'false');
 elements.editScope.onclick();assert.equal(elements.editScope.value,'all');assert.equal(elements.editScope['aria-checked'],'true');
 elements.editScope.onclick();assert.equal(elements.editScope.value,'frame');
 elements.editTarget.onclick();assert.equal(elements.editTarget.value,'bitmap');assert.equal(elements.editTarget['aria-checked'],'true');
 elements.toolMove.onclick();assert.equal(elements.editTool.value,'move');assert.equal(elements.toolMove['aria-pressed'],'true');
 elements.toolSize.onclick();assert.equal(elements.editTool.value,'size');assert.equal(elements.toolMove['aria-pressed'],'false');
 elements.editTarget.onclick();elements.toolRotate.onclick();
 elements.previous.onclick();assert.match(elements.frameLabel.textContent,/8 \/ 8/);
 elements.next.onclick();assert.match(elements.frameLabel.textContent,/1 \/ 8/);
 elements.edit.checked=true;elements.edit.onchange();
 const h=R.handles(zombie.frames[0]).find(h=>h.key==='bodyY'),e={button:0,pointerId:7,clientX:512-h.point.x,clientY:h.point.y,preventDefault(){}};
 elements.stage.onpointerdown(e);elements.stage.onpointermove({...e,clientY:e.clientY+20});elements.stage.onpointerup(e);
 assert.equal(elements.stage.capture,null);elements.name.value='New zombie';await elements.save.onclick();
 assert.ok(Math.abs(store.clips['saved-1'].frames[0].bodyY-zombie.frames[0].bodyY-20)<1e-8);
 assert.deepEqual(store.clips[zombie.id],zombie);
 elements.up.onclick({shiftKey:true});elements.undo.onclick();elements.name.value='Undo proof';await elements.save.onclick();
 assert.equal(store.clips['saved-2'].frames[0].bodyY,store.clips['saved-1'].frames[0].bodyY);
 elements.lean.value='35';elements.lean.onchange();elements.fps.value='12';elements.fps.onchange();
 fail=true;await elements.save.onclick();assert.match(elements.status.textContent,/Save failed/);assert.equal(elements.save.disabled,false);
 confirmed=false;elements.clip.value='walk';elements.clip.onchange();assert.equal(elements.clip.value,'saved-2');
 fail=false;elements.name.value='Third';await elements.save.onclick();assert.equal(store.clips['saved-3'].frames[0].bodyLean,35);assert.equal(store.clips['saved-3'].fps,12);
 elements.exportFrame.onclick();elements.exportSheet.onclick();elements.exportRig.onclick();assert.equal(downloads,3);
 elements.moveSpeed.value='10';elements.moveSpeed.onchange();elements.bodyY.value='-20';elements.bodyY.onchange();
 elements.name.value='Speed and floor';await elements.save.onclick();
 assert.equal(store.clips['saved-4'].move_speed_pt_s,10);assert.equal(store.clips['saved-4'].frames[0].bodyY,-20);
 assert.equal(store.clips['saved-4'].frames[1].bodyY,zombie.frames[1].bodyY);
 elements.travel.checked=true;elements.travel.onchange();elements.play.onclick();raf(100);raf(200);
 assert.ok(translations.some(p=>p[0]===-16&&p[1]===0));
 elements.travel.checked=false;elements.travel.onchange();translations.length=0;raf(300);
 assert.ok(translations.every(p=>p[0]===0&&p[1]===0||Math.abs(p[0])===256&&Math.abs(p[1])===280));
 elements.play.onclick();assert.deepEqual(store.clips[zombie.id],zombie);
 elements.zoomIn.onclick();assert.equal(elements.zoomLabel.textContent,'120 %');
 elements.stage.onwheel({deltaY:-300,preventDefault(){}});assert.notEqual(elements.zoomLabel.textContent,'120 %');
 elements.zoomReset.onclick();assert.equal(elements.zoomLabel.textContent,'100 %');
 elements.frames.children[0].onclick();elements.edit.checked=true;elements.edit.onchange();elements.lean.value='30';elements.lean.onchange();
 elements.characterName.value='Zombie custom';await elements.saveCharacter.onclick();
 const savedGame=gameStore.characters['game-1'];
 assert.equal(savedGame.name,'Zombie custom');assert.equal(savedGame.animation.frames[0].bodyLean,30);
 assert.equal(savedGame.animation.move_speed_pt_s,10);assert.equal(savedGame.animation.rig_lengths.nearShin,74);
 assert.equal(elements.gameCharacter.value,'game-1');assert.deepEqual(store.clips[zombie.id],zombie);
 elements.lean.value='10';elements.lean.onchange();confirmed=true;
 await elements.gameCharacter.onchange();assert.equal(Number(elements.lean.value),30);
 assert.equal(elements.clip.value,'character:game-1');
 assert.equal(store.clips['character:game-1'],undefined);
 // Playback must never silently change the editor checkbox.
 elements.play.onclick();assert.equal(elements.edit.checked,true);elements.play.onclick();assert.equal(elements.edit.checked,true);
 // A radial ordinary drag must not resize, Ctrl must resize, and the lock must prevent it.
 const base=copy(savedGame.animation),root=R.handles(base.frames[0],base.rig_lengths).find(h=>h.key==='nearHip');
 function stretch(ctrlKey){
   const e={button:0,pointerId:11,ctrlKey,clientX:512-root.point.x,clientY:root.point.y,preventDefault(){}};
   const length=base.rig_lengths.nearThigh;
   const end={x:root.pivot.x+(root.point.x-root.pivot.x)*(length+20)/length,y:root.pivot.y+(root.point.y-root.pivot.y)*(length+20)/length};
   elements.stage.onpointerdown(e);elements.stage.onpointermove({...e,clientX:512-end.x,clientY:end.y});elements.stage.onpointerup(e);
 }
 stretch(false);elements.name.value='Rotation only';await elements.save.onclick();
 assert.equal(store.clips['saved-5'].rig_lengths.nearThigh,70);
 elements.editScope.value='all';elements.editScope.onchange();
 stretch(true);elements.name.value='Ctrl length';await elements.save.onclick();
 assert.equal(store.clips['saved-6'].rig_lengths.nearThigh,90);
 assert.deepEqual(store.clips['saved-6'].frames.slice(1),base.frames.slice(1));
 confirmed=true;elements.gameCharacter.value='game-1';await elements.gameCharacter.onchange();
 elements.resizeBones.checked=false;stretch(true);elements.name.value='Locked length';await elements.save.onclick();
 assert.equal(store.clips['saved-7'].rig_lengths.nearThigh,70);
 {const before=copy(store.clips['saved-7']);
 const e={button:0,pointerId:19,clientX:20,clientY:450,preventDefault(){}};
 elements.stage.onpointerdown(e);elements.stage.onpointermove({...e,clientX:70});elements.stage.onpointerup(e);
 assert.equal(elements.stage.style.cursor,'grab');elements.zoomReset.onclick();
 events.keydown({altKey:true});assert.equal(elements.stage.style.cursor,'move');
 events.keydown({ctrlKey:true});assert.equal(elements.stage.style.cursor,'ew-resize');
 // List selection must not override the visible bitmap under the pointer.
 elements.stage.onpointerdown({...e,altKey:true,clientX:0,clientY:0});assert.equal(elements.stage.capture,null);
 const m=C.matrix(skin.parts.nearForearm,C.bones(before.frames[0],before.rig_lengths).nearForearm);
 const grab={...e,altKey:true,clientX:m[0]*80+m[2]*130+m[4],clientY:m[1]*80+m[3]*130+m[5]};
 elements.layerOrder.value='head';elements.stage.onpointerdown(grab);
 assert.equal(elements.layerOrder.value,'nearForearm');
 elements.stage.onpointermove({...grab,clientY:grab.clientY+20});elements.stage.onpointerup(grab);
 elements.layerBack.onclick();elements.spread.value='25';elements.spread.onchange();
 elements.characterName.value='Offset and layers';await elements.saveCharacter.onclick();
 const changed=gameStore.characters['game-1'];
 assert.ok(changed.skin.parts.nearForearm.offset.some(v=>v!==0));
 assert.equal(changed.skin.layers.at(-2),'nearForearm');assert.equal(changed.motion.variation_percent,25);
 assert.deepEqual(changed.animation.frames,before.frames);
 confirmed=true;await elements.gameCharacter.onchange();assert.equal(Number(elements.spread.value),25);
 // Touch pinch changes only the view and leaves character data alone.
 elements.stage.onpointerdown({...e,pointerType:'touch',pointerId:21,clientX:100,clientY:100});
 elements.stage.onpointerdown({...e,pointerType:'touch',pointerId:22,clientX:200,clientY:100});
 elements.stage.onpointermove({...e,pointerType:'touch',pointerId:22,clientX:300,clientY:100});
 assert.equal(elements.zoomLabel.textContent,'200 %');
 elements.stage.onpointerup({...e,pointerId:22});elements.stage.onpointerup({...e,pointerId:21});elements.zoomReset.onclick();}
 const charCount=Object.keys(gameStore.characters).length,clipCount=Object.keys(store.clips).length;
 elements.up.onclick({shiftKey:false});await elements.updateCharacter.onclick();
 assert.equal(Object.keys(gameStore.characters).length,charCount);
 await elements.updateAnimation.onclick();assert.equal(Object.keys(store.clips).length,clipCount);
 elements.side.value='';elements.side.onchange();
 elements.importDraft.files=[{text:async()=>JSON.stringify({skin:gameStore.characters['game-1'].skin,clip:store.clips['saved-7'],motion:{variation_percent:17}})}];
 await elements.importDraft.onchange();assert.match(elements.status.textContent,/Záloha načtena/);assert.equal(Number(elements.spread.value),17);
 const unchanged=JSON.stringify(store);
 smoothingWrites.length=0;
 elements.renderMode.value='game';elements.renderMode.onchange();
 assert.equal(elements.stage.style.imageRendering,'auto');
 assert.equal(elements.stage.imageSmoothingEnabled,true);assert.equal(elements.mini.imageSmoothingEnabled,true);
 assert.ok(smoothingWrites.some(([key,value])=>key==='imageSmoothingQuality'&&value==='low'));
 assert.equal(elements.mini.width,192);assert.equal(elements.mini.height,210);
 elements.exportFrame.onclick();elements.exportSheet.onclick();
 assert.ok(!smoothingWrites.some(([key,value])=>key==='imageSmoothingEnabled'&&value===false),'Game previews and exports never disable filtering');
 assert.deepEqual(exportedSizes.slice(-2),[[192,210],[768,420]]);
 elements.renderMode.value='detail';elements.renderMode.onchange();elements.exportFrame.onclick();
 assert.deepEqual(exportedSizes.at(-1),[512,560]);assert.equal(JSON.stringify(store),unchanged);
 { // Default frame scope, one transaction per gesture, redo restores frame and selection.
 elements.editScope.value='frame';elements.editTarget.value='skeleton';elements.editTool.value='rotate';elements.resizeBones.checked=true;
 elements.frames.children[0].onclick();const height=Number(elements.bodyY.value);
 elements.down.onclick({shiftKey:false});assert.equal(Number(elements.bodyY.value),height+1);
 assert.equal(elements.resetFrame.disabled,false);assert.match(elements.frames.children[0].children[1].textContent,/●/);
 elements.frames.children[2].onclick();elements.undo.onclick();assert.match(elements.frameLabel.textContent,/1 \/ 8/);assert.equal(Number(elements.bodyY.value),height);
 events.keydown({metaKey:true,shiftKey:true,key:'z',preventDefault(){}});assert.equal(Number(elements.bodyY.value),height+1);
 elements.undo.onclick();elements.down.onclick({shiftKey:true});assert.equal(elements.redo.disabled,true);
 elements.resetFrame.onclick();assert.equal(elements.resetFrame.disabled,true);elements.undo.onclick();assert.equal(elements.resetFrame.disabled,false);
 const baseHeight=Number(elements.bodyY.value);elements.down.onclick({shiftKey:false});
 events.keydown({ctrlKey:true,key:'z',target:{tagName:'INPUT'},preventDefault(){throw Error('Text undo stolen');}});assert.equal(Number(elements.bodyY.value),baseHeight+1);
 events.keydown({ctrlKey:true,key:'z',target:{tagName:'CANVAS'},preventDefault(){}});assert.equal(Number(elements.bodyY.value),baseHeight);
 elements.toolCollapse.onclick();assert.equal(elements.toolBody.hidden,false);assert.equal(elements.toolCollapse['aria-expanded'],'true');elements.toolCollapse.onclick();assert.equal(elements.toolBody.hidden,true);assert.equal(elements.toolCollapse['aria-expanded'],'false');
 // Local bitmap rotate/scale must persist without touching shared skin or skeleton.
 await elements.saveCharacter.onclick();const transaction=copy(gameStore.characters['game-1']);
 elements.editTarget.value='bitmap';elements.editTool.value='rotate';elements.layerOrder.value='nearForearm';
 const frame=C.sample(transaction.animation,0,false),h=require('./cutout-editor.js').partHandles(transaction.skin,'nearForearm',frame);
 const gesture={button:0,pointerId:80,clientX:h.rotate.x,clientY:h.rotate.y,preventDefault(){}};
 elements.stage.onpointerdown(gesture);
 for(const turn of [.15,.3,.45]){const dx=h.rotate.x-h.pivot.x,dy=h.rotate.y-h.pivot.y;elements.stage.onpointermove({...gesture,clientX:h.pivot.x+dx*Math.cos(turn)-dy*Math.sin(turn),clientY:h.pivot.y+dx*Math.sin(turn)+dy*Math.cos(turn)});}
 elements.stage.onpointerup(gesture);await elements.updateCharacter.onclick();
 const rotated=copy(gameStore.characters['game-1']);assert.ok(Math.abs(rotated.animation.frame_edits[0].parts.nearForearm.rotation)>20);
 assert.deepEqual(rotated.skin,transaction.skin);assert.deepEqual(rotated.animation.frames,transaction.animation.frames);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['game-1'].animation,transaction.animation);
 elements.redo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['game-1'].animation,rotated.animation);
 // Bitmap modifiers independently edit height / width, with the same scope and undo.
 function resizeAxis(modifier,dx,dy){
   const record=gameStore.characters['game-1'],pose=C.sample(record.animation,0,false),h=require('./cutout-editor.js').partHandles(record.skin,'nearForearm',pose);
   const e={button:0,pointerId:81,clientX:h.pivot.x,clientY:h.pivot.y,...modifier,preventDefault(){}};
   const oldFrames=[...elements.frames.children];
   elements.stage.onpointerdown(e);elements.stage.onpointermove({...e,clientX:e.clientX+dx,clientY:e.clientY+dy});
   for(let i=0;i<8;i++)assert.notEqual(elements.frames.children[i],oldFrames[i],'Each thumbnail refreshed before pointer-up');
   elements.stage.onpointerup(e);
 }
 resizeAxis({ctrlKey:true},0,40);await elements.updateCharacter.onclick();
 const taller=copy(gameStore.characters['game-1']);
 assert.ok(taller.animation.frame_edits[0].parts.nearForearm.scale_y>1.4);
 assert.equal(taller.animation.frame_edits[0].parts.nearForearm.scale_x,undefined);
 assert.deepEqual(taller.animation.frames,rotated.animation.frames);assert.deepEqual(taller.skin,rotated.skin);
 events.keydown({ctrlKey:true});assert.equal(elements.stage.style.cursor,'ns-resize');assert.match(elements.gestureHint.textContent,/výška/);
 events.keydown({altKey:true});assert.equal(elements.stage.style.cursor,'ew-resize');assert.match(elements.gestureHint.textContent,/šířka/);
 elements.editScope.value='all';resizeAxis({altKey:true},30,0);await elements.updateCharacter.onclick();
 const wider=copy(gameStore.characters['game-1']);assert.ok(wider.skin.parts.nearForearm.scale_x>1.3);
 assert.match(elements.scopeNote.textContent,/Dřívější výjimky tohoto dílu/);
 assert.equal(wider.skin.parts.nearForearm.scale_y,taller.skin.parts.nearForearm.scale_y);
 assert.deepEqual(wider.animation,taller.animation);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['game-1'].skin,taller.skin);
 elements.redo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['game-1'].skin,wider.skin);
 await elements.gameCharacter.onchange();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['game-1'].skin,wider.skin);
 // Global translation is bone-local in every pose and immediately rendered in ALL thumbnails.
 elements.editTarget.value='bitmap';elements.editTarget.onchange();elements.toolMove.onclick();
 if(elements.editScope.value!=='all')elements.editScope.onclick();
 const beforeMove=copy(gameStore.characters['game-1']),pose=C.sample(beforeMove.animation,0,false),hMove=require('./cutout-editor.js').partHandles(beforeMove.skin,'nearForearm',pose);
 const eMove={button:0,pointerId:89,clientX:hMove.pivot.x,clientY:hMove.pivot.y,preventDefault(){}};
 elements.stage.onpointerdown(eMove);elements.stage.onpointermove({...eMove,clientX:eMove.clientX+12,clientY:eMove.clientY+18});elements.stage.onpointerup(eMove);
 await elements.updateCharacter.onclick();
 const moved=copy(gameStore.characters['game-1']);assert.deepEqual(moved.animation,beforeMove.animation);
 const changedKey='nearForearm',partIndex=moved.skin.layers.indexOf(changedKey);
 for(let i=0;i<8;i++){
   const p=C.sample(moved.animation,i,false),currentPart=C.partFor(moved.skin,changedKey,p),previousPart=C.partFor(beforeMove.skin,changedKey,p);
   const matrix=C.matrix(currentPart,C.bones(p)[changedKey]),previousMatrix=C.matrix(previousPart,C.bones(p)[changedKey]);
   assert.ok(Math.hypot(matrix[4]-previousMatrix[4],matrix[5]-previousMatrix[5])>1,'Translation applied in every frame');
   assert.deepEqual(elements.frames.children[i].children[0].matrices[partIndex],matrix,'Thumbnail uses current shared transform');
 }
 }
 gameStore.characters['game-other']={...copy(gameStore.characters['game-1']),id:'game-other',name:'Jiná postava'};
 const originalGame=copy(gameStore.characters['game-1']);
 promptAnswers.push('  JINÁ   POSTAVA  ');confirmAnswers.push(true);await elements.saveCharacter.onclick();
 assert.equal(characterPosts.at(-1).mode,'update');assert.equal(characterPosts.at(-1).id,'game-other');
 assert.deepEqual(gameStore.characters['game-1'],originalGame);assert.equal(elements.gameCharacter.value,'game-other');
 const count=characterPosts.length,unchangedGames=JSON.stringify(gameStore);
 elements.up.onclick({shiftKey:false});const draftHeight=Number(elements.bodyY.value);
 promptAnswers.push('Jiná postava',null);confirmAnswers.push(false);await elements.saveCharacter.onclick();
 assert.equal(characterPosts.length,count);assert.equal(JSON.stringify(gameStore),unchangedGames);assert.equal(Number(elements.bodyY.value),draftHeight);
 assert.equal(elements.saveCharacter.disabled,false);assert.match(elements.status.textContent,/zrušeno/);
 promptAnswers.push('Jiná postava','Nová po návratu');confirmAnswers.push(false);await elements.saveCharacter.onclick();
 assert.equal(characterPosts.at(-1).name,'Nová po návratu');assert.equal(characterPosts.at(-1).mode,undefined);
 assert.ok(questions.some(q=>q.includes('už existuje')));
 for(const id of ['legacy-a','legacy-b'])gameStore.characters[id]={...copy(gameStore.characters['game-1']),id,name:'Starší duplicita'};
 const untouched=copy(gameStore.characters['legacy-a']);
 promptAnswers.push('Starší duplicita','2');confirmAnswers.push(true);await elements.saveCharacter.onclick();
 assert.equal(characterPosts.at(-1).id,'legacy-b');assert.deepEqual(gameStore.characters['legacy-a'],untouched);
 // Joint transparency is reversible, scoped, persisted and used by both exports.
 elements.zoomReset.onclick();elements.frames.children[0].onclick();elements.renderMode.value='detail';elements.renderMode.onchange();
 elements.layerOrder.value='nearForearm';elements.layerOrder.onchange();elements.editScope.value='all';
 await elements.updateCharacter.onclick();
 const faded=copy(gameStore.characters['legacy-b']),fadedPart=faded.skin.parts.nearForearm;
 for(const key of faded.skin.layers)for(const end of ['start','end'])assert.equal(faded.skin.parts[key].joint_fade[end].strength,.65);
 const fp=C.sample(faded.animation,0,false),fpart=C.partFor(faded.skin,'nearForearm',fp),fm=C.matrix(fpart,C.bones(fp).nearForearm);
 const local=fpart.start.map((v,i)=>(v+fpart.end[i])/2);
 const right={button:2,pointerId:99,clientX:fm[0]*local[0]+fm[2]*local[1]+fm[4],clientY:fm[1]*local[0]+fm[3]*local[1]+fm[5],preventDefault(){}};
 elements.stage.onpointerdown(right);elements.stage.onpointermove({...right,clientY:right.clientY+30});elements.stage.onpointerup(right);
 await elements.updateCharacter.onclick();
 assert.ok(Math.abs(gameStore.characters['legacy-b'].skin.parts.nearForearm.joint_fade.start.strength-.85)<1e-8);
 assert.deepEqual(gameStore.characters['legacy-b'].animation.frames,faded.animation.frames);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'].skin,faded.skin);
 elements.redo.onclick();await elements.updateCharacter.onclick();
 elements.editScope.value='frame';elements.fadeEnd.value='end';elements.fadeEnd.onchange();
 elements.fadeStrength.value='25';elements.fadeStrength.onchange();await elements.updateCharacter.onclick();
 assert.equal(gameStore.characters['legacy-b'].animation.frame_edits[0].parts.nearForearm.joint_fade.end.strength,.25);
 assert.equal(gameStore.characters['legacy-b'].skin.parts.nearForearm.joint_fade.end.strength,.65);
 elements.exportFrame.onclick();elements.exportSheet.onclick();
 elements.renderMode.value='game';elements.renderMode.onchange();elements.exportFrame.onclick();elements.exportSheet.onclick();
 elements.fadeStrength.value='0';elements.fadeStrength.onchange();await elements.updateCharacter.onclick();
 assert.equal(gameStore.characters['legacy-b'].animation.frame_edits[0].parts.nearForearm.joint_fade.end.strength,0);
 elements.fadeX.value='12';elements.fadeX.onchange();elements.fadeAngle.value='45';elements.fadeAngle.onchange();await elements.updateCharacter.onclick();
 assert.deepEqual(gameStore.characters['legacy-b'].animation.frame_edits[0].parts.nearForearm.joint_fade.end.offset,[12,0]);
 assert.equal(gameStore.characters['legacy-b'].animation.frame_edits[0].parts.nearForearm.joint_fade.end.angle,45);
 const toDelete=copy(gameStore.characters['legacy-b']);
 confirmed=false;await elements.deleteCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'],toDelete);
 confirmed=true;fail=true;await elements.deleteCharacter.onclick();assert.match(elements.status.textContent,/Trash failed/);assert.deepEqual(gameStore.characters['legacy-b'],toDelete);
 fail=false;await elements.deleteCharacter.onclick();assert.equal(gameStore.characters['legacy-b'],undefined);assert.equal(elements.updateCharacter.disabled,true);
 assert.equal(elements.restoreDeleted.disabled,false);await elements.restoreDeleted.onclick();assert.deepEqual(gameStore.characters['legacy-b'],toDelete);
 elements.clip.value=zombie.id;await elements.clip.onchange();const previousClip=copy(store.clips[zombie.id]);
 await elements.deleteAnimation.onclick();assert.equal(store.clips[zombie.id],undefined);assert.equal(elements.updateAnimation.disabled,true);
 await elements.restoreDeleted.onclick();assert.deepEqual(store.clips[zombie.id],previousClip);assert.deepEqual(gameStore.characters['legacy-b'],toDelete);
 elements.gameCharacter.value='legacy-b';await elements.gameCharacter.onchange();
 elements.frames.children[0].onclick();elements.layerOrder.value='nearForearm';elements.layerOrder.onchange();elements.editScope.value='all';elements.zoomReset.onclick();
 const beforePivot=copy(gameStore.characters['legacy-b']),pivotPose=C.sample(beforePivot.animation,0,false),pivotHandle=require('./cutout-editor.js').partHandles(beforePivot.skin,'nearForearm',pivotPose);
 const shiftDrag={button:0,pointerId:106,shiftKey:true,clientX:pivotHandle.pivot.x,clientY:pivotHandle.pivot.y,preventDefault(){}};
 elements.stage.onpointerdown(shiftDrag);elements.stage.onpointermove({...shiftDrag,clientX:shiftDrag.clientX+12,clientY:shiftDrag.clientY-9});elements.stage.onpointerup(shiftDrag);
 await elements.updateCharacter.onclick();const pivoted=copy(gameStore.characters['legacy-b']);
 assert.ok(pivoted.skin.parts.nearForearm.pivot_offset.some(v=>Math.abs(v)>1));
 for(let i=0;i<8;i++){
   const a=C.sample(beforePivot.animation,i,false),b=C.sample(pivoted.animation,i,false);
   const ma=C.matrix(C.partFor(beforePivot.skin,'nearForearm',a),C.bones(a).nearForearm),mb=C.matrix(C.partFor(pivoted.skin,'nearForearm',b),C.bones(b).nearForearm);
   ma.forEach((v,j)=>assert.ok(Math.abs(v-mb[j])<1e-7));
 }
 const key=(k,extra={})=>events.keydown({key:k,preventDefault(){},target:{tagName:'CANVAS'},...extra});
 key('a');assert.match(elements.frameLabel.textContent,/8 \/ 8/);key('d');assert.match(elements.frameLabel.textContent,/1 \/ 8/);
 key('a',{target:{tagName:'INPUT'}});assert.match(elements.frameLabel.textContent,/1 \/ 8/);
 key('q',{target:{tagName:'TEXTAREA'}});await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'].skin,pivoted.skin);
 key('q');key('q',{repeat:true});events.keyup({key:'q'});await elements.updateCharacter.onclick();
 assert.ok(Math.abs(gameStore.characters['legacy-b'].skin.parts.nearForearm.rotation-pivoted.skin.parts.nearForearm.rotation+2)<1e-8);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'].skin,pivoted.skin);
 key('D',{shiftKey:true});assert.match(elements.frameLabel.textContent,/1 \/ 8/);await elements.updateCharacter.onclick();
 assert.notDeepEqual(gameStore.characters['legacy-b'].skin.parts.nearForearm.offset,pivoted.skin.parts.nearForearm.offset);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'].skin,pivoted.skin);
 elements.editTarget.value='skeleton';elements.editTarget.onchange();elements.side.value='';elements.side.onchange();
 const selectPose=C.sample(gameStore.characters['legacy-b'].animation,0,false),selectGrip=R.handles(selectPose,selectPose.rig_lengths).find(h=>h.key==='nearElbow');
 const selectEvent={button:0,pointerId:109,clientX:512-selectGrip.point.x,clientY:selectGrip.point.y,preventDefault(){}};
 elements.stage.onpointerdown(selectEvent);elements.stage.onpointerup(selectEvent);
 assert.equal(elements.layerOrder.value,'nearForearm');
 function yellowEndpoints(frame){
   const pose=C.sample(gameStore.characters['legacy-b'].animation,frame,false),h=R.handles(pose,pose.rig_lengths).find(h=>h.key==='nearElbow');
   for(const p of [h.point,h.pivot])assert.ok(elements.stage.fills.some(f=>f.color==='#ffdc60'&&Math.hypot(f.arc[0]-(512-p.x),f.arc[1]-p.y)<1e-7),'Both selected bone handles have solid yellow fill');
 }
 yellowEndpoints(0);elements.next.onclick();yellowEndpoints(1);
 elements.editTarget.onclick();assert.equal(elements.editTarget.value,'bitmap');assert.equal(elements.layerOrder.value,'nearForearm');

 // Separate skeleton library persists only dimensions and supports overwrite/trash/restore.
 promptAnswers.push('Testovací kostra');await elements.saveSkeleton.onclick();
 assert.equal(store.rigs['rig-test'].name,'Testovací kostra');assert.equal(store.rigs['rig-test'].frames,undefined);
 await elements.updateSkeleton.onclick();assert.equal(Object.keys(store.rigs).length,1);
 await elements.deleteSkeleton.onclick();assert.equal(Object.keys(store.rigs).length,0);
 elements.trash.value='rigs:trash-rig-test';await elements.restoreDeleted.onclick();assert.equal(Object.keys(store.rigs).length,1);
 // On-canvas toggles change the selected endpoint only and undo restores it.
 elements.frames.children[0].onclick();elements.editTarget.value='bitmap';elements.layerOrder.value='nearForearm';elements.layerOrder.onchange();
 await elements.updateCharacter.onclick();
 const beforeToggle=copy(gameStore.characters['legacy-b']),togglePose=C.sample(beforeToggle.animation,0,false),togglePart=C.partFor(beforeToggle.skin,'nearForearm',togglePose);
 const fg=C.fadeGeometry(togglePart,'end'),tm=C.matrix(togglePart,C.bones(togglePose).nearForearm),tx=fg.center[0]-fg.ux*fg.radius*.55,ty=fg.center[1]-fg.uy*fg.radius*.55;
 const click={button:0,pointerId:155,clientX:tm[0]*tx+tm[2]*ty+tm[4],clientY:tm[1]*tx+tm[3]*ty+tm[5],preventDefault(){}};
 elements.stage.onpointerdown(click);elements.stage.onpointerup(click);await elements.updateCharacter.onclick();
 assert.notEqual(C.fadeFor(C.partFor(gameStore.characters['legacy-b'].skin,'nearForearm',C.sample(gameStore.characters['legacy-b'].animation,0,false)),'end').strength,fg.strength);
 elements.undo.onclick();await elements.updateCharacter.onclick();assert.deepEqual(gameStore.characters['legacy-b'].skin,beforeToggle.skin);
 console.log('PASS: cutout editor, persistent solid-yellow skeleton selection, pivot, keyboard, transparency, trash and exports.');
})().catch(e=>{console.error(e);process.exitCode=1;});
