/* Shared controls for skeleton branches and independent attached images. */
window.mountRigExtras=function(host,api){
  const X=window.RigExtensions,C=window.CutoutRig,copy=v=>JSON.parse(JSON.stringify(v));
  const frames=`<div class="row actions"><button data-action="addFrame">＋ Snímek</button><button data-action="removeFrame" class="danger">🗑 Snímek</button><button data-action="moveBack" title="Prohodit s předchozím snímkem, i první s posledním">◀ Přesunout</button><button data-action="moveForward" title="Prohodit s dalším snímkem, i poslední s prvním">Přesunout ▶</button><button data-action="new">Nová · 8 snímků</button></div>`;
  const boneBlock=`<label>Kost <span class="inline-actions"><select data-field="boneFilter"></select><button data-action="addBone" title="Přidat novou kost navázanou na vybranou">＋</button><button data-action="removeBone" class="danger">🗑</button></span></label>
  <div data-section="bone"><label>Název <input data-field="label" maxlength="100"></label><label>Připojit ke kosti <select data-field="parent"></select></label>
  <label>Místo na rodiči (0–1) <input type="number" data-field="at" min="0" max="1" step="0.1"></label><label>Délka <input type="number" data-field="length" min="1" max="1000"></label>
  <label>Posun podél rodiče <input type="number" data-field="x" min="-2000" max="2000"></label><label>Posun napříč rodičem <input type="number" data-field="y" min="-2000" max="2000"></label>
  <label>Natočení ve snímku (°) <input type="number" data-field="angle" min="-180" max="180"></label><label><input type="checkbox" data-field="all"> Změnu natočení použít na všechny snímky</label></div>`;
  const bitmaps=`<p class="list-title">Bitmapy na této kosti</p><ul class="bitmap-list" data-section="bitmaps"></ul>
  <label>Dostupné bitmapy <select data-field="source"></select></label><div class="row actions"><button data-action="attach">Přidat tuto bitmapu na kost</button></div>`;
  const help=api.skin
    ?'Nahoře zvol kost. ＋ přidá novou kost navázanou na ni, 🗑 vybranou kost smaže i s bitmapami, které jsi na ni přilepil; základní kost smazat nelze. Pod kostí je seznam bitmap, které na ní sedí — díly z bitmapové předlohy i ty, které jsi přidal sám. Na konci řádku zámek přepíná zachování velikosti při změně délky kosti a popelnice bitmapu odebere: přidanou smaže, díl z předlohy jen vypne v této animaci a šipkou ho vrátíš. Předloha ani PNG se nikdy nemění. Dole vyber bitmapu a tlačítkem ji přidáš na zvolenou kost. Vše vrátíš tlačítkem Zpět; trvale se to uloží až uložením hotové animace.'
    :'Nová animace má osm snímků; ＋ Snímek vloží kopii aktuálního, 🗑 Snímek jej odebere a Přesunout jej prohodí se sousedním i přes konec smyčky. Zvolená kost je zároveň rodičem pro ＋, který přidá novou navázanou kost; 🗑 vybranou kost smaže včetně jejích větví. Základní kosti smazat nelze. Vše vrátíš tlačítkem Zpět.';
  host.innerHTML=`<details class="rig-extras-section" open><summary><span>${api.skin?'Bitmapy na kostech':'Snímky a přidané kosti'}</span><button type="button" class="help" aria-label="Nápověda">?<span class="help-text" role="tooltip">${help}</span></button></summary>
  ${api.frameHost?'':frames}${boneBlock}${api.skin?bitmaps:''}</details>`;
  if(api.frameHost)api.frameHost.innerHTML=`<div class="rig-extras-section">${frames}</div>`;
  const roots=api.frameHost?[host,api.frameHost]:[host];
  const find=selector=>{for(const root of roots){const el=root.querySelector(selector);if(el)return el;}return null;};
  const $=id=>find(`[data-field="${id}"]`),button=id=>find(`[data-action="${id}"]`);
  for(const root of roots)for(const item of root.querySelectorAll('.help')){
    item.onclick=e=>{e.preventDefault();e.stopPropagation();item.classList.add('help-open');};
    item.onmouseleave=()=>item.classList.remove('help-open');
  }
  let selected='';
  const labels={torso:'Trup',head:'Hlava',neck:'Krk',pelvis:'Pánev',backpack:'Úchyt nádrže',megaphone:'Úchyt amplionu',nearUpperArm:'Bližší nadloktí',nearForearm:'Bližší předloktí',farUpperArm:'Vzdálenější nadloktí',farForearm:'Vzdálenější předloktí',nearThigh:'Bližší stehno',nearShin:'Bližší holeň',nearFoot:'Bližší chodidlo',farThigh:'Vzdálenější stehno',farShin:'Vzdálenější holeň',farFoot:'Vzdálenější chodidlo'};
  function options(el,entries){const chosen=el.value,signature=JSON.stringify(entries);if(el.dataset.options===signature)return;el.replaceChildren();for(const [id,label] of entries){const o=document.createElement('option');o.value=id;o.textContent=label;el.append(o);}el.dataset.options=signature;if(entries.some(e=>e[0]===chosen))el.value=chosen;}
  const value=(id,v)=>{if(document.activeElement!==$(id))$(id).value=v;};
  function refresh(){
    const clip=api.clip(),bones=clip.extra_bones||{};
    const all=[...X.baseNames.map(k=>[k,labels[k]||k]),...Object.entries(bones).map(([k,b])=>[k,b.label])];
    options($('boneFilter'),all);
    if(!all.some(([id])=>id===$('boneFilter').value))$('boneFilter').value=all[0]?.[0]||'';
    const key=$('boneFilter').value,b=bones[key];
    host.querySelector('[data-section="bone"]').hidden=!b;
    const drop=button('removeBone');
    drop.disabled=!b;
    drop.title=b?'Smazat tuto kost i s přilepenými bitmapami':'Základní kost smazat nelze.';
    button('removeFrame').disabled=clip.frames.length<=1;button('addFrame').disabled=clip.frames.length>=256;
    if(b){options($('parent'),all.filter(([id])=>!X.descendants(bones,key).has(id)));value('parent',b.parent);value('label',b.label);for(const field of ['at','length'])value(field,b[field]);value('x',b.offset[0]);value('y',b.offset[1]);value('angle',clip.frames[api.index()].extra_pose?.[key]?.angle||0);}
    if(!api.skin)return;
    const skin=api.skin(),boneOf=k=>skin.parts[k].bone||k,list=host.querySelector('[data-section="bitmaps"]');
    options($('source'),Object.entries(skin.parts).filter(([,p])=>!p.source_part).map(([k,p])=>[k,p.label||k]));
    const onBone=skin.layers.filter(k=>boneOf(k)===key);
    if(!onBone.includes(selected))selected=onBone[0]||'';
    list.replaceChildren();
    if(!onBone.length){const empty=document.createElement('li');empty.className='empty';empty.textContent='Na této kosti zatím žádná bitmapa není.';list.append(empty);}
    onBone.forEach((k,i)=>list.append(row(k,skin.parts[k],i+1)));
  }
  // One row per bitmap on the bone, laid out like the layer list: number, name, icons.
  function row(key,part,number){
    const off=part.enabled===false,li=document.createElement('li');
    li.className=[off?'off':'',key===selected?'selected':''].filter(Boolean).join(' ');
    const name=document.createElement('button');
    name.type='button';name.className='name';name.textContent=`${number}. ${part.label||key}`+(off?' · vypnuto':'');
    name.title=name.textContent;
    name.onclick=()=>{selected=key;api.selectPart?.(key);refresh();};
    const actions=document.createElement('span');actions.className='row-actions';
    const lock=document.createElement('button');
    lock.type='button';lock.className='icon';lock.textContent=part.fixed_length?'🔒':'🔓';
    lock.setAttribute('aria-pressed',String(Boolean(part.fixed_length)));
    lock.title=(part.fixed_length?'Velikost je zachovaná':'Velikost sleduje kost')+' — zachovat velikost při změně délky kosti';
    lock.onclick=()=>act('bitmap',()=>{
      const p=api.skin().parts[key],pair=C.bones(C.sample(api.clip(),api.index(),false),undefined,api.skin())[key];
      p.fixed_length=p.fixed_length?null:Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y);
    });
    const bin=document.createElement('button');
    bin.type='button';bin.className='icon danger';bin.textContent=off?'↩':'🗑';
    bin.title=off?'Vrátit tento díl do animace':part.source_part?'Smazat tuto přidanou bitmapu':'Vypnout díl z předlohy v této animaci';
    bin.onclick=()=>removeRow(key);
    actions.append(lock,bin);li.append(name,actions);
    return li;
  }
  function removeRow(key){
    const part=api.skin().parts[key];if(!part)return;
    if(part.enabled===false){act('bitmap',()=>{api.skin().parts[key].enabled=true;});return;}
    if(!part.source_part){
      if(!confirm(`Vypnout „${part.label}“ v této animaci? Díl zůstane v předloze i v seznamu a šipkou ho vrátíš.`))return;
      act('bitmap',()=>{api.skin().parts[key].enabled=false;});return;
    }
    if(!confirm(`Smazat přidanou bitmapu „${part.label}“? Zdrojový díl v předloze zůstane.`))return;
    act('bitmap',()=>{dropAttachment(key);selected='';});
  }
  function dropAttachment(key){
    const skin=api.skin(),clip=api.clip(),next=window.CutoutEditor.removeAttachment(clip,skin,key);
    skin.parts=next.skin.parts;skin.layers=next.skin.layers;
    if(next.clip.frame_edits)clip.frame_edits=next.clip.frame_edits;else delete clip.frame_edits;
    api.dropImage?.(key);
  }
  function act(kind,fn){try{api.change(kind,fn);refresh();}catch(e){api.error(e.message);}}
  button('new').onclick=()=>{if(!confirm('Začít novou animaci s osmi snímky? Rozpracované změny lze vrátit tlačítkem Zpět.'))return;act('skeleton',()=>api.replace({id:'',name:'Nová animace',fps:8,frames:Array.from({length:8},()=>window.PoseRig.neutral()),extra_bones:{},frame_edits:{}},0,true));};
  for(const [id,remove] of [['addFrame',false],['removeFrame',true]])button(id).onclick=()=>act('skeleton',()=>{const result=X.changeFrames(api.clip(),api.index(),remove);api.replace(result.clip,result.index);});
  for(const [id,step] of [['moveBack',-1],['moveForward',1]])button(id).onclick=()=>act('skeleton',()=>{const result=X.moveFrame(api.clip(),api.index(),step);api.replace(result.clip,result.index);});
  button('addBone').onclick=()=>{const label=prompt('Název nové kosti','Další kost')?.trim();if(!label)return;act('skeleton',()=>{const clip=api.clip();clip.extra_bones??={};const id='extra_'+crypto.randomUUID().replaceAll('-','');clip.extra_bones[id]={label,parent:$('boneFilter').value||'torso',at:1,offset:[0,0],length:40,angle:0};refresh();$('boneFilter').value=id;selected='';});};
  button('removeBone').onclick=()=>{
    const key=$('boneFilter').value,bones=api.clip().extra_bones||{};if(!bones[key])return;
    const removed=X.descendants(bones,key),skin=api.skin?.();
    const doomed=skin?skin.layers.filter(k=>removed.has(skin.parts[k].bone||k)&&skin.parts[k].source_part):[];
    if(!confirm(`Smazat kost „${bones[key].label}“ včetně navázaných větví (${removed.size})?`+(doomed.length?`\nSmaže se i ${doomed.length} přilepených bitmap; díly z předlohy se jen vypnou.`:'')))return;
    act('skeleton',()=>{
      const clip=api.clip();
      for(const k of removed){delete clip.extra_bones[k];for(const f of clip.frames)if(f.extra_pose)delete f.extra_pose[k];}
      // Attachments belong to the bone and go with it; parts of the skin itself only switch off.
      for(const k of doomed)dropAttachment(k);
      if(skin)for(const [k,p] of Object.entries(skin.parts))if(removed.has(p.bone||k)){p.bone='torso';p.enabled=false;}
      selected='';$('boneFilter').value='torso';
    });
  };
  $('boneFilter').onchange=()=>{selected='';refresh();};
  for(const field of ['label','parent','at','length','x','y','angle'])$(field).onchange=()=>act('skeleton',()=>{
    const clip=api.clip(),key=$('boneFilter').value,b=clip.extra_bones[key];
    const next=copy(b),v=['label','parent'].includes(field)?$(field).value:Number($(field).value);
    if(field==='angle'){if(!Number.isFinite(v)||Math.abs(v)>180)throw Error('Úhel musí být −180 až 180°.');const old=clip.frames[api.index()].extra_pose?.[key]?.angle||0;for(const i of $('all').checked?clip.frames.map((_,i)=>i):[api.index()]){const f=clip.frames[i];f.extra_pose??={};f.extra_pose[key]??={};f.extra_pose[key].angle=((f.extra_pose[key].angle||0)+v-old+540)%360-180;}}
    else{if(field==='x'||field==='y')next.offset[field==='x'?0:1]=v;else next[field]=v;X.validate({...clip.extra_bones,[key]:next});clip.extra_bones[key]=next;}
  });
  if(api.skin)button('attach').onclick=()=>act('bitmap',()=>{const skin=api.skin(),source=$('source').value,target=$('boneFilter').value||'torso',key='attachment_'+crypto.randomUUID().replaceAll('-',''),part=copy(skin.parts[source]);Object.assign(part,{source_part:source,label:part.label+' · doplněk',bone:target,enabled:true,opacity:1,offset:[0,0],rotation:0,scale:1,scale_x:1,scale_y:1,warp:[[0,0],[0,0],[0,0],[0,0]],joint_fade:{},pivot_offset:[0,0]});const pair=C.bones(C.sample(api.clip(),api.index(),false))[target];part.fixed_length=Math.hypot(pair[1].x-pair[0].x,pair[1].y-pair[0].y);skin.parts[key]=part;skin.layers.push(key);api.aliasImage(key,source);selected=key;api.selectPart?.(key);});
  refresh();return {refresh,selectPart:key=>{const p=api.skin&&api.skin().parts[key];if(!p)return;$('boneFilter').value=p.bone||key;selected=key;refresh();}};
};
