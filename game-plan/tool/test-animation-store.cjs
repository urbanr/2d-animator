const assert=require('node:assert/strict');
const fs=require('node:fs'),path=require('node:path');
const A=require('./animation-store.js');

const BANK=path.join(__dirname,'..','graphics','animace')+path.sep;
const getJSON=p=>Promise.resolve(JSON.parse(fs.readFileSync(p,'utf8')));

assert.equal(A.isStub({file:'items/a.json'}),true);
assert.equal(A.isStub({id:'a',frames:[]}),false);
assert.equal(A.isStub(null),false);

(async()=>{
  // Skládání proti skutečné bance: musí dát celé záznamy, ne stuby.
  const library=await A.load(getJSON,BANK);
  const index=JSON.parse(fs.readFileSync(BANK+'animations.json','utf8'));
  assert.deepEqual(Object.keys(library.finished_animations).sort(),
                   Object.keys(index.finished_animations).sort());
  for(const [id,record] of Object.entries(library.finished_animations)){
    assert.equal(record.id,id);
    assert.ok(Array.isArray(record.frames)&&record.frames.length>0,`${id} nemá snímky`);
    assert.ok(record.bitmap&&record.bitmap.parts,`${id} nemá bitmapu`);
    assert.equal('file' in record,false,`${id} zůstal stub`);
  }
  // Položky koše mají dva tvary: se smazaným záznamem (record) a odkaz na
  // historii verzí (record_id + history). Po složení nesmí zbýt žádný `file`.
  for(const entry of Object.values(library.trash)){
    assert.equal('file' in entry,false);
    if(entry.record){
      assert.ok(entry.record.id,'záznam v koši bez id');
      assert.equal('record_id' in entry,false,'smazaný záznam si nese zkratku navíc');
    }else{
      assert.ok(entry.history,'položka koše bez záznamu musí odkazovat na historii');
    }
  }
  // Index musí zůstat malý - to je celý smysl rozdělení.
  assert.ok(fs.statSync(BANK+'animations.json').size<40*1024,'index je moc velký');
  console.log('animation-store OK:',Object.keys(library.finished_animations).length,'animací,',
              Object.keys(library.trash).length,'v koši');
})();
