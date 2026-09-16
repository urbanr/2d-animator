/* Shared deterministic stick-figure geometry: browser editor and Node tests/export. */
(function(root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  else root.PoseRig = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function() {
  'use strict';
  const NEAR = '#ff514f', FAR = '#42dd80', BODY = '#e6e9ed';
  const fields = [
    ['bodyX','Posun celé postavy',-200,200,'px','Tělo'],
    ['bodyY','Výška celé postavy',-100,100,'px','Tělo'],
    ['bodyLean','Předklon trupu',-180,180,'°','Tělo'],
    ['shoulders','Náklon ramen',-180,180,'°','Tělo'],
    ['shoulderWidth','Rozestup ramen (− = prohozené strany)',-300,300,'%','Tělo'],
    ['pelvis','Náklon pánve',-180,180,'°','Tělo'],
    ['pelvisWidth','Rozestup pánve (− = prohozené strany)',-300,300,'%','Tělo'],
    ['neck','Natočení krku',-180,180,'°','Tělo'],
    ['head','Náklon hlavy vůči krku',-180,180,'°','Tělo'],
    ['nearShoulder','Ramenní kloub',-180,180,'°','Bližší · červená'],
    ['nearElbow','Loket',-180,180,'°','Bližší · červená'],
    ['nearHip','Kyčel',-180,180,'°','Bližší · červená'],
    ['nearKnee','Koleno',-180,180,'°','Bližší · červená'],
    ['nearFoot','Chodidlo vůči zemi',-180,180,'°','Bližší · červená'],
    ['farShoulder','Ramenní kloub',-180,180,'°','Vzdálenější · zelená'],
    ['farElbow','Loket',-180,180,'°','Vzdálenější · zelená'],
    ['farHip','Kyčel',-180,180,'°','Vzdálenější · zelená'],
    ['farKnee','Koleno',-180,180,'°','Vzdálenější · zelená'],
    ['farFoot','Chodidlo vůči zemi',-180,180,'°','Vzdálenější · zelená']
  ];
  for(const side of ['near','far'])for(const joint of ['Shoulder','Hip'])for(const axis of ['X','Y'])
    fields.push([side+joint+'Offset'+axis,`${side==='near'?'Bližší':'Vzdálenější'} ${joint==='Hip'?'kyčel':'rameno'} · ${axis}`,-100,100,'px','Samostatné úchyty']);
  for(const joint of ['head','neck'])for(const axis of ['X','Y'])fields.push([joint+'Offset'+axis,`${joint==='head'?'Hlava':'Krk'} · ${axis}`,-100,100,'px','Tělo']);
  const angleKeys=fields.filter(([, , , ,unit])=>unit==='°').map(([key])=>key);
  const defaultJointLimits=()=>Object.fromEntries(angleKeys.map(key=>[key,[-180,180]]));
  const jointLimitsFor=source=>{
    const result=defaultJointLimits();
    for(const [key,value] of Object.entries(source?.joint_limits||{}))if(key in result&&Array.isArray(value)&&value.length===2&&value.every(Number.isFinite)&&value[0]<=value[1])result[key]=[...value];
    return result;
  };
  const rangeFor=(source,key)=>jointLimitsFor(source)[key]||fields.find(field=>field[0]===key)?.slice(2,4);
  const defaultLengths=()=>({head:21,neck:18,torso:94,...Object.fromEntries(['near','far'].flatMap(s=>Object.entries({UpperArm:46,Forearm:44,Thigh:70,Shin:74,Foot:25}).map(([k,v])=>[s+k,v])))});
  const lengthsFor=(clip,index)=>{
    const lengths={...defaultLengths(),...(clip?.rig_lengths||{})};
    for(const [key,ratio] of Object.entries(clip?.frame_edits?.[index]?.lengths||{}))lengths[key]*=ratio;
    return lengths;
  };
  const neutral = () => Object.fromEntries(fields.map(([key]) => [key, key.endsWith('Width')?100:0]));
  const rad = degrees => degrees * Math.PI / 180;
  const deg = radians => radians * 180 / Math.PI;
  const clamp = (n, low, high) => Math.min(high, Math.max(low, n));
  const wrapAngle = n => ((n+180)%360+360)%360-180;
  const down = (point, length, angle) => ({x:point.x + length*Math.sin(rad(angle)), y:point.y + length*Math.cos(rad(angle))});
  const bar = (center, half, angle) => ({
    near:{x:center.x+half*Math.cos(rad(angle)), y:center.y+half*Math.sin(rad(angle))},
    far:{x:center.x-half*Math.cos(rad(angle)), y:center.y-half*Math.sin(rad(angle))}
  });
  function points(pose, lengths) {
    const p = {...neutral(), ...pose};
    const sizes={...defaultLengths(),...(lengths||pose.rig_lengths||{})};
    const hipCenter = {x:256+p.bodyX, y:274+p.bodyY};
    const shoulderCenter = down(hipCenter,-sizes.torso,-p.bodyLean);
    const hips = bar(hipCenter, 15*p.pelvisWidth/100, p.pelvis);
    const shoulders = bar(shoulderCenter, 22*p.shoulderWidth/100, p.shoulders);
    for(const side of ['near','far'])for(const axis of ['x','y']){
      shoulders[side][axis]+=p[side+'ShoulderOffset'+axis.toUpperCase()];
      hips[side][axis]+=p[side+'HipOffset'+axis.toUpperCase()];
    }
    const neckBase = {...shoulderCenter};
    const headBase = down(neckBase, -sizes.neck, p.neck);
    headBase.x+=p.neckOffsetX;headBase.y+=p.neckOffsetY;
    const headCenter = down(headBase, -sizes.head, p.neck+p.head);
    headCenter.x+=p.headOffsetX;headCenter.y+=p.headOffsetY;
    const result = {hipCenter, shoulderCenter, hips, shoulders, neckBase, headBase, headCenter, headAngle:p.neck+p.head};
    for (const side of ['near','far']) {
      const elbow = down(shoulders[side], sizes[side+'UpperArm'], p[side+'Shoulder']-p.shoulders);
      const hand = down(elbow, sizes[side+'Forearm'], p[side+'Shoulder']-p.shoulders+p[side+'Elbow']);
      const knee = down(hips[side], sizes[side+'Thigh'], p[side+'Hip']-p.pelvis);
      const ankle = down(knee, sizes[side+'Shin'], p[side+'Hip']-p.pelvis+p[side+'Knee']);
      const footAngle = rad(p[side+'Foot']);
      const toe = {x:ankle.x+sizes[side+'Foot']*Math.cos(footAngle), y:ankle.y+sizes[side+'Foot']*Math.sin(footAngle)};
      result[side] = {hip:hips[side], shoulder:shoulders[side], elbow, hand, knee, ankle, toe};
    }
    return result;
  }
  function inverseLeg(hip, ankle) {
    const x=ankle.x-hip.x, y=ankle.y-hip.y;
    const distance=clamp(Math.hypot(x,y), 5, 143.9);
    const spread=Math.acos(clamp((70*70+distance*distance-74*74)/(2*70*distance),-1,1));
    const thigh=Math.atan2(x,y)+spread;
    const knee={x:hip.x+70*Math.sin(thigh),y:hip.y+70*Math.cos(thigh)};
    const shin=Math.atan2(ankle.x-knee.x,ankle.y-knee.y);
    return {hip:deg(thigh), knee:deg(shin-thigh)};
  }
  function generateFrame(kind, index, options={}) {
    const p=neutral(), phase=index/8;
    const sprint=kind==='sprint', stance=sprint?0.36:0.60;
    // Uniformly spaced cyclic phases; 7 -> 8 -> 1 gets the same time step.
    p.bodyY=sprint ? -8-9*Math.cos(4*Math.PI*(phase-0.18)) : -3-3*Math.cos(4*Math.PI*phase);
    p.shoulders=(sprint?9:5)*Math.sin(2*Math.PI*phase);
    const shoulderMotion=options.softShoulders?0.5:1;
    p.shoulders*=shoulderMotion;
    p.pelvis=-(sprint?7:4)*Math.sin(2*Math.PI*phase);
    if(options.bodyTwist) {
      // The near leg leads at phase 0; the near arm swings backwards.
      // Signed projected widths cross zero twice, without swapping limb identities.
      p.pelvisWidth=(sprint?85:60)*Math.cos(2*Math.PI*phase);
      p.shoulderWidth=-(sprint?100:70)*shoulderMotion*Math.cos(2*Math.PI*phase);
    }
    p.neck=sprint?-12:0;
    p.head=sprint?8:0;
    const joints=points(p);
    for (const [side, shift] of [['near',0],['far',0.5]]) {
      const t=(phase+shift)%1, span=sprint?67:48;
      let x,y,foot;
      if(t<stance) {
        const s=t/stance;
        x=span*(1-2*s); y=390;
        foot=s>0.75 ? -35*(s-0.75)/0.25 : s<0.12 ? -12*(1-s/0.12) : 0;
      } else {
        const s=(t-stance)/(1-stance);
        x=-span+2*span*(0.5-0.5*Math.cos(Math.PI*s));
        y=390-(sprint?86:38)*Math.sin(Math.PI*s);
        foot=-30*Math.sin(Math.PI*s);
      }
      const angles=inverseLeg(joints.hips[side], {x:256+x,y});
      p[side+'Hip']=angles.hip+p.pelvis;
      p[side+'Knee']=angles.knee;
      p[side+'Foot']=foot;
      p[side+'Shoulder']=-(sprint?62:32)*Math.cos(2*Math.PI*t)+p.shoulders;
      p[side+'Elbow']=sprint?85+15*Math.sin(2*Math.PI*t):25+10*Math.sin(2*Math.PI*t);
    }
    for(const [key,,low,high] of fields) p[key]=Math.round(clamp(p[key],low,high)*10)/10;
    return p;
  }
  function handles(pose,lengths) {
    const g=points(pose,lengths), result=[];
    const add=(key,point,pivot,label,color=BODY)=>result.push({key,point,pivot,label,color,
      side:key.startsWith('near')||key==='shoulders'||key==='pelvis'?'near':key.startsWith('far')?'far':null});
    add('bodyY',{x:(g.hipCenter.x+g.shoulderCenter.x)/2,y:(g.hipCenter.y+g.shoulderCenter.y)/2},null,'Trup: posun / rotace / délka podle nástroje');
    add('shoulders',g.shoulders.near,g.shoulderCenter,'Ramena: otáčet / zúžit; Ctrl: jen bližší úchyt',NEAR);
    add('pelvis',g.hips.near,g.hipCenter,'Pánev: otáčet / zúžit; Ctrl: jen bližší úchyt',NEAR);
    add('farShoulderRoot',g.shoulders.far,g.shoulderCenter,'Ctrl: samostatně vzdálenější rameno',FAR);
    add('farHipRoot',g.hips.far,g.hipCenter,'Ctrl: samostatně vzdálenější kyčel',FAR);
    add('bodyLean',g.shoulderCenter,g.hipCenter,'Otočit nebo prodloužit trup');
    add('neck',g.headBase,g.neckBase,'Otočit krk i hlavu');
    add('head',g.headCenter,g.headBase,'Naklonit hlavu');
    for(const side of ['far','near']) {
      const v=g[side], color=side==='near'?NEAR:FAR;
      add(side+'Shoulder',v.elbow,v.shoulder,'Otočit celou paži',color);
      add(side+'Elbow',v.hand,v.elbow,'Otočit předloktí',color);
      add(side+'Hip',v.knee,v.hip,'Otočit celou nohu v kyčli',color);
      add(side+'Knee',v.ankle,v.knee,'Otočit lýtko v koleni',color);
      add(side+'Foot',v.toe,v.ankle,'Otočit chodidlo',color);
    }
    return result;
  }
  // Rotate one parent joint; descendant local angles and bone lengths stay intact.
  function dragPose(pose,key,start,end,options={}) {
    const rootKey={shoulders:['near','Shoulder'],pelvis:['near','Hip'],farShoulderRoot:['far','Shoulder'],farHipRoot:['far','Hip']}[key];
    if(rootKey&&options.ctrlKey){
      const out={...pose},prefix=rootKey.join('')+'Offset';
      for(const axis of ['X','Y'])out[prefix+axis]=Math.round(clamp((pose[prefix+axis]||0)+end[axis.toLowerCase()]-start[axis.toLowerCase()],-100,100)*10)/10;
      return out;
    }
    if(key==='farShoulderRoot'||key==='farHipRoot'){
      const pivot=handles(pose,options.lengths).find(h=>h.key===key).pivot;
      return dragPose(pose,key==='farShoulderRoot'?'shoulders':'pelvis',
        {x:2*pivot.x-start.x,y:2*pivot.y-start.y},{x:2*pivot.x-end.x,y:2*pivot.y-end.y},options);
    }
    const h=handles(pose,options.lengths).find(h=>h.key===key), field=fields.find(f=>f[0]===key),range=options.limits?.[key]||field?.slice(2,4);
    if(!h||!field)return {...pose};
    if(key==='shoulders'||key==='pelvis') {
      const width=key==='shoulders'?'shoulderWidth':'pelvisWidth', half=key==='shoulders'?22:15;
      // Signed projection allows a single uninterrupted drag through the pivot.
      // Keep the initial grab offset, including when the bar is fully collapsed.
      const x=h.point.x-h.pivot.x+end.x-start.x, y=h.point.y-h.pivot.y+end.y-start.y;
      const sign=x<0?-1:1;
      const angle=Math.abs(x)<0.001?(pose[key]||0):clamp(deg(Math.atan2(sign*y,sign*x)),range[0],range[1]);
      return {...pose,[key]:Math.round(angle*10)/10,
        [width]:Math.round(clamp(x/(half*Math.cos(rad(angle)))*100,-300,300)*10)/10};
    }
    let delta=end.y-start.y;
    if(h.pivot) {
      const atCenter=Math.hypot(end.x-h.pivot.x,end.y-h.pivot.y)<2;
      if(atCenter&&!['shoulders','pelvis'].includes(key))return {...pose};
      const angle=p=>Math.atan2(p.y-h.pivot.y,p.x-h.pivot.x);
      delta=deg(Math.atan2(Math.sin(angle(end)-angle(start)),Math.cos(angle(end)-angle(start))));
      if(atCenter||Math.hypot(start.x-h.pivot.x,start.y-h.pivot.y)<2)delta=0;
      if(!['shoulders','pelvis'].includes(key)&&!key.endsWith('Foot')&&key!=='bodyLean')delta=-delta;
    }
    const result={...pose,[key]:Math.round(clamp((pose[key]||0)+delta,range[0],range[1])*10)/10};
    if(key.endsWith('Foot')&&range[0]===-180&&range[1]===180)result[key]=Math.round(wrapAngle((pose[key]||0)+delta)*10)/10;
    // Feet are stored as world angles, so carry them along with either leg bone.
    if(key.endsWith('Hip')||key.endsWith('Knee')) {
      const foot=key.startsWith('near')?'nearFoot':'farFoot';
      result[foot]=Math.round(wrapAngle((pose[foot]||0)-(result[key]-(pose[key]||0)))*10)/10;
    }
    return result;
  }
  function dragClip(clip,index,key,start,end,options={}){
    const lengths=lengthsFor(clip,index),shared=lengthsFor(clip),p=clip.frames[index];
    const next=dragPose(p,key,start,end,{...options,lengths,limits:jointLimitsFor(clip)});
    const match=/^(near|far)(Shoulder|Elbow|Hip|Knee|Foot)$/.exec(key);
    const bone=match?match[1]+({Shoulder:'UpperArm',Elbow:'Forearm',Hip:'Thigh',Knee:'Shin',Foot:'Foot'}[match[2]]):{head:'head',neck:'neck',bodyLean:'torso'}[key];
    if(bone&&options.resize!==false){
      const h=handles(p,lengths).find(h=>h.key===key);
      const delta=Math.hypot(end.x-h.pivot.x,end.y-h.pivot.y)-Math.hypot(start.x-h.pivot.x,start.y-h.pivot.y);
      const ratios=clip.frames.map((_,i)=>clip.frame_edits?.[i]?.lengths?.[bone]||1);
      const target=Math.round(clamp(lengths[bone]+delta,5,250)*10)/10;
      shared[bone]=clamp(target/ratios[index],Math.max(5,...ratios.map(r=>5/r)),Math.min(250,...ratios.map(r=>250/r)));
    }
    return {...clip,rig_lengths:shared,frames:clip.frames.map((f,i)=>i===index?next:{...f})};
  }
  function svg(pose, options={}) {
    const g=points(pose,options.lengths), segments=[];
    const line=(a,b,color,width=7)=>segments.push(`<line x1="${a.x}" y1="${a.y}" x2="${b.x}" y2="${b.y}" stroke="${color}" stroke-width="${width}" stroke-linecap="round"/>`);
    const joint=(p,color,r=4)=>segments.push(`<circle cx="${p.x}" cy="${p.y}" r="${r}" fill="#202426" stroke="${color}" stroke-width="2"/>`);
    function limb(side,color) {
      const v=g[side];
      line(v.shoulder,v.elbow,color); line(v.elbow,v.hand,color);
      line(v.hip,v.knee,color); line(v.knee,v.ankle,color); line(v.ankle,v.toe,color,6);
      [v.shoulder,v.elbow,v.hip,v.knee,v.ankle].forEach(p=>joint(p,color));
    }
    limb('far',FAR);
    line(g.shoulderCenter,g.hipCenter,BODY,6);
    line(g.shoulders.far,g.shoulders.near,BODY,5); line(g.hips.far,g.hips.near,BODY,5);
    line(g.neckBase,g.headBase,BODY,5);
    segments.push(`<circle cx="${g.headCenter.x}" cy="${g.headCenter.y}" r="21" fill="#505050" stroke="${BODY}" stroke-width="4"/>`);
    // A short face-direction mark makes the circular head's tilt visible.
    const nose={x:g.headCenter.x+25*Math.cos(rad(g.headAngle)), y:g.headCenter.y-25*Math.sin(rad(g.headAngle))};
    line(g.headCenter,nose,BODY,3); joint(g.headBase,BODY,3);
    limb('near',NEAR);
    const ground=options.ground===false?'':`<line x1="24" y1="392" x2="488" y2="392" stroke="#ffea5b" stroke-width="1"/>`;
    const grips=options.editable?handles(pose,options.lengths).filter(h=>!options.side||!h.side||h.side===options.side).map(h=>`<circle data-joint="${h.key}" cx="${h.point.x}" cy="${h.point.y}" r="9" fill="#202426" fill-opacity="0.8" stroke="${h.color}" stroke-width="2" class="pose-handle"><title>${h.label}</title></circle>`).join(''):'';
    const move=Number.isFinite(options.offsetX)?options.offsetX:0;
    const zoom=clamp(options.zoom||1,.4,4),box=`${256-256/zoom} ${280-280/zoom} ${512/zoom} ${560/zoom}`;
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="${box}" width="512" height="560"><rect x="-1024" y="-1120" width="2560" height="2800" fill="#505050"/>${ground}<g transform="translate(${move} 0)">${segments.join('')}${grips}</g></svg>`;
  }
  function presets() {
    const clips={}, poses={};
    for(const kind of ['walk','sprint']) {
      const name=kind==='walk'?'Chůze':'Sprint';
      const frames=Array.from({length:8},(_,i)=>generateFrame(kind,i));
      clips[kind+'-v1']={id:kind+'-v1',name:name+' · výchozí',fps:kind==='walk'?8:12,frames};
      frames.forEach((frame,i)=>{const id=kind+'-'+(i+1);poses[id]={id,name:name+' · fáze '+(i+1),frame};});
    }
    return {schema_version:1,colors:{near:NEAR,far:FAR},clips,poses};
  }
  function bodyTwistClips(options={}) {
    return ['walk','sprint'].map(kind=>({
      name:(kind==='walk'?'Chůze':'Sprint')+(options.softShoulders?' · jemnější ramena v3':' · ramena a pánev v2'),
      fps:kind==='walk'?8:12,
      frames:Array.from({length:8},(_,i)=>generateFrame(kind,i,{bodyTwist:true,...options}))
    }));
  }
  function referenceGaitClips() {
    // Authored eight-phase proposals, not measurements copied from reference art.
    // Walking: contact, loading, support, push, toe-off, swing, pass, extension.
    const walk={hip:[24,14,0,-16,-22,-5,23,30],knee:[-5,-16,-5,-8,-22,-60,-52,-20],
      foot:[-12,0,0,12,38,12,-8,-12],arm:[-23,-14,0,18,23,14,0,-18],elbow:[12,14,17,20,22,20,17,14]};
    // Sprint: contact/load/push/flight; opposite leg repeats a half-cycle later.
    const sprint={hip:[32,12,-28,-12,35,66,60,40],knee:[-20,-42,-12,-100,-125,-108,-65,-30],
      foot:[12,0,30,18,5,-12,-18,-8],arm:[-45,-15,32,52,45,15,-32,-52],elbow:[88,85,75,68,70,75,85,95]};
    return [false,true].map(running=>{
      const table=running?sprint:walk;
      const frames=Array.from({length:8},(_,i)=>{
        const p=neutral(),phase=2*Math.PI*i/8;
        p.bodyLean=running?18:2;p.neck=running?-8:0;p.head=running?5:0;
        p.shoulders=(running?3:2)*Math.sin(phase);p.pelvis=-(running?5:3)*Math.sin(phase);
        p.shoulderWidth=-(running?45:30)*Math.cos(phase);p.pelvisWidth=(running?65:45)*Math.cos(phase);
        for(const [side,offset] of [['near',0],['far',4]]) {
          const j=(i+offset)%8;
          p[side+'Hip']=table.hip[j]+p.pelvis;p[side+'Knee']=table.knee[j];p[side+'Foot']=table.foot[j];
          p[side+'Shoulder']=table.arm[j]+p.shoulders;p[side+'Elbow']=table.elbow[j];
        }
        const g=points(p),support=g[i<4?'near':'far'];
        // Place the authored support geometry on the ground; no bitmap scanning.
        p.bodyY=390-Math.max(support.ankle.y,support.toe.y);
        return p;
      });
      if(running)for(const i of [3,7])frames[i].bodyY=Math.min(frames[(i+1)%8].bodyY,frames[i-1].bodyY)-12;
      for(const p of frames)for(const [key,,min,max] of fields)p[key]=Math.round(clamp(p[key],min,max)*10)/10;
      return {name:running?'Sprint · odraz a let v4':'Chůze · přirozený krok v4',fps:running?12:8,frames};
    });
  }
  function zombieClips() {
    const hip=[12,8,0,-10,-12,-4,10,15], knee=[-18,-24,-15,-18,-30,-42,-32,-35], foot=[-4,0,0,8,15,2,0,-4];
    const frames=Array.from({length:8},(_,i)=>{
      const p=neutral(),phase=2*Math.PI*i/8;
      p.bodyLean=22+2*Math.sin(phase);p.neck=-20;p.head=-8+3*Math.sin(phase-0.5);
      p.shoulders=2*Math.sin(phase);p.pelvis=-2*Math.sin(phase);
      p.shoulderWidth=-15*Math.cos(phase);p.pelvisWidth=20*Math.cos(phase);
      for(const [side,offset] of [['near',0],['far',4]]) {
        const j=(i+offset)%8;
        p[side+'Hip']=hip[j]+p.pelvis;p[side+'Knee']=knee[j];p[side+'Foot']=foot[j];
        // Both arms reach forward, with different droop and a delayed small sway.
        p[side+'Shoulder']=(side==='near'?72:58)+4*Math.sin(phase+(side==='near'?0.5:-0.5))+p.shoulders;
        p[side+'Elbow']=(side==='near'?-35:-25)+3*Math.sin(phase-0.8);
      }
      const g=points(p),support=g[i<4?'near':'far'];
      p.bodyY=390-Math.max(support.ankle.y,support.toe.y);
      for(const [key,,min,max] of fields)p[key]=Math.round(clamp(p[key],min,max)*10)/10;
      return p;
    });
    return [{name:'Zombie · šouravá chůze v1',fps:6,frames}];
  }
  return {fields,neutral,points,generateFrame,svg,presets,NEAR,FAR,clamp,handles,dragPose,dragClip,defaultLengths,lengthsFor,defaultJointLimits,jointLimitsFor,rangeFor,bodyTwistClips,referenceGaitClips,zombieClips};
});
