/* Bitmap attachments to PoseRig. Pure geometry shared by browser and tests. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./pose-rig.js'));
  else root.CutoutRig=factory(root.PoseRig);
})(typeof globalThis!=='undefined'?globalThis:this,function(R){
  'use strict';
  const mirror=p=>({x:512-p.x,y:p.y});
  const angleKeys=new Set(R.fields.filter(f=>f[4]==='°').map(f=>f[0]));
  const wrap=v=>((v+180)%360+360)%360-180;
  const canFade=key=>['head','torso','pelvis','backpack'].includes(key)||/^(near|far)(UpperArm|Forearm|Thigh|Shin|Foot)$/.test(key);
  const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const emptyWarp=()=>[[0,0],[0,0],[0,0],[0,0]];
  function normalizeWarp(value){return Array.isArray(value)&&value.length===4&&value.every(p=>Array.isArray(p)&&p.length===2&&p.every(Number.isFinite))?value.map(p=>[...p]):emptyWarp();}
  function warpCorners(part){
    const [w,h]=part.size||[0,0],base=[[0,0],[w,0],[w,h],[0,h]],warp=normalizeWarp(part.warp);
    return base.map((p,i)=>[p[0]+warp[i][0],p[1]+warp[i][1]]);
  }
  function hasWarp(part){return normalizeWarp(part.warp).some(p=>Math.abs(p[0])>1e-9||Math.abs(p[1])>1e-9);}
  // Piecewise-affine mapping along diagonal 0→2. This keeps every outer edge
  // straight while allowing all four bitmap corners to move independently.
  function warpPoint(part,x,y){
    if(!hasWarp(part))return {x,y};
    const [w,h]=part.size,u=w?x/w:0,v=h?y/h:0,q=warpCorners(part);
    if(u>=v)return {x:(1-u)*q[0][0]+(u-v)*q[1][0]+v*q[2][0],y:(1-u)*q[0][1]+(u-v)*q[1][1]+v*q[2][1]};
    return {x:(1-v)*q[0][0]+u*q[2][0]+(v-u)*q[3][0],y:(1-v)*q[0][1]+u*q[2][1]+(v-u)*q[3][1]};
  }
  function barycentric(point,a,b,c){
    const den=(b[1]-c[1])*(a[0]-c[0])+(c[0]-b[0])*(a[1]-c[1]);if(Math.abs(den)<1e-9)return null;
    const p=[point.x,point.y],u=((b[1]-c[1])*(p[0]-c[0])+(c[0]-b[0])*(p[1]-c[1]))/den,v=((c[1]-a[1])*(p[0]-c[0])+(a[0]-c[0])*(p[1]-c[1]))/den,w=1-u-v;
    return u>=-1e-7&&v>=-1e-7&&w>=-1e-7?[u,v,w]:null;
  }
  function unwarpPoint(part,x,y){
    if(!hasWarp(part))return {x,y};
    const [w,h]=part.size,q=warpCorners(part),p={x,y};let b=barycentric(p,q[0],q[1],q[2]);
    if(b)return {x:(b[1]+b[2])*w,y:b[2]*h};
    b=barycentric(p,q[0],q[2],q[3]);return b?{x:b[1]*w,y:(b[1]+b[2])*h}:null;
  }
  function fadeFor(part,end='start'){
    const length=part.start&&part.end?Math.hypot(part.end[0]-part.start[0],part.end[1]-part.start[1]):100;
    const f={strength:0,radius:Math.max(1,Math.min(Math.min(...(part.size||[100,100]))*.5,length*.45)),shape:'ellipse',onset:.15,direction:'outward',offset:[0,0],angle:0,...part.joint_fade?.[end]};
    return {...f,radius2:f.radius2??f.radius};
  }
  function validateFade(value){
    const obj=v=>v&&typeof v==='object'&&!Array.isArray(v);
    if(!obj(value)||Object.keys(value).some(k=>!['start','end'].includes(k)))throw Error('Neplatný přechod spoje.');
    for(const v of Object.values(value))if(!obj(v)||Object.keys(v).some(k=>!['strength','radius','radius2','shape','onset','direction','offset','angle'].includes(k))||
      !Number.isFinite(v.strength)||v.strength<0||v.strength>1||!Number.isFinite(v.radius)||v.radius<1||v.radius>2000||!['outward','inward'].includes(v.direction)||
      (v.radius2!==undefined&&(!Number.isFinite(v.radius2)||v.radius2<1||v.radius2>2000))||
      (v.shape!==undefined&&!['ellipse','rectangle'].includes(v.shape))||
      (v.onset!==undefined&&(!Number.isFinite(v.onset)||v.onset<0||v.onset>.95))||
      (v.angle!==undefined&&(!Number.isFinite(v.angle)||Math.abs(v.angle)>180))||
      (v.offset!==undefined&&(!Array.isArray(v.offset)||v.offset.length!==2||v.offset.some(n=>!Number.isFinite(n)||Math.abs(n)>2000))))throw Error('Neplatný přechod spoje.');
    return value;
  }
  // Alpha is evaluated in original bitmap coordinates, before any bone/bitmap transform.
  function fadeGeometry(part,end){
    const f=fadeFor(part,end),a=part[end],b=part[end==='start'?'end':'start'];
    const angle=Math.atan2(b[1]-a[1],b[0]-a[0])+f.angle*Math.PI/180+(f.direction==='inward'?Math.PI:0);
    const ux=Math.cos(angle),uy=Math.sin(angle),anchor=[a[0]+f.offset[0],a[1]+f.offset[1]];
    // Attachment is the circle center / midpoint of the flat diameter, never the arc.
    // Radius and angle only change the cap around this fixed center.
    return {...f,anchor,center:[...anchor],ux,uy,angle};
  }
  function fadeAlpha(part,x,y,geometry){
    if(!part.joint_fade)return 1;
    let alpha=1;
    for(const f of geometry||['start','end'].map(end=>fadeGeometry(part,end))){
      if(!f.strength)continue;
      const dx=x-f.center[0],dy=y-f.center[1],along=dx*f.ux+dy*f.uy;
      const depth=-along/f.radius,side=Math.abs((-dx*f.uy+dy*f.ux)/f.radius2);
      // Ellipse distance is normalized independently by R1 and R2, so equal
      // elliptical radii always receive equal alpha. Rectangle fades in
      // straight bands; R2 only bounds its width.
      const distance=f.shape==='rectangle'?depth:Math.hypot(depth,side);
      if(along>1e-9||depth>1||side>1||(f.shape!=='rectangle'&&distance>1))continue;
      // Náběh chooses the untouched core. From there the effect is exactly
      // proportional to the remaining normalized distance up to the boundary.
      const t=clamp((distance-f.onset)/(1-f.onset),0,1);
      alpha*=1-f.strength*t;
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
    const baseWarp=normalizeWarp(part.warp),editWarp=normalizeWarp(edit.warp),warp=baseWarp.map((p,i)=>p.map((v,axis)=>v+editWarp[i][axis]));
    const joint_fade={...part.joint_fade,...edit.joint_fade};
    if(edit.fade_mix)for(const end of ['start','end']){
      const base=fadeFor(part,end),endpoint=v=>({...base,...v,radius2:v?.radius2??v?.radius??base.radius2});
      const a=endpoint(edit.fade_mix.a?.[end]),b=endpoint(edit.fade_mix.b?.[end]),t=edit.fade_mix.t;
      joint_fade[end]={strength:a.strength+t*(b.strength-a.strength),radius:a.radius+t*(b.radius-a.radius),radius2:(a.radius2??a.radius)+t*((b.radius2??b.radius)-(a.radius2??a.radius)),onset:a.onset+t*(b.onset-a.onset),shape:t<.5?a.shape:b.shape,direction:t<.5?a.direction:b.direction,
        offset:[0,1].map(i=>(a.offset?.[i]||0)+t*((b.offset?.[i]||0)-(a.offset?.[i]||0))),angle:wrap((a.angle||0)+t*wrap((b.angle||0)-(a.angle||0)))};
    }
    return {...part,warp,joint_fade:canFade(key)?joint_fade:{},pivot_offset:[0,1].map(i=>(part.pivot_offset?.[i]||0)+(edit.pivot_offset?.[i]||0)),offset:offset.map((v,i)=>v+(edit.offset?.[i]||0)),rotation:(part.rotation||0)+(edit.rotation||0),
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
      const aw=normalizeWarp(a.warp),bw=normalizeWarp(b.warp);
      p.part_edits[key]={offset:[0,1].map(i=>(a.offset?.[i]||0)+t*((b.offset?.[i]||0)-(a.offset?.[i]||0))),
        pivot_offset:[0,1].map(i=>(a.pivot_offset?.[i]||0)+t*((b.pivot_offset?.[i]||0)-(a.pivot_offset?.[i]||0))),
        warp:aw.map((point,i)=>point.map((v,axis)=>v+t*(bw[i][axis]-v))),
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
    // Shoulders are attachment guides. A skin may also supply a separate
    // pelvis bitmap; it follows the torso and overlaps both hip roots.
    b.pelvis=b.torso;
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
    // Generalissimus holds his detached megaphone by the near hand. The
    // bitmap has its own authored anchors and therefore only shares the bone.
    b.megaphone=b.nearForearm;
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
  function triangleMatrix(source,destination){
    const sx1=source[1][0]-source[0][0],sy1=source[1][1]-source[0][1],sx2=source[2][0]-source[0][0],sy2=source[2][1]-source[0][1],det=sx1*sy2-sx2*sy1;
    if(Math.abs(det)<1e-9)return null;
    const dx1=destination[1][0]-destination[0][0],dy1=destination[1][1]-destination[0][1],dx2=destination[2][0]-destination[0][0],dy2=destination[2][1]-destination[0][1];
    const a=(dx1*sy2-dx2*sy1)/det,c=(-dx1*sx2+dx2*sx1)/det,b=(dy1*sy2-dy2*sy1)/det,d=(-dy1*sx2+dy2*sx1)/det;
    return [a,b,c,d,destination[0][0]-a*source[0][0]-c*source[0][1],destination[0][1]-b*source[0][0]-d*source[0][1]];
  }
  function drawWarpedImage(ctx,img,part){
    const [w,h]=part.size||[img.naturalWidth||img.width,img.naturalHeight||img.height];
    if(!hasWarp(part)){ctx.drawImage(img,0,0,w,h);return;}
    const source=[[0,0],[w,0],[w,h],[0,h]],destination=warpCorners(part);
    for(const indices of [[0,1,2],[0,2,3]]){
      const s=indices.map(i=>source[i]),d=indices.map(i=>destination[i]),m=triangleMatrix(s,d);if(!m)continue;
      ctx.save();ctx.beginPath();ctx.moveTo(...d[0]);ctx.lineTo(...d[1]);ctx.lineTo(...d[2]);ctx.closePath();ctx.clip();ctx.transform(...m);ctx.drawImage(img,0,0,w,h);ctx.restore();
    }
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
      const local=unwarpPoint(part,(d*dx-c*dy)/det,(-b*dx+a*dy)/det);if(!local)continue;
      const x=Math.floor(local.x*mask.width/(mask.sourceWidth||mask.width)),y=Math.floor(local.y*mask.height/(mask.sourceHeight||mask.height));
      if(x>=0&&y>=0&&x<mask.width&&y<mask.height&&mask.data[(y*mask.width+x)*4+3]*(options.ignoreFade?1:fadeAlpha(part,local.x,local.y))>8)return key;
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
      drawWarpedImage(ctx,img,part);
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
  return {sample,frameLengths,partFor,bones,matrix,moveAttachment,movePivot,repivot,warpCorners,warpPoint,unwarpPoint,drawWarpedImage,hitTest,draw,canFade,fadeFor,fadeGeometry,fadeAlpha,validateFade,fadedImage};
});
