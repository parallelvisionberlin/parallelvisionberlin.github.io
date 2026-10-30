// Shared Studios navigation. Preserve approved Beauty and Fashion artwork; Full Editorial and Retouch retain their artwork.
// Do not redraw original photography or baked-in typography.
(()=>{
 const script=document.currentScript,base=new URL('./',script?.src||location.href);
 const url=path=>new URL(path,base).href;
 const beautyHero=url('visuals/beauty/beauty-veil-editorial.webp');
 const sprite=url('visuals/beauty/studios-original-reference.svg');
 const retouchCard=url('visuals/beauty/retouch-studio-reference-card.svg');
 const editorialHero='https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/6b5a3dd5-7d0e-46df-bd99-a1dbeb9c010a.png';
 const arrow='<span class="pv-studios-arrow" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M3 12h17m-6-6 6 6-6 6"/></svg></span>';
 const foot=caption=>'<div class="pv-studios-foot"><span class="pv-studios-foot-label">'+caption+'</span><span class="pv-studios-foot-rule" aria-hidden="true"></span>'+arrow+'</div>';
 const headers=document.querySelectorAll('.landing-header,.studio-header,.beauty-header');
 for(const header of headers){
  if(header.querySelector('.pv-studios-trigger'))continue;
  const original=header.querySelector('#tool-fashion')||[...header.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.includes('tool=fashion'));
  if(!original)continue;
  const shell=document.createElement('span');shell.className='pv-studios-menu';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='pv-studios-trigger';trigger.innerHTML='Studios<svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','pv-studios-panel');
  const panel=document.createElement('div');panel.id='pv-studios-panel';panel.className='pv-studios-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Studios');
  panel.innerHTML='<div class="pv-studios-panel-head"><span class="pv-studios-kicker">STUDIOS</span><span class="pv-studios-heading">CREATIVE STUDIOS</span></div>'+
   '<div class="pv-studios-grid">'+
     '<section class="pv-studios-tile pv-studios-beauty"><div class="pv-studios-photo"><img class="pv-studios-beauty-artwork" alt="" loading="lazy" decoding="async" src="'+beautyHero+'"></div><div class="pv-studios-meta"><strong><span>Beauty</span><span>Studio</span></strong>'+foot('Portrait &amp; Beauty')+'</div><a aria-label="Beauty Studio" href="'+url('beauty.html')+'"></a></section>'+
     '<section class="pv-studios-tile pv-studios-fashion"><div class="pv-studios-photo"><img class="pv-studios-fashion-artwork" alt="" loading="lazy" decoding="async" src="'+sprite+'"></div><div class="pv-studios-meta"><strong><span>Fashion</span><span>Studio</span></strong>'+foot('Style &amp; Campaign')+'</div></section>'+
     '<section class="pv-studios-tile pv-studios-editorial"><div class="pv-studios-photo"><img class="pv-studios-editorial-artwork" alt="" loading="lazy" decoding="async" src="'+editorialHero+'"></div><div class="pv-studios-editorial-copy"><strong><span>Full</span><span>Editorial</span></strong>'+foot('Complete Fashion Story')+'</div><a aria-label="Full Editorial" href="'+url('full-editorial.html')+'"></a></section>'+
     '<section class="pv-studios-tile pv-studios-retouch"><div class="pv-studios-photo"><img class="pv-studios-retouch-artwork" alt="" loading="lazy" decoding="async" src="'+retouchCard+'"></div><div class="pv-studios-meta"><strong><span>Retouch</span><span>Studio</span></strong>'+foot('Precision Edits')+'</div><a class="pv-studios-retouch-link" aria-label="Retouch Studio" href="'+url('studio.html?tool=retouch')+'"></a></section>'+
   '</div>'+
   '<div class="pv-studios-secondary"><a class="pv-studios-character-link" href="'+url('studio.html?tool=image&createCharacter=1')+'">Character Studio</a></div>';
  original.before(shell);shell.append(trigger,panel);panel.querySelector('.pv-studios-fashion').append(original);
  // Keep the original live Fashion element so its ID, handlers and return-to-draft behavior survive.
  original.classList.add('pv-studios-fashion-link');original.textContent='';original.setAttribute('aria-label','Fashion Studio');
  const existingRetouch=header.querySelector('#tool-retouch')||[...header.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.includes('tool=retouch'));
  const retouchLink=panel.querySelector('.pv-studios-retouch-link');
  if(existingRetouch?.tagName==='A')retouchLink.href=existingRetouch.href;
  if(existingRetouch?.tagName==='BUTTON')retouchLink.addEventListener('click',event=>{event.preventDefault();existingRetouch.click();});
  const active=()=>trigger.classList.toggle('is-active',(location.pathname.endsWith('/beauty.html')||location.pathname.endsWith('/full-editorial.html')||location.pathname.endsWith('/full-editorial'))||original.getAttribute('aria-pressed')==='true'||existingRetouch?.getAttribute('aria-pressed')==='true');active();
  new MutationObserver(active).observe(original,{attributes:true,attributeFilter:['aria-pressed']});
  if(existingRetouch?.tagName==='BUTTON')new MutationObserver(active).observe(existingRetouch,{attributes:true,attributeFilter:['aria-pressed']});
  function position(){
   const rect=trigger.getBoundingClientRect(),wide=innerWidth>760,width=Math.min(wide?1300:520,innerWidth-28),left=Math.max(14,Math.min(rect.left-(wide?120:12),innerWidth-width-14)),top=Math.max(8,rect.bottom+12);
   if(rect.bottom<0){close();return;}
   Object.assign(panel.style,{width:width+'px',left:left+'px',top:top+'px',maxHeight:Math.max(120,innerHeight-top-12)+'px'});
  }
  function close(restore=false){panel.hidden=true;trigger.setAttribute('aria-expanded','false');if(restore)trigger.focus();}
  function open(){for(const other of document.querySelectorAll('.pv-studios-trigger[aria-expanded="true"]'))if(other!==trigger)other.click();panel.hidden=false;trigger.setAttribute('aria-expanded','true');position();panel.querySelector('a,button')?.focus({preventScroll:true});}
  trigger.addEventListener('click',()=>panel.hidden?open():close());
  trigger.addEventListener('keydown',event=>{if(event.key==='ArrowDown'){event.preventDefault();open();}});
  document.addEventListener('keydown',event=>{if(!panel.hidden&&event.key==='Escape'){event.preventDefault();close(true);}});
  document.addEventListener('pointerdown',event=>{if(!shell.contains(event.target))close();});
  document.addEventListener('focusin',event=>{if(!panel.hidden&&!shell.contains(event.target))close();});
  panel.addEventListener('click',event=>{if(event.target.closest('a,button'))close();});
  window.addEventListener('resize',()=>{if(!panel.hidden)position();},{passive:true});
  document.addEventListener('scroll',()=>{if(!panel.hidden)position();},{capture:true,passive:true});
 }
})();
