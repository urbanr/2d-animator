const assert=require('node:assert/strict'),E=require('./cutout-editor.js'),R=require('./pose-rig.js');
const p=R.neutral();
assert.deepEqual(E.selectedHandleKeys(p,'missing'),[]);
assert.ok(E.selectedHandleKeys(p,'nearElbow').includes('nearElbow'));
assert.ok(E.selectedHandleKeys(p,'nearElbow').includes('nearShoulder'));
assert.ok(!E.selectedHandleKeys(p,'nearElbow').includes('farElbow'));
assert.ok(E.selectedHandleKeys(p,'head').includes('neck'));
for(const side of ['near','far'])for(const joint of ['Shoulder','Elbow','Hip','Knee','Foot']){
  assert.equal(E.handleForBone(E.boneForHandle(side+joint)),side+joint);
}
assert.equal(E.handleForBone('head'),'head');assert.equal(E.handleForBone('torso'),'bodyY');
console.log('PASS: skeleton selection endpoints and skeleton/bitmap mapping.');
