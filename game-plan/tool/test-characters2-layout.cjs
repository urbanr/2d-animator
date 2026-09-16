const fs=require('node:fs'),assert=require('node:assert/strict');
const html=fs.readFileSync(__dirname+'/characters2.html','utf8');
for(const tag of html.matchAll(/<details\b[^>]*>/g))assert.ok(!/\sopen(?:\s|=|>)/.test(tag[0]),'All disclosure sections start collapsed');
for(const [button,body] of [['toolCollapse','toolBody'],['partsCollapse','partsBody']]){
  assert.match(html,new RegExp(`id="${button}"[^>]*aria-expanded="false"`));
  assert.match(html,new RegExp(`id="${body}"[^>]* hidden`));
}
const motion=html.match(/<details id="motionSection">([\s\S]*?)<\/details>/)[1];
const row=motion.match(/<div class="speed-row">([\s\S]*?)<\/div>/)[1];
for(const id of ['fps','moveSpeed','spread','rateDelta'])assert.ok(row.includes(`id="${id}"`));
assert.match(row,/<label>Tempo \(sn\.\/s\)<input/);
const switches=html.match(/<details id="switchesSection">([\s\S]*?)<\/details>/)[1];
for(const id of ['travel','smooth','bones','edit','resizeBones'])assert.ok(switches.includes(`id="${id}"`));
assert.ok(!motion.includes('id="travel"'));
const header=html.match(/<header class="page-header">([\s\S]*?)<\/header>/)[1];
assert.match(header,/^<h1>[^<]+<\/h1>$/);
assert.match(html,/width:calc\(2ch \+ 18px\)/);
// Compact display does not narrow the accepted values or lose existing controls.
assert.match(html,/id="moveSpeed"[^>]*max="1000"[^>]*step="0.1"/);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const help of ['helpFade','helpSpeed','helpTravel'])assert.match(html,new RegExp(`<summary>(?:(?!</summary>)[\\s\\S])*id="${help}"`));
for(const [header,help] of [['toolGrip','helpControls'],['partsGrip','helpLayers']])assert.match(html,new RegExp(`<header id="${header}">(?:(?!</header>)[\\s\\S])*id="${help}"`));
assert.match(html,/id="stageResize"[^>]*aria-label="Změnit výšku náhledu"/);
console.log('PASS: compact speed row, single-line heading, separate controls and all panels collapsed.');
