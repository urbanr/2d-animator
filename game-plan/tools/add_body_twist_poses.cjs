// Append through the server's save lock; never replace existing or user-edited clips.
const R=require('../tool/pose-rig.js');
const base='http://127.0.0.1:8765';
const clips=process.argv.includes('--zombie')?R.zombieClips():process.argv.includes('--reference-gait')?R.referenceGaitClips():R.bodyTwistClips({softShoulders:process.argv.includes('--soft-shoulders')});
(async()=>{
  const response=await fetch(base+'/graphics/kostry/skeletons.json');
  if(!response.ok)throw Error('Knihovna není dostupná.');
  const library=await response.json();
  for(const clip of clips) {
    if(library.archived_clips?.some(c=>c.name===clip.name))throw Error('Tato varianta byla uživatelem odstraněna: '+clip.name);
    const existing=Object.values(library.clips).find(c=>c.name===clip.name);
    if(existing){console.log('Zachováno: '+existing.name+' ('+existing.id+')');continue;}
    const saved=await fetch(base+'/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({kind:'clip',...clip})});
    const result=await saved.json();
    if(!saved.ok||!result.ok)throw Error(result.error||'Uložení selhalo.');
    console.log('Přidáno: '+result.record.name+' ('+result.record.id+')');
  }
  const checked=await fetch(base+'/graphics/kostry/skeletons.json');
  if(!checked.ok)throw Error('Nelze ověřit uloženou knihovnu.');
  const after=await checked.json();
  for(const section of ['clips','poses'])for(const [id,record] of Object.entries(library[section]))
    if(JSON.stringify(after[section][id])!==JSON.stringify(record))throw Error('Původní záznam byl změněn: '+id);
  for(const clip of clips) {
    const saved=Object.values(after.clips).find(c=>c.name===clip.name);
    if(!saved||saved.frames.length!==8)throw Error('Nová smyčka chybí: '+clip.name);
  }
  console.log(`Ověřeno: ${clips.length} smyček uložených, všechny původní animace a pózy zachované.`);
})().catch(error=>{console.error(error);process.exitCode=1;});
