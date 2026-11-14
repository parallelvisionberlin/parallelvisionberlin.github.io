/* PV LAB Video: decorative procedural textile during genuine live job states.
   No video processing, credits, history or provider behavior is changed. */
(function(){
  function mount(){
    const app=document.getElementById('app');
    const stage=document.getElementById('video-job-stage');
    if(!app||!stage||stage.querySelector('.pv-video-fabric'))return;
    const canvas=document.createElement('canvas');
    canvas.className='pv-video-fabric';
    canvas.setAttribute('aria-hidden','true');
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)return;
    stage.prepend(canvas);
    stage.classList.add('pv-video-fabric-ready');
    const reduced=window.matchMedia('(prefers-reduced-motion: reduce)');
    const activePhases=new Set(['submitting','queued','running','saving','loading']);
    let width=0,height=0,lastDraw=0,raf=0,frame=0;
    const PI=Math.PI,TAU=2*PI;
    const rnd=n=>{const x=Math.sin(n*127.1+37.9)*43758.5453;return x-Math.floor(x);};
    function point(u,v,t,layer){
      const envelope=Math.sin(PI*u);
      if(layer===0)return{
        x:width*(.18+.92*u+.054*v*Math.sin(TAU*(u*.72)+t*.11)*envelope),
        y:height*(.62-.37*u+.17*Math.sin(TAU*(u*1.13+v*.24)+t*.13)+.205*v*envelope*Math.cos(TAU*(u*.43)+t*.10))
      };
      return{
        x:width*(.29+.79*u+.065*v*Math.sin(TAU*(u*.58)+t*.08)*envelope),
        y:height*(.33+.33*u+.14*Math.cos(TAU*(u*1.06-v*.18)+t*.10)+.17*v*envelope*Math.sin(TAU*(u*.53)+t*.12))
      };
    }
    function mesh(layer,t){
      const rows=layer===0?86:68,divisions=70;
      ctx.lineCap='round';
      for(let row=0;row<=rows;row++){
        const v=row/rows*2-1;
        const shine=Math.exp(-Math.pow((v-.23)/.17,2));
        const edge=Math.pow(Math.max(0,1-Math.abs(v)),.38);
        const opacity=(.075+shine*.52+edge*.17)*(layer===0?1:.76);
        ctx.strokeStyle=layer===0?'rgba(245,234,218,'+opacity+')':'rgba(222,232,236,'+opacity+')';
        ctx.lineWidth=.38+shine*.72;
        ctx.beginPath();
        for(let i=0;i<=divisions;i++){
          const p=point(i/divisions,v,t,layer);
          if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
        }
        ctx.stroke();
      }
      for(let i=3;i<120;i++){
        const u=i/122;
        ctx.strokeStyle=layer===0?'rgba(245,225,196,.15)':'rgba(222,232,238,.085)';
        ctx.lineWidth=.4;
        ctx.beginPath();
        for(let j=0;j<=20;j++){
          const p=point(u,j/10-1,t,layer);
          if(j===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);
        }
        ctx.stroke();
      }
      // Particle positions are deterministic; they are not a generated-result preview.
      for(let i=0;i<920;i++){
        const u=.015+rnd(i+layer*5000)*.97,v=rnd(i*3+layer*7000)*2-1;
        const p=point(u,v,t,layer);
        const shimmer=.60+.40*Math.sin(t*.63+i*.49);
        const weight=(.23+Math.pow(rnd(i*7+11),5)*.8)*shimmer;
        ctx.fillStyle=layer===0?'rgba(249,219,187,'+(weight*.64)+')':'rgba(215,225,230,'+(weight*.45)+')';
        ctx.beginPath();ctx.arc(p.x,p.y,.36+rnd(i*9+13)*.75,0,TAU);ctx.fill();
      }
    }
    function draw(t){
      if(!width||!height)return;
      ctx.fillStyle='#050505';ctx.fillRect(0,0,width,height);
      ctx.save();ctx.globalCompositeOperation='screen';
      mesh(1,t+1.8);mesh(0,t);
      ctx.restore();
    }
    function resize(){
      const rect=stage.getBoundingClientRect();
      width=Math.max(1,rect.width);height=Math.max(1,rect.height);
      const dpr=Math.min(window.devicePixelRatio||1,width<700?1.25:1.5);
      canvas.width=Math.max(1,Math.round(width*dpr));
      canvas.height=Math.max(1,Math.round(height*dpr));
      ctx.setTransform(dpr,0,0,dpr,0,0);
      draw(frame);
    }
    const active=()=>app.classList.contains('video-studio-active')&&!stage.hidden&&activePhases.has(stage.dataset.phase)&&!document.hidden;
    function tick(now){
      raf=0;
      if(!active())return;
      if(now-lastDraw>=42){lastDraw=now;frame+=.042;draw(frame);}
      raf=requestAnimationFrame(tick);
    }
    function sync(){
      if(!active()){
        if(raf)cancelAnimationFrame(raf);
        raf=0;return;
      }
      resize();
      if(!reduced.matches&&!navigator.connection?.saveData&&!raf)raf=requestAnimationFrame(tick);
    }
    new MutationObserver(sync).observe(stage,{attributes:true,attributeFilter:['hidden','data-phase']});
    new MutationObserver(sync).observe(app,{attributes:true,attributeFilter:['class']});
    if('ResizeObserver'in window)new ResizeObserver(()=>{if(active())resize();}).observe(stage);
    else window.addEventListener('resize',sync,{passive:true});
    reduced.addEventListener?.('change',sync);
    document.addEventListener('visibilitychange',sync);
    sync();
  }
  if(document.readyState==='loading')document.addEventListener('DOMContentLoaded',mount,{once:true});
  else mount();
})();