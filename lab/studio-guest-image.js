import {INSPIRATION_VARIATIONS,createInspirationRotation} from './inspiration-looks.js?v=20261019-chrome1';
// Public-only Image Studio preview. No authentication, wallet or generation API calls.
const gate=document.getElementById('gate');
const composer=document.getElementById('pv-guest-composer');
const prompt=document.getElementById('pv-guest-prompt');
const cards=[...document.querySelectorAll('[data-guest-mood]')];
const moodButton=document.getElementById('pv-guest-moods');
const draftKey='pv-lab-guest-image-draft-v1';
const inspirationRotation=createInspirationRotation(sessionStorage);

let selected='';
function showSelection(){
  for(const button of cards)button.setAttribute('aria-pressed',String(button.dataset.guestMood===selected));
}
function storeDraft(){
  try{sessionStorage.setItem(draftKey,JSON.stringify({prompt:prompt.value.slice(0,5000),mood:selected,at:Date.now()}));}catch{}
}
try{
  const saved=JSON.parse(sessionStorage.getItem(draftKey)||'null');
  if(saved&&Number.isFinite(saved.at)&&Date.now()-saved.at<30*60*1000&&saved.at<Date.now()+60000){
    prompt.value=typeof saved.prompt==='string'?saved.prompt.slice(0,5000):'';
    selected=Object.hasOwn(INSPIRATION_VARIATIONS,saved.mood)?saved.mood:'';
  }
}catch{}
showSelection();
cards.forEach(button=>button.addEventListener('click',()=>{
  const choice=inspirationRotation.select(button.dataset.guestMood,prompt.value);
  if(!choice)return;
  selected=button.dataset.guestMood;
  prompt.value=choice.prompt;
  showSelection();storeDraft();
  // Selecting a Mood prepares the prompt without invoking the iOS keyboard.
  // On phones bring the full editor and Generate button into view instead.
  if(window.matchMedia('(max-width:680px)').matches){
    if(document.activeElement===prompt)prompt.blur();
    window.requestAnimationFrame(()=>composer?.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
      block:'start'
    }));
  }
  // Desktop also keeps focus on the chosen card. Editing starts only after
  // the user intentionally clicks the prompt deck.
}));
prompt.addEventListener('input',storeDraft);
// A public Mood button belongs to the seven looks already on this page.
// No redirect to an unrelated Moods route and no surprise sign-in.
moodButton?.addEventListener('click',()=>{
  const first=cards[0],carousel=document.getElementById('pv-guest-cards');
  if(!first||!carousel)return;
  carousel.scrollIntoView({
    behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
    block:'center'
  });
  first.focus({preventScroll:true});
});
function requestSignIn(){
  storeDraft();
  const signIn=document.getElementById('signin');
  if(signIn&&!signIn.disabled)signIn.click();
  else document.getElementById('auth-status').textContent='Sign-in is loading. Please try again in a moment.';
}
// Account-only tools share the real Clerk entry point; none navigate to an
// arbitrary public page or advertise unsupported anonymous generation.
composer?.querySelectorAll('[data-guest-signin]').forEach(button=>
  button.addEventListener('click',requestSignIn)
);
composer?.addEventListener('submit',event=>{
  event.preventDefault();
  requestSignIn();
});
// Other tool tabs require an account. Keep the public Image preview visible
// when the visitor cancels sign-in; their selected tool opens after login.
document.querySelectorAll('#studio-header .tool-tab').forEach(button=>{
  if(button.id==='tool-image')return;
  button.addEventListener('click',event=>{
    if(!gate||gate.hidden)return;
    event.preventDefault();event.stopImmediatePropagation();
    const tool=button.id.replace(/^tool-/,'');
    const url=new URL(location.href);
    url.searchParams.set('tool',tool);
    history.replaceState(history.state,'',url);
    const signIn=document.getElementById('signin');
    if(signIn&&!signIn.disabled)signIn.click();
  },true);
});
