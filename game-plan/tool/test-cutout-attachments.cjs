const assert=require('node:assert/strict'),C=require('./cutout-rig.js'),R=require('./pose-rig.js'),M=require('./motion-preview.js'),V=require('./editor-view.js');
const near=(a,b)=>assert.ok(Math.abs(a-b)<.05,`${a} != ${b}`);
const part={start:[10,20],end:[10,100]},pose=R.neutral();
const bone=C.bones(pose).nearForearm,before=C.matrix(part,bone),moved=C.moveAttachment(part,bone,8,17),after=C.matrix(moved,bone);
near(after[4]-before[4],8);near(after[5]-before[5],17);
assert.deepEqual(part,{start:[10,20],end:[10,100]});
// The offset follows the bone, not the viewport or frame: a 90-degree turn rotates it.
const turned=C.bones({...pose,nearElbow:90}).nearForearm;
const a=C.matrix(part,turned),b=C.matrix(moved,turned);
near(Math.hypot(b[4]-a[4],b[5]-a[5]),Math.hypot(8,17));
const clip={fps:8,move_speed_pt_s:12};
for(const delta of [-25,0,25]){const r=M.rates(clip,delta);near(r.speed/r.fps,1.5);near(r.fps,8*(1+delta/100));}
assert.equal(M.variation(20,()=>0),-20);assert.equal(M.variation(20,()=>1),20);
const p=V.point(356,330,2,false,{x:50,y:10});near(p.x,281);near(p.y,300);
console.log('PASS: local attachment offsets, immutable source, coupled cadence/travel, random bounds, panned pointer mapping.');
