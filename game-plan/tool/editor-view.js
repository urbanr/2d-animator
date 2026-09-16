(function(root){
  const api={stageSize:(height,availableWidth,viewportHeight)=>{
      const max=Math.max(1,Math.min(800,viewportHeight*.82,availableWidth*560/512)),min=Math.min(240,max);
      const h=Math.max(min,Math.min(max,height??availableWidth*.66*560/512));return {width:h*512/560,height:h};
    },zoom:(value,delta)=>Math.max(.4,Math.min(4,value*Math.exp(-delta*.0015))),
    point:(x,y,zoom,mirror=false,pan={x:0,y:0})=>({x:mirror?512-((x-256-pan.x)/zoom+256):(x-256-pan.x)/zoom+256,y:(y-280-pan.y)/zoom+280})};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EditorView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
