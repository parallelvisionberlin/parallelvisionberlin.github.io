import {metaConsentGranted,trackLabEvent,trackLabRegistration} from './meta-pixel.js?v=20261013-a1';
import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {renderHeaderCredits} from './header-credits.js?v=20261018-unified1';
import {accountIdentity,createAccountMenu,referralsAvailable} from './account-menu.js?v=20261016-account-menu-edge24&creditHeader=20261018v1&closure=20261017-logout1';

const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
let clerk=null,profile=null,revision=0,referralRevision=0,paymentPending=false,referralLoaded=false,voucherBusy=false,closingAccount=false;
const voucherFromLink=(new URLSearchParams(location.search).get('voucher')||'').trim().toUpperCase();
if(/^[A-Z0-9][A-Z0-9-]{5,23}$/.test(voucherFromLink)){document.getElementById('account-voucher-code').value=voucherFromLink;if(!location.hash)location.hash='voucher';}
const money=value=>new Intl.NumberFormat('en',{style:'currency',currency:'EUR',maximumFractionDigits:2}).format(value);
const status=message=>{$('account-status').textContent=message||'';};

async function api(path,{method='GET',body}={}){
  const response=await request(path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(data.error||'Your account could not be loaded. Please try again.');
  return data;
}
export function stripeDestination(value){
  const url=new URL(value);
  if(url.protocol!=='https:'||url.username||url.password||!(url.hostname==='stripe.com'||url.hostname.endsWith('.stripe.com')))throw Error('A verified billing link was not returned. Please try again.');
  return url.href;
}
function route(){
  const value=location.hash.slice(1);return ['balance','usage','billing','referrals','voucher','settings'].includes(value)?value:'balance';
}
function clearPrivateView(){
  renderHeaderCredits($('account-header-credits'),{signed:!!clerk?.isSignedIn,profile:null,billingHref:'#balance'});
  $('settings-legacy-transfer').hidden=true;
  profile=null;referralLoaded=false;referralRevision++;
  menu.update();$('account-workspace').hidden=true;$('account-identity').textContent='Your creative space.';
  $('account-profile-mark').textContent='PV';$('account-profile-kind').textContent='Image. Motion. Your direction.';
  for(const id of ['account-products','account-plans','account-activity','account-purchases'])$(id).replaceChildren();
  for(const id of ['settings-name','settings-email','account-storage-label','account-plan','referrals-status'])$(id).textContent='';
  $('account-balance').textContent='…';$('referrals-url').value='';$('referrals-content').hidden=true;$('referrals-reward').hidden=true;$('referrals-bonus').textContent='0';
  $('account-storage').hidden=true;$('account-storage-meter').value=0;
  for(const id of ['referrals-invited','referrals-rewarded','referrals-earned'])$(id).textContent='0';
  $('referrals-description').textContent='Invite a friend into your creative space.';
  $('account-voucher-status').textContent='';$('account-voucher-code').value='';$('account-voucher-submit').disabled=false;voucherBusy=false;
  $('account-close-confirm').value='';$('account-close-submit').disabled=true;
  $('settings-delete-row').hidden=true;$('settings-deletion-state').hidden=true;$('settings-deletion-state').textContent='';
  if($('account-close-dialog').open)$('account-close-dialog').close();
}
function paintRoute(){
  const tab=route(),section=['balance','usage','billing'].includes(tab)?'credits':tab;
  if(tab==='admin'){location.assign('./owner.html');return;}
  document.querySelectorAll('[data-account-section]').forEach(el=>{el.hidden=el.dataset.accountSection!==section;});
  document.querySelectorAll('[data-section-link]').forEach(el=>{if(el.dataset.sectionLink===section)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.querySelectorAll('[data-tab]').forEach(el=>{if(el.dataset.tab===tab)el.setAttribute('aria-current','page');else el.removeAttribute('aria-current');});
  document.querySelectorAll('[data-credit-view]').forEach(el=>{el.hidden=!profile?.customer||el.dataset.creditView!==tab;});
  $('owner-billing').hidden=!profile||!!profile.customer;
  $('account-credit-tabs').hidden=!profile?.customer;
  $('credits-title').textContent=profile&&!profile.customer?'Your workspace':'Credits & billing';
  $('account-section').value=section==='credits'?'balance':section;
  if(section==='referrals'&&profile)void loadReferrals();
}
function drawProducts(products){
  $('account-products').replaceChildren();$('account-plans').replaceChildren();
  const activePlan=profile?.subscription&&!['none','canceled','incomplete_expired'].includes(profile.subscription.status);
  for(const item of products){
    if(!Number.isSafeInteger(item.credits)||!Number.isFinite(item.priceEur))continue;
    const monthly=item.type==='subscription',button=document.createElement('button');button.type='button';button.className='account-product';
    const credits=document.createElement('strong'),unit=document.createElement('small'),price=document.createElement('span'),action=document.createElement('em');
    credits.textContent=item.credits.toLocaleString();unit.textContent=monthly?'credits / month':'credits';price.textContent=money(item.priceEur)+(monthly?' / mo':'');
    action.textContent=monthly?(activePlan?'Manage in billing':'Choose plan'):'Add credits';
    const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('class','pv-arrow-svg');icon.setAttribute('aria-hidden','true');icon.innerHTML='<path d="M7 17 17 7M8 7h9v9"/>';action.append(' ',icon);
    button.append(credits,unit,price,action);button.disabled=!profile.billingReady||!!(monthly&&activePlan);
    button.addEventListener('click',()=>void openPayment('/api/billing/checkout',{sku:item.id}));
    $(monthly?'account-plans':'account-products').append(button);
  }
  $('account-plans-section').hidden=!$('account-plans').children.length;
}
function activityLabel(entry){
  if(String(entry.reference).startsWith('welcome:'))return 'Welcome credits';
  if(String(entry.reference).startsWith('referral:'))return 'Referral reward';
  return ({purchase:'Credit purchase',subscription:'Monthly plan credits',generation:'Generation',debit:'Generation',refund:'Credits returned',adjustment:'Balance adjustment'})[entry.kind]||'Credit movement';
}
function drawActivity(id,entries,empty){
  const target=$(id);target.replaceChildren();
  if(!entries.length){const p=document.createElement('p');p.className='account-empty';p.textContent=empty;target.append(p);return;}
  for(const entry of entries){
    const row=document.createElement('div');row.className='account-activity-row';
    const detail=document.createElement('div'),label=document.createElement('strong'),date=document.createElement('small'),amount=document.createElement('span');
    label.textContent=activityLabel(entry);
    const stamp=new Date(entry.created_at);date.textContent=Number.isFinite(stamp.valueOf())?new Intl.DateTimeFormat(undefined,{dateStyle:'medium',timeStyle:'short'}).format(stamp):'Date unavailable';
    const value=Number(entry.delta_credits);amount.textContent=Number.isSafeInteger(value)?(value>0?'+':'')+value.toLocaleString()+' credits':'Amount unavailable';
    detail.append(label,date);row.append(detail,amount);target.append(row);
  }
}
function drawProfile(){
  renderHeaderCredits($('account-header-credits'),{signed:true,profile,billingHref:'#balance'});
  const identity=accountIdentity(clerk.user);$('account-identity').textContent=identity.name;
  const mark=$('account-profile-mark');mark.textContent=identity.initials;
  if(identity.image){const img=document.createElement('img');img.alt='';img.src=identity.image;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());mark.append(img);}
  $('account-profile-kind').textContent=profile.customer?'Personal account':'Owner workspace';
  for(const id of ['account-primary-label','account-primary-option'])$(id).textContent=profile.customer?'Credits & billing':'Workspace';
  $('settings-name').textContent=identity.name;$('settings-email').textContent=identity.email;
  $('account-edit-profile').hidden=typeof clerk.openUserProfile!=='function';$('settings-native').hidden=typeof clerk.openUserProfile==='function';
  $('settings-connection').hidden=!!profile.customer;
  $('account-voucher-link').hidden=!profile.customer||!!profile.accountClosed;
  $('account-voucher-option').hidden=!profile.customer||!!profile.accountClosed;
  $('account-admin-link').hidden=profile.owner!==true;
  $('account-admin-option').hidden=profile.owner!==true;
  if(profile.customer&&/^[A-Z0-9][A-Z0-9-]{5,23}$/.test(voucherFromLink)&&!$('account-voucher-code').value)$('account-voucher-code').value=voucherFromLink;
  const canDelete=!!profile.customer&&!profile.accountClosed;
  $('settings-delete-row').hidden=!canDelete;$('settings-close-account').hidden=!canDelete;
  const deletionState=$('settings-deletion-state');
  deletionState.hidden=!profile.accountClosed;
  deletionState.textContent=profile.accountClosed
    ? (profile.accountClosed.state==='deleted'
      ? 'Your PV Lab creative data has been deleted. Your Parallel Vision Label sign-in remains active.'
      : 'PV Lab account deletion is queued. New generations and purchases are disabled.')
    : '';
  const referrals=referralsAvailable(profile);$('account-referrals-link').hidden=!referrals;$('account-referrals-option').hidden=!referrals;
  menu.update({signed:true,user:clerk.user,profile});
}
async function refresh(){
  if(closingAccount)return;
  const current=++revision;clearPrivateView();status('Loading your account…');
  const signed=!!clerk?.isSignedIn;
  $('account-signin').hidden=signed;$('account-signin').disabled=!clerk;$('account-gate').hidden=true;
  $('account-gate-signin').textContent='Sign in';
  if(!signed){status(clerk?'':'Sign-in is loading…');$('account-gate').hidden=!clerk;return;}
  try{
    const data=await api('/api/session');if(current!==revision)return;
    $('settings-legacy-transfer').hidden=true;
    if(data.customer===true&&/^user_PvLabV2[A-Za-z0-9]+$/.test(data.ownerId||'')&&
      ['pvlab.studio','www.pvlab.studio','pvlab-studio.pages.dev'].includes(location.hostname)){
      // One-time owner/customer recovery is discreetly available in Settings
      // only when the verified Worker confirms this trial has no saved work.
      void api('/api/migration/status').then(link=>{
        if(current===revision&&link.relinkEligible)
          $('settings-legacy-transfer').hidden=false;
      }).catch(()=>{});
    }
    profile=data;if(profile.customer)trackLabRegistration(profile.ownerId,profile.createdAt);drawProfile();$('account-workspace').hidden=false;status('');paintRoute();
    if(!profile.customer)return;
    const [wallet,storage]=await Promise.allSettled([api('/api/customer/wallet'),api('/api/customer/account')]);
    if(current!==revision)return;
    if(wallet.status==='fulfilled'){
      profile={...profile,...wallet.value};drawProfile();
      $('account-balance').textContent=Number.isSafeInteger(profile.balanceCredits)?profile.balanceCredits.toLocaleString():'Unavailable';
      drawProducts(Array.isArray(profile.products)?profile.products:[]);
      const activity=Array.isArray(profile.activity)?profile.activity:[];
      drawActivity('account-activity',activity,'Your credit activity will appear here after your first purchase or generation.');
      drawActivity('account-purchases',activity.filter(item=>['purchase','subscription'].includes(item.kind)),'No purchases in your latest 30 credit movements. View your full payment history in Billing.');
      $('account-checkout-state').textContent=profile.accountClosed?'Your PV Lab account is closed. Billing management remains available.':profile.billingReview?'Purchases are paused while a payment is reviewed. Billing management remains available.':profile.billingReady?'Choose a pack. The final price is confirmed at checkout.':'Credit checkout is not available yet. Payments are not being accepted.';
      const sub=profile.subscription;$('account-subscription').hidden=!sub?.plan_id||sub.status==='none';
      $('account-plan').textContent=sub?.plan_id?sub.plan_id.charAt(0).toUpperCase()+sub.plan_id.slice(1)+' · '+sub.status.replaceAll('_',' '):'';
      if(profile.accountClosed)status('Your Lab account is closed. Creative data deletion is '+(profile.accountClosed.state==='deleted'?'complete.':'queued.'));
    }else{status(wallet.reason.message);$('account-balance').textContent='Unavailable';}
    $('account-storage').hidden=false;
    if(storage.status==='fulfilled'){
      const s=storage.value.storage;
      $('account-storage-label').textContent=(s.bytes/1024**3).toFixed(2)+' GiB of '+(s.limitBytes/1024**3).toLocaleString()+' GiB · '+s.files.toLocaleString()+' files';
      $('account-storage-meter').value=s.limitBytes?Math.min(1,s.bytes/s.limitBytes):0;
    }else $('account-storage-label').textContent=storage.reason.message;
    paintRoute();
  }catch(error){
    if(current!==revision)return;
    status(error.message);menu.update({signed:true,user:clerk.user});
    $('account-gate').hidden=false;$('account-gate-signin').textContent='Try again';
  }
}
async function openPayment(path,body){
  if(paymentPending||!profile?.customer)return;
  if(path.endsWith('/checkout')&&!profile.billingReady){status('Checkout is not enabled for this account.');return;}
  paymentPending=true;const current=revision;status('Opening secure billing…');$('account-portal').disabled=true;
  try{
    const checkout=path.endsWith('/checkout');
    const payload=checkout&&metaConsentGranted()?{...body,metaConsent:true}:body;
    const data=await api(path,{method:'POST',body:payload});if(current!==revision)return;
    const destination=stripeDestination(data.url);
    // A short flush window prevents Stripe navigation interrupting Meta's browser request.
    if(checkout&&trackLabEvent('InitiateCheckout',{currency:'EUR',content_name:String(body?.sku||'')}))
      await new Promise(resolve=>setTimeout(resolve,240));
    if(current!==revision)return;
    location.assign(destination);
  }
  catch(error){if(current===revision)status(error.message==='No Stripe customer record yet.'?'Your billing history becomes available after your first checkout.':error.message);}
  finally{paymentPending=false;$('account-portal').disabled=false;}
}
async function loadReferrals(){
  if(referralLoaded)return;
  if(!referralsAvailable(profile)){
    $('referrals-status').textContent=profile?.customer?'Invites and rewards will appear here when referrals are available for your account.':'Referral rewards are available for customer accounts.';
    return;
  }
  referralLoaded=true;const current=++referralRevision,accountRevision=revision;$('referrals-status').textContent='Loading your invite link…';
  try{
    const data=await api('/api/customer/referrals');if(current!==referralRevision||accountRevision!==revision)return;
    if(!data.rewardsAvailable){$('referrals-status').textContent='Referral rewards are not open yet.';return;}
    const url=new URL(data.url);if(url.protocol!=='https:'||url.origin!==location.origin||url.username||url.password)throw Error('Your invite link is unavailable.');
    const bonusCredits=Number(data.bonusCredits),qualifyingPurchaseEur=Number(data.qualifyingPurchaseEur);
    if(!Number.isSafeInteger(bonusCredits)||bonusCredits<=0||!Number.isFinite(qualifyingPurchaseEur)||qualifyingPurchaseEur<=0)throw Error('Referral details are temporarily unavailable.');
    $('referrals-bonus').textContent=bonusCredits.toLocaleString();
    $('referrals-description').textContent='Your friend joins through this link and makes a first purchase of '+money(qualifyingPurchaseEur)+' or more. You both receive the reward.';
    $('referrals-url').value=url.href;$('referrals-content').hidden=false;$('referrals-reward').hidden=false;
    $('referrals-invited').textContent=Number(data.invited).toLocaleString();$('referrals-rewarded').textContent=Number(data.rewarded).toLocaleString();$('referrals-earned').textContent=(Number(data.rewarded)*bonusCredits).toLocaleString();
    $('referrals-status').textContent='';
  }catch(error){if(current===referralRevision&&accountRevision===revision){referralLoaded=false;$('referrals-status').textContent=error.message;}}
}
$('account-signin').onclick=()=>clerk?.openSignIn();
$('account-gate-signin').onclick=()=>clerk?.isSignedIn?void refresh():clerk?.openSignIn();
$('account-signout').onclick=async()=>{++revision;clearPrivateView();try{await clerk?.signOut();await refresh();}catch(error){status(error.message);}};
$('account-refresh').onclick=()=>void refresh();
$('account-portal').onclick=()=>void openPayment('/api/billing/portal');
$('account-section').onchange=event=>{if(event.target.value==='moods')location.assign('./mood-creator.html#my-moods');else if(event.target.value==='admin')location.assign('./owner.html');else location.hash=event.target.value;};
$('account-edit-profile').onclick=()=>clerk?.openUserProfile?.({appearance:{variables:{colorBackground:'#1a1b19',colorText:'#eeeae2',colorTextSecondary:'#aaa9a1',colorPrimary:'#eeeae2',colorInputBackground:'#252622',colorInputText:'#eeeae2',borderRadius:'8px'}}});
$('account-voucher-form').addEventListener('submit',async event=>{
  event.preventDefault();if(voucherBusy||!profile?.customer)return;
  const code=$('account-voucher-code').value.trim().toUpperCase();
  if(!/^[A-Z0-9][A-Z0-9-]{5,23}$/.test(code)){$('account-voucher-status').textContent='Enter a valid voucher code.';return;}
  const current=revision;voucherBusy=true;$('account-voucher-submit').disabled=true;$('account-voucher-status').textContent='Redeeming your code…';
  try {
    const result=await api('/api/customer/vouchers/redeem',{method:'POST',body:{code}});
    if(current!==revision)return;
    const signedSession=clerk?.session?.id;
    await refresh();
    if(signedSession===clerk?.session?.id&&profile?.customer){
      $('account-voucher-code').value='';
      const currentUrl=new URL(location.href);currentUrl.searchParams.delete('voucher');
      history.replaceState(history.state,'',currentUrl);
      $('account-voucher-status').textContent='Added '+Number(result.credits).toLocaleString()+' credits to your balance.';
    }
  }catch(error){if(current===revision)$('account-voucher-status').textContent=error.message||'Voucher could not be redeemed.';}
  finally{voucherBusy=false;$('account-voucher-submit').disabled=false;}
});
$('referrals-copy').onclick=async()=>{
  const current=revision;
  try{await navigator.clipboard.writeText($('referrals-url').value);if(current===revision)$('referrals-status').textContent='Invite link copied.';}
  catch{if(current===revision){$('referrals-url').focus();$('referrals-url').select();$('referrals-status').textContent='Select and copy your invite link.';}}
};
$('settings-close-account').onclick=()=>{if(!profile?.customer||profile.accountClosed)return;$('account-close-confirm').value='';$('account-close-submit').disabled=true;$('account-close-status').textContent='';$('account-close-dialog').showModal();};
$('account-close-confirm').oninput=()=>{$('account-close-submit').disabled=$('account-close-confirm').value!=='DELETE MY PV LAB ACCOUNT';};
// Account closure returns 202 before asynchronous media cleanup finishes. Clear all
// account UI and end the Clerk session instead of refreshing a closed wallet.
async function finishAccountClosureSignOut(){
  try{
    await clerk.signOut();
    location.replace('./');
  }catch{
    status('Your PV Lab account is closed, but sign-out could not finish.');
    $('account-gate').hidden=false;
    $('account-gate').querySelector('h2').textContent='PV Lab account closed.';
    $('account-gate').querySelector('p').textContent='Creative data deletion is queued. Please retry signing out.';
    $('account-gate-signin').textContent='Retry sign-out';
    $('account-gate-signin').onclick=()=>void finishAccountClosureSignOut();
  }
}
$('account-close-submit').onclick=async()=>{
  const sessionId=clerk?.session?.id;
  $('account-close-submit').disabled=true;
  $('account-close-status').textContent='Submitting your closure request…';
  try{
    const result=await api('/api/customer/account',{method:'DELETE',body:{confirmation:$('account-close-confirm').value}});
    if(result.accepted!==true)throw Error('Account closure was not confirmed. Please try again.');
    // A different user must never be signed out by a stale deletion response.
    if(!clerk?.isSignedIn||clerk.session?.id!==sessionId)return;
    closingAccount=true;
    ++revision;
    clearPrivateView();
    $('account-signin').hidden=true;
    $('account-gate').hidden=true;
    status('Your PV Lab account is closed. Creative data deletion is queued. Signing you out…');
    await finishAccountClosureSignOut();
  }catch(error){
    if(clerk?.session?.id===sessionId){
      $('account-close-status').textContent=error.message;
      $('account-close-submit').disabled=$('account-close-confirm').value!=='DELETE MY PV LAB ACCOUNT';
    }
  }
};
window.addEventListener('hashchange',paintRoute);
try{clerk=await loadLabAccount();clerk.addListener(()=>void refresh());await refresh();}
catch{status('Sign-in could not load. Reload this page to try again.');$('account-signin').disabled=true;}
