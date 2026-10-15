// PV LAB Video model menu. Presentation only: the existing #video-engine owns
// provider availability, selection, price checks, and generation behavior.
const GROUPS=[
  {title:'Best value',ids:['seedance15']},
  {title:'Featured models',ids:['seedance','wan','h3spicy']},
  {title:'Motion & characters',ids:['h3','h3max','klinghf']},
  {title:'Premium & advanced',ids:['seedance4k','wanprime','h3maxfal','omni']}
];
const META={
  seedance:{description:'Start, text, refs & extend · 4–30s · up to 1080p',brand:'bytedance',badge:'Uncensored*'},
  wan:{description:'Start frame or image references · up to 1080p',glyph:'W'},
  klinghf:{description:'Text or start frame · 1080p · Higgsfield',glyph:'K',badge:'Pro'},
  seedance15:{description:'Low-cost motion · 4–12s · optional camera lock',brand:'bytedance',badge:'Low cost'},
  h3:{description:'Start, text & references · up to 2K',glyph:'M'},
  h3max:{description:'Start frame or text · 768p',glyph:'M'},
  h3spicy:{description:'Start frame · up to 1080p',glyph:'M'},
  seedance4k:{description:'Start frame · upscaled 4K delivery',brand:'bytedance',badge:'4K'},
  wanprime:{description:'Start or references · faster Wan render',glyph:'W',badge:'Prime'},
  h3maxfal:{description:'Up to 12 image references · 1080p',glyph:'M',badge:'Refs'},
  omni:{description:'Start, text & references · up to 4K',brand:'google',badge:'4K'}
};

export function createVideoModelPicker({select,getBusy=()=>false,isActive=()=>true}){
  const trigger=document.getElementById('video-model-trigger');
  const current=document.getElementById('video-model-current');
  if(!select||!trigger||!current)throw new Error('Video model picker controls not found.');
  // A body-level floating menu escapes the Video sidebar's deliberately
  // clipped scroll area, without altering that area or the video layout.
  const popover=document.createElement('section');
  popover.id='video-model-popover';
  popover.className='pv-video-model-popover';
  popover.setAttribute('role','dialog');
  popover.setAttribute('aria-label','Choose video model');
  popover.setAttribute('aria-modal','false');
  popover.hidden=true;

  const head=document.createElement('div');head.className='pv-video-model-head';
  const heading=document.createElement('span');heading.textContent='Choose a model';
  const total=document.createElement('span');total.className='pv-video-model-count';
  head.append(heading,total);

  const searchWrap=document.createElement('div');searchWrap.className='pv-video-model-search-wrap';
  const searchIcon=document.createElement('span');searchIcon.className='pv-video-search-icon';searchIcon.setAttribute('aria-hidden','true');
  searchIcon.innerHTML='<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="10.8" cy="10.8" r="6.6"/><path d="m15.8 15.8 4.3 4.3"/></svg>';
  const search=document.createElement('input');search.type='search';search.autocomplete='off';
  search.placeholder='Search video models';search.setAttribute('aria-label','Search video models');
  searchWrap.append(searchIcon,search);

  const list=document.createElement('div');list.className='pv-video-model-list';
  list.setAttribute('role','group');list.setAttribute('aria-label','Available video models');
  const foot=document.createElement('div');foot.className='pv-video-model-foot';
  foot.textContent='*SpicyAPI lists standard Seedance as uncensored: no added provider scan. Extend uses Higgsfield. Models may still refuse requests.';
  popover.append(head,searchWrap,list,foot);
  document.body.append(popover);
  let open=false,lastFingerprint='',lastSelection='',searchText='';

  function entries(){
    return [...select.options].filter(o=>!o.hidden).map(o=>{
      const meta=META[o.value]||{description:'Video creation',glyph:'◈'};
      return {id:o.value,name:o.textContent.trim(),disabled:o.disabled,meta};
    });
  }

  function icon(entry){
    const span=document.createElement('span');span.className='pv-video-model-icon';span.setAttribute('aria-hidden','true');
    if(entry.meta.brand==='bytedance'||entry.meta.brand==='google'){
      const img=document.createElement('img');
      img.src='./branding/'+entry.meta.brand+'.svg';img.alt='';img.width=21;img.height=21;
      span.append(img);
    }else{
      span.textContent=entry.meta.glyph||'◈';
      span.classList.add('pv-video-model-monogram');
    }
    return span;
  }

  function render(){
    const all=entries(),query=searchText.trim().toLocaleLowerCase(),mapped=new Set();
    const fragments=document.createDocumentFragment();
    let shown=0;
    for(const group of GROUPS){
      const models=group.ids.map(id=>all.find(e=>e.id===id)).filter(Boolean)
        .filter(e=>(e.name+' '+e.meta.description+' '+group.title).toLocaleLowerCase().includes(query));
      if(!models.length)continue;
      const section=document.createElement('section');section.className='pv-video-model-group';
      const title=document.createElement('h3');title.textContent=group.title;section.append(title);
      for(const item of models){
        mapped.add(item.id);shown++;
        section.append(makeRow(item));
      }
      fragments.append(section);
    }
    // A future server-enabled model should remain discoverable even before
    // editorial metadata is updated.
    const extra=all.filter(e=>!mapped.has(e.id)&&(e.name+' '+e.meta.description).toLocaleLowerCase().includes(query));
    if(extra.length){
      const section=document.createElement('section');section.className='pv-video-model-group';
      const title=document.createElement('h3');title.textContent='More models';section.append(title);
      for(const item of extra){section.append(makeRow(item));shown++;}
      fragments.append(section);
    }
    if(!shown){
      const empty=document.createElement('p');empty.className='pv-video-model-empty';empty.textContent='No matching video models';fragments.append(empty);
    }
    list.replaceChildren(fragments);
    total.textContent=shown+' model'+(shown===1?'':'s');
    position();
  }

  function makeRow(item){
    const button=document.createElement('button');button.type='button';
    button.className='pv-video-model-item';button.dataset.model=item.id;
    button.disabled=item.disabled||getBusy();
    button.setAttribute('aria-pressed',String(select.value===item.id));
    button.title=item.disabled?'Not available for this account':item.name;
    const copy=document.createElement('span');copy.className='pv-video-model-copy';
    const title=document.createElement('strong');title.textContent=item.name;
    const desc=document.createElement('small');desc.textContent=item.disabled?'Not available with this account':item.meta.description;
    copy.append(title,desc);
    const trail=document.createElement('span');trail.className='pv-video-model-trail';
    if(item.meta.badge){
      const badge=document.createElement('span');badge.className='pv-video-model-badge';
      badge.textContent=item.meta.badge;
      if(item.id==='seedance')badge.dataset.tone='purple';
      if(item.id==='seedance15')badge.dataset.tone='green';
      trail.append(badge);
    }
    if(select.value===item.id){
      const check=document.createElement('span');check.className='pv-video-model-check';
      check.setAttribute('aria-label','Selected');check.textContent='✓';trail.append(check);
    }
    button.append(icon(item),copy,trail);
    button.addEventListener('click',()=>{
      if(button.disabled||getBusy())return;
      select.value=item.id;
      // Trigger the existing validated change pipeline. Do not recreate
      // pricing, mode constraints or generation state in this menu.
      select.dispatchEvent(new Event('change',{bubbles:true}));
      close(true);
      sync();
    });
    return button;
  }

  function position(){
    if(!open)return;
    const vp=window.visualViewport;
    const originX=vp?.offsetLeft||0,originY=vp?.offsetTop||0;
    const availableWidth=vp?.width||window.innerWidth;
    const availableHeight=vp?.height||window.innerHeight;
    const rect=trigger.getBoundingClientRect();
    const headerBottom=document.getElementById('studio-header')?.getBoundingClientRect().bottom||0;
    const width=Math.min(408,Math.max(240,availableWidth-24));
    const left=Math.max(originX+12,Math.min(rect.left,originX+availableWidth-width-12));
    const minimumTop=Math.max(originY+12,headerBottom+14);
    const visualBottom=originY+availableHeight-12;
    // When mobile search opens the keyboard, fit the menu above the keyboard
    // while never letting it touch the fixed top navigation.
    const preferredTop=rect.bottom+10;
    const top=Math.max(minimumTop,Math.min(preferredTop,visualBottom-165));
    const height=Math.max(90,Math.min(480,visualBottom-top));
    popover.style.left=Math.round(left)+'px';
    popover.style.top=Math.round(top)+'px';
    popover.style.width=Math.round(width)+'px';
    popover.style.maxHeight=Math.floor(height)+'px';
  }

  function close(restoreFocus=false){
    if(!open)return;
    open=false;popover.hidden=true;trigger.setAttribute('aria-expanded','false');
    if(restoreFocus&&isActive())trigger.focus({preventScroll:true});
  }

  function show(){
    if(getBusy()||!isActive())return;
    open=true;searchText='';search.value='';lastFingerprint='';
    trigger.setAttribute('aria-expanded','true');
    popover.hidden=false;render();
    if(window.matchMedia('(hover: hover) and (pointer: fine)').matches)
      search.focus({preventScroll:true});
  }

  function sync(){
    const option=select.selectedOptions?.[0];
    current.textContent=option?.textContent?.trim()||'Choose video model';
    trigger.setAttribute('aria-label','Choose video model: '+current.textContent);
    trigger.disabled=getBusy();
    const fingerprint=[...select.options].map(o=>o.value+':'+o.disabled+':'+o.hidden).join('|');
    if(open&&(!isActive()||getBusy())){close();return;}
    if(open&&(fingerprint!==lastFingerprint||lastSelection!==select.value)){
      lastFingerprint=fingerprint;lastSelection=select.value;render();
    }else if(!open){
      lastFingerprint=fingerprint;lastSelection=select.value;
    }
  }

  function moveFocus(event){
    if(!open||!popover.contains(event.target))return;
    if(!['ArrowDown','ArrowUp','Home','End'].includes(event.key))return;
    const buttons=[...list.querySelectorAll('.pv-video-model-item:not(:disabled)')];
    if(!buttons.length)return;
    event.preventDefault();
    const index=buttons.indexOf(document.activeElement);
    let next=index;
    if(event.key==='Home')next=0;
    else if(event.key==='End')next=buttons.length-1;
    else if(event.key==='ArrowDown')next=index<0?0:(index+1)%buttons.length;
    else next=index<0?buttons.length-1:(index-1+buttons.length)%buttons.length;
    buttons[next].focus({preventScroll:true});
    buttons[next].scrollIntoView({block:'nearest'});
  }

  trigger.addEventListener('click',()=>open?close(true):show());
  search.addEventListener('input',()=>{searchText=search.value;list.scrollTop=0;render();});
  popover.addEventListener('keydown',moveFocus);
  document.addEventListener('pointerdown',e=>{
    if(open&&!popover.contains(e.target)&&!trigger.contains(e.target))close();
  });
  document.addEventListener('keydown',e=>{
    if(open&&e.key==='Escape'){e.preventDefault();close(true);}
  });
  document.addEventListener('focusin',e=>{
    if(open&&!popover.contains(e.target)&&e.target!==trigger)close();
  });
  document.addEventListener('scroll',e=>{
    if(open&&!popover.contains(e.target))close();
  },true);
  window.addEventListener('resize',position);
  window.visualViewport?.addEventListener('resize',position);
  window.visualViewport?.addEventListener('scroll',position);
  sync();
  return {sync,close};
}
