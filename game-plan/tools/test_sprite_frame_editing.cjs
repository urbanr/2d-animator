const assert = require('node:assert/strict');
const {moveFrame} = require('../tool/sprite-frame-editing.js');
for (let current = 0; current < 8; current++) {
  for (const direction of [-1, 1]) {
    const item = {
      frames: Array.from({length: 8}, (_, i) => `frame-${i}`),
      frameOrder: Array.from({length: 8}, (_, i) => i + 1),
      frameOffsets: Array.from({length: 8}, (_, i) => ({x: i, y: -i})),
    };
    const original = JSON.stringify(item);
    const next = moveFrame(item, current, direction);
    assert.equal(next, (current + direction + 8) % 8);
    assert.equal(item.frames[next], `frame-${current}`);
    assert.equal(item.frameOrder[next], current + 1);
    assert.deepEqual(item.frameOffsets[next], {x: current, y: -current});
    assert.equal(new Set(item.frameOrder).size, 8);
    for (let i = 0; i < 8; i++) {
      assert.equal(item.frames[i], `frame-${item.frameOrder[i] - 1}`);
      assert.equal(item.frameOffsets[i].x, item.frameOrder[i] - 1);
    }
    assert.equal(moveFrame(item, next, -direction), current);
    assert.equal(JSON.stringify(item), original);
  }
}
console.log('16 adjacent swaps including both wraparound boundaries passed.');
