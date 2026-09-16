/* Shared preview units: 512 rig units = 32 game points, independent of CSS zoom. */
(function(root,factory){const api=factory();if(typeof module==='object'&&module.exports)module.exports=api;else root.MotionPreview=api;})(typeof globalThis!=='undefined'?globalThis:this,function(){
  const UNITS_PER_POINT=16,GROUND_Y=392,DEFAULT_SPEED=8;
  const speed=clip=>Number.isFinite(clip.move_speed_pt_s)?Math.max(0,Math.min(1000,clip.move_speed_pt_s)):DEFAULT_SPEED;
  const offset=(distance,direction=1)=>direction*((((distance*UNITS_PER_POINT+384)%768)+768)%768-384);
  function floor(ctx){
    ctx.save();ctx.fillStyle='#344239';ctx.fillRect(0,GROUND_Y,512,560-GROUND_Y);
    ctx.strokeStyle='#ffea5b';ctx.lineWidth=1;ctx.beginPath();ctx.moveTo(0,GROUND_Y);ctx.lineTo(512,GROUND_Y);ctx.stroke();
    ctx.strokeStyle='#728172';ctx.beginPath();for(let x=0;x<=512;x+=64){ctx.moveTo(x,GROUND_Y+2);ctx.lineTo(x,GROUND_Y+9);}ctx.stroke();ctx.restore();
  }
  // Choose delta once per actor, then keep this same factor for travel and cadence.
  const variation=(spread,random=Math.random)=>((random()*2-1)*Math.max(0,Math.min(90,spread)));
  const rates=(clip,delta=0)=>{const factor=1+Math.max(-90,Math.min(90,delta))/100;return {factor,fps:clip.fps*factor,speed:speed(clip)*factor};};
  return {UNITS_PER_POINT,GROUND_Y,DEFAULT_SPEED,speed,offset,floor,variation,rates};
});
