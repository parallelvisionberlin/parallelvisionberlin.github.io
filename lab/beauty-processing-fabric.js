/* ALTER's existing Video-inspired optical textile, limited to genuine job states.
   Decoration only. No credit, provider or history actions. */
(function(){
 function mount(){
  const stage=document.getElementById('beauty-processing');
  const visual=stage?.querySelector('.beauty-processing-visual');
  if(!visual||visual.querySelector('canvas'))return;
  const canvas=document.createElement('canvas');
  canvas.className='pv-beauty-fabric';canvas.setAttribute('aria-hidden','true');
  const ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx)return;
  visual.append(canvas);
  const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
  const saveData=()=>!!navigator.connection?.saveData;
  const PI=Math.PI,TAU=2*PI;
  let width=0,height=0,lastFrame=0,time=0,raf=0;
  const rand=n=>{const v=Math.sin(n*117.13+9.31)*43141.1;return v-Math.floor(v)};
  function point(u,v,t,layer){
   const span=Math.sin(PI*u);
   if(layer===0)return {
    x:width*(.12+.88*u+.075*v*span*Math.sin(TAU*u*.69+t*.17)),
    y:height*(.73-.52*u+.19*Math.sin(TAU*(u*.95+v*.21)+t*.14)+.15*v*span)
   };
   return {
    x:width*(.30+.77*u+.05*v*span*Math.cos(TAU*u*.72-t*.12)),
    y:height*(.26+.46*u+.14*Math.cos(TAU*(u*.89-v*.18)+t*.13)+.21*v*span)
   };
  }
  function textile(layer,t){
   const rows=layer===0?54:43,segments=56;
   ctx.lineCap='round';
   for(let row=0;row<=rows;row++){
    const v=2*row/rows-1;
    const highlight=Math.exp(-Math.pow((v-.15)/.20,2));
    const alpha=(.045+highlight*.44+Math.max(0,1-Math.abs(v))*.12)*(layer===0?1:.7);
    ctx.strokeStyle=layer===0?'rgba(245,231,215,'+alpha+')':'rgba(221,228,232,'+alpha+')';
    ctx.lineWidth=.35+highlight*.7;ctx.beginPath();
    for(let i=0;i<=segments;i++){
     const p=point(i/segments,v,t,layer);
     if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
    }
    ctx.stroke();
   }
   for(let i=0;i<400;i++){
    const u=.02+.96*rand(i+layer*3001),v=rand(i*3+layer*1001)*2-1;
    const p=point(u,v,t,layer);
    const alpha=(.13+Math.pow(rand(i*7+13),4)*.44)*(.7+.3*Math.sin(t*.65+i*.37));
    ctx.fillStyle=layer===0?'rgba(245,224,199,'+alpha+')':'rgba(212,226,233,'+alpha+')';
    ctx.fillRect(p.x,p.y,.5+rand(i*9+7)*.5,.5+rand(i*11+2)*.5);
   }
  }
  function draw(){
   if(!width||!height)return;
   ctx.fillStyle='#050505';ctx.fillRect(0,0,width,height);
   ctx.save();ctx.globalCompositeOperation='screen';textile(1,time+1.9);textile(0,time);ctx.restore();
  }
  function resize(){
   const rect=visual.getBoundingClientRect();if(rect.width<1||rect.height<1)return;
   width=rect.width;height=rect.height;
   const dpr=Math.min(window.devicePixelRatio||1,1.4);
   canvas.width=Math.round(width*dpr);canvas.height=Math.round(height*dpr);
   ctx.setTransform(dpr,0,0,dpr,0,0);draw();
  }
  const active=()=>!stage.hidden&&!document.hidden&&['submitting','queued','running','saving'].includes(stage.dataset.phase);
  function tick(now){
   raf=0;
   if(!active()||reduced.matches||saveData())return;
   if(now-lastFrame>=42){lastFrame=now;time+=.043;draw();}
   raf=requestAnimationFrame(tick);
  }
  function sync(){
   if(!active()){if(raf)cancelAnimationFrame(raf);raf=0;return;}
   resize();
   if(!reduced.matches&&!saveData()&&!raf)raf=requestAnimationFrame(tick);
  }
  new MutationObserver(sync).observe(stage,{attributes:true,attributeFilter:['hidden','data-phase']});
  if('ResizeObserver'in window)new ResizeObserver(()=>{if(active())resize()}).observe(visual);
  else window.addEventListener('resize',sync,{passive:true});
  reduced.addEventListener?.('change',sync);
  document.addEventListener('visibilitychange',sync);
  sync();
 }
 if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});else mount();
})();
