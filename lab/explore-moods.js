import {moodById} from './moods.js?v=20261011-midnight-reverie1&hd=20261011&raveBudget=1&editorialHD=2&hongKongStreet=1&moodImageHD=1&raveNight=3';
import {saveMoodHandoff,validateMoodHandoff} from './mood-handoff.js?v=20261011-discovery1';
// Discovering and selecting a look must never perform a paid generation.
export function moodExploreDestination(moodId,{create=false,handoff=null}={}){
  if(!moodById(moodId))throw Error('Choose a valid PV Lab Mood.');
  const query=new URLSearchParams(create?{base:moodId}:{tool:'image',mood:moodId});
  if(handoff)query.set('handoff',handoff);
  return './'+(create?'mood-creator.html':'studio.html')+'?'+query;
}
function initialize(){
  const $=id=>document.getElementById(id);
  const dialog=$('mc-look-dialog'),zone=$('mc-look-dropzone'),fileInput=$('mc-look-file');
  const direction=$('mc-look-direction'),status=$('mc-look-status');
  let mood=null,file=null,fileURL=null,busy=false;
  const fullPreviews=new Map();
  function loadFullPreview(selected,priority='low'){
    const src=selected.previewFull;
    if(!src||src===selected.preview)return Promise.resolve(null);
    const cached=fullPreviews.get(src);
    if(cached){
      if(priority==='high')cached.image.fetchPriority='high';
      return cached.ready;
    }
    const image=new Image();
    image.decoding='async';image.fetchPriority=priority;image.src=src;
    const ready=image.decode().then(()=>image.src,()=>{
      fullPreviews.delete(src);
      return null; // Keep the sharp card image if the original cannot load.
    });
    fullPreviews.set(src,{image,ready});
    return ready;
  }
  function clearPhoto(){
    if(fileURL)URL.revokeObjectURL(fileURL);
    fileURL=null;file=null;fileInput.value='';
    $('mc-look-file-preview')?.remove();
    $('mc-look-file-clear').hidden=true;
    $('mc-look-file-label-text').textContent='Drop a photograph or browse files';
    zone.classList.remove('has-image');
  }
  function attachPhoto(input){
    try{validateMoodHandoff({file:input});}catch(error){status.textContent=error.message;return false;}
    clearPhoto();file=input;
    fileURL=URL.createObjectURL(file);
    const photo=document.createElement('img');photo.id='mc-look-file-preview';photo.className='mc-look-file-preview';
    photo.alt='Chosen photo to transform';photo.src=fileURL;
    zone.prepend(photo);
    $('mc-look-file-label-text').textContent=file.name;
    $('mc-look-file-clear').hidden=false;zone.classList.add('has-image');
    status.textContent='';
    return true;
  }
  function showMood(selected,photo=null){
    if(!selected)return;
    mood=selected;clearPhoto();direction.value='';status.textContent='';
    const preview=$('mc-look-preview');
    preview.dataset.moodId=selected.id;
    // Reuse the gallery's HD image while the untouched original decodes offscreen.
    preview.src=selected.preview;
    preview.alt=selected.name+' aesthetic';
    $('mc-look-title').textContent=selected.name;
    $('mc-look-description').textContent=selected.id==='berlin-rave'?selected.description+'. Transforms wardrobe and lighting into a night-flash editorial while keeping your identity, pose and framing.':selected.id==='synthetic-romance'?selected.description+'. This mood reconstructs visible body parts into engineered chrome, cables and synthetic anatomy.':selected.description+'. Keep your own subject and scene.';
    if(photo)attachPhoto(photo);
    if(!dialog.open)dialog.showModal();
    dialog.focus({preventScroll:true});
    dialog.scrollTop=0;
    void loadFullPreview(selected,'high').then(src=>{
      if(src&&dialog.open&&mood===selected)preview.src=src;
    });
  }
  function close(){if(dialog.open)dialog.close();}
  dialog.addEventListener('close',()=>{
    if(dialog.open)return;
    clearPhoto();mood=null;busy=false;
    $('mc-look-make').disabled=false;$('mc-look-continue').disabled=false;
    $('mc-look-preview').removeAttribute('src');
  });
  $('mc-look-close').onclick=close;
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])attachPhoto(fileInput.files[0]);});
  $('mc-look-file-clear').onclick=()=>{clearPhoto();status.textContent='';};
  zone.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();zone.classList.add('is-over');}});
  zone.addEventListener('dragleave',()=>zone.classList.remove('is-over'));
  zone.addEventListener('drop',event=>{if(event.dataTransfer?.files?.length){event.preventDefault();zone.classList.remove('is-over');attachPhoto(event.dataTransfer.files[0]);}});
  for(const card of document.querySelectorAll('.mc-look-card[data-mood-id]')){
    const selected=moodById(card.dataset.moodId);if(!selected)continue;
    const warmPreview=()=>{if(!navigator.connection?.saveData)void loadFullPreview(selected);};
    card.addEventListener('pointerenter',warmPreview,{once:true});
    card.addEventListener('focus',warmPreview,{once:true});
    card.onclick=()=>showMood(selected);
    card.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();event.dataTransfer.dropEffect='copy';card.classList.add('is-drag-over');}});
    card.addEventListener('dragleave',()=>card.classList.remove('is-drag-over'));
    card.addEventListener('drop',event=>{card.classList.remove('is-drag-over');if(event.dataTransfer?.files?.length){event.preventDefault();event.stopPropagation();showMood(selected,event.dataTransfer.files[0]);}});
  }
  $('mc-look-grid').addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files'))event.preventDefault();});
  $('mc-look-grid').addEventListener('drop',event=>{
    if(!event.dataTransfer?.files?.length||event.target.closest('.mc-look-card[data-mood-id]'))return;
    event.preventDefault();status.textContent='Drop directly onto the Mood you want to use.';
  });
  async function continueWithMood(create=false){
    if(!mood||busy)return;
    busy=true;$('mc-look-continue').disabled=true;$('mc-look-make').disabled=true;
    status.textContent='Preparing your private photo handoff. Nothing is being generated.';
    try{
      const token=await saveMoodHandoff({file,prompt:direction.value.trim()});
      location.assign(moodExploreDestination(mood.id,{create,handoff:token}));
    }catch(error){
      status.textContent=error.message;
      busy=false;$('mc-look-continue').disabled=false;$('mc-look-make').disabled=false;
    }
  }
  $('mc-look-continue').onclick=()=>void continueWithMood();
  $('mc-look-make').onclick=()=>void continueWithMood(true);

  // Mobile navigation follows the native PV Lab links, with a genuine close action.
  const header=$('mc-explore-header'),menu=$('mc-menu-toggle');
  if(header&&menu){
    const closeMenu=()=>{
      header.classList.remove('is-menu-open');
      menu.setAttribute('aria-expanded','false');
      menu.setAttribute('aria-label','Open navigation menu');
    };
    menu.addEventListener('click',()=>{
      const opening=!header.classList.contains('is-menu-open');
      header.classList.toggle('is-menu-open',opening);
      menu.setAttribute('aria-expanded',String(opening));
      menu.setAttribute('aria-label',opening?'Close navigation menu':'Open navigation menu');
    });
    document.addEventListener('click',event=>{if(!header.contains(event.target))closeMenu()});
    document.addEventListener('keydown',event=>{if(event.key==='Escape')closeMenu()});
    header.querySelectorAll('.mc-navigation a').forEach(link=>link.addEventListener('click',closeMenu));
  }

  const requested=new URLSearchParams(location.search).get('mood');
  if(requested&&moodById(requested))showMood(moodById(requested));
}
if(typeof document!=='undefined')initialize();
