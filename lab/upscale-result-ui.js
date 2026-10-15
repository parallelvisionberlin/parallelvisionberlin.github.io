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
  comparison.innerHTML='<div class="upscale-compare-frame"><img class="upscale-after" alt="" aria-hidden="true"><img class="upscale-before" alt="" aria-hidden="true"><div class="upscale-compare-line" aria-hidden="true"><span>‹ ›</span></div><span class="upscale-compare-tag tag-before">ORIGINAL</span><span class="upscale-compare-tag tag-after">UPSCALED</span><input class="upscale-compare-range" type="range" min="0" max="100" value="50" aria-label="Before and after comparison, original percentage"></div>';
  canvas.append(comparison);
  const toolbar=document.createElement('div');
  toolbar.id='upscale-result-toolbar';toolbar.hidden=true;
  toolbar.innerHTML='<div class="upscale-result-info"><div class="upscale-result-title"><span class="upscale-result-check" aria-hidden="true">✓</span><strong>Upscaled result</strong><span class="upscale-result-scale"></span></div><p class="upscale-result-dimensions"></p></div><div class="upscale-result-actions"><button class="upscale-compare-button" type="button" aria-pressed="false">Compare</button><button class="upscale-again-button" type="button" title="Review settings before starting another paid upscale">Upscale again</button><button class="upscale-download-button" type="button"><svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true"><path d="M12 3v12m-5-5 5 5 5-5M4 17v3h16v-3"/></svg><span>Download image</span></button></div>';
  stage.insertBefore(toolbar,stage.querySelector('.stagefoot'));
  const toast=document.createElement('div');
  toast.id='upscale-complete-toast';toast.hidden=true;toast.setAttribute('role','status');toast.setAttribute('aria-live','polite');
  canvas.append(toast);
  const frame=comparison.querySelector('.upscale-compare-frame');
  const before=comparison.querySelector('.upscale-before'),after=comparison.querySelector('.upscale-after');
  const range=comparison.querySelector('.upscale-compare-range');
  const compareButton=toolbar.querySelector('.upscale-compare-button');
  const dimensions=toolbar.querySelector('.upscale-result-dimensions');
  const scaleEl=toolbar.querySelector('.upscale-result-scale');
  const downloadButton=toolbar.querySelector('.upscale-download-button');
  let current=null,version=0,ownedOriginal=null,toastTimer=null;
  const dim=(w,h)=>Number(w)>0&&Number(h)>0?Math.round(w).toLocaleString('en-US')+' × '+Math.round(h).toLocaleString('en-US'):'';
  const scaleText=s=>(Number(s)===2||Number(s)===4)?s+'×':'';
  function hideToast(){clearTimeout(toastTimer);toast.hidden=true;}
  function hideComparison(){
    comparison.hidden=true;preview.classList.remove('upscale-preview-under-comparison');
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
