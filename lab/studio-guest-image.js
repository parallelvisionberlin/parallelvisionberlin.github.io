import {INSPIRATION_VARIATIONS,createInspirationRotation} from './inspiration-looks.js?v=20261019-chrome1&fisheyeCover=20261021v1&fisheyeY2K=20261024v1';
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
    // The phone editor is viewport-fixed. Calling scrollIntoView() on it
    // scrolls the document behind the dock and reveals an empty lower page.
    // Nonfixed fallback layouts retain the original reveal behavior.
    if(composer&&getComputedStyle(composer).position!=='fixed'){
      window.requestAnimationFrame(()=>composer.scrollIntoView({
        behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
        block:'start'
      }));
    }
  }
  // Desktop also keeps focus on the chosen card. Editing starts only after
  // the user intentionally clicks the prompt deck.
}));
prompt.addEventListener('input',storeDraft);

// Guest photos are previews held as File objects in this tab. They are never
// sent to R2 or a provider before the real authenticated Studio takes over.
const photoPicker=document.getElementById('pv-guest-image-file');
const photoStrip=document.getElementById('pv-guest-attachments');
const uploadButton=document.getElementById('pv-guest-add');
const baseButton=document.getElementById('pv-guest-base');
const photos=[];
let previewUrls=[];
window.__pvLabGuestFiles=photos;
const allowedPhotos=new Set(['image/png','image/jpeg','image/webp']);
function drawPhotos(){
  for(const url of previewUrls)URL.revokeObjectURL(url);
  previewUrls=[];
  photoStrip.replaceChildren();
  for(const [index,file] of photos.entries()){
    const tile=document.createElement('div');
    tile.className='pv-guest-photo';
    const photo=document.createElement('img');
    const url=URL.createObjectURL(file);
    previewUrls.push(url);
    photo.src=url;
    photo.alt=file.name;
    const remove=document.createElement('button');
    remove.type='button';
    remove.className='pv-guest-photo-remove';
    remove.setAttribute('aria-label','Remove '+file.name);
    remove.textContent='×';
    remove.addEventListener('click',()=>{
      photos.splice(index,1);drawPhotos();storeDraft();
    });
    tile.append(photo,remove);
    photoStrip.append(tile);
  }
  photoStrip.hidden=photos.length===0;
  window.dispatchEvent(new Event('pv-guest-photos-changed'));
}
function choosePhotos(){
  photoPicker?.click();
}
uploadButton?.addEventListener('click',choosePhotos);
baseButton?.addEventListener('click',choosePhotos);
photoPicker?.addEventListener('change',()=>{
  let issue='';
  for(const file of photoPicker.files||[]){
    if(photos.length>=8){issue='You can preview up to eight photographs.';break;}
    if(!allowedPhotos.has(file.type)||file.size===0||file.size>20*1024*1024){
      issue='Choose a JPEG, PNG or WebP photograph under 20 MB.';continue;
    }
    if(photos.some(item=>item.name===file.name&&item.size===file.size&&item.lastModified===file.lastModified))continue;
    photos.push(file);
  }
  photoPicker.value='';
  drawPhotos();storeDraft();
  const notice=document.getElementById('auth-status');
  if(notice)notice.textContent=issue||'Photos are ready on this device. Sign in only when you choose Generate.';
});
window.addEventListener('pagehide',()=>{
  for(const url of previewUrls)URL.revokeObjectURL(url);
  previewUrls=[];
});
// A public Mood button belongs to the seven looks already on this page.
// No redirect to an unrelated Moods route and no surprise sign-in.
moodButton?.addEventListener('click',()=>{
  const first=cards[0],carousel=document.getElementById('pv-guest-cards');
  if(!first||!carousel)return;
  // Cards are already visible in the fixed phone entrance. Do not move the
  // whole page while the user reaches for the Moods carousel.
  if(getComputedStyle(composer).position!=='fixed'){
    carousel.scrollIntoView({
      behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth',
      block:'center'
    });
  }
  first.focus({preventScroll:true});
});
async function requestSignIn(){
  storeDraft();
  const notice=document.getElementById('auth-status');
  const closed=document.getElementById('pv-guest-closed-state');
  if(closed&&!closed.hidden){
    notice.textContent='This previous PV LAB account is closed. Sign out to register a new account.';
    document.getElementById('pv-guest-closed-signout')?.focus();
    return;
  }
  const signIn=document.getElementById('signin');
  if(signIn&&!signIn.disabled){signIn.click();return;}
  // The public page can paint before Clerk finishes loading. A direct
  // user click may finish that same shared Clerk bootstrap, never guessing
  // that an already signed-in closed identity is a new customer.
  try{
    const {loadLabAccount}=await import('./native-account.js?v=20261014-native-photo-picker1&createGallery=20261014-1&generateStable=20261014-1&studioAuth=20261015-1&providerPolicy=20261015-google-only1');
    const account=await loadLabAccount();
    if(account.isSignedIn){
      notice.textContent='Your account is signed in but Studio setup has not completed. Reload to check its status.';
      document.getElementById('auth-retry').hidden=false;
      return;
    }
    await account.openSignIn({forceRedirectUrl:location.href,signUpForceRedirectUrl:location.href});
  }catch{
    notice.textContent='Sign-in could not load. Reload this page and try again.';
    document.getElementById('auth-retry').hidden=false;
  }
}
window.addEventListener('pv-studio-auth-required',requestSignIn);
// Account-only tools share the real Clerk entry point; none navigate to an
// arbitrary public page or advertise unsupported anonymous generation.
composer?.querySelectorAll('[data-guest-signin]').forEach(button=>
  button.addEventListener('click',requestSignIn)
);
composer?.addEventListener('submit',event=>{
  event.preventDefault();
  requestSignIn();
});
// Keep a requested public tool on its own route. The signed-out gate used to
// render Image for ALL destinations, including Video and Upscaler, obscuring
// what the visitor actually chose. Image's approved guest deck is unchanged.
const guestToolPages=Object.freeze({
  image:{name:'Image',title:'Start with a feeling.',description:'Choose a mood or imagine your own.'},
  video:{name:'Video',title:'Video Studio',description:'Create motion from a prompt, starting frame, or reference media.'},
  upscale:{name:'Upscaler',title:'Upscaler',description:'Enlarge and restore photographic detail in your own images.'},
  retouch:{name:'Retouch',title:'Retouch',description:'Make selected changes to a photograph while keeping the original.'},
  fashion:{name:'Fashion',title:'Fashion Studio',description:'Open your fashion-focused creative workspace.'},
  assets:{name:'Assets',title:'Your Assets',description:'Find your private photographs, generated images, and videos.'}
});
const app=document.getElementById('app');
const guestBrowsing=()=>!gate.hidden||app.hasAttribute('data-guest-preview');
const guestContent=gate?.querySelector('.pv-guest-content');
const guestTitle=document.getElementById('pv-guest-title');
const guestKicker=guestContent?.querySelector('.pv-guest-kicker');
const guestSubtitle=guestContent?.querySelector('.pv-guest-subtitle');
const guestToolPanel=document.createElement('section');
guestToolPanel.id='pv-guest-selected-tool';
guestToolPanel.className='pv-guest-selected-tool';
guestToolPanel.hidden=true;
const guestToolNote=document.createElement('p');
const guestToolAction=document.createElement('button');
guestToolAction.type='button';
guestToolAction.addEventListener('click',requestSignIn);
guestToolPanel.append(guestToolNote,guestToolAction);
guestSubtitle?.after(guestToolPanel);
function syncGuestToolRoute(){
  if(!gate||!guestBrowsing())return;
  const requested=new URLSearchParams(location.search).get('tool')||'image';
  const route=Object.hasOwn(guestToolPages,requested)?requested:'image';
  const entry=guestToolPages[route];
  gate.dataset.guestTool=route;
  // The Image composer has force-display rules for its editorial desktop/mobile
  // deck. Suppress those at the element level for every non-Image guest route.
  // Remove the override entirely when returning to Image.
  for(const element of [gate.querySelector('.pv-guest-carousel'),composer]){
    if(!element)continue;
    element.hidden=route!=='image';
    if(route==='image')element.style.removeProperty('display');
    else element.style.setProperty('display','none','important');
  }
  guestKicker.textContent='PV LAB / '+entry.name.toUpperCase();
  guestTitle.textContent=entry.title;
  guestSubtitle.textContent=entry.description;
  guestToolPanel.hidden=route!=='assets';
  window.dispatchEvent(new CustomEvent('pv-studio-public-route',{detail:route}));
  if(route==='image'||route==='assets'){
    if(gate.hidden)gate.hidden=false;
  }
  if(route==='assets'){
    guestToolNote.textContent='Sign in to open '+entry.name+'. Your account and saved work remain private.';
    guestToolAction.textContent='Sign in to '+entry.name;
  }
  for(const button of document.querySelectorAll('#studio-header .tool-tab')){
    const current=button.id==='tool-'+route;
    button.classList.toggle('active',current);
    button.setAttribute('aria-pressed',String(current));
  }
}
// A guest may examine another tool before deciding to sign in. Do not force
// the sign-in modal or navigate them back to Image on every toolbar click.
document.querySelectorAll('#studio-header .tool-tab').forEach(button=>{
  button.addEventListener('click',event=>{
    if(!gate||!guestBrowsing())return;
    const selected=button.id.replace(/^tool-/,'');
    if(!Object.hasOwn(guestToolPages,selected))return;
    event.preventDefault();event.stopImmediatePropagation();
    const url=new URL(location.href);
    if(url.searchParams.get('tool')!==selected){
      url.searchParams.set('tool',selected);
      history.pushState(history.state,'',url);
    }
    syncGuestToolRoute();
  },true);
});
if(gate)new MutationObserver(syncGuestToolRoute).observe(gate,{attributes:true,attributeFilter:['hidden']});
window.addEventListener('popstate',syncGuestToolRoute);
syncGuestToolRoute();

window.addEventListener('pv-studio-public-ready',syncGuestToolRoute);

window.addEventListener('pv-studio-public-navigate',event=>{
  if(!guestBrowsing()||!Object.hasOwn(guestToolPages,event.detail))return;
  const url=new URL(location.href);url.searchParams.set('tool',event.detail);
  history.pushState(history.state,'',url);syncGuestToolRoute();
});
