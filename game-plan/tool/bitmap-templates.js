(async()=>{
  'use strict';
  const root=document.getElementById('templates'),select=document.getElementById('templateSelect');
  try{
    const catalog=await fetch('../graphics/bitmapove-predlohy/skins.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Katalog není dostupný.');return response.json();});
    const entries=catalog.templates||catalog.skins||{},ids=Object.keys(entries);
    select.replaceChildren();
    for(const id of ids){const option=document.createElement('option');option.value=id;option.textContent=entries[id].name;select.append(option);}
    const render=async id=>{
      const entry=entries[id];if(!entry)throw Error('Neznámá bitmapová předloha.');
      const base=new URL('../graphics/bitmapove-predlohy/'+entry.path,location.href),skin=await fetch(base,{cache:'no-store'}).then(response=>response.json());
      root.replaceChildren();
      const section=document.createElement('section');section.className='template';
      const title=document.createElement('h2');title.textContent=entry.name;
      const layers=skin.layers||skin.order||Object.keys(skin.parts||{});
      const note=document.createElement('p');note.textContent=`${id} · ${layers.filter(key=>skin.parts?.[key]&&!['shoulders'].includes(key)).length} bitmapových dílů`;
      const status=document.createElement('span');status.className='status'+(entry.animator_ready?' ready':'');status.textContent=entry.animator_ready?'Připraveno pro Animátor':'Jen rozřezané díly · bez kloubových úchytů';
      const parts=document.createElement('div');parts.className='parts';
      const send=async payload=>{
        const response=await fetch('/api/bitmap-templates',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({id,expectedRecord:skin,...payload})});
        const result=await response.json();if(!response.ok||!result.ok)throw Error(result.error||'Uložení selhalo.');
        await render(id);
      };
      // Each part can be redrawn on disk and reloaded in place, keeping its joint handles.
      const readPNG=file=>new Promise((resolve,reject)=>{const reader=new FileReader();reader.onload=()=>resolve(reader.result.split(',')[1]);reader.onerror=reject;reader.readAsDataURL(file);});
      for(const key of layers){
        const part=skin.parts?.[key];if(!part||key==='shoulders'||part.source_part)continue;
        const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');
        figure.className='part';image.src=new URL(part.file,base).href+'?v='+(part.sha256||'').slice(0,8);image.alt=part.label||key;caption.textContent=part.label||key;
        const picker=document.createElement('input');picker.type='file';picker.accept='image/png';picker.hidden=true;
        const reload=document.createElement('button');
        reload.type='button';reload.className='part-menu';reload.textContent='⋯';
        reload.title=`Přenačíst „${part.label||key}“ z disku`;reload.setAttribute('aria-label',reload.title);
        reload.onclick=()=>picker.click();
        picker.onchange=async()=>{
          const file=picker.files[0];picker.value='';
          if(!file)return;
          const before=caption.textContent;caption.textContent='Načítám…';
          try{
            if(file.size>16*1024*1024)throw Error('Vyber PNG do 16 MB.');
            await send({mode:'replace-part',part:key,png:await readPNG(file)});
          }catch(error){caption.textContent=before;caption.dataset.error='1';caption.title=error.message;setTimeout(()=>{delete caption.dataset.error;caption.title='';},6000);}
        };
        figure.append(image,caption,reload,picker);parts.append(figure);
      }
      section.append(title,note,status);
      const reference=document.createElement('figure');reference.className='reference';
      const caption=document.createElement('figcaption');caption.textContent=skin.reference_label||'Celkový návrh postavy';
      if(skin.reference_image){const img=document.createElement('img');img.src=new URL(skin.reference_image,base).href;img.alt=caption.textContent;reference.append(img);}
      else{const missing=document.createElement('p');missing.textContent='Celkový návrh zatím není přiřazen. Přidej jej níže.';reference.append(missing);}
      reference.append(caption);section.append(reference);
      const partsTitle=document.createElement('h3');partsTitle.textContent='Samostatné bitmapové díly';section.append(partsTitle,parts);
      const form=document.createElement('form');form.className='upload';
      form.innerHTML='<h3>Přidat do předlohy</h3><label>Co přidávám <select name="mode"><option value="add-part">Další bitmapový díl</option><option value="reference">Celkový návrh postavy</option></select></label><label>Název <input name="label" required maxlength="100"></label><label>Obrázek PNG <input name="png" type="file" accept="image/png" required></label><button>Přidat a uložit</button><p class="upload-status" role="status"></p>';
      form.onsubmit=async event=>{event.preventDefault();const message=form.querySelector('.upload-status'),button=form.querySelector('button');button.disabled=true;message.textContent='Ukládám…';
        try{const file=form.elements.png.files[0];if(!file||file.size>16*1024*1024)throw Error('Vyber PNG do 16 MB.');await send({mode:form.elements.mode.value,label:form.elements.label.value,png:await readPNG(file)});}
        catch(error){message.textContent=error.message;button.disabled=false;}
      };
      const hint=document.createElement('p');hint.textContent='Nový díl se uloží do této předlohy. V Animátoru předlohu znovu načti, vyber díl a zapni „Použít v této animaci“. Již uložené animace se tím nezmění.';form.append(hint);section.append(form);root.append(section);
    };
    if(!ids.length){select.disabled=true;select.replaceChildren();const empty=document.createElement('p');empty.className='empty';empty.textContent='Nejsou uložené žádné bitmapové předlohy.';root.replaceChildren(empty);return;}
    select.disabled=false;select.onchange=()=>render(select.value).catch(showError);
    await render(ids[0]);
    function showError(error){root.replaceChildren();const message=document.createElement('p');message.className='empty';message.textContent=error.message;root.append(message);}
  }catch(error){root.innerHTML='';const message=document.createElement('p');message.className='empty';message.textContent=error.message;root.append(message);}
})();
