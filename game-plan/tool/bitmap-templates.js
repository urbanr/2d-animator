(async()=>{
  'use strict';
  const root=document.getElementById('templates');
  try{
    const catalog=await fetch('../graphics/bitmapove-predlohy/skins.json',{cache:'no-store'}).then(response=>{if(!response.ok)throw Error('Katalog není dostupný.');return response.json();});
    root.replaceChildren();
    for(const [id,entry] of Object.entries(catalog.skins||{})){
      const base=new URL('../graphics/bitmapove-predlohy/'+entry.path,location.href),skin=await fetch(base,{cache:'no-store'}).then(response=>response.json());
      const section=document.createElement('section');section.className='template';
      const title=document.createElement('h2');title.textContent=entry.name;
      const note=document.createElement('p');note.textContent=`${id} · ${skin.layers.filter(key=>!['pelvis','shoulders'].includes(key)).length} bitmapových dílů`;
      const parts=document.createElement('div');parts.className='parts';
      for(const key of skin.layers){const part=skin.parts[key];if(!part||['pelvis','shoulders'].includes(key))continue;const figure=document.createElement('figure'),image=document.createElement('img'),caption=document.createElement('figcaption');figure.className='part';image.src=new URL(part.file,base).href;image.alt=part.label||key;caption.textContent=part.label||key;figure.append(image,caption);parts.append(figure);}
      section.append(title,note,parts);root.append(section);
    }
    if(!root.children.length){const empty=document.createElement('p');empty.className='empty';empty.textContent='Nejsou uložené žádné bitmapové předlohy.';root.append(empty);}
  }catch(error){root.innerHTML='';const message=document.createElement('p');message.className='empty';message.textContent=error.message;root.append(message);}
})();
