const film=document.getElementById('hero-film');
const toggle=document.getElementById('film-toggle');
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
let userPaused=false;
function syncToggle(){toggle.replaceChildren(document.createTextNode(film.paused?'Play film ':'Pause film '));const icon=document.createElement('span');icon.setAttribute('aria-hidden','true');icon.textContent=film.paused?'▷':'Ⅱ';toggle.append(icon);toggle.setAttribute('aria-label',film.paused?'Play background film':'Pause background film');}
async function play(){if(!film.src){film.src=matchMedia('(max-width: 700px)').matches?film.dataset.mobile:film.dataset.desktop;film.load();}try{await film.play();}catch{syncToggle();}}
film.addEventListener('playing',()=>{film.classList.add('is-playing');syncToggle();});film.addEventListener('pause',syncToggle);film.addEventListener('error',()=>{film.classList.remove('is-playing');toggle.hidden=true;});
toggle.hidden=false;toggle.addEventListener('click',()=>{userPaused=!film.paused;if(film.paused)void play();else film.pause();});
const visibility=new IntersectionObserver(entries=>{if(entries[0].isIntersecting&&!document.hidden&&!userPaused&&!reduced.matches)void play();else film.pause();},{threshold:.08});visibility.observe(film);
document.addEventListener('visibilitychange',()=>{if(document.hidden)film.pause();else if(!userPaused&&!reduced.matches&&film.getBoundingClientRect().bottom>0)void play();});
reduced.addEventListener('change',()=>{if(reduced.matches)film.pause();});
