(() => {
  'use strict';
  // The editor needs its local save API; file:// cannot POST to that API.
  if(location.protocol==='file:'){
    location.replace('http://127.0.0.1:8765/tool/preview.html'+location.search+location.hash);return;
  }
  const pages={postavy:'gallery.html',postavy2:'characters2.html',levely:'levels.html',pozy:'poses.html',animator:'index.html'};
  const names={postavy:'Postavy',postavy2:'Postavy2',levely:'Levely',pozy:'Pózy a kroky',animator:'Animátor'};
  const panels=new Map();
  const routes=new Map();
  const messageOrigin=location.origin==='null'?'*':location.origin;
  const nav=[...document.querySelectorAll('[data-section]')];
  function show(section, extra=new URLSearchParams(), hash='', push=false) {
    if(!Object.hasOwn(pages,section))section='postavy';
    const url=new URL(location.href);url.search='';url.hash=hash;
    url.searchParams.set('sekce',section);
    for(const [key,value] of extra)if(!['sekce','embedded'].includes(key))url.searchParams.set(key,value);
    if(push)history.pushState(null,'',url);
    const child=new URL(pages[section],location.href);
    for(const [key,value] of url.searchParams)if(key!=='sekce')child.searchParams.set(key,value);
    child.searchParams.set('embedded','1');child.searchParams.sort();
    const panelKey=child.href;
    routes.set(section,{search:url.search,hash});
    let panel=panels.get(panelKey);
    if(!panel){
      panel=document.createElement('iframe');panel.title=names[section];
      child.hash=hash;
      panel.src=child.href;panel.dataset.section=section;
      panels.set(panelKey,panel);document.getElementById('sections').append(panel);
    } else if(hash) {
      try {panel.contentDocument.getElementById(decodeURIComponent(hash.slice(1)))?.scrollIntoView();} catch {}
    }
    for(const [key,frame] of panels){
      frame.hidden=key!==panelKey;
      frame.contentWindow?.postMessage({type:'preview-visibility',visible:key===panelKey},messageOrigin);
    }
    for(const link of nav){if(link.dataset.section===section)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');}
    document.title=names[section]+' · Preview · Prdel světa';
  }
  for(const link of nav)link.addEventListener('click',event=>{
    if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    event.preventDefault();const saved=routes.get(link.dataset.section);
    show(link.dataset.section,new URLSearchParams(saved?.search||''),saved?.hash||'',true);
  });
  window.addEventListener('message',event=>{
    if(event.origin!==location.origin||![...panels.values()].some(p=>p.contentWindow===event.source))return;
    if(event.data?.type==='preview-navigate')show(event.data.section,new URLSearchParams(event.data.search||''),event.data.hash||'',true);
  });
  const route=()=>{const query=new URLSearchParams(location.search);show(query.get('sekce')||'postavy',query,location.hash);};
  window.addEventListener('popstate',route);route();
})();
