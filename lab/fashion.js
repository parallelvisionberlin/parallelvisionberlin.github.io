import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {loadLabAccount} from './native-account.js?v=20261014-custom-domain1&studioAuth=20261015-1';
export function createFashionStudio(root=document,{sessionClient=null,onNavigate=null,publicPreview=()=>false}={}){
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const $=id=>root.getElementById(id);
const modes={
  fashn16:{description:'An alternative for straightforward garment transfer.',note:'Estimated cost: $0.075 per image. Review the quote before generating.',provider:'fal'},
  fashnmax:{description:'High-detail garment transfer using your FASHN API credits.',note:'Balanced 1K estimates 2 FASHN credits ($0.15). Review the quote before generating.',provider:'fashn'},
  fluxvto:{description:'Prompt-directed styling for layering, fit and the way clothing is worn.',note:'Pricing varies with image size. Person image maximum 2 MP; garment maximum 1 MP.',provider:'fal'}
};
let clerk=null,authenticated=false,isCustomer=false,sessionId='',models=[],busy=false,quote=null,pollTimeout=null,activeJobId='',resultUrl='',signingIn=false;
let preparing=false,quoteTimer=null,quoteExpiryTimer=null;
let fileKeys=new Map(),previews=new Map(),revision=0,authVersion=0;
let galleryCursor=null,galleryItems=[],galleryLoading=false,galleryRevision=0,selectedGalleryJob='';
const galleryPreviews=new Map(),galleryCards=new Map();
const GALLERY_PAGE_SIZE=12;
/* Looks guide garment fit only. Keep the user's optional directions independent. */
const lookDirections=Object.freeze({
  runway:'Fit the supplied garment naturally with clean lines and a polished fashion presentation. Preserve the original person, pose, garment design and setting.',
  editorial:'Prioritize precise garment placement, realistic folds and refined fabric detail. Keep the original person, garment and background unchanged.',
  street:'Use a relaxed, naturally worn fit with believable fabric drape. Preserve the original person, garment design and setting.',
  avantgarde:'Respect the garment’s distinctive shape and construction, with believable folds and proportions. Preserve the person and original background.',
  minimal:'Keep the garment fit simple and clean, with accurate seams and material texture. Preserve the source person and setting.',
  techwear:'Respect technical garment details, fastenings, seams and functional layering with a realistic fit. Preserve the source person and setting.',
  tailoring:'Prioritize accurate tailoring, seams, lapels, folds and a natural fit while preserving the uploaded garment design and original person.',
  conceptual:'Preserve unusual garment construction and distinctive details with physically believable fit. Keep the source person and setting unchanged.'
});
let activeLook='';
function finalDirection(){
  const manual=$('direction').value.trim();
  const look=current()==='fashn16'?'':(lookDirections[activeLook]||'');
  return [look,manual].filter(Boolean).join('\n');
}
function syncLooks(){
  const strip=$('looks-scroller');if(!strip)return;
  const supported=current()!=='fashn16';
  for(const card of strip.querySelectorAll('[data-look]')){
    card.disabled=!supported;
    card.setAttribute('aria-pressed',String(supported&&activeLook===card.dataset.look));
  }
  const note=$('looks-support');
  note.textContent=supported?'':'Styling prompt unavailable with v1.6';
}

const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
function status(message,error=false){$('status').textContent=message||'';$('status').classList.toggle('error',error);}
function revokeResult(){if(resultUrl)URL.revokeObjectURL(resultUrl);resultUrl='';$('result-image').hidden=true;$('result-image').removeAttribute('src');$('result-placeholder').hidden=false;$('download').hidden=true;}
function clearQuote(){quote=null;clearTimeout(quoteTimer);clearTimeout(quoteExpiryTimer);}
function readyToQuote(){return authenticated&&!!$('person-file').files.length&&!!$('garment-file').files.length&&models.some(x=>x.id===current()&&x.available)&&(current()!=='fluxvto'||!!finalDirection())&&finalDirection().length<=1200;}
function scheduleQuote(){
  clearTimeout(quoteTimer);
  if(!busy&&readyToQuote())quoteTimer=setTimeout(()=>void prepareQuote(),400);
}
function change(){revision++;clearQuote();update();scheduleQuote();}
async function api(path,{method='GET',body,headers={}}={}){
  const version=authVersion;
  const init={method,headers:{...headers}};
  if(body!==undefined){
    if(body instanceof File || body instanceof Blob){init.body=body;}
    else{init.headers['Content-Type']='application/json';init.body=JSON.stringify(body);}
  }
  const res=await request(path,init);
  let payload;try{payload=await res.json();}catch{payload={};}
  if(version!==authVersion)throw new Error('Session changed.');
  if(!res.ok)throw new Error(payload.error||('The Lab returned HTTP '+res.status));
  return payload;
}
async function assetBlob(id){
  const res=await request('/api/assets/'+encodeURIComponent(id));
  if(!res.ok)throw new Error((await res.json().catch(()=>({}))).error||'Could not open your private image.');
  return res.blob();
}
function current(){return $('model-select').value;}
function update(){
  const selected=current(),d=modes[selected],providerModel=models.find(x=>x.id===selected);
  $('fashn16-options').hidden=selected!=='fashn16';
  $('fashnmax-options').hidden=selected!=='fashnmax';
  $('model-description').textContent=d.description;
  $('model-note').textContent=(authenticated&&!isCustomer?d.note:'Review the credit cost before generating.')+(providerModel&&!providerModel.available?' This model is not connected yet.':'');
  $('direction-required').textContent=selected==='fluxvto'?'REQUIRED':'OPTIONAL';
  $('direction').placeholder=selected==='fluxvto'?'Describe how the garment should be worn…':'Keep the silhouette. Open the jacket, soften the folds…';
  syncLooks();
  $('quote').disabled=!publicPreview()&&(busy||preparing||!readyToQuote());
  const title=busy?'Generating…':quote?'Generate · '+quote.creditCost.toLocaleString()+' credits':'Generate';
  if($('quote').dataset.caption!==title){
    $('quote').dataset.caption=title;
    const arrow=document.createElement('span');arrow.setAttribute('aria-hidden','true');
    $('quote').replaceChildren(document.createTextNode(title),arrow);
  }
  const person=!!$('person-file').files.length,garment=!!$('garment-file').files.length;
  $('action-hint').textContent=!person||!garment?'Add a person and garment.':!providerModel?.available?'This model is not connected. Select another available engine.':selected==='fluxvto'&&!finalDirection()?'Add a styling direction for FLUX.':finalDirection().length>1200?'Shorten your styling direction to 1,200 characters.':'';
  $('action-hint').hidden=!$('action-hint').textContent;
}
function choosePhoto(id,slot,img,hint){
  const input=$(id),container=$(slot),preview=$(img),invitation=$(hint);
  // Pointer-local halo only, no change to the real file input or drop events.
  container.addEventListener('pointermove',e=>{
    if(e.pointerType==='touch')return;
    const b=container.getBoundingClientRect();
    container.style.setProperty('--drop-x',(e.clientX-b.left)+'px');
    container.style.setProperty('--drop-y',(e.clientY-b.top)+'px');
  });
  container.addEventListener('pointerleave',()=>{
    container.style.removeProperty('--drop-x');container.style.removeProperty('--drop-y');
  });
  input.addEventListener('change',()=>{
    const file=input.files?.[0];if(!file)return;
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024){
      input.value='';status('Choose a JPG, PNG or WebP image up to 20 MiB.',true);change();return;
    }
    const old=previews.get(id);if(old)URL.revokeObjectURL(old);
    const src=URL.createObjectURL(file);previews.set(id,src);preview.src=src;preview.hidden=false;invitation.hidden=true;
    fileKeys.delete(id);status('');change();
  });
  for(const event of ['dragenter','dragover'])container.addEventListener(event,e=>{e.preventDefault();container.classList.add('drag-over');});
  container.addEventListener('dragleave',e=>{if(!container.contains(e.relatedTarget))container.classList.remove('drag-over');});
  container.addEventListener('drop',e=>{
    e.preventDefault();container.classList.remove('drag-over');
    const file=e.dataTransfer?.files?.[0];if(!file)return;
    try{
      const transfer=new DataTransfer();transfer.items.add(file);input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    }catch{status('Could not load the dropped photograph. Click the tile to browse instead.',true);}
  });
}
choosePhoto('person-file','person-slot','person-preview','person-hint');
choosePhoto('garment-file','garment-slot','garment-preview','garment-hint');
// Wardrobe uses the existing private Elements/Outfits packs, not a second collection.
const wDialog=$('fashion-wardrobe'),wOpen=$('fashion-wardrobe-open'),wItems=$('fashion-wardrobe-items'),
  wSearch=$('fashion-wardrobe-search'),wBack=$('fashion-wardrobe-back'),
  wSelected=$('fashion-wardrobe-selected'),wFooter=wDialog.querySelector('.wardrobe-footer');
const wFooterDefault=wFooter.textContent,wThumbs=new Map();
let wPacks=[],wPack=null,wTab='collections',wCreating=false,wSaving=false,wTotalPacks=0,wDraftUrl='',wSequence=0,wChoosing=false;
const wName=p=>String(p.name||'').split('|').slice(2).join('|')||'Untitled outfit';
function wClearThumbs(){for(const url of wThumbs.values())URL.revokeObjectURL(url);wThumbs.clear();}
function wClearDraft(){if(wDraftUrl)URL.revokeObjectURL(wDraftUrl);wDraftUrl='';}
function wClose(){
  wSequence++;wPacks=[];wPack=null;wCreating=false;wChoosing=false;wClearDraft();wClearThumbs();
  if(wDialog.open)wDialog.close();
}
function wMessage(title,copy,kind='notice'){
  const box=document.createElement('div');box.className=kind==='empty'?'wardrobe-empty wardrobe-empty-hero':'wardrobe-empty';
  if(kind==='empty'){
    const eyebrow=document.createElement('span');eyebrow.className='wardrobe-empty-eyebrow';eyebrow.textContent='YOUR PRIVATE ARCHIVE / 000 OUTFITS';
    const heading=document.createElement('h3');heading.textContent='Every collection begins with one piece.';
    const paragraph=document.createElement('p');paragraph.textContent='Save the looks that define your visual world. Return to them in any new editorial.';
    const link=document.createElement('button');link.type='button';link.className='wardrobe-empty-action';link.textContent='Add your first outfit';link.addEventListener('click',wStartCreate);
    const note=document.createElement('small');note.textContent='Already have a garment photo? You can drop it directly into Replace Outfit.';
    box.append(eyebrow,heading,paragraph,link,note);
  }else{
    const strong=document.createElement('strong');strong.textContent=title;box.append(strong);
    if(copy){const p=document.createElement('p');p.textContent=copy;box.append(p)}
  }
  wItems.replaceChildren(box);
}
async function wThumb(ref,frame,version){
  try{
    let url=wThumbs.get(ref.id);
    if(!url){
      const res=await request('/api/assets/'+encodeURIComponent(ref.id)+'/thumbnail');
      if(!res.ok)throw Error('Unavailable image');
      const blob=await res.blob();
      if(!blob.type.startsWith('image/'))throw Error('Invalid image');
      if(version!==wSequence||!wDialog.open)return;
      url=URL.createObjectURL(blob);wThumbs.set(ref.id,url);
    }
    if(version!==wSequence||!wDialog.open||!frame.isConnected)return;
    const img=document.createElement('img');img.alt='';img.loading='lazy';img.src=url;
    frame.replaceChildren(img);
  }catch{/* Missing preview does not block using an Outfit. */}
}
function wStartCreate(){
  if(wChoosing||wSaving||wCreating)return;
  wPack=null;wCreating=true;wClearDraft();wRender();
}
function wRenderCreate(){
  wBack.hidden=false;
  $('fashion-wardrobe-tabs').hidden=true;
  wSearch.parentElement.hidden=true;
  wItems.classList.remove('is-detail','is-photographs');
  wItems.classList.add('is-create');
  wItems.setAttribute('aria-label','Save a new outfit');
  wFooter.classList.remove('is-error');wFooter.textContent='PRIVATE ARCHIVE / Saved with Elements · No generation or credit charge';
  wItems.innerHTML=`
    <form class="wardrobe-create-form" id="wardrobe-create-form" novalidate>
     <label class="wardrobe-upload-zone">
      <input id="wardrobe-new-file" type="file" accept="image/jpeg,image/png,image/webp" aria-label="Choose garment photograph" required>
      <img id="wardrobe-new-preview" alt="New garment photograph preview" hidden>
      <span class="wardrobe-upload-invite" id="wardrobe-new-invite"><span class="wardrobe-upload-plus">+</span><strong>Add garment photograph</strong><small>JPG / PNG / WebP · up to 20 MB</small></span>
     </label>
     <div class="wardrobe-create-fields">
      <span class="wardrobe-form-eyebrow">NEW OUTFIT / PERSONAL ARCHIVE</span>
      <h3>Add an outfit.</h3>
      <p>Save a garment reference to your private Wardrobe. Choose it again from Replace Outfit, any time.</p>
      <label class="wardrobe-field-label" for="wardrobe-new-name">Outfit name</label>
      <input id="wardrobe-new-name" type="text" maxlength="76" placeholder="e.g. Black leather jacket" required>
      <label class="wardrobe-field-label" for="wardrobe-new-note">Reference notes <span>(optional)</span></label>
      <textarea id="wardrobe-new-note" rows="3" maxlength="120" placeholder="Fabric, silhouette, fit or distinctive details"></textarea>
      <p id="wardrobe-new-status" class="wardrobe-new-status" role="status" aria-live="polite"></p>
      <div class="wardrobe-form-actions"><button type="button" id="wardrobe-new-cancel">Cancel</button><button type="submit" id="wardrobe-new-submit">Save to Wardrobe</button></div>
     </div>
    </form>`;
  const input=$('wardrobe-new-file'),preview=$('wardrobe-new-preview'),invite=$('wardrobe-new-invite');
  input.addEventListener('change',()=>{
    wClearDraft();const file=input.files?.[0];
    if(!file){preview.hidden=true;preview.removeAttribute('src');invite.hidden=false;return}
    if(!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024){
      $('wardrobe-new-status').textContent='Choose a JPG, PNG or WebP photograph up to 20 MB.';
      input.value='';preview.hidden=true;preview.removeAttribute('src');invite.hidden=false;return;
    }
    $('wardrobe-new-status').textContent='';
    wDraftUrl=URL.createObjectURL(file);preview.src=wDraftUrl;preview.hidden=false;invite.hidden=true;
  });
  $('wardrobe-create-form').addEventListener('submit',event=>{event.preventDefault();void wSaveOutfit()});
  $('wardrobe-new-cancel').addEventListener('click',()=>{if(wSaving)return;wCreating=false;wClearDraft();wRender()});
  const currentGarment=$('garment-file').files?.[0];
  if(currentGarment&&['image/jpeg','image/png','image/webp'].includes(currentGarment.type)){
    const prompt=document.createElement('button');prompt.type='button';prompt.className='wardrobe-current-file';
    prompt.textContent='Use garment already in Replace Outfit';
    prompt.addEventListener('click',()=>{
      const transfer=new DataTransfer();transfer.items.add(currentGarment);input.files=transfer.files;
      input.dispatchEvent(new Event('change',{bubbles:true}));
    });
    $('wardrobe-create-form').querySelector('.wardrobe-create-fields > p')?.after(prompt);
  }
  $('wardrobe-new-name').focus();
}
async function wSaveOutfit(){
  if(wSaving||!authenticated||!wCreating)return;
  const input=$('wardrobe-new-file'),file=input.files?.[0];
  const title=$('wardrobe-new-name').value.replace(/[<>|\u0000-\u001f]/g,' ').replace(/\s+/g,' ').trim().slice(0,76);
  const note=$('wardrobe-new-note').value.trim().slice(0,120),feedback=$('wardrobe-new-status');
  if(!title){feedback.textContent='Name your outfit before saving.';return}
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type)||!file.size||file.size>20*1024*1024){
    feedback.textContent='Choose a JPG, PNG or WebP garment photograph up to 20 MB.';return;
  }
  if(wTotalPacks>=40){feedback.textContent='Your Elements library has reached its 40-item limit.';return}
  if(wPacks.some(p=>wName(p).toLowerCase()===title.toLowerCase())){feedback.textContent='An Outfit with that name already exists. Choose another name.';return}
  const version=wSequence,auth=authVersion,submit=$('wardrobe-new-submit');
  let packSaved=false;
  wSaving=true;submit.disabled=true;feedback.textContent='Saving your outfit privately…';
  try{
    const old=$('garment-file').files?.[0],cached=old===file?fileKeys.get('garment-file'):null;
    let assetId=cached?.file===file?cached.assetId:null;
    if(!assetId){
      const result=await api('/api/uploads',{method:'POST',body:file,headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name)}});
      assetId=result.id;
    }
    if(!assetId)throw Error('The private photograph upload was not confirmed.');
    if(version!==wSequence||auth!==authVersion||!wDialog.open)return;
    await api('/api/packs',{method:'POST',body:{
      name:'PVSCENE1|outfits|'+title,engine:'seedance',referenceSourceIds:[assetId],
      referenceRoles:[{name:file.name.slice(0,80),role:'outfit',target:'full',
        note:('Outfit @'+title+': transfer this clothing, not the model or setting.'+(note?' '+note:'')).slice(0,300)}]
    }});
    packSaved=true;
    if(version!==wSequence||auth!==authVersion||!wDialog.open)return;
    const refreshed=await api('/api/packs');
    if(version!==wSequence||auth!==authVersion||!wDialog.open)return;
    wTotalPacks=(refreshed.packs||[]).length;
    wPacks=(refreshed.packs||[]).filter(p=>typeof p.name==='string'&&
      p.name.startsWith('PVSCENE1|outfits|')&&Array.isArray(p.refs)&&p.refs.some(r=>typeof r?.id==='string'&&r.id));
    wPacks.sort((a,b)=>wName(a).localeCompare(wName(b)));
    wPack=wPacks.find(p=>wName(p)===title)||null;
    wCreating=false;wClearDraft();wRender();
    wFooter.textContent=title+' saved privately. Choose a photograph to use it in Replace Outfit.';
  }catch(e){
    if(version===wSequence&&auth===authVersion&&wDialog.open&&wCreating){
      if(packSaved){
        wCreating=false;wClearDraft();wRender();
        wMessage('Outfit saved','The archive did not refresh. Close and reopen the Wardrobe to load your saved piece. Do not save it again.');
        wFooter.textContent=title+' was saved privately. Refresh the archive before using it.';
      }else feedback.textContent=(e.message||'The save could not be confirmed.')+' Check saved Outfits before trying again.';
    }
  }finally{
    wSaving=false;
    if(submit.isConnected)submit.disabled=false;
  }
}
function wRender(){
  if(wCreating){wRenderCreate();return}
  wItems.classList.remove('is-create');
  const version=wSequence,detail=!!wPack;
  wBack.hidden=!detail;
  $('fashion-wardrobe-tabs').hidden=detail;
  wSearch.parentElement.hidden=detail;
  wItems.classList.toggle('is-detail',detail);
  wItems.classList.toggle('is-photographs',!detail&&wTab==='photos');
  wItems.setAttribute('aria-label',detail?'Saved outfit photographs':wTab==='photos'?'All saved outfit photographs':'Saved outfit collections');
  for(const tab of wDialog.querySelectorAll('[data-wardrobe-tab]')){
    const selected=!detail&&tab.dataset.wardrobeTab===wTab;
    tab.classList.toggle('is-active',selected);
    tab.setAttribute('aria-selected',String(selected));
    tab.tabIndex=selected?0:-1;
  }
  wFooter.classList.remove('is-error');wFooter.textContent=wFooterDefault;
  wItems.replaceChildren();
  const query=wSearch.value.trim().toLowerCase();
  const packs=detail?[wPack]:wPacks.filter(p=>wName(p).toLowerCase().includes(query));
  if(!packs.length){
    if(!wPacks.length)wMessage('Your Wardrobe is empty','', 'empty');
    else wMessage('No matching outfits','Try a different search to find a saved look.');
    return;
  }
  if(detail){
    const intro=document.createElement('div');intro.className='wardrobe-detail-intro';
    const label=document.createElement('span');label.textContent='SAVED OUTFIT / '+String(wPack.refs.length).padStart(2,'0')+' PHOTOGRAPHS';
    const title=document.createElement('h3');title.textContent=wName(wPack);
    const hint=document.createElement('p');hint.textContent='Choose the photograph to use as your garment reference.';
    intro.append(label,title,hint);wItems.append(intro);
  }
  const makeCard=(pack,ref,index,collection=false)=>{
    const button=document.createElement('button');button.type='button';
    button.className='wardrobe-item '+(collection?'wardrobe-collection':'wardrobe-view');
    button.setAttribute('aria-label',collection?'Open saved outfit '+wName(pack):'Use '+wName(pack)+' photograph '+(index+1));
    const frame=document.createElement('span');frame.className='wardrobe-item-photo';frame.textContent='PV LAB';
    const info=document.createElement('span');info.className='wardrobe-item-info';
    const title=document.createElement('strong');title.textContent=wName(pack);
    const caption=document.createElement('small');
    caption.textContent=collection?pack.refs.length+' photograph'+(pack.refs.length===1?'':'s'):'Photograph '+String(index+1).padStart(2,'0');
    info.append(title,caption);button.append(frame,info);wItems.append(button);
    void wThumb(ref,frame,version);
    button.addEventListener('click',()=>{
      if(wChoosing)return;
      if(collection){wPack=pack;wRender();return}
      void wSelect(pack,ref,button,caption);
    });
  };
  if(detail){
    for(const [index,ref] of wPack.refs.filter(ref=>typeof ref?.id==='string'&&ref.id).entries())makeCard(wPack,ref,index);
  }else if(wTab==='photos'){
    for(const pack of packs){
      for(const [index,ref] of pack.refs.filter(ref=>typeof ref?.id==='string'&&ref.id).entries())makeCard(pack,ref,index);
    }
  }else{
    for(const pack of packs){
      const cover=pack.refs.find(ref=>typeof ref?.id==='string'&&ref.id);
      if(cover)makeCard(pack,cover,0,true);
    }
    if(!query){
      const add=document.createElement('button');add.type='button';add.className='wardrobe-add-card';
      const plus=document.createElement('span');plus.className='wardrobe-add-symbol';plus.textContent='+';
      const name=document.createElement('strong');name.textContent='Add another outfit';
      const caption=document.createElement('small');caption.textContent='Save a new look to your archive';
      add.append(plus,name,caption);add.addEventListener('click',wStartCreate);wItems.append(add);
    }
  }
}
async function wSelect(pack,ref,button,caption){
  if(wChoosing||!authenticated)return;
  wChoosing=true;button.disabled=true;
  const oldCaption=caption.textContent;caption.textContent='Opening…';
  const version=wSequence,auth=authVersion;
  try{
    const blob=await assetBlob(ref.id);
    if(version!==wSequence||auth!==authVersion||!authenticated||!wDialog.open)return;
    const type=String(blob.type||'').split(';')[0].toLowerCase();
    if(!['image/jpeg','image/png','image/webp'].includes(type))throw Error('This Outfit must be a JPG, PNG or WebP photograph.');
    if(!blob.size||blob.size>20*1024*1024)throw Error('This saved photo exceeds the 20 MB Fashion limit. Upload a smaller copy.');
    const suffix=type==='image/jpeg'?'jpg':type==='image/png'?'png':'webp';
    const name=wName(pack).replace(/[^a-z0-9_-]+/gi,'-').slice(0,55)||'outfit';
    const file=new File([blob],name+'.'+suffix,{type}),transfer=new DataTransfer();
    transfer.items.add(file);
    const input=$('garment-file');input.files=transfer.files;
    input.dispatchEvent(new Event('change',{bubbles:true}));
    // Reuse the user's existing private asset rather than creating a duplicate upload.
    fileKeys.set('garment-file',{file,assetId:ref.id});
    wSelected.textContent='WARDROBE / '+wName(pack);wSelected.hidden=false;
    wClose();
  }catch(e){
    if(version===wSequence&&auth===authVersion&&wDialog.open){
      wFooter.textContent=e.message||'Could not open Outfit image.';wFooter.classList.add('is-error');
    }
  }finally{
    wChoosing=false;
    if(button.isConnected){button.disabled=false;caption.textContent=oldCaption}
  }
}
wOpen.addEventListener('click',async()=>{
  if(!authenticated){clerk?.openSignIn();return}
  if(busy||preparing){status('Finish the current Fashion operation first.',true);return}
  if(wDialog.open)return;
  wPacks=[];wPack=null;wTab='collections';wCreating=false;wSearch.value='';wClearDraft();wClearThumbs();
  const version=++wSequence,auth=authVersion;
  wDialog.showModal();wMessage('Opening Wardrobe','Loading your saved Outfits from Elements…');
  wFooter.textContent=wFooterDefault;wFooter.classList.remove('is-error');
  try{
    const response=await api('/api/packs');
    if(version!==wSequence||auth!==authVersion||!wDialog.open)return;
    wTotalPacks=(response.packs||[]).length;
    wPacks=(response.packs||[]).filter(p=>typeof p.name==='string'&&
      p.name.startsWith('PVSCENE1|outfits|')&&Array.isArray(p.refs)&&p.refs.some(r=>typeof r?.id==='string'&&r.id));
    wPacks.sort((a,b)=>wName(a).localeCompare(wName(b)));wRender();
  }catch(e){if(version===wSequence&&wDialog.open)wMessage('Wardrobe unavailable',e.message||'Could not load Outfits.')}
});
$('fashion-wardrobe-close').addEventListener('click',wClose);
wBack.addEventListener('click',()=>{if(wSaving)return;wPack=null;wCreating=false;wClearDraft();wRender();wBack.blur()});
$('fashion-wardrobe-new').addEventListener('click',wStartCreate);
for(const tab of wDialog.querySelectorAll('[data-wardrobe-tab]')){
  tab.addEventListener('click',()=>{if(wPack)return;wTab=tab.dataset.wardrobeTab;wRender()});
  tab.addEventListener('keydown',event=>{
    if(!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();
    const buttons=Array.from(wDialog.querySelectorAll('[data-wardrobe-tab]'));
    const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:
      (buttons.indexOf(tab)+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].click();buttons[next].focus();
  });
}
wSearch.addEventListener('input',()=>{if(!wPack)wRender()});
wDialog.addEventListener('close',()=>{wSequence++;wPacks=[];wPack=null;wCreating=false;wClearDraft();wClearThumbs()});
// A manual replacement always clears the saved Outfit badge.
$('garment-file').addEventListener('change',()=>{wSelected.hidden=true;wSelected.textContent=''});

for(const id of ['model-select','fashn16-category','fashn16-quality','max-resolution','max-mode']){
  $(id).addEventListener('change',()=>{change();status('');});
}
$('direction').addEventListener('input',()=>change());
const looks=$('looks-scroller');
if(looks){
  // The carousel itself clips overflowing thumbnails. An inert preview layer
  // lets a hovered Look grow above the strip while scroll, selection and layout stay put.
  const lookPreview=looks.ownerDocument.createElement('div');
  lookPreview.className='look-hover-preview';
  lookPreview.setAttribute('aria-hidden','true');
  const lookPreviewImage=looks.ownerDocument.createElement('img');
  lookPreviewImage.alt='';
  lookPreview.append(lookPreviewImage);
  looks.parentElement.appendChild(lookPreview);
  // A short hover-intent pause prevents previews flashing while traversing the row.
  let previewDelay=null;
  let activePreviewCard=null;
  const closeLookPreview=()=>{
    if(previewDelay!==null){clearTimeout(previewDelay);previewDelay=null;}
    lookPreview.classList.remove('is-visible');
    if(activePreviewCard){
      activePreviewCard.classList.remove('is-look-preview-active');
      activePreviewCard.style.removeProperty('--look-title-shift');
      activePreviewCard=null;
    }
  };
  function openLookPreview(card){
    if(!card||card.disabled)return;
    const view=looks.ownerDocument.defaultView;
    if(!view?.matchMedia?.('(hover: hover) and (pointer: fine)')?.matches)return;
    const img=card.querySelector('img'),label=card.querySelector('span');
    if(!img||!label)return;
    const sectionRect=looks.parentElement.getBoundingClientRect();
    const cardRect=card.getBoundingClientRect();
    const imgRect=img.getBoundingClientRect();
    const width=Math.min(342,Math.max(256,cardRect.width*1.65));
    const x=Math.max(0,Math.min(sectionRect.width-width,cardRect.left-sectionRect.left+(cardRect.width-width)/2));
    const y=imgRect.bottom-sectionRect.top-width/1.68;
    lookPreview.style.left=x+'px';
    lookPreview.style.top=y+'px';
    lookPreview.style.width=width+'px';
    lookPreviewImage.src=img.currentSrc||img.src;
    // One real title only: it remains below its card, enlarged and centered
    // underneath the hover image instead of duplicating text in the overlay.
    if(activePreviewCard&&activePreviewCard!==card){
      activePreviewCard.classList.remove('is-look-preview-active');
      activePreviewCard.style.removeProperty('--look-title-shift');
    }
    const cardCenter=cardRect.left-sectionRect.left+cardRect.width/2;
    const previewCenter=x+width/2;
    card.style.setProperty('--look-title-shift',(previewCenter-cardCenter)+'px');
    card.classList.add('is-look-preview-active');
    activePreviewCard=card;
    lookPreview.classList.add('is-visible');
  }
  for(const card of looks.querySelectorAll('[data-look]')){
    card.addEventListener('pointerenter',event=>{
      if(event.pointerType!=='mouse')return;
      if(previewDelay!==null)clearTimeout(previewDelay);
      previewDelay=setTimeout(()=>{previewDelay=null;openLookPreview(card);},105);
    });
    card.addEventListener('pointerleave',closeLookPreview);
    card.addEventListener('focus',()=>openLookPreview(card));
    card.addEventListener('blur',closeLookPreview);
  }
  looks.addEventListener('scroll',closeLookPreview,{passive:true});
  looks.ownerDocument.defaultView?.addEventListener('resize',closeLookPreview);
  looks.addEventListener('click',event=>{
    const card=event.target.closest('[data-look]');if(!card||card.disabled)return;
    const next=activeLook===card.dataset.look?'':card.dataset.look;
    const nextPrompt=[next?lookDirections[next]:'',$('direction').value.trim()].filter(Boolean).join('\n');
    if(nextPrompt.length>1200){status('Shorten your styling direction before adding a look.',true);return;}
    activeLook=next;syncLooks();change();
    status('');
  });
  for(const [id,offset] of [['looks-prev',-1],['looks-next',1]]){
    $(id)?.addEventListener('click',()=>{
      looks.scrollBy({left:offset*Math.max(220,looks.clientWidth*.66),behavior:'smooth'});
    });
  }
  $('looks-view-all')?.addEventListener('click',()=>{
    const expanded=looks.classList.toggle('looks-expanded');
    $('looks-view-all').textContent=expanded?'CLOSE':'VIEW ALL';
    $('looks-view-all').setAttribute('aria-expanded',String(expanded));
  });
}

async function upload(id){
  const file=$(id).files?.[0];if(!file)throw new Error('Select both photographs first.');
  const saved=fileKeys.get(id);if(saved?.file===file)return saved.assetId;
  const result=await api('/api/uploads',{method:'POST',body:file,headers:{'Content-Type':file.type,'X-Filename':encodeURIComponent(file.name)}});
  if($(id).files?.[0]!==file)throw new Error('Photograph changed during upload. Review again.');
  fileKeys.set(id,{file,assetId:result.id});return result.id;
}
// Preparing an expiring, server-bound quote is free. Only the priced Generate
// action below can submit it; input changes and background work never generate.
async function prepareQuote(){
  if(busy||preparing||!readyToQuote())return;
  const editVersion=revision,accountVersion=authVersion;
  preparing=true;update();
  try{
    const modelSourceId=await upload('person-file'),garmentSourceId=await upload('garment-file');
    if(revision!==editVersion||accountVersion!==authVersion)return;
    const settings={model:current(),modelSourceId,garmentSourceId,prompt:finalDirection(),
      resolution:$('max-resolution').value,generationMode:$('max-mode').value,
      category:$('fashn16-category').value,quality:$('fashn16-quality').value};
    const response=await api('/api/fashion/quote',{method:'POST',body:settings});
    if(revision!==editVersion||accountVersion!==authVersion)return;
    // Display the same server price used by the atomic customer debit.
    if(!Number.isSafeInteger(response.creditCost)||response.creditCost<1||!response.id||!Number.isFinite(response.expiresAt)||response.expiresAt<=Date.now())
      throw new Error('The server did not confirm a PV LAB credit price. Nothing was charged.');
    quote=response;
    quoteExpiryTimer=setTimeout(()=>{clearQuote();update();scheduleQuote();},Math.max(1,response.expiresAt-Date.now()));
    status('');
  }catch(e){if(revision===editVersion&&accountVersion===authVersion)status(e.message,true);}
  finally{
    preparing=false;update();
    if(revision!==editVersion)scheduleQuote();
  }
}
$('fashion-form').addEventListener('submit',async event=>{
  event.preventDefault();if(busy||preparing||!readyToQuote())return;
  if(!quote||quote.expiresAt<=Date.now()){clearQuote();await prepareQuote();return;}
  const quoted=quote;clearTimeout(quoteExpiryTimer);busy=true;update();status('Generating your outfit…');
  try{
    const response=await api('/api/fashion/submit',{method:'POST',body:{quoteId:quoted.id,confirm:true}});
    clearQuote();revokeResult();const job=response.job;selectedGalleryJob=job.id;
    await showJob(job);
    await loadHistory();
  }catch(e){
    // Never automatically resubmit an ambiguous paid request.
    clearQuote();status(e.message+' Check your generation history before trying again.',true);
  }finally{busy=false;update();}
});
async function loadResult(job){
  if(!job.outputId)throw new Error('This generation has no archived output yet.');
  const version=authVersion;
  const blob=await assetBlob(job.outputId);
  if(!authenticated||version!==authVersion)return;
  revokeResult();resultUrl=URL.createObjectURL(blob);$('result-image').src=resultUrl;$('result-image').hidden=false;$('result-placeholder').hidden=true;$('download').hidden=false;
}
async function showJob(job){
  const state=job?.status||'unknown',name=modes[job?.settings?.fashionModel]?.description||'Fashion generation';
  if(state==='completed'){
    activeJobId='';clearTimeout(pollTimeout);
    await loadResult(job);
    status('Fashion image completed and saved privately.');return;
  }
  if(['queued','running','saving','submitting'].includes(state)){
    revokeResult();activeJobId=job.id;status('Generation '+state+'. The output will be saved to your PV Lab archive.');
    clearTimeout(pollTimeout);pollTimeout=setTimeout(()=>void poll(job.id),4000);return;
  }
  activeJobId='';clearTimeout(pollTimeout);revokeResult();
  if(state==='uncertain')status('Submission status is uncertain. Check the provider dashboard before retrying. '+(job.error||''),true);
  else status(name+'. '+(job.error||('Generation status: '+state)),true);
}
async function poll(id){
  if(!authenticated||activeJobId!==id)return;
  try{const data=await api('/api/jobs/'+encodeURIComponent(id));if(activeJobId!==id)return;await showJob(data.job);if(data.job.status==='completed')await loadHistory();}
  catch(e){status('Status check interrupted. Your existing generation was not resubmitted. '+e.message,true);pollTimeout=setTimeout(()=>void poll(id),8000);}
}
async function checkFashnBalance(){
  if(!authenticated)return;
  const button=$('check-fashn');
  button.disabled=true;
  $('fashn-api-state').textContent='Verifying connection…';
  try{
    const result=await api('/api/fashion/balance');
    if(!authenticated)return;
    const balance=$('fashn-api-state');
    balance.textContent=isCustomer?(result.connected?'Fashion provider connected. Your PV Lab wallet handles payment.':result.note||'Fashion provider is not ready.'):result.connected?'Connected · '+result.credits.total+' credits':(result.note||'FASHN API key is not configured.');
    balance.title=!isCustomer&&result.connected&&result.credits?result.credits.onDemand+' on-demand / '+result.credits.subscription+' subscription credits':'';

  }catch(e){
    if(authenticated)$('fashn-api-state').textContent='Connection not verified · '+e.message;
  }finally{
    button.disabled=!authenticated;
  }
}
$('check-fashn').addEventListener('click',()=>void checkFashnBalance());
// A single owner-scoped Fashion archive. The API returns 20 mixed jobs per
// page; follow existing cursors until we have a page of Fashion jobs.
function clearGalleryPreviews(){
  galleryRevision++;
  for(const objectUrl of galleryPreviews.values())URL.revokeObjectURL(objectUrl);
  galleryPreviews.clear();galleryCards.clear();
}
function fashionLabel(job){
  return models.find(m=>m.id===job.settings?.fashionModel)?.label||
    ({fashnmax:'FASHN Try-On Max',fashn16:'FASHN Try-On v1.6',fluxvto:'FLUX Virtual Try-On Pro'}[job.settings?.fashionModel])||
    'Fashion generation';
}
function galleryState(job){
  return job.status==='completed'&&job.outputId?'Completed':
    job.status==='completed'?'Missing output':
    job.status==='failed'?'Failed':job.status==='uncertain'?'Needs review':
    ['queued','running','submitting','saving'].includes(job.status)?'Generating':job.status||'Pending';
}
function renderGallery(){
  const container=$('fashion-history');container.replaceChildren();galleryCards.clear();
  $('fashion-gallery-count').textContent=galleryItems.length?String(galleryItems.length)+' shown':'';
  $('fashion-more').hidden=!galleryCursor;
  if(!galleryItems.length){
    const empty=document.createElement('p');empty.className='tip';
    empty.textContent=galleryCursor?'No Fashion results on this page. Load earlier work.':'Your Fashion generations will appear here after you create them.';
    container.append(empty);return;
  }
  for(const job of galleryItems){
    const label=fashionLabel(job);
    const button=document.createElement('button');button.type='button';button.className='history-item';
    button.dataset.job=job.id;
    button.setAttribute('aria-label',label+', '+galleryState(job)+'. Open in Result panel');
    button.setAttribute('aria-pressed',String(selectedGalleryJob===job.id));
    const media=document.createElement('span');media.className='history-media';
    const placeholder=document.createElement('span');placeholder.className='history-media-placeholder';
    const illustration=document.createElementNS('http://www.w3.org/2000/svg','svg');
    illustration.setAttribute('viewBox','0 0 24 24');
    illustration.setAttribute('width','30');illustration.setAttribute('height','30');illustration.setAttribute('aria-hidden','true');
    illustration.setAttribute('fill','none');illustration.setAttribute('stroke','currentColor');illustration.setAttribute('stroke-width','1');
    const path=document.createElementNS('http://www.w3.org/2000/svg','path');
    path.setAttribute('d','M3 4h18v16H3z M6 16l4-4 3 3 3-5 3 6');
    illustration.append(path);
    const emptyLabel=document.createElement('span');
    emptyLabel.textContent=job.status==='completed'&&job.outputId?'Loading image…':
      job.status==='failed'?'No image produced':
      job.status==='uncertain'?'Check provider status':'Result pending';
    placeholder.append(illustration,emptyLabel);
    media.append(placeholder);
    const url=galleryPreviews.get(job.id);
    if(url){
      const img=document.createElement('img');img.src=url;img.alt='Fashion image generated with '+label;
      media.append(img);
    }
    const info=document.createElement('span');info.className='history-info';
    const title=document.createElement('span');title.className='history-model';title.textContent=label;
    const line=document.createElement('span');line.className='history-info-line';
    const date=document.createElement('span');
    const time=Number(job.createdAt);
    date.textContent=Number.isFinite(time)&&time>0?new Date(time).toLocaleDateString(undefined,{day:'numeric',month:'short'}):'';
    const state=document.createElement('span');state.className='history-state';
    state.dataset.status=job.status||'';state.textContent=galleryState(job);
    line.append(date,state);
    info.append(title,line);
    if(['failed','uncertain'].includes(job.status)){
      const hint=document.createElement('span');hint.className='history-status-detail';
      hint.textContent=job.status==='uncertain'?'Check provider before retrying.':'No completed result. Select to see details.';
      info.append(hint);
    }
    button.append(media,info);
    button.addEventListener('click',()=>{
      selectedGalleryJob=job.id;
      for(const card of galleryCards.values())card.setAttribute('aria-pressed',String(card.dataset.job===job.id));
      void showJob(job).then(()=>$('result-stage').scrollIntoView({behavior:'smooth',block:'center'})).catch(e=>status(e.message,true));
    });
    galleryCards.set(job.id,button);container.append(button);
  }
}
async function loadGalleryThumbnails(revision){
  const images=galleryItems.filter(j=>j.status==='completed'&&j.outputId&&!galleryPreviews.has(j.id));
  let index=0;
  await Promise.all(Array.from({length:Math.min(3,images.length)},async()=>{
    while(index<images.length){
      const job=images[index++],version=authVersion;
      try{
        const blob=await assetBlob(job.outputId);
        if(!authenticated||version!==authVersion||revision!==galleryRevision)return;
        if(!blob.type.startsWith('image/'))throw new Error('The saved result was not an image.');
        const url=URL.createObjectURL(blob);
        const card=galleryCards.get(job.id);
        if(!card?.isConnected){URL.revokeObjectURL(url);continue;}
        galleryPreviews.set(job.id,url);
        const media=card.querySelector('.history-media');
        const img=document.createElement('img');img.src=url;img.alt='Fashion image generated with '+fashionLabel(job);
        media.append(img);
      }catch{
        if(revision===galleryRevision){
          const card=galleryCards.get(job.id);
          const hint=card?.querySelector('.history-media-placeholder span');
          if(hint)hint.textContent='Preview unavailable';
        }
      }
    }
  }));
}
async function loadHistory(append=false){
  if(!authenticated||galleryLoading)return;
  galleryLoading=true;
  const auth=authVersion,revision=galleryRevision;
  $('refresh-history').disabled=true;$('fashion-more').disabled=true;
  try{
    let cursor=append?galleryCursor:null,pages=0,found=0;
    const jobs=append?[...galleryItems]:[],seen=new Set(jobs.map(j=>j.id));
    do{
      const query=cursor?'?before='+encodeURIComponent(cursor.before)+'&afterId='+encodeURIComponent(cursor.afterId):'';
      const data=await api('/api/jobs'+query);
      if(auth!==authVersion||revision!==galleryRevision||!authenticated)return;
      for(const job of data.jobs||[]){
        if(job.settings?.mode==='fashion'&&!seen.has(job.id)){
          seen.add(job.id);jobs.push(job);found++;
        }
      }
      cursor=data.next||null;
      pages++;
    }while(cursor&&found<GALLERY_PAGE_SIZE&&pages<8);
    if(!append)clearGalleryPreviews();
    galleryItems=jobs;
    galleryCursor=cursor;
    renderGallery();
    void loadGalleryThumbnails(galleryRevision);
  }catch(error){
    if(auth===authVersion&&authenticated){
      if(!append&&!galleryItems.length){
        const empty=document.createElement('p');empty.className='tip';
        empty.textContent='Could not load Fashion generations. Refresh to try again.';
        $('fashion-history').replaceChildren(empty);
      }else status('The gallery could not refresh. '+error.message,true);
    }
  }finally{
    galleryLoading=false;
    $('refresh-history').disabled=!authenticated;
    $('fashion-more').disabled=!authenticated;
  }
}
$('refresh-history').addEventListener('click',()=>void loadHistory());
$('fashion-more').addEventListener('click',()=>void loadHistory(true));
$('download').addEventListener('click',()=>{
  if(!resultUrl)return;const a=document.createElement('a');a.href=resultUrl;a.download='pv-lab-fashion.png';document.body.append(a);a.click();a.remove();
});
$('signin').addEventListener('click',()=>clerk?.openSignIn());
$('reload').addEventListener('click',()=>location.reload());
function lock(){
  wClose();wSelected.hidden=true;wSelected.textContent='';
  authVersion++;clearGalleryPreviews();galleryCursor=null;galleryItems=[];selectedGalleryJob='';$('fashion-history').replaceChildren();$('fashion-gallery-count').textContent='';$('fashion-more').hidden=true;models=[];
  authenticated=false;sessionId='';clearTimeout(pollTimeout);pollTimeout=null;activeJobId='';busy=false;clearQuote();revokeResult();
  for(const url of previews.values())URL.revokeObjectURL(url);
  previews.clear();fileKeys.clear();revision++;
  for(const [fileId,imgId,hintId] of [['person-file','person-preview','person-hint'],['garment-file','garment-preview','garment-hint']]){
    $(fileId).value='';$(imgId).hidden=true;$(imgId).removeAttribute('src');$(hintId).hidden=false;
  }
  activeLook='';$('direction').value='';syncLooks();
  if(publicPreview())status('');
  $('fashn-api-state').textContent='Sign in to check API credits';$('check-fashn').disabled=true;
  $('gate').hidden=publicPreview();$('workspace').hidden=!publicPreview();$('fashion-gallery').hidden=publicPreview();$('signin').disabled=!clerk;
  update();
}
async function sync(){
  if(signingIn)return;signingIn=true;
  const version=authVersion;
  try{
    if(!clerk?.isSignedIn){lock();$('auth-status').textContent='Sign in with your Parallel Vision owner account.';return;}
    if(authenticated&&sessionId===clerk.session?.id)return;
    const session=await api('/api/session');isCustomer=!!session.customer;const info=await api('/api/fashion/models');
    models=info.models||[];authenticated=true;sessionId=clerk.session?.id||'';
    $('gate').hidden=true;$('workspace').hidden=false;$('fashion-gallery').hidden=false;update();scheduleQuote();
    // Secondary gallery and provider-balance reads must never delay the editor.
    void loadHistory();
    void checkFashnBalance();
  }catch(e){if(version===authVersion){lock();$('auth-status').textContent=e.message;}}
  finally{signingIn=false;}
}
if(onNavigate)root.addEventListener('click',event=>{
  const link=event.target.closest?.('a[href*="studio.html?tool="]');
  if(!link||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
  event.preventDefault();onNavigate(new URL(link.href,location.href).searchParams.get('tool')||'image');
});
// Guest settings and local photo previews use the approved form. Account
// operations still go through the real session client after authentication.
for(const type of ['click','submit'])root.addEventListener(type,event=>{
  if(!publicPreview())return;
  if(type==='click'&&!event.target.closest('#quote,#check-fashn,#refresh-history,#fashion-more'))return;
  event.preventDefault();event.stopImmediatePropagation();clerk?.openSignIn();
},true);
update();
const ready=(async()=>{
if(sessionClient){clerk=sessionClient;await sync();return;}
try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>void sync());await sync();
}catch{
  $('auth-status').textContent='Sign-in could not load. Reload the page.';
  $('reload').hidden=false;$('signin').disabled=true;
}

})();
return {ready,sync,lock};
}
if(document.getElementById('fashion-form'))createFashionStudio();
