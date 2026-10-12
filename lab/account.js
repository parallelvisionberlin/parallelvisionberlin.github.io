import {loadLabAccount} from './native-account.js?v=20261012-unified-header1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
import {accountIdentity,createAccountMenu,referralsAvailable} from './account-menu.js?v=20261012-account2';

const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
let clerk=null,profile=null,revision=0,referralRevision=0,paymentPending=false,referralLoaded=false;
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
  const value=location.hash.slice(1);return ['balance','usage','billing','referrals','settings'].includes(value)?value:'balance';
}
function clearPrivateView(){
  profile=null;referralLoaded=false;referralRevision++;
  menu.update();$('account-workspace').hidden=true;$('account-identity').textContent='Your creative space.';
  $('account-profile-mark').textContent='PV';$('account-profile-kind').textContent='Image. Motion. Your direction.';
  for(const id of ['account-products','account-plans','account-activity','account-purchases'])$(id).replaceChildren();
  for(const id of ['settings-name','settings-email','account-storage-label','account-plan','referrals-status'])$(id).textContent='';
  $('account-balance').textContent='…';$('referrals-url').value='';$('referrals-content').hidden=true;
  $('account-storage').hidden=true;$('account-storage-meter').value=0;
  for(const id of ['referrals-invited','referrals-rewarded','referrals-earned'])$(id).textContent='0';
  $('referrals-description').textContent='Share your creative space.';
  $('account-close-confirm').value='';$('account-close-submit').disabled=true;
  if($('account-close-dialog').open)$('account-close-dialog').close();
}
function paintRoute(){
  const tab=route(),section=['balance','usage','billing'].includes(tab)?'credits':tab;
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
    action.textContent=monthly?(activePlan?'Manage in billing ↗':'Choose plan ↗'):'Add credits ↗';
    button.append(credits,unit,price,action);button.disabled=!profile.billingReady||!!(monthly&&activePlan);
    button.addEventListener('click',()=>void openPayment('/api/billing/checkout',{sku:item.id}));
    $(monthly?'account-plans':'account-products').append(button);
  }
  $('account-plans-section').hidden=!$('account-plans').children.length;
}
function activityLabel(entry){
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
  const identity=accountIdentity(clerk.user);$('account-identity').textContent=identity.name;
  const mark=$('account-profile-mark');mark.textContent=identity.initials;
  if(identity.image){const img=document.createElement('img');img.alt='';img.src=identity.image;img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());mark.append(img);}
  $('account-profile-kind').textContent=profile.customer?'Personal account':'Owner workspace';
  for(const id of ['account-primary-label','account-primary-option'])$(id).textContent=profile.customer?'Credits & billing':'Workspace';
  $('settings-name').textContent=identity.name;$('settings-email').textContent=identity.email;
  $('account-edit-profile').hidden=typeof clerk.openUserProfile!=='function';$('settings-native').hidden=typeof clerk.openUserProfile==='function';
  $('settings-connection').hidden=!!profile.customer;
  $('settings-close-account').hidden=!profile.customer||!!profile.accountClosed;
  const referrals=referralsAvailable(profile);$('account-referrals-link').hidden=!referrals;$('account-referrals-option').hidden=!referrals;
  menu.update({signed:true,user:clerk.user,profile});
}
async function refresh(){
  const current=++revision;clearPrivateView();status('Loading your account…');
  const signed=!!clerk?.isSignedIn;
  $('account-signin').hidden=signed;$('account-signin').disabled=!clerk;$('account-gate').hidden=true;
  $('account-gate-signin').textContent='Sign in';
  if(!signed){status(clerk?'':'Sign-in is loading…');$('account-gate').hidden=!clerk;return;}
  try{
    const data=await api('/api/session');if(current!==revision)return;
    profile=data;drawProfile();$('account-workspace').hidden=false;status('');paintRoute();
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
  try{const data=await api(path,{method:'POST',body});if(current!==revision)return;location.assign(stripeDestination(data.url));}
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
    $('referrals-url').value=url.href;$('referrals-content').hidden=false;
    $('referrals-description').textContent='You and your friend each receive '+Number(data.bonusCredits).toLocaleString()+' credits after their first qualifying payment of '+money(data.qualifyingPurchaseEur)+' or more.';
    $('referrals-invited').textContent=Number(data.invited).toLocaleString();$('referrals-rewarded').textContent=Number(data.rewarded).toLocaleString();$('referrals-earned').textContent=(Number(data.rewarded)*Number(data.bonusCredits)).toLocaleString();
    $('referrals-status').textContent='Your friend must join through your link before making their first purchase.';
  }catch(error){if(current===referralRevision&&accountRevision===revision){referralLoaded=false;$('referrals-status').textContent=error.message;}}
}
$('account-signin').onclick=()=>clerk?.openSignIn();
$('account-gate-signin').onclick=()=>clerk?.isSignedIn?void refresh():clerk?.openSignIn();
$('account-signout').onclick=async()=>{++revision;clearPrivateView();try{await clerk?.signOut();await refresh();}catch(error){status(error.message);}};
$('account-refresh').onclick=()=>void refresh();
$('account-portal').onclick=()=>void openPayment('/api/billing/portal');
$('account-section').onchange=event=>{if(event.target.value==='moods')location.assign('./mood-creator.html#my-moods');else location.hash=event.target.value;};
$('account-edit-profile').onclick=()=>clerk?.openUserProfile?.({appearance:{variables:{colorBackground:'#1a1b19',colorText:'#eeeae2',colorTextSecondary:'#aaa9a1',colorPrimary:'#eeeae2',colorInputBackground:'#252622',colorInputText:'#eeeae2',borderRadius:'8px'}}});
$('referrals-copy').onclick=async()=>{
  const current=revision;
  try{await navigator.clipboard.writeText($('referrals-url').value);if(current===revision)$('referrals-status').textContent='Invite link copied.';}
  catch{if(current===revision){$('referrals-url').focus();$('referrals-url').select();$('referrals-status').textContent='Select and copy your invite link.';}}
};
$('settings-close-account').onclick=()=>{$('account-close-confirm').value='';$('account-close-submit').disabled=true;$('account-close-status').textContent='';$('account-close-dialog').showModal();};
$('account-close-confirm').oninput=()=>{$('account-close-submit').disabled=$('account-close-confirm').value!=='DELETE MY PV LAB ACCOUNT';};
$('account-close-submit').onclick=async()=>{
  const current=revision;$('account-close-submit').disabled=true;$('account-close-status').textContent='Submitting your closure request…';
  try{await api('/api/customer/account',{method:'DELETE',body:{confirmation:$('account-close-confirm').value}});if(current!==revision)return;$('account-close-dialog').close();await refresh();}
  catch(error){if(current===revision){$('account-close-status').textContent=error.message;$('account-close-submit').disabled=$('account-close-confirm').value!=='DELETE MY PV LAB ACCOUNT';}}
};
window.addEventListener('hashchange',paintRoute);
try{clerk=await loadLabAccount();clerk.addListener(()=>void refresh());await refresh();}
catch{status('Sign-in could not load. Reload this page to try again.');$('account-signin').disabled=true;}
