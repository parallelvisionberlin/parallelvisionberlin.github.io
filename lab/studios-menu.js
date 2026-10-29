// Shared Studios navigation. Preserve approved Beauty and Fashion artwork; Full Editorial and Retouch retain their artwork.
// Do not redraw original photography or baked-in typography.
(()=>{
 const script=document.currentScript,base=new URL('./',script?.src||location.href);
 const url=path=>new URL(path,base).href;
 const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
 const sprite=url('visuals/beauty/studios-original-reference.svg');
 const retouchCard=url('visuals/beauty/retouch-studio-reference-card.svg');
 const editorialHero='https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/6b5a3dd5-7d0e-46df-bd99-a1dbeb9c010a.png';
 const headers=document.querySelectorAll('.landing-header,.studio-header,.beauty-header');
 for(const header of headers){
  if(header.querySelector('.pv-studios-trigger'))continue;
  const original=header.querySelector('#tool-fashion')||[...header.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.includes('tool=fashion'));
  if(!original)continue;
  const shell=document.createElement('span');shell.className='pv-studios-menu';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='pv-studios-trigger';trigger.innerHTML='Studios<svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','pv-studios-panel');
  const panel=document.createElement('div');panel.id='pv-studios-panel';panel.className='pv-studios-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Studios');
  const artwork='<img class="pv-studios-artwork" alt="" loading="lazy" decoding="async" src="'+sprite+'">';
  panel.innerHTML='<span class="pv-studios-kicker">STUDIOS</span>'+
   '<div class="pv-studios-grid">'+
     '<section class="pv-studios-tile pv-studios-beauty">'+artwork+'<a aria-label="Beauty Studio" href="'+url('beauty.html')+'"></a></section>'+
     '<section class="pv-studios-tile pv-studios-fashion">'+artwork+'</section>'+
     '<section class="pv-studios-tile pv-studios-editorial"><img class="pv-studios-editorial-artwork" alt="" loading="lazy" decoding="async" src="'+editorialHero+'"><div class="pv-studios-editorial-copy"><strong>Full<br>Editorial</strong><p>Build a complete fashion story.</p><span class="pv-studios-editorial-go" aria-hidden="true">'+arrow+'</span></div><a aria-label="Full Editorial" href="'+url('full-editorial.html')+'"></a></section>'+
     '<section class="pv-studios-tile pv-studios-retouch"><img class="pv-studios-retouch-artwork" alt="" loading="lazy" decoding="async" src="'+retouchCard+'"><a class="pv-studios-retouch-link" aria-label="Retouch Studio" href="'+url('studio.html?tool=retouch')+'"></a></section>'+
   '</div>'+
   '<div class="pv-studios-secondary"><a class="pv-studios-character-link" href="'+url('studio.html?tool=image&createCharacter=1')+'">Character Studio'+arrow+'</a></div>';
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
   const rect=trigger.getBoundingClientRect(),width=Math.min(1400,innerWidth-28),left=Math.max(14,Math.min(rect.left-24,innerWidth-width-14)),top=Math.max(10,rect.bottom+16);
   if(rect.bottom<0){close();return;}
   Object.assign(panel.style,{width:width+'px',left:left+'px',top:top+'px',maxHeight:Math.max(100,innerHeight-top-14)+'px'});
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
