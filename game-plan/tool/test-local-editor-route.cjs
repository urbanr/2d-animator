const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict');
for(const [script,page] of [['preview.js','preview.html'],['preview-bridge.js','characters2.html']]){
  let target;const location=new URL(`file:///tmp/project/tool/${page}?sekce=postavy2#test`);location.replace=url=>target=url;
  vm.runInNewContext(fs.readFileSync(__dirname+'/'+script,'utf8'),{location,URL,URLSearchParams,document:{createElement:()=>({}),head:{append(){}}}});
  assert.equal(target,`http://127.0.0.1:8765/tool/preview.html?sekce=${page==='characters2.html'?'animator':'postavy2'}#test`);
}
console.log('PASS: file preview and direct editor links route to the local save server, retaining section/hash.');
