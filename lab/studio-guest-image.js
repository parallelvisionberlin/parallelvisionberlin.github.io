// Public-only Image Studio preview. No authentication, wallet or generation API calls.
const gate=document.getElementById('gate');
const composer=document.getElementById('pv-guest-composer');
const prompt=document.getElementById('pv-guest-prompt');
const cards=[...document.querySelectorAll('[data-guest-mood]')];
const draftKey='pv-lab-guest-image-draft-v1';
const prompts=Object.freeze({
  'dream-blur':'A photographic blue motion blur, passing headlights and rain-streaked reflections, intimate fragmented detail, realistic long exposure, deep cobalt shadows and light trails, natural film grain and beautiful imperfection.',
  '90s-cinema':'An atmospheric 1990s film still of two friends browsing vinyl records in a dim independent record shop, warm window light, relaxed gestures, layered clothing, believable interior, realistic photography.',
  'fashion-editorial':'A contemporary high-fashion editorial portrait of a woman in a black leather jacket, direct soft flash, natural wet hair, compelling gaze, authentic skin texture, rich deep blacks, striking camera presence, photographic realism.',
  'dreamcore':'An uncanny tranquil indoor swimming pool with pastel pink and peach clouds beyond enormous windows, water reflecting the sunset, quiet tiled architecture, soft ambient light, believable photographed materials, dreamlike serenity.',
  'hong-kong-nights':'Rainy East Asian street at night. A jade-green-lit corner shop with a red sign, one distant pedestrian and an older dark sedan; wet asphalt, deep shadows, humid emerald haze and realistic 35mm film grain.',
  '80s-film':'A quiet golden sunset over a wide ocean beach, ripples breaking on wet sand, a distant dark rocky island, deep orange dusk, tactile analog color, soft warm film grain, peaceful natural landscape photography.'
});
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
    selected=Object.hasOwn(prompts,saved.mood)?saved.mood:'';
  }
}catch{}
showSelection();
cards.forEach(button=>button.addEventListener('click',()=>{
  selected=button.dataset.guestMood;
  prompt.value=prompts[selected]||'';
  showSelection();storeDraft();
  // Selecting a Mood prepares the prompt without invoking the iOS keyboard.
  // On phones bring the full editor and Generate button into view instead.
  if(window.matchMedia('(max-width:680px)').matches){
    if(document.activeElement===prompt)prompt.blur();
    window.requestAnimationFrame(()=>composer?.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
      block:'start'
    }));
  }else{
    prompt.focus({preventScroll:true});
  }
}));
prompt.addEventListener('input',storeDraft);
composer?.addEventListener('submit',event=>{
  event.preventDefault();storeDraft();
  const signIn=document.getElementById('signin');
  if(signIn&&!signIn.disabled)signIn.click();
  else document.getElementById('auth-status').textContent='Sign-in is loading. Please try again in a moment.';
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
