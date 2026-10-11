import {saveMoodHandoff} from './mood-handoff.js?v=20261011-discovery1';
const $=id=>document.getElementById(id);
let selected=null,file=null,photoURL='',opener=null;
let previewURL=mood=>mood.preview,detailURL=mood=>mood.previewFull||mood.preview;
const detail=$('mood-detail');
const setPhoto=next=>{if(photoURL)URL.revokeObjectURL(photoURL);file=next;photoURL=next?URL.createObjectURL(next):'';$('photo-preview').src=photoURL;$('photo-preview').hidden=!next;$('remove-photo').hidden=!next;$('continue-create').disabled=!next;};
function openMood(mood,button){selected=mood;opener=button;$('detail-title').textContent=mood.name;$('detail-description').textContent=mood.description||'';$('detail-image').src=detailURL(mood);$('detail-image').onerror=()=>{$('detail-image').onerror=null;$('detail-image').src=mood.preview;};$('use-mood').hidden=false;$('photo-picker').hidden=true;$('continue-create').hidden=true;$('disclosure').hidden=true;$('photo-error').textContent='';detail.showModal();detail.focus({preventScroll:true});detail.scrollTop=0;}
$('close-detail').onclick=()=>detail.close();detail.addEventListener('close',()=>opener?.focus());
$('use-mood').onclick=()=>{$('use-mood').hidden=true;$('photo-picker').hidden=false;$('continue-create').hidden=false;$('disclosure').hidden=false;$('continue-create').disabled=!file;$('photo-input').click();};
$('photo-input').onchange=async event=>{const next=event.target.files[0];if(!next)return;$('photo-error').textContent='';if(!['image/jpeg','image/png','image/webp'].includes(next.type)||next.size>10*1024*1024||!next.size){$('photo-error').textContent='Choose a JPG, PNG or WebP photo up to 10 MB.';event.target.value='';return;}setPhoto(next);};
$('remove-photo').onclick=()=>{setPhoto(null);$('photo-input').value='';};
$('continue-create').onclick=async()=>{if(!file||!selected)return;const button=$('continue-create');button.disabled=true;$('photo-error').textContent='';try{const handoff=await saveMoodHandoff({file});const url=new URL('./studio.html',location.href);url.searchParams.set('tool','image');url.searchParams.set('native','1');url.searchParams.set('mood',selected.id);url.searchParams.set('handoff',handoff);location.href=url.href;}catch(error){$('photo-error').textContent=error.message;}finally{button.disabled=false;}};
try{
  const {MOODS,moodPreviewURL}=await import('./moods.js?app=4');
  previewURL=mood=>moodPreviewURL(mood);detailURL=mood=>moodPreviewURL(mood,{detail:true});
  const order=['hong-kong-nights','night-flash','dreamcore','90s-cinema','polaroid-600'];
  const moods=[...MOODS].sort((a,b)=>(order.includes(a.id)?order.indexOf(a.id):100)-(order.includes(b.id)?order.indexOf(b.id):100));
  const hero=moods[0];$('hero-image').src=detailURL(hero);$('hero-image').onerror=()=>{$('hero-image').onerror=null;$('hero-image').src=hero.preview;};$('hero-name').textContent=hero.name;$('featured').onclick=()=>openMood(hero,$('featured'));$('count').textContent=String(moods.length).padStart(2,'0')+' LOOKS';
  for(const mood of moods){const button=document.createElement('button');button.className='mood-card';button.setAttribute('aria-label','Explore '+mood.name);const frame=document.createElement('span');frame.className='card-image';const img=document.createElement('img');img.src=previewURL(mood);img.onerror=()=>{img.onerror=null;img.src=mood.preview;};img.alt=mood.name;img.loading=$('mood-grid').children.length<4?'eager':'lazy';img.decoding='async';img.width=420;img.height=560;frame.append(img);const name=document.createElement('span');name.className='card-name';name.textContent=mood.name;const category=document.createElement('span');category.className='card-category';category.textContent=mood.category||'Curated Mood';button.append(frame,name,category);button.onclick=()=>openMood(mood,button);$('mood-grid').append(button);}
  window.ReactNativeWebView?.postMessage(JSON.stringify({type:'PV_LAB_READY'}));
}catch{$('load-error').hidden=false;}
