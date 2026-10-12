import {saveMoodHandoff,validateMoodHandoff} from './mood-handoff.js?v=20261011-discovery1';

// The homepage only carries the chosen photo into Mood Creator. It does not
// upload media, analyze a Mood, or authorize an image generation.
export async function startHomeMood(files,{save=saveMoodHandoff,navigate=url=>location.assign(url)}={}){
  const selected=Array.from(files||[]);
  if(selected.length!==1)throw Error('Choose one photograph to start. You can add more in Mood Creator.');
  const input=validateMoodHandoff({file:selected[0]});
  const id=await save(input);
  if(!id)throw Error('The photograph could not be prepared. Please choose it again.');
  const destination='./mood-creator.html?handoff='+encodeURIComponent(id)+'#workspace';
  navigate(destination);
  return destination;
}

export function initHomeMood(root=document){
  const drop=root.getElementById('mc-home-drop'),input=root.getElementById('mc-home-upload');
  const status=root.getElementById('mc-home-status'),label=root.getElementById('mc-home-drop-label');
  if(!drop||!input||!status||!label)return;
  const triggers=[...root.querySelectorAll('[data-mc-home-upload]')];
  let busy=false,dragDepth=0;
  const isFileDrag=event=>Array.from(event.dataTransfer?.types||[]).includes('Files');
  function setBusy(value){
    busy=value;input.disabled=value;drop.setAttribute('aria-busy',String(value));
    for(const trigger of triggers)trigger.setAttribute('aria-disabled',String(value));
    label.textContent=value?'Opening your Mood…':'Drop your image here';
  }
  async function accept(files){
    if(busy||!files?.length)return;
    status.hidden=true;status.textContent='';setBusy(true);
    try{await startHomeMood(files);}
    catch(error){
      status.textContent=error.message||'Your photograph could not be opened. Please try again.';
      status.hidden=false;setBusy(false);
    }
  }
  for(const trigger of triggers)trigger.addEventListener('click',event=>{
    event.preventDefault();if(!busy)input.click();
  });
  input.addEventListener('change',()=>{
    const files=Array.from(input.files||[]);input.value='';void accept(files);
  });
  drop.addEventListener('dragenter',event=>{
    if(!isFileDrag(event))return;
    event.preventDefault();dragDepth++;if(!busy)drop.classList.add('is-over');
  });
  drop.addEventListener('dragover',event=>{
    if(!isFileDrag(event))return;
    event.preventDefault();event.dataTransfer.dropEffect=busy?'none':'copy';
    if(!busy)drop.classList.add('is-over');
  });
  drop.addEventListener('dragleave',()=>{
    dragDepth=Math.max(0,dragDepth-1);if(!dragDepth)drop.classList.remove('is-over');
  });
  drop.addEventListener('drop',event=>{
    if(!isFileDrag(event)&&!event.dataTransfer?.files?.length)return;
    event.preventDefault();dragDepth=0;drop.classList.remove('is-over');
    void accept(event.dataTransfer.files);
  });
  // Re-enable the picker if the visitor returns with the browser Back button.
  window.addEventListener('pageshow',()=>{setBusy(false);dragDepth=0;drop.classList.remove('is-over');});
}
if(typeof document!=='undefined')initHomeMood();
