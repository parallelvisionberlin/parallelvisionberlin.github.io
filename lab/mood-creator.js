import {MOODS,moodById} from './moods.js?v=20261011-mood-creator1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
import {saveMoodHandoff,validateMoodHandoff} from './mood-handoff.js?v=20261011-discovery1';
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const CLERK_KEY='pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k';
const uuid=/^[a-f0-9]{8}-[a-f0-9]{4}-4[a-f0-9]{3}-[89ab][a-f0-9]{12}$/i;
const $=id=>document.getElementById(id);
export function moodCreatorInputValidation({name,direction,baseMoodId,imageCount}){
  if(!name||!name.trim())return 'Give your Mood a name.';
  if(name.trim().length>64)return 'Use a name under 65 characters.';
  if(!direction.trim()&&!baseMoodId)return 'Describe a reusable aesthetic or choose a curated Mood as your starting point.';
  if(direction.length>900)return 'Keep the reusable direction under 900 characters.';
  if(imageCount>12)return 'Keep up to 12 inspiration photographs per Mood.';
  return '';
}
export function moodCreatorImageCheck(file){
  if(!file||!['image/jpeg','image/png','image/webp'].includes(file.type))return 'Add a JPG, PNG or WebP photograph.';
  if(!file.size||file.size>20*1024*1024)return 'The original image must be below 20 MB.';
  return '';
}
async function imageForCanvas(blob){
  if(typeof createImageBitmap==='function'){
    try{return await createImageBitmap(blob,{imageOrientation:'from-image'});}catch{}
  }
  const temp=URL.createObjectURL(blob),img=new Image();
  try{await new Promise((resolve,reject)=>{img.onload=resolve;img.onerror=()=>reject(Error('This photograph could not be opened.'));img.src=temp;});return img;}
  finally{URL.revokeObjectURL(temp);}
}
export async function prepareMoodboardImage(file,{maxEdge=1350,maxBytes=800000}={}){
  const issue=moodCreatorImageCheck(file);if(issue)throw Error(issue);
  const source=await imageForCanvas(file);
  const iw=source.width||source.naturalWidth,ih=source.height||source.naturalHeight;
  if(!iw||!ih||iw*ih>140000000){source.close?.();throw Error('This image is too large to prepare. Use a smaller photograph.');}
  const canvas=document.createElement('canvas'),ctx=canvas.getContext('2d',{alpha:false});
  if(!ctx){source.close?.();throw Error('Image processing is not supported in this browser.');}
  let limit=Math.min(1,maxEdge/Math.max(iw,ih));
  let output=null;
  try{
    for(let attempt=0;attempt<4;attempt++){
      canvas.width=Math.max(1,Math.round(iw*limit));canvas.height=Math.max(1,Math.round(ih*limit));
      ctx.drawImage(source,0,0,canvas.width,canvas.height);
      for(const quality of [.84,.75,.63,.5]){
        output=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if(output&&output.size<=maxBytes)break;
      }
      if(output&&output.size<=maxBytes)break;
      limit*=.75;
    }
  }finally{source.close?.();canvas.width=0;canvas.height=0;}
  if(!output||output.size>maxBytes)throw Error('Could not prepare a lightweight Moodboard copy of this image.');
  // The original file is never modified, and full-resolution images are never
  // uploaded just to create a private moodboard cover.
  return new File([output],'moodboard-inspiration.jpg',{type:'image/jpeg'});
}
async function blobDataUrl(blob){
  return new Promise((resolve,reject)=>{const reader=new FileReader();
    reader.onerror=()=>reject(Error('Unable to read the chosen photograph.'));
    reader.onload=()=>resolve(reader.result);
    reader.readAsDataURL(blob);
  });
}
function initMoodCreator(){
  const q=new URLSearchParams(location.search),chosenBoard=q.get('board'),sourceJob=q.get('fromJob');
  let clerk=null,account=null,authGeneration=0,sessionVersion=0;
  let boards=[],boardId=null,items=[],urls=new Map(),busy=false,analyzing=false,selectedIndex=0;
  let suggestion=null,analysisApplied=false,loadGeneration=0,libraryGeneration=0,loadedJob=false;
  const sessionRequest=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
  const label=$('mc-account-label'),signin=$('mc-signin'),signout=$('mc-signout');
  const message=$('mc-message'),board=$('mc-board'),boardShell=$('mc-drop-zone');
  const name=$('mc-name'),concept=$('mc-idea'),direction=$('mc-direction'),base=$('mc-base'),intensity=$('mc-intensity');
  const save=$('mc-save'),use=$('mc-use'),analyze=$('mc-analyze');
  const library=$('mc-library-grid'),empty=$('mc-library-empty');
  const create=$('mc-new'),createLibrary=$('mc-library-create');
  const upload=$('mc-upload'),uploadTrigger=$('mc-drop-trigger');
  const lookDialog=$('mc-look-dialog'),lookZone=$('mc-look-dropzone');
  const lookFile=$('mc-look-file'),lookDirection=$('mc-look-direction'),lookStatus=$('mc-look-status');
  let selectedLook=null,lookPhoto=null,lookPhotoURL=null,lookSending=false;
  const feedback=(text,error=false)=>{message.textContent=text||'';message.classList.toggle('is-error',!!error);};
  const authenticated=()=>!!clerk?.isSignedIn&&!!account;
  const markBusy=value=>{
    busy=value;save.disabled=value;use.disabled=value;create.disabled=value;createLibrary.disabled=value;
    $('mc-delete').disabled=value;uploadTrigger.classList.toggle('is-disabled',value);
    analyze.disabled=value||analyzing;
  };
  async function call(path,{method='GET',body=null,headers={},blob=false}={}){
    if(!clerk?.isSignedIn)throw Error('Sign in with Google to use your private Mood collection.');
    const h={...headers},data=body instanceof Blob?body:body!==null?JSON.stringify(body):undefined;
    if(body!==null&&!(body instanceof Blob))h['Content-Type']='application/json';
    const response=await sessionRequest(path,{method,body:data,headers:h,cache:'no-store',credentials:'omit'});
    if(blob){if(!response.ok)throw Error('The saved image is unavailable.');return response.blob();}
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw Error(result.error||'Mood Creator request failed. Try again.');
    return result;
  }
  const currentPayload=()=>({
    name:name.value.trim(),direction:direction.value.trim(),baseMoodId:base.value||null,
    intensity:Number(intensity.value),
    imageIds:items.map(item=>item.assetId).filter(Boolean),
    palette:analysisApplied?(suggestion?.palette||[]):[],
    qualities:analysisApplied?(suggestion?.qualities||[]):[]
  });
  function clearItemUrls(){
    for(const item of items)if(item.localUrl)URL.revokeObjectURL(item.localUrl);
    items=[];
  }
  function clearPrivateUrls(){
    for(const u of urls.values())URL.revokeObjectURL(u);
    urls.clear();
  }
  function resetBoard({scroll=false}={}){
    clearItemUrls();boardId=null;selectedIndex=0;suggestion=null;analysisApplied=false;
    name.value='';concept.value='';direction.value='';base.value='';intensity.value='70';
    $('mc-intensity-value').textContent='70%';
    $('mc-direction-count').textContent='0 / 900';
    $('mc-analysis-palette').hidden=true;$('mc-analysis-qualities').hidden=true;
    $('mc-suggestion').hidden=true;$('mc-saved-actions').hidden=true;
    save.innerHTML='Save to My Moods <span aria-hidden="true">↗</span>';
    feedback('');renderBoard();
    if(scroll)document.getElementById('workspace').scrollIntoView({behavior:'smooth',block:'start'});
  }
  function itemUrl(item){return item?.localUrl||urls.get(item?.assetId)||'';}
  async function getPrivateImage(assetId){
    if(!uuid.test(assetId||'')||!authenticated())return null;
    if(urls.has(assetId))return urls.get(assetId);
    const generation=sessionVersion,blob=await call('/api/assets/'+encodeURIComponent(assetId),{blob:true});
    if(generation!==sessionVersion||!authenticated())return null;
    if(!blob.type.startsWith('image/'))return null;
    const url=URL.createObjectURL(blob);urls.set(assetId,url);return url;
  }
  async function drawItemImage(item,img,revision){
    try{
      const url=itemUrl(item)||await getPrivateImage(item.assetId);
      if(revision===loadGeneration&&item===items.find(x=>x===item)&&url&&img.isConnected)img.src=url;
    }catch{img.alt='Unavailable private photo';}
  }
  function selectItem(index){
    selectedIndex=index;
    for(const [i,el] of [...board.querySelectorAll('.mc-shot')].entries())el.classList.toggle('is-active',i===selectedIndex);
  }
  function renderBoard(){
    const revision=++loadGeneration;
    board.replaceChildren();
    $('mc-image-count').textContent=items.length+' / 12 images';
    uploadTrigger.hidden=items.length>0;
    for(const [i,item] of items.entries()){
      const tile=document.createElement('div');tile.className='mc-shot'+(i===selectedIndex?' is-active':'');
      tile.draggable=!busy;tile.tabIndex=0;tile.setAttribute('role','button');
      tile.setAttribute('aria-label','Inspiration photograph '+(i+1)+'. Select to analyze its style.');
      const img=document.createElement('img');img.alt='Moodboard inspiration '+(i+1);img.decoding='async';img.loading='lazy';
      const index=document.createElement('span');index.className='mc-shot-index';index.textContent=String(i+1).padStart(2,'0');
      const remove=document.createElement('button');remove.className='mc-shot-remove';remove.type='button';remove.textContent='×';
      remove.setAttribute('aria-label','Remove inspiration image '+(i+1));
      remove.onclick=event=>{event.stopPropagation();if(busy)return;const [out]=items.splice(i,1);if(out?.localUrl)URL.revokeObjectURL(out.localUrl);selectedIndex=Math.max(0,Math.min(selectedIndex,items.length-1));renderBoard();};
      tile.onclick=()=>selectItem(i);
      tile.onkeydown=event=>{if(event.target===tile&&(event.key==='Enter'||event.key===' ')){event.preventDefault();selectItem(i);}};
      tile.ondragstart=event=>{if(busy)return;event.dataTransfer.setData('application/x-pvlab-mood-index',String(i));event.dataTransfer.effectAllowed='move';tile.classList.add('is-dragging');};
      tile.ondragend=()=>tile.classList.remove('is-dragging');
      tile.ondragover=event=>{if(event.dataTransfer.types.includes('application/x-pvlab-mood-index'))event.preventDefault();};
      tile.ondrop=event=>{
        const from=event.dataTransfer.getData('application/x-pvlab-mood-index');
        if(from==='')return;event.preventDefault();event.stopPropagation();
        const at=Number(from);if(!Number.isInteger(at)||at<0||at>=items.length||at===i)return;
        const [moved]=items.splice(at,1);items.splice(i,0,moved);selectedIndex=i;renderBoard();
      };
      tile.append(img,index,remove);board.append(tile);void drawItemImage(item,img,revision);
    }
    if(items.length&&items.length<12){
      const add=document.createElement('label');add.className='mc-board-add-tile';add.setAttribute('for','mc-upload');
      add.innerHTML='<span aria-hidden="true">+</span><strong>Add inspiration</strong>';
      board.append(add);
    }
  }
  function addFiles(files){
    let added=0;
    for(const file of files){
      const error=moodCreatorImageCheck(file);
      if(error){feedback(error,true);continue;}
      if(items.length>=12){feedback('A Mood can hold up to 12 photographs.',true);break;}
      items.push({assetId:null,file,localUrl:URL.createObjectURL(file)});
      added++;
    }
    if(added){selectedIndex=items.length-added;feedback(added+' image'+(added===1?'':'s')+' added. Select one to analyze its aesthetic.');}
    renderBoard();return added;
  }
  function scrollToWorkspace(){document.getElementById('workspace').scrollIntoView({behavior:'smooth',block:'start'});}
  function loadFilePicker(){scrollToWorkspace();upload.click();}
  upload.addEventListener('change',()=>{addFiles([...upload.files]);upload.value='';});
  for(const el of [boardShell]){
    el.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();boardShell.classList.add('is-over');}});
    el.addEventListener('dragleave',event=>{if(!boardShell.contains(event.relatedTarget))boardShell.classList.remove('is-over');});
    el.addEventListener('drop',event=>{if(event.dataTransfer?.files?.length){event.preventDefault();boardShell.classList.remove('is-over');addFiles([...event.dataTransfer.files]);}});
  }
  uploadTrigger.addEventListener('keydown',event=>{
    if(event.key==='Enter'||event.key===' '){event.preventDefault();upload.click();}
  });

  // A curated preset first opens a photo/prompt tray. The Image page never
  // creates a paid job merely from choosing or dropping a file on a Mood.
  function clearQuickPhoto(){
    if(lookPhotoURL)URL.revokeObjectURL(lookPhotoURL);
    lookPhotoURL=null;lookPhoto=null;lookFile.value='';
    const preview=$('mc-look-file-preview');if(preview)preview.remove();
    lookZone.classList.remove('has-image');
    $('mc-look-file-clear').hidden=true;
    $('mc-look-file-label-text').textContent='Drop a photograph or browse files';
  }
  function chooseQuickPhoto(file){
    const error=file?moodCreatorImageCheck(file):'Choose a photograph.';
    if(error){lookStatus.textContent=error;return false;}
    try{validateMoodHandoff({file});}catch(e){lookStatus.textContent=e.message;return false;}
    clearQuickPhoto();lookPhoto=file;
    lookPhotoURL=URL.createObjectURL(file);
    const img=document.createElement('img');img.id='mc-look-file-preview';img.alt='Photograph selected for Image';
    img.className='mc-look-file-preview';img.src=lookPhotoURL;lookZone.prepend(img);
    $('mc-look-file-label-text').textContent=file.name;
    $('mc-look-file-clear').hidden=false;lookZone.classList.add('has-image');
    lookStatus.textContent='Photograph ready. Continue in Image to apply the selected Mood.';
    return true;
  }
  function showLook(mood,file=null){
    if(!mood)return;
    if(lookDialog.open)lookDialog.close();
    selectedLook=mood;clearQuickPhoto();lookDirection.value='';lookStatus.textContent='';
    $('mc-look-preview').src=mood.preview;
    $('mc-look-preview').alt=mood.name+' Mood preview';
    $('mc-look-title').textContent=mood.name;
    $('mc-look-description').textContent=mood.description+'. Keep your original scene and add this creative direction.';
    if(file&&!chooseQuickPhoto(file)){lookStatus.textContent='Choose a JPG, PNG or WebP photo under 20 MB.';}
    lookDialog.showModal();
  }
  lookDialog.addEventListener('close',()=>{
    clearQuickPhoto();selectedLook=null;lookSending=false;
    $('mc-look-continue').disabled=false;$('mc-look-make').disabled=false;
    $('mc-look-preview').removeAttribute('src');
  });
  $('mc-look-close').onclick=()=>lookDialog.close();
  lookDialog.addEventListener('click',event=>{if(event.target===lookDialog)lookDialog.close();});
  lookFile.addEventListener('change',()=>{
    if(lookFile.files?.[0])chooseQuickPhoto(lookFile.files[0]);
  });
  $('mc-look-file-clear').onclick=()=>{clearQuickPhoto();lookStatus.textContent='Photo removed. You can continue with a written direction.';};
  lookZone.addEventListener('dragover',event=>{
    if(event.dataTransfer?.types?.includes('Files')){
      event.preventDefault();lookZone.classList.add('is-over');
    }
  });
  lookZone.addEventListener('dragleave',()=>lookZone.classList.remove('is-over'));
  lookZone.addEventListener('drop',event=>{
    if(!event.dataTransfer?.files?.length)return;
    event.preventDefault();lookZone.classList.remove('is-over');
    chooseQuickPhoto(event.dataTransfer.files[0]);
  });
  for(const card of document.querySelectorAll('.mc-look-card[data-mood-id]')){
    const mood=moodById(card.dataset.moodId);
    if(!mood)continue;
    card.addEventListener('click',()=>showLook(mood));
    card.addEventListener('dragover',event=>{
      if(event.dataTransfer?.types?.includes('Files')){
        event.preventDefault();event.dataTransfer.dropEffect='copy';
        card.classList.add('is-drag-over');
      }
    });
    card.addEventListener('dragleave',()=>card.classList.remove('is-drag-over'));
    card.addEventListener('drop',event=>{
      card.classList.remove('is-drag-over');
      if(event.dataTransfer?.files?.length){
        event.preventDefault();event.stopPropagation();showLook(mood,event.dataTransfer.files[0]);
      }
    });
  }
  // Dropping outside the curated cards starts an original board without
  // silently selecting an unrelated preset.
  const lookGrid=$('mc-look-grid');
  lookGrid.addEventListener('dragover',event=>{
    if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();
  });
  lookGrid.addEventListener('drop',event=>{
    if(!event.dataTransfer?.files?.length)return;
    if(event.target.closest('.mc-look-card[data-mood-id]'))return;
    event.preventDefault();resetBoard();
    addFiles([...event.dataTransfer.files]);
    scrollToWorkspace();
  });
  $('mc-create-look').onclick=()=>resetBoard({scroll:true});
  $('mc-look-continue').onclick=()=>void (async()=>{
    if(!selectedLook||lookSending)return;
    lookSending=true;
    $('mc-look-continue').disabled=true;$('mc-look-make').disabled=true;
    const selected=selectedLook,photo=lookPhoto,requested=lookDirection.value;
    lookStatus.textContent='Preparing Image. Nothing is being generated yet.';
    try{
      const token=await saveMoodHandoff({file:photo,prompt:requested});
      const address=new URL('./studio.html',location.href);
      address.searchParams.set('tool','image');
      address.searchParams.set('mood',selected.id);
      if(token)address.searchParams.set('handoff',token);
      location.assign(address.href);
    }catch(e){
      lookStatus.textContent=e.message;
      lookSending=false;$('mc-look-continue').disabled=false;$('mc-look-make').disabled=false;
    }
  })();
  $('mc-look-make').onclick=()=>{
    if(!selectedLook||lookSending)return;
    const mood=selectedLook,photo=lookPhoto;
    resetBoard();base.value=mood.id;intensity.value='70';
    $('mc-intensity-value').textContent='70%';
    if(photo)addFiles([photo]);
    lookDialog.close();scrollToWorkspace();
    name.focus({preventScroll:true});
    feedback('Starting with '+mood.name+'. Give your variation a name and define what makes it yours.');
  };
  $('mc-start-image').onclick=loadFilePicker;
  $('mc-start-idea').onclick=()=>{scrollToWorkspace();concept.focus({preventScroll:true});};
  $('mc-new').onclick=()=>resetBoard({scroll:true});
  $('mc-library-create').onclick=()=>resetBoard({scroll:true});
  intensity.addEventListener('input',()=>{$('mc-intensity-value').textContent=intensity.value+'%';});
  direction.addEventListener('input',()=>{$('mc-direction-count').textContent=direction.value.length+' / 900';});

  function renderStyleAccents(analysis){
    const tags=$('mc-analysis-qualities'),palette=$('mc-analysis-palette');
    tags.replaceChildren();palette.replaceChildren();
    for(const quality of analysis?.qualities||[]){
      const label=document.createElement('span');label.textContent=quality;tags.append(label);
    }
    for(const color of analysis?.palette||[]){
      if(!/^#[a-f0-9]{6}$/i.test(color))continue;
      const block=document.createElement('span');block.style.backgroundColor=color;
      block.title=color;block.setAttribute('aria-label','Saved Mood color '+color);palette.append(block);
    }
    tags.hidden=!tags.children.length;palette.hidden=!palette.children.length;
  }
  function setAnalysisResult(analysis){
    suggestion=analysis;analysisApplied=false;
    renderStyleAccents(analysis);
    if(!name.value.trim())name.value=analysis.name||'';
    if(!direction.value.trim())applyAnalysisResult();
    else{
      $('mc-suggestion-name').textContent=analysis.name;
      $('mc-suggestion-text').textContent=analysis.direction;
      $('mc-suggestion').hidden=false;
    }
  }
  function applyAnalysisResult(){
    if(!suggestion)return;
    direction.value=suggestion.direction.slice(0,900);
    analysisApplied=true;
    $('mc-direction-count').textContent=direction.value.length+' / 900';
    $('mc-suggestion').hidden=true;
    feedback('Art direction ready. Refine it, name your Mood, then save.');
  }
  $('mc-suggestion-apply').onclick=applyAnalysisResult;
  $('mc-use-idea').onclick=()=>{
    const text=concept.value.trim();
    if(!text){feedback('Write a few words about the aesthetic first.',true);concept.focus();return;}
    if(direction.value.trim()&&!confirm('Replace the current style direction with your written idea?'))return;
    direction.value=text.slice(0,900);
    analysisApplied=false;suggestion=null;renderStyleAccents(null);
    $('mc-direction-count').textContent=direction.value.length+' / 900';
    $('mc-suggestion').hidden=true;
    feedback('Your words are now the reusable art direction. No AI analysis was needed.');
  };
  async function analyzeStyle(){
    if(analyzing||busy)return;
    if(!authenticated()){feedback('Sign in to develop a style from a photograph or idea.',true);signin.click();return;}
    const text=concept.value.trim(),item=items[selectedIndex]||items[0];
    if(!text&&!item){feedback('Add a photograph or write an idea first.',true);return;}
    analyzing=true;analyze.disabled=true;
    analyze.querySelector('strong').textContent='Reading the visual language…';
    feedback('Analyzing light, materials, color and atmosphere. No image is being generated.');
    try{
      let imageDataUrl=null;
      if(item){
        const input=item.file||await call('/api/assets/'+encodeURIComponent(item.assetId),{blob:true});
        const copy=await prepareMoodboardImage(input,{maxEdge:1050,maxBytes:700000});
        imageDataUrl=await blobDataUrl(copy);
      }
      const result=await call('/api/moodboards/analyze',{method:'POST',body:{concept:text,imageDataUrl}});
      setAnalysisResult(result);
      feedback('A reusable aesthetic has been suggested. Edit the words before saving.');
    }catch(error){feedback(error.message+' Your photo and written direction have not been changed.',true);}
    finally{analyzing=false;analyze.disabled=busy;analyze.querySelector('strong').textContent='Develop the aesthetic';}
  }
  analyze.onclick=()=>void analyzeStyle();

  async function saveMood(){
    if(busy)return null;
    const candidate=currentPayload();
    const error=moodCreatorInputValidation({...candidate,imageCount:items.length});
    if(error){feedback(error,true);return null;}
    if(!authenticated()){feedback('Sign in to keep this Mood privately on your account.',true);signin.click();return null;}
    markBusy(true);feedback('Saving your visual language privately…');
    const version=sessionVersion;
    try{
      // Only lightweight copies get uploaded; the user keeps the original files.
      const ids=[];
      for(const item of items){
        if(item.assetId){ids.push(item.assetId);continue;}
        const copy=await prepareMoodboardImage(item.file);
        const response=await call('/api/moodboards/image',{method:'POST',headers:{'Content-Type':copy.type},body:copy});
        if(version!==sessionVersion)throw Error('The signed-in account changed. Save again.');
        item.assetId=response.id;ids.push(response.id);
      }
      const payload={...candidate,imageIds:ids};
      const response=await call(boardId?'/api/moodboards/'+encodeURIComponent(boardId):'/api/moodboards',
        {method:'POST',body:payload});
      boardId=response.moodboard.id;
      const id=boardId;
      $('mc-saved-actions').hidden=false;
      save.innerHTML='Save changes <span aria-hidden="true">↗</span>';
      feedback('Saved. Your Mood is now available in My Moods and Image.');
      await loadBoards();
      return id;
    }catch(error){feedback(error.message,true);return null;}
    finally{markBusy(false);}
  }
  save.onclick=()=>void saveMood();
  use.onclick=()=>void (async()=>{
    const id=await saveMood();if(!id)return;
    // Selecting the Mood never submits a billable generation.
    location.assign('./studio.html?tool=image&moodboard='+encodeURIComponent(id));
  })();
  $('mc-delete').onclick=()=>void (async()=>{
    if(!boardId||busy||!authenticated())return;
    if(!confirm('Delete this Mood? Your original image results will remain in History.'))return;
    markBusy(true);
    try{
      await call('/api/moodboards/'+encodeURIComponent(boardId),{method:'DELETE'});
      resetBoard();await loadBoards();
      feedback('Mood deleted. Saved photos in your existing History remain untouched.');
    }catch(error){feedback(error.message,true);}
    finally{markBusy(false);}
  })();

  function renderLibrary(){
    const version=++libraryGeneration;
    library.replaceChildren();$('mc-library-count').textContent=boards.length?' / '+boards.length:'';
    empty.hidden=boards.length>0;
    for(const item of boards){
      const card=document.createElement('button');card.className='mc-library-card';card.type='button';
      card.setAttribute('aria-label','Open saved Mood '+item.name);
      const picture=document.createElement('div');picture.className='mc-library-photo';
      if(item.imageIds?.[0]){
        const img=document.createElement('img');img.alt='Private visual cover of '+item.name;img.loading='lazy';picture.append(img);
        void getPrivateImage(item.imageIds[0]).then(url=>{
          if(version===libraryGeneration&&card.isConnected&&url)img.src=url;
        }).catch(()=>{
          const curated=moodById(item.baseMoodId);
          if(curated?.preview)img.src=curated.preview;
          else{const hint=document.createElement('span');hint.className='mc-placeholder';hint.textContent='✳';picture.append(hint);}
        });
      }else{
        const curated=moodById(item.baseMoodId);
        if(curated?.preview){
          const image=document.createElement('img');
          image.alt='Curated look used as starting direction';image.loading='lazy';
          image.src=curated.preview;picture.append(image);
        }else{
          const hint=document.createElement('span');hint.className='mc-placeholder';
          hint.textContent='✳';picture.append(hint);
        }
      }
      const caption=document.createElement('div');caption.className='mc-library-copy';
      const copy=document.createElement('div'),title=document.createElement('strong'),text=document.createElement('small'),arrow=document.createElement('span');
      title.textContent=item.name;text.textContent=(item.imageIds?.length||0)+' images · '+(moodById(item.baseMoodId)?.name||'Original look');
      copy.append(title,text);arrow.textContent='↗';caption.append(copy,arrow);
      card.append(picture,caption);
      if(item.palette?.length){
        const row=document.createElement('div');row.className='mc-library-palette';
        for(const color of item.palette.slice(0,5)){
          if(!/^#[0-9a-f]{6}$/i.test(color))continue;
          const swatch=document.createElement('span');swatch.style.backgroundColor=color;swatch.title=color;
          row.append(swatch);
        }
        card.append(row);
      }
      card.onclick=()=>void openBoard(item.id,{scroll:true});
      const row=document.createElement('div');row.className='mc-library-item';
      const useLink=document.createElement('a');useLink.className='mc-library-use';
      useLink.href='./studio.html?tool=image&moodboard='+encodeURIComponent(item.id);
      useLink.textContent='Use in Image →';
      useLink.setAttribute('aria-label','Use '+item.name+' in Image Studio');
      row.append(card,useLink);library.append(row);
    }
  }
  async function loadBoards(){
    if(!authenticated())return;
    const version=sessionVersion;
    const data=await call('/api/moodboards');
    if(version!==sessionVersion||!authenticated())return;
    boards=Array.isArray(data.moodboards)?data.moodboards:[];
    renderLibrary();
  }
  async function openBoard(id,{scroll=false}={}){
    if(!authenticated())return;
    const selected=boards.find(item=>item.id===id);
    if(!selected){feedback('That Mood is unavailable. Refresh your private collection.',true);return;}
    clearItemUrls();boardId=selected.id;
    suggestion={name:selected.name,direction:selected.direction,palette:selected.palette||[],qualities:selected.qualities||[]};
    analysisApplied=!!(suggestion.palette.length||suggestion.qualities.length);
    renderStyleAccents(suggestion);
    name.value=selected.name;direction.value=selected.direction;concept.value='';
    base.value=selected.baseMoodId||'';intensity.value=String(selected.intensity);
    $('mc-intensity-value').textContent=intensity.value+'%';
    $('mc-direction-count').textContent=direction.value.length+' / 900';
    items=(selected.imageIds||[]).map(assetId=>({assetId,file:null,localUrl:null}));
    selectedIndex=0;
    $('mc-suggestion').hidden=true;$('mc-saved-actions').hidden=false;
    save.innerHTML='Save changes <span aria-hidden="true">↗</span>';
    renderBoard();feedback('Editing '+selected.name+'. Your original board is safe until you press Save.');
    if(scroll)scrollToWorkspace();
  }
  async function openImageResult(jobId){
    if(!authenticated()||!uuid.test(jobId||''))return;
    const data=await call('/api/jobs/'+encodeURIComponent(jobId));
    const job=data?.job;
    if(!job||job.status!=='completed'||job.settings?.type!=='image'||!uuid.test(job.outputId||'')){
      throw Error('This image result is not available on your account.');
    }
    const settings=job.settings||{};
    if(settings.moodId==='custom'&&uuid.test(settings.customMoodBoardId||'')&&
       boards.some(x=>x.id===settings.customMoodBoardId)){
      await openBoard(settings.customMoodBoardId,{scroll:false});
    }else{
      resetBoard();
      base.value=moodById(settings.moodId)?.id||'';
      intensity.value=String(settings.moodIntensity||70);
      $('mc-intensity-value').textContent=intensity.value+'%';
    }
    if(!items.some(item=>item.assetId===job.outputId)){
      if(items.length>=12)throw Error('This Mood already contains 12 images. Remove one before adding the result.');
      items.push({assetId:job.outputId,file:null,localUrl:null});
    }
    selectedIndex=items.findIndex(item=>item.assetId===job.outputId);
    renderBoard();scrollToWorkspace();
    feedback('Image result added. Use Develop the aesthetic to extract its style, then save the Mood. No generation is started.');
  }
  function showAuth(){
    const signed=authenticated();
    signin.hidden=signed;signout.hidden=!clerk?.isSignedIn;
    label.hidden=!signed;
    if(signed)label.textContent=account?.customer?'PRIVATE WORKSPACE':'OWNER WORKSPACE';
  }
  async function syncAuth(){
    const local=++authGeneration;
    const previousAccount=account?.ownerId;
    if(!clerk?.isSignedIn){
      account=null;sessionVersion++;boards=[];clearPrivateUrls();renderLibrary();
      // Never retain one account's private images after logout.
      if(previousAccount)resetBoard();
      showAuth();return;
    }
    try{
      const data=await call('/api/session');
      if(local!==authGeneration)return;
      if(previousAccount&&previousAccount!==data.ownerId){sessionVersion++;clearPrivateUrls();resetBoard();}
      account=data;showAuth();
      await loadBoards();
      if(local!==authGeneration)return;
      if(chosenBoard&&uuid.test(chosenBoard)&&boards.some(b=>b.id===chosenBoard)){
        await openBoard(chosenBoard,{scroll:true});
      }else if(sourceJob&&!loadedJob){
        loadedJob=true;
        try{await openImageResult(sourceJob);}
        catch(error){feedback('Unable to bring in your result. '+error.message,true);}
      }
    }catch(error){if(local===authGeneration){account=null;showAuth();feedback('Sign-in worked, but your private Mood collection could not load. '+error.message,true);}}
  }
  signin.onclick=()=>clerk?.openSignIn?.();
  signout.onclick=()=>void clerk?.signOut?.();
  for(const mood of MOODS)base.add(new Option(mood.name,mood.id));
  const urlStart=q.get('start');
  if(urlStart==='idea'){setTimeout(()=>{scrollToWorkspace();concept.focus({preventScroll:true});},50);}
  if(urlStart==='image'){setTimeout(()=>{
    scrollToWorkspace();uploadTrigger.focus({preventScroll:true});
    feedback('Drop a photograph here or browse files to begin.');
  },120);}
  if(chosenBoard&&!uuid.test(chosenBoard))feedback('Invalid saved Mood link.',true);
  if(sourceJob&&!uuid.test(sourceJob))feedback('Invalid image result link.',true);
  renderBoard();renderLibrary();
  (async()=>{
    try{
      const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');
      await new Promise((resolve,reject)=>{
        const script=document.createElement('script');script.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';
        script.onload=resolve;script.onerror=reject;document.head.append(script);
      });
      clerk=new Clerk(CLERK_KEY);
      await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},
        signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
      clerk.addListener(()=>void syncAuth());
      await syncAuth();
    }catch{feedback('Account sign-in is currently unavailable. You can compose a Mood here and try saving later.',true);signin.disabled=true;}
  })();
}
if(typeof document!=='undefined')initMoodCreator();
