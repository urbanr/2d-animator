const assert=require('node:assert/strict'),E=require('./cutout-editor.js'),R=require('./pose-rig.js');
const clip={fps:8,frames:[R.neutral(),R.neutral()],frame_edits:{0:{parts:{attachment_a:{rotation:9},torso:{rotation:3}}},1:{parts:{attachment_a:{rotation:4}}}}};
const skin={layers:['torso','attachment_a','nearFoot'],parts:{
  torso:{label:'Trup',bone:'torso',start:[0,0],end:[0,40],size:[10,40],file:'t.png'},
  attachment_a:{label:'Trup · doplněk',source_part:'torso',bone:'nearThigh',start:[0,0],end:[0,40],size:[10,40],file:'t.png'},
  nearFoot:{label:'Bližší chodidlo',bone:'nearFoot',start:[0,0],end:[0,20],size:[8,20],file:'f.png'}}};
const before=JSON.stringify({clip,skin});
const out=E.removeAttachment(clip,skin,'attachment_a');
// Sources stay untouched: the edit is immutable like every other CutoutEditor operation.
assert.equal(JSON.stringify({clip,skin}),before);
assert.deepEqual(out.skin.layers,['torso','nearFoot']);
assert.equal(out.skin.parts.attachment_a,undefined);
// The source part of the skin survives; only the attachment is gone.
assert.ok(out.skin.parts.torso&&out.skin.parts.nearFoot);
// Frame exceptions of the removed part go with it; unrelated ones and their frames remain.
assert.deepEqual(out.clip.frame_edits,{0:{parts:{torso:{rotation:3}}}});
E.validateEdits(out.clip,out.skin);
// A part of the skin itself is never deletable here: it is only switched off.
assert.throws(()=>E.removeAttachment(clip,skin,'torso'),/předlohy/);
assert.throws(()=>E.removeAttachment(clip,skin,'missing'),/předlohy/);
// Removing the last attachment leaves no empty frame_edits behind.
const lone={...clip,frame_edits:{1:{parts:{attachment_a:{rotation:4}}}}};
assert.equal(E.removeAttachment(lone,skin,'attachment_a').clip.frame_edits,undefined);
console.log('PASS: attachment removal is immutable, prunes its frame exceptions, and never deletes skin parts.');
