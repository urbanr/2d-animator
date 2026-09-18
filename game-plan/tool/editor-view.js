(function(root){
  // The window is a crop of the full 512x560 canvas whose bottom edge sits just
  // below the ground line; it scrolls the canvas instead of moving the drawing,
  // so pointer coordinates stay untouched. Default height fits the whole figure.
  const DEFAULT_VIEW=320,BOTTOM=404;
  const api={DEFAULT_VIEW,BOTTOM,stageSize:(height,availableWidth)=>{
      const width=Math.max(1,availableWidth),scale=width/512,max=560*scale;
      // Manual resizing has no product minimum; one CSS pixel only keeps the
      // resize box well-defined.
      const h=Math.max(1,Math.min(max,height??DEFAULT_VIEW*scale));
      return {width,height:h,canvasHeight:max,offset:Math.max(0,Math.min(max-h,BOTTOM*scale-h))};
    },backingSize:(cssWidth,dpr=1)=>{
      const width=Math.max(512,Math.round(Math.max(1,cssWidth)*Math.max(1,dpr||1)));
      return {width,height:Math.round(width*560/512),scale:width/512};
    },zoom:(value,delta)=>Math.max(.4,Math.min(4,value*Math.exp(-delta*.0015))),
    point:(x,y,zoom,mirror=false,pan={x:0,y:0})=>({x:mirror?512-((x-256-pan.x)/zoom+256):(x-256-pan.x)/zoom+256,y:(y-280-pan.y)/zoom+280})};
  if(typeof module==='object'&&module.exports)module.exports=api;else root.EditorView=api;
})(typeof globalThis!=='undefined'?globalThis:this);
