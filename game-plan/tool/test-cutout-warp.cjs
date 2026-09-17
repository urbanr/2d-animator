const assert=require('node:assert/strict'),fs=require('node:fs');
const R=require('./pose-rig.js'),C=require('./cutout-rig.js'),E=require('./cutout-editor.js');
const copy=value=>JSON.parse(JSON.stringify(value));
const near=(actual,expected,message='')=>assert.ok(Math.abs(actual-expected)<1e-6,`${message} ${actual} != ${expected}`);

const source=copy({...R.zombieClips()[0],rig_lengths:R.defaultLengths()});
const skin=JSON.parse(fs.readFileSync(__dirname+'/../graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json'));
skin.layers=skin.layers.filter(key=>!['shoulders','pelvis'].includes(key));
const key='nearForearm',original=copy({source,skin}),pose=C.sample(source,0,false),part=C.partFor(skin,key,pose);
const [width,height]=part.size;
const wanted=[[12,-5],[-8,9],[17,13],[-11,-7]];

const warped={...part,warp:wanted};
assert.deepEqual(C.warpCorners(warped),[[12,-5],[width-8,9],[width+17,height+13],[-11,height-7]]);
for(const [index,[x,y]] of [[0,[0,0]],[1,[width,0]],[2,[width,height]],[3,[0,height]]]){
  const point=C.warpPoint(warped,x,y),corner=C.warpCorners(warped)[index];
  near(point.x,corner[0],`corner ${index} x`);near(point.y,corner[1],`corner ${index} y`);
}
for(const sourcePoint of [[width*.8,height*.2],[width*.2,height*.8],[width*.5,height*.5]]){
  const point=C.warpPoint(warped,...sourcePoint),roundtrip=C.unwarpPoint(warped,point.x,point.y);
  near(roundtrip.x,sourcePoint[0],'roundtrip x');near(roundtrip.y,sourcePoint[1],'roundtrip y');
}

function drawingContext(){
  const calls=[];
  return {calls,save(){calls.push('save');},restore(){calls.push('restore');},beginPath(){},moveTo(){},lineTo(){},closePath(){},clip(){calls.push('clip');},transform(...m){calls.push(['transform',...m]);},drawImage(...args){calls.push(['drawImage',...args]);}};
}
const image={width:width,height:height};
let context=drawingContext();C.drawWarpedImage(context,image,{...part,warp:[[0,0],[0,0],[0,0],[0,0]]});
assert.equal(context.calls.filter(call=>Array.isArray(call)&&call[0]==='drawImage').length,1,'plain bitmap is drawn once');
context=drawingContext();C.drawWarpedImage(context,image,warped);
assert.equal(context.calls.filter(call=>Array.isArray(call)&&call[0]==='drawImage').length,2,'warped bitmap uses two textured triangles');
assert.equal(context.calls.filter(call=>call==='clip').length,2);

let changed=E.partChange(source,skin,0,key,{warp:wanted},'frame');
assert.deepEqual(C.partFor(changed.skin,key,C.sample(changed.clip,0,false)).warp,wanted);
assert.deepEqual(C.partFor(changed.skin,key,C.sample(changed.clip,1,false)).warp,[[0,0],[0,0],[0,0],[0,0]]);
const halfway=C.partFor(changed.skin,key,C.sample(changed.clip,.5,true)).warp;
for(let corner=0;corner<4;corner++)for(let axis=0;axis<2;axis++)near(halfway[corner][axis],wanted[corner][axis]/2);
E.validateEdits(changed.clip,changed.skin);
assert.deepEqual(E.resetFrame(changed.clip,0).frame_edits,{});

const next=wanted.map(point=>point.map(value=>value+6));
changed=E.partChange(changed.clip,changed.skin,0,key,{warp:next},'all');
assert.deepEqual(C.partFor(changed.skin,key,C.sample(changed.clip,0,false)).warp,next);
assert.deepEqual(C.partFor(changed.skin,key,C.sample(changed.clip,1,false)).warp,[[6,6],[6,6],[6,6],[6,6]],'animation scope preserves the frame difference');
E.validateEdits(changed.clip,changed.skin);

const effective=C.partFor(changed.skin,key,C.sample(changed.clip,0,false)),matrix=C.matrix(effective,C.bones(C.sample(changed.clip,0,false))[key]);
const localSource=[Math.floor(width/2),Math.floor(height/2)],localWarp=C.warpPoint(effective,...localSource);
const screenPoint={x:matrix[0]*localWarp.x+matrix[2]*localWarp.y+matrix[4],y:matrix[1]*localWarp.x+matrix[3]*localWarp.y+matrix[5]};
const mask={width,height,sourceWidth:width,sourceHeight:height,data:new Uint8ClampedArray(width*height*4)};
mask.data[(localSource[1]*width+localSource[0])*4+3]=255;
assert.equal(C.hitTest({...changed.skin,layers:[key]},{[key]:mask},C.sample(changed.clip,0,false),screenPoint),key,'warped visible pixel remains selectable');

for(const bad of [
  [[[0,0],[0,0],[0,0]]],
  [[[0,0],[0,0],[0,0],[Infinity,0]]],
  [[[0,0],[0,0],[0,0],[4001,0]]]
])assert.throws(()=>E.validateEdits({...source,frame_edits:{0:{parts:{[key]:{warp:bad[0]}}}}},skin));
assert.deepEqual({source,skin},original,'all helpers and edits keep their inputs immutable');
console.log('PASS: four-corner bitmap warp geometry, drawing, picking, interpolation, scopes, reset, validation and immutability.');
