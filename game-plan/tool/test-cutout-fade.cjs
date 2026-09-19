const assert=require('node:assert/strict');
const C=require('./cutout-rig.js'),E=require('./cutout-editor.js'),R=require('./pose-rig.js');
const part={size:[100,160],start:[50,40],end:[50,140],joint_fade:{start:{strength:1,radius:40,direction:'outward'}}};
const sourceSkin=require('../graphics/bitmapove-predlohy/bezec-zombie-v1/skin.json');
for(const key of sourceSkin.layers.filter(C.canFade))for(const end of ['start','end']){
  const p=sourceSkin.parts[key],configured={...p,joint_fade:{[end]:{...C.fadeFor(p,end),strength:1}}};
  assert.equal(C.fadeAlpha(configured,...p[end==='start'?'end':'start']),1,`${key}: default fade never touches opposite joint`);
}
assert.equal(C.fadeAlpha(part,50,40),1,'The selected endpoint stays opaque');
assert.equal(C.fadeAlpha(part,50,35),1,'The solid core survives bitmap sampling around the endpoint');
assert.equal(C.fadeAlpha(part,50,80),1,'Opaque one radius inside bitmap');
assert.equal(C.fadeAlpha(part,50,0),0,'Curved edge is fully transparent at 100% strength');
assert.equal(C.fadeAlpha(part,50,-1),1,'Beyond the arc the bitmap is unchanged');
assert.equal(C.fadeAlpha(part,0,0),1,'Outside the half-disc but in the outward half-plane stays opaque');
assert.ok(C.fadeAlpha(part,50,20)>0&&C.fadeAlpha(part,50,20)<1);
const later={...part,joint_fade:{start:{...part.joint_fade.start,onset:.5}}};
assert.equal(C.fadeAlpha(later,50,20),1,'Náběh keeps the configured core opaque');
assert.ok(C.fadeAlpha(later,50,12)>0&&C.fadeAlpha(later,50,12)<1,'Fade starts after Náběh');
assert.equal(C.fadeAlpha(later,50,0),0,'Náběh still reaches full transparency before the edge');
assert.equal(C.fadeAlpha(part,50,140),1,'Hand untouched');
const movedMask={...part,joint_fade:{start:{...part.joint_fade.start,offset:[0,20],angle:0}}};
assert.equal(C.fadeAlpha(movedMask,50,60),1,'Offset moves the solid center');
assert.ok(C.fadeAlpha(movedMask,50,40)<C.fadeAlpha(part,50,40));
const rotatedMask={...part,joint_fade:{start:{...part.joint_fade.start,offset:[0,0],angle:90}}};
assert.notEqual(C.fadeAlpha(rotatedMask,70,60),C.fadeAlpha(part,70,60));
for(const end of ['start','end'])for(const radius of [10,40,100])for(const angle of [-90,0,110]){
  const p={...part,joint_fade:{[end]:{strength:1,radius,angle,offset:[7,-9],direction:'outward'}}},g=C.fadeGeometry(p,end);
  assert.deepEqual(g.center,[p[end][0]+7,p[end][1]-9]);assert.deepEqual(g.center,g.anchor);
  assert.equal(C.fadeAlpha(p,...g.center),1);
  assert.equal(C.fadeAlpha(p,g.center[0]-g.ux*(radius+1),g.center[1]-g.uy*(radius+1)),1,'Translated/rotated mask never extends beyond radius');
}
assert.equal(C.fadeAlpha(part,0,120),1,'Whole inward half untouched');
const inverse={...part,joint_fade:{start:{...part.joint_fade.start,direction:'inward'}}};
assert.equal(C.fadeAlpha(inverse,50,0),1);assert.ok(C.fadeAlpha(inverse,50,60)<1);assert.equal(C.fadeAlpha(inverse,50,80),0);
const endOnly={...part,joint_fade:{end:{strength:1,radius:20,direction:'outward'}}};
assert.equal(C.fadeAlpha(endOnly,50,40),1);assert.equal(C.fadeAlpha(endOnly,50,140),1);assert.equal(C.fadeAlpha(endOnly,50,160),0);
const skin={layers:['nearForearm','torso'],parts:{nearForearm:{...part,joint_fade:{}},torso:part}};
const clip={frames:[R.neutral(),R.neutral()],fps:6};
assert.equal(C.fadeAlpha(C.partFor(skin,'torso',{}),50,0),0,'Torso fades render too');
let changed=E.fadeChange(clip,skin,0,'nearForearm','start',{strength:.6},'frame');
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(changed.clip,0))).strength,.6);
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(changed.clip,1))).strength,0);
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(changed.clip,1.5))).strength,.3,'Last to first fade interpolation');
changed=E.fadeChange(changed.clip,changed.skin,1,'nearForearm','start',{strength:.2},'all');
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(changed.clip,0))).strength,.2);
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(changed.clip,1))).strength,.2);
assert.equal(changed.clip.frame_edits,undefined,'Global fade removes the selected endpoint override');
E.validateEdits(changed.clip,changed.skin);
const reset=E.resetFrame(changed.clip,0);
assert.equal(C.fadeFor(C.partFor(changed.skin,'nearForearm',C.sample(reset,0))).strength,.2);
assert.deepEqual(clip,{frames:[R.neutral(),R.neutral()],fps:6});assert.deepEqual(skin.parts.nearForearm.joint_fade,{});
for(const key of sourceSkin.layers){
  assert.ok(C.canFade(key),`${key}: every bitmap part supports fades`);
  for(const end of ['start','end'])for(const scope of ['frame','all']){
    const result=E.fadeChange(clip,sourceSkin,0,key,end,{strength:.7},scope);
    assert.equal(C.fadeFor(C.partFor(result.skin,key,C.sample(result.clip,0)),end).strength,.7);
    assert.equal(C.fadeFor(C.partFor(result.skin,key,C.sample(result.clip,1)),end).strength,scope==='all'?.7:C.fadeFor(sourceSkin.parts[key],end).strength);
    const other=end==='start'?'end':'start';
    assert.deepEqual(C.fadeFor(result.skin.parts[key],other),C.fadeFor(sourceSkin.parts[key],other));
  }
}
for(const bad of [null,[],{x:{}},{start:{strength:NaN,radius:4,direction:'outward'}},{start:{strength:.5,radius:0,direction:'outward'}},{start:{strength:.5,radius:4,direction:'outward',shape:'triangle'}},{start:{strength:.5,radius:4,direction:'outward',onset:.96}}])assert.throws(()=>C.validateFade(bad));
// Actual RGBA multiplication, original retained, bounded cache, detail and game coordinates.
function surface(w,h){let pixels;return {width:w,height:h,getContext:()=>({drawImage(){},getImageData:()=>({data:new Uint8ClampedArray(w*h*4).fill(255)}),putImageData:d=>{pixels=d.data;}}),get pixels(){return pixels;}};}
const img={width:100,height:160},masked=C.fadedImage(img,part,()=>surface(100,160));
assert.equal(masked.pixels[3],255,'Outside half-disc unchanged in rendered RGBA');
assert.ok(masked.pixels[(0*100+50)*4+3]<10);assert.equal(masked.pixels[(39*100+50)*4+3],255);assert.equal(masked.pixels[(140*100+50)*4+3],255);
assert.equal(C.fadedImage(img,part,()=>{throw Error('Cache miss');}),masked);
const low=C.fadedImage({width:10,height:16},part,()=>surface(10,16));
assert.equal(low.pixels[(14*10+5)*4+3],255);assert.equal(low.pixels[3],255);
assert.ok(low.pixels[(0*10+5)*4+3]>20&&low.pixels[(0*10+5)*4+3]<50,'Game resolution keeps the proportional final pixel instead of a broad uniform cap');
const disabled={...part,joint_fade:{start:{...part.joint_fade.start,strength:0}}};
assert.equal(C.fadedImage(img,disabled,()=>{throw Error('Unnecessary surface');}),img);
console.log('PASS: edge-centered semicircle alpha, direction, ends, scope, reset, cyclic interpolation, immutable sources and both texture resolutions.');

// --- Doběh: druhý zlom, od kterého je zprůhlednění naplno ---------------------
// Díl 100×160, přechod uchycený nahoře a mířící ven z dílu (k záporným y).
const span=(outset,extra={})=>({...part,joint_fade:{start:{strength:1,radius:40,direction:'outward',onset:.15,...(outset?{outset}:{}),...extra}}});

// Bez doběhu zůstává původní chování, na kterém stojí hotová grafika.
assert.equal(C.fadeAlpha(span(0),50,0),0,'Bez doběhu se plné průhlednosti dosáhne až na hranici');
assert.equal(C.fadeAlpha(span(0),50,-1),1,'Bez doběhu je díl za hranicí zase plný');

// S doběhem 25 % končí přechod v 75 % hloubky, tedy 30 px od uchycení (y = 10).
const faded=span(.25);
assert.equal(C.fadeAlpha(faded,50,40),1,'Uchycení zůstává plné i s doběhem');
assert.ok(C.fadeAlpha(faded,50,20)>0&&C.fadeAlpha(faded,50,20)<1,'Mezi náběhem a doběhem je plynulý přechod');
assert.equal(C.fadeAlpha(faded,50,10),0,'V místě doběhu je zprůhlednění už naplno');
assert.equal(C.fadeAlpha(faded,50,5),0,'Za doběhem plato pokračuje');
assert.equal(C.fadeAlpha(faded,50,-5),0,'Plato platí i za hranicí R1, takže konec dílu zmizí');
assert.equal(C.fadeAlpha(faded,50,80),1,'Druhá polovina dílu zůstává nedotčená');

// Doběh musí respektovat sílu: při 60 % se plato drží na 0.4, ne na nule.
const partial=span(.25,{strength:.6});
assert.ok(Math.abs(C.fadeAlpha(partial,50,5)-.4)<1e-9,'Plato drží zvolenou sílu, ne vždy nulu');

// Prolínání mezi snímky musí doběh přenést, jinak by v půlce animace zmizel.
const mixed=C.partFor({parts:{head:span(.4)},layers:['head']},'head',
  {part_edits:{head:{fade_mix:{a:span(.2).joint_fade,b:span(.4).joint_fade,t:.5}}}});
assert.ok(Math.abs(mixed.joint_fade.start.outset-.3)<1e-9,'Doběh se mezi snímky interpoluje');
console.log('PASS: doběh přechodu — plato, zpětná kompatibilita, síla i prolínání snímků.');
