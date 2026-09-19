/* Rozdělená banka animací: index + items/<id>.json + trash/<token>.json.
   Skládá zpět tvar, na který je zbytek editoru zvyklý. Protějšek tools/animation_store.py. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.AnimationStore=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const isStub=entry=>!!entry&&typeof entry==='object'&&typeof entry.file==='string';

  /* getJSON dostane cestu relativní k adresáři banky; base končí lomítkem. */
  async function load(getJSON,base){
    const index=await getJSON(base+'animations.json');
    const entries=index.finished_animations||{};
    const ids=Object.keys(entries).filter(id=>isStub(entries[id]));
    const records=await Promise.all(ids.map(id=>getJSON(base+entries[id].file)));
    const finished={...entries};
    ids.forEach((id,i)=>{finished[id]=records[i];});

    // Koš: `record_id` a `name` jsou jen zkratka pro výpis, v původním záznamu nebyly
    // a musí zmizet, jinak se rozejde expectedRecord při obnově.
    const trash={...(index.trash||{})};
    const tokens=Object.keys(trash).filter(token=>isStub(trash[token]));
    const deleted=await Promise.all(tokens.map(token=>getJSON(base+trash[token].file)));
    tokens.forEach((token,i)=>{
      const entry={...trash[token]};
      delete entry.file;delete entry.record_id;delete entry.name;
      entry.record=deleted[i];
      trash[token]=entry;
    });
    return {...index,finished_animations:finished,trash};
  }
  return {load,isStub};
});
