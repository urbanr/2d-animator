/* Local pose editor. All persistence goes through the same local gallery server. */
(async function() {
  'use strict';
  const R=window.PoseRig,M=window.MotionPreview, $=id=>document.getElementById(id), clone=value=>JSON.parse(JSON.stringify(value));
  let data, current, index=0, baseline, playing=false, timer, dirty=false, history=[];
  const inputs=new Map();
  let distance=0,frameTime=0,lastTime=0,visible=true;
  let zoom=1;
  let drag=null, saving=false;
  const status=(message,error=false)=>{$('status').textContent=message;$('status').classList.toggle('error',error);};
  function stop() { clearInterval(timer); playing=false;distance=0;frameTime=0;lastTime=0; $('play').textContent='▶ Přehrát'; }
  function remember() { history.push({frames:clone(current.frames),frame_edits:clone(current.frame_edits||{}),index,fps:current.fps,move_speed_pt_s:M.speed(current),rig_lengths:R.lengthsFor(current)}); if(history.length>80)history.shift(); }
  function mark() {dirty=true;$('dirty').textContent='Neuložené změny animace';}
  function draw() {
    $('stage').innerHTML=R.svg(current.frames[index],{editable:!playing,side:$('dragSide')?.value||'',offsetX:$('travel').checked?M.offset(distance):0,lengths:R.lengthsFor(current,index),zoom});
    $('zoomLabel').textContent=Math.round(zoom*100)+' %';
    $('frameLabel').textContent=`Snímek ${index+1} / ${current.frames.length}${playing?' · přehrávání':''}`;
    for(const [key,pair] of inputs) pair.forEach(input=>input.value=current.frames[index][key]??R.neutral()[key]);
    [...$('frames').children].forEach((button,i)=>button.setAttribute('aria-pressed',String(i===index)));
    $('undo').disabled=history.length===0;
  }
  function frameStrip() {
    $('frames').replaceChildren();
    current.frames.forEach((frame,i)=>{
      const button=document.createElement('button');button.type='button';button.setAttribute('aria-label',`Upravit snímek ${i+1}`);
      button.innerHTML=R.svg(frame,{lengths:R.lengthsFor(current,i)})+`<span>${i+1}</span>`;
      button.onclick=()=>{stop();index=i;draw();};$('frames').append(button);
    });
  }
  function updateFrame(key,value,record=true) {
    stop(); if(record)remember();
    const field=R.fields.find(f=>f[0]===key);
    current.frames[index][key]=Math.round(R.clamp(value,field[2],field[3])*10)/10;
    mark();frameStrip();draw();
  }
  function controls() {
    let group,fieldset;
    for(const [key,label,min,max,unit,section] of R.fields) {
      if(section!==group) {
        group=section;fieldset=document.createElement('fieldset');
        const legend=document.createElement('legend');legend.textContent=section;
        legend.className=section.startsWith('Bližší')?'near':section.startsWith('Vzdálenější')?'far':'';
        fieldset.append(legend);$('controls').append(fieldset);
      }
      const row=document.createElement('div');row.className='control-row';
      const text=document.createElement('label');text.htmlFor=key+'-number';text.textContent=`${label} (${unit})`;
      const number=document.createElement('input');number.type='number';number.id=key+'-number';number.min=min;number.max=max;number.step=0.1;
      const range=document.createElement('input');range.type='range';range.min=min;range.max=max;range.step=0.1;range.setAttribute('aria-label',`${section}: ${label}`);
      let sliding=false;
      range.onpointerdown=()=>{stop();remember();sliding=true;};
      range.oninput=()=>updateFrame(key,Number(range.value),!sliding);
      range.onchange=()=>{sliding=false;};
      range.onpointercancel=()=>{sliding=false;};
      number.onchange=()=>{if(Number.isFinite(number.valueAsNumber))updateFrame(key,number.valueAsNumber);else draw();};
      inputs.set(key,[number,range]);row.append(text,number,range);fieldset.append(row);
    }
  }
  function clipOptions(selected) {
    $('clip').replaceChildren();
    for(const clip of Object.values(data.clips)) {const option=document.createElement('option');option.value=clip.id;option.textContent=clip.name;$('clip').append(option);}
    $('clip').value=selected;
  }
  function selectClip(id) {
    stop();current=clone(data.clips[id]);baseline=clone(current.frames);index=0;history=[];dirty=false;
    $('dirty').textContent='';$('fps').value=current.fps;$('clipName').value=current.name+' · moje verze';
    $('moveSpeed').value=M.speed(current);
    frameStrip();draw();
  }
  function drawLibrary() {
    const search=$('search').value.toLocaleLowerCase('cs');$('library').replaceChildren();
    for(const pose of Object.values(data.poses).reverse()) {
      if(!pose.name.toLocaleLowerCase('cs').includes(search))continue;
      const button=document.createElement('button');button.className='pose-card';button.type='button';button.title='Vložit do vybraného snímku';
      const picture=document.createElement('div');picture.innerHTML=R.svg(pose.frame);
      const name=document.createElement('span');name.textContent=pose.name;button.append(picture,name);
      button.onclick=()=>{stop();remember();current.frames[index]=clone(pose.frame);mark();frameStrip();draw();status(`Póza „${pose.name}“ vložena do snímku ${index+1}.`);};
      $('library').append(button);
    }
  }
  async function save(kind,overwrite=false) {
    if(saving)return;
    stop();
    const name=overwrite?current.name:$(kind==='pose'?'poseName':'clipName').value.trim();
    if(!name){status('Nejdřív napiš název.',true);return;}
    if(overwrite&&!confirm(`Uložit změny do animace „${current.name}“? Předchozí stav se zazálohuje. Ostatní animace zůstanou beze změny.`))return;
    const payload=kind==='pose'?{kind,name,frame:clone(current.frames[index])}:{kind,name,frames:clone(current.frames),fps:current.fps,move_speed_pt_s:M.speed(current),rig_lengths:R.lengthsFor(current)};
    if(kind==='clip')payload.frame_edits=clone(current.frame_edits||{});
    if(overwrite)Object.assign(payload,{mode:'update',id:current.id,expectedRecord:clone(data.clips[current.id])});
    const snapshot=JSON.stringify(current);
    saving=true;for(const id of ['savePose','saveClip','updateClip'])$(id).disabled=true;
    status('Ukládám do souboru…');
    try {
      const response=await fetch('/api/poses',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(payload)});
      const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Uložení se nezdařilo.');
      data[result.collection][result.record.id]=result.record;
      if(kind==='clip') {
        const changed=snapshot!==JSON.stringify(current);
        clipOptions(changed?current.id:result.record.id);
        if(!changed) {
          if(overwrite){current=clone(result.record);baseline=clone(current.frames);dirty=false;history=[];$('dirty').textContent='';draw();}
          else selectClip(result.record.id);
        }
        status(changed?'Verze uložena; novější úpravy ještě nejsou uložené.':overwrite?`Změny uložené do „${result.record.name}“. Předchozí stav je v záloze.`:'Celá animace uložená jako nová varianta.');
      } else {drawLibrary();status('Nová póza uložená v knihovně. Změny celé smyčky uložíš zvlášť.');}
    } catch(error) {status(`Neuloženo: ${error.message} Použij místní editor na http://127.0.0.1:8765.`,true);}
    finally {saving=false;for(const id of ['savePose','saveClip','updateClip'])$(id).disabled=false;}
  }
  function download(text,name) {
    const url=URL.createObjectURL(new Blob([text],{type:'image/svg+xml'}));
    const a=document.createElement('a');a.href=url;a.download=name;a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  try {
    const response=await fetch('../graphics/poses/poses.json');if(!response.ok)throw Error('Knihovna není dostupná.');
    data=await response.json();
    const initial=Object.values(data.clips).find(clip=>clip.name==='Zombie · šouravá chůze v1')?.id||Object.values(data.clips).find(clip=>clip.name==='Chůze · přirozený krok v4')?.id||Object.values(data.clips).find(clip=>clip.name==='Sprint · jemnější ramena v3')?.id||Object.values(data.clips).find(clip=>clip.name==='Sprint · ramena a pánev v2')?.id||'sprint-v1';
    controls();clipOptions(initial);selectClip(initial);drawLibrary();status('Připraveno. Úpravy se ukládají až příslušným tlačítkem.');
  } catch(error){status(error.message,true);return;}
  $('clip').onchange=()=>{
    if(dirty&&!confirm('Animace má neuložené změny. Přepnout bez jejich uložení?')){$('clip').value=current.id;return;}
    selectClip($('clip').value);
  };
  const stage=$('stage');
  function setZoom(value){zoom=Math.max(.4,Math.min(4,value));draw();}
  stage.onwheel=e=>{e.preventDefault();setZoom(window.EditorView.zoom(zoom,e.deltaY));};
  stage.oncontextmenu=e=>e.preventDefault();
  $('zoomOut').onclick=()=>setZoom(zoom/1.2);$('zoomIn').onclick=()=>setZoom(zoom*1.2);$('zoomReset').onclick=()=>setZoom(1);
  function pointerPoint(event) {
    const svg=stage.querySelector('svg'), matrix=svg?.getScreenCTM();
    if(!matrix)return null;
    const point=svg.createSVGPoint();point.x=event.clientX;point.y=event.clientY;
    return point.matrixTransform(matrix.inverse());
  }
  stage.onpointerdown=event=>{
    if(event.button!==0||drag)return;
    const handle=event.target.closest('[data-joint]');if(!handle)return;
    const start=pointerPoint(event);if(!start)return;
    event.preventDefault();stop();
    drag={id:event.pointerId,key:handle.dataset.joint,start,clip:clone(current),ctrlKey:event.ctrlKey,changed:false};
    // Capture on the stable container: SVG is redrawn throughout the drag.
    stage.setPointerCapture(event.pointerId);
  };
  stage.onpointermove=event=>{
    if(!drag||drag.id!==event.pointerId)return;
    const end=pointerPoint(event);if(!end)return;
    const updated=R.dragClip(drag.clip,index,drag.key,drag.start,end,{ctrlKey:drag.ctrlKey});
    if(JSON.stringify(updated)===JSON.stringify(current))return;
    if(!drag.changed){remember();drag.changed=true;}
    current=updated;mark();draw();
  };
  function finishDrag(event) {
    if(!drag||drag.id!==event.pointerId)return;
    drag=null;if(stage.hasPointerCapture(event.pointerId))stage.releasePointerCapture(event.pointerId);
    frameStrip();draw();
  }
  stage.onpointerup=finishDrag;stage.onpointercancel=finishDrag;stage.onlostpointercapture=finishDrag;
  if($('dragSide'))$('dragSide').onchange=draw;
  $('play').onclick=()=>{
    if(playing){stop();draw();return;}
    playing=true;$('play').textContent='❚❚ Zastavit';
    lastTime=0;draw();
  };
  $('fps').onchange=()=>{stop();remember();current.fps=Math.round(R.clamp(Number($('fps').value)||8,1,30));$('fps').value=current.fps;mark();draw();};
  $('moveSpeed').onchange=()=>{stop();remember();const value=Number($('moveSpeed').value);current.move_speed_pt_s=Number.isFinite(value)?R.clamp(value,0,1000):M.DEFAULT_SPEED;$('moveSpeed').value=current.move_speed_pt_s;mark();draw();};
  $('travel').onchange=()=>{distance=0;draw();};
  $('previous').onclick=()=>{stop();index=(index+current.frames.length-1)%current.frames.length;draw();};
  $('next').onclick=()=>{stop();index=(index+1)%current.frames.length;draw();};
  $('up').onclick=event=>updateFrame('bodyY',current.frames[index].bodyY-(event.shiftKey?10:1));
  $('down').onclick=event=>updateFrame('bodyY',current.frames[index].bodyY+(event.shiftKey?10:1));
  function swap(direction) {stop();remember();const next=(index+direction+current.frames.length)%current.frames.length;[current.frames[index],current.frames[next]]=[current.frames[next],current.frames[index]];if(current.frame_edits){const edits=current.frame_edits,a=edits[index],b=edits[next];delete edits[index];delete edits[next];if(a)edits[next]=a;if(b)edits[index]=b;}index=next;mark();frameStrip();draw();}
  $('swapLeft').onclick=()=>swap(-1);$('swapRight').onclick=()=>swap(1);
  $('restore').onclick=()=>{stop();remember();current.frames[index]=clone(baseline[index]);mark();frameStrip();draw();};
  $('undo').onclick=()=>{stop();const previous=history.pop();if(previous){current.frames=previous.frames;current.frame_edits=previous.frame_edits;current.fps=previous.fps;current.rig_lengths=previous.rig_lengths;current.move_speed_pt_s=previous.move_speed_pt_s;$('fps').value=current.fps;$('moveSpeed').value=M.speed(current);index=previous.index;mark();frameStrip();draw();}};
  $('savePose').onclick=()=>save('pose');$('saveClip').onclick=()=>save('clip');$('search').oninput=drawLibrary;
  $('updateClip').onclick=()=>save('clip',true);
  $('exportFrame').onclick=()=>download(R.svg(current.frames[index],{lengths:R.lengthsFor(current,index)}),`pose-${index+1}.svg`);
  $('exportSheet').onclick=()=>{
    const rows=Math.ceil(current.frames.length/4);
    const cells=current.frames.map((p,i)=>R.svg(p,{lengths:R.lengthsFor(current,i)}).replace('<svg ',`<svg x="${(i%4)*512}" y="${Math.floor(i/4)*560}" `)).join('');
    download(`<svg xmlns="http://www.w3.org/2000/svg" width="2048" height="${rows*560}" viewBox="0 0 2048 ${rows*560}">${cells}</svg>`,'pose-sheet.svg');
  };
  window.addEventListener('beforeunload',event=>{if(dirty){event.preventDefault();event.returnValue='';}});
  window.addEventListener('message',e=>{if(e.source===parent&&e.origin===location.origin&&e.data?.type==='preview-visibility'){visible=Boolean(e.data.visible);lastTime=0;}});
  function tick(now){
    const dt=lastTime?Math.min(.1,(now-lastTime)/1000):0;lastTime=now;
    if(playing&&visible&&!document.hidden){
      frameTime+=dt*current.fps;
      const steps=Math.floor(frameTime);frameTime-=steps;index=(index+steps)%current.frames.length;
      if($('travel').checked)distance=(distance+M.speed(current)*dt)%48;
      draw();
    }
    requestAnimationFrame(tick);
  }
  requestAnimationFrame(tick);
})();
