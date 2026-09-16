// Reproducible raster proof of the same bitmap attachment matrices as the browser.
const fs=require('node:fs'),path=require('node:path'),cp=require('node:child_process');
const C=require('../tool/cutout-rig.js');
const base=path.resolve(__dirname,'../graphics/bitmapove-predlohy/bezec-zombie-v1');
const skin=JSON.parse(fs.readFileSync(path.join(base,'skin.json')));
const library=JSON.parse(fs.readFileSync(path.resolve(__dirname,'../graphics/kostry/skeletons.json')));
const clip=library.clips[skin.default_clip];
const suffix=process.argv[2]||'preview-snapshot';
if(!/^preview-snapshot(?:-v[0-9]+)?$/.test(suffix))throw Error('Invalid snapshot name');
const out=path.join(base,suffix);
if(fs.existsSync(out))throw Error('Immutable snapshot exists');
fs.mkdirSync(out);
fs.writeFileSync(path.join(out,'clip.json'),JSON.stringify(clip,null,2)+'\n');
const images=Object.fromEntries(Object.entries(skin.parts).map(([k,v])=>[k,fs.readFileSync(path.join(base,v.file)).toString('base64')]));
function parts(p){const bones=C.bones(p,clip.rig_lengths);return skin.layers.map(k=>{const a=skin.parts[k];return `<image width="${a.size[0]}" height="${a.size[1]}" transform="matrix(${C.matrix(a,bones[k]).join(' ')})" xlink:href="data:image/png;base64,${images[k]}"/>`;}).join('');}
const svg=(w,h,body)=>`<svg xmlns="http://www.w3.org/2000/svg" xmlns:xlink="http://www.w3.org/1999/xlink" width="${w}" height="${h}">${body}</svg>`;
const frames=clip.frames.map((p,i)=>{const body=parts(p),file=path.join(out,`frame-${i+1}.svg`);fs.writeFileSync(file,svg(512,560,body));cp.execFileSync('rsvg-convert',[file,'-o',file.replace('.svg','.png')]);return `<g transform="translate(${i%4*512} ${Math.floor(i/4)*560})">${body}<text x="256" y="525" text-anchor="middle" fill="white" font-family="sans-serif" font-size="22">${i+1}</text></g>`;});
const sheet=path.join(out,'sheet.svg');fs.writeFileSync(sheet,svg(2048,1120,'<rect width="2048" height="1120" fill="#505050"/>'+frames.join('')));cp.execFileSync('rsvg-convert',[sheet,'-o',path.join(out,'sheet.png')]);
console.log(path.join(out,'sheet.png'));
