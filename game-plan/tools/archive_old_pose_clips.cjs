// User-requested seven exact clips. Run only while the local saving server is stopped.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const root=path.resolve(__dirname,'../graphics/poses'),file=path.join(root,'poses.json');
const targets={
  'walk-v1':'Chůze · výchozí','sprint-v1':'Sprint · výchozí',
  '9d762e0b-b171-4126-85a2-4e28d4c43096':'Chůze · ramena a pánev v2',
  '1bd47f4e-fc56-455b-a5b2-5fb9a6ce003b':'Sprint · ramena a pánev v2',
  '7e7bd1eb-9951-4e09-905d-d104be5c5615':'Chůze · jemnější ramena v3',
  'be92a91e-14d9-44a9-8658-2d6c070bae01':'Sprint · jemnější ramena v3',
  'dbde411b-d5a3-4541-bb24-d1146d6a5c2c':'Chůze · jemnější ramena v3 · moje verze'
};
const bytes=fs.readFileSync(file),library=JSON.parse(bytes);
for(const [id,name] of Object.entries(targets))if(library.clips[id]?.name!==name)throw Error('Target changed or missing: '+id);
if(!process.argv.includes('--apply')){console.log(Object.values(targets).join('\n'));process.exit(0);}
const backup='archives/removed-old-clips-'+crypto.randomUUID()+'.json';
fs.mkdirSync(path.join(root,'archives'),{recursive:true});
fs.writeFileSync(path.join(root,backup),bytes,{flag:'wx'});
library.archived_clips??=[];
for(const [id,name] of Object.entries(targets)) {
  delete library.clips[id];library.archived_clips.push({id,name,backup});
}
const temporary=file+'.archive.tmp';fs.writeFileSync(temporary,JSON.stringify(library,null,2)+'\n',{flag:'wx'});
if(!fs.readFileSync(file).equals(bytes))throw Error('Library changed; stopped without replacing it.');
fs.renameSync(temporary,file);
console.log(JSON.stringify({removed:Object.keys(targets).length,backup,remaining:Object.values(library.clips).map(c=>c.name)},null,2));
