import {loadLabAccount} from './native-account.js?v=20261015-clerk-v2';
import {createSessionRequest} from './session-request.js?v=20261015-first-login1';

const $=id=>document.getElementById(id);
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const STUDIO_HOSTS=new Set(['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev']);
let clerk=null,busy=false,revision=0,creditsMissing=false;
const request=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});

function destination(){
  const next=new URLSearchParams(location.search).get('next');
  const allowed=new Set(['/','/studio.html','/account.html','/fashion.html','/retouch.html','/mood-creator.html','/moods','/lab/','/lab/studio.html','/lab/account.html']);
  if(next&&next.startsWith('/')&&!next.startsWith('//')){
    const url=new URL(next,location.origin);
    if(url.origin===location.origin&&allowed.has(url.pathname))return url.pathname+url.search+url.hash;
  }
  return './studio.html?tool=image';
}
function status(message,error=false){
  const node=$('status');node.hidden=!message;node.textContent=message||'';
  node.classList.toggle('error',error);
}
function sameSession(id){return !!clerk?.isSignedIn&&clerk.session?.id===id;}
async function call(path,options={}){
  const response=await request(path,options);
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Your PV LAB account could not be verified.');
  return data;
}
function enterStudio(){location.replace(destination());}
async function refresh(){
  const current=++revision;
  $('loading').hidden=false;$('auth').hidden=true;$('welcome').hidden=true;
  if(!STUDIO_HOSTS.has(location.hostname.toLowerCase())){location.replace('./studio.html?tool=image');return;}
  if(!clerk?.isSignedIn){
    $('loading').hidden=true;$('auth').hidden=false;return;
  }
  const sessionId=clerk.session?.id;
  const state=await call('/api/migration/status');
  if(current!==revision||!sameSession(sessionId))return;
  if(state.linked){enterStudio();return;}
  $('loading').hidden=true;$('welcome').hidden=false;
}
$('transfer').href='./connect-account.html?next='+encodeURIComponent(destination());
$('sign-in').addEventListener('click',async()=>{
  if(busy)return;
  try{
    if(!clerk)clerk=await loadLabAccount();
    await clerk.openSignIn({
      forceRedirectUrl:location.href,signUpForceRedirectUrl:location.href,
      appearance:{variables:{colorBackground:'#191919',colorForeground:'#f3f1ec',colorMutedForeground:'#b4b1a9'}}
    });
  }catch{status('Sign-in could not open. Please try again.',true);}
});
$('enter').addEventListener('click',async()=>{
  if(busy||!clerk?.isSignedIn)return;
  if(creditsMissing){enterStudio();return;}
  busy=true;const sessionId=clerk.session?.id;
  const button=$('enter');button.disabled=true;status('');
  $('enter-label').textContent='Preparing your account…';
  try{
    // The original account can still be transferred before this explicit action.
    // Never create a new wallet merely because a Google login succeeded.
    const state=await call('/api/migration/status');
    if(!sameSession(sessionId))throw Error('Your signed-in account changed. Please try again.');
    if(state.linked){enterStudio();return;}
    const created=await call('/api/migration/new',{method:'POST'});
    if(!sameSession(sessionId))throw Error('Your signed-in account changed. Please try again.');
    if(!created.linked||created.kind!=='customer')throw Error('The new PV LAB account was not confirmed. Please retry.');
    const session=await call('/api/session');
    if(!sameSession(sessionId))throw Error('Your signed-in account changed. Please try again.');
    if(!session.customer||!Number.isSafeInteger(session.balanceCredits)){
      throw Error('Your account was created but the credit balance could not be verified. Please reload or contact support.');
    }
    if(session.balanceCredits<200){
      status('Your account is ready, but we could not verify the welcome credits. You can enter Studio or contact support.',true);
      $('enter-label').textContent='Open the Studio';
      creditsMissing=true;
      return;
    }
    status('200 credits added to your account. Opening your Studio.');
    enterStudio();
  }catch(error){
    // A second tab may have completed this account already.
    try{if(sameSession(sessionId)&&(await call('/api/migration/status')).linked){enterStudio();return;}}catch{}
    status(error?.message||'We could not prepare your account. Please retry.',true);
  }finally{
    busy=false;button.disabled=false;
    if($('enter-label').textContent==='Preparing your account…')$('enter-label').textContent='Enter the Studio';
  }
});
try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>{void refresh().catch(error=>{if(clerk?.isSignedIn){$('loading').hidden=true;$('welcome').hidden=false;}status(error?.message||'Unable to load your account.',true);});});
  await refresh();
}catch{ $('loading').hidden=true;$('auth').hidden=false;status('Sign-in could not load. Please reload and try again.',true); }
