// Image Studio Inspiration expansion. Deliberately separate from Moods.
// No automatic generation, credit changes, uploads or model/provider changes.
import {INSPIRATION_SCENES} from './inspiration-catalog-data.js?v=20261111-1';
const categories=['All','Original','Cinema','After Hours','Fashion','Analog','Street','Future','Intimacy','Atmospheres'];
const priority=['hotel-intimacy','post-human','desert-sculptures','chrome-skin','berlin-club','italian-1963','tokyo-4am','red-room'];
const rank=new Map(priority.map((id,index)=>[id,index]));
const sorted=[...INSPIRATION_SCENES].sort((a,b)=>(rank.get(a.id)??100)-(rank.get(b.id)??100));
const originals=[...document.querySelectorAll('#pv-guest-cards > [data-guest-mood]')].map(button=>({
  id:button.dataset.guestMood,
  title:button.querySelector('span')?.firstChild?.textContent?.trim()||'Inspiration',
  category:'Original',
  cover:button.querySelector('img')?.getAttribute('src'),
  original:true
}));
const existingNames=new Set(originals.map(item=>item.title.toLowerCase()));
const entries=[...originals,...sorted.filter(item=>!existingNames.has(item.title.toLowerCase()))];
function photo(item){
  const img=document.createElement('img');
  img.src=item.cover;img.alt='';img.loading='lazy';img.decoding='async';
  return img;
}
function select(item){
  const accepted={id:item.id,prompt:item.prompt,applied:false};
  window.dispatchEvent(new CustomEvent('pv-inspiration-concept',{detail:accepted}));
  if(!accepted.applied)return false;
  for(const button of document.querySelectorAll('[data-inspiration-concept]'))
    button.setAttribute('aria-pressed',String(button.dataset.inspirationConcept===item.id));
  for(const button of document.querySelectorAll('[data-welcome-mood],[data-guest-mood]'))
    button.setAttribute('aria-pressed','false');
  return true;
}
function carouselCard(item,guest){
  const button=document.createElement('button');
  button.type='button';button.dataset.inspirationConcept=item.id;
  button.className=guest?'pv-guest-card':'lab-welcome-preset';
  button.setAttribute('aria-pressed','false');
  button.setAttribute('aria-label','Select '+item.title+' Inspiration');
  button.title=item.title+' · '+item.category;
  button.append(photo(item));
  if(guest){
    const caption=document.createElement('span');
    caption.textContent=item.title;
    const small=document.createElement('small');small.textContent=item.category.toUpperCase();
    caption.append(small);button.append(caption);
  }else{
    const strong=document.createElement('strong');strong.textContent=item.title;
    button.append(strong);
  }
  button.addEventListener('click',()=>select(item));
  return button;
}
let dialog,restoreFocus;
function openAll(){
  if(!dialog){
    dialog=document.createElement('dialog');
    dialog.className='pv-inspiration-catalog';
    dialog.setAttribute('aria-labelledby','pv-inspiration-catalog-title');
    const header=document.createElement('div');header.className='pv-inspiration-catalog-header';
    const copy=document.createElement('div');
    const title=document.createElement('h2');title.id='pv-inspiration-catalog-title';title.textContent='Inspiration';
    const subtitle=document.createElement('p');subtitle.textContent='Explore a world. Edit its prompt. Generate when you choose.';
    copy.append(title,subtitle);
    const close=document.createElement('button');close.type='button';close.className='pv-inspiration-catalog-close';
    close.textContent='Close';close.setAttribute('aria-label','Close Inspiration gallery');
    close.onclick=()=>dialog.close();
    header.append(copy,close);
    const filters=document.createElement('div');filters.className='pv-inspiration-catalog-filters';
    filters.setAttribute('role','group');filters.setAttribute('aria-label','Inspiration categories');
    const gallery=document.createElement('div');gallery.className='pv-inspiration-catalog-grid';
    let category='All';
    function render(){
      gallery.replaceChildren();
      for(const item of entries){
        if(category!=='All'&&item.category!==category)continue;
        const button=document.createElement('button');button.type='button';
        button.className='pv-inspiration-catalog-card';button.setAttribute('aria-label','Select '+item.title);
        button.append(photo(item));
        const name=document.createElement('strong');name.textContent=item.title;
        const sub=document.createElement('small');sub.textContent=item.category;
        button.append(name,sub);
        button.onclick=()=>{
          if(item.original){
            const owner=!!document.querySelector('#app.image-studio-active:not([hidden]) #lab-welcome-start:not([hidden])');
            const target=document.querySelector(owner?
              '[data-welcome-mood="'+item.id+'"]':'[data-guest-mood="'+item.id+'"]');
            dialog.close();target?.click();
          }else if(select(item))dialog.close();
        };
        gallery.append(button);
      }
      for(const b of filters.querySelectorAll('button'))
        b.setAttribute('aria-pressed',String(b.dataset.category===category));
    }
    for(const name of categories){
      const button=document.createElement('button');button.type='button';
      button.dataset.category=name;button.textContent=name;button.setAttribute('aria-pressed',String(name===category));
      button.onclick=()=>{category=name;gallery.scrollTop=0;render();};
      filters.append(button);
    }
    dialog.append(header,filters,gallery);
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});
    dialog.addEventListener('close',()=>restoreFocus?.focus({preventScroll:true}));
    document.body.append(dialog);render();
  }
  restoreFocus=document.activeElement;dialog.showModal();
}
for(const shell of document.querySelectorAll('.inspiration-carousel-shell')){
  const track=shell.querySelector('.pv-guest-cards,.lab-welcome-presets');
  if(!track)continue;
  const guest=track.classList.contains('pv-guest-cards');
  const inTrack=new Set([...track.querySelectorAll(':scope > button')].map(button=>
    (button.querySelector('span,strong')?.firstChild?.textContent||'').trim().toLowerCase()));
  for(const item of sorted)if(!inTrack.has(item.title.toLowerCase()))track.append(carouselCard(item,guest));
  const viewAll=document.createElement('button');
  viewAll.type='button';viewAll.className='pv-inspiration-view-all';
  viewAll.textContent='View all';viewAll.setAttribute('aria-label','View all Inspiration cards');
  viewAll.addEventListener('click',openAll);shell.append(viewAll);
}
const stylesheet=document.createElement('link');
stylesheet.rel='stylesheet';stylesheet.href='./inspiration-catalog.css?v=20261111-1';
document.head.append(stylesheet);
