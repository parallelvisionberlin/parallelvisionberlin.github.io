// Private QA inside the existing Customer Activity panel. All bytes are fetched
// through the session request helper, never through public media links.
export function createOwnerCustomerInspectionUI({call,request,ownerReady,revision,formatDate}){
  let serial=0,controller=null,host=null,previewController=null;
  const urls=new Set();
  const el=(tag,cls,value)=>{const n=document.createElement(tag);if(cls)n.className=cls;if(value!==undefined)n.textContent=String(value);return n;};
  function clear(){
    serial++;controller?.abort();controller=null;previewController?.abort();previewController=null;
    host?.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
    for(const url of urls)URL.revokeObjectURL(url);
    urls.clear();host?.replaceChildren();host=null;
  }
  function show(customer,container){
    clear();host=container;
    const turn=serial,accountRevision=revision();
    controller=new AbortController();
    const signal=controller.signal;
    const valid=()=>!signal.aborted&&turn===serial&&accountRevision===revision()&&ownerReady();
    const section=el('section','owner-inspect-section');
    section.append(el('h3','','Generation quality review'),el('p','owner-customer-activity-caption',
      'Internal quality assurance · Owner access is logged · Retained generated results only'));
    const toolbar=el('div','owner-inspect-toolbar'),filters={};
    for(const [key,label] of [['mood','Mood'],['feature','Feature'],['model','Model'],['status','Status']]){
      const wrap=el('label','owner-inspect-filter-label',label),select=el('select','owner-inspect-filter');
      select.setAttribute('aria-label','Filter generations by '+label.toLowerCase());
      select.append(new Option('All '+label.toLowerCase()+'s',''));
      select.addEventListener('change',()=>{page=1;void load();});
      filters[key]=select;wrap.append(select);toolbar.append(wrap);
    }
    const status=el('p','owner-inspect-status','Loading retained generations…');status.setAttribute('role','status');
    const viewer=el('div','owner-inspect-viewer');viewer.hidden=true;
    const grid=el('div','owner-inspect-grid');
    const nav=el('nav','owner-inspect-pagination');nav.setAttribute('aria-label','Generation pages');
    const previous=el('button','owner-inspect-action','Previous'),next=el('button','owner-inspect-action','Next'),count=el('span','');
    previous.type=next.type='button';previous.disabled=next.disabled=true;
    previous.addEventListener('click',()=>{page--;void load();});next.addEventListener('click',()=>{page++;void load();});
    nav.append(previous,count,next);section.append(toolbar,status,viewer,grid,nav);container.append(section);
    let page=1,pageSerial=0,previewSerial=0,viewerUrl=null;
    function clearViewer(){
      previewSerial++;previewController?.abort();previewController=null;
      viewer.querySelectorAll('video').forEach(v=>{v.pause();v.removeAttribute('src');v.load();});
      viewer.replaceChildren();viewer.hidden=true;
      if(viewerUrl){URL.revokeObjectURL(viewerUrl);urls.delete(viewerUrl);viewerUrl=null;}
    }
    const money=value=>Number.isFinite(Number(value))?'$'+Number(value).toFixed(4):'Not recorded';
    function info(item){
      const body=el('div','owner-inspect-info');
      body.append(el('strong','',item.feature||'Feature unrecorded'),
        el('small','',[item.mood&&'Mood: '+item.mood,item.state,formatDate(item.createdAt)].filter(Boolean).join(' · ')),
        el('p','owner-inspect-model',(item.model||'Model not recorded')+' · '+(item.provider||'Provider not recorded')));
      body.append(el('span','owner-inspect-key',item.promptSource==='saved-provider-request'?'Saved provider prompt':'Stored job prompt'),
        el('p','owner-inspect-prompt',item.prompt||'No prompt recorded.'));
      if(item.promptSource!=='saved-provider-request')body.append(el('small','owner-inspect-note','Exact compiled provider prompt was not retained for this job.'));
      if(item.originalDirection&&item.originalDirection!==item.prompt)
        body.append(el('span','owner-inspect-key','Original user direction'),el('p','owner-inspect-prompt',item.originalDirection));
      if(item.storedPrompt&&item.storedPrompt!==item.prompt&&item.storedPrompt!==item.originalDirection)
        body.append(el('span','owner-inspect-key','Stored job prompt'),el('p','owner-inspect-prompt',item.storedPrompt));
      body.append(el('span','owner-inspect-key','Settings'),el('p','owner-inspect-settings',
        Object.entries(item.settings||{}).map(([key,value])=>key+': '+value).join(' · ')||'No settings recorded.'));
      const charged=Number(item.chargedCredits)||0,refunded=Number(item.refundedCredits)||0;
      body.append(el('p','owner-inspect-finance',charged+' credits charged · '+refunded+' refunded · '+(charged-refunded)+' net'),
        el('p','owner-inspect-finance',item.costKind==='settled'?'Provider cost (settled): '+money(item.providerCostUsd):
          'Provider cost '+(item.costKind==='unconfirmed'?'unconfirmed':'estimated')+' · Reservation estimate: '+money(item.estimatedCostUsd)),
        el('small','', 'Updated: '+formatDate(item.updatedAt)+' · '+item.jobId));
      return body;
    }
    function resetMedia(){
      clearViewer();
      for(const url of urls)URL.revokeObjectURL(url);urls.clear();
    }
    async function open(item,button){
      clearViewer();previewController=new AbortController();
      const preview=++previewSerial,currentPage=pageSerial,previewSignal=AbortSignal.any([signal,previewController.signal]);
      viewer.replaceChildren();viewer.hidden=false;
      const close=el('button','owner-inspect-action','Close preview');close.type='button';
      const media=el('div','owner-inspect-large','Loading private preview…');
      close.addEventListener('click',()=>{clearViewer();button.focus();});
      viewer.append(close,media,info(item));
      viewer.scrollIntoView({block:'nearest',behavior:'instant'});
      try{
        const response=await request('/api/admin/customers/inspect-media?'+new URLSearchParams({customerId:customer.id,jobId:item.jobId}),
          {method:'GET',cache:'no-store',signal:previewSignal});
        if(!response.ok)throw Error('Generated result deleted or unavailable.');
        const mime=response.headers.get('content-type')?.split(';')[0];
        if(!['image/jpeg','image/png','image/webp','video/mp4','video/webm','video/quicktime'].includes(mime))throw Error('Preview format unavailable.');
        const blob=await response.blob();
        if(!valid()||currentPage!==pageSerial||preview!==previewSerial)return;
        const url=URL.createObjectURL(blob);urls.add(url);viewerUrl=url;
        const node=el(item.mediaKind==='video'?'video':'img','owner-inspect-full');
        if(item.mediaKind==='video'){node.controls=true;node.preload='metadata';node.playsInline=true;}
        else node.alt='Generated result for '+(item.mood||item.feature||'quality review');
        node.src=url;media.replaceChildren(node);
      }catch(error){if(valid()&&currentPage===pageSerial&&preview===previewSerial)media.textContent=error.message||'Private preview unavailable.';}
    }
    async function thumbnail(item,button,currentPage){
      try{
        const response=await request('/api/admin/customers/inspect-thumbnail?'+new URLSearchParams({customerId:customer.id,jobId:item.jobId}),
          {method:'GET',cache:'no-store',signal});
        if(!response.ok||response.headers.get('content-type')!=='image/webp')throw Error();
        const blob=await response.blob();
        if(blob.size>2*1024*1024||!blob.size)throw Error();
        if(!valid()||currentPage!==pageSerial)return;
        const url=URL.createObjectURL(blob);urls.add(url);
        const img=el('img','owner-inspect-image');img.alt='Generated image preview';img.decoding='async';img.src=url;
        button.replaceChildren(img,el('span','owner-inspect-expand','Open larger preview'));
      }catch{if(valid()&&currentPage===pageSerial)button.textContent='Thumbnail unavailable · Open result';}
    }
    async function load(){
      const currentPage=++pageSerial;
      resetMedia();grid.replaceChildren();status.textContent='Loading retained generations…';previous.disabled=next.disabled=true;
      const query=new URLSearchParams({customerId:customer.id,page:String(page)});
      for(const [key,select] of Object.entries(filters))if(select.value)query.set(key,select.value);
      try{
        const data=await call('/api/admin/customers/inspect?'+query);
        if(!valid()||currentPage!==pageSerial)return;
        for(const [key,select] of Object.entries(filters)){
          const selected=select.value;
          select.replaceChildren(new Option('All '+key+'s',''));
          for(const value of data.filters?.[key]||[])select.append(new Option(value,value));
          select.value=selected;
        }
        const items=Array.isArray(data.items)?data.items:[],targets=[];
        status.textContent=data.total+' matching generation'+(data.total===1?'':'s')+'. Access is logged.';
        count.textContent='Page '+page+' of '+Math.max(1,Math.ceil(data.total/data.pageSize));
        previous.disabled=page<=1;next.disabled=!data.hasMore;
        if(!items.length)grid.append(el('p','owner-customer-empty','No retained generations match these filters. Deleted creative content cannot be recovered here.'));
        for(const item of items){
          const card=el('article','owner-inspect-card');card.dataset.jobId=item.jobId;
          const media=el(item.hasPreview?'button':'div','owner-inspect-media');
          if(item.hasPreview){
            media.type='button';media.setAttribute('aria-label','Open generated '+(item.mediaKind||'result')+' preview');
            media.addEventListener('click',()=>void open(item,media));
            media.textContent=item.mediaKind==='video'?'Open private video preview':'Loading thumbnail…';
            if(item.mediaKind==='image')targets.push({item,button:media});
          }else media.textContent=item.availability==='deleted-or-unavailable'?'Result deleted or unavailable':'No completed result · '+item.state;
          card.append(media,info(item));grid.append(card);
        }
        let cursor=0;
        const worker=async()=>{while(cursor<targets.length&&valid()&&currentPage===pageSerial){const target=targets[cursor++];await thumbnail(target.item,target.button,currentPage);}};
        await Promise.all(Array.from({length:Math.min(3,targets.length)},worker));
      }catch(error){if(valid()&&currentPage===pageSerial){status.textContent=error.message||'Quality review unavailable.';previous.disabled=page<=1;}}
    }
    void load();
  }
  return {show,clear};
}
