(function(root){
  const api={stageSize:(height,availableWidth)=>{
      const width=Math.max(1,availableWidth),scale=width/512,min=294*scale,max=560*scale;
      // Keep the whole canvas at full width and crop only the lower floor area.
      // Default: retain half of the 168 logical pixels below the ground line.
      const h=Math.max(min,Math.min(max,height??476*scale));return {width,height:h,canvasHeight:max};
    },backingSize:(cssWidth,dpr=1)=>{
      const width=Math.max(512,Math.round(Math.max(1,cssWidth)*Math.max(1,dpr||1)));
      return {width,height:Math.round(width*560/512),scale:width/512};
    },zoom:(value,delta)=>Math.max(.4,Math.min(4,value*Math.exp(-delta*.0015))),
    point:(x,y,zoom,mirror=false,pan={x:0,y:0})=>({x:mirror?512-((x-256-pan.x)/zoom+256):(x-256-pan.x)/zoom+256,y:(y-280-pan.y)/zoom+280})};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EditorView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
