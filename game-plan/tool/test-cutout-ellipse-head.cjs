const assert=require('node:assert/strict'),R=require('./pose-rig.js'),C=require('./cutout-rig.js'),E=require('./cutout-editor.js');
const p=R.neutral(),clip={frames:[p,{...p,head:5}],fps:6},part={size:[200,200],start:[100,100],end:[100,180],joint_fade:{start:{strength:1,radius:40,radius2:10,direction:'outward'}}};
assert.ok(C.fadeAlpha(part,100,70)<1);
assert.equal(C.fadeAlpha(part,115,95),1,'Outside narrow ellipse, despite being inside old circle');
assert.equal(C.fadeAlpha(part,100,59),1,'Outside long radius');
assert.equal(C.fadeAlpha(part,100,101),1,'Inward half unchanged');
const skin={parts:{head:part},layers:['head']};
let changed=E.fadeChange(clip,skin,0,'head','start',{radius2:25},'frame');
assert.equal(C.fadeFor(C.partFor(changed.skin,'head',C.sample(changed.clip,0))).radius2,25);
assert.equal(C.fadeFor(C.partFor(changed.skin,'head',C.sample(changed.clip,1))).radius2,10);
assert.equal(C.fadeFor(C.partFor(changed.skin,'head',C.sample(changed.clip,.5))).radius2,17.5);
changed=E.fadeChange(changed.clip,changed.skin,1,'head','start',{radius2:20},'all');
assert.equal(C.fadeFor(C.partFor(changed.skin,'head',C.sample(changed.clip,0))).radius2,20);
assert.equal(C.fadeFor(C.partFor(changed.skin,'head',C.sample(changed.clip,1))).radius2,20);
assert.equal(changed.clip.frame_edits,undefined);
const legacy={...part,joint_fade:{start:{strength:1,radius:40,direction:'outward'}}};
const legacyClip={...clip,frame_edits:{0:{parts:{head:{joint_fade:{start:{strength:1,radius:20,direction:'outward'}}}}}}};
assert.equal(C.fadeFor(C.partFor({parts:{head:legacy}},'head',C.sample(legacyClip,0))).radius2,20);
for(const key of ['head','neck','bodyLean']){
  const h=R.handles(p).find(h=>h.key===key),bone={head:'head',neck:'neck',bodyLean:'torso'}[key];
  const dx=h.point.x-h.pivot.x,dy=h.point.y-h.pivot.y;
  const long={x:h.pivot.x+dx*1.5,y:h.pivot.y+dy*1.5};
  for(const scope of ['frame','all']){
    const result=E.dragSkeleton(clip,0,key,h.point,long,{tool:'size',scope});
    assert.equal(C.frameLengths(result,0)[bone],R.defaultLengths()[bone]*1.5);
    assert.equal(C.frameLengths(result,1)[bone],R.defaultLengths()[bone]*(scope==='all'?1.5:1));
    assert.deepEqual(result.frames,clip.frames,'Length does not rotate bones');
  }
  const turn={x:h.pivot.x+dx*Math.cos(.2)-dy*Math.sin(.2),y:h.pivot.y+dx*Math.sin(.2)+dy*Math.cos(.2)};
  assert.notEqual(E.dragSkeleton(clip,0,key,h.point,turn).frames[0][key],p[key]);
}
const h=R.handles(p).find(h=>h.key==='head'),moved=E.dragSkeleton(clip,0,'head',h.point,{x:h.point.x+12,y:h.point.y+8},{tool:'move'});
assert.equal(moved.frames[0].headOffsetX,12);assert.equal(moved.frames[0].headOffsetY,8);
assert.equal(moved.frames[0].bodyY,0);assert.deepEqual(moved.frames[1],clip.frames[1]);
assert.deepEqual(R.points(moved.frames[0]).near,R.points(p).near,'Head move leaves limbs intact');
const torso=R.handles(p).find(h=>h.key==='bodyY'),hip=R.points(p).hipCenter;
for(const scope of ['frame','all']){
  const longer={x:torso.point.x,y:hip.y+(torso.point.y-hip.y)*1.3};
  for(const settings of [{tool:'size'},{tool:'rotate',ctrlKey:true}]){
    const out=E.dragSkeleton(clip,0,'bodyY',torso.point,longer,{...settings,scope});
    assert.ok(Math.abs(C.frameLengths(out,0).torso-94*1.3)<1e-6);
    assert.equal(out.frames[0].bodyY,0);assert.equal(out.frames[0].bodyLean,0);
    assert.ok(Math.abs(C.frameLengths(out,1).torso-94*(scope==='all'?1.3:1))<1e-6);
  }
  const out=E.dragSkeleton(clip,0,'bodyY',torso.point,{x:torso.point.x+10,y:torso.point.y},{tool:'rotate',scope});
  assert.ok(out.frames[0].bodyLean>0);assert.equal(out.frames[0].bodyY,0);assert.equal(out.frames[0].bodyX,0);
  assert.equal(out.frames[1].bodyLean,scope==='all'?out.frames[0].bodyLean:0);
}
assert.deepEqual(E.dragSkeleton(clip,0,'bodyY',torso.point,{x:250,y:150},{tool:'size',resize:false}),clip);
assert.equal(R.defaultJointLimits().bodyLean[0],-180);assert.equal(R.defaultJointLimits().bodyLean[1],180);
const limited={...clip,joint_limits:{bodyLean:[-10,10]}},limitedTorso=R.handles(p).find(h=>h.key==='bodyY');
assert.equal(E.dragSkeleton(limited,0,'bodyY',limitedTorso.point,{x:limitedTorso.point.x+200,y:limitedTorso.point.y},{tool:'rotate'}).frames[0].bodyLean,10);
const view=require('./editor-view.js');
assert.ok(Math.abs(view.stageSize(null,900,1400).width-900)<1e-6);
assert.ok(Math.abs(view.stageSize(null,900,1400).height-900*476/512)<1e-6);
for(const width of [250,600,1600])for(const height of [300,800,1600])for(const wanted of [null,10,2000]){
  const size=view.stageSize(wanted,width,height);assert.equal(size.width,width);assert.ok(size.height>=width*294/512-1e-7&&size.height<=width*560/512+1e-7);
  assert.ok(Math.abs(size.canvasHeight-width*560/512)<1e-7);
}
assert.deepEqual(view.backingSize(900,2),{width:1800,height:1969,scale:1800/512});
assert.deepEqual(view.backingSize(250,1),{width:512,height:560,scale:1});
console.log('PASS: bounded ellipses, legacy circles, scoped axes, independent head/neck and torso manipulation.');
