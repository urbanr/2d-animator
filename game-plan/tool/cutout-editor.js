/* Scoped, immutable edits. Pose frames stay readable by older pose consumers;
   frame_edits records their reset baseline plus length/bitmap exceptions. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory(require('./pose-rig.js'),require('./cutout-rig.js'));
  else root.CutoutEditor=factory(root.PoseRig,root.CutoutRig);
})(typeof globalThis!=='undefined'?globalThis:this,function(R,C){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v)),wrap=v=>((v+180)%360+360)%360-180;
  const fields=Object.fromEntries(R.fields.map(f=>[f[0],f]));
  function editAt(clip,i){clip.frame_edits??={};return clip.frame_edits[i]??={};}
  function poseChange(clip,index,values,scope='frame'){
    const out=copy(clip),neutral=R.neutral();
    for(const [key,wanted] of Object.entries(values)){
      const f=fields[key];if(!f||!Number.isFinite(wanted))continue;
      const current=clip.frames[index][key]??neutral[key],cyclic=f[4]==='°'&&f[2]===-180;
      let delta=cyclic?wrap(wanted-current):wanted-current;
      const indices=scope==='all'?clip.frames.map((_,i)=>i):[index];
      if(!cyclic){
        const values=indices.flatMap(i=>[clip.frames[i][key]??neutral[key],...(scope==='all'&&clip.frame_edits?.[i]?.pose_base?.[key]!==undefined?[clip.frame_edits[i].pose_base[key]]:[])]);
        delta=R.clamp(delta,Math.max(...values.map(v=>f[2]-v)),Math.min(...values.map(v=>f[3]-v)));
      }
      if(Math.abs(delta)<1e-9)continue;
      for(const i of indices){
        const before=clip.frames[i][key]??neutral[key],apply=v=>cyclic?wrap(v+delta):v+delta;
        if(scope!=='all'){
          const e=editAt(out,i);e.pose_base??={};e.pose_base[key]??=before;
        }else if(out.frame_edits?.[i]?.pose_base?.[key]!==undefined)out.frame_edits[i].pose_base[key]=apply(out.frame_edits[i].pose_base[key]);
        out.frames[i][key]=apply(before);
      }
    }
    return out;
  }
  function lengthChange(clip,index,key,wanted,scope='frame'){
    if(!(key in R.defaultLengths())||!Number.isFinite(wanted))return copy(clip);
    wanted=Math.round(wanted*1e6)/1e6;
    const out=copy(clip),current=C.frameLengths(clip,index)[key];
    if(scope==='all'){
      const base=R.lengthsFor(clip)[key],values=[base,...clip.frames.map((_,i)=>C.frameLengths(clip,i)[key])];
      const ratio=R.clamp(wanted/current,Math.max(...values.map(v=>5/v)),Math.min(...values.map(v=>250/v)));
      out.rig_lengths={...R.lengthsFor(clip),[key]:base*ratio};
    }else{
      const value=R.clamp(wanted,5,250);if(Math.abs(value-current)<1e-9)return out;
      const e=editAt(out,index);e.lengths??={};e.lengths[key]=value/R.lengthsFor(clip)[key];
    }
    return out;
  }
  function boneForHandle(key){const m=/^(near|far)(Shoulder|Elbow|Hip|Knee|Foot)$/.exec(key);return m?m[1]+{Shoulder:'UpperArm',Elbow:'Forearm',Hip:'Thigh',Knee:'Shin',Foot:'Foot'}[m[2]]:null;}
  function dragSkeleton(clip,index,key,start,end,{scope='frame',tool='rotate',ctrlKey=false,resize=true}={}){
    const p=C.sample(clip,index,false),bone=boneForHandle(key);
    const root={shoulders:['near','Shoulder'],farShoulderRoot:['far','Shoulder'],pelvis:['near','Hip'],farHipRoot:['far','Hip']}[key];
    if(ctrlKey&&root){
      const prefix=root.join('');return poseChange(clip,index,{[prefix+'OffsetX']:p[prefix+'OffsetX']+end.x-start.x,[prefix+'OffsetY']:p[prefix+'OffsetY']+end.y-start.y},scope);
    }
    if(tool==='size'||ctrlKey){
      if(!resize)return copy(clip);
      if(bone){
        const h=R.handles(p).find(h=>h.key===key);
        return lengthChange(clip,index,bone,p.rig_lengths[bone]+Math.hypot(end.x-h.pivot.x,end.y-h.pivot.y)-Math.hypot(start.x-h.pivot.x,start.y-h.pivot.y),scope);
      }
      if(root){
        const width=root[1]==='Shoulder'?'shoulderWidth':'pelvisWidth',half=root[1]==='Shoulder'?22:15;
        return poseChange(clip,index,{[width]:p[width]+(end.x-start.x)*100/half*(root[0]==='near'?1:-1)},scope);
      }
      return copy(clip);
    }
    if(tool==='move'||key==='bodyY'){
      const dx=end.x-start.x,dy=end.y-start.y;
      if(key==='bodyY'||!root&&!bone)return poseChange(clip,index,{bodyX:p.bodyX+dx,bodyY:p.bodyY+dy},scope);
      const prefix=root?root.join(''):key.slice(0,key.startsWith('near')?4:3)+(key.includes('Shoulder')||key.includes('Elbow')?'Shoulder':'Hip');
      return poseChange(clip,index,{[prefix+'OffsetX']:p[prefix+'OffsetX']+dx,[prefix+'OffsetY']:p[prefix+'OffsetY']+dy},scope);
    }
    const next=R.dragPose(p,key,start,end,{lengths:p.rig_lengths});
    if(root){next.shoulderWidth=p.shoulderWidth;next.pelvisWidth=p.pelvisWidth;}
    return poseChange(clip,index,Object.fromEntries(R.fields.filter(([k])=>next[k]!==p[k]).map(([k])=>[k,next[k]])),scope);
  }
  function partChange(clip,skin,index,key,values,scope='frame'){
    const out=copy(clip),s=copy(skin),effective=C.partFor(skin,key,C.sample(clip,index,false));
    let target;
    if(scope==='all')target=s.parts[key];else{const e=editAt(out,index);e.parts??={};target=e.parts[key]??={};}
    if(values.offset){
      const delta=values.offset.map((v,i)=>v-effective.offset[i]),old=target.offset||[0,0];
      // Bound effective offsets in every affected frame while retaining local exceptions.
      target.offset=old.map((v,axis)=>{
        const vals=scope==='all'?[s.parts[key].offset?.[axis]||0,...clip.frames.map((_,i)=>C.partFor(skin,key,C.sample(clip,i,false)).offset[axis])]:[effective.offset[axis]];
        return v+R.clamp(delta[axis],Math.max(...vals.map(v=>-2000-v)),Math.min(...vals.map(v=>2000-v)));
      });
    }
    if(Number.isFinite(values.rotation))target.rotation=wrap((target.rotation||0)+wrap(values.rotation-effective.rotation));
    if(values.pivot_offset){
      const old=target.pivot_offset||[0,0];
      target.pivot_offset=old.map((v,axis)=>{
        const vals=scope==='all'?[skin.parts[key].pivot_offset?.[axis]||0,...clip.frames.map((_,i)=>C.partFor(skin,key,C.sample(clip,i,false)).pivot_offset[axis])]:[effective.pivot_offset[axis]];
        return v+R.clamp(values.pivot_offset[axis]-effective.pivot_offset[axis],Math.max(...vals.map(v=>-2000-v)),Math.min(...vals.map(v=>2000-v)));
      });
    }
    for(const axis of ['scale','scale_x','scale_y'])if(Number.isFinite(values[axis])){
      const vals=scope==='all'?[skin.parts[key][axis]||1,...clip.frames.map((_,i)=>C.partFor(skin,key,C.sample(clip,i,false))[axis])]:[effective[axis]];
      const ratio=R.clamp(values[axis]/effective[axis],Math.max(...vals.map(v=>.1/v)),Math.min(...vals.map(v=>10/v)));
      target[axis]=(target[axis]||1)*ratio;
    }
    return {clip:out,skin:s};
  }
  function pivotChange(clip,skin,index,key,pivot,scope='frame'){
    let result=partChange(clip,skin,index,key,{pivot_offset:pivot},scope);
    if(scope==='all')result.skin.parts[key].offset=C.repivot(skin.parts[key],result.skin.parts[key].pivot_offset).offset;
    for(const i of scope==='all'?clip.frames.map((_,i)=>i):[index]){
      const before=C.partFor(skin,key,C.sample(clip,i,false)),after=C.partFor(result.skin,key,C.sample(result.clip,i,false));
      const offset=C.repivot(before,after.pivot_offset).offset;
      if(offset.some(v=>Math.abs(v)>2000))return {clip:copy(clip),skin:copy(skin)};
      if(offset.some((v,j)=>Math.abs(v-after.offset[j])>1e-9))result=partChange(result.clip,result.skin,i,key,{offset},'frame');
    }
    if((result.skin.parts[key].offset||[]).some(v=>Math.abs(v)>2000))return {clip:copy(clip),skin:copy(skin)};
    return result;
  }
  function fadeChange(clip,skin,index,key,end,values,scope='frame'){
    const out=copy(clip),s=copy(skin);
    if(!C.canFade(key)||!s.parts[key]||!['start','end'].includes(end))return {clip:out,skin:s};
    const effective=C.fadeFor(C.partFor(skin,key,C.sample(clip,index,false)),end);
    const wanted={...effective,...values};C.validateFade({[end]:wanted});
    if(scope==='all'){
      // Apply the same delta to existing exceptions, retaining their differences.
      const change=old=>({...old,
        strength:R.clamp(old.strength+wanted.strength-effective.strength,0,1),
        radius:R.clamp(old.radius+wanted.radius-effective.radius,1,2000),
        offset:[0,1].map(i=>R.clamp((old.offset?.[i]||0)+wanted.offset[i]-effective.offset[i],-2000,2000)),
        angle:wrap((old.angle||0)+wrap(wanted.angle-effective.angle)),
        direction:values.direction??old.direction});
      s.parts[key].joint_fade??={};s.parts[key].joint_fade[end]=change(C.fadeFor(skin.parts[key],end));
      for(const edit of Object.values(out.frame_edits||{}))if(edit.parts?.[key]?.joint_fade?.[end]){
        edit.parts[key].joint_fade[end]=change(edit.parts[key].joint_fade[end]);
      }
    }else{
      const e=editAt(out,index);e.parts??={};e.parts[key]??={};e.parts[key].joint_fade??={};e.parts[key].joint_fade[end]=wanted;
    }
    return {clip:out,skin:s};
  }
  function resetFrame(clip,index){
    const out=copy(clip),e=out.frame_edits?.[index];if(!e)return out;
    Object.assign(out.frames[index],e.pose_base||{});delete out.frame_edits[index];return out;
  }
  function partHandles(skin,key,pose){
    const bone=C.bones(pose)[key];if(!bone||!skin.parts[key])return null;
    const part=C.partFor(skin,key,pose),m=C.matrix(part,bone),at=(x,y)=>({x:m[0]*x+m[2]*y+m[4],y:m[1]*x+m[3]*y+m[5]});
    const [w,h]=part.size;
    return {pivot:at(part.start[0]+part.pivot_offset[0],part.start[1]+part.pivot_offset[1]),attachment:at(...part.start),rotate:at(w/2,-20),size:at(w,h),corners:[[0,0],[w,0],[w,h],[0,h]].map(p=>at(...p))};
  }
  function validateEdits(clip,skin){
    const object=v=>v&&typeof v==='object'&&!Array.isArray(v);
    const number=(v,a,b)=>Number.isFinite(v)&&v>=a-1e-8&&v<=b+1e-8;
    const fail=()=>{throw Error('Neplatné výjimky snímků v záloze.');};
    if(clip.frame_edits!==undefined&&!object(clip.frame_edits))fail();
    for(const [index,e] of Object.entries(clip.frame_edits||{})){
      if(!/^(0|[1-9]\d*)$/.test(index)||Number(index)>=clip.frames.length||!object(e)||Object.keys(e).some(k=>!['pose_base','lengths','parts'].includes(k)))fail();
      for(const key of ['pose_base','lengths','parts'])if(e[key]!==undefined&&!object(e[key]))fail();
      for(const [k,v] of Object.entries(e.pose_base||{}))if(!fields[k]||!number(v,fields[k][2],fields[k][3]))fail();
      for(const [k,v] of Object.entries(e.lengths||{}))if(!(k in R.defaultLengths())||!number(v,.02,50)||!number(R.lengthsFor(clip)[k]*v,5,250))fail();
      for(const [k,v] of Object.entries(e.parts||{})){
        if(!skin.layers.includes(k)||!object(v)||Object.keys(v).some(k=>!['offset','pivot_offset','scale','scale_x','scale_y','rotation','joint_fade'].includes(k)))fail();
        if(v.pivot_offset!==undefined&&(!Array.isArray(v.pivot_offset)||v.pivot_offset.length!==2||v.pivot_offset.some(n=>!number(n,-4000,4000))))fail();
        if(v.joint_fade!==undefined)C.validateFade(v.joint_fade);
        if(v.offset!==undefined&&(!Array.isArray(v.offset)||v.offset.length!==2||v.offset.some(n=>!number(n,-4000,4000))))fail();
        if(v.rotation!==undefined&&!number(v.rotation,-180,180))fail();
        for(const axis of ['scale','scale_x','scale_y'])if(v[axis]!==undefined&&!number(v[axis],.01,100))fail();
        const p=C.partFor(skin,k,{part_edits:e.parts});if(['scale','scale_x','scale_y'].some(axis=>!number(p[axis],.1,10))||p.offset.some(n=>!number(n,-2000,2000))||p.pivot_offset.some(n=>!number(n,-2000,2000)))fail();
      }
    }
  }
  return {poseChange,lengthChange,boneForHandle,dragSkeleton,partChange,pivotChange,fadeChange,resetFrame,partHandles,validateEdits};
});
