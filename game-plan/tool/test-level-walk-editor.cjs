const assert = require('node:assert/strict');
const fs = require('node:fs');
const vm = require('node:vm');
function element() {
  return {style: {}, children: [], listeners: {}, setAttribute() {},
    append(...children) { this.children.push(...children); },
    addEventListener(name, callback) { this.listeners[name] = callback; }};
}
let stored, fail = false;
const context = vm.createContext({
  document: {createElement: element}, setTimeout, clearTimeout,
  fetch: async (url, request) => {
    assert.equal(url, '/api/level-walk-line');
    if (fail) return {ok: false};
    stored = JSON.parse(request.body);
    return {ok: true, json: async () => ({ok: true, walkLine: {y: stored.y, reviewed: true}})};
  }
});
vm.runInContext(fs.readFileSync(__dirname + '/level-walk-editor.js', 'utf8'), context);
const item = {id:'test', variant:'v2', name:'Test', size:[200,100], walkLine:{y:0.6, reviewed:false}};
const preview = element();
const controls = context.createWalkEditor(item, preview);
const [label, up, down, save, status] = controls.children;
const wait = () => new Promise(resolve => setTimeout(resolve, 280));
(async () => {
  up.listeners.click({shiftKey:false});
  await wait();
  assert.equal(stored.y, 0.59);
  assert.equal(status.textContent, 'Uloženo');
  down.listeners.click({shiftKey:true});
  await wait();
  assert.ok(Math.abs(stored.y - 0.69) < 1e-10);
  const reopened = context.createWalkEditor({...item, walkLine:{y:stored.y, reviewed:true}}, element());
  assert.match(reopened.children[0].textContent, /69.0/);
  fail = true;
  down.listeners.click({shiftKey:false});
  await wait();
  assert.match(status.textContent, /Neuloženo/);
  fail = false;
  save.listeners.click();
  await wait();
  assert.equal(status.textContent, 'Uloženo');
  assert.ok(Math.abs(stored.y - 0.70) < 1e-10);
  console.log('Walking line: arrow steps, Shift, save, reload state, failure and retry passed.');
})().catch(error => {console.error(error); process.exitCode = 1;});
