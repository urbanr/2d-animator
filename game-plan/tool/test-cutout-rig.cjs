const assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const C=require('./cutout-rig.js'),R=require('./pose-rig.js');
const skin=JSON.parse(fs.readFileSync(path.join(__dirname,'../graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json')));
const clips=Object.values(JSON.parse(fs.readFileSync(path.join(__dirname,'../graphics/kostry/skeletons.json'))).clips);
const close=(a,b)=>assert.ok(Math.abs(a-b)<1e-8,`${a} != ${b}`);
const apply=(m,p)=>[m[0]*p[0]+m[2]*p[1]+m[4],m[1]*p[0]+m[3]*p[1]+m[5]];
assert.equal(skin.layers.length,13);assert.equal(new Set(skin.layers).size,13);
assert.deepEqual(skin.layers,['farUpperArm','farForearm','farFoot','farThigh','farShin','nearFoot','nearThigh','nearShin','backpack','torso','head','nearUpperArm','nearForearm']);
assert.equal(C.bones(R.neutral()).pelvis,undefined);assert.equal(C.bones(R.neutral()).shoulders,undefined);
for(const clip of clips){
 assert.deepEqual(C.sample(clip,8),C.sample(clip,0));
 assert.deepEqual(C.sample(clip,-.5),C.sample(clip,7.5));
 for(let t=0;t<8;t+=.125){
  const p=C.sample(clip,t),b=C.bones(p),g=R.points(p);
  for(const k of skin.layers){
   assert.ok(fs.existsSync(path.join(__dirname,'../graphics/bitmapove-predlohy/bezec-zombie-v1',skin.parts[k].file)));
   const m=C.matrix(skin.parts[k],b[k]);
   for(const [i,anchor] of ['start','end'].entries()){
    const q=apply(m,skin.parts[k][anchor]);close(q[0],b[k][i].x);close(q[1],b[k][i].y);
   }
   close(m[0]**2+m[1]**2,m[2]**2+m[3]**2); // no skew or nonuniform stretching
  }
  for(const side of ['near','far']){
   close(b[side+'Foot'][0].x,512-g[side].ankle.x);
   close(b[side+'Foot'][0].y,g[side].ankle.y);
   close(Math.hypot(b[side+'Thigh'][1].x-b[side+'Thigh'][0].x,b[side+'Thigh'][1].y-b[side+'Thigh'][0].y),70);
   close(Math.hypot(b[side+'Shin'][1].x-b[side+'Shin'][0].x,b[side+'Shin'][1].y-b[side+'Shin'][0].y),74);
  }
 }
}
const wrap={frames:[{...R.neutral(),nearHip:179,shoulderWidth:100},{...R.neutral(),nearHip:-179,shoulderWidth:-100}]};
close(C.sample(wrap,.5).nearHip,180);close(C.sample(wrap,.5).shoulderWidth,0);
close(C.sample(wrap,.75,false).nearHip,179);
assert.throws(()=>C.matrix({start:[0,0],end:[0,0]},[{x:0,y:0},{x:1,y:1}]));
assert.ok(skin.layers.indexOf('farThigh')<skin.layers.indexOf('nearThigh'));
console.log('PASS: all bitmap anchors, fixed limb identities/lengths, 8→1 interpolation, signed shoulder widths, layer order.');
