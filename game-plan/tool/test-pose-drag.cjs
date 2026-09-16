const assert=require('node:assert/strict'),R=require('./pose-rig.js');
const distance=(a,b)=>Math.hypot(a.x-b.x,a.y-b.y);
const close=(a,b)=>assert.ok(Math.abs(a-b)<0.001,`${a} != ${b}`);
function rotate(p,key,degrees) {
  const h=R.handles(p).find(h=>h.key===key),a=degrees*Math.PI/180;
  const x=h.point.x-h.pivot.x,y=h.point.y-h.pivot.y;
  return R.dragPose(p,key,h.point,{x:h.pivot.x+x*Math.cos(a)-y*Math.sin(a),y:h.pivot.y+x*Math.sin(a)+y*Math.cos(a)});
}
const p={...R.neutral(),nearHip:15,nearKnee:-35,nearShoulder:20,nearElbow:40};
for(const key of ['nearHip','farHip','nearKnee','farKnee','nearShoulder','farShoulder','nearElbow','farElbow','neck','head']) {
  const next=rotate(p,key,10);close(next[key],p[key]-10);
  const points=R.points(next);
  for(const side of ['near','far']) {
    const v=points[side];close(distance(v.hip,v.knee),70);close(distance(v.knee,v.ankle),74);
    close(distance(v.shoulder,v.elbow),46);close(distance(v.elbow,v.hand),44);
  }
}
const leg=rotate(p,'nearHip',10),before=R.points(p).near,after=R.points(leg).near;
assert.equal(leg.nearKnee,p.nearKnee);assert.equal(leg.nearFoot,10);
close(distance(before.hip,before.toe),distance(after.hip,after.toe));
const arm=rotate(p,'nearShoulder',10);assert.equal(arm.nearElbow,p.nearElbow);
for(const side of ['near','far']) {
  const foot=side+'Foot';
  assert.equal(rotate(p,foot,140)[foot],140);
  assert.equal(rotate(p,foot,-140)[foot],-140);
  assert.equal(rotate({...p,[foot]:170},foot,30)[foot],-160);
  assert.equal(rotate({...p,[foot]:-170},foot,-30)[foot],160);
  const moved=rotate({...p,[foot]:170},side+'Hip',30);
  assert.equal(moved[foot],-160);
  close(distance(R.points(moved)[side].ankle,R.points(moved)[side].toe),25);
}
assert.equal(rotate(p,'head',80).head, -80);
const translated=R.dragPose(p,'bodyY',{x:256,y:200},{x:350,y:230});
assert.equal(translated.bodyY,30);
assert.equal(R.points(translated).near.toe.y,R.points(p).near.toe.y+30);
assert.match(R.svg(p,{editable:true}),/data-joint="nearHip"/);
assert.doesNotMatch(R.svg(p),/data-joint/);
assert.doesNotMatch(R.svg(p,{editable:true,side:'far'}),/data-joint="nearHip"/);
for(const [key,width,bar] of [['shoulders','shoulderWidth','shoulders'],['pelvis','pelvisWidth','hips']]) {
  const h=R.handles(p).find(h=>h.key===key);
  const half={x:(h.point.x+h.pivot.x)/2,y:(h.point.y+h.pivot.y)/2};
  const next=R.dragPose(p,key,h.point,half),g=R.points(next),old=R.points(p);
  assert.equal(next[width],50);assert.equal(next[key],p[key]);
  close(distance(g[bar].near,g[bar].far),distance(old[bar].near,old[bar].far)/2);
  assert.deepEqual(g.hipCenter,old.hipCenter);assert.deepEqual(g.shoulderCenter,old.shoulderCenter);
  const collapsed=R.dragPose(p,key,h.point,h.pivot);assert.equal(collapsed[width],0);
  const expanded=R.dragPose(collapsed,key,h.pivot,h.point);assert.equal(expanded[width],100);
  for(const ratio of [1,0.5,0.01,0,-0.01,-0.5,-1]) {
    const end={x:h.pivot.x+(h.point.x-h.pivot.x)*ratio,y:h.pivot.y+(h.point.y-h.pivot.y)*ratio};
    const crossed=R.dragPose(p,key,h.point,end);
    close(crossed[width],100*ratio);close(crossed[key],p[key]);
    const c=R.points(crossed);
    assert.deepEqual(c.hipCenter,old.hipCenter);assert.deepEqual(c.shoulderCenter,old.shoulderCenter);
    if(ratio<0)assert.ok(c[bar].near.x<c[bar].far.x);
  }
  const flipped={...p,[width]:-100},fh=R.handles(flipped).find(h=>h.key===key);
  assert.equal(R.dragPose(flipped,key,fh.point,h.point)[width],100);
  // Off-center grabs must not jump, even at negative widths.
  const grab={x:fh.point.x+3,y:fh.point.y+4};
  assert.equal(R.dragPose(flipped,key,grab,grab)[width],-100);
  for(const side of ['near','far']) {
    const a=old[side],b=g[side],root=key==='shoulders'?'shoulder':'hip',tip=key==='shoulders'?'hand':'toe';
    close(b[tip].x-a[tip].x,b[root].x-a[root].x);
    close(b[tip].y-a[tip].y,b[root].y-a[root].y);
  }
}
const legacy={...p};delete legacy.shoulderWidth;delete legacy.pelvisWidth;
assert.deepEqual(R.points(legacy),R.points(p));
console.log('PASS: mouse rotations, rigid descendant chains, foot rotation, body translation, limits and export without handles.');
