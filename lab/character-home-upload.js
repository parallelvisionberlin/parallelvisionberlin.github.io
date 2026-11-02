import {saveModelPhotos,validateModelPhoto} from './editorial-model-handoff.js?v=20261102-eight-photos1';

const zone=document.getElementById('home-model-dropzone');
const input=document.getElementById('home-model-photo');
const plus=zone.querySelector('[data-model-upload]');
const action=zone.querySelector('.lab-character-home__action');
const message=document.getElementById('home-model-status');
const preview=document.getElementById('home-model-preview');
const cover=document.getElementById('home-model-cover');
const count=document.getElementById('home-model-count');
const thumbs=document.getElementById('home-model-thumbs');
const photos=[],urls=new Map();
let busy=false,dragIndex=null;
const MAX=8;
function photoUrl(file){
 if(!urls.has(file))urls.set(file,URL.createObjectURL(file));
 return urls.get(file);
}
function feedback(text=''){
 message.hidden=!text;message.textContent=text;
}
function move(from,to){
 if(busy||from===to||from<0||to<0||from>=photos.length||to>=photos.length)return;
 const [photo]=photos.splice(from,1);
 photos.splice(to,0,photo);render();
}
function remove(index){
 if(busy)return;
 const [photo]=photos.splice(index,1);
 if(photo&&urls.has(photo)){URL.revokeObjectURL(urls.get(photo));urls.delete(photo)}
 feedback();render();
}
function render(){
 const selected=photos.length>0;
 zone.classList.toggle('has-photos',selected);
 preview.hidden=!selected;
 plus.setAttribute('aria-label',selected?'Add another character photo':'Add character photos');
 if(!selected){cover.removeAttribute('src');thumbs.replaceChildren();count.textContent='';return}
 cover.src=photoUrl(photos[0]);cover.alt='Primary character reference';
 count.textContent=photos.length+'/'+MAX;
 thumbs.replaceChildren();
 for(const [index,photo] of photos.entries()){
  const tile=document.createElement('div');tile.className='lab-character-home__thumb';
  tile.draggable=true;tile.title='Drag to reorder. Click to use as primary photo.';
  const select=document.createElement('button');select.type='button';select.className='lab-character-home__thumb-select';
  select.setAttribute('aria-label','Make photo '+(index+1)+' the primary reference');
  select.setAttribute('aria-pressed',String(index===0));
  const img=document.createElement('img');img.src=photoUrl(photo);img.alt='Reference '+(index+1);
  select.append(img);select.addEventListener('click',()=>{feedback();move(index,0)});
  const discard=document.createElement('button');discard.type='button';discard.className='lab-character-home__thumb-remove';
  discard.textContent='×';discard.setAttribute('aria-label','Remove photo '+(index+1));
  discard.addEventListener('click',()=>remove(index));
  tile.addEventListener('dragstart',event=>{
   dragIndex=index;event.dataTransfer.effectAllowed='move';event.dataTransfer.setData('text/plain','pv-character-ref-'+index);
  });
  tile.addEventListener('dragover',event=>{if(dragIndex===null)return;event.preventDefault();event.stopPropagation();event.dataTransfer.dropEffect='move'});
  tile.addEventListener('drop',event=>{
   if(dragIndex===null)return;
   event.preventDefault();event.stopPropagation();const from=dragIndex;dragIndex=null;zone.classList.remove('is-dragover');move(from,index);
  });
  tile.addEventListener('dragend',()=>{dragIndex=null;zone.classList.remove('is-dragover')});
  tile.append(select,discard);thumbs.append(tile);
 }
}
function pick(){
 if(busy)return;
 if(photos.length===MAX){feedback('8/8 photos selected. Remove one to add another.');return}
 input.click();
}
function addPhotos(list){
 if(busy)return;
 const incoming=Array.from(list||[]);
 if(!incoming.length)return;
 let invalid=0,overflow=0;
 for(const file of incoming){
  try{validateModelPhoto(file)}catch{invalid++;continue}
  if(photos.length===MAX){overflow++;continue}
  photos.push(file);
 }
 render();
 if(invalid||overflow)feedback(
  (invalid?'Only JPG, PNG or WebP photos up to 20 MB each. ':'')+
  (overflow?'Maximum 8 reference photos. Remove one to add another.':'')
 );else feedback();
}
plus.addEventListener('click',pick);
action.addEventListener('click',async()=>{
 if(busy)return;
 if(!photos.length){pick();return}
 busy=true;plus.disabled=true;action.disabled=true;feedback('Opening your character…');
 try{
  const id=await saveModelPhotos(photos);
  const destination=new URL('./full-editorial.html',location.href);
  destination.searchParams.set('modelPhoto',id);
  location.assign(destination.href);
 }catch(error){feedback(error.message||'Could not prepare your photos. Try again.');busy=false;plus.disabled=false;action.disabled=false}
});
input.addEventListener('change',event=>{addPhotos(event.target.files);input.value=''});
zone.addEventListener('click',event=>{if(!event.target.closest('button'))pick()});
zone.addEventListener('keydown',event=>{
 if(event.target!==zone)return;
 if(event.key==='Enter'||event.key===' '){event.preventDefault();pick()}
});
zone.addEventListener('dragover',event=>{
 if(dragIndex!==null)return;
 if(!event.dataTransfer?.types?.includes('Files'))return;
 event.preventDefault();event.dataTransfer.dropEffect='copy';zone.classList.add('is-dragover');
});
zone.addEventListener('dragleave',event=>{if(!zone.contains(event.relatedTarget))zone.classList.remove('is-dragover')});
zone.addEventListener('drop',event=>{
 if(dragIndex!==null)return;
 event.preventDefault();zone.classList.remove('is-dragover');addPhotos(event.dataTransfer?.files);
});
window.addEventListener('pageshow',()=>{busy=false;plus.disabled=false;action.disabled=false;render();feedback()});
window.addEventListener('pagehide',()=>{for(const url of urls.values())URL.revokeObjectURL(url);urls.clear()});
render();
