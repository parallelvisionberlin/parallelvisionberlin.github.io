import {createSessionRequest} from './session-request.js?v=20260927-auth1';

const API='https://parallel-vision-lab-sandbox.parallelvision.workers.dev';
const CLERK_KEY='pk_live_Y2xlcmsucGFyYWxsZWx2aXNpb25sYWJlbC5jb20k';
const $=id=>document.getElementById(id);
let clerk=null,profile=null,loading=false;
const call=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
const say=message=>{$('status').textContent=message;};
function show(){
  const signed=!!clerk?.isSignedIn;
  $('signin').hidden=signed;
  $('signout').hidden=!signed;
  $('refresh').hidden=!signed;
  $('account').hidden=!profile;
  $('balance').textContent=profile?.balanceCredits?.toLocaleString()||'0';
  for(const btn of document.querySelectorAll('[data-sku]'))
    btn.disabled=!signed||!profile?.billingReady||loading;
}
async function refresh(){
  if(loading)return;
  loading=true;show();
  try{
    if(!clerk?.isSignedIn){profile=null;say('Sign in to access the isolated billing sandbox.');return;}
    const response=await call('/api/session');
    const result=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(result.error||'Sandbox session unavailable.');
    if(result.sandbox!==true)throw new Error('Safety check failed: destination is not the isolated billing sandbox.');
    const wallet=await call('/api/customer/wallet');
    const walletData=await wallet.json().catch(()=>({}));
    if(!wallet.ok)throw new Error(walletData.error||'Test wallet unavailable.');
    profile={...result,balanceCredits:walletData.balanceCredits,activity:walletData.activity};
    const activity=$('activity');activity.replaceChildren();
    const rows=walletData.activity||[];
    if(!rows.length){const li=document.createElement('li');li.textContent='No test credits yet.';activity.append(li);}
    for(const row of rows.slice(0,16)){
      const li=document.createElement('li'),left=document.createElement('span'),right=document.createElement('small');
      left.textContent=(row.delta_credits>0?'+':'')+row.delta_credits.toLocaleString()+' credits · '+row.kind;
      right.textContent=new Date(row.created_at).toLocaleString();
      li.append(left,right);activity.append(li);
    }
    const cameBack=new URLSearchParams(location.search).get('billing');
    if(!profile.billingReady)
      say('Stripe sandbox credentials are not configured yet. No checkout is available.');
    else if(cameBack==='success')
      say('Returned from Stripe test Checkout. Credits appear only after Stripe confirms the payment by webhook. Refresh wallet if needed.');
    else if(cameBack==='cancel')
      say('Test Checkout was cancelled. No credits were purchased.');
    else say('Sandbox ready. Test charges cannot affect your real Stripe account.');
  }catch(e){profile=null;say(e.message||'Sandbox is not ready.');}
  finally{loading=false;show();}
}
async function purchase(sku){
  if(loading||!profile?.billingReady||!clerk?.isSignedIn)return;
  loading=true;show();say('Opening Stripe test Checkout…');
  try{
    const response=await call('/api/billing/checkout',{
      method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku})});
    const data=await response.json().catch(()=>({}));
    if(!response.ok)throw new Error(data.error||'Sandbox test checkout unavailable.');
    const url=new URL(data.url);
    if(url.protocol!=='https:'||!(url.hostname==='stripe.com'||url.hostname.endsWith('.stripe.com')))
      throw new Error('Unsafe Checkout destination. No redirect was made.');
    location.assign(url.href);
  }catch(e){say(e.message||'Test checkout failed. No payment was made.');loading=false;show();}
}
$('signin').onclick=()=>clerk?.openSignIn();
$('signout').onclick=async()=>{await clerk?.signOut();profile=null;show();say('Signed out of the test workspace.');};
$('refresh').onclick=()=>void refresh();
for(const btn of document.querySelectorAll('[data-sku]'))
  btn.onclick=()=>void purchase(btn.dataset.sku);
try{
  const {Clerk}=await import('https://esm.sh/@clerk/clerk-js@6?bundle');
  await new Promise((resolve,reject)=>{
    const script=document.createElement('script');
    script.src='https://clerk.parallelvisionlabel.com/npm/@clerk/ui@1/dist/ui.browser.js';
    script.onload=resolve;script.onerror=reject;
    document.head.append(script);
  });
  clerk=new Clerk(CLERK_KEY);
  await clerk.load({ui:{ClerkUI:window.__internal_ClerkUICtor},
    signInFallbackRedirectUrl:location.href,signUpFallbackRedirectUrl:location.href});
  clerk.addListener(()=>void refresh());
  await refresh();
}catch{
  say('Sign-in could not load. Please reload this test page.');
  $('signin').disabled=true;
}
