import {renderHeaderCredits} from './header-credits.js?v=20261018-credit-unified1';
import {createAccountMenu} from './account-menu.js?v=20261016-account-menu-edge24&closure=20261017-logout1';
import {metaConsentGranted,trackLabEvent,trackLabRegistration} from './meta-pixel.js?v=20261015-standalone1';
import {captureReferralCode,claimReferral} from './referral-capture.js?v=20261010-referrals1';
captureReferralCode();
import {createSessionRequest} from './session-request.js?v=20261015-canonical-studio1';
const API='https://parallel-vision-lab.parallelvision.workers.dev';
import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1&providerPolicy=20261015-google-only1';
const $=id=>document.getElementById(id);
const pilotSetup=new URLSearchParams(location.search).get('setup-pilot')==='1';
let clerk=null,profile=null,profileSessionId=null,revision=0,profileLoading=false;
let purchasing=false;
const buyButtons=[...document.querySelectorAll('[data-lab-buy]')];
const purchaseKey='pv-lab-purchase-intent';
const feedbackNodes=new Map();
for(const button of buyButtons){
  const container=button.closest('.lab-plan')||button.closest('.lab-topups');
  if(!container)continue;
  let note=container.querySelector('.lab-purchase-status');
  if(!note){note=document.createElement('p');note.className='lab-purchase-status';note.id='lab-buy-status-'+button.dataset.labBuy;note.setAttribute('role','status');note.setAttribute('aria-live','polite');note.hidden=true;container.append(note);}
  button.setAttribute('aria-describedby',note.id);feedbackNodes.set(button,note);
}
function purchaseStatus(button,message){
  for(const note of new Set(feedbackNodes.values())){note.hidden=true;note.textContent='';}
  const note=feedbackNodes.get(button);
  if(!note){status(message);return;}
  note.hidden=!message;note.textContent=message||'';
  if(message)requestAnimationFrame(()=>note.scrollIntoView({block:'nearest'}));
}
function purchaseBusy(button,busy){
  for(const item of buyButtons){item.disabled=busy;item.setAttribute('aria-busy',String(busy&&item===button));}
}
function clearPurchaseIntent(){try{sessionStorage.removeItem(purchaseKey);}catch{}}
// Only a same-tab, short-lived intent created by a click can resume after sign-in.
function returnedPurchase(){
  const url=new URL(location.href),nonce=url.searchParams.get('lab-checkout');
  if(!nonce)return null;
  url.searchParams.delete('lab-checkout');history.replaceState(history.state,'',url);
  let intent;try{intent=JSON.parse(sessionStorage.getItem(purchaseKey));}catch{}
  clearPurchaseIntent();
  if(intent?.nonce!==nonce||!Number.isFinite(intent.at)||Date.now()-intent.at<0||Date.now()-intent.at>15*60*1000)return null;
  return buyButtons.find(button=>button.dataset.labBuy===intent.sku)||null;
}
const resumePurchase=returnedPurchase();
// A returning one-time purchase stays on its chosen pack rather than reverting to monthly plans.
if(resumePurchase?.closest('#lab-one-time-credits')){
  document.querySelector('#lab-tab-onetime')?.click();
}
const headerAccount=createAccountMenu($('lab-account-strip'));
const status=message=>{for(const id of ['lab-entry-status','lab-pricing-status'])if($(id))$(id).textContent=message||'';};
const api=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function call(path,init){const result=await api(path,init);const data=await result.json().catch(()=>({}));if(!result.ok)throw new Error(data.error||'Lab account is unavailable.');return data;}
async function refresh(){
  const current=++revision;
  try{
    if(!clerk?.isSignedIn){profile=null;profileSessionId=null;profileLoading=false;show();return;}
    if(profileSessionId!==clerk.session?.id)profile=null;
    profileLoading=true;
    show(); // Present the verified avatar as soon as identity loads, before the wallet request.
    const data=await call('/api/session');if(current!==revision)return;
    profile=data;profileSessionId=clerk.session?.id;profileLoading=false;show();
    if(profile.customer)trackLabRegistration(profile.ownerId,profile.createdAt);
    if(profile.customer)await claimReferral(code=>call('/api/customer/referrals/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}));
  }catch(e){if(current===revision){profile=null;profileLoading=false;status(e.message);show();}}
}
function show(){
  const signed=!!clerk?.isSignedIn;
  const currentProfile=!!profile&&profileSessionId===clerk?.session?.id;
  // Do not paint a guest CTA or an unverified wallet while Clerk and the
  // authenticated /api/session request are still resolving.
  const ready=!!clerk&&(!signed||currentProfile||!profileLoading);
  const customer=ready&&currentProfile&&!!profile.customer;
  const header=document.querySelector('.landing-header--home');
  const homeCredits=$('lab-home-credits');
  $('lab-header-signin').hidden=!ready||signed;
  // Render from the active Clerk session only. A new session never inherits
  // the former user's credit text, even while /api/session is pending.
  renderHeaderCredits(homeCredits,{
    signed:!!clerk&&signed,profile:currentProfile?profile:null,
    guestVisible:ready&&!!header,guestHref:'#pricing',billingHref:'./account.html#balance'
  });
  headerAccount.update({signed:!!clerk&&signed,user:clerk?.user,profile:currentProfile?profile:null});
  const invitation=document.querySelector('.lab-invite-promo__cta');
  if(invitation){
    const owner=ready&&profile?.owner===true;
    invitation.href=owner?'./owner.html':'./account.html#referrals';
    const label=invitation.querySelector('[data-lab-invite-text]');
    if(label)label.textContent=owner?'Owner dashboard':'Get your invite link';
  }
  document.querySelectorAll('[data-lab-signin]').forEach(button=>{button.hidden=!ready||signed;});
  // Publish the resolved presentation as the last operation, so neither the
  // placeholder nor its actual replacement causes a visible layout shift.
  if(header)header.dataset.accountPhase=clerk?'ready':'pending';
  if(ready&&signed&&pilotSetup){
    if(customer&&profile?.ownerId)status('Private pilot setup: your test account ID is '+profile.ownerId+'. Copy this ID into the Cloudflare LAB_LIVE_PILOT_CUSTOMER_ID secret. This ID is not a password.');
    else if(profile&&!customer)status('This is the PV Lab owner account. For a safe live test, sign in using another Google account.');
  }
}
async function signIn(destination,report=status){
  try{
    if(!clerk){report('Sign-in is loading.');clerk=await loadLabAccount();}
    if(clerk.isSignedIn){if(destination)location.assign(destination);return true;}
    report('');
    await clerk.openSignIn({
      ...(destination?{forceRedirectUrl:destination,signUpForceRedirectUrl:destination}:{}),
      appearance:{variables:{
        colorBackground:'#191919',colorForeground:'#f3f1ec',colorMutedForeground:'#b4b1a9',
        colorPrimary:'#eeeae2',colorPrimaryForeground:'#151515',colorNeutral:'#f3f1ec',
        colorInput:'#232323',colorInputForeground:'#f3f1ec',colorBorder:'#41413d',
        fontFamily:'"DM Sans", Arial, sans-serif',borderRadius:'0.625rem'
      }}
    });
    return true;
  }catch{report('Sign-in is not currently available. Please try again.');return false;}
}
async function purchase(button){
  if(purchasing||!buyButtons.includes(button))return;
  const sku=button.dataset.labBuy;
  purchasing=true;purchaseBusy(button,true);purchaseStatus(button,'Checking your account…');
  let sessionId=null,leaving=false;
  try{
    if(!clerk)clerk=await loadLabAccount();
    if(!clerk.isSignedIn){
      const destination=new URL(location.href);destination.hash='pricing';
      const intent={sku,nonce:crypto.randomUUID(),at:Date.now()};
      try{sessionStorage.setItem(purchaseKey,JSON.stringify(intent));destination.searchParams.set('lab-checkout',intent.nonce);}catch{}
      const opened=await signIn(destination.href,message=>purchaseStatus(button,message||'Sign in to continue with this selection.'));
      if(!opened)clearPurchaseIntent();
      return;
    }
    sessionId=clerk.session?.id;
    if(!profile||profileSessionId!==sessionId)await refresh();
    if(!clerk.isSignedIn||clerk.session?.id!==sessionId)throw new Error('Your account changed. Select a plan again.');
    if(!profile)throw new Error('Your account could not be loaded. Please try again.');
    if(!profile.customer)throw new Error('You are signed in as the owner. Use a customer account to buy credits.');
    if(profile.pilot&&!['topup10','starter'].includes(sku))throw new Error('This private account can choose only the €10 credit pack or €15/month Starter plan.');
    if(profile.accountClosed||profile.billingReview)throw new Error('Purchases are paused for this account. Open Credits & billing for details.');
    if(!profile.billingReady)throw new Error('Purchases are not available yet. No payment has been taken.');
    purchaseStatus(button,'Opening secure checkout…');
    const data=await call('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(metaConsentGranted()?{sku,metaConsent:true}:{sku})});
    if(!clerk.isSignedIn||clerk.session?.id!==sessionId)throw new Error('Your account changed. Select a plan again.');
    const url=new URL(data.url);
    if(url.protocol!=='https:'||url.username||url.password||!(url.hostname==='stripe.com'||url.hostname.endsWith('.stripe.com')))throw new Error('Unverified checkout link. Please try again.');
    // Do not cancel the Pixel request by navigating away in the same task.
    if(trackLabEvent('InitiateCheckout',{currency:'EUR',content_name:sku}))
      await new Promise(resolve=>setTimeout(resolve,240));
    if(!clerk.isSignedIn||clerk.session?.id!==sessionId)throw new Error('Your account changed. Select a plan again.');
    location.assign(url.href);
    leaving=true;
  }catch(e){purchaseStatus(button,sessionId&&clerk?.session?.id!==sessionId?'Your account changed. Select a plan again.':e.message||'Checkout could not be opened. Please try again.');}
  finally{if(!leaving){purchasing=false;purchaseBusy(button,false);}}
}
$('lab-header-signin')?.addEventListener('click',()=>void signIn());
document.querySelectorAll('[data-lab-signin]').forEach(button=>button.addEventListener('click',()=>void signIn()));
// Start creating links navigate to the public Image Studio before requiring login.
// Signing in happens at Generate, not on the first click from the homepage.
$('lab-account-refer')?.addEventListener('click',()=>location.assign('./account.html#referrals'));
$('lab-account-logout')?.addEventListener('click',async()=>{clearPurchaseIntent();await clerk?.signOut();profile=null;show();});
buyButtons.forEach(button=>button.addEventListener('click',()=>void purchase(button)));

// Refresh authenticated balances after creation or purchasing in another tab.
window.addEventListener('focus',()=>{if(clerk?.isSignedIn&&document.visibilityState==='visible')void refresh();});
document.addEventListener('visibilitychange',()=>{if(!document.hidden&&clerk?.isSignedIn)void refresh();});

// Browsers may restore this page from the back-forward cache after Stripe Checkout.
// The outgoing checkout deliberately keeps its button busy; reset only on return.
window.addEventListener('pageshow',event=>{
  if(!event.persisted)return;
  purchasing=false;
  purchaseBusy(null,false);
  for(const note of new Set(feedbackNodes.values())){note.hidden=true;note.textContent='';}
  void refresh();
});

try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>void refresh());
  await refresh();
  if(resumePurchase){
    if(clerk.isSignedIn)await purchase(resumePurchase);
    else purchaseStatus(resumePurchase,'Sign in to continue with this selection.');
  }
}catch(e){
  status('Sign-in is not currently available. Please try again.');
  // Failed Clerk bootstrap is not an anonymous session; retain neutral slots.
  document.querySelector('.landing-header--home')?.setAttribute('data-account-phase','pending');
  $('lab-header-signin').hidden=true;
}
