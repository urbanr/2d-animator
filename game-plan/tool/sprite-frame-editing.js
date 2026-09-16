/* Frame order uses stable one-based source IDs; offsets follow playback slots. */
(function(root) {
  function moveFrame(item, current, direction) {
    const count = item.frames.length;
    if (count < 2) return current;
    const next = (current + direction + count) % count;
    for (const values of [item.frames, item.frameOrder, item.frameOffsets]) {
      [values[current], values[next]] = [values[next], values[current]];
    }
    return next;
  }
  const api = {moveFrame};
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  else root.SpriteFrameEditing = api;
})(typeof window === 'undefined' ? globalThis : window);
