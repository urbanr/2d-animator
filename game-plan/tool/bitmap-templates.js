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
      for(const key of layers){const part=skin.parts?.[key];if(!part||key==='shoulders')continue;const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');figure.className='part';image.src=new URL(part.file,base).href;image.alt=part.label||key;caption.textContent=part.label||key;figure.append(image,caption);parts.append(figure);}
      section.append(title,note,status,parts);root.append(section);
    };
    if(!ids.length){select.disabled=true;select.replaceChildren();const empty=document.createElement('p');empty.className='empty';empty.textContent='Nejsou uložené žádné bitmapové předlohy.';root.replaceChildren(empty);return;}
    select.disabled=false;select.onchange=()=>render(select.value).catch(showError);
    await render(ids[0]);
    function showError(error){root.replaceChildren();const message=document.createElement('p');message.className='empty';message.textContent=error.message;root.append(message);}
  }catch(error){root.innerHTML='';const message=document.createElement('p');message.className='empty';message.textContent=error.message;root.append(message);}
})();
