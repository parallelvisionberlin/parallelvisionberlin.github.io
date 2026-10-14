import {loadLabAccount} from './native-account.js?v=20261012-unified-header1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1';
const $=id=>document.getElementById(id);
const apiBase='https://parallel-vision-lab.parallelvision.workers.dev';
let clerk=null,revision=0,profile=null,creating=false,syncing=false;
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
function rowInto(tbody,items,values){
  tbody.replaceChildren();
  if(!items.length){
    const tr=document.createElement('tr'),td=document.createElement('td');td.colSpan=values.length;
    td.textContent='Nothing to show yet.';tr.append(td);tbody.append(tr);return;
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
function render(data){
  const s=data.summary||{};
  $('owner-total-accounts').textContent=formatNumber(s.accounts);
  $('owner-paying').textContent=formatNumber(s.payingCustomers);
  $('owner-subs').textContent=formatNumber(s.activeSubscriptions);
  $('owner-redemptions').textContent=formatNumber(s.voucherClaims);
  $('owner-referral-summary').textContent=formatNumber(s.rewardedReferrals)+' verified referral rewards issued. Recent attribution is listed below.';
  rowInto($('owner-customers'),data.customers||[],[
    c=>({primary:c.email||'Email not synced',secondary:c.id}),
    c=>formatDate(c.joinedAt),
    c=>formatNumber(c.balanceCredits),
    c=>formatNumber(c.verifiedPayments),
    c=>c.subscription&&c.subscription!=='none'?({primary:c.subscription,secondary:c.plan||''}):'—',
    c=>formatDate(c.lastPaidAt)
  ]);
  rowInto($('owner-payments'),data.payments||[],[
    p=>({primary:p.email||p.customerId,secondary:p.email?p.customerId:''}),
    p=>p.kind==='subscription'?'Subscription invoice':'One-time purchase',
    p=>'+'+formatNumber(p.credits),
    p=>formatDate(p.paidAt),
    p=>p.reference||'—'
  ]);
  rowInto($('owner-referrals'),data.referrals||[],[
    r=>({primary:r.referrerEmail||r.referrerId,secondary:r.referrerEmail?r.referrerId:''}),
    r=>({primary:r.invitedEmail||r.invitedId,secondary:r.invitedEmail?r.invitedId:''}),
    r=>formatDate(r.joinedAt),
    r=>r.rewardedAt?'200 + 200 credits':'Awaiting qualified payment'
  ]);
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
  $('owner-email-status').textContent=data.emailSyncConfigured
    ?'Only primary Clerk emails with verified status are displayed. Use Sync emails to backfill earlier accounts.'
    :'Verified signup emails are pending until the LAB_CLERK_SECRET_KEY Worker secret is configured.';
  $('owner-sync').disabled=!data.emailSyncConfigured;
  $('owner-dashboard').hidden=false;
}
async function refreshDashboard(){
  if(!profile?.owner)return;
  const current=revision,search=$('owner-search').value.trim();
  try{
    const data=await call('/api/admin/overview'+(search?'?search='+encodeURIComponent(search):''));
    if(current!==revision)return;
    render(data);status('');
  }catch(error){if(current===revision)status(error.message);}
}
async function refreshSession(){
  const current=++revision;profile=null;$('owner-dashboard').hidden=true;$('owner-gate').hidden=true;
  for(const id of ['owner-customers','owner-payments','owner-vouchers'])$(id).replaceChildren();
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
    if(parsed.origin!==location.origin||parsed.protocol!=='https:')throw Error();
    await navigator.clipboard.writeText(parsed.href);button.textContent='Copied';
  }catch{button.textContent='Select link to copy';$('owner-voucher-result').hidden=false;$('owner-voucher-link').value=url;$('owner-voucher-link').select();}
}
async function deactivate(code,button){
  if(!profile?.owner||!window.confirm('Deactivate voucher '+code+'? Existing redeemed credits remain valid.'))return;
  button.disabled=true;
  try{await call('/api/admin/vouchers/deactivate',{method:'POST',body:{code}});await refreshDashboard();}
  catch(error){status(error.message);}finally{button.disabled=false;}
}
$('owner-search-form').addEventListener('submit',event=>{event.preventDefault();void refreshDashboard();});
$('owner-refresh').addEventListener('click',()=>void refreshDashboard());
$('owner-sync').addEventListener('click',async()=>{
  if(syncing||!profile?.owner)return;syncing=true;$('owner-sync').disabled=true;$('owner-email-status').textContent='Syncing verified Clerk emails…';
  try{const result=await call('/api/admin/customers/sync',{method:'POST'});await refreshDashboard();
    $('owner-email-status').textContent='Synced '+result.synced+' of '+result.requested+' account records. Run again if more remain.';}
  catch(error){$('owner-email-status').textContent=error.message;}
  finally{syncing=false;$('owner-sync').disabled=false;}
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
    $('owner-voucher-link').value=result.voucher.url;$('owner-voucher-result').hidden=false;
    $('owner-create-status').textContent=result.voucher.code+' is ready. No credits are issued until redeemed.';
    await refreshDashboard();
  }catch(error){$('owner-create-status').textContent=error.message;}
  finally{creating=false;$('owner-create-voucher').disabled=false;}
});
$('owner-copy-link').addEventListener('click',()=>void copyLink($('owner-voucher-link').value,$('owner-copy-link')));
$('owner-signin').addEventListener('click',()=>clerk?.openSignIn());
try{clerk=await loadLabAccount();clerk.addListener(()=>void refreshSession());await refreshSession();}
catch{status('Sign-in could not load. Reload this page to try again.');$('owner-gate').hidden=false;$('owner-signin').disabled=true;}
