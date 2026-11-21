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
      select.append(new Option('All '+(key==='status'?'statuses':label.toLowerCase()+'s'),''));
      select.addEventListener('change',()=>{page=1;void load();});
      filters[key]=select;wrap.append(select);toolbar.append(wrap);
    }
    const status=el('p','owner-inspect-status','Loading retained generations…');status.setAttribute('role','status');
    const viewer=el('div','owner-inspect-viewer');viewer.hidden=true;
    viewer.setAttribute('role','dialog');viewer.setAttribute('aria-label','Generation details');
    viewer.addEventListener('keydown',event=>{
      if(event.key==='Escape'&&!viewer.hidden){event.stopPropagation();const close=viewer.querySelector('.owner-inspect-close');close?.click();}
    });
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
    const readableKey={resolution:'Resolution',aspectRatio:'Aspect ratio',referenceMode:'Reference mode',outputFormat:'Output format',duration:'Duration',audio:'Audio',quality:'Quality',processing:'Processing',seed:'Seed',strength:'Strength',identityStrength:'Identity strength',generationMode:'Generation mode',count:'Image count',batchCount:'Batch count'};
    const formatValue=value=>typeof value==='boolean'?(value?'On':'Off'):String(value);
    const costValue=item=>item.costKind==='settled'?money(item.providerCostUsd):
      item.costKind==='unconfirmed'?'Unconfirmed':money(item.estimatedCostUsd)+' estimated';
    function labeledCard(title,tag,content,note){
      const card=el('section','owner-inspect-detail-card');
      const head=el('div','owner-inspect-detail-card-head');
      head.append(el('h4','',title),el('span','owner-inspect-source-tag',tag));
      card.append(head,content);
      if(note)card.append(el('p','owner-inspect-detail-note',note));
      return card;
    }
    function compactInfo(item){
      const body=el('div','owner-inspect-info');
      body.append(el('strong','',item.feature||'Generation'));
      body.append(el('small','',[item.state,formatDate(item.createdAt)].filter(Boolean).join(' · ')));
      body.append(el('p','owner-inspect-model',(item.model||'Model not recorded')+' · '+(item.provider||'Provider not recorded')));
      const prompt=item.originalDirection||item.storedPrompt||item.prompt||'No prompt recorded.';
      body.append(el('p','owner-inspect-card-excerpt',prompt.length>145?prompt.slice(0,145).trimEnd()+'…':prompt));
      const settings=item.settings||{},referenceCount=Number(settings.referencesCount)||0,charged=Number(item.chargedCredits)||0,refunded=Number(item.refundedCredits)||0;
      body.append(el('p','owner-inspect-card-foot',
        referenceCount+' image reference'+(referenceCount===1?'':'s')+' · '+
        (item.mood||settings.moodId||'No Mood recorded')+' · '+(charged-refunded)+' net credits'));
      body.append(el('small','owner-inspect-card-cost',
        'Provider cost ('+(item.costKind==='settled'?'settled':item.costKind==='unconfirmed'?'unconfirmed':'estimated')+'): '+costValue(item)));
      const action=el('button','owner-inspect-detail-open','View generation details');action.type='button';
      action.addEventListener('click',()=>void open(item,action));
      body.append(action);
      return body;
    }
    function appendRow(parent,label,value){
      const row=el('div','owner-inspect-setting-row');
      row.append(el('dt','',label),el('dd','',formatValue(value)));
      parent.append(row);
    }
    function detail(item,media,close){
      const panel=el('div','owner-inspect-panel');
      const top=el('header','owner-inspect-panel-head');
      const heading=el('div','');
      heading.append(el('span','owner-inspect-eyebrow','PRIVATE GENERATION REVIEW'));
      const title=el('div','owner-inspect-title-line');
      title.append(el('h3','',item.feature||'Generation'),el('span','owner-inspect-state',item.state||'Unrecorded'));
      heading.append(title,el('p','owner-inspect-panel-meta',
        'Completed / updated: '+formatDate(item.updatedAt||item.createdAt)+' · '+(item.model||'Model not recorded')+' · '+(item.provider||'Provider not recorded')));
      top.append(heading,close);panel.append(top);
      const columns=el('div','owner-inspect-panel-columns');
      const side=el('div','owner-inspect-detail-side');
      side.append(media);
      const settings=item.settings||{};
      const settingsCard=el('section','owner-inspect-side-card');
      settingsCard.append(el('h4','','Settings'));
      const list=el('dl','owner-inspect-settings-list');
      for(const key of ['resolution','aspectRatio','referenceMode','outputFormat','duration','audio','quality','processing','seed','strength','identityStrength','generationMode','count','batchCount']){
        if(settings[key]!==undefined&&settings[key]!==null&&settings[key]!=='')appendRow(list,readableKey[key],settings[key]);
      }
      if(!list.childElementCount)appendRow(list,'Settings','Not recorded');
      settingsCard.append(list);side.append(settingsCard);
      const finance=el('section','owner-inspect-side-card');
      finance.append(el('h4','','Credits & cost'));
      const stats=el('div','owner-inspect-credit-grid'),charged=Number(item.chargedCredits)||0,refunded=Number(item.refundedCredits)||0;
      for(const [value,label] of [[charged,'Charged'],[refunded,'Refunded'],[charged-refunded,'Net credits'],[costValue(item),'Provider cost']]){
        const stat=el('div','owner-inspect-credit-stat');
        stat.append(el('strong','',value),el('span','',label));stats.append(stat);
      }
      finance.append(stats);side.append(finance);
      const main=el('div','owner-inspect-detail-main');
      const userPrompt=item.originalDirection||item.storedPrompt||'';
      const userSource=item.originalDirection?'RECORDED ORIGINAL':'STORED JOB';
      const userCardBody=el('p','owner-inspect-detail-prompt',userPrompt||'No direction was recorded.');
      main.append(labeledCard(item.originalDirection?'Original customer direction':'Stored job prompt',
        userSource,userCardBody,
        item.originalDirection?'Original direction retained with the Mood metadata.':
          'The exact untouched customer input was not separately retained. This job prompt may include composition instructions.'));
      const providerSaved=item.promptSource==='saved-provider-request',providerPrompt=item.prompt||'';
      const enhanceBody=el('div','owner-inspect-enhancement-body');
      const base=item.storedPrompt||item.originalDirection||'',index=providerSaved&&base?providerPrompt.indexOf(base):-1;
      const before=index>=0?providerPrompt.slice(0,index).trim():'';
      const after=index>=0?providerPrompt.slice(index+base.length).trim():'';
      if(providerSaved&&index>=0&&(before||after)){
        enhanceBody.append(el('p','owner-inspect-enhancement-summary','The saved provider request contains additional instructions around the stored job prompt.'));
        for(const [label,value] of [['Before the job prompt',before],['After the job prompt',after]]){
          if(!value)continue;
          const itemRow=el('div','owner-inspect-enhancement-excerpt');
          itemRow.append(el('strong','',label),el('p','',value.length>310?value.slice(0,310).trimEnd()+'…':value));
          enhanceBody.append(itemRow);
        }
      }else{
        enhanceBody.append(el('p','owner-inspect-enhancement-summary',
          providerSaved?'A provider request was saved, but its differences cannot be isolated reliably from the stored job prompt.':
            'The exact final submitted provider prompt was not retained for this job.'));
      }
      if(providerSaved){
        const raw=el('details','owner-inspect-raw-request'),summary=el('summary','','View exact saved provider prompt');
        raw.append(summary,el('pre','',providerPrompt));enhanceBody.append(raw);
      }
      if(item.storedPrompt&&item.originalDirection&&item.storedPrompt!==item.originalDirection){
        const composed=el('details','owner-inspect-raw-request');
        composed.append(el('summary','','View composed job prompt'),el('pre','',item.storedPrompt));
        enhanceBody.append(composed);
      }
      main.append(labeledCard('PV LAB / provider composition',providerSaved?'SAVED PROVIDER REQUEST':'NOT RETAINED',
        enhanceBody,'Only verifiable differences are shown. Provider transformations are not inferred when no exact comparison exists.'));
      const mood=el('section','owner-inspect-single-line');
      mood.append(el('h4','','Mood'),el('strong','',item.mood||settings.moodId||'None recorded'));
      if(settings.moodIntensity!==undefined)mood.append(el('span','',formatValue(settings.moodIntensity)+'% intensity'));
      main.append(mood);
      const references=el('section','owner-inspect-reference-card');
      const refCount=Number(settings.referencesCount)||0,vidCount=Number(settings.videoReferencesCount)||0,audioCount=Number(settings.audioReferencesCount)||0;
      const referenceHeader=el('div','owner-inspect-reference-head');
      referenceHeader.append(el('h4','','References'),el('strong','',
        refCount+' image'+(refCount===1?'':'s')+
        (vidCount?' · '+vidCount+' video'+(vidCount===1?'':'s'):'')+
        (audioCount?' · '+audioCount+' audio':'') ));
      references.append(referenceHeader);
      if(refCount){
        const tiles=el('div','owner-inspect-reference-tiles');
        for(let i=0;i<Math.min(refCount,20);i++){
          const tile=el('div','owner-inspect-reference-tile');
          tile.append(el('strong','',String(i+1).padStart(2,'0')),el('span','','Private input'));
          tiles.append(tile);
        }
        references.append(tiles);
      }else references.append(el('p','owner-inspect-detail-note','No image references recorded.'));
      references.append(el('p','owner-inspect-detail-note','Input uploads remain private. The review shows their recorded count, not their photographs or unverified roles.'));
      main.append(references);
      main.append(el('p','owner-inspect-job-id','Job ID: '+item.jobId+' · Created '+formatDate(item.createdAt)));
      columns.append(side,main);panel.append(columns);
      return panel;
    }
    function resetMedia(){
      clearViewer();
      for(const url of urls)URL.revokeObjectURL(url);urls.clear();
    }
    async function open(item,button){
      clearViewer();previewController=new AbortController();
      const preview=++previewSerial,currentPage=pageSerial,previewSignal=AbortSignal.any([signal,previewController.signal]);
      viewer.replaceChildren();viewer.hidden=false;
      const close=el('button','owner-inspect-close','Close preview');close.type='button';
      const media=el('div','owner-inspect-large',item.hasPreview?'Loading private preview…':'Result unavailable for preview');
      close.addEventListener('click',()=>{clearViewer();button.focus();});
      viewer.append(detail(item,media,close));
      close.focus();
      if(!item.hasPreview)return;
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
          select.replaceChildren(new Option('All '+(key==='status'?'statuses':key+'s'),''));
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
          card.append(media,compactInfo(item));grid.append(card);
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
