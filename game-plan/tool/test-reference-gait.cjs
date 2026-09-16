const assert=require('node:assert/strict'),R=require('./pose-rig.js');
const clips=R.referenceGaitClips();
for(const [kind,clip] of clips.entries()) {
  assert.equal(clip.frames.length,8);
  assert.equal(new Set(clip.frames.map(JSON.stringify)).size,8);
  clip.frames.forEach((p,i)=>{
    const g=R.points(p),feet=['near','far'].map(s=>Math.max(g[s].ankle.y,g[s].toe.y));
    assert.ok(Math.max(...feet)<=390.15,'feet do not sink');
    if(kind===0||i%4!==3)assert.ok(Math.abs(feet[i<4?0:1]-390)<0.15,'stance foot contact');
    else assert.ok(Math.max(...feet)<375,'sprint flight clears ground');
    for(const [key,,min,max] of R.fields)assert.ok(p[key]>=min&&p[key]<=max,key);
    for(const side of ['near','far']) {
      const v=g[side];
      for(const [a,b,len] of [[v.hip,v.knee,70],[v.knee,v.ankle,74],[v.shoulder,v.elbow,46],[v.elbow,v.hand,44],[v.ankle,v.toe,25]])
        assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-len)<1e-8);
    }
    assert.equal(p.nearKnee,clip.frames[(i+4)%8].farKnee,'half-cycle limb alternation');
    assert.ok(p.shoulderWidth*p.pelvisWidth<=0);
    assert.ok(Math.abs(p.shoulderWidth)<=45,'shoulders remain subtle');
    if(kind===0) {
      assert.ok(Math.abs(p.nearKnee)<=60,'no crouching swing');
      assert.ok(Math.abs(p[(i<4?'near':'far')+'Knee'])<=18,'extended support leg');
    }
  });
}
assert.ok(clips[1].frames.every(p=>p.bodyLean===18));
const old=R.generateFrame('walk',0);delete old.bodyLean;
assert.deepEqual(R.points(old),R.points({...old,bodyLean:0}),'old poses unchanged');
console.log('PASS: natural-walk knee limits, planted support feet, sprint flight, alternating legs, rigid bones and legacy compatibility.');
