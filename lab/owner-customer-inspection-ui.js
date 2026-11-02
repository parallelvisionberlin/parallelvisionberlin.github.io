// Inline generation-quality review in Owner > Customer activity.
// Access is granted by the customer, checked again by the Worker for every read.
// Never render persisted customer text as HTML and never create public media URLs.
export function createOwnerCustomerInspectionUI({call,request,ownerReady,revision,formatDate}){
  let serial=0,controller=null;
  const urls=new Set();
  const elt=(tag,cls,value)=>{
    const e=document.createElement(tag);
    if(cls)e.className=cls;
    if(value!==undefined)e.textContent=String(value);
    return e;
  };
  function clear(){
    serial++;
    if(controller)controller.abort();
    controller=null;
    for(const url of urls)URL.revokeObjectURL(url);
    urls.clear();
  }
  function show(customer,root){
    clear();
    if(!ownerReady()||!customer?.reviewEnabled||!/^user_[A-Za-z0-9]+$/.test(customer.id||''))return;
    const turn=serial,session=revision();
    const abort=new AbortController();controller=abort;
    const valid=()=>serial===turn&&!abort.signal.aborted&&session===revision()&&ownerReady()&&root.isConnected;
    const section=elt('section','owner-customer-activity-section owner-inspect-section');
    const heading=elt('div','owner-customer-activity-section-head');
    heading.append(elt('h3','','Shared generation results'),
      elt('span','','Customer-enabled review'));
    section.append(heading);
    const intro=elt('p','owner-customer-activity-caption',
      'Saved outputs, stored prompts and tool settings shared for private quality review. Deleted results and uploaded sources are unavailable. Every inspection is logged.');
    section.append(intro);
    const toolbar=elt('div','owner-inspect-toolbar');
    const filter=elt('select','owner-inspect-filter');
    filter.setAttribute('aria-label','Filter shared generations by Mood');
    for(const [value,label] of [['all','All generations'],['berlin-rave','Berlin Rave'],['mood','Other Moods'],['none','Without Mood']]){
      const option=elt('option','',label);option.value=value;filter.append(option);
    }
    const count=elt('span','owner-customer-activity-caption','');
    toolbar.append(filter,count);section.append(toolbar);
    const grid=elt('div','owner-inspect-grid');section.append(grid);
    const status=elt('p','owner-customer-activity-caption','Loading saved results…');section.append(status);
    const more=elt('button','owner-inspect-load','Load more');
    more.type='button';more.hidden=true;section.append(more);
    root.append(section);
    let offset=0,hasMore=true,fetching=false,total=0;
    const cards=[];
    function applyFilter(){
      const choice=filter.value;
      let shown=0;
      for(const {node,mood} of cards){
        const match=choice==='all'||choice==='berlin-rave'&&mood==='berlin-rave'||
          choice==='mood'&&!!mood&&mood!=='berlin-rave'||choice==='none'&&!mood;
        node.hidden=!match;
        if(match)shown++;
      }
      count.textContent=shown+' visible / '+total+' loaded';
    }
    filter.addEventListener('change',applyFilter);
    async function preview(item,frame){
      try{
        const path='/api/admin/customers/inspect-thumbnail?customerId='+
          encodeURIComponent(customer.id)+'&jobId='+encodeURIComponent(item.jobId);
        const response=await request(path,{method:'GET',signal:abort.signal,cache:'no-store'});
        if(!response.ok||response.headers.get('content-type')!=='image/webp')
          throw Error('Preview unavailable');
        const blob=await response.blob();
        if(blob.type!=='image/webp'||!blob.size||blob.size>2*1024*1024)throw Error('Unexpected preview');
        if(!valid())return;
        const url=URL.createObjectURL(blob);urls.add(url);
        const img=elt('img','owner-inspect-image');
        img.src=url;img.alt='Generated result from '+formatDate(item.updatedAt);
        img.loading='lazy';img.decoding='async';
        frame.replaceChildren(img);
      }catch{
        if(valid())frame.textContent='Preview unavailable';
      }
    }
    async function loadPage(){
      if(fetching||!hasMore||!valid())return;
      fetching=true;more.disabled=true;
      status.textContent='Loading saved generations…';
      try{
        const data=await call('/api/admin/customers/inspect?customerId='+
          encodeURIComponent(customer.id)+'&offset='+offset);
        if(!valid())return;
        const items=Array.isArray(data.items)?data.items:[];
        const previews=[];
        for(const item of items){
          const settings=item.settings&&typeof item.settings==='object'?item.settings:{};
          const mood=typeof settings.moodId==='string'?settings.moodId:'';
          const card=elt('article','owner-inspect-card');
          const media=elt('div','owner-inspect-media');
          if(item.hasPreview===true){
            media.textContent='Loading preview…';
            previews.push({item,media});
          }else media.textContent=item.outputMime?.startsWith('video/')
            ?'Video result · thumbnail unavailable'
            :item.state==='completed'?'No saved output preview':'No completed output';
          const info=elt('div','owner-inspect-info');
          const type=String(settings.mode||settings.type||'Generation');
          info.append(elt('strong','',type.replaceAll('-',' ')+' · '+String(settings.engine||settings.model||'Model not recorded')));
          info.append(elt('small','',formatDate(item.createdAt)+' · '+String(item.state||'unknown')+
            (mood?' · '+mood.replaceAll('-',' '):'')));
          const details=elt('details','owner-inspect-details');
          details.append(elt('summary','','Prompt & settings'));
          const body=elt('div','owner-inspect-details-body');
          body.append(elt('span','owner-inspect-key','Stored prompt'));
          body.append(elt('p','owner-inspect-prompt',item.prompt||'No prompt saved for this generation.'));
          if(item.originalDirection&&item.originalDirection!==item.prompt){
            body.append(elt('span','owner-inspect-key','Original direction'));
            body.append(elt('p','owner-inspect-prompt',item.originalDirection));
          }
          body.append(elt('span','owner-inspect-key','Features / settings'));
          const settingText=Object.entries(settings).map(([key,value])=>key+': '+String(value)).join(' · ');
          body.append(elt('p','owner-inspect-settings',settingText||'No settings recorded.'));
          details.append(body);info.append(details);card.append(media,info);grid.append(card);
          cards.push({node:card,mood});
        }
        offset=Number(data.nextOffset)||offset+items.length;
        total+=items.length;hasMore=data.hasMore===true;
        more.hidden=!hasMore;
        status.textContent=hasMore?'More generations available.':'All retained generations loaded.';
        applyFilter();
        // At most three authenticated thumbnail requests concurrently.
        let cursor=0;
        const worker=async()=>{
          while(cursor<previews.length&&valid()){
            const target=previews[cursor++];
            await preview(target.item,target.media);
          }
        };
        await Promise.all(Array.from({length:Math.min(3,previews.length)},worker));
      }catch(error){
        if(valid())status.textContent=error?.message||'Saved results could not be loaded.';
      }finally{
        fetching=false;
        if(valid())more.disabled=false;
      }
    }
    more.addEventListener('click',()=>void loadPage());
    void loadPage();
  }
  return {show,clear};
}
