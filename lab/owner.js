import {loadLabAccount} from './native-account.js?v=20261012-unified-header1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
const $=id=>document.getElementById(id);
const apiBase='https://parallel-vision-lab.parallelvision.workers.dev';
let clerk=null,revision=0,profile=null,creating=false,syncing=false,emailSyncReady=false,fetchSerial=0,searchTimer=null,syncNotice='';
const request=createSessionRequest({baseUrl:apiBase,getSession:()=>clerk?.session});
const formatNumber=n=>Number.isSafeInteger(Number(n))?Number(n).toLocaleString('en-GB'):'—';
const formatDate=t=>Number.isFinite(Number(t))&&Number(t)>0?new Date(Number(t)).toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'}):'—';
const status=message=>{$('owner-status').textContent=message||'';};
async function call(path,{method='GET',body}={}){
  const response=await request(path,{method,...(body?{headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}:{})});
  const value=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(value.error||'Owner request could not be completed.');
  return value;
}
function rowInto(tbody,items,values,emptyMessage='Nothing to show yet.'){
  tbody.replaceChildren();
  if(!items.length){
    const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=values.length;
    td.textContent=emptyMessage;td.className='owner-table-empty';tr.append(td);tbody.append(tr);return;
  }
  for(const item of items){
    const tr=document.createElement('tr');
    for(const cell of values){
      const td=document.createElement('td');
      const data=cell(item);
      if(typeof data==='string'||typeof data==='number')td.textContent=String(data);
      else if(data&&typeof data==='object'){
        const strong=document.createElement('strong');strong.textContent=data.primary||'—';td.append(strong);
        if(data.secondary){const small=document.createElement('small');small.textContent=data.secondary;td.append(small);}
      }
      tr.append(td);
    }
    tbody.append(tr);
  }
}
// Mobile layout reads the real column headings instead of duplicating them in CSS.
function labelTableCellsForMobile(){
  for(const table of document.querySelectorAll('.owner-table-wrap table')){
    const headings=Array.from(table.querySelectorAll('thead th'),th=>th.textContent.trim());
    for(const row of table.tBodies[0]?.rows||[]){
      Array.from(row.cells).forEach((cell,index)=>{
        if(cell.colSpan===1&&headings[index])cell.dataset.label=headings[index];
      });
    }
  }
}

let recentFilter='all',recentCustomers=[],recentPayments=[];
function recentRow(list,index,{primary,secondary,emphasis,at}){
  const li=document.createElement('li');li.className='owner-recent-item';
  const number=document.createElement('span');number.className='owner-recent-number';
  number.textContent=String(index+1).padStart(2,'0');number.setAttribute('aria-hidden','true');
  const info=document.createElement('div');info.className='owner-recent-person';
  const avatar=document.createElement('span');avatar.className='owner-recent-avatar';
  avatar.textContent=String(primary||'U').charAt(0).toUpperCase();avatar.setAttribute('aria-hidden','true');
  const inner=document.createElement('div');inner.className='owner-recent-person-detail';
  const name=document.createElement('strong');name.textContent=primary||'—';name.title=primary||'';
  const details=document.createElement('small');details.textContent=secondary||'';details.title=secondary||'';
  inner.append(name,details);info.append(avatar,inner);
  const label=document.createElement('span');label.className='owner-recent-status';label.textContent=emphasis||'—';
  const when=document.createElement('time');when.className='owner-recent-date';when.textContent=formatDate(at);
  if(Number.isFinite(Number(at))&&Number(at)>0){
    const date=new Date(Number(at));
    when.dateTime=date.toISOString();
    const clock=document.createElement('small');
    clock.textContent=date.toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
    when.append(clock);
  }
  li.append(number,info,label,when);list.append(li);
}
function paintRecentActivity(){
  for(const button of document.querySelectorAll('[data-recent-filter]'))
    button.setAttribute('aria-pressed',String(button.dataset.recentFilter===recentFilter));
  const subscribed=recentFilter==='subscribed';
  $('owner-recent-title').firstChild.textContent=subscribed?'Latest subscribers':'Latest signups';
  const eligible=subscribed
    ?recentCustomers.filter(customer=>['active','trialing'].includes(customer.subscription))
    :recentCustomers;
  const visible=eligible.slice(0,5),signupList=$('owner-recent-signups');signupList.replaceChildren();
  if(!visible.length){
    const li=document.createElement('li');li.className='owner-recent-empty';
    li.textContent=subscribed?'No active or trialing subscribers among the recent accounts.':'No customer signups yet.';
    signupList.append(li);
  }
  visible.forEach((customer,index)=>{
    const isSubscriber=['active','trialing'].includes(customer.subscription);
    recentRow(signupList,index,{
      primary:customer.email||customer.id,secondary:customer.email?customer.id:'Email pending Clerk sync',
      emphasis:customer.subscription==='trialing'?'Trial':isSubscriber?'Subscribed':Number(customer.verifiedPayments)>0?'Purchased':'Joined',
      at:customer.joinedAt
    });
  });
  $('owner-recent-note').textContent=subscribed
    ?'Active or trialing subscribers, ordered by account signup date. Recent 80-account window.'
    :'Showing '+Math.min(recentCustomers.length,5)+' most recent signup'+(Math.min(recentCustomers.length,5)===1?'':'s')+'. This list stays unfiltered when searching the full directory.';
  const paymentList=$('owner-recent-payments');paymentList.replaceChildren();
  if(!recentPayments.length){
    const li=document.createElement('li');li.className='owner-recent-empty';
    li.textContent='No verified purchases yet.';paymentList.append(li);
  }
  recentPayments.slice(0,3).forEach((payment,index)=>recentRow(paymentList,index,{
    primary:payment.email||payment.customerId,
    secondary:payment.kind==='subscription'?'Subscription invoice':'One-time credit purchase',
    emphasis:'+'+formatNumber(payment.credits)+' credits',at:payment.paidAt
  }));
}

// Provider finance is a separate owner-only read-only route; no frontend provider keys.
let providerRequestSerial=0;
const validProviderIds=new Set(['spicy','fal','higgsfield','gemini','fashn']);
const providerMarks=Object.freeze({
  spicy:{abbrev:'SP',url:'https://spicyapi.ai/favicon.ico'},
  fal:{abbrev:'fal',url:'https://fal.ai/favicon.ico'},
  higgsfield:{abbrev:'HF',url:'https://higgsfield.ai/favicon.ico'},
  gemini:{abbrev:'G',url:'https://aistudio.google.com/favicon.ico'},
  fashn:{abbrev:'F',url:'https://fashn.ai/favicon.ico'}
});
const providerBilling=Object.freeze({
  spicy:'https://spicyapi.ai/console/billing',
  fal:'https://fal.ai/dashboard/billing',
  higgsfield:'https://open.higgsfield.ai',
  gemini:'https://aistudio.google.com/billing',
  fashn:'https://app.fashn.ai/billing/api'
});
function node(tag,className,content){
  const el=document.createElement(tag);
  if(className)el.className=className;
  if(content!==undefined&&content!==null)el.textContent=String(content);
  return el;
}
function providerAmount(value,unit){
  if(value==null)return null;
  const n=Number(value);
  if(!Number.isFinite(n))return null;
  if(unit==='credits')return n.toLocaleString('en-GB',{maximumFractionDigits:0})+' credits';
  if(unit==='USD')return '
  const s=data.summary||{};
  $('owner-total-accounts').textContent=formatNumber(s.accounts);
  $('owner-paying').textContent=formatNumber(s.payingCustomers);
  $('owner-subs').textContent=formatNumber(s.activeSubscriptions);
  $('owner-redemptions').textContent=formatNumber(s.voucherClaims);
  $('owner-referral-summary').textContent=formatNumber(s.rewardedReferrals)+' verified referral rewards issued. Recent attribution is listed below.';
  const customerCount=(data.customers||[]).length,query=$('owner-search').value.trim();
  // The directory search must not replace the account-wide latest-signups feed.
  if(!query){
    recentCustomers=Array.isArray(data.customers)?data.customers:[];
    recentPayments=Array.isArray(data.payments)?data.payments:[];
  }
  paintRecentActivity();
  $('owner-customer-count').textContent=query
    ?formatNumber(customerCount)+' matching accounts. Search applies to customers only.'
    :formatNumber(customerCount)+(customerCount>=80?' most recent accounts shown (limit 80).':' customer accounts shown. Verified emails come directly from Clerk.');
  $('owner-search-clear').hidden=!query;
  rowInto($('owner-customers'),data.customers||[],[
    c=>({primary:c.email||'Email not synced',secondary:c.id}),
    c=>formatDate(c.joinedAt),
    c=>formatNumber(c.balanceCredits),
    c=>formatNumber(c.verifiedPayments),
    c=>c.subscription&&c.subscription!=='none'?({primary:c.subscription,secondary:c.plan||''}):'—',
    c=>formatDate(c.lastPaidAt)
  ],query?'No matching accounts. Try a different email or account ID.':'No customer accounts have joined yet.');
  rowInto($('owner-payments'),data.payments||[],[
    p=>({primary:p.email||p.customerId,secondary:p.email?p.customerId:''}),
    p=>p.kind==='subscription'?'Subscription invoice':'One-time purchase',
    p=>'+'+formatNumber(p.credits),
    p=>formatDate(p.paidAt),
    p=>p.reference||'—'
  ],'No verified payments yet.');
  rowInto($('owner-referrals'),data.referrals||[],[
    r=>({primary:r.referrerEmail||r.referrerId,secondary:r.referrerEmail?r.referrerId:''}),
    r=>({primary:r.invitedEmail||r.invitedId,secondary:r.invitedEmail?r.invitedId:''}),
    r=>formatDate(r.joinedAt),
    r=>r.rewardedAt?'200 + 200 credits':'Awaiting qualified payment'
  ],'No referral invitations have been accepted yet.');
  const vouchers=data.vouchers||[],body=$('owner-vouchers');body.replaceChildren();
  if(!vouchers.length){
    const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No promotional codes yet.';tr.append(td);body.append(tr);
  }
  for(const voucher of vouchers){
    const tr=document.createElement('tr');
    const expired=voucher.expiresAt&&voucher.expiresAt<=Date.now();
    const full=voucher.redemptionCount>=voucher.maxRedemptions;
    const state=!voucher.active?'Inactive':expired?'Expired':full?'Fully used':'Active';
    const cells=[
      {primary:voucher.code,secondary:voucher.note||''},
      formatNumber(voucher.credits),
      formatNumber(voucher.redemptionCount)+' / '+formatNumber(voucher.maxRedemptions),
      formatDate(voucher.expiresAt),
      state
    ];
    for(const item of cells){
      const td=document.createElement('td');
      if(typeof item==='string')td.textContent=item;
      else{const strong=document.createElement('strong');strong.textContent=item.primary;td.append(strong);
        if(item.secondary){const small=document.createElement('small');small.textContent=item.secondary;td.append(small);}}
      tr.append(td);
    }
    const actions=document.createElement('td');
    if(state==='Active'){
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.addEventListener('click',()=>void copyLink(voucher.url,copy));actions.append(copy);
      const disable=document.createElement('button');disable.type='button';disable.textContent='Deactivate';
      disable.addEventListener('click',()=>void deactivate(voucher.code,disable));actions.append(disable);
    }else actions.textContent='—';
    tr.append(actions);body.append(tr);
  }
  emailSyncReady=!!data.emailSyncConfigured;
  const shownEmails=(data.customers||[]).filter(customer=>customer.email).length;
  const directoryText=query
    ?formatNumber(shownEmails)+' verified emails in these search results.'
    :formatNumber(shownEmails)+' verified emails visible across '+formatNumber(customerCount)+' listed accounts.';
  $('owner-sync-state').textContent=emailSyncReady?'Clerk key installed':'Clerk email sync needs setup';
  $('owner-sync-copy').textContent=emailSyncReady
    ?directoryText+' Select Sync to check Clerk API access and fetch verified emails.'
    :'Customer accounts and credits are available. Connect a private Clerk key to display verified signup emails.';
  $('owner-integrations').hidden=false;
  $('owner-setup-toggle').hidden=emailSyncReady;
  if(emailSyncReady){$('owner-setup-guide').hidden=true;$('owner-setup-toggle').setAttribute('aria-expanded','false');}
  $('owner-email-status').textContent=syncNotice||(emailSyncReady
    ?'Only verified primary Clerk emails appear here. Click Sync to check earlier accounts.'
    :'Email addresses cannot be retrieved without the server-side Clerk key. Open the connection guide above.');
  $('owner-sync').disabled=!emailSyncReady||syncing;
  $('owner-last-update').textContent='Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  labelTableCellsForMobile();
  $('owner-dashboard').hidden=false;
}
async function refreshDashboard(){
  if(!profile?.owner)return;
  const current=revision,requestId=++fetchSerial,search=$('owner-search').value.trim();
  $('owner-refresh').disabled=true;$('owner-refresh').textContent='Refreshing…';
  try{
    const data=await call('/api/admin/overview'+(search?'?search='+encodeURIComponent(search):''));
    if(current!==revision||requestId!==fetchSerial)return;
    render(data);status('');
  }catch(error){if(current===revision&&requestId===fetchSerial)status(error.message);}
  finally{if(current===revision&&requestId===fetchSerial){$('owner-refresh').disabled=false;$('owner-refresh').textContent='Refresh data ↻';}}
}
async function refreshSession(){
  const current=++revision;fetchSerial++;profile=null;$('owner-dashboard').hidden=true;$('owner-gate').hidden=true;
  recentCustomers=[];recentPayments=[];recentFilter='all';syncNotice='';$('owner-search').value='';
  providerRequestSerial++;
  $('owner-provider-previews').replaceChildren(node('p','owner-providers-loading','Loading available provider balances…'));
  $('owner-provider-details').replaceChildren(node('p','owner-providers-loading','Waiting for provider report…'));
  $('owner-customer-liability').textContent='Unavailable';$('owner-balance-updated').textContent='Awaiting secure connection';
  for(const id of ['owner-customers','owner-payments','owner-referrals','owner-vouchers'])$(id).replaceChildren();
  if(!clerk?.isSignedIn){status('');$('owner-gate').hidden=false;return;}
  status('Checking your owner access…');
  try{
    const result=await call('/api/session');if(current!==revision)return;
    if(result.owner!==true)throw Error('This page is reserved for the PV LAB owner account.');
    profile=result;await refreshDashboard();void refreshProviderFinances();
  }catch(error){if(current===revision){$('owner-dashboard').hidden=true;status(error.message);}}
}
async function copyLink(url,button){
  try{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!['parallelvisionlabel.com','www.parallelvisionlabel.com'].includes(parsed.hostname)||parsed.pathname!=='/lab/account.html'||parsed.username||parsed.password)throw Error();
    await navigator.clipboard.writeText(parsed.href);button.textContent='Copied';
  }catch{button.textContent='Select link to copy';$('owner-voucher-result').hidden=false;$('owner-voucher-link').value=url;$('owner-voucher-link').select();}
}
async function deactivate(code,button){
  if(!profile?.owner||!window.confirm('Deactivate voucher '+code+'? Existing redeemed credits remain valid.'))return;
  button.disabled=true;
  try{await call('/api/admin/vouchers/deactivate',{method:'POST',body:{code}});await refreshDashboard();}
  catch(error){status(error.message);}finally{button.disabled=false;}
}
for(const button of document.querySelectorAll('[data-recent-filter]'))button.addEventListener('click',()=>{
  recentFilter=button.dataset.recentFilter==='subscribed'?'subscribed':'all';
  paintRecentActivity();
});
for(const button of document.querySelectorAll('[data-owner-balance-refresh]'))
  button.addEventListener('click',()=>void refreshProviderFinances(true));
$('owner-quick-search').addEventListener('click',()=>{
  if(!profile?.owner){clerk?.openSignIn();return;}
  $('owner-customers-section').scrollIntoView({behavior:'smooth',block:'start'});
  $('owner-search').focus({preventScroll:true});
});
for(const link of document.querySelectorAll('[data-owner-nav]'))link.addEventListener('click',()=>{
  for(const previous of document.querySelectorAll('[data-owner-nav][aria-current]'))previous.removeAttribute('aria-current');
  link.setAttribute('aria-current','location');
});
$('owner-search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);void refreshDashboard();});
$('owner-search').addEventListener('input',()=>{clearTimeout(searchTimer);$('owner-search-clear').hidden=!$('owner-search').value.trim();searchTimer=setTimeout(()=>void refreshDashboard(),320);});
$('owner-search-clear').addEventListener('click',()=>{$('owner-search').value='';$('owner-search-clear').hidden=true;clearTimeout(searchTimer);void refreshDashboard();$('owner-search').focus();});
$('owner-refresh').addEventListener('click',()=>{clearTimeout(searchTimer);void refreshDashboard();});
$('owner-setup-toggle').addEventListener('click',()=>{
  const open=$('owner-setup-guide').hidden;$('owner-setup-guide').hidden=!open;
  $('owner-setup-toggle').setAttribute('aria-expanded',String(open));
});
function syncFeedback(result){
  const issues=result.issues||{},requested=Number(result.requested)||0,verified=Number(result.verified)||0,unverified=Number(result.unverified)||0;
  if(issues.invalidKey)return 'Clerk rejected the secret key. Check that LAB_CLERK_SECRET_KEY contains the sk_live_ key from Parallel Vision → Production, then save and deploy.';
  if(issues.missingUser)return 'Clerk could not find '+issues.missingUser+' customer record(s). Verify the secret belongs to the same Production Clerk application as PV LAB.';
  if(issues.transient)return 'Clerk could not complete '+issues.transient+' request(s). Try again later. The key and network connection may need checking.';
  if(issues.missingKey)return 'The Cloudflare Clerk secret is missing. Check LAB_CLERK_SECRET_KEY.';
  if(!requested)return 'All currently eligible customer email records have been checked.';
  if(verified)return verified+' verified email'+(verified===1?'':'s')+' fetched from Clerk.'+(unverified?' '+unverified+' account(s) have no verified primary email.':'');
  if(unverified)return 'Clerk is responding, but '+unverified+' account(s) have no verified primary email. Check email verification in Clerk → Users.';
  // Older deployed Workers may not yet include diagnostic fields.
  if(Number(result.synced)===0)return 'No emails were synchronized. The Worker did not provide a reason. Check the deployed Worker version and its Clerk connection.';
  return Number(result.synced)+' account(s) checked. Refresh to confirm their emails.';
}
$('owner-sync').addEventListener('click',async()=>{
  if(syncing||!profile?.owner)return;
  syncing=true;$('owner-sync').disabled=true;syncNotice='Checking Clerk securely…';
  $('owner-email-status').textContent=syncNotice;
  try{
    const result=await call('/api/admin/customers/sync',{method:'POST'});
    syncNotice=syncFeedback(result);
    await refreshDashboard();
    $('owner-email-status').textContent=syncNotice;
  }catch(error){syncNotice=error.message||'Unable to sync Clerk emails.';$('owner-email-status').textContent=syncNotice;}
  finally{syncing=false;$('owner-sync').disabled=!emailSyncReady;}
});

$('owner-voucher-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!profile?.owner||creating)return;
  const form=event.currentTarget,data=new FormData(form);
  const date=String(data.get('expires')||''),expiresAt=date?new Date(date+'T23:59:59').getTime():null;
  creating=true;$('owner-create-voucher').disabled=true;$('owner-create-status').textContent='Preparing a private credit link…';
  try{
    const result=await call('/api/admin/vouchers',{method:'POST',body:{
      credits:Number(data.get('credits')),maxRedemptions:Number(data.get('maxRedemptions')),
      expiresAt,code:String(data.get('code')||'').trim(),note:String(data.get('note')||'').trim()
    }});
    $('owner-voucher-link').value=result.voucher.url;
    $('owner-voucher-code').value=result.voucher.code;
    $('owner-voucher-placeholder').hidden=true;$('owner-voucher-result').hidden=false;
    $('owner-copy-link').textContent='Copy link';$('owner-copy-code').textContent='Copy code';
    $('owner-create-status').textContent=result.voucher.code+' is ready. No credits are issued until redeemed.';
    await refreshDashboard();
  }catch(error){$('owner-create-status').textContent=error.message;}
  finally{creating=false;$('owner-create-voucher').disabled=false;}
});
$('owner-copy-link').addEventListener('click',()=>void copyLink($('owner-voucher-link').value,$('owner-copy-link')));
$('owner-copy-code').addEventListener('click',async()=>{
  const button=$('owner-copy-code'),code=$('owner-voucher-code').value;
  try{await navigator.clipboard.writeText(code);button.textContent='Copied';}
  catch{$('owner-voucher-code').select();button.textContent='Select to copy';}
});
function updateVoucherEstimate(){
  const credits=Number($('owner-voucher-credits').value),limit=Number($('owner-voucher-limit').value);
  const valid=Number.isSafeInteger(credits)&&credits>=1&&credits<=20000&&Number.isSafeInteger(limit)&&limit>=1&&limit<=1000;
  $('owner-voucher-estimate').textContent=valid
    ?formatNumber(credits)+' credits × '+formatNumber(limit)+(limit===1?' person':' people')+' = '+formatNumber(credits*limit)+' credits maximum. Issued only when claimed.'
    :'Choose a valid credit amount and redemption limit.';
  for(const preset of document.querySelectorAll('[data-credit-preset]'))
    preset.setAttribute('aria-pressed',String(Number(preset.dataset.creditPreset)===credits));
}
$('owner-voucher-form').addEventListener('input',updateVoucherEstimate);
$('owner-voucher-form').addEventListener('change',updateVoucherEstimate);
for(const preset of document.querySelectorAll('[data-credit-preset]'))preset.addEventListener('click',()=>{
  $('owner-voucher-credits').value=preset.dataset.creditPreset;updateVoucherEstimate();
});
updateVoucherEstimate();
$('owner-signin').addEventListener('click',()=>clerk?.openSignIn());
try{clerk=await loadLabAccount();clerk.addListener(()=>void refreshSession());await refreshSession();}
catch{status('Sign-in could not load. Reload this page to try again.');$('owner-gate').hidden=false;$('owner-signin').disabled=true;}
+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  return null;
}
function providerDate(isoDate){
  if(!isoDate)return 'Not available';
  const t=Date.parse(isoDate);if(!Number.isFinite(t))return 'Not available';
  return new Date(t).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
}
function providerStatus(p){
  if(!p.configured)return {level:'offline',text:'Not configured'};
  if(p.low&&p.balance!=null)return {level:'low',text:'Low balance'};
  if(p.status==='live')return {level:'live',text:'Live data'};
  if(p.status==='configured')return {level:'unknown',text:'API configured'};
  return {level:'unknown',text:p.status==='permission-required'?'Billing access needed':'Unavailable'};
}
function providerMark(id){
  const mark=node('span','owner-provider-mark',providerMarks[id]?.abbrev||'?');
  const logo=providerMarks[id];
  if(logo){const img=document.createElement('img');img.src=logo.url;img.alt='';img.loading='lazy';img.referrerPolicy='no-referrer';img.addEventListener('error',()=>img.remove());mark.append(img);}
  return mark;
}
function stat(label,value,detail){
  const box=node('div','owner-provider-stat');
  box.append(node('span','',label),node('strong','',value));
  if(detail)box.append(node('small','',detail));
  return box;
}
function statusLabel(p){
  const s=providerStatus(p),el=node('span','owner-provider-status',s.text);el.dataset.level=s.level;return el;
}
function renderProviderFinances(data){
  if(!Array.isArray(data?.providers))throw Error('The provider report format could not be verified.');
  const preview=$('owner-provider-previews'),detail=$('owner-provider-details');
  preview.replaceChildren();detail.replaceChildren();
  for(const p of data.providers){
    if(!validProviderIds.has(p.id))continue;
    const displayedBalance=providerAmount(p.balance,p.balanceUnit)||'Balance unavailable';
    const card=node('a','owner-provider-preview');
    card.href='#owner-providers-section';
    const heading=node('div','owner-provider-preview-head');
    heading.append(providerMark(p.id),node('strong','owner-provider-name',p.name));card.append(heading);
    const number=node('div','owner-provider-preview-balance',displayedBalance);
    number.dataset.empty=String(p.balance==null);card.append(number);
    const foot=node('div','owner-provider-preview-foot');
    foot.append(node('span','',p.billingType||'Billing unavailable'),statusLabel(p));card.append(foot);preview.append(card);
    const full=node('article','owner-provider-detail');
    const identity=node('div','owner-provider-detail-identity');
    const title=node('div','');title.append(node('h3','',p.name),node('small','',p.billingType||'Check provider billing'));
    identity.append(providerMark(p.id),title);
    full.append(identity,
      stat('Available balance',displayedBalance,p.held!=null?'On hold: '+providerAmount(p.held,'USD'):''),
      stat('Spent today',providerAmount(p.spendToday,p.spendUnit)||'Unavailable',p.spendKind||''),
      stat('This month',providerAmount(p.spendMonth,p.spendUnit)||'Unavailable',p.spendKind||''),
      stat('Last successful sync',providerDate(p.lastSuccess),p.lastChecked?'Checked '+providerDate(p.lastChecked):''),
    );
    const action=node('div','owner-provider-detail-action');
    const a=node('a','','Billing dashboard ↗');
    a.href=providerBilling[p.id];a.target='_blank';a.rel='noopener noreferrer';
    action.append(statusLabel(p),a);full.append(action);
    if(p.id==='spicy'&&Array.isArray(p.keyUsage)&&p.keyUsage.length){
      const keys=node('div','owner-provider-key-usage');keys.append(node('p','','SpicyAPI · one shared wallet, per-key settled spending (UTC)'));
      const ul=document.createElement('ul');
      for(const key of p.keyUsage){
        const entry=node('li','');
        entry.append(node('strong','',key.label),node('span','',
          ' · Today: '+(providerAmount(key.spendToday,'USD')||'Unavailable')+
          ' · Month: '+(providerAmount(key.spendMonth,'USD')||'Unavailable')+
          ' · '+(key.configured?(key.status==='live'?'Verified':'Not available'):'Key not connected')));
        ul.append(entry);
      }
      keys.append(ul);full.append(keys);
    }
    if(p.components){
      const comp=node('div','owner-provider-key-usage');
      comp.append(node('p','','FASHN credit breakdown'),
        node('span','', 'Subscription: '+providerAmount(p.components.subscription,'credits')+
          ' · On-demand: '+providerAmount(p.components.onDemand,'credits')));
      full.append(comp);
    }
    if(p.note||p.error){
      const note=node('p','owner-provider-detail-note',[p.error,p.note].filter(Boolean).join(' '));
      full.append(note);
    }
    detail.append(full);
  }
  if(!preview.children.length)preview.append(node('p','owner-providers-loading','No connected provider information is available.'));
  const wallet=data.customerWallet;
  $('owner-customer-liability').textContent=wallet?.credits==null?'Unavailable':
    Number(wallet.credits).toLocaleString('en-GB')+' PV LAB credits';
  $('owner-customer-liability-note').textContent=wallet?.note||'Customer wallet credits are independent from provider funds.';
  const legacy=Array.isArray(data.legacy)?data.legacy:[];
  $('owner-provider-legacy').textContent=legacy.length
    ?legacy.map(item=>item.name+': '+item.status).join('. ')+'. Excluded from active provider balance totals.'
    :'No additional active generation providers were identified in the configured Worker.';
  $('owner-balance-updated').textContent='Report checked '+providerDate(data.asOf)+(data.cached?' · cached':'');
}
async function refreshProviderFinances(force=false){
  if(!profile?.owner)return;
  const requestId=++providerRequestSerial,current=revision;
  const buttons=[...document.querySelectorAll('[data-owner-balance-refresh]')];
  for(const button of buttons){button.disabled=true;button.textContent='Checking…';}
  $('owner-balance-updated').textContent='Checking read-only provider APIs…';
  try{
    const data=await call('/api/admin/providers'+(force?'?refresh=1':''));
    if(current!==revision||requestId!==providerRequestSerial)return;
    renderProviderFinances(data);
  }catch(error){
    if(current!==revision||requestId!==providerRequestSerial)return;
    $('owner-balance-updated').textContent='Provider information unavailable';
    const message=error instanceof Error?'Provider data could not be loaded. Try Refresh balances.':'Provider check unavailable.';
    if(!$('owner-provider-previews').querySelector('.owner-provider-preview'))
      $('owner-provider-previews').replaceChildren(node('p','owner-providers-loading',message));
    if(!$('owner-provider-details').querySelector('.owner-provider-detail'))
      $('owner-provider-details').replaceChildren(node('p','owner-providers-loading',message));
  }finally{
    if(current===revision&&requestId===providerRequestSerial)
      for(const button of buttons){button.disabled=false;button.textContent='Refresh balances ↻';}
  }
}

function render(data){
  const s=data.summary||{};
  $('owner-total-accounts').textContent=formatNumber(s.accounts);
  $('owner-paying').textContent=formatNumber(s.payingCustomers);
  $('owner-subs').textContent=formatNumber(s.activeSubscriptions);
  $('owner-redemptions').textContent=formatNumber(s.voucherClaims);
  $('owner-referral-summary').textContent=formatNumber(s.rewardedReferrals)+' verified referral rewards issued. Recent attribution is listed below.';
  const customerCount=(data.customers||[]).length,query=$('owner-search').value.trim();
  // The directory search must not replace the account-wide latest-signups feed.
  if(!query){
    recentCustomers=Array.isArray(data.customers)?data.customers:[];
    recentPayments=Array.isArray(data.payments)?data.payments:[];
  }
  paintRecentActivity();
  $('owner-customer-count').textContent=query
    ?formatNumber(customerCount)+' matching accounts. Search applies to customers only.'
    :formatNumber(customerCount)+(customerCount>=80?' most recent accounts shown (limit 80).':' customer accounts shown. Verified emails come directly from Clerk.');
  $('owner-search-clear').hidden=!query;
  rowInto($('owner-customers'),data.customers||[],[
    c=>({primary:c.email||'Email not synced',secondary:c.id}),
    c=>formatDate(c.joinedAt),
    c=>formatNumber(c.balanceCredits),
    c=>formatNumber(c.verifiedPayments),
    c=>c.subscription&&c.subscription!=='none'?({primary:c.subscription,secondary:c.plan||''}):'—',
    c=>formatDate(c.lastPaidAt)
  ],query?'No matching accounts. Try a different email or account ID.':'No customer accounts have joined yet.');
  rowInto($('owner-payments'),data.payments||[],[
    p=>({primary:p.email||p.customerId,secondary:p.email?p.customerId:''}),
    p=>p.kind==='subscription'?'Subscription invoice':'One-time purchase',
    p=>'+'+formatNumber(p.credits),
    p=>formatDate(p.paidAt),
    p=>p.reference||'—'
  ],'No verified payments yet.');
  rowInto($('owner-referrals'),data.referrals||[],[
    r=>({primary:r.referrerEmail||r.referrerId,secondary:r.referrerEmail?r.referrerId:''}),
    r=>({primary:r.invitedEmail||r.invitedId,secondary:r.invitedEmail?r.invitedId:''}),
    r=>formatDate(r.joinedAt),
    r=>r.rewardedAt?'200 + 200 credits':'Awaiting qualified payment'
  ],'No referral invitations have been accepted yet.');
  const vouchers=data.vouchers||[],body=$('owner-vouchers');body.replaceChildren();
  if(!vouchers.length){
    const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=6;td.textContent='No promotional codes yet.';tr.append(td);body.append(tr);
  }
  for(const voucher of vouchers){
    const tr=document.createElement('tr');
    const expired=voucher.expiresAt&&voucher.expiresAt<=Date.now();
    const full=voucher.redemptionCount>=voucher.maxRedemptions;
    const state=!voucher.active?'Inactive':expired?'Expired':full?'Fully used':'Active';
    const cells=[
      {primary:voucher.code,secondary:voucher.note||''},
      formatNumber(voucher.credits),
      formatNumber(voucher.redemptionCount)+' / '+formatNumber(voucher.maxRedemptions),
      formatDate(voucher.expiresAt),
      state
    ];
    for(const item of cells){
      const td=document.createElement('td');
      if(typeof item==='string')td.textContent=item;
      else{const strong=document.createElement('strong');strong.textContent=item.primary;td.append(strong);
        if(item.secondary){const small=document.createElement('small');small.textContent=item.secondary;td.append(small);}}
      tr.append(td);
    }
    const actions=document.createElement('td');
    if(state==='Active'){
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.addEventListener('click',()=>void copyLink(voucher.url,copy));actions.append(copy);
      const disable=document.createElement('button');disable.type='button';disable.textContent='Deactivate';
      disable.addEventListener('click',()=>void deactivate(voucher.code,disable));actions.append(disable);
    }else actions.textContent='—';
    tr.append(actions);body.append(tr);
  }
  emailSyncReady=!!data.emailSyncConfigured;
  const shownEmails=(data.customers||[]).filter(customer=>customer.email).length;
  const directoryText=query
    ?formatNumber(shownEmails)+' verified emails in these search results.'
    :formatNumber(shownEmails)+' verified emails visible across '+formatNumber(customerCount)+' listed accounts.';
  $('owner-sync-state').textContent=emailSyncReady?'Clerk key installed':'Clerk email sync needs setup';
  $('owner-sync-copy').textContent=emailSyncReady
    ?directoryText+' Select Sync to check Clerk API access and fetch verified emails.'
    :'Customer accounts and credits are available. Connect a private Clerk key to display verified signup emails.';
  $('owner-integrations').hidden=false;
  $('owner-setup-toggle').hidden=emailSyncReady;
  if(emailSyncReady){$('owner-setup-guide').hidden=true;$('owner-setup-toggle').setAttribute('aria-expanded','false');}
  $('owner-email-status').textContent=syncNotice||(emailSyncReady
    ?'Only verified primary Clerk emails appear here. Click Sync to check earlier accounts.'
    :'Email addresses cannot be retrieved without the server-side Clerk key. Open the connection guide above.');
  $('owner-sync').disabled=!emailSyncReady||syncing;
  $('owner-last-update').textContent='Updated '+new Date().toLocaleTimeString('en-GB',{hour:'2-digit',minute:'2-digit'});
  labelTableCellsForMobile();
  $('owner-dashboard').hidden=false;
}
async function refreshDashboard(){
  if(!profile?.owner)return;
  const current=revision,requestId=++fetchSerial,search=$('owner-search').value.trim();
  $('owner-refresh').disabled=true;$('owner-refresh').textContent='Refreshing…';
  try{
    const data=await call('/api/admin/overview'+(search?'?search='+encodeURIComponent(search):''));
    if(current!==revision||requestId!==fetchSerial)return;
    render(data);status('');
  }catch(error){if(current===revision&&requestId===fetchSerial)status(error.message);}
  finally{if(current===revision&&requestId===fetchSerial){$('owner-refresh').disabled=false;$('owner-refresh').textContent='Refresh data ↻';}}
}
async function refreshSession(){
  const current=++revision;fetchSerial++;profile=null;$('owner-dashboard').hidden=true;$('owner-gate').hidden=true;
  recentCustomers=[];recentPayments=[];recentFilter='all';syncNotice='';$('owner-search').value='';
  for(const id of ['owner-customers','owner-payments','owner-referrals','owner-vouchers'])$(id).replaceChildren();
  if(!clerk?.isSignedIn){status('');$('owner-gate').hidden=false;return;}
  status('Checking your owner access…');
  try{
    const result=await call('/api/session');if(current!==revision)return;
    if(result.owner!==true)throw Error('This page is reserved for the PV LAB owner account.');
    profile=result;await refreshDashboard();
  }catch(error){if(current===revision){$('owner-dashboard').hidden=true;status(error.message);}}
}
async function copyLink(url,button){
  try{
    const parsed=new URL(url);
    if(parsed.protocol!=='https:'||!['parallelvisionlabel.com','www.parallelvisionlabel.com'].includes(parsed.hostname)||parsed.pathname!=='/lab/account.html'||parsed.username||parsed.password)throw Error();
    await navigator.clipboard.writeText(parsed.href);button.textContent='Copied';
  }catch{button.textContent='Select link to copy';$('owner-voucher-result').hidden=false;$('owner-voucher-link').value=url;$('owner-voucher-link').select();}
}
async function deactivate(code,button){
  if(!profile?.owner||!window.confirm('Deactivate voucher '+code+'? Existing redeemed credits remain valid.'))return;
  button.disabled=true;
  try{await call('/api/admin/vouchers/deactivate',{method:'POST',body:{code}});await refreshDashboard();}
  catch(error){status(error.message);}finally{button.disabled=false;}
}
for(const button of document.querySelectorAll('[data-recent-filter]'))button.addEventListener('click',()=>{
  recentFilter=button.dataset.recentFilter==='subscribed'?'subscribed':'all';
  paintRecentActivity();
});
$('owner-search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);void refreshDashboard();});
$('owner-search').addEventListener('input',()=>{clearTimeout(searchTimer);$('owner-search-clear').hidden=!$('owner-search').value.trim();searchTimer=setTimeout(()=>void refreshDashboard(),320);});
$('owner-search-clear').addEventListener('click',()=>{$('owner-search').value='';$('owner-search-clear').hidden=true;clearTimeout(searchTimer);void refreshDashboard();$('owner-search').focus();});
$('owner-refresh').addEventListener('click',()=>{clearTimeout(searchTimer);void refreshDashboard();});
$('owner-setup-toggle').addEventListener('click',()=>{
  const open=$('owner-setup-guide').hidden;$('owner-setup-guide').hidden=!open;
  $('owner-setup-toggle').setAttribute('aria-expanded',String(open));
});
function syncFeedback(result){
  const issues=result.issues||{},requested=Number(result.requested)||0,verified=Number(result.verified)||0,unverified=Number(result.unverified)||0;
  if(issues.invalidKey)return 'Clerk rejected the secret key. Check that LAB_CLERK_SECRET_KEY contains the sk_live_ key from Parallel Vision → Production, then save and deploy.';
  if(issues.missingUser)return 'Clerk could not find '+issues.missingUser+' customer record(s). Verify the secret belongs to the same Production Clerk application as PV LAB.';
  if(issues.transient)return 'Clerk could not complete '+issues.transient+' request(s). Try again later. The key and network connection may need checking.';
  if(issues.missingKey)return 'The Cloudflare Clerk secret is missing. Check LAB_CLERK_SECRET_KEY.';
  if(!requested)return 'All currently eligible customer email records have been checked.';
  if(verified)return verified+' verified email'+(verified===1?'':'s')+' fetched from Clerk.'+(unverified?' '+unverified+' account(s) have no verified primary email.':'');
  if(unverified)return 'Clerk is responding, but '+unverified+' account(s) have no verified primary email. Check email verification in Clerk → Users.';
  // Older deployed Workers may not yet include diagnostic fields.
  if(Number(result.synced)===0)return 'No emails were synchronized. The Worker did not provide a reason. Check the deployed Worker version and its Clerk connection.';
  return Number(result.synced)+' account(s) checked. Refresh to confirm their emails.';
}
$('owner-sync').addEventListener('click',async()=>{
  if(syncing||!profile?.owner)return;
  syncing=true;$('owner-sync').disabled=true;syncNotice='Checking Clerk securely…';
  $('owner-email-status').textContent=syncNotice;
  try{
    const result=await call('/api/admin/customers/sync',{method:'POST'});
    syncNotice=syncFeedback(result);
    await refreshDashboard();
    $('owner-email-status').textContent=syncNotice;
  }catch(error){syncNotice=error.message||'Unable to sync Clerk emails.';$('owner-email-status').textContent=syncNotice;}
  finally{syncing=false;$('owner-sync').disabled=!emailSyncReady;}
});

$('owner-voucher-form').addEventListener('submit',async event=>{
  event.preventDefault();if(!profile?.owner||creating)return;
  const form=event.currentTarget,data=new FormData(form);
  const date=String(data.get('expires')||''),expiresAt=date?new Date(date+'T23:59:59').getTime():null;
  creating=true;$('owner-create-voucher').disabled=true;$('owner-create-status').textContent='Preparing a private credit link…';
  try{
    const result=await call('/api/admin/vouchers',{method:'POST',body:{
      credits:Number(data.get('credits')),maxRedemptions:Number(data.get('maxRedemptions')),
      expiresAt,code:String(data.get('code')||'').trim(),note:String(data.get('note')||'').trim()
    }});
    $('owner-voucher-link').value=result.voucher.url;
    $('owner-voucher-code').value=result.voucher.code;
    $('owner-voucher-placeholder').hidden=true;$('owner-voucher-result').hidden=false;
    $('owner-copy-link').textContent='Copy link';$('owner-copy-code').textContent='Copy code';
    $('owner-create-status').textContent=result.voucher.code+' is ready. No credits are issued until redeemed.';
    await refreshDashboard();
  }catch(error){$('owner-create-status').textContent=error.message;}
  finally{creating=false;$('owner-create-voucher').disabled=false;}
});
$('owner-copy-link').addEventListener('click',()=>void copyLink($('owner-voucher-link').value,$('owner-copy-link')));
$('owner-copy-code').addEventListener('click',async()=>{
  const button=$('owner-copy-code'),code=$('owner-voucher-code').value;
  try{await navigator.clipboard.writeText(code);button.textContent='Copied';}
  catch{$('owner-voucher-code').select();button.textContent='Select to copy';}
});
function updateVoucherEstimate(){
  const credits=Number($('owner-voucher-credits').value),limit=Number($('owner-voucher-limit').value);
  const valid=Number.isSafeInteger(credits)&&credits>=1&&credits<=20000&&Number.isSafeInteger(limit)&&limit>=1&&limit<=1000;
  $('owner-voucher-estimate').textContent=valid
    ?formatNumber(credits)+' credits × '+formatNumber(limit)+(limit===1?' person':' people')+' = '+formatNumber(credits*limit)+' credits maximum. Issued only when claimed.'
    :'Choose a valid credit amount and redemption limit.';
  for(const preset of document.querySelectorAll('[data-credit-preset]'))
    preset.setAttribute('aria-pressed',String(Number(preset.dataset.creditPreset)===credits));
}
$('owner-voucher-form').addEventListener('input',updateVoucherEstimate);
$('owner-voucher-form').addEventListener('change',updateVoucherEstimate);
for(const preset of document.querySelectorAll('[data-credit-preset]'))preset.addEventListener('click',()=>{
  $('owner-voucher-credits').value=preset.dataset.creditPreset;updateVoucherEstimate();
});
updateVoucherEstimate();
$('owner-signin').addEventListener('click',()=>clerk?.openSignIn());
try{clerk=await loadLabAccount();clerk.addListener(()=>void refreshSession());await refreshSession();}
catch{status('Sign-in could not load. Reload this page to try again.');$('owner-gate').hidden=false;$('owner-signin').disabled=true;}
