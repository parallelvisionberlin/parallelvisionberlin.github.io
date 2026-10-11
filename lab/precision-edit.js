/* Precision Edit: large base canvas, SAM 3 point segmentation, mask brushes,
   non-destructive FLUX inpainting and original-pixel client-side compositing. */
export function createPrecisionEditor({host,api,assetBlob,uploadAsset,notify,owner,falReady,onJob,onExit}){
  const $=id=>document.getElementById(id);
  const view=$('precision-workspace'),sourceCanvas=$('precision-source-canvas'),
    overlay=$('precision-selection-canvas'),resultCanvas=$('precision-result-canvas');
  const sc=sourceCanvas.getContext('2d',{willReadFrequently:false});
  const oc=overlay.getContext('2d');
  const rc=resultCanvas.getContext('2d');
  const mask=document.createElement('canvas'),maskCtx=mask.getContext('2d',{willReadFrequently:true});
  const undoStack=[],maxUndo=12,finalizing=new Map();
  let base=null,mode='magic',drawing=false,lastPoint=null,taskBusy=false,pending=null;
  let selected=false,resultBlob=null,resultBitmap=null,disposed=false,workingId=null,session=0;
  let resultFormat='png',zoom=1,panX=0,panY=0,panDrag=null,spaceHeld=false;
  let selectionAllowance=0,consentPoint=null,queueRevision=0;
  const pendingPolls=new Map();
  const exportRiskPixels=5000000;
  const mimeTypes=new Set(['image/png','image/jpeg','image/webp']);
  const sleep=ms=>new Promise(resolve=>setTimeout(resolve,ms));
  const readBlob=(canvas,mime='image/png',quality)=>new Promise((resolve,reject)=>
    canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Unable to export this image.')),mime,quality));
  const MAX_COMPOSITE=20*1024*1024;
  const setStatus=(message,error=false)=>{
    $('precision-status-text').textContent=message||'';
    $('precision-status-text').classList.toggle('is-error',error);
  };
  const isOpen=()=>!view.hidden;
  // Fit the complete original photograph to the available panel height.
  // The Retouch deck grows with the viewport; the brush overlay must follow
  // the same image scale rather than crop a tall canvas behind the footer.
  function syncPreviewFit(){
    if(!isOpen())return;
    if(window.matchMedia('(max-width:900px)').matches){
      view.style.removeProperty('--precision-source-fit-height');
      view.style.removeProperty('--precision-result-fit-height');
      return;
    }
    for(const [id,property] of [
      ['precision-source-holder','--precision-source-fit-height'],
      ['precision-output-holder','--precision-result-fit-height']
    ]){
      const holder=$(id);
      if(holder.hidden)continue;
      const height=Math.max(110,Math.floor(holder.getBoundingClientRect().height-22))+'px';
      if(view.style.getPropertyValue(property)!==height)view.style.setProperty(property,height);
    }
  }
  const previewResizeObserver=new ResizeObserver(()=>{syncPreviewFit();if(base)paintZoom();});
  previewResizeObserver.observe($('precision-source-holder'));
  previewResizeObserver.observe($('precision-output-holder'));
  window.addEventListener('resize',syncPreviewFit);
  function zoomBounds(){
    const holder=$('precision-source-holder'),stage=$('precision-stage');
    const availableWidth=Math.max(1,holder.clientWidth-20);
    const availableHeight=Math.max(1,holder.clientHeight-20);
    return {x:Math.max(0,(stage.offsetWidth*zoom-availableWidth)/2),
      y:Math.max(0,(stage.offsetHeight*zoom-availableHeight)/2)};
  }
  function paintZoom(){
    if(!base)return;
    const bounds=zoomBounds();
    panX=Math.max(-bounds.x,Math.min(bounds.x,panX));
    panY=Math.max(-bounds.y,Math.min(bounds.y,panY));
    $('precision-stage').style.transform='translate3d('+panX+'px,'+panY+'px,0) scale('+zoom+')';
    $('precision-zoom-value').textContent=zoom<=1.001?'Fit':Math.round(zoom*100)+'%';
    $('precision-zoom-out').disabled=zoom<=1.001;
    $('precision-zoom-in').disabled=zoom>=11.99;
    $('precision-zoom-fit').classList.toggle('is-active',zoom<=1.001);
    $('precision-tool-pan').classList.toggle('is-active',mode==='pan');
    overlay.style.cursor=panDrag?'grabbing':mode==='pan'||spaceHeld?'grab':'crosshair';
  }
  function setZoom(next,point=null){
    if(!base)return;
    const previous=zoom;
    zoom=Math.max(1,Math.min(12,Number(next)||1));
    if(zoom<=1.001){zoom=1;panX=0;panY=0;}
    else if(point){
      const bounds=$('precision-source-holder').getBoundingClientRect();
      const x=point.clientX-(bounds.left+bounds.width/2);
      const y=point.clientY-(bounds.top+bounds.height/2);
      panX=x-(x-panX)*(zoom/previous);
      panY=y-(y-panY)*(zoom/previous);
    }
    paintZoom();
  }
  function actualPreviewZoom(){
    if(!base)return 1;
    // "100%" references the 2,048px working preview, not the original
    // high-resolution source; the full original is retained for compositing.
    const rendered=Math.max(1,sourceCanvas.offsetWidth);
    return Math.max(1,Math.min(12,mask.width/rendered));
  }
  function resetZoom(){
    zoom=1;panX=0;panY=0;panDrag=null;
    $('precision-stage').style.transform='';
    if(base)paintZoom();
  }
  const maskChanged=()=>{
    selected=hasSelection();renderMask();
    // A previous quote is bound to a specific mask PNG. Never allow it to
    // survive further selection edits, brush strokes or undo.
    pending=null;$('precision-price-review').hidden=true;refreshButtons();
  };
  function hasSelection(){
    if(!mask.width||!mask.height)return false;
    const image=maskCtx.getImageData(0,0,mask.width,mask.height).data;
    // Sample the whole image uniformly. Even a small brush mark is kept.
    let hits=0;for(let i=3;i<image.length;i+=4)if(image[i]>64){hits++;if(hits>2)return true;}
    return false;
  }
  function selectMode(next){
    if(!['magic','brush','erase','pan'].includes(next))return;
    if(next==='magic'&&!falReady())next='brush';
    mode=next;
    for(const m of ['magic','brush','erase','pan']){
      const b=$('precision-tool-'+m);if(!b)continue;
      b.classList.toggle('is-selected',m===mode);
      b.setAttribute('aria-pressed',String(m===mode));
    }
    overlay.style.cursor=mode==='pan'?'grab':'crosshair';
    refreshGuidance();
  }
  function refreshGuidance(){
    const message=$('precision-selection-message');
    if(!base){
      message.textContent='Start by dropping a photograph above.';
      $('precision-price-note').textContent='Add photo → Select area → Describe edit → Review price';
      $('precision-result-label').textContent='AWAITING EDIT';
    }else if(!selected){
      message.textContent=mode==='pan'?'Drag to move the view. Choose a selection tool to continue.':
        mode==='magic'?'Click a subject to select · Magic Select ≈ $0.005 per click':
        'Paint the area to change. Zoom or pan for precise edges.';
      $('precision-price-note').textContent='1 / Select an area to change · Local brush tools are free';
    }else{
      message.textContent=mode==='pan'?'Drag to inspect the selected area.':
        'Area selected · Refine its edges, then describe the change.';
      $('precision-price-note').textContent=$('precision-prompt').value.trim()?
        base.width*base.height>=exportRiskPixels&&!$('precision-allow-jpeg').checked?
          'High-resolution photo · approve optional JPEG backup before the paid edit':
          '3 / Ready to review the FLUX generation price':
        '2 / Describe what should change inside the selection';
    }
  }
  function refreshButtons(){
    const have=!!base;
    for(const id of ['precision-tool-magic','precision-tool-brush','precision-tool-erase','precision-expand','precision-change-photo','precision-prompt','precision-brush-size','precision-strength'])
      $(id).disabled=!have||taskBusy;
    $('precision-tool-magic').disabled=!have||taskBusy||!falReady();
    $('precision-expand').disabled=!selected||taskBusy;
    $('precision-clear-mask').disabled=!selected||taskBusy;
    $('precision-undo').disabled=!undoStack.length||taskBusy;
    const highRisk=!!(base&&base.width*base.height>=exportRiskPixels);
    const exportReady=!highRisk||$('precision-allow-jpeg').checked;
    $('precision-generate').disabled=!have||!selected||!$('precision-prompt').value.trim()||taskBusy||!owner()||!falReady()||!exportReady;
    $('precision-change-photo').hidden=!have;
    $('precision-tool-magic').title='Select a whole object with SAM 3. Published price approximately $0.005 per click.';
    $('precision-generate').textContent=taskBusy?'Working…':'Review price ↗';
    $('precision-generate').title=(!owner()||!falReady())?'Paid Retouch generation is not enabled on this account.':
      !have?'Add a photograph first.':!selected?'Select the area to edit.':
      !$('precision-prompt').value.trim()?'Describe the edit before reviewing its price.':
      !exportReady?'Allow JPEG fallback for this large photo before reviewing the price.':
      'Confirm a quote before starting paid inference.';
    $('precision-zoom-controls').hidden=!have;
    $('precision-export-option').hidden=!highRisk;
    $('precision-tool-pan').disabled=!have||taskBusy;
    view.querySelector('.precision-deck').classList.toggle('is-ready',have&&selected&&!!$('precision-prompt').value.trim());
    view.dataset.phase=!have?'empty':!selected?'select':$('precision-prompt').value.trim()?'ready':'describe';
    refreshGuidance();
  }
  function renderMask(){
    oc.clearRect(0,0,overlay.width,overlay.height);
    if(!mask.width)return;
    // Alpha-only selection becomes a high-visibility PV yellow overlay.
    oc.globalCompositeOperation='source-over';
    oc.drawImage(mask,0,0);
    oc.globalCompositeOperation='source-in';oc.fillStyle='rgba(214,255,0,.58)';
    oc.fillRect(0,0,overlay.width,overlay.height);oc.globalCompositeOperation='source-over';
  }
  function saveUndo(){
    if(!mask.width)return;
    // Snapshot synchronously before the first brush mark. An async toBlob would race pointermove.
    undoStack.push(mask.toDataURL('image/png'));
    if(undoStack.length>maxUndo)undoStack.shift();
  }
  async function undo(){
    if(!undoStack.length||taskBusy)return;
    const snapshot=undoStack.pop(),blob=await (await fetch(snapshot)).blob(),bitmap=await createImageBitmap(blob);
    maskCtx.clearRect(0,0,mask.width,mask.height);
    maskCtx.drawImage(bitmap,0,0);bitmap.close();maskChanged();
  }
  function pointAt(event){
    const r=overlay.getBoundingClientRect();
    return {x:Math.max(0,Math.min(mask.width-1,(event.clientX-r.left)*mask.width/r.width)),
      y:Math.max(0,Math.min(mask.height-1,(event.clientY-r.top)*mask.height/r.height))};
  }
  function stroke(point){
    if(!lastPoint)lastPoint=point;
    const r=Math.max(2,Number($('precision-brush-size').value)*mask.width/Math.max(1,overlay.getBoundingClientRect().width)/2);
    maskCtx.save();maskCtx.globalCompositeOperation=mode==='erase'?'destination-out':'source-over';
    maskCtx.lineWidth=r*2;maskCtx.lineCap='round';maskCtx.lineJoin='round';
    maskCtx.strokeStyle='#fff';maskCtx.fillStyle='#fff';
    maskCtx.beginPath();maskCtx.moveTo(lastPoint.x,lastPoint.y);maskCtx.lineTo(point.x,point.y);maskCtx.stroke();
    maskCtx.beginPath();maskCtx.arc(point.x,point.y,r,0,Math.PI*2);maskCtx.fill();maskCtx.restore();
    lastPoint=point;renderMask();
  }
  async function growMask(){
    if(!selected||taskBusy)return;
    await saveUndo();
    // Grow by 6 working pixels, preserving individual garment fragments.
    for(let pass=0;pass<6;pass++){
      const tmp=document.createElement('canvas');tmp.width=mask.width;tmp.height=mask.height;
      const t=tmp.getContext('2d');
      for(let y=-1;y<=1;y++)for(let x=-1;x<=1;x++)t.drawImage(mask,x,y);
      maskCtx.clearRect(0,0,mask.width,mask.height);maskCtx.drawImage(tmp,0,0);
    }
    maskChanged();
    setStatus('Selection expanded. You can refine the edges with Add or Erase.');
  }
  function resetSelection(){
    maskCtx.clearRect(0,0,mask.width,mask.height);
    undoStack.length=0;selected=false;renderMask();refreshButtons();
  }
  async function ensureBaseId(){
    if(!base)throw new Error('Add a base photograph first.');
    if(base.id)return base.id;
    const current=base,id=await uploadAsset(current.file);
    if(base!==current)throw new Error('Source changed during upload.');
    base.id=id;return id;
  }
  function resetRetouchScroll(){
    if(view.hidden)return;
    // This is the page scroller, not an inner canvas scroll. Avoid the browser
    // restoring an old Image/Assets position when the large canvas is mounted.
    window.scrollTo({top:0,left:0,behavior:'instant'});
    const scrolling=document.scrollingElement;
    if(scrolling)scrolling.scrollTop=0;
  }
  function settleRetouchScroll(){
    resetRetouchScroll();
    requestAnimationFrame(()=>{
      if(view.hidden)return;
      resetRetouchScroll();
      requestAnimationFrame(resetRetouchScroll);
    });
  }
  async function open({file=null,id=null}={}){
    if(!owner())throw new Error('Sign in to edit an image.');
    host.classList.add('is-precision-active');view.hidden=false;
    $('precision-price-review').hidden=true;
    settleRetouchScroll();
    // Navigating between Image and Retouch must not clear a work-in-progress mask.
    // Only load a new source when it is actually a different photograph.
    if(file&&(!base||(id?base.id!==id:base.file!==file)))await setBase(file,id);
    else if(!base)setStatus('');
    if(!falReady())selectMode('brush');
    refreshButtons();
    syncPreviewFit();if(base)paintZoom();
    settleRetouchScroll();
  }
  function close(){
    view.hidden=true;host.classList.remove('is-precision-active');
    $('precision-price-review').hidden=true;
    // Keep a queued job in History; closing never resubmits or cancels it.
  }
  async function setBase(file,id=null){
    if(taskBusy)throw new Error('Wait for the current operation to finish.');
    if(!mimeTypes.has(file?.type))throw new Error('Choose a JPG, PNG or WebP photograph.');
    if(!file.size||file.size>20*1024*1024)throw new Error('Image too large or empty. Maximum size is 20 MB.');
    const bitmap=await createImageBitmap(file);
    if(Math.min(bitmap.width,bitmap.height)<240||Math.max(bitmap.width,bitmap.height)>8192){
      bitmap.close();throw new Error('Use an image from 240 to 8192 pixels on each side.');
    }
    const originalRatio=bitmap.width/bitmap.height;
    if(Math.max(originalRatio,1/originalRatio)>8){bitmap.close();throw new Error('This photograph has an unsupported aspect ratio.');}
    if(base?.bitmap)base.bitmap.close();
    base={file,id,bitmap,name:file.name||'Original image',width:bitmap.width,height:bitmap.height};
    const scale=Math.min(1,2048/Math.max(base.width,base.height));
    const w=Math.max(1,Math.round(base.width*scale)),h=Math.max(1,Math.round(base.height*scale));
    sourceCanvas.width=overlay.width=mask.width=w;
    sourceCanvas.height=overlay.height=mask.height=h;
    sc.clearRect(0,0,w,h);sc.drawImage(bitmap,0,0,w,h);
    const stage=$('precision-stage');stage.style.aspectRatio=String(w)+' / '+String(h);
    resetZoom();
    maskCtx.clearRect(0,0,w,h);resetSelection();workingId=null;resultBlob=null;
    if(resultBitmap){resultBitmap.close();resultBitmap=null;}
    resultCanvas.hidden=true;$('precision-output-empty').hidden=false;
    $('precision-compare').value='100';$('precision-compare').disabled=true;
    $('precision-compare-control').hidden=true;$('precision-compare-idle').hidden=false;
    $('precision-download').disabled=true;$('precision-download').hidden=true;
    resultFormat='png';
    const highRes=base.width*base.height>=exportRiskPixels;
    $('precision-export-option').hidden=!highRes;
    $('precision-allow-jpeg').checked=false;
    $('precision-source-meta').textContent=base.width+' × '+base.height+' / '+base.name;
    $('precision-result-label').textContent='AWAITING EDIT';
    $('precision-drop').hidden=true;$('precision-source-holder').hidden=false;
    $('precision-selection-message').textContent='Click an object to select it. Brush tools refine your mask.';
    $('precision-price-review').hidden=true;setStatus('');
    selectMode(falReady()?'magic':'brush');refreshButtons();
    syncPreviewFit();paintZoom();
    // File-picker/drop imports may resize a previously empty panel. Keep the
    // heading visible after decoding instead of following an old scroll anchor.
    if(isOpen())settleRetouchScroll();
  }
  async function ensureWorkingId(){
    if(workingId)return workingId;
    const blob=await readBlob(sourceCanvas);
    workingId=await uploadAsset(new File([blob],'precision-working.png',{type:'image/png'}));
    return workingId;
  }
  function maskFromSam(bitmap,point){
    const stage=document.createElement('canvas');stage.width=mask.width;stage.height=mask.height;
    const c=stage.getContext('2d',{willReadFrequently:true});c.drawImage(bitmap,0,0,stage.width,stage.height);
    const pixels=c.getImageData(0,0,stage.width,stage.height),data=pixels.data;
    let transparent=0,light=0;
    for(let i=0;i<data.length;i+=128){if(data[i+3]<230)transparent++;if((data[i]+data[i+1]+data[i+2])/3>127)light++;}
    const transparency=transparent>15,values=new Uint8Array(stage.width*stage.height);
    let count=0;
    for(let i=0;i<values.length;i++){
      const o=i*4,alpha=data[o+3],luma=(data[o]+data[o+1]+data[o+2])/3;
      const on=transparency?alpha>90:luma>130;
      values[i]=on?255:0;if(on)count++;
    }
    const index=Math.round(point.y)*stage.width+Math.round(point.x),hit=values[Math.max(0,Math.min(values.length-1,index))]===255;
    // SAM mask may use inverted black/white convention. Prefer clicked foreground.
    if(!hit&&count>values.length*.15){
      for(let i=0;i<values.length;i++)values[i]=255-values[i];count=values.length-count;
    }
    if(count<15||count>=values.length*.97)throw new Error('SAM returned an unclear selection. Try another point or use Add brush.');
    const image=c.createImageData(stage.width,stage.height);
    for(let i=0;i<values.length;i++){const o=i*4;image.data[o]=image.data[o+1]=image.data[o+2]=255;image.data[o+3]=values[i];}
    c.putImageData(image,0,0);
    maskCtx.drawImage(stage,0,0);
    maskChanged();
  }
  async function magicSelect(point){
    if(!base||taskBusy)return;
    if(!falReady()){setStatus('Magic Select requires the FAL API connection.',true);return;}
    taskBusy=true;refreshButtons();$('precision-source-holder').classList.add('is-busy');
    const revision=++session;
    try{
      const sourceId=await ensureBaseId();
      setStatus('SAM 3 is selecting the object. This selection uses a metered API request.');
      const p={x:Math.min(base.width-1,Math.round(point.x*base.width/mask.width)),
        y:Math.min(base.height-1,Math.round(point.y*base.height/mask.height))};
      const reply=await api('/api/precision/segment',{method:'POST',body:{sourceId,point:p}});
      if(!reply?.requestId||!reply.ticket)throw new Error('Segmentation did not return a request ID.');
      let ready=null;
      for(let attempt=0;attempt<65&&revision===session;attempt++){
        if(attempt)await sleep(1700);
        const qs=new URLSearchParams({sourceId,requestId:reply.requestId,expires:String(reply.expires),ticket:reply.ticket});
        const result=await api('/api/precision/segment?'+qs.toString());
        if(result?.status==='completed'){ready=result;break;}
      }
      if(revision!==session)throw new Error('The source photograph changed.');
      if(!ready?.maskSourceId)throw new Error('SAM 3 is still processing. Do not click again until you have checked the request.');
      const blob=await assetBlob(ready.maskSourceId),bitmap=await createImageBitmap(blob);
      try{await saveUndo();maskFromSam(bitmap,point);}finally{bitmap.close();}
      setStatus('Object selected. Click another garment to add it, or refine with the brush.');
    }catch(e){setStatus(e.message,true);}
    finally{taskBusy=false;$('precision-source-holder').classList.remove('is-busy');refreshButtons();}
  }
  function maskExport(){
    const c=document.createElement('canvas');c.width=mask.width;c.height=mask.height;
    const x=c.getContext('2d');x.fillStyle='#000';x.fillRect(0,0,c.width,c.height);x.drawImage(mask,0,0);
    return c;
  }
  async function reviewPrice(){
    if(!base||!selected||taskBusy)return;
    const prompt=$('precision-prompt').value.trim();
    if(!prompt){setStatus('Describe the change inside the selection.',true);return;}
    const allowJpegFallback=$('precision-allow-jpeg').checked;
    if(base.width*base.height>=exportRiskPixels&&!allowJpegFallback){setStatus('For high-resolution edits, approve the optional JPEG backup first.',true);return;}
    taskBusy=true;refreshButtons();setStatus('Preparing the private working image and selection. No generation submitted.');
    try{
      const originalSourceId=await ensureBaseId(),sourceId=await ensureWorkingId(),blob=await readBlob(maskExport());
      const maskSourceId=await uploadAsset(new File([blob],'precision-selection.png',{type:'image/png'}));
      const strength=Number($('precision-strength').value);
      const body={originalSourceId,sourceId,maskSourceId,prompt,strength,allowJpegFallback};
      const quoted=await api('/api/precision/quote',{method:'POST',body});
      if(!quoted?.quoteId||!quoted.ticket)throw new Error('Precision Edit did not return a reusable price approval.');
      pending={...body,quoteId:quoted.quoteId,ticket:quoted.ticket,expiresAt:quoted.expiresAt,maskSourceId};
      const usd=Number(quoted.estimatedUsd||0);
      $('precision-review-body').textContent='FLUX Inpainting · estimated 
      $('precision-price-review').hidden=false;
      setStatus('Price checked. No generation has started.');
    }catch(e){pending=null;setStatus(e.message,true);}
    finally{taskBusy=false;refreshButtons();}
  }
  async function submit(){
    if(!pending||taskBusy)return;
    if(Date.now()>=pending.expiresAt){pending=null;$('precision-price-review').hidden=true;setStatus('Price approval expired. Review it again.',true);return;}
    const snapshot={...pending};pending=null;$('precision-price-review').hidden=true;
    taskBusy=true;refreshButtons();setStatus('Submitting one paid FLUX inpainting job.');
    try{
      const response=await api('/api/precision/submit',{method:'POST',body:snapshot});
      let job=response?.job;
      if(!job?.id)throw new Error('No job ID was returned. Check Queue before retrying.');
      onJob(job);
      setStatus('Generation queued. The source remains unchanged; your job is saved in History.');
      for(let i=0;i<110;i++){
        if(['completed','failed','resolved','uncertain'].includes(job.status))break;
        await sleep(3000);
        const answer=await api('/api/jobs/'+encodeURIComponent(job.id));
        job=answer.job;if(!job)throw new Error('Could not retrieve the queued generation.');
        if(i%4===0)onJob(job);
      }
      if(job.status==='completed'){
        setStatus('Rebuilding the original photograph outside the edited region.');
        const final=await finalize(job);
        onJob(final);
        if(isOpen()&&base&&base.id===final.settings.precisionOriginalId){
          resultBlob=await assetBlob(final.outputId);
          if(resultBitmap)resultBitmap.close();
          resultBitmap=await createImageBitmap(resultBlob);
          showResult(resultBitmap);
        }
        setStatus('Precision Edit finished. Unselected pixels remain from your original photograph.');
      }else if(job.status==='failed'||job.status==='resolved'){
        setStatus(job.error||'The model did not complete this edit.',true);
      }else if(job.status==='uncertain'){
        setStatus('The provider submission is uncertain. Check Queue before retrying.',true);
      }else{
        setStatus('The edit is still in Queue. Reopen it from History when complete.');
      }
    }catch(e){setStatus(e.message,true);}
    finally{taskBusy=false;refreshButtons();}
  }
  async function composeWithOriginal(original,provider,maskImage){
    const w=original.width,h=original.height;
    const work=document.createElement('canvas');work.width=maskImage.width;work.height=maskImage.height;
    const wc=work.getContext('2d',{willReadFrequently:true});
    wc.drawImage(maskImage,0,0,work.width,work.height);
    const pixels=wc.getImageData(0,0,work.width,work.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const a=pixels.data[i+3],v=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
      pixels.data[i+3]=a===0?0:Math.max(0,Math.min(255,Math.round(v)));
    }
    wc.putImageData(pixels,0,0);
    const alpha=document.createElement('canvas');alpha.width=w;alpha.height=h;
    const ax=alpha.getContext('2d');ax.filter='blur('+Math.max(1,Math.round(Math.max(w,h)/1900))+'px)';
    ax.drawImage(work,0,0,w,h);ax.filter='none';
    const patch=document.createElement('canvas');patch.width=w;patch.height=h;
    const px=patch.getContext('2d');px.drawImage(provider,0,0,w,h);
    px.globalCompositeOperation='destination-in';px.drawImage(alpha,0,0);px.globalCompositeOperation='source-over';
    const result=document.createElement('canvas');result.width=w;result.height=h;
    const cx=result.getContext('2d');cx.drawImage(original,0,0);cx.drawImage(patch,0,0);
    return readBlob(result);
  }
  async function finalize(job){
    if(job?.settings?.precisionFinalized||!job?.settings?.precisionEdit)return job;
    if(finalizing.has(job.id))return finalizing.get(job.id);
    const promise=(async()=>{
      const settings=job.settings;
      if(job.status!=='completed'||!job.outputId)throw new Error('Precision Edit has no completed result to finalize.');
      const ids=[settings.precisionOriginalId,settings.maskSourceId,job.outputId];
      if(ids.some(id=>!id))throw new Error('Precision Edit provenance is incomplete; your raw result is retained in History.');
      const [originalBlob,maskBlob,generatedBlob]=await Promise.all(ids.map(assetBlob));
      const [original,selection,generated]=await Promise.all([createImageBitmap(originalBlob),createImageBitmap(maskBlob),createImageBitmap(generatedBlob)]);
      let composite;
      try{composite=await composeWithOriginal(original,generated,selection);}
      finally{original.close();selection.close();generated.close();}
      if(composite.size>20*1024*1024)throw new Error('Final PNG exceeds 20 MB. The raw edit is still saved; download a smaller original for this workflow.');
      const compositeSourceId=await uploadAsset(new File([composite],'precision-composite.png',{type:'image/png'}));
      const response=await api('/api/precision/commit',{method:'POST',body:{jobId:job.id,compositeSourceId,expectedOutputId:job.outputId}});
      if(!response?.job?.settings?.precisionFinalized)throw new Error('Edited result was not confirmed by the private archive.');
      return response.job;
    })();
    finalizing.set(job.id,promise);
    try{return await promise;}finally{finalizing.delete(job.id);}
  }
  function showResult(bitmap){
    if(!base)return;
    resultCanvas.width=mask.width;resultCanvas.height=mask.height;
    $('precision-output-empty').hidden=true;resultCanvas.hidden=false;
    $('precision-result-label').textContent=resultFormat==='jpeg'?'EDIT COMPLETE / JPEG':'EDIT COMPLETE / PNG';
    $('precision-compare-control').hidden=false;$('precision-compare-idle').hidden=true;
    $('precision-compare').disabled=false;$('precision-download').disabled=!resultBlob;
    $('precision-download').hidden=false;
    $('precision-download').textContent='Download '+(resultFormat==='jpeg'?'JPG':'PNG')+' ↗';
    renderComparison();
  }
  function renderComparison(){
    if(!resultBitmap||!base)return;
    const w=resultCanvas.width,h=resultCanvas.height,r=Math.max(0,Math.min(1,Number($('precision-compare').value)/100));
    rc.clearRect(0,0,w,h);rc.drawImage(resultBitmap,0,0,w,h);
    if(r<1){rc.save();rc.beginPath();rc.rect(0,0,w*(1-r),h);rc.clip();rc.drawImage(base.bitmap,0,0,w,h);rc.restore();}
    if(r>0&&r<1){rc.fillStyle='rgba(255,255,255,.7)';rc.fillRect(w*(1-r)-1,0,2,h);}
  }
  async function download(){
    if(!resultBlob)return;
    const url=URL.createObjectURL(resultBlob),a=document.createElement('a');
    a.href=url;a.download='parallel-vision-retouch.'+(resultFormat==='jpeg'?'jpg':'png');document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function reset(){
    session++;close();
    if(base?.bitmap)base.bitmap.close();base=null;
    if(resultBitmap)resultBitmap.close();resultBitmap=null;resultBlob=null;workingId=null;
    sourceCanvas.width=overlay.width=mask.width=0;sourceCanvas.height=overlay.height=mask.height=0;
    undoStack.length=0;selected=false;pending=null;taskBusy=false;resetZoom();
    queueRevision++;pendingPolls.clear();selectionAllowance=0;consentPoint=null;
    if($('precision-select-consent').open)$('precision-select-consent').close();
    $('precision-allow-jpeg').checked=false;$('precision-export-option').hidden=true;
    $('precision-source-holder').hidden=true;$('precision-drop').hidden=false;
    $('precision-result-canvas').hidden=true;$('precision-output-empty').hidden=false;
    $('precision-compare-control').hidden=true;$('precision-compare-idle').hidden=false;
    $('precision-download').hidden=true;resultFormat='png';
    $('precision-source-meta').textContent='DROP IMAGE';
    $('precision-result-label').textContent='AWAITING EDIT';
    $('precision-prompt').value='';setStatus('');refreshButtons();
  }
  const handle=async promise=>{try{await promise;}catch(e){setStatus(e.message,true);notify(e.message,true);}};
  $('precision-return').onclick=()=>{if(typeof onExit==='function')onExit();else close();};
  $('precision-tool-magic').onclick=()=>selectMode('magic');
  $('precision-tool-pan').onclick=()=>selectMode(mode==='pan'?'brush':'pan');
  $('precision-zoom-fit').onclick=()=>setZoom(1);
  $('precision-zoom-out').onclick=()=>setZoom(zoom/1.45);
  $('precision-zoom-in').onclick=()=>setZoom(zoom*1.45);
  $('precision-zoom-actual').onclick=()=>setZoom(actualPreviewZoom());
  $('precision-source-holder').addEventListener('wheel',event=>{
    if(!base||taskBusy)return;
    event.preventDefault();
    const multiplier=Math.exp(-Math.max(-180,Math.min(180,event.deltaY))*.0025);
    setZoom(zoom*multiplier,event);
  },{passive:false});
  document.addEventListener('keydown',event=>{
    if(!isOpen()||event.code!=='Space'||event.repeat||event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
    spaceHeld=true;event.preventDefault();if(base)paintZoom();
  });
  document.addEventListener('keyup',event=>{
    if(event.code==='Space'&&spaceHeld){spaceHeld=false;if(base)paintZoom();}
  });
  window.addEventListener('blur',()=>{spaceHeld=false;if(base&&isOpen())paintZoom();});
  $('precision-select-cancel').onclick=()=>{consentPoint=null;$('precision-select-consent').close();selectMode('brush');};
  $('precision-select-approve').onclick=()=>{
    const point=consentPoint;consentPoint=null;
    $('precision-select-consent').close();selectionAllowance=5;
    if(point&&base)attemptMagic(point);
  };
  $('precision-allow-jpeg').onchange=()=>{pending=null;$('precision-price-review').hidden=true;refreshButtons();};
  $('precision-tool-brush').onclick=()=>selectMode('brush');
  $('precision-tool-erase').onclick=()=>selectMode('erase');
  $('precision-undo').onclick=()=>handle(undo());
  $('precision-expand').onclick=()=>handle(growMask());
  $('precision-clear-mask').onclick=()=>resetSelection();
  $('precision-brush-size').oninput=()=>$('precision-size-label').textContent=$('precision-brush-size').value;
  $('precision-strength').oninput=()=>{$('precision-strength-value').textContent=Number($('precision-strength').value).toFixed(2);pending=null;$('precision-price-review').hidden=true;};
  $('precision-prompt').oninput=()=>{pending=null;$('precision-price-review').hidden=true;refreshButtons();};
  $('precision-generate').onclick=()=>handle(reviewPrice());
  $('precision-review-confirm').onclick=()=>handle(submit());
  $('precision-review-cancel').onclick=()=>{$('precision-price-review').hidden=true;pending=null;};
  $('precision-compare').oninput=renderComparison;
  $('precision-download').onclick=download;
  $('precision-change-photo').onclick=()=>$('precision-photo-input').click();
  $('precision-photo-input').onchange=e=>{if(e.target.files?.[0])handle(setBase(e.target.files[0]));e.target.value='';};
  $('precision-drop').onclick=()=>$('precision-photo-input').click();
  $('precision-drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('precision-photo-input').click();}};
  for(const name of ['dragenter','dragover'])$('precision-drop').addEventListener(name,e=>{e.preventDefault();$('precision-drop').classList.add('is-dragging');});
  $('precision-drop').addEventListener('dragleave',()=>{$('precision-drop').classList.remove('is-dragging');});
  $('precision-drop').addEventListener('drop',e=>{e.preventDefault();$('precision-drop').classList.remove('is-dragging');if(e.dataTransfer.files[0])handle(setBase(e.dataTransfer.files[0]));});
  function attemptMagic(point){
    if(!base||taskBusy||!falReady())return;
    if(selectionAllowance<=0){
      consentPoint=point;
      if(!$('precision-select-consent').open)$('precision-select-consent').showModal();
      return;
    }
    selectionAllowance--;
    handle(magicSelect(point));
  }
  overlay.onpointerdown=e=>{
    if(!base||taskBusy)return;
    const navigating=mode==='pan'||spaceHeld||e.button===1;
    if(e.button!==0&&!navigating)return;
    e.preventDefault();
    if(navigating){
      panDrag={x:e.clientX,y:e.clientY,panX,panY};
      overlay.setPointerCapture(e.pointerId);paintZoom();return;
    }
    const point=pointAt(e);
    if(mode==='magic'){attemptMagic(point);return;}
    drawing=true;lastPoint=point;overlay.setPointerCapture(e.pointerId);
    saveUndo();stroke(point);
  };
  overlay.onpointermove=e=>{
    if(panDrag){
      panX=panDrag.panX+(e.clientX-panDrag.x);
      panY=panDrag.panY+(e.clientY-panDrag.y);
      paintZoom();return;
    }
    if(drawing)stroke(pointAt(e));
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    overlay.addEventListener(name,()=>{
      if(drawing){drawing=false;lastPoint=null;maskChanged();}
      if(panDrag){panDrag=null;paintZoom();}
    });
  // No source is opened automatically in the normal gallery. This workspace is opt-in.
  reset();
  return {open,close,isOpen,hasBase:()=>!!base,reset,finalize,setBase};
}
+usd.toFixed(3)+' USD (published estimate, not a bound vendor quote). Confirm to authorize ONE paid generation. Your original file stays unchanged.'+
        (allowJpegFallback?' If the lossless PNG exceeds 20 MB, the result may be a high-quality JPEG, which recompresses pixels outside your selection.':' PNG retains exact original pixels outside the selected area.');
      $('precision-price-review').hidden=false;
      setStatus('Price checked. No generation has started.');
    }catch(e){pending=null;setStatus(e.message,true);}
    finally{taskBusy=false;refreshButtons();}
  }
  async function submit(){
    if(!pending||taskBusy)return;
    if(Date.now()>=pending.expiresAt){pending=null;$('precision-price-review').hidden=true;setStatus('Price approval expired. Review it again.',true);return;}
    const snapshot={...pending};pending=null;$('precision-price-review').hidden=true;
    taskBusy=true;refreshButtons();setStatus('Submitting one paid FLUX inpainting job.');
    try{
      const response=await api('/api/precision/submit',{method:'POST',body:snapshot});
      let job=response?.job;
      if(!job?.id)throw new Error('No job ID was returned. Check Queue before retrying.');
      onJob(job);
      setStatus('Generation queued. The source remains unchanged; your job is saved in History.');
      for(let i=0;i<110;i++){
        if(['completed','failed','resolved','uncertain'].includes(job.status))break;
        await sleep(3000);
        const answer=await api('/api/jobs/'+encodeURIComponent(job.id));
        job=answer.job;if(!job)throw new Error('Could not retrieve the queued generation.');
        if(i%4===0)onJob(job);
      }
      if(job.status==='completed'){
        setStatus('Rebuilding the original photograph outside the edited region.');
        const final=await finalize(job);
        onJob(final);
        if(isOpen()&&base&&base.id===final.settings.precisionOriginalId){
          resultBlob=await assetBlob(final.outputId);
          if(resultBitmap)resultBitmap.close();
          resultBitmap=await createImageBitmap(resultBlob);
          showResult(resultBitmap);
        }
        setStatus('Precision Edit finished. Unselected pixels remain from your original photograph.');
      }else if(job.status==='failed'||job.status==='resolved'){
        setStatus(job.error||'The model did not complete this edit.',true);
      }else if(job.status==='uncertain'){
        setStatus('The provider submission is uncertain. Check Queue before retrying.',true);
      }else{
        setStatus('The edit is still in Queue. Reopen it from History when complete.');
      }
    }catch(e){setStatus(e.message,true);}
    finally{taskBusy=false;refreshButtons();}
  }
  async function composeWithOriginal(original,provider,maskImage){
    const w=original.width,h=original.height;
    const work=document.createElement('canvas');work.width=maskImage.width;work.height=maskImage.height;
    const wc=work.getContext('2d',{willReadFrequently:true});
    wc.drawImage(maskImage,0,0,work.width,work.height);
    const pixels=wc.getImageData(0,0,work.width,work.height);
    for(let i=0;i<pixels.data.length;i+=4){
      const a=pixels.data[i+3],v=(pixels.data[i]+pixels.data[i+1]+pixels.data[i+2])/3;
      pixels.data[i]=pixels.data[i+1]=pixels.data[i+2]=255;
      pixels.data[i+3]=a===0?0:Math.max(0,Math.min(255,Math.round(v)));
    }
    wc.putImageData(pixels,0,0);
    const alpha=document.createElement('canvas');alpha.width=w;alpha.height=h;
    const ax=alpha.getContext('2d');ax.filter='blur('+Math.max(1,Math.round(Math.max(w,h)/1900))+'px)';
    ax.drawImage(work,0,0,w,h);ax.filter='none';
    const patch=document.createElement('canvas');patch.width=w;patch.height=h;
    const px=patch.getContext('2d');px.drawImage(provider,0,0,w,h);
    px.globalCompositeOperation='destination-in';px.drawImage(alpha,0,0);px.globalCompositeOperation='source-over';
    const result=document.createElement('canvas');result.width=w;result.height=h;
    const cx=result.getContext('2d');cx.drawImage(original,0,0);cx.drawImage(patch,0,0);
    return readBlob(result);
  }
  async function finalize(job){
    if(job?.settings?.precisionFinalized||!job?.settings?.precisionEdit)return job;
    if(finalizing.has(job.id))return finalizing.get(job.id);
    const promise=(async()=>{
      const settings=job.settings;
      if(job.status!=='completed'||!job.outputId)throw new Error('Precision Edit has no completed result to finalize.');
      const ids=[settings.precisionOriginalId,settings.maskSourceId,job.outputId];
      if(ids.some(id=>!id))throw new Error('Precision Edit provenance is incomplete; your raw result is retained in History.');
      const [originalBlob,maskBlob,generatedBlob]=await Promise.all(ids.map(assetBlob));
      const [original,selection,generated]=await Promise.all([createImageBitmap(originalBlob),createImageBitmap(maskBlob),createImageBitmap(generatedBlob)]);
      let composite;
      try{composite=await composeWithOriginal(original,generated,selection);}
      finally{original.close();selection.close();generated.close();}
      if(composite.size>20*1024*1024)throw new Error('Final PNG exceeds 20 MB. The raw edit is still saved; download a smaller original for this workflow.');
      const compositeSourceId=await uploadAsset(new File([composite],'precision-composite.png',{type:'image/png'}));
      const response=await api('/api/precision/commit',{method:'POST',body:{jobId:job.id,compositeSourceId,expectedOutputId:job.outputId}});
      if(!response?.job?.settings?.precisionFinalized)throw new Error('Edited result was not confirmed by the private archive.');
      return response.job;
    })();
    finalizing.set(job.id,promise);
    try{return await promise;}finally{finalizing.delete(job.id);}
  }
  function showResult(bitmap){
    if(!base)return;
    resultCanvas.width=mask.width;resultCanvas.height=mask.height;
    $('precision-output-empty').hidden=true;resultCanvas.hidden=false;
    $('precision-result-label').textContent=resultFormat==='jpeg'?'EDIT COMPLETE / JPEG':'EDIT COMPLETE / PNG';
    $('precision-compare-control').hidden=false;$('precision-compare-idle').hidden=true;
    $('precision-compare').disabled=false;$('precision-download').disabled=!resultBlob;
    $('precision-download').hidden=false;
    $('precision-download').textContent='Download '+(resultFormat==='jpeg'?'JPG':'PNG')+' ↗';
    renderComparison();
  }
  function renderComparison(){
    if(!resultBitmap||!base)return;
    const w=resultCanvas.width,h=resultCanvas.height,r=Math.max(0,Math.min(1,Number($('precision-compare').value)/100));
    rc.clearRect(0,0,w,h);rc.drawImage(resultBitmap,0,0,w,h);
    if(r<1){rc.save();rc.beginPath();rc.rect(0,0,w*(1-r),h);rc.clip();rc.drawImage(base.bitmap,0,0,w,h);rc.restore();}
    if(r>0&&r<1){rc.fillStyle='rgba(255,255,255,.7)';rc.fillRect(w*(1-r)-1,0,2,h);}
  }
  async function download(){
    if(!resultBlob)return;
    const url=URL.createObjectURL(resultBlob),a=document.createElement('a');
    a.href=url;a.download='parallel-vision-retouch.'+(resultFormat==='jpeg'?'jpg':'png');document.body.append(a);a.click();a.remove();
    setTimeout(()=>URL.revokeObjectURL(url),5000);
  }
  function reset(){
    session++;close();
    if(base?.bitmap)base.bitmap.close();base=null;
    if(resultBitmap)resultBitmap.close();resultBitmap=null;resultBlob=null;workingId=null;
    sourceCanvas.width=overlay.width=mask.width=0;sourceCanvas.height=overlay.height=mask.height=0;
    undoStack.length=0;selected=false;pending=null;taskBusy=false;resetZoom();
    queueRevision++;pendingPolls.clear();selectionAllowance=0;consentPoint=null;
    if($('precision-select-consent').open)$('precision-select-consent').close();
    $('precision-allow-jpeg').checked=false;$('precision-export-option').hidden=true;
    $('precision-source-holder').hidden=true;$('precision-drop').hidden=false;
    $('precision-result-canvas').hidden=true;$('precision-output-empty').hidden=false;
    $('precision-compare-control').hidden=true;$('precision-compare-idle').hidden=false;
    $('precision-download').hidden=true;resultFormat='png';
    $('precision-source-meta').textContent='DROP IMAGE';
    $('precision-result-label').textContent='AWAITING EDIT';
    $('precision-prompt').value='';setStatus('');refreshButtons();
  }
  const handle=async promise=>{try{await promise;}catch(e){setStatus(e.message,true);notify(e.message,true);}};
  $('precision-return').onclick=()=>{if(typeof onExit==='function')onExit();else close();};
  $('precision-tool-magic').onclick=()=>selectMode('magic');
  $('precision-tool-pan').onclick=()=>selectMode(mode==='pan'?'brush':'pan');
  $('precision-zoom-fit').onclick=()=>setZoom(1);
  $('precision-zoom-out').onclick=()=>setZoom(zoom/1.45);
  $('precision-zoom-in').onclick=()=>setZoom(zoom*1.45);
  $('precision-zoom-actual').onclick=()=>setZoom(actualPreviewZoom());
  $('precision-source-holder').addEventListener('wheel',event=>{
    if(!base||taskBusy)return;
    event.preventDefault();
    const multiplier=Math.exp(-Math.max(-180,Math.min(180,event.deltaY))*.0025);
    setZoom(zoom*multiplier,event);
  },{passive:false});
  document.addEventListener('keydown',event=>{
    if(!isOpen()||event.code!=='Space'||event.repeat||event.target.closest('input,textarea,select,button,[contenteditable="true"]'))return;
    spaceHeld=true;event.preventDefault();if(base)paintZoom();
  });
  document.addEventListener('keyup',event=>{
    if(event.code==='Space'&&spaceHeld){spaceHeld=false;if(base)paintZoom();}
  });
  window.addEventListener('blur',()=>{spaceHeld=false;if(base&&isOpen())paintZoom();});
  $('precision-select-cancel').onclick=()=>{consentPoint=null;$('precision-select-consent').close();selectMode('brush');};
  $('precision-select-approve').onclick=()=>{
    const point=consentPoint;consentPoint=null;
    $('precision-select-consent').close();selectionAllowance=5;
    if(point&&base)attemptMagic(point);
  };
  $('precision-allow-jpeg').onchange=()=>{pending=null;$('precision-price-review').hidden=true;refreshButtons();};
  $('precision-tool-brush').onclick=()=>selectMode('brush');
  $('precision-tool-erase').onclick=()=>selectMode('erase');
  $('precision-undo').onclick=()=>handle(undo());
  $('precision-expand').onclick=()=>handle(growMask());
  $('precision-clear-mask').onclick=()=>resetSelection();
  $('precision-brush-size').oninput=()=>$('precision-size-label').textContent=$('precision-brush-size').value;
  $('precision-strength').oninput=()=>{$('precision-strength-value').textContent=Number($('precision-strength').value).toFixed(2);pending=null;$('precision-price-review').hidden=true;};
  $('precision-prompt').oninput=()=>{pending=null;$('precision-price-review').hidden=true;refreshButtons();};
  $('precision-generate').onclick=()=>handle(reviewPrice());
  $('precision-review-confirm').onclick=()=>handle(submit());
  $('precision-review-cancel').onclick=()=>{$('precision-price-review').hidden=true;pending=null;};
  $('precision-compare').oninput=renderComparison;
  $('precision-download').onclick=download;
  $('precision-change-photo').onclick=()=>$('precision-photo-input').click();
  $('precision-photo-input').onchange=e=>{if(e.target.files?.[0])handle(setBase(e.target.files[0]));e.target.value='';};
  $('precision-drop').onclick=()=>$('precision-photo-input').click();
  $('precision-drop').onkeydown=e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();$('precision-photo-input').click();}};
  for(const name of ['dragenter','dragover'])$('precision-drop').addEventListener(name,e=>{e.preventDefault();$('precision-drop').classList.add('is-dragging');});
  $('precision-drop').addEventListener('dragleave',()=>{$('precision-drop').classList.remove('is-dragging');});
  $('precision-drop').addEventListener('drop',e=>{e.preventDefault();$('precision-drop').classList.remove('is-dragging');if(e.dataTransfer.files[0])handle(setBase(e.dataTransfer.files[0]));});
  function attemptMagic(point){
    if(!base||taskBusy||!falReady())return;
    if(selectionAllowance<=0){
      consentPoint=point;
      if(!$('precision-select-consent').open)$('precision-select-consent').showModal();
      return;
    }
    selectionAllowance--;
    handle(magicSelect(point));
  }
  overlay.onpointerdown=e=>{
    if(!base||taskBusy)return;
    const navigating=mode==='pan'||spaceHeld||e.button===1;
    if(e.button!==0&&!navigating)return;
    e.preventDefault();
    if(navigating){
      panDrag={x:e.clientX,y:e.clientY,panX,panY};
      overlay.setPointerCapture(e.pointerId);paintZoom();return;
    }
    const point=pointAt(e);
    if(mode==='magic'){attemptMagic(point);return;}
    drawing=true;lastPoint=point;overlay.setPointerCapture(e.pointerId);
    saveUndo();stroke(point);
  };
  overlay.onpointermove=e=>{
    if(panDrag){
      panX=panDrag.panX+(e.clientX-panDrag.x);
      panY=panDrag.panY+(e.clientY-panDrag.y);
      paintZoom();return;
    }
    if(drawing)stroke(pointAt(e));
  };
  for(const name of ['pointerup','pointercancel','lostpointercapture'])
    overlay.addEventListener(name,()=>{
      if(drawing){drawing=false;lastPoint=null;maskChanged();}
      if(panDrag){panDrag=null;paintZoom();}
    });
  // No source is opened automatically in the normal gallery. This workspace is opt-in.
  reset();
  return {open,close,isOpen,hasBase:()=>!!base,reset,finalize,setBase};
}
