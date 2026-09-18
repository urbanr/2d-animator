/* Additional bones, independent bitmap attachments and variable frame counts. */
(function(root,factory){
  if(typeof module==='object'&&module.exports)module.exports=factory();
  else root.RigExtensions=factory();
})(typeof globalThis!=='undefined'?globalThis:this,function(){
  'use strict';
  const copy=v=>JSON.parse(JSON.stringify(v));
  const baseNames=['torso','head','neck','pelvis','backpack','megaphone',...['near','far'].flatMap(s=>['UpperArm','Forearm','Thigh','Shin','Foot'].map(k=>s+k))];
  function validate(bones={}){
    if(!bones||typeof bones!=='object'||Array.isArray(bones)||Object.keys(bones).length>128)throw Error('Neplatné přidané kosti.');
    const visited=new Set(),active=new Set();
    function visit(key){
      if(visited.has(key))return;
      if(active.has(key)||baseNames.includes(key))throw Error('Kosti nesmějí tvořit kruh ani přepsat základní kost.');
      const b=bones[key];if(!b||!/^extra_[a-zA-Z0-9_-]+$/.test(key)||typeof b.label!=='string'||!b.label.trim()||b.label.length>100||!Array.isArray(b.offset)||b.offset.length!==2||b.offset.some(v=>!Number.isFinite(v)||Math.abs(v)>2000)||!Number.isFinite(b.angle)||Math.abs(b.angle)>180||!Number.isFinite(b.length)||b.length<1||b.length>1000||!Number.isFinite(b.at)||b.at<0||b.at>1)throw Error('Neplatné nastavení přidané kosti.');
      active.add(key);if(!baseNames.includes(b.parent)){if(!bones[b.parent])throw Error('Nadřazená kost neexistuje.');visit(b.parent);}active.delete(key);visited.add(key);
    }
    Object.keys(bones).forEach(visit);return bones;
  }
  function resolve(base,definitions={},pose={}){
    validate(definitions);const out={...base};
    function get(key){
      if(out[key])return out[key];
      const b=definitions[key],e=pose[key]||{},[a,z]=get(b.parent),theta=Math.atan2(z.y-a.y,z.x-a.x),c=Math.cos(theta),s=Math.sin(theta),x=b.offset[0]+(e.x||0),y=b.offset[1]+(e.y||0);
      const p={x:a.x+(z.x-a.x)*b.at+c*x-s*y,y:a.y+(z.y-a.y)*b.at+s*x+c*y},angle=theta+(b.angle+(e.angle||0))*Math.PI/180;
      return out[key]=[p,{x:p.x+Math.cos(angle)*b.length,y:p.y+Math.sin(angle)*b.length}];
    }
    Object.keys(definitions).forEach(get);return out;
  }
  function changeFrames(clip,index,remove=false){
    const out=copy(clip),n=out.frames.length;
    if(remove&&n<=1)throw Error('Musí zůstat alespoň jeden snímek.');
    if(!remove&&n>=256)throw Error('Maximum je 256 snímků.');
    const at=remove?index:index+1,edits={};
    for(const [i,v] of Object.entries(out.frame_edits||{})){const j=Number(i);if(remove&&j===at)continue;edits[j<at?j:j+(remove?-1:1)]=v;}
    if(remove)out.frames.splice(at,1);else{out.frames.splice(at,0,copy(out.frames[index]));if(out.frame_edits?.[index])edits[at]=copy(out.frame_edits[index]);}
    out.frame_edits=edits;return {clip:out,index:Math.min(at,out.frames.length-1)};
  }
  function moveFrame(clip,index,step){
    const out=copy(clip),n=out.frames.length,next=(index+step%n+n)%n;
    if(next===index)return {clip:out,index};
    [out.frames[index],out.frames[next]]=[out.frames[next],out.frames[index]];
    const edits=out.frame_edits;
    if(edits){const a=edits[index],b=edits[next];delete edits[index];delete edits[next];if(a)edits[next]=a;if(b)edits[index]=b;}
    return {clip:out,index:next};
  }
  function descendants(bones,key){const found=new Set([key]);let changed=true;while(changed){changed=false;for(const [id,b] of Object.entries(bones))if(found.has(b.parent)&&!found.has(id)){found.add(id);changed=true;}}return found;}
  function dragBone(clip,index,key,from,to,{bones,scope='frame',tool='rotate',ctrlKey=false}={}){
    const out=copy(clip),definition=out.extra_bones?.[key];if(!definition)return out;
    const [a,z]=bones[key],parent=bones[definition.parent],theta=Math.atan2(parent[1].y-parent[0].y,parent[1].x-parent[0].x);
    if(ctrlKey||tool==='size'){definition.length=Math.max(1,Math.min(1000,definition.length+Math.hypot(to.x-a.x,to.y-a.y)-Math.hypot(from.x-a.x,from.y-a.y)));return out;}
    const dx=to.x-from.x,dy=to.y-from.y,angle=(Math.atan2(to.y-a.y,to.x-a.x)-Math.atan2(from.y-a.y,from.x-a.x))*180/Math.PI;
    for(const i of scope==='all'?out.frames.map((_,i)=>i):[index]){const f=out.frames[i];f.extra_pose??={};const p=f.extra_pose[key]??={};if(tool==='move'){p.x=Math.max(-2000,Math.min(2000,(p.x||0)+Math.cos(theta)*dx+Math.sin(theta)*dy));p.y=Math.max(-2000,Math.min(2000,(p.y||0)-Math.sin(theta)*dx+Math.cos(theta)*dy));}else p.angle=((p.angle||0)+angle+540)%360-180;}
    return out;
  }
  return {baseNames,validate,resolve,changeFrames,moveFrame,descendants,dragBone};
});
