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
assert.match(header,/^<h1>Animátor[^<]*<\/h1>$/);
const selection=html.match(/<div class="selection-bar"[\s\S]*?<\/div>\s*<main>/)[0];
for(const id of ['gameCharacter','characterAnimation','updateCharacter','saveCharacter','deleteCharacter','updateAnimation','save','deleteAnimation'])assert.ok(selection.includes(`id="${id}"`));
assert.match(html,/\.selection-bar\{display:grid;grid-template-columns:minmax\(0,1fr\) minmax\(0,1fr\)/);
assert.match(html,/id="assignAnimation"[^>]*>↳ Přiřadit k postavě/);
assert.match(html,/width:calc\(2ch \+ 18px\)/);
// Compact display does not narrow the accepted values or lose existing controls.
assert.match(html,/id="moveSpeed"[^>]*max="1000"[^>]*step="0.1"/);
const ids=[...html.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]);assert.equal(new Set(ids).size,ids.length);
for(const help of ['helpFade','helpSpeed','helpTravel'])assert.match(html,new RegExp(`<summary>(?:(?!</summary>)[\\s\\S])*id="${help}"`));
for(const [header,help] of [['toolGrip','helpControls'],['partsGrip','helpLayers']])assert.match(html,new RegExp(`<header id="${header}">(?:(?!</header>)[\\s\\S])*id="${help}"`));
assert.match(html,/id="stageResize"[^>]*aria-label="Změnit výšku náhledu"/);
const aside=html.split('<aside class="panel">')[1];
assert.deepEqual([...aside.matchAll(/<details id="([^"]+)"/g)].slice(0,3).map(m=>m[1]),['motionSection','switchesSection','fadePanel']);
assert.ok(!html.split('<aside class="panel">')[0].includes('id="fadePanel"'));
assert.match(html,/id="helpFade" role="tooltip">Vyber bitmapový díl/);
assert.match(html,/#fadePanel label\{display:flex;flex-direction:column/);
assert.match(html,/#fadePanel input\[type=number\]\{width:40px/);
assert.match(html,/\.help\.help-open \.help-text\{display:block\}/);assert.doesNotMatch(html,/\.help:hover \.help-text/);
assert.match(html,/#stageWrap\{width:100%/);assert.match(html,/#stage\{max-width:none;max-height:none;width:100%;height:auto/);
assert.match(html,/id="lean"[^>]*min="-180"[^>]*max="180"/);
console.log('PASS: Animator title, compact character/animation row, icon actions, speed row and collapsed panels.');
