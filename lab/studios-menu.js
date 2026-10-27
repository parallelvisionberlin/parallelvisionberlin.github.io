// Shared navigation only. Existing tool buttons retain their IDs and listeners.
(()=>{
 const script=document.currentScript,base=new URL('./',script?.src||location.href);
 const url=path=>new URL(path,base).href;
 const arrow='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 12h15m-6-6 6 6-6 6"/></svg>';
 const headers=document.querySelectorAll('.landing-header,.studio-header,.beauty-header');
 for(const header of headers){
  if(header.querySelector('.pv-studios-trigger'))continue;
  const original=header.querySelector('#tool-fashion')||[...header.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.includes('tool=fashion'));
  if(!original)continue;
  const shell=document.createElement('span');shell.className='pv-studios-menu';
  const trigger=document.createElement('button');trigger.type='button';trigger.className='pv-studios-trigger';trigger.innerHTML='Studios<svg viewBox="0 0 12 8" aria-hidden="true"><path d="m1 1 5 5 5-5"/></svg>';trigger.setAttribute('aria-expanded','false');trigger.setAttribute('aria-controls','pv-studios-panel');
  const panel=document.createElement('div');panel.id='pv-studios-panel';panel.className='pv-studios-panel';panel.hidden=true;panel.setAttribute('role','region');panel.setAttribute('aria-label','Studios');
  panel.innerHTML='<span class="pv-studios-kicker">STUDIOS</span><div class="pv-studios-grid"><section class="pv-studios-fashion"><img class="pv-studios-cover" src="'+url('visuals/beauty/beauty-veil-editorial.webp')+'" alt="Black veil beauty editorial" loading="lazy"><h2>Beauty &amp; Fashion</h2><p>Makeup, hair, skin and new looks.</p><div class="pv-studios-links"><a href="'+url('beauty.html')+'">Beauty Studio'+arrow+'</a></div></section><section class="pv-studios-character"><img class="pv-studios-cover" src="'+url('visuals/character-studies/nina-study.webp')+'" alt="Character portrait study" loading="lazy"><h2>Character Studio</h2><p>Create a character. Return to their identity.</p><a class="pv-studios-character-link" href="'+url('studio.html?tool=image&createCharacter=1')+'">Open studio'+arrow+'</a></section></div>';
  original.before(shell);shell.append(trigger,panel);panel.querySelector('.pv-studios-links').append(original);original.classList.add('pv-studios-fashion-link');
  if(original.tagName==='A')original.textContent='Fashion Studio';else{original.setAttribute('aria-label','Fashion Studio');original.textContent='Fashion Studio';}
  const icon=document.createElement('span');icon.innerHTML=arrow;original.append(icon.firstChild);
  // Retouch is already a working tool; reuse its current navigation and in-studio handler.
  const existingRetouch=header.querySelector('#tool-retouch')||[...header.querySelectorAll('nav a')].find(a=>a.getAttribute('href')?.includes('tool=retouch'));
  const retouchLink=document.createElement('a');retouchLink.className='pv-studios-retouch-link';retouchLink.href=existingRetouch?.href||url('studio.html?tool=retouch');retouchLink.textContent='Retouch Studio';retouchLink.insertAdjacentHTML('beforeend',arrow);
  panel.querySelector('.pv-studios-links').append(retouchLink);
  if(existingRetouch?.tagName==='BUTTON')retouchLink.addEventListener('click',event=>{event.preventDefault();existingRetouch.click();});
  const active=()=>trigger.classList.toggle('is-active',location.pathname.endsWith('/beauty.html')||original.getAttribute('aria-pressed')==='true');active();
  new MutationObserver(active).observe(original,{attributes:true,attributeFilter:['aria-pressed']});
  function position(){
   const rect=trigger.getBoundingClientRect(),width=Math.min(730,innerWidth-28),left=Math.max(14,Math.min(rect.left-24,innerWidth-width-14)),top=Math.max(10,rect.bottom+16);
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
