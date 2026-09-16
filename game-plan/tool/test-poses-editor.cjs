const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
const rig=require('./pose-rig.js');
const clone=value=>JSON.parse(JSON.stringify(value));
function element() {return {children:[],value:'',textContent:'',innerHTML:'',disabled:false,style:{},
  classList:{toggle(){}},append(...items){this.children.push(...items);},replaceChildren(){this.children=[];},setAttribute(key,value){this[key]=value;}};}
const ids=['status','dirty','stage','frameLabel','frames','undo','controls','clip','clipName','fps','moveSpeed','travel','zoomOut','zoomIn','zoomReset','zoomLabel','library','search','play','previous','next','up','down','swapLeft','swapRight','restore','savePose','saveClip','updateClip','poseName','exportFrame','exportSheet'];
const elements=Object.fromEntries(ids.map(id=>[id,element()]));
const stored=rig.presets();let failure=false,sequence=0,confirmed=true;
let raf;
const context=vm.createContext({window:{PoseRig:rig,EditorView:require('./editor-view.js'),MotionPreview:require('./motion-preview.js'),addEventListener(){}},document:{getElementById:id=>elements[id],createElement:element},requestAnimationFrame:fn=>{raf=fn;},
  setInterval,clearInterval,setTimeout,confirm:()=>confirmed,
  fetch:async(url,options)=>{
    if(!options)return {ok:true,json:async()=>clone(stored)};
    if(failure)return {ok:false,json:async()=>({ok:false,error:'Test failure'})};
    assert.equal(url,'/api/poses');const payload=JSON.parse(options.body);
    const collection=payload.kind==='pose'?'poses':'clips';const id=payload.mode==='update'?payload.id:'saved-'+(++sequence);
    if(payload.mode==='update')assert.deepEqual(payload.expectedRecord,stored.clips[id]);
    const record=payload.kind==='pose'?{id,name:payload.name,frame:payload.frame}:{id,name:payload.name,frames:payload.frames,fps:payload.fps,move_speed_pt_s:payload.move_speed_pt_s,rig_lengths:payload.rig_lengths};
    stored[collection][id]=record;return {ok:true,json:async()=>({ok:true,collection,record})};
  }});
(async()=>{
  await vm.runInContext(fs.readFileSync(__dirname+'/poses.js','utf8'),context);
  assert.equal(elements.library.children.length,16);
  assert.equal(elements.frames.children.length,8);
  elements.previous.onclick();assert.match(elements.frameLabel.textContent,/8 \/ 8/);
  elements.next.onclick();assert.match(elements.frameLabel.textContent,/1 \/ 8/);
  elements.down.onclick({shiftKey:true});
  elements.poseName.value='My pose';await elements.savePose.onclick();
  assert.equal(Object.keys(stored.poses).length,17);
  assert.ok(Math.abs(stored.poses['saved-1'].frame.bodyY-(rig.generateFrame('sprint',0).bodyY+10))<1e-8);
  const head=elements.controls.children[0].children.find(row=>row.children?.[1]?.id==='head-number').children[1];
  head.valueAsNumber=200;head.onchange();
  elements.poseName.value='Head clamp';await elements.savePose.onclick();
  assert.equal(stored.poses['saved-2'].frame.head,30);
  elements.swapLeft.onclick();assert.match(elements.frameLabel.textContent,/8 \/ 8/);
  elements.undo.onclick();assert.match(elements.frameLabel.textContent,/1 \/ 8/);
  // Pointer capture stays on the container while its SVG is rebuilt.
  const stage=elements.stage;
  stage.querySelector=()=>({getScreenCTM:()=>({inverse:()=>({})}),createSVGPoint:()=>({matrixTransform(){return {x:this.x,y:this.y};}})});
  stage.setPointerCapture=id=>{stage.capture=id;};
  stage.hasPointerCapture=id=>stage.capture===id;
  stage.releasePointerCapture=()=>{stage.capture=null;};
  const grip=rig.handles(stored.poses['saved-2'].frame).find(h=>h.key==='bodyY');
  const pointer={button:0,pointerId:1,clientX:grip.point.x,clientY:grip.point.y,preventDefault(){},target:{closest:()=>({dataset:{joint:'bodyY'}})}};
  stage.onpointerdown(pointer);
  stage.onpointermove({...pointer,clientY:pointer.clientY+10});
  stage.onpointermove({...pointer,clientY:pointer.clientY+20});
  stage.onpointerup(pointer);
  assert.equal(stage.capture,null);
  // One undo returns the complete multi-move gesture to its start.
  elements.undo.onclick();
  elements.clipName.value='My sprint';await elements.saveClip.onclick();
  assert.equal(Object.keys(stored.clips).length,3);
  assert.equal(elements.dirty.textContent,'');
  assert.equal(stored.clips['saved-3'].frames[0].bodyY,stored.poses['saved-2'].frame.bodyY);
  assert.deepEqual(stored.clips['sprint-v1'],rig.presets().clips['sprint-v1']);
  const existing=clone(stored.clips['saved-3']);
  elements.down.onclick({shiftKey:true});elements.clipName.value='Not a rename';
  confirmed=false;await elements.updateClip.onclick();
  assert.deepEqual(stored.clips['saved-3'],existing);
  confirmed=true;await elements.updateClip.onclick();
  assert.equal(Object.keys(stored.clips).length,3);
  assert.equal(stored.clips['saved-3'].name,'My sprint');
  assert.equal(stored.clips['saved-3'].frames[0].bodyY,existing.frames[0].bodyY+10);
  assert.equal(elements.dirty.textContent,'');
  assert.deepEqual(stored.clips['sprint-v1'],rig.presets().clips['sprint-v1']);
  failure=true;elements.down.onclick({shiftKey:false});await elements.updateClip.onclick();
  assert.match(elements.status.textContent,/Neuloženo/);
  assert.equal(elements.dirty.textContent,'Neuložené změny animace');
  assert.equal(elements.updateClip.disabled,false);
  failure=true;elements.poseName.value='Failed save';await elements.savePose.onclick();
  assert.match(elements.status.textContent,/Neuloženo/);
  assert.equal(Object.keys(stored.poses).length,18);
  failure=false;elements.moveSpeed.value='12.5';elements.moveSpeed.onchange();await elements.updateClip.onclick();
  assert.equal(stored.clips['saved-3'].move_speed_pt_s,12.5);
  elements.travel.checked=true;elements.travel.onchange();elements.play.onclick();raf(100);raf(200);
  assert.match(elements.stage.innerHTML,/translate\(20 0\)/);
  elements.travel.checked=false;elements.travel.onchange();raf(300);
  assert.match(elements.stage.innerHTML,/translate\(0 0\)/);
  elements.play.onclick();
  console.log('PASS: frame wrap, body shift, head clamp, swap/undo, pose save, clip save, preservation and save failure.');
})().catch(error=>{console.error(error);process.exitCode=1;});
