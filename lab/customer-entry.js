import {createSessionRequest} from './session-request.js?v=20260927-auth1';
const API='https://parallel-vision-lab.parallelvision.workers.dev';
const CLERK_KEY='pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k';
const $=id=>document.getElementById(id);
let clerk=null,loading=false,profile=null;
const status=message=>{if($('lab-entry-status'))$('lab-entry-status').textContent=message||'';};
const api=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function call(path,init){const result=await api(path,init);const data=await result.json().catch(()=>({}));if(!result.ok)throw new Error(data.error||'Lab account is unavailable.');return data;}
async function refresh(){
  if(loading)return;loading=true;
  try{
    if(!clerk?.isSignedIn){profile=null;show();return;}
    profile=await call('/api/session');show();
  }catch(e){profile=null;status(e.message);show();}
  finally{loading=false;}
}
function show(){
  const signed=!!clerk?.isSignedIn,customer=!!profile?.customer;
  $('lab-header-signin').hidden=signed;
  $('lab-header-open').hidden=!signed;
  $('lab-account-strip').hidden=!signed;
  if(signed){
    $('lab-account-summary').textContent=customer?
      'Your PV Lab workspace · '+profile.balanceCredits.toLocaleString()+' credits':
      'Parallel Vision · owner workspace';
    $('lab-account-buy').hidden=!customer;
    $('lab-account-logout').hidden=false;
  }
}
function signIn(){if(!clerk){status('Sign-in is loading.');return;}clerk.openSignIn();}
async function purchase(sku){
  if(!clerk?.isSignedIn){signIn();return;}
  if(!profile){status('Account is still loading.');return;}
  if(!profile.customer){status('Your owner account uses the private studio.');return;}
  if(!profile.billingReady){status('Credit checkout is not enabled yet. No payment has been initiated.');return;}
  status('Opening secure checkout…');
  try{
    const data=await call('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku})});
    if(!data.url||new URL(data.url).protocol!=='https:')throw new Error('Invalid checkout link.');
    location.assign(data.url);
  }catch(e){status(e.message);}
}
$('lab-header-signin')?.addEventListener('click',signIn);
$('lab-account-buy')?.addEventListener('click',()=>purchase('topup10'));
$('lab-account-logout')?.addEventListener('click',async()=>{await clerk?.signOut();profile=null;show();});
document.querySelectorAll('[data-lab-buy]').forEach(button=>button.addEventListener('click',()=>purchase(button.dataset.labBuy)));
try{
  const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');
  await new Promise((resolve,reject)=>{const s=document.createElement('script');s.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';s.onload=resolve;s.onerror=reject;document.head.append(s);});
  clerk=new Clerk(CLERK_KEY);
  await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},
    signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
  clerk.addListener(()=>void refresh());
  await refresh();
}catch(e){status('Sign-in is not currently available. Please try again.');$('lab-header-signin').disabled=true;}
