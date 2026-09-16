const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const location=new URL('http://127.0.0.1:8765/tool/preview.html?sekce=pozy');
const events={},frames=[];
const nav=['bitmapove-sekvence','bitmapove-predlohy','animator','levely','pozy'].map(section=>({
  dataset:{section},attributes:{},
  addEventListener(type,fn){this[type]=fn;},
  setAttribute(k,v){this.attributes[k]=v;},removeAttribute(k){delete this.attributes[k];}
}));
const context={URL,URLSearchParams,location,history:{pushState(a,b,url){location.href=url.href;}},
  window:{addEventListener(type,fn){events[type]=fn;}},
  document:{querySelectorAll(){return nav;},getElementById(){return {append(frame){frames.push(frame);}};},
    createElement(){return {dataset:{},contentWindow:{postMessage(){}},contentDocument:{getElementById(){return {scrollIntoView(){}};}}};}}
};
vm.runInNewContext(fs.readFileSync(__dirname+'/preview.js','utf8'),context);
const click=section=>nav.find(n=>n.dataset.section===section).click({preventDefault(){}});
const navigate=(section,search='',hash='')=>events.message({origin:location.origin,source:frames[0].contentWindow,data:{type:'preview-navigate',section,search,hash}});
assert.equal(frames.length,1);
assert.match(frames[0].src,/poses.html\?embedded=1/);
frames[0].unsavedDraft='keep me';
click('levely');click('pozy');
assert.equal(frames.length,2);assert.equal(frames[0].hidden,false);
assert.equal(frames[0].unsavedDraft,'keep me');
assert.equal(nav[4].attributes['aria-current'],'page');
navigate('levely','?verze=composition-v2');
assert.equal(frames.length,3);assert.match(frames[2].src,/verze=composition-v2/);
click('pozy');click('levely');
assert.equal(frames.length,3);assert.equal(frames[2].hidden,false);
assert.equal(location.searchParams.get('verze'),'composition-v2');
navigate('levely','','#hrbitov-concept-v1');
assert.equal(frames.length,3);assert.equal(frames[1].hidden,false);
location.href='http://127.0.0.1:8765/tool/preview.html?sekce=pozy';events.popstate();
assert.equal(frames[0].hidden,false);assert.equal(frames[0].unsavedDraft,'keep me');
events.message({origin:'https://untrusted.example',source:frames[0].contentWindow,data:{type:'preview-navigate',section:'animator'}});
assert.equal(frames.length,3);
events.message({origin:location.origin,source:{},data:{type:'preview-navigate',section:'animator'}});
assert.equal(frames.length,3);
click('animator');assert.equal(frames.length,4);assert.match(frames[3].src,/characters2.html/);assert.doesNotMatch(frames[3].src,/index\.html/);
click('pozy');assert.equal(frames[0].unsavedDraft,'keep me');
click('animator');assert.equal(frames.length,4);assert.equal(frames[3].hidden,false);
navigate('postavy2');assert.equal(frames.length,4);assert.equal(frames[3].hidden,false);assert.equal(location.searchParams.get('sekce'),'animator');
click('bitmapove-predlohy');assert.equal(frames.length,5);assert.match(frames[4].src,/bitmap-templates\.html/);
console.log('PASS: navigation includes separate bitmap sequences and bitmap templates, plus the Animator aliases and retained state.');
