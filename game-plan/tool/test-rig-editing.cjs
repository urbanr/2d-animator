const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('./pose-rig.js'),V=require('./editor-view.js'),C=require('./cutout-rig.js');
const original=R.zombieClips()[0],snapshot=JSON.stringify(original);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-7,`${a} != ${b}`);
for(const side of ['near','far'])for(const [joint,bone,a,b] of [
  ['Shoulder','UpperArm','shoulder','elbow'],['Elbow','Forearm','elbow','hand'],
  ['Hip','Thigh','hip','knee'],['Knee','Shin','knee','ankle'],['Foot','Foot','ankle','toe']]){
  const h=R.handles(original.frames[0]).find(h=>h.key===side+joint);
  const length=R.defaultLengths()[side+bone],factor=(length+20)/length;
  const end={x:h.pivot.x+(h.point.x-h.pivot.x)*factor,y:h.pivot.y+(h.point.y-h.pivot.y)*factor};
  const edited=R.dragClip(original,0,h.key,h.point,end);
  assert.equal(edited.rig_lengths[side+bone],length+20);
  assert.equal(edited.rig_lengths[(side==='near'?'far':'near')+bone],length);
  for(let i=0;i<edited.frames.length;i++){
    assert.deepEqual(edited.frames[i],original.frames[i]); // Stretch alone changes no angles.
    const g=R.points(edited.frames[i],edited.rig_lengths)[side];close(Math.hypot(g[a].x-g[b].x,g[a].y-g[b].y),length+20);
    const sampled=R.points(C.sample(edited,i,false))[side];close(Math.hypot(sampled[a].x-sampled[b].x,sampled[a].y-sampled[b].y),length+20);
  }
}
for(const [key,side,part] of [['shoulders','near','shoulders'],['farShoulderRoot','far','shoulders'],['pelvis','near','hips'],['farHipRoot','far','hips']]){
  const h=R.handles(original.frames[0]).find(h=>h.key===key);
  const edited=R.dragClip(original,0,key,h.point,{x:h.point.x+12,y:h.point.y-9},{ctrlKey:true});
  const before=R.points(original.frames[0]),after=R.points(edited.frames[0]);
  close(after[part][side].x-before[part][side].x,12);close(after[part][side].y-before[part][side].y,-9);
  assert.deepEqual(after[part][side==='near'?'far':'near'],before[part][side==='near'?'far':'near']);
  assert.deepEqual(edited.frames.slice(1),original.frames.slice(1));
}
for(const zoom of [.4,1,2.4,4])for(const mirrored of [false,true]){
  const source={x:315,y:370},screenX=256+((mirrored?512-source.x:source.x)-256)*zoom,screenY=280+(source.y-280)*zoom;
  const point=V.point(screenX,screenY,zoom,mirrored);close(point.x,source.x);close(point.y,source.y);
}
assert.equal(V.zoom(1,1e5),.4);assert.equal(V.zoom(1,-1e5),4);
const grip=R.handles(original.frames[0]).find(h=>h.key==='nearShoulder');
const turned={x:grip.pivot.x+(grip.point.y-grip.pivot.y)*1.3,y:grip.pivot.y-(grip.point.x-grip.pivot.x)*1.3};
const locked=R.dragClip(original,0,grip.key,grip.point,turned,{resize:false,ctrlKey:true});
assert.deepEqual(locked.rig_lengths,R.defaultLengths());
assert.notEqual(locked.frames[0].nearShoulder,original.frames[0].nearShoulder);
assert.deepEqual(locked.frames.slice(1),original.frames.slice(1));
const skin=JSON.parse(fs.readFileSync(__dirname+'/../graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json'));
for(const side of ['near','far'])assert.ok(skin.layers.indexOf(side+'Shin')>skin.layers.indexOf(side+'Thigh'));
assert.equal(JSON.stringify(original),snapshot);
console.log('PASS: 10 shared bone lengths, all frames, independent Ctrl roots, zoom coordinates, shin Z order, immutable source.');
