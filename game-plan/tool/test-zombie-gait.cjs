const assert=require('node:assert/strict'),R=require('./pose-rig.js');
const clip=R.zombieClips()[0];
assert.equal(clip.fps,6);assert.equal(clip.frames.length,8);
assert.equal(new Set(clip.frames.map(JSON.stringify)).size,8);
clip.frames.forEach((p,i)=>{
  const g=R.points(p),feet=['near','far'].map(s=>Math.max(g[s].ankle.y,g[s].toe.y));
  assert.ok(Math.max(...feet)<=390.15,'no sinking below ground');
  assert.ok(Math.abs(Math.max(...feet)-390)<0.15,'no flight');
  assert.ok(Math.min(...feet)>368,'low shuffling feet');
  assert.equal(p.nearKnee,clip.frames[(i+4)%8].farKnee);
  for(const [key,,min,max] of R.fields)assert.ok(p[key]>=min&&p[key]<=max,key);
  for(const side of ['near','far']) {
    const v=g[side];assert.ok(v.hand.x>v.shoulder.x,'arms ahead');
    for(const [a,b,len] of [[v.hip,v.knee,70],[v.knee,v.ankle,74],[v.shoulder,v.elbow,46],[v.elbow,v.hand,44]])
      assert.ok(Math.abs(Math.hypot(a.x-b.x,a.y-b.y)-len)<1e-8);
  }
});
console.log('PASS: zombie shuffle, alternate legs, forward arms, rigid bones and eight unique frames.');
