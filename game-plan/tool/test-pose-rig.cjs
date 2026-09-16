const assert=require('node:assert/strict');
const R=require('./pose-rig.js');
const library=R.presets();
assert.equal(Object.keys(library.poses).length,16);
for(const kind of ['walk','sprint']) {
  const frames=library.clips[kind+'-v1'].frames;
  assert.equal(frames.length,8);
  assert.equal(new Set(frames.map(JSON.stringify)).size,8);
  assert.notDeepEqual(frames[7],frames[0]);
  for(const frame of frames) {
    for(const [key,,min,max] of R.fields) assert.ok(frame[key]>=min&&frame[key]<=max,key);
    const joints=R.points(frame);
    for(const side of ['near','far']) {
      const v=joints[side];
      const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
      assert.ok(Math.abs(distance(v.hip,v.knee)-70)<1e-8);
      assert.ok(Math.abs(distance(v.knee,v.ankle)-74)<1e-8);
      assert.ok(Math.abs(distance(v.shoulder,v.elbow)-46)<1e-8);
      assert.ok(Math.abs(distance(v.elbow,v.hand)-44)<1e-8);
    }
    const svg=R.svg(frame);
    assert.ok(svg.indexOf(R.FAR)<svg.indexOf(R.NEAR),'far limbs drawn behind near limbs');
    assert.ok(!svg.includes('NaN'));
  }
  const one=R.points(frames[0]),five=R.points(frames[4]);
  assert.ok(one.near.ankle.x>one.far.ankle.x);
  assert.ok(five.near.ankle.x<five.far.ankle.x);
}
const a=R.points(R.neutral()),b=R.points({...R.neutral(),bodyY:20});
assert.equal(b.headCenter.y-a.headCenter.y,20);
assert.equal(b.near.ankle.y-a.near.ankle.y,20);
console.log('PASS: 16 unique poses, joint limits, fixed bone lengths, depth colors, alternating legs and whole-body offset.');
