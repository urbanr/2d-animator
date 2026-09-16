const assert=require('node:assert/strict'),C=require('./cutout-rig.js'),E=require('./cutout-editor.js'),R=require('./pose-rig.js');
const close=(a,b)=>a.forEach((v,i)=>assert.ok(Math.abs(v-b[i])<1e-7,`${a} != ${b}`));
const part={start:[30,20],end:[50,150],size:[100,180],offset:[8,-4],rotation:37,scale:1.3,scale_x:1.2,scale_y:.7};
const bone=[{x:170,y:90},{x:240,y:180}],old=C.matrix(part,bone);
const pivot=C.movePivot(part,bone,20,-15),moved={...part,...C.repivot(part,pivot)};
close(C.matrix(moved,bone),old);
const at=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
const center=part.start.map((v,i)=>v+pivot[i]);
close(at(C.matrix(moved,bone),center),at(C.matrix({...moved,rotation:97},bone),center));
close(at(C.matrix(moved,bone),center),at(old,part.start).map((v,i)=>v+[20,-15][i]));
const skin={layers:['nearForearm'],parts:{nearForearm:part}};
const clip={frames:[R.neutral(),{...R.neutral(),nearElbow:80}],frame_edits:{1:{parts:{nearForearm:{rotation:45,scale_x:.8,offset:[5,3]}}}}};
for(const scope of ['frame','all']){
 const result=E.pivotChange(clip,skin,0,'nearForearm',[17,23],scope);
 for(let i=0;i<2;i++){
  const pose=C.sample(clip,i,false),before=C.partFor(skin,'nearForearm',pose),after=C.partFor(result.skin,'nearForearm',C.sample(result.clip,i,false));
  close(C.matrix(before,C.bones(pose).nearForearm),C.matrix(after,C.bones(pose).nearForearm));
  close(after.pivot_offset,scope==='all'||i===0?[17,23]:[0,0]);
 }
 assert.deepEqual(result.clip.frames,clip.frames);assert.deepEqual(result.skin.parts.nearForearm.start,part.start);
 E.validateEdits(result.clip,result.skin);
 if(scope==='frame')close(C.partFor(result.skin,'nearForearm',C.sample(E.resetFrame(result.clip,0),0)).pivot_offset,[0,0]);
}
const local=E.pivotChange(clip,skin,0,'nearForearm',[10,20],'frame');
close(C.partFor(local.skin,'nearForearm',C.sample(local.clip,1.5)).pivot_offset,[5,10]);
assert.equal(skin.parts.nearForearm.pivot_offset,undefined);
console.log('PASS: independent pivot, no bitmap jump, fixed rotation center, scoped compensation, reset and loop interpolation.');
