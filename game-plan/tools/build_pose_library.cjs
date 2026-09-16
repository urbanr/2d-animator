// Seed only when missing; never overwrite manually saved poses or cycles.
const fs = require('node:fs');
const path = require('node:path');
const rig = require('../tool/pose-rig.js');
const root = path.resolve(__dirname, '../graphics/poses');
fs.mkdirSync(root, {recursive:true});
const file = path.join(root, 'poses.json');
if (!fs.existsSync(file)) fs.writeFileSync(file, JSON.stringify(rig.presets(), null, 2)+'\n');
const library = JSON.parse(fs.readFileSync(file, 'utf8'));
fs.mkdirSync(path.join(root,'templates'),{recursive:true});
for(const id of ['walk-v1','sprint-v1']) {
  library.clips[id].frames.forEach((frame,i)=>{
    const output=path.join(root,'templates',id+'-'+String(i+1).padStart(2,'0')+'.svg');
    if(!fs.existsSync(output)) fs.writeFileSync(output,rig.svg(frame));
  });
}
console.log('Pose library: '+Object.keys(library.clips).length+' animations, '+Object.keys(library.poses).length+' poses.');
