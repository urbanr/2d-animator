(function(root){
  const api={zoom:(value,delta)=>Math.max(.4,Math.min(4,value*Math.exp(-delta*.0015))),
    point:(x,y,zoom,mirror=false,pan={x:0,y:0})=>({x:mirror?512-((x-256-pan.x)/zoom+256):(x-256-pan.x)/zoom+256,y:(y-280-pan.y)/zoom+280})};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EditorView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
