const assert=require('node:assert/strict'),C=require('./cutout-rig.js'),R=require('./pose-rig.js'),V=require('./editor-view.js');
const mask=()=>({width:512,height:560,data:new Uint8ClampedArray(512*560*4)});
const pose=R.neutral(),bones=C.bones(pose),parts={};
for(const key of ['torso','head'])parts[key]={start:[bones[key][0].x,bones[key][0].y],end:[bones[key][1].x,bones[key][1].y]};
const skin={layers:['torso','head'],parts},masks={head:mask(),torso:mask()},point={x:250.5,y:270.5},i=(270*512+250)*4+3;
masks.head.data[i]=255;masks.torso.data[i]=255;
assert.equal(C.hitTest(skin,masks,pose,point),'head');
masks.head.data[i]=0;assert.equal(C.hitTest(skin,masks,pose,point),'torso');
masks.head.data[i]=4;assert.equal(C.hitTest(skin,masks,pose,point),'torso');
masks.head.data[i]=255;skin.layers.reverse();assert.equal(C.hitTest(skin,masks,pose,point),'torso');
assert.equal(C.hitTest(skin,masks,pose,{x:0,y:0}),null);
// Hit an offset, rotated, resized part in every frame, after zoom/pan/travel conversion.
const part={start:[20,20],end:[20,100],offset:[13,-8]},one={layers:['nearForearm'],parts:{nearForearm:part}},alpha=mask();
alpha.data[(60*512+30)*4+3]=255;
const clip={...R.zombieClips()[0],rig_lengths:{nearForearm:63}};
for(let t=0;t<8;t+=.5){
  const p=C.sample(clip,t),m=C.matrix(part,C.bones(p).nearForearm),x=m[0]*30.5+m[2]*60.5+m[4],y=m[1]*30.5+m[3]*60.5+m[5];
  const pan={x:45,y:-37},zoom=2.3,travel=-64;
  const pointer=V.point(256+pan.x+(x+travel-256)*zoom,280+pan.y+(y-280)*zoom,zoom,true,pan);
  assert.equal(C.hitTest(one,{nearForearm:alpha},p,{x:512-pointer.x-travel,y:pointer.y}),'nearForearm');
  const low={width:256,height:280,sourceWidth:512,sourceHeight:560,data:new Uint8ClampedArray(256*280*4)};
  low.data[(30*256+15)*4+3]=255;
  assert.equal(C.hitTest(one,{nearForearm:low},p,{x:512-pointer.x-travel,y:pointer.y}),'nearForearm');
}
console.log('PASS: frontmost opaque hit, transparent padding, custom layer order, offsets, animated geometry, zoom/pan/travel.');
