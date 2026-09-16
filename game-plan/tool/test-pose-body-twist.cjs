const assert=require('node:assert/strict'),R=require('./pose-rig.js');
for(const clip of R.bodyTwistClips()) {
  const frames=clip.frames;
  assert.equal(new Set(frames.map(JSON.stringify)).size,8);
  for(let i=0;i<8;i++) {
    const p=frames[i],opposite=frames[(i+4)%8],g=R.points(p);
    assert.ok(Math.abs(p.shoulderWidth+opposite.shoulderWidth)<1e-8);
    assert.ok(Math.abs(p.pelvisWidth+opposite.pelvisWidth)<1e-8);
    assert.ok(p.shoulderWidth*p.pelvisWidth<=0,'shoulders oppose pelvis');
    for(const [key,,min,max] of R.fields)assert.ok(p[key]>=min&&p[key]<=max,key);
    for(const side of ['near','far']) {
      const v=g[side];
      for(const [a,b,length] of [[v.hip,v.knee,70],[v.knee,v.ankle,74],[v.shoulder,v.elbow,46],[v.elbow,v.hand,44]])
        assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-length)<1e-8);
    }
    assert.ok(!R.svg(p).includes('NaN'));
  }
  const first=R.points(frames[0]),fifth=R.points(frames[4]);
  assert.ok(first.shoulders.near.x<first.shoulders.far.x);
  assert.ok(fifth.shoulders.near.x>fifth.shoulders.far.x);
  assert.ok(first.hips.near.x>first.hips.far.x);
  assert.ok(fifth.hips.near.x<fifth.hips.far.x);
  // Closing step equals the first step; frame 8 is not an endpoint duplicate.
  for(const key of ['shoulderWidth','pelvisWidth'])
    assert.ok(Math.abs(Math.abs(frames[7][key]-frames[0][key])-Math.abs(frames[0][key]-frames[1][key]))<1e-8);
}
assert.equal(R.generateFrame('walk',0).shoulderWidth,100,'legacy generator preserved');
for(const kind of ['walk','sprint'])for(let i=0;i<8;i++) {
  const previous=R.generateFrame(kind,i,{bodyTwist:true});
  const softer=R.generateFrame(kind,i,{bodyTwist:true,softShoulders:true});
  assert.ok(Math.abs(softer.shoulderWidth-previous.shoulderWidth/2)<=0.06);
  assert.ok(Math.abs(softer.shoulders-previous.shoulders/2)<=0.06);
  for(const key of ['pelvis','pelvisWidth','bodyY','nearHip','farHip','nearKnee','farKnee','nearFoot','farFoot'])
    assert.equal(softer[key],previous[key],key+' unchanged');
}
console.log('PASS: opposing torso motion, half-cycle swaps, fixed bones, limits and seamless signed-width loop.');
