const toggle=document.getElementById('motion-toggle');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const surfaces=[...document.querySelectorAll('[data-motion-surface]')];
let userPaused=false;
function syncMotion(){
 const paused=userPaused||reduced.matches||document.hidden;
 document.body.classList.toggle('motion-paused',paused);
 toggle.hidden=reduced.matches;
 toggle.setAttribute('aria-pressed',String(userPaused));
 toggle.setAttribute('aria-label',userPaused?'Play background motion':'Pause background motion');
 toggle.replaceChildren(document.createTextNode(userPaused?'Play motion ':'Pause motion '));
 const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=userPaused?'▷':'Ⅱ';toggle.append(icon);
}
toggle.addEventListener('click',()=>{userPaused=!userPaused;syncMotion()});
const observer=new IntersectionObserver(entries=>{for(const entry of entries)entry.target.classList.toggle('is-visible',entry.isIntersecting)},{threshold:.08});
surfaces.forEach(surface=>observer.observe(surface));
document.addEventListener('visibilitychange',syncMotion);
reduced.addEventListener('change',syncMotion);
syncMotion();
