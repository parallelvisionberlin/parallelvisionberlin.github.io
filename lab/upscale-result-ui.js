/* Upscaler preview presentation only. Source, billing and history stay in lab.js. */
export function createUpscaleResultUI({download,again,loadSource}) {
  const stage=document.querySelector('#app .stage'),canvas=document.getElementById('upscale-canvas');
  const preview=document.getElementById('preview'),label=document.getElementById('preview-label');
  if(!stage||!canvas||!preview||!label)throw Error('Upscaler stage unavailable');
  const processing=document.createElement('div');
  processing.id='upscale-processing-layer';processing.hidden=true;processing.setAttribute('role','status');
  processing.innerHTML='<div class="upscale-processing-message"><span class="upscale-spinner" aria-hidden="true"></span><span><strong>Upscaling image…</strong><small>Keeping your original intact.</small></span></div>';
  canvas.append(processing);
  const comparison=document.createElement('div');
  comparison.id='upscale-comparison';comparison.hidden=true;comparison.setAttribute('role','group');
  comparison.setAttribute('aria-label','Before and after image comparison');
  comparison.innerHTML='<div class="upscale-compare-frame"><div class="upscale-compare-after-clip"><img class="upscale-after" alt="" aria-hidden="true"></div><div class="upscale-compare-before-clip"><img class="upscale-before" alt="" aria-hidden="true"></div><div class="upscale-compare-line" aria-hidden="true"><span>‹ ›</span></div><span class="upscale-compare-tag tag-before">ORIGINAL</span><span class="upscale-compare-tag tag-after">UPSCALED</span><input class="upscale-compare-range" type="range" min="0" max="100" value="50" aria-label="Before and after comparison, original percentage"></div><div class="upscale-zoom-controls" role="group" aria-label="Comparison zoom"><span class="upscale-zoom-level" aria-live="polite">100%</span><button class="upscale-zoom-reset" type="button" hidden>Reset zoom</button></div>';
  canvas.append(comparison);
  const toolbar=document.createElement('div');
  toolbar.id='upscale-result-toolbar';toolbar.hidden=true;
  toolbar.innerHTML='<div class="upscale-result-info"><div class="upscale-result-title"><span class="upscale-result-check" aria-hidden="true">✓</span><strong>Upscaled result</strong><span class="upscale-result-scale"></span></div><p class="upscale-result-dimensions"></p></div><div class="upscale-result-actions"><button class="upscale-compare-button" type="button" aria-pressed="false">Compare</button><button class="upscale-again-button" type="button" title="Review settings before starting another paid upscale">Upscale again</button><button class="upscale-download-button" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/></svg><span>Download image</span></button></div>';
  // Keep the established Upscaler result strip beneath the image. Never position it inside the canvas.
  stage.insertBefore(toolbar,stage.querySelector('.stagefoot'));
  const toast=document.createElement('div');
  toast.id='upscale-complete-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  canvas.append(toast);
  const frame=comparison.querySelector('.upscale-compare-frame');
  const before=comparison.querySelector('.upscale-before'),after=comparison.querySelector('.upscale-after');
  const range=comparison.querySelector('.upscale-compare-range');
  const zoomControls=comparison.querySelector('.upscale-zoom-controls');
  const zoomLevel=comparison.querySelector('.upscale-zoom-level');
  const zoomReset=comparison.querySelector('.upscale-zoom-reset');
  const compareButton=toolbar.querySelector('.upscale-compare-button');
  const dimensions=toolbar.querySelector('.upscale-result-dimensions');
  const scaleEl=toolbar.querySelector('.upscale-result-scale');
  const downloadButton=toolbar.querySelector('.upscale-download-button');
  let current=null,version=0,ownedOriginal=null,toastTimer=null;
  let zoom=1,zoomX=0,zoomY=0;
  const clamp=(n,min,max)=>Math.max(min,Math.min(max,n));
  function applyZoom(){
    const width=frame.clientWidth||1,height=frame.clientHeight||1;
    zoomX=clamp(zoomX,width*(1-zoom),0);
    zoomY=clamp(zoomY,height*(1-zoom),0);
    const transform='translate3d('+zoomX+'px,'+zoomY+'px,0) scale('+zoom+')';
    before.style.transform=transform;
    after.style.transform=transform;
    zoomLevel.textContent=Math.round(zoom*100)+'%';
    zoomControls.hidden=zoom===1;
    zoomReset.hidden=zoom===1;
  }
  function resetZoom(){zoom=1;zoomX=0;zoomY=0;applyZoom();}
  // Zoom is intentionally limited to the image; normal scrolling works elsewhere.
  frame.addEventListener('wheel',event=>{
    if(comparison.hidden||!current||event.ctrlKey||event.metaKey)return;
    event.preventDefault();
    const next=clamp(Math.round(zoom*Math.exp(-clamp(event.deltaY,-220,220)*.002)*100)/100,1,6);
    if(next===zoom)return;
    const bounds=frame.getBoundingClientRect();
    const x=clamp(event.clientX-bounds.left,0,bounds.width);
    const y=clamp(event.clientY-bounds.top,0,bounds.height);
    const factor=next/zoom;
    zoomX=x-(x-zoomX)*factor;
    zoomY=y-(y-zoomY)*factor;
    zoom=next;
    applyZoom();
  },{passive:false});
  zoomReset.addEventListener('click',resetZoom);
  const dim=(w,h)=>Number(w)>0&&Number(h)>0?Math.round(w).toLocaleString('en-US')+' × '+Math.round(h).toLocaleString('en-US'):'';
  const scaleText=s=>(Number(s)===2||Number(s)===4)?s+'×':'';
  function hideToast(){clearTimeout(toastTimer);toast.hidden=true;}
  function hideComparison(){
    comparison.hidden=true;resetZoom();preview.classList.remove('upscale-preview-under-comparison');
    compareButton.textContent='Compare';compareButton.setAttribute('aria-pressed','false');
  }
  function layoutComparison(){
    if(comparison.hidden||!current)return;
    const cs=getComputedStyle(canvas),w=Math.max(1,canvas.clientWidth-(parseFloat(cs.paddingLeft)||0)-(parseFloat(cs.paddingRight)||0));
    const h=Math.max(1,canvas.clientHeight-(parseFloat(cs.paddingTop)||0)-(parseFloat(cs.paddingBottom)||0));
    const ratio=current.sourceWidth>0&&current.sourceHeight>0?current.sourceWidth/current.sourceHeight:
      current.outputWidth>0&&current.outputHeight>0?current.outputWidth/current.outputHeight:1;
    const fw=Math.min(w,h*ratio);
    frame.style.width=fw+'px';frame.style.height=Math.min(h,fw/ratio)+'px';
    applyZoom();
  }
  if(typeof ResizeObserver!=='undefined')new ResizeObserver(layoutComparison).observe(canvas);
  range.addEventListener('input',()=>{
    const value=Math.max(0,Math.min(100,Number(range.value)||0));
    frame.style.setProperty('--split',value+'%');
    range.setAttribute('aria-valuetext',value+' percent original visible');
  });
  range.dispatchEvent(new Event('input'));
  function clear(){
    version++;current=null;hideToast();processing.hidden=true;canvas.setAttribute('aria-busy','false');
    toolbar.hidden=true;hideComparison();before.removeAttribute('src');after.removeAttribute('src');
    if(ownedOriginal){URL.revokeObjectURL(ownedOriginal);ownedOriginal=null;}
  }
  function source({width=0,height=0}={}){label.textContent='Original'+(dim(width,height)?' · '+dim(width,height)+' px':'');}
  function processingState(){
    processing.hidden=false;canvas.setAttribute('aria-busy','true');
    label.textContent=label.textContent.replace(/ · Upscaling…$/,'')+' · Upscaling…';
  }
  function finishedWithoutResult(){
    processing.hidden=true;canvas.setAttribute('aria-busy','false');
    label.textContent=label.textContent.replace(/ · Upscaling…$/,'');
  }
  async function compare(){
    if(!current)return;
    if(!comparison.hidden){hideComparison();return;}
    const chosen=current,requestVersion=version;
    if(!chosen.originalUrl&&chosen.sourceAssetId){
      compareButton.disabled=true;compareButton.textContent='Loading original…';
      try{
        const blob=await loadSource(chosen.sourceAssetId);
        if(requestVersion!==version||chosen!==current)return;
        if(!blob||!blob.type.startsWith('image/'))throw Error('Original unavailable');
        ownedOriginal=URL.createObjectURL(blob);chosen.originalUrl=ownedOriginal;
      }catch(error){
        if(requestVersion===version&&chosen===current){
          compareButton.textContent='Original unavailable';compareButton.title='Open the source from History';
          compareButton.disabled=true;
        }
        return;
      }finally{
        if(requestVersion===version&&chosen===current&&chosen.originalUrl)compareButton.disabled=false;
      }
    }
    if(!chosen.originalUrl||requestVersion!==version||chosen!==current)return;
    before.src=chosen.originalUrl;after.src=chosen.url;
    resetZoom();
    range.value='50';range.dispatchEvent(new Event('input'));
    comparison.hidden=false;preview.classList.add('upscale-preview-under-comparison');
    compareButton.setAttribute('aria-pressed','true');compareButton.textContent='Show result';
    layoutComparison();
  }
  compareButton.addEventListener('click',()=>{void compare();});
  toolbar.querySelector('.upscale-again-button').addEventListener('click',again);
  downloadButton.addEventListener('click',download);
  function ready({url,ext='png',scale=0,outputWidth=0,outputHeight=0,
                  sourceWidth=0,sourceHeight=0,sourceUrl=null,sourceAssetId=null,announce=false}){
    clear();if(!url)return;
    const requestVersion=version;
    current={url,ext:String(ext||'png').toLowerCase(),scale:Number(scale)||0,
      outputWidth:Number(outputWidth)||0,outputHeight:Number(outputHeight)||0,
      sourceWidth:Number(sourceWidth)||0,sourceHeight:Number(sourceHeight)||0,
      originalUrl:sourceUrl||null,sourceAssetId:sourceAssetId||null};
    toolbar.hidden=false;scaleEl.textContent=scaleText(current.scale);
    compareButton.disabled=!current.originalUrl&&!current.sourceAssetId;
    compareButton.title=compareButton.disabled?'Original unavailable':'Compare this result with its original';
    downloadButton.querySelector('span').textContent='Download '+current.ext.toUpperCase();
    function draw(){
      if(requestVersion!==version||!current)return;
      const original=dim(current.sourceWidth,current.sourceHeight),output=dim(current.outputWidth,current.outputHeight);
      dimensions.textContent=(original?'Original '+original+' px':'Original dimensions unavailable')+
        (output?'  →  Upscaled '+output+' px':'  →  Reading output dimensions…');
      label.textContent='Upscaled result'+(output?' · '+output+' px':scaleText(current.scale)?' · '+scaleText(current.scale):'');
      layoutComparison();
    }
    draw();
    // Open a completed job directly in comparison without an extra click.
    void compare();
    const probe=new Image();
    probe.onload=()=>{if(requestVersion!==version||!current||current.url!==url)return;current.outputWidth=probe.naturalWidth||current.outputWidth;current.outputHeight=probe.naturalHeight||current.outputHeight;draw();};
    probe.onerror=()=>{if(requestVersion===version&&current&&current.url===url)draw();};
    probe.src=url;
    if(announce){
      toast.textContent='✓  Upscale complete'+(scaleText(current.scale)?' · '+scaleText(current.scale):'');
      toast.hidden=false;
      toastTimer=setTimeout(()=>{if(requestVersion===version)toast.hidden=true;},3500);
    }
  }
  return {clear,source,processing:processingState,finishedWithoutResult,ready};
}
