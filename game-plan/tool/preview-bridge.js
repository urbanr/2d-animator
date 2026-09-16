/* Existing deep links join the common preview. Embedded editors retain their state. */
(() => {
  const compact=document.createElement('link');compact.rel='stylesheet';compact.href='compact-ui.css';document.head.append(compact);
  const sections={'gallery.html':'postavy','characters2.html':'animator','levels.html':'levely','poses.html':'pozy'};
  const query=new URLSearchParams(location.search);
  const section=sections[location.pathname.split('/').pop()];
  if(location.protocol==='file:'){
    const target=new URL('http://127.0.0.1:8765/tool/preview.html');target.search=location.search;
    target.searchParams.set('sekce',section);target.searchParams.delete('embedded');target.hash=location.hash;
    location.replace(target.href);return;
  }
  if(window.parent===window && query.get('embedded')!=='1') {
    const target=new URL('preview.html',location.href);
    target.search=location.search;target.searchParams.set('sekce',section);target.hash=location.hash;
    location.replace(target.href);return;
  }
  if(window.parent!==window) {
    document.documentElement.classList.add('inside-preview');
    document.addEventListener('DOMContentLoaded',()=>{
      // The shared menu replaces only redundant section links, never editor actions.
      document.querySelectorAll('header a').forEach(link=>{
        const target=new URL(link.href);if(sections[target.pathname.split('/').pop()])link.hidden=true;
      });
    });
    document.addEventListener('click',event=>{
      if(event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
      const link=event.target.closest('a');if(!link||link.download||link.target==='_blank')return;
      const target=new URL(link.href), destination=sections[target.pathname.split('/').pop()];
      if(!destination||target.origin!==location.origin)return;
      event.preventDefault();window.parent.postMessage({type:'preview-navigate',section:destination,search:target.search,hash:target.hash},location.origin==='null'?'*':location.origin);
    });
  }
})();
