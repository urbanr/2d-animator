// Freeze the saved editable poses used for each ImageGen experiment.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const R=require('../tool/pose-rig.js');
const root=path.resolve(__dirname,'..'),library=JSON.parse(fs.readFileSync(path.join(root,'graphics/poses/poses.json')));
const modes=[['walk','Chůze · přirozený krok v4'],['sprint','Sprint · odraz a let v4'],['zombie','Zombie · šouravá chůze v1']];
const args=process.argv.slice(2), chosen=args.includes('--mode')?args[args.indexOf('--mode')+1]:null;
const version=args.includes('--version')?args[args.indexOf('--version')+1]:'v1';
if(chosen&&!modes.some(([mode])=>mode===chosen))throw Error('Unknown mode');
if(!/^v[1-9][0-9]*$/.test(version))throw Error('Invalid version');
for(const [mode,name] of modes.filter(([mode])=>!chosen||chosen===mode)) {
  const clip=Object.values(library.clips).find(c=>c.name===name);if(!clip)throw Error(name);
  const dir=path.join(root,'graphics/bezec','pose-'+mode+'-'+version,'references');fs.mkdirSync(dir,{recursive:true});
  const snapshot=path.join(dir,'poses.json');if(fs.existsSync(snapshot))throw Error('Existing immutable reference: '+snapshot);
  fs.writeFileSync(snapshot,JSON.stringify({clip,mirrored_for_screen_left:true,cell:[512,640],guide_scale:1.4},null,2)+'\n');
  const cells=clip.frames.map((p,i)=>{
    const drawing=R.svg(p,{ground:false,lengths:clip.rig_lengths}).replace(/^<svg[^>]*><rect[^>]*\/>/,'').replace(/<\/svg>$/,'');
    return `<g transform="translate(${i%4*512} ${Math.floor(i/4)*640})"><g transform="translate(614.4 -18) scale(-1.4 1.4)">${drawing}</g><text x="256" y="610" text-anchor="middle" font-family="sans-serif" font-size="24" fill="white">${i+1}</text></g>`;
  });
  const svg=`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="1280" viewBox="0 0 2048 1280"><rect width="2048" height="1280" fill="#505050"/>${cells.join('')}</svg>`;
  fs.writeFileSync(path.join(dir,'pose-guide.svg'),svg);
  cp.execFileSync('rsvg-convert',[path.join(dir,'pose-guide.svg'),'-o',path.join(dir,'pose-guide.png')]);
  const action=mode==='walk'?'NORMAL WALK: upright body, planted nearly straight support knee, small relaxed arm swings; no running or hopping.':mode==='sprint'?'SPRINT: torso lean, active drive and push-off, deeply folded recovering leg, airborne frames 4 and 8; energetic opposing arms.':'ZOMBIE SHUFFLE: short slow dragging steps, forward stoop, BOTH arms reaching loosely forward, lowered head, no flight. This is the SAME runner acting like a zombie, not a redesigned zombie character.';
  const prompt=`Use case: identity-preserve. Game sprite animation experiment, eight distinct full-color drawings.
Image 1 is the CHARACTER IDENTITY reference only: preserve this exact Běžec, his goggle face, spiky orange-black hair, red headband, torn red striped tracksuit, metal knee pads, RED sneaker on the camera-near leg, BROWN boot on camera-far leg, orange tank and hose, stopwatch, bold black comic ink and painted colors. Do not copy its running poses.
Image 2 is the AUTHORITATIVE POSE/FRAME LAYOUT guide: dress each numbered skeleton in the exact character from image 1. Red skeleton arm/leg means camera-near arm/RED sneaker leg; green means camera-far arm/BROWN boot leg. Keep all original costume colors; do not paint arms or legs green. Follow every joint, especially hip, knee, ankle and arm positions and limb overlaps. Keep the character's own anatomical proportions while following these joint angles and overall silhouette. These are eight ordered stages, top row 1-4 and bottom row 5-8, not alternative characters. ${action}
Output exactly 2048x1280, 4 columns x 2 rows of 512x640 cells. All characters face LEFT as the guide does. Keep the same bodily scale in every cell and in all three movement variants: roughly 400-420px standing body height; crouch changes posture, not bone lengths or head size. Head/body scale matches the current identity reference. Roomy cells: character and every hose/headband/shoe wholly inside its cell, no neighbor fragments; at least 32px left/right and 80px top/bottom space. The guide figures occupy the desired positions: feet near local y=528, hips near x=256. Do not shrink artwork to increase gaps. Enlarge canvas instead if required.
Background uniformly fully opaque RGB(80,80,80), #505050. No ground shadow, ground line, text, numbers, skeleton lines or grid in output. Do not draw the guide colors. Preserve crisp heavy black outside and internal lines, no pixelation.
The near and far thighs visibly alternate at their OWN hips. Never simulate alternation by changing the shoe colors. Frame 5 is the opposite-leg phase of frame 1. Follow the guide's distinct frame 8, not a duplicate of frame 1; the transition 7 to 8 to 1 must progress continuously. Natural vertical motion is encoded by the guide; do not invent random scale/baseline shifts. Character identity, accessories and scale remain constant. Eight poses only; no added elements.\n`;
  fs.writeFileSync(path.join(dir,'prompt.txt'),prompt);
  console.log(mode+': '+dir);
}
