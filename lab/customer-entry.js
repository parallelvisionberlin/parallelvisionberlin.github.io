import {createAccountMenu} from './account-menu.js?v=20261012-account2';
import {captureReferralCode,claimReferral} from './referral-capture.js?v=20261010-referrals1';
captureReferralCode();
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
const API='https://parallel-vision-lab.parallelvision.workers.dev';
import {loadLabAccount} from './native-account.js?v=20261012-unified-header1';
const $=id=>document.getElementById(id);
const pilotSetup=new URLSearchParams(location.search).get('setup-pilot')==='1';
let clerk=null,profile=null,revision=0;
const headerAccount=createAccountMenu($('lab-account-strip'));
const status=message=>{for(const id of ['lab-entry-status','lab-pricing-status'])if($(id))$(id).textContent=message||'';};
const api=createSessionRequest({baseUrl:API,getSession:()=>clerk?.session});
async function call(path,init){const result=await api(path,init);const data=await result.json().catch(()=>({}));if(!result.ok)throw new Error(data.error||'Lab account is unavailable.');return data;}
async function refresh(){
  const current=++revision;
  try{
    if(!clerk?.isSignedIn){profile=null;show();return;}
    const data=await call('/api/session');if(current!==revision)return;
    profile=data;show();
    if(profile.customer)await claimReferral(code=>call('/api/customer/referrals/claim',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({code})}));
  }catch(e){if(current===revision){profile=null;status(e.message);show();}}
}
function show(){
  const signed=!!clerk?.isSignedIn,customer=!!profile?.customer;
  $('lab-header-signin').hidden=signed;
  headerAccount.update({signed,user:clerk?.user,profile});
  document.querySelectorAll('[data-lab-signin]').forEach(button=>{button.hidden=signed;});
  if(signed&&pilotSetup){
    if(customer&&profile?.ownerId)status('Private pilot setup: your test account ID is '+profile.ownerId+'. Copy this ID into the Cloudflare LAB_LIVE_PILOT_CUSTOMER_ID secret. This ID is not a password.');
    else if(profile&&!customer)status('This is the PV Lab owner account. For a safe live test, sign in using another Google account.');
  }

}
async function signIn(destination){
  try{
    if(!clerk){status('Sign-in is loading.');clerk=await loadLabAccount();}
    if(clerk.isSignedIn){if(destination)location.assign(destination);return;}
    status('');
    clerk.openSignIn({
      ...(destination?{forceRedirectUrl:destination,signUpForceRedirectUrl:destination}:{}),
      appearance:{variables:{
        colorBackground:'#191919',colorForeground:'#f3f1ec',colorMutedForeground:'#b4b1a9',
        colorPrimary:'#eeeae2',colorPrimaryForeground:'#151515',colorNeutral:'#f3f1ec',
        colorInput:'#232323',colorInputForeground:'#f3f1ec',colorBorder:'#41413d',
        fontFamily:'"DM Sans", Arial, sans-serif',borderRadius:'0.625rem'
      }}
    });
  }catch{status('Sign-in is not currently available. Please try again.');}
}
async function purchase(sku){
  if(!clerk?.isSignedIn){signIn();return;}
  if(!profile){status('Account is still loading.');return;}
  if(!profile.customer){status('Your owner account uses the private studio.');return;}
  if(profile.pilot&&sku!=='topup10'){status('The private live payment test permits the €10 credit pack only.');return;}
  if(!profile.billingReady){status('Credit checkout is not enabled yet. No payment has been initiated.');return;}
  status('Opening secure checkout…');
  try{
    const data=await call('/api/billing/checkout',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({sku})});
    if(!data.url||new URL(data.url).protocol!=='https:')throw new Error('Invalid checkout link.');
    location.assign(data.url);
  }catch(e){status(e.message);}
}
$('lab-header-signin')?.addEventListener('click',()=>void signIn());
document.querySelectorAll('[data-lab-signin]').forEach(button=>button.addEventListener('click',()=>void signIn()));
document.querySelector('.start-link')?.addEventListener('click',event=>{
  if(event.button!==0||event.metaKey||event.ctrlKey||event.shiftKey||event.altKey||clerk?.isSignedIn)return;
  event.preventDefault();void signIn(event.currentTarget.href);
});
$('lab-account-refer')?.addEventListener('click',()=>location.assign('./account.html#referrals'));
$('lab-account-logout')?.addEventListener('click',async()=>{await clerk?.signOut();profile=null;show();});
document.querySelectorAll('[data-lab-buy]').forEach(button=>button.addEventListener('click',()=>purchase(button.dataset.labBuy)));

try{
  clerk=await loadLabAccount();
  clerk.addListener(()=>void refresh());
  await refresh();
}catch(e){status('Sign-in is not currently available. Please try again.');$('lab-header-signin').disabled=true;}
