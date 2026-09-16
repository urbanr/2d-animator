const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('./pose-rig.js'),C=require('./cutout-rig.js'),E=require('./cutout-editor.js');
const copy=v=>JSON.parse(JSON.stringify(v)),near=(a,b)=>assert.ok(Math.abs(a-b)<1e-6,`${a} != ${b}`);
const source=copy({...R.zombieClips()[0],rig_lengths:R.defaultLengths()}),original=copy(source);
const skin=JSON.parse(fs.readFileSync(__dirname+'/../graphics/characters2/bezec-zombie-v1/skin.json'));
skin.layers=skin.layers.filter(k=>!['shoulders','pelvis'].includes(k));
for(const key of ['nearShoulder','farElbow','nearHip','farKnee','nearFoot']){
  const h=R.handles(C.sample(source,0,false)).find(h=>h.key===key),bone=E.boneForHandle(key),size=source.rig_lengths[bone];
  // The pointer moves diagonally: Ctrl must change length but absolutely no angles.
  const end={x:h.pivot.x+size+17,y:h.pivot.y+13};
  const edited=E.dragSkeleton(source,0,key,h.point,end,{ctrlKey:true});
  assert.deepEqual(edited.frames,source.frames);
  near(C.sample(edited,0,false).rig_lengths[bone],Math.hypot(size+17,13));
  near(C.sample(edited,1,false).rig_lengths[bone],size);
  assert.deepEqual(E.resetFrame(edited,0).frames,source.frames);
  const all=E.dragSkeleton(source,0,key,h.point,end,{ctrlKey:true,scope:'all'});
  for(let i=0;i<8;i++)near(C.sample(all,i,false).rig_lengths[bone],Math.hypot(size+17,13));
  assert.deepEqual(E.dragSkeleton(source,0,key,h.point,end,{ctrlKey:true,resize:false}),source);
}
let local=E.poseChange(source,0,{bodyY:source.frames[0].bodyY+12,nearHip:source.frames[0].nearHip+10});
assert.deepEqual(local.frames.slice(1),source.frames.slice(1));
let global=E.poseChange(local,0,{bodyY:local.frames[0].bodyY+5,nearHip:local.frames[0].nearHip+8},'all');
for(let i=0;i<8;i++){
  near(global.frames[i].bodyY-local.frames[i].bodyY,5);
  near(global.frames[i].nearHip-local.frames[i].nearHip,8);
}
let reset=E.resetFrame(global,0);
near(reset.frames[0].bodyY,source.frames[0].bodyY+5);
near(reset.frames[0].nearHip,source.frames[0].nearHip+8);
local=E.lengthChange(source,7,'nearShin',111);
global=E.lengthChange(local,7,'nearShin',133.2,'all');
near(C.frameLengths(global,7).nearShin,133.2);near(C.frameLengths(global,0).nearShin,88.8);
near(C.sample(global,7.5).rig_lengths.nearShin,111); // interpolated last→first exception
near(C.frameLengths(E.resetFrame(global,7),7).nearShin,88.8);
const s=copy(skin),key='nearForearm',base=C.partFor(s,key,C.sample(source,0));
local=E.partChange(source,s,0,key,{offset:[13,-7],rotation:25,scale:1.5});
assert.deepEqual(local.skin,s);assert.deepEqual(local.clip.frames,source.frames);
const effective=C.partFor(local.skin,key,C.sample(local.clip,0));near(effective.scale,1.5);near(effective.rotation,25);assert.deepEqual(effective.offset,[13,-7]);
near(C.partFor(local.skin,key,C.sample(local.clip,1)).scale,base.scale);
global=E.partChange(local.clip,local.skin,0,key,{offset:[17,-9],rotation:40,scale:1.8},'all');
const after=C.partFor(global.skin,key,C.sample(global.clip,0)),other=C.partFor(global.skin,key,C.sample(global.clip,1));
near(after.scale,1.8);near(other.scale,1.2);near(after.rotation,40);near(other.rotation,15);assert.deepEqual(other.offset,[4,-2]);
E.validateEdits(global.clip,global.skin);
const roundtrip=JSON.parse(JSON.stringify(global));
assert.deepEqual(C.sample(roundtrip.clip,7.8),C.sample(global.clip,7.8));
const bones=C.bones(C.sample(global.clip,0)),part=C.partFor(global.skin,key,C.sample(global.clip,0)),m=C.matrix(part,bones[key]);
const point=(m,p)=>({x:m[0]*p[0]+m[2]*p[1]+m[4],y:m[1]*p[0]+m[3]*p[1]+m[5]});
// Pivot does not wander when bitmap rotates/scales; offset follows bone, not bitmap rotation.
const pivot=point(m,part.start),otherMatrix=C.matrix({...part,rotation:-33,scale:2.5},bones[key]);
near(point(otherMatrix,part.start).x,pivot.x);near(point(otherMatrix,part.start).y,pivot.y);
const stretched={...part,scale_x:1.7,scale_y:.6},axisMatrix=C.matrix(stretched,bones[key]);
near(Math.hypot(axisMatrix[0],axisMatrix[1])/Math.hypot(m[0],m[1]),1.7);
near(Math.hypot(axisMatrix[2],axisMatrix[3])/Math.hypot(m[2],m[3]),.6);
near(point(axisMatrix,part.start).x,pivot.x);near(point(axisMatrix,part.start).y,pivot.y);
const movedAxis=C.moveAttachment(stretched,bones[key],9,-14),axisPivot=point(C.matrix(movedAxis,bones[key]),part.start);
assert.ok(Math.abs(axisPivot.x-pivot.x-9)<.02&&Math.abs(axisPivot.y-pivot.y+14)<.02);
const axisEdit=E.partChange(source,s,7,key,{scale_x:1.8,scale_y:.7});
E.validateEdits(axisEdit.clip,axisEdit.skin);
near(C.partFor(s,key,C.sample(axisEdit.clip,7.5)).scale_x,1.4);
near(C.partFor(s,key,C.sample(axisEdit.clip,7.5)).scale_y,.85);
assert.deepEqual(axisEdit.clip.frames,source.frames);
const shifted=C.moveAttachment(part,bones[key],9,-14),moved=point(C.matrix(shifted,bones[key]),part.start);
assert.ok(Math.abs(moved.x-pivot.x-9)<.02&&Math.abs(moved.y-pivot.y+14)<.02);
const mask={width:part.size[0],height:part.size[1],data:new Uint8ClampedArray(part.size[0]*part.size[1]*4).fill(255)};
assert.equal(C.hitTest({...global.skin,layers:[key]},{[key]:mask},C.sample(global.clip,0),point(m,[mask.width/2,mask.height/2])),key);
const root=R.handles(C.sample(source,0)).find(h=>h.key==='farShoulderRoot');
const independent=E.dragSkeleton(source,0,root.key,root.point,{x:root.point.x-14,y:root.point.y+6},{ctrlKey:true,scope:'all'});
for(let i=0;i<8;i++){near(independent.frames[i].farShoulderOffsetX,-14);near(independent.frames[i].nearShoulderOffsetX,0);}
// Common bounded deltas/ratios do not flatten the animation, even near limits.
const bounded=copy(source);bounded.frames[2].bodyY=99;
const limited=E.poseChange(bounded,0,{bodyY:bounded.frames[0].bodyY+50},'all');
for(let i=0;i<8;i++)near(limited.frames[i].bodyY-bounded.frames[i].bodyY,1);
for(const bad of [{9:{}},{0:{parts:{head:{scale:NaN}}}},{0:{lengths:{nearShin:0}}},{0:{pose_base:{unknown:4}}},{0:{parts:{head:{offset:[Infinity,2]}}}}])assert.throws(()=>E.validateEdits({...source,frame_edits:bad},s));
assert.deepEqual(source,original);
console.log('PASS: scoped edits, delta/ratio propagation, pure Ctrl lengths, independent roots, reset baseline, bitmap transforms, alpha picking and loop interpolation.');
