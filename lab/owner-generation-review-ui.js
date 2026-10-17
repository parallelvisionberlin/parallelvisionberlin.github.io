// PV LAB owner-only, short-lived preview UI for actively held unpaid accounts.
// No exported media URLs, original files, prompts or customer uploads.
export function createOwnerGenerationReviewUI({call,request,ownerReady,revision,formatDate}){
  const $=id=>document.getElementById(id);
  const dialog=$('owner-generation-review-dialog');
  const body=$('owner-generation-review-body');
  const status=$('owner-generation-review-status');
  const identity=$('owner-generation-review-identity');
  const closeButton=$('owner-generation-review-close');
  let currentRequest=0,activeController=null;
  const previews=new Set();
  const el=(tag,className,label)=>{
    const node=document.createElement(tag);
    if(className)node.className=className;
    if(label!==undefined)node.textContent=String(label);
    return node;
  };
  function reset(){
    currentRequest++;
    if(activeController)activeController.abort();
    activeController=null;
    for(const url of previews)URL.revokeObjectURL(url);
    previews.clear();
    body.replaceChildren();
  }
  function close(){
    if(dialog.open)dialog.close();
    else reset();
  }
  closeButton.addEventListener('click',close);
  dialog.addEventListener('close',reset);
  async function open(customer){
    if(!ownerReady()||!customer?.promoHeld||!/^user_[A-Za-z0-9]+$/.test(customer.id||''))return;
    if(dialog.open)return;
    const turn=++currentRequest,accountRevision=revision();
    const controller=new AbortController();
    activeController=controller;
    identity.textContent=customer.email||customer.id;
    body.replaceChildren();
    status.textContent='Checking the restricted review scope…';
    dialog.showModal();
    const relevant=()=>!controller.signal.aborted&&dialog.open&&
      currentRequest===turn&&accountRevision===revision()&&ownerReady();
    try{
      const data=await call('/api/admin/customers/review?customerId='+encodeURIComponent(customer.id));
      if(!relevant())return;
      const images=Array.isArray(data.images)?data.images.slice(0,36):[];
      const total=Number(data.counts?.images)||0,videos=Number(data.counts?.videos)||0;
      status.textContent=total+' completed generated image'+(total===1?'':'s')+
        (videos?' · '+videos+' completed video'+(videos===1?'':'s')+' not previewed':'')+
        '. Thumbnails only. Review access is logged.';
      if(!images.length){
        body.append(el('p','owner-generation-review-empty',
          'No completed generated image outputs are available for this account. Deleted media cannot be recovered here.'));
        return;
      }
      const grid=el('div','owner-generation-review-grid');
      const targets=[];
      for(const item of images){
        if(typeof item.jobId!=='string'||!item.jobId.match(/^[A-Za-z0-9_-]{8,120}$/))continue;
        const card=el('figure','owner-generation-review-card');
        const viewport=el('div','owner-generation-review-image-wrap');
        const placeholder=el('span','owner-generation-review-placeholder','Loading preview…');
        viewport.append(placeholder);
        const caption=el('figcaption','owner-generation-review-caption',
          formatDate(item.finishedAt));
        card.append(viewport,caption);grid.append(card);
        targets.push({jobId:item.jobId,viewport,placeholder,caption});
      }
      body.append(grid);
      // Bound network activity. Every read is separately owner-authenticated and
      // independently logged by the Worker; there are never open image URLs.
      let cursor=0;
      const load=async()=>{
        while(cursor<targets.length&&relevant()){
          const target=targets[cursor++];
          try{
            const path='/api/admin/customers/review-thumbnail?customerId='+
              encodeURIComponent(customer.id)+'&jobId='+encodeURIComponent(target.jobId);
            const response=await request(path,{method:'GET',cache:'no-store',signal:controller.signal});
            if(!response.ok||response.headers.get('content-type')!=='image/webp')
              throw Error('No preview');
            const blob=await response.blob();
            if(blob.type!=='image/webp'||blob.size>2*1024*1024||!blob.size)
              throw Error('Unexpected thumbnail');
            if(!relevant())return;
            const url=URL.createObjectURL(blob);
            previews.add(url);
            const img=el('img','owner-generation-review-image');
            img.alt='Completed generated image preview, '+target.caption.textContent;
            img.loading='lazy';
            img.decoding='async';
            img.src=url;
            target.viewport.replaceChildren(img);
          }catch{
            if(relevant())target.placeholder.textContent='Preview unavailable';
          }
        }
      };
      await Promise.all(Array.from({length:Math.min(3,targets.length)},()=>load()));
    }catch(error){
      if(!relevant())return;
      status.textContent='Review unavailable';
      body.replaceChildren(el('p','owner-generation-review-empty',
        error?.message||'The restricted review could not be loaded.'));
    }
  }
  return {open,close};
}
