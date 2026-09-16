/* Bitmap attachments to PoseRig. Pure geometry shared by browser and tests. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./pose-rig.js'));
  else root.CutoutRig=factory(root.PoseRig);
})(typeof globalThis!=='undefined'?globalThis:this,function(R){
  'use strict';
  const mirror=p=>({x:512-p.x,y:p.y});
  const angleKeys=new Set(R.fields.filter(f=>f[4]==='°').map(f=>f[0]));
  const wrap=v=>((v+180)%360+360)%360-180;
  const canFade=key=>key==='head'||/^(near|far)(UpperArm|Forearm|Thigh|Shin|Foot)$/.test(key);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  function fadeFor(part,end='start'){
    const length=part.start&&part.end?Math.hypot(part.end[0]-part.start[0],part.end[1]-part.start[1]):100;
    return {strength:0,radius:Math.max(1,Math.min(Math.min(...(part.size||[100,100]))*.5,length*.45)),direction:'outward',offset:[0,0],angle:0,...part.joint_fade?.[end]};
  }
  function validateFade(value){
    const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(!obj(value)||Object.keys(value).some(k=>!['start','end'].includes(k)))throw Error('Neplatný přechod spoje.');
    for(const v of Object.values(value))if(!obj(v)||Object.keys(v).some(k=>!['strength','radius','direction','offset','angle'].includes(k))||
      !Number.isFinite(v.strength)||v.strength<0||v.strength>1||!Number.isFinite(v.radius)||v.radius<1||v.radius>2000||!['outward','inward'].includes(v.direction)||
      (v.angle!==undefined&&(!Number.isFinite(v.angle)||Math.abs(v.angle)>180))||
      (v.offset!==undefined&&(!Array.isArray(v.offset)||v.offset.length!==2||v.offset.some(n=>!Number.isFinite(n)||Math.abs(n)>2000))))throw Error('Neplatný přechod spoje.');
    return value;
  }
  // Alpha is evaluated in original bitmap coordinates, before any bone/bitmap transform.
  function fadeGeometry(part,end){
    const f=fadeFor(part,end),a=part[end],b=part[end==='start'?'end':'start'];
    const angle=Math.atan2(b[1]-a[1],b[0]-a[0])+f.angle*Math.PI/180+(f.direction==='inward'?Math.PI:0);
    const ux=Math.cos(angle),uy=Math.sin(angle),anchor=[a[0]+f.offset[0],a[1]+f.offset[1]];
    // Move the cap inward one radius: the painted joint end, not empty padding, fades.
    return {...f,anchor,center:[anchor[0]+ux*f.radius,anchor[1]+uy*f.radius],ux,uy,angle};
  }
  function fadeAlpha(part,x,y,geometry){
    if(!part.joint_fade)return 1;
    let alpha=1;
    for(const f of geometry||['start','end'].map(end=>fadeGeometry(part,end))){
      if(!f.strength)continue;
      const dx=x-f.center[0],dy=y-f.center[1],along=dx*f.ux+dy*f.uy;
      if(along>=0)continue;
      const t=clamp((Math.hypot(dx,dy)/f.radius-.25)/.75,0,1);
      alpha*=1-f.strength*t*t*(3-2*t);
    }
    return alpha;
  }
  const fadedImages=new WeakMap();
  function fadedImage(img,part,createCanvas){
    if(!['start','end'].some(end=>fadeFor(part,end).strength))return img;
    const signature=JSON.stringify([part.size,part.start,part.end,part.joint_fade]);
    let cache=fadedImages.get(img);if(!cache){cache=new Map();fadedImages.set(img,cache);}
    if(cache.has(signature))return cache.get(signature);
    const canvas=createCanvas?createCanvas():document.createElement('canvas');
    canvas.width=img.naturalWidth||img.width;canvas.height=img.naturalHeight||img.height;
    const ctx=canvas.getContext('2d',{willReadFrequently:true});ctx.drawImage(img,0,0);
    const data=ctx.getImageData(0,0,canvas.width,canvas.height),[w,h]=part.size,geometry=['start','end'].map(end=>fadeGeometry(part,end)).filter(f=>f.strength);
    for(let y=0;y<canvas.height;y++)for(let x=0;x<canvas.width;x++){
      const i=(y*canvas.width+x)*4+3;
      if(data.data[i])data.data[i]*=fadeAlpha(part,(x+.5)*w/canvas.width,(y+.5)*h/canvas.height,geometry);
    }
    ctx.putImageData(data,0,0);cache.set(signature,canvas);
    // Slider/drag edits must not retain an unbounded number of full-size textures.
    if(cache.size>4)cache.delete(cache.keys().next().value);
    return canvas;
  }
  function frameLengths(clip,index){
    return R.lengthsFor(clip,index);
  }
  function partFor(skin,key,pose){
    const part=skin.parts[key],edit=pose.part_edits?.[key]||{},offset=part.offset||[0,0];
    const joint_fade={...part.joint_fade,...edit.joint_fade};
    if(edit.fade_mix)for(const end of ['start','end']){
      const a={...fadeFor(part,end),...edit.fade_mix.a?.[end]},b={...fadeFor(part,end),...edit.fade_mix.b?.[end]},t=edit.fade_mix.t;
      joint_fade[end]={strength:a.strength+t*(b.strength-a.strength),radius:a.radius+t*(b.radius-a.radius),direction:t<.5?a.direction:b.direction,
        offset:[0,1].map(i=>(a.offset?.[i]||0)+t*((b.offset?.[i]||0)-(a.offset?.[i]||0))),angle:wrap((a.angle||0)+t*wrap((b.angle||0)-(a.angle||0)))};
    }
    return {...part,joint_fade:canFade(key)?joint_fade:{},pivot_offset:[0,1].map(i=>(part.pivot_offset?.[i]||0)+(edit.pivot_offset?.[i]||0)),offset:offset.map((v,i)=>v+(edit.offset?.[i]||0)),rotation:(part.rotation||0)+(edit.rotation||0),
      ...Object.fromEntries(['scale','scale_x','scale_y'].map(k=>[k,(part[k]||1)*(edit[k]||1)]))};
  }
  function sample(clip,phase,smooth=true){
    const n=clip.frames.length;if(!n)throw Error('Prázdná animace');
    const position=((phase%n)+n)%n,index=Math.floor(position),t=smooth?position-index:0;
    const a={...R.neutral(),...clip.frames[index]},b={...R.neutral(),...clip.frames[(index+1)%n]},p={};
    for(const [key] of R.fields){
      let delta=b[key]-a[key];
      if(angleKeys.has(key))delta=((delta+180)%360+360)%360-180;
      p[key]=a[key]+t*delta;
    }
    const la=frameLengths(clip,index),lb=frameLengths(clip,(index+1)%n);
    p.rig_lengths=Object.fromEntries(Object.keys(la).map(k=>[k,la[k]+t*(lb[k]-la[k])]));
    const pa=clip.frame_edits?.[index]?.parts||{},pb=clip.frame_edits?.[(index+1)%n]?.parts||{};
    p.part_edits={};
    for(const key of new Set([...Object.keys(pa),...Object.keys(pb)])){
      const a=pa[key]||{},b=pb[key]||{};
      p.part_edits[key]={offset:[0,1].map(i=>(a.offset?.[i]||0)+t*((b.offset?.[i]||0)-(a.offset?.[i]||0))),
        pivot_offset:[0,1].map(i=>(a.pivot_offset?.[i]||0)+t*((b.pivot_offset?.[i]||0)-(a.pivot_offset?.[i]||0))),
        ...(a.joint_fade||b.joint_fade?{fade_mix:{a:a.joint_fade,b:b.joint_fade,t}}:{}),
        rotation:(a.rotation||0)+t*wrap((b.rotation||0)-(a.rotation||0)),
        ...Object.fromEntries(['scale','scale_x','scale_y'].map(k=>[k,(a[k]||1)+t*((b[k]||1)-(a[k]||1))]))};
    }
    return p;
  }
  function bones(pose,lengths){
    const p={...R.neutral(),...pose},g=R.points(p,lengths),b={};
    const pair=(a,z)=>[mirror(a),mirror(z)];
    b.torso=pair(g.shoulderCenter,g.hipCenter);
    b.head=pair(g.headBase,g.headCenter);
    // Pelvis and shoulders are attachment guides, never bitmap body parts.
    const [s,h]=b.torso,dx=h.x-s.x,dy=h.y-s.y,len=Math.hypot(dx,dy);
    const offset={x:dy/len*27,y:-dx/len*27};
    b.backpack=[{x:s.x+offset.x,y:s.y+offset.y},{x:h.x+offset.x,y:h.y+offset.y}];
    for(const side of ['far','near']){
      const v=g[side];
      b[side+'UpperArm']=pair(v.shoulder,v.elbow);
      b[side+'Forearm']=pair(v.elbow,v.hand);
      b[side+'Thigh']=pair(v.hip,v.knee);
      b[side+'Shin']=pair(v.knee,v.ankle);
      b[side+'Foot']=pair(v.ankle,v.toe);
    }
    return b;
  }
  function matrix(part,bone){
    const [a,z]=bone,[sx,sy]=part.start,[ex,ey]=part.end;
    const ux=ex-sx,uy=ey-sy,vx=z.x-a.x,vy=z.y-a.y,den=ux*ux+uy*uy;
    if(den<0.0001)throw Error('Attachment has zero length');
    // Bone similarity transform, followed by optional independent bitmap width/height.
    const bc=(vx*ux+vy*uy)/den,bs=(vy*ux-vx*uy)/den;
    const rad=(part.rotation||0)*Math.PI/180,scale=part.scale||1;
    const c=scale*(bc*Math.cos(rad)-bs*Math.sin(rad)),s=scale*(bs*Math.cos(rad)+bc*Math.sin(rad));
    const [ox,oy]=part.offset||[0,0];
    const ax=c*(part.scale_x||1),ay=s*(part.scale_x||1),bx=-s*(part.scale_y||1),by=c*(part.scale_y||1);
    // Independent bitmap rotation center. Scaling and skeleton attachments stay unchanged.
    const [px,py]=part.pivot_offset||[0,0],dx=scale*(part.scale_x||1)*px,dy=scale*(part.scale_y||1)*py;
    const tx=dx-Math.cos(rad)*dx+Math.sin(rad)*dy,ty=dy-Math.sin(rad)*dx-Math.cos(rad)*dy;
    return [ax,ay,bx,by,a.x-ax*sx-bx*sy+bc*(ox+tx)-bs*(oy+ty),a.y-ay*sx-by*sy+bs*(ox+tx)+bc*(oy+ty)];
  }
  function repivot(part,pivot_offset){
    const old=part.pivot_offset||[0,0],r=(part.rotation||0)*Math.PI/180;
    const dx=(pivot_offset[0]-old[0])*(part.scale||1)*(part.scale_x||1),dy=(pivot_offset[1]-old[1])*(part.scale||1)*(part.scale_y||1);
    const o=part.offset||[0,0];
    return {pivot_offset,offset:[o[0]+Math.cos(r)*dx-Math.sin(r)*dy-dx,o[1]+Math.sin(r)*dx+Math.cos(r)*dy-dy]};
  }
  function movePivot(part,bone,dx,dy){
    const [a,b,c,d]=matrix(part,bone),det=a*d-b*c,old=part.pivot_offset||[0,0];
    return [old[0]+(d*dx-c*dy)/det,old[1]+(-b*dx+a*dy)/det].map(v=>clamp(v,-2000,2000));
  }
  // Offsets live in bitmap-local pixels, following the bone in every pose.
  function moveAttachment(part,bone,dx,dy){
    const [c,s]=matrix({...part,rotation:0,scale:1,scale_x:1,scale_y:1},bone),den=c*c+s*s,[x,y]=part.offset||[0,0];
    return {...part,offset:[x+(c*dx+s*dy)/den,y+(-s*dx+c*dy)/den].map(v=>Math.max(-2000,Math.min(2000,Math.round(v*100)/100)))};
  }
  function hitTest(skin,masks,pose,point,options={}){
    const joints=bones(pose,options.lengths);
    // Last painted, visible pixel wins. A transparent rectangle never steals a hit.
    for(const key of [...skin.layers].reverse()){
      const mask=masks[key];if(!skin.parts[key]||!mask||!joints[key])continue;
      const part=partFor(skin,key,pose);
      const [a,b,c,d,e,f]=matrix(part,joints[key]),det=a*d-b*c;
      if(Math.abs(det)<1e-10)continue;
      const dx=point.x-e,dy=point.y-f;
      const x=Math.floor((d*dx-c*dy)/det*mask.width/(mask.sourceWidth||mask.width)),y=Math.floor((-b*dx+a*dy)/det*mask.height/(mask.sourceHeight||mask.height));
      if(x>=0&&y>=0&&x<mask.width&&y<mask.height&&mask.data[(y*mask.width+x)*4+3]*(options.ignoreFade?1:fadeAlpha(part,(d*dx-c*dy)/det,(-b*dx+a*dy)/det))>8)return key;
    }
    return null;
  }
  function draw(ctx,skin,images,pose,options={}){
    const joints=bones(pose,options.lengths);
    for(const key of skin.layers){
      if(options.skeletonOnly)continue;
      if(options.only&&options.only!==key)continue;
      const part=partFor(skin,key,pose);if(!images[key]||!joints[key])continue;
      const img=fadedImage(images[key],part,options.createCanvas);
      ctx.save();ctx.transform(...matrix(part,joints[key]));
      if(part.size)ctx.drawImage(img,0,0,part.size[0],part.size[1]);else ctx.drawImage(img,0,0);
      ctx.restore();
    }
    if(options.skeleton){
      ctx.save();ctx.lineWidth=2;ctx.globalAlpha=0.9;
      for(const [key,[a,z]] of Object.entries(joints)){
        if(key==='backpack')continue;
        ctx.strokeStyle=key.startsWith('near')?R.NEAR:key.startsWith('far')?R.FAR:'#fff';
        ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(z.x,z.y);ctx.stroke();
        for(const p of [a,z]){ctx.beginPath();ctx.arc(p.x,p.y,3,0,Math.PI*2);ctx.fillStyle='#14201b';ctx.fill();ctx.stroke();}
      }
      ctx.restore();
    }
  }
  return {sample,frameLengths,partFor,bones,matrix,moveAttachment,movePivot,repivot,hitTest,draw,canFade,fadeFor,fadeGeometry,fadeAlpha,validateFade,fadedImage};
});
