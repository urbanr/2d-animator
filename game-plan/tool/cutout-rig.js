/* Bitmap attachments to PoseRig. Pure geometry shared by browser and tests. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./pose-rig.js'));
  else root.CutoutRig=factory(root.PoseRig);
})(typeof globalThis!=='undefined'?globalThis:this,function(R){
  'use strict';
  const mirror=p=>({x:512-p.x,y:p.y});
  const angleKeys=new Set(R.fields.filter(f=>f[4]==='°').map(f=>f[0]));
  const wrap=v=>((v+180)%360+360)%360-180;
  function frameLengths(clip,index){
    return R.lengthsFor(clip,index);
  }
  function partFor(skin,key,pose){
    const part=skin.parts[key],edit=pose.part_edits?.[key]||{},offset=part.offset||[0,0];
    return {...part,offset:offset.map((v,i)=>v+(edit.offset?.[i]||0)),rotation:(part.rotation||0)+(edit.rotation||0),
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
    // Rotate/scale around the attachment, not the bitmap's upper-left corner.
    // Attachment translation remains in bone-local source pixels.
    return [ax,ay,bx,by,a.x-ax*sx-bx*sy+bc*ox-bs*oy,a.y-ay*sx-by*sy+bs*ox+bc*oy];
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
      if(x>=0&&y>=0&&x<mask.width&&y<mask.height&&mask.data[(y*mask.width+x)*4+3]>8)return key;
    }
    return null;
  }
  function draw(ctx,skin,images,pose,options={}){
    const joints=bones(pose,options.lengths);
    for(const key of skin.layers){
      if(options.skeletonOnly)continue;
      if(options.only&&options.only!==key)continue;
      const part=partFor(skin,key,pose),img=images[key];if(!img||!joints[key])continue;
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
  return {sample,frameLengths,partFor,bones,matrix,moveAttachment,hitTest,draw};
});
