import {moodById} from './moods.js?v=20261011-berlin-rave1';
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
    status.textContent='Photograph ready. Continue in Image to transform it.';
    return true;
  }
  function showMood(selected,photo=null){
    if(!selected)return;
    if(dialog.open)dialog.close();
    mood=selected;clearPhoto();direction.value='';status.textContent='';
    $('mc-look-preview').src=selected.preview;
    $('mc-look-preview').alt=selected.name+' aesthetic';
    $('mc-look-title').textContent=selected.name;
    $('mc-look-description').textContent=selected.id==='berlin-rave'?selected.description+'. This mood replaces the outfit while keeping your identity, pose and location.':selected.description+'. Keep your own subject and scene.';
    if(photo)attachPhoto(photo);
    dialog.showModal();
  }
  function close(){if(dialog.open)dialog.close();}
  dialog.addEventListener('close',()=>{
    clearPhoto();mood=null;busy=false;
    $('mc-look-make').disabled=false;$('mc-look-continue').disabled=false;
    $('mc-look-preview').removeAttribute('src');
  });
  $('mc-look-close').onclick=close;
  dialog.addEventListener('click',event=>{if(event.target===dialog)close();});
  fileInput.addEventListener('change',()=>{if(fileInput.files?.[0])attachPhoto(fileInput.files[0]);});
  $('mc-look-file-clear').onclick=()=>{clearPhoto();status.textContent='Photograph removed. You may still continue with a written idea.';};
  zone.addEventListener('dragover',event=>{if(event.dataTransfer?.types?.includes('Files')){event.preventDefault();zone.classList.add('is-over');}});
  zone.addEventListener('dragleave',()=>zone.classList.remove('is-over'));
  zone.addEventListener('drop',event=>{if(event.dataTransfer?.files?.length){event.preventDefault();zone.classList.remove('is-over');attachPhoto(event.dataTransfer.files[0]);}});
  for(const card of document.querySelectorAll('.mc-look-card[data-mood-id]')){
    const selected=moodById(card.dataset.moodId);if(!selected)continue;
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
  $('mc-create-look').onclick=()=>location.assign('./mood-creator.html?start=image');
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
  const requested=new URLSearchParams(location.search).get('mood');
  if(requested&&moodById(requested))showMood(moodById(requested));
}
if(typeof document!=='undefined')initialize();
