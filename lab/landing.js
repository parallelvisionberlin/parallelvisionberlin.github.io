const films=[...document.querySelectorAll('.hero-film')];
const toggle=document.getElementById('film-toggle');
const choices=[...document.querySelectorAll('[data-film]')];
const reduced=matchMedia('(prefers-reduced-motion: reduce)');
const hero=document.querySelector('.lab-hero');
let active=0,userPaused=false,heroVisible=true;
function source(video){if(!video.getAttribute('src')){video.src=matchMedia('(max-width: 700px)').matches?video.dataset.mobile:video.dataset.desktop;video.load();}}
function syncToggle(){const paused=films[active].paused;toggle.textContent=paused?'Play film ▷':'Pause film Ⅱ';toggle.setAttribute('aria-label',paused?'Play background film':'Pause background film');}
async function play(video){source(video);try{await video.play();}catch{syncToggle();}}
function show(index,manual=false){films[active].pause();films[active].classList.remove('is-playing');active=index;const film=films[active];document.querySelector('.hero-poster').src=film.poster;document.querySelector('.hero-poster').alt=['Cabizbajo in sculptural black tailoring','Élorian in the Lotus 2063 collection','Nina FOK portrait with masks'][active];document.querySelector('.film-credit').textContent=film.dataset.credit;choices.forEach((b,i)=>b.setAttribute('aria-pressed',String(i===active)));if(manual)userPaused=false;if(heroVisible&&!document.hidden&&!userPaused&&(!reduced.matches||manual))void play(film);syncToggle();}
films.forEach((film,index)=>{film.addEventListener('playing',()=>{if(index!==active){film.pause();return;}film.classList.add('is-playing');syncToggle();});film.addEventListener('pause',syncToggle);film.addEventListener('ended',()=>{if(index===active&&!userPaused&&!reduced.matches)show((active+1)%films.length);});film.addEventListener('error',()=>{film.classList.remove('is-playing');syncToggle();});});
choices.forEach((button,index)=>button.addEventListener('click',()=>show(index,true)));
toggle.hidden=false;toggle.addEventListener('click',()=>{const film=films[active];userPaused=!film.paused;if(film.paused)void play(film);else film.pause();});
const visibility=new IntersectionObserver(entries=>{heroVisible=entries[0].isIntersecting;if(heroVisible&&!document.hidden&&!userPaused&&!reduced.matches)void play(films[active]);else films[active].pause();},{threshold:.08});visibility.observe(hero);
const cardFilms=[...document.querySelectorAll('.card-film')];
const visibleCards=new Set();
const cardVisibility=new IntersectionObserver(entries=>entries.forEach(entry=>{const video=entry.target;if(entry.isIntersecting){visibleCards.add(video);if(!document.hidden&&!reduced.matches)void play(video);}else{visibleCards.delete(video);video.pause();}}),{threshold:.15});cardFilms.forEach(video=>cardVisibility.observe(video));
document.addEventListener('visibilitychange',()=>{if(document.hidden){films.forEach(v=>v.pause());cardFilms.forEach(v=>v.pause());}else if(!reduced.matches){if(heroVisible&&!userPaused)void play(films[active]);visibleCards.forEach(v=>void play(v));}});
reduced.addEventListener('change',()=>{if(reduced.matches){films.forEach(v=>v.pause());cardFilms.forEach(v=>v.pause());}else{if(heroVisible&&!userPaused)void play(films[active]);visibleCards.forEach(v=>void play(v));}});
