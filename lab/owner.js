import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createOwnerProviderUI} from './owner-providers-ui.js?v=20261014-v2-finance1';
import {createOwnerAcquisitionUI} from './owner-acquisition-ui.js?v=20261025-paged1';
import {renderOwnerPagination} from './owner-pagination.js?v=20261025-paged1';
import {createOwnerGenerationReviewUI} from './owner-generation-review-ui.js?v=20261017-v1';
import {createOwnerAuthGuard} from './owner-auth-guard.js?v=20261017-stability1';
const $=id=>document.getElementById(id);
const apiBase='https://parallel-vision-lab.parallelvision.workers.dev';
let clerk=null,revision=0,profile=null,creating=false,syncing=false,emailSyncReady=false,fetchSerial=0,searchTimer=null,syncNotice='',autoClerkSyncAttempted=false;
let voucherRecipientsObserver=null,voucherRecipientsGeneration=0;
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
const providerUI=createOwnerProviderUI({call,getOwner:()=>!!profile?.owner});
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
// Customer history stays private to the owner. Render only text, never HTML from job metadata.
const customerDialog=$('owner-customer-dialog');
let customerActivitySerial=0;
const activityDate=stamp=>Number.isFinite(Number(stamp))&&Number(stamp)>0
  ?new Date(Number(stamp)).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'—';
function activityElement(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
function activityTable(parent,{heading,note,columns,rows,emptyMessage}){
  const section=activityElement('section','owner-customer-activity-section');
  const head=activityElement('div','owner-customer-activity-section-head');
  head.append(activityElement('h3','',heading),activityElement('span','',note));
  section.append(head);
  if(!rows.length){section.append(activityElement('p','owner-customer-empty',emptyMessage));parent.append(section);return;}
  const wrap=activityElement('div','owner-customer-activity-table');
  const table=document.createElement('table'),thead=document.createElement('thead'),header=document.createElement('tr');
  for(const column of columns)header.append(activityElement('th','',column));
  thead.append(header);table.append(thead);
  const tbody=document.createElement('tbody');
  for(const data of rows){
    const tr=document.createElement('tr');
    data.forEach((value,index)=>{
      const td=document.createElement('td');td.dataset.label=columns[index];
      if(value&&typeof value==='object'){
        if(value.state){
          const badge=activityElement('span','owner-customer-job-state owner-customer-job-state-'+
            (['completed','failed','queued','running','submitting','saving','uncertain','resolved','draft'].includes(value.state)?value.state:'other'),value.state);
          td.append(badge);
        }else{
          td.append(activityElement('strong','',value.main||'—'));
          if(value.sub)td.append(activityElement('small','',value.sub));
        }
      }else td.textContent=String(value??'—');
      tr.append(td);
    });
    tbody.append(tr);
  }
  table.append(tbody);wrap.append(table);section.append(wrap);parent.append(section);
}
function paintCustomerActivity(data){
  const root=$('owner-customer-dialog-body');root.replaceChildren();
  const customer=data.customer||{},summary=data.summary||{};
  $('owner-customer-dialog-identity').textContent=(customer.email||customer.id||'Customer')+
    (customer.email?'  ·  '+customer.id:'');
  const stats=activityElement('div','owner-customer-activity-stats');
  for(const [label,value] of [
    ['Current balance',formatNumber(customer.balanceCredits)],
    ['Total jobs',formatNumber(summary.totalJobs)],
    ['Completed',formatNumber(summary.completedJobs)],
    ['Net credits spent',formatNumber(summary.netCreditsSpent)]
  ]){
    const stat=activityElement('div','owner-customer-activity-stat');
    stat.append(activityElement('span','',label),activityElement('strong','',value));
    stats.append(stat);
  }
  root.append(stats);
  const dollar=String.fromCharCode(36);
  root.append(activityElement('p','owner-customer-activity-caption',
    formatNumber(summary.failedJobs)+' failed jobs · '+
    formatNumber(summary.creditsCharged)+' credits charged · '+
    formatNumber(summary.creditsRefunded)+' refunded · '+
    formatNumber(summary.archivedJobs||0)+' finance records archived · '+
    dollar+Number(summary.providerExposureUsd||0).toFixed(2)+
    ' estimated/settled provider exposure. Credits are charged when jobs start.'));
  const jobs=Array.isArray(data.jobs)?data.jobs:[];
  activityTable(root,{
    heading:'Generation history',note:'Latest '+(data.limits?.jobs||50)+' jobs',
    columns:['Date','Model / provider','Type','Status','Credits'],
    rows:jobs.map(job=>{
      const charged=Number(job.chargedCredits)||0,refunded=Number(job.refundedCredits)||0;
      const type=job.type==='video'?'Video':job.type==='upscale'?'Upscale':job.type==='image'?'Image':job.type||'Job';
      return [activityDate(job.createdAt),
        {main:job.model||job.engine||'Model not recorded',sub:job.provider||job.engine||''},
        type,{state:job.state||'unknown'},
        charged?{main:charged===refunded?'0 net':'−'+formatNumber(charged-refunded),
          sub:refunded?'+'+formatNumber(refunded)+' refunded':''}:'No charge'];
    }),emptyMessage:'No generations recorded for this account.'
  });
  const archived=Array.isArray(data.archivedFinance)?data.archivedFinance:[];
  if(archived.length){
    activityTable(root,{
      heading:'Archived financial activity',
      note:'Latest '+(data.limits?.archivedFinance||50)+' finance-only records',
      columns:['Date','State','Provider / tool','Cost USD'],
      rows:archived.map(item=>[
        activityDate(item.createdAt),
        item.state==='reconstructed_completed'?'Completed (reconstructed)':
          item.state==='unknown'?'Unverified old reservation':
          item.state==='failed'?'Failed / refunded':String(item.state||'Unknown'),
        {main:item.provider||'Historical provider unrecorded',
          sub:item.type||'No creative details retained'},
        {main:dollar+Number(item.exposureUsd||0).toFixed(4),
          sub:item.costKind==='settled'?'Recorded settled cost':'Reservation estimate'}
      ]),
      emptyMessage:''
    });
    root.append(activityElement('p','owner-customer-activity-caption',
      'Deleted images and prompts are not retained in these records. Older completions are reconstructed from surviving reservations and refund history, not provider invoices.'));
  }
  activityTable(root,{
    heading:'Credit movements',note:'Latest '+(data.limits?.entries||80)+' transactions',
    columns:['Date','Event','Credits'],
    rows:(Array.isArray(data.entries)?data.entries:[]).map(entry=>[
      activityDate(entry.createdAt),entry.description||entry.kind,
      {main:(Number(entry.credits)>0?'+':'')+formatNumber(entry.credits)}
    ]),emptyMessage:'No credit movements recorded.'
  });
  root.append(activityElement('p','owner-customer-activity-caption',
    'Wallet transactions are authoritative. Deleted generation records may no longer appear in the job list.'));
}
async function openCustomerActivity(customer){
  if(!profile?.owner||!customer?.id)return;
  const serial=++customerActivitySerial,current=revision;
  $('owner-customer-dialog-identity').textContent=customer.email||customer.id;
  $('owner-customer-dialog-body').replaceChildren(activityElement('p','owner-customer-empty','Loading customer activity…'));
  if(!customerDialog.open)customerDialog.showModal();
  try{
    const data=await call('/api/admin/customers/activity?customerId='+encodeURIComponent(customer.id));
    if(serial!==customerActivitySerial||current!==revision||!customerDialog.open)return;
    paintCustomerActivity(data);
  }catch(error){
    if(serial!==customerActivitySerial||current!==revision||!customerDialog.open)return;
    $('owner-customer-dialog-body').replaceChildren(activityElement('p','owner-customer-empty',
      error.message||'Customer history is unavailable. Please retry.'));
  }
}
function customerActivityButtons(customers){
  const rows=$('owner-customers').rows;
  customers.forEach((customer,index)=>{
    const cell=rows[index]?.cells[0];if(!cell)return;
    const button=activityElement('button','owner-customer-open','View activity ↗');
    button.type='button';
    button.setAttribute('aria-label','View generation and credit activity for '+(customer.email||customer.id));
    button.addEventListener('click',()=>void openCustomerActivity(customer));
    cell.append(button);
  });
}
$('owner-customer-dialog-close').addEventListener('click',()=>customerDialog.close());
customerDialog.addEventListener('close',()=>{customerActivitySerial++;});

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

// Cookie-free acquisition totals. Public pages report aggregates, never visitor identities.
let trafficDays=7,trafficSerial=0;
const trafficLabels={
  reddit:'Reddit',instagram:'Instagram',tiktok:'TikTok',facebook:'Facebook',
  youtube:'YouTube',google:'Google',search:'Other search',newsletter:'Newsletter',
  'parallel-vision':'Parallel Vision',direct:'Direct / unknown',other:'Other websites',
  internal:'Internal'
};
const trafficPageLabels={
  home:'PV LAB home',studio:'Studio',moods:'Moods','mood-creator':'Mood Creator',
  fashion:'Fashion',account:'Account',other:'Other Lab pages'
};
function createTrafficNode(tag,className,text){
  const node=document.createElement(tag);
  if(className)node.className=className;
  if(text!==undefined)node.textContent=String(text);
  return node;
}
function trafficComparison(containerId,items,labelMap){
  const container=$(containerId);container.replaceChildren();
  if(!items.length){
    container.append(createTrafficNode('p','owner-traffic-no-data','Nothing recorded for this period.'));
    return;
  }
  const maximum=Math.max(1,...items.map(item=>Number(item.count)||0));
  for(const item of items.slice(0,6)){
    const row=createTrafficNode('div','owner-traffic-source-row');
    const top=createTrafficNode('div','owner-traffic-source-top');
    top.append(createTrafficNode('span','',labelMap[item.source||item.page]||'Other'),
      createTrafficNode('strong','',formatNumber(item.count)));
    const track=createTrafficNode('div','owner-traffic-source-track');
    const bar=createTrafficNode('span','owner-traffic-source-fill');
    bar.style.width=Math.max(0,(Number(item.count)||0)/maximum*100)+'%';
    track.append(bar);row.append(top,track);container.append(row);
  }
}
function paintTraffic(data){
  const summary=data.summary||{};
  const content=$('owner-traffic-content'),statusNode=$('owner-traffic-status');
  for(const button of document.querySelectorAll('[data-traffic-days]'))
    button.setAttribute('aria-pressed',String(Number(button.dataset.trafficDays)===trafficDays));
  if(!data.measured){
    content.hidden=true;
    statusNode.textContent='Traffic measurement starts with the new deployment. Earlier Reddit visits cannot be reconstructed.';
    return;
  }
  content.hidden=false;statusNode.textContent='';
  $('owner-traffic-entries').textContent=formatNumber(summary.entrances);
  $('owner-traffic-views').textContent=formatNumber(summary.views);
  $('owner-traffic-reddit').textContent=formatNumber(summary.redditEntrances);
  $('owner-traffic-signups').textContent=formatNumber(summary.newAccounts);
  $('owner-traffic-range').textContent='Last '+data.days+' days · UTC';
  const chart=$('owner-traffic-chart');chart.replaceChildren();
  const daily=Array.isArray(data.trend)?data.trend:[];
  const maximum=Math.max(1,...daily.map(item=>Number(item.entrances)||0));
  for(const [index,item] of daily.entries()){
    const column=createTrafficNode('div','owner-traffic-chart-column');
    const well=createTrafficNode('div','owner-traffic-chart-well');
    const bar=createTrafficNode('div','owner-traffic-chart-bar');
    const value=Number(item.entrances)||0;
    bar.style.height=(value?Math.max(4,value/maximum*100):0)+'%';
    bar.title=item.date+': '+formatNumber(value)+' estimated entries';
    well.append(bar);
    const tick=createTrafficNode('span','owner-traffic-chart-day',
      data.days===7||index%5===0||index===daily.length-1?item.date.slice(5):'');
    column.append(well,tick);chart.append(column);
  }
  chart.setAttribute('aria-label','Estimated site entries per day over the past '+data.days+
    ' days. Total: '+formatNumber(summary.entrances)+'.');
  trafficComparison('owner-traffic-sources',Array.isArray(data.sources)?data.sources:[],trafficLabels);
  trafficComparison('owner-traffic-pages',Array.isArray(data.pages)?data.pages:[],trafficPageLabels);
  $('owner-traffic-disclaimer').textContent='Counting since '+data.firstTrackedDay+
    '. Estimated entrances and page views, not unique people. Referral sources can be hidden by browser privacy settings. '+
    'New accounts are period totals, not proof that a source caused a signup. '+
    'Clean URL categories are corrected from this release; historical Other page counts cannot be recovered.';
}
async function refreshTraffic(){
  if(!profile?.owner)return;
  const current=revision,id=++trafficSerial,button=$('owner-traffic-refresh');
  button.disabled=true;
  $('owner-traffic-status').textContent='Refreshing anonymous traffic totals…';
  try{
    const data=await call('/api/admin/traffic?days='+trafficDays);
    if(current!==revision||id!==trafficSerial)return;
    paintTraffic(data);
  }catch(error){
    if(current!==revision||id!==trafficSerial)return;
    $('owner-traffic-content').hidden=true;
    $('owner-traffic-status').textContent='Traffic data unavailable: '+(error.message||'Try again later.');
  }finally{if(current===revision&&id===trafficSerial)button.disabled=false;}
}
for(const button of document.querySelectorAll('[data-traffic-days]'))button.addEventListener('click',()=>{
  if(!profile?.owner)return;
  trafficDays=Number(button.dataset.trafficDays);
  void refreshTraffic();
  void acquisitionUI.refresh();
});
$('owner-traffic-refresh').addEventListener('click',()=>void refreshTraffic());

const generationReviewUI=createOwnerGenerationReviewUI({
  call:path=>call(path),request,ownerReady:()=>!!profile?.owner,
  revision:()=>revision,formatDate:activityDate
});
const acquisitionUI=createOwnerAcquisitionUI({
  request:path=>call(path),ownerReady:()=>!!profile?.owner,revision:()=>revision,days:()=>trafficDays,
  formatDate,formatNumber,openActivity:openCustomerActivity,
  openReview:customer=>generationReviewUI.open(customer),mobileLabels:labelTableCellsForMobile
});
let recentFilter='all',recentCustomers=[],recentPayments=[],customerPage=1;
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
    const date=new Date(Number(at));when.dateTime=date.toISOString();
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
function render(data){
  const s=data.summary||{};
  $('owner-total-accounts').textContent=formatNumber(s.accounts);
  $('owner-paying').textContent=formatNumber(s.payingCustomers);
  $('owner-subs').textContent=formatNumber(s.activeSubscriptions);
  $('owner-redemptions').textContent=formatNumber(s.voucherClaims);
  $('owner-referral-summary').textContent=formatNumber(s.rewardedReferrals)+' verified referral rewards issued. Recent attribution is listed below.';
  const customerCount=Number(data.pagination?.total)||0,query=$('owner-search').value.trim();
  // The directory search must not replace the account-wide latest-signups feed.
  if(!query&&customerPage===1){
    recentCustomers=Array.isArray(data.customers)?data.customers.filter(c=>!c.accountClosed):[];
    recentPayments=Array.isArray(data.payments)?data.payments:[];
  }
  paintRecentActivity();
  $('owner-customer-count').textContent=query
    ?formatNumber(customerCount)+' matching accounts. Search applies to customers only.'
    :formatNumber(customerCount)+' customer accounts. Verified emails come directly from Clerk.';
  $('owner-search-clear').hidden=!query;
  rowInto($('owner-customers'),data.customers||[],[
    c=>({primary:c.accountClosed?'Closed account':c.email||'Email not synced',secondary:c.id}),
    c=>formatDate(c.joinedAt),
    c=>formatNumber(c.balanceCredits),
    c=>formatNumber(c.verifiedPayments),
    c=>c.accountClosed?'Closed':c.subscription&&c.subscription!=='none'?({primary:c.subscription,secondary:c.plan||''}):'—',
    c=>formatDate(c.lastPaidAt)
  ],query?'No matching accounts. Try a different email or account ID.':'No customer accounts have joined yet.');
  customerActivityButtons(data.customers||[]);
  renderOwnerPagination($('owner-customers-pagination'),{
    ...data.pagination,
    onPage:next=>{customerPage=next;void refreshDashboard({scrollCustomers:true});}
  });
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
  const inlineVoucherRecipients=[];
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
      voucher.expiresAt===null?'Never':formatDate(voucher.expiresAt),
      state
    ];
    for(const [index,item] of cells.entries()){
      const td=document.createElement('td');
      if(typeof item==='string')td.textContent=item;
      else{const strong=document.createElement('strong');strong.textContent=item.primary;td.append(strong);
        if(item.secondary){const small=document.createElement('small');small.textContent=item.secondary;td.append(small);}}
      if(index===2&&voucher.redemptionCount>0){
        const identities=activityElement('div','owner-voucher-inline-list','Loading recipients…');
        td.append(identities);inlineVoucherRecipients.push({voucher,element:identities});
      }
      tr.append(td);
    }
    const actions=document.createElement('td');
    if(state==='Active'){
      const copy=document.createElement('button');copy.type='button';copy.textContent='Copy link';copy.addEventListener('click',()=>void copyLink(voucher.url,copy));actions.append(copy);
      const disable=document.createElement('button');disable.type='button';disable.textContent='Deactivate';
      disable.addEventListener('click',()=>void deactivate(voucher.code,disable));actions.append(disable);
    }else if(state==='Expired'&&!full){
      const restore=document.createElement('button');restore.type='button';restore.textContent='Remove expiry';
      restore.addEventListener('click',()=>void restoreVoucher(voucher.code,restore));actions.append(restore);
    }else actions.textContent='—';
    tr.append(actions);body.append(tr);
  }
  // Show the server's last sanitized Clerk sync outcome even after a page reload.
  // The diagnostic contains only status counts, never provider keys or emails.
  if(!syncNotice&&data.clerkSyncDiagnostic?.checkedAt&&
      Date.now()-data.clerkSyncDiagnostic.checkedAt<7*86400000)
    syncNotice=syncFeedback(data.clerkSyncDiagnostic);
  emailSyncReady=!!data.emailSyncConfigured;
  const activeCustomers=(data.customers||[]).filter(customer=>!customer.accountClosed);
  const shownEmails=activeCustomers.filter(customer=>customer.email).length;
  const directoryText=query
    ?formatNumber(shownEmails)+' verified emails in these search results.'
    :formatNumber(shownEmails)+' verified emails visible across '+formatNumber(activeCustomers.length)+' listed active accounts.';
  // A secret binding alone does not prove that the Clerk API accepts the key.
  const clerkSyncFailed=/^(Clerk rejected|Clerk could not|Clerk sync could not|The Cloudflare Clerk secret is missing|Unable to sync Clerk emails|The Lab could not)/.test(syncNotice);
  $('owner-sync-state').textContent=!emailSyncReady?'Clerk email sync needs setup'
    :clerkSyncFailed?'Clerk sync needs attention'
    :syncing?'Checking Clerk connection'
    :shownEmails>0?'Verified emails available':'Clerk key configured, not verified';
  $('owner-sync-copy').textContent=!emailSyncReady
    ?'Connect the production Clerk backend key securely to fetch verified signup emails.'
    :directoryText+(syncing?' Checking Clerk securely now.':clerkSyncFailed?' '+syncNotice:
      shownEmails>0?' Verified customer emails are available in your directory.':
      ' A secure sync runs once when this workspace opens; you can retry using Sync emails.');
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
  startInlineVoucherRecipients(inlineVoucherRecipients);
}
async function refreshDashboard({scrollCustomers=false}={}){
  if(!profile?.owner)return;
  const current=revision,requestId=++fetchSerial,search=$('owner-search').value.trim();
  const overviewUrl=()=>'/api/admin/overview?page='+customerPage+
    (search?'&search='+encodeURIComponent(search):'');
  $('owner-refresh').disabled=true;$('owner-refresh').textContent='Refreshing…';
  try{
    let data=await call(overviewUrl());
    if(current!==revision||requestId!==fetchSerial)return;
    const last=Math.max(1,Math.ceil((Number(data.pagination?.total)||0)/20));
    if(customerPage>last){
      customerPage=last;data=await call(overviewUrl());
      if(current!==revision||requestId!==fetchSerial)return;
    }
    render(data);status('');
    if(scrollCustomers)$('owner-customers-section').scrollIntoView({block:'start'});
    if(!search&&customerPage===1){void refreshTraffic();void acquisitionUI.refresh();}
    if(!autoClerkSyncAttempted&&!syncing&&!search&&data.emailSyncConfigured&&
        Array.isArray(data.customers)&&data.customers.some(c=>!c.accountClosed&&!c.email)){
      autoClerkSyncAttempted=true;
      void synchronizeClerkEmails(true);
    }
  }catch(error){if(current===revision&&requestId===fetchSerial)status(error.message);}
  finally{if(current===revision&&requestId===fetchSerial){$('owner-refresh').disabled=false;$('owner-refresh').textContent='Refresh data ↻';}}
}
async function refreshSession(){
  for(const link of document.querySelectorAll('[data-owner-vitolas]'))link.hidden=true;
  const current=++revision;fetchSerial++;generationReviewUI.close();profile=null;
  voucherRecipientsObserver?.disconnect();voucherRecipientsObserver=null;voucherRecipientsGeneration++;$('owner-dashboard').hidden=true;$('owner-gate').hidden=true;$('owner-agency-link').hidden=true;
  trafficSerial++;$('owner-traffic-content').hidden=true;
  $('owner-traffic-status').textContent='Traffic statistics will load after owner verification.';
  if(customerDialog.open)customerDialog.close();customerActivitySerial++;
  recentCustomers=[];recentPayments=[];recentFilter='all';customerPage=1;syncNotice='';$('owner-search').value='';
  providerUI.clear();
  for(const id of ['owner-customers','owner-payments','owner-referrals','owner-vouchers'])$(id).replaceChildren();
  if(!clerk?.isSignedIn){autoClerkSyncAttempted=false;status('');$('owner-gate').hidden=false;return;}
  status('Checking your owner access…');
  try{
    const result=await call('/api/session');if(current!==revision)return;
    if(result.owner!==true)throw Error('This page is reserved for the PV LAB owner account.');
    profile=result;$('owner-agency-link').hidden=false;for(const link of document.querySelectorAll('[data-owner-vitolas]'))link.hidden=false;await refreshDashboard();if(location.hash==='#owner-providers-section')void providerUI.refresh();
  }catch(error){if(current===revision){$('owner-dashboard').hidden=true;status(error.message);}}
}
async function copyLink(url,button){
  try{
    const parsed=new URL(url);
    const studioDomain=['pvlab.studio','www.pvlab.studio'].includes(parsed.hostname);
    const legacyDomain=['parallelvisionlabel.com','www.parallelvisionlabel.com'].includes(parsed.hostname);
    if(parsed.protocol!=='https:'||!(studioDomain&&parsed.pathname==='/account.html'||legacyDomain&&parsed.pathname==='/lab/account.html')||parsed.username||parsed.password)throw Error();
    await navigator.clipboard.writeText(parsed.href);button.textContent='Copied';
  }catch{button.textContent='Select link to copy';$('owner-voucher-result').hidden=false;$('owner-voucher-link').value=url;$('owner-voucher-link').select();}
}
// Show recipients in their original voucher row, with no dropdown or extra click.
// Query only visible rows and at most three at once to avoid unnecessary Clerk calls.
function startInlineVoucherRecipients(rows){
  voucherRecipientsObserver?.disconnect();voucherRecipientsObserver=null;
  const generation=++voucherRecipientsGeneration,queue=[],pending=new Set();
  let running=0;
  async function fetchRecipients({voucher,element}){
    if(!profile?.owner||!element.isConnected||generation!==voucherRecipientsGeneration)return;
    try{
      const result=await call('/api/admin/vouchers/redemptions?code='+encodeURIComponent(voucher.code));
      if(!profile?.owner||!element.isConnected||generation!==voucherRecipientsGeneration)return;
      element.replaceChildren();
      const recipients=Array.isArray(result.redemptions)?result.redemptions:[];
      if(!recipients.length){element.textContent='No recorded recipients';return;}
      for(const person of recipients){
        const entry=activityElement('div','owner-voucher-inline-person');
        const title=person.accountClosed?'Closed account':person.name||person.email||person.customerId;
        entry.append(activityElement('strong','',title));
        if(person.email&&person.email!==title)entry.append(activityElement('small','',person.email));
        entry.append(activityElement('small','owner-voucher-inline-date',activityDate(person.redeemedAt)));
        element.append(entry);
      }
      if(result.hasMore){
        element.append(activityElement('small','owner-voucher-inline-date',
          'Latest '+formatNumber(recipients.length)+' of '+formatNumber(voucher.redemptionCount)+' redemptions'));
      }
    }catch{
      if(element.isConnected&&generation===voucherRecipientsGeneration)
        element.textContent='Recipient details unavailable';
    }
  }
  function drain(){
    while(running<3&&queue.length&&generation===voucherRecipientsGeneration){
      const item=queue.shift();running++;
      void fetchRecipients(item).finally(()=>{running--;drain();});
    }
  }
  if(typeof IntersectionObserver!=='function'){
    queue.push(...rows);drain();return;
  }
  const byElement=new Map(rows.map(item=>[item.element,item]));
  voucherRecipientsObserver=new IntersectionObserver(entries=>{
    for(const entry of entries){
      if(!entry.isIntersecting)continue;
      voucherRecipientsObserver?.unobserve(entry.target);
      const item=byElement.get(entry.target);
      if(item&&!pending.has(item.element)){pending.add(item.element);queue.push(item);}
    }
    drain();
  },{rootMargin:'280px 0px'});
  for(const item of rows)voucherRecipientsObserver.observe(item.element);
}
async function restoreVoucher(code,button){
  if(!profile?.owner||!window.confirm('Remove the expiry from '+code+'? Its remaining claims will stay available until the limit is reached or you deactivate it. No credits will be issued now.'))return;
  button.disabled=true;
  try{await call('/api/admin/vouchers/restore',{method:'POST',body:{code}});await refreshDashboard();}
  catch(error){status(error.message);}finally{button.disabled=false;}
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
// Providers is now a dedicated sidebar destination, not an overview widget.
window.addEventListener('hashchange',()=>{
  if(profile?.owner&&location.hash==='#owner-providers-section')void providerUI.refresh();
});
$('owner-quick-search').addEventListener('click',()=>{
  if(!profile?.owner){clerk?.openSignIn();return;}
  $('owner-customers-section').scrollIntoView({behavior:'smooth',block:'start'});
  $('owner-search').focus({preventScroll:true});
});
for(const link of document.querySelectorAll('[data-owner-nav]'))link.addEventListener('click',()=>{
  for(const previous of document.querySelectorAll('[data-owner-nav][aria-current]'))previous.removeAttribute('aria-current');
  link.setAttribute('aria-current','location');
});
$('owner-search-form').addEventListener('submit',event=>{event.preventDefault();clearTimeout(searchTimer);customerPage=1;void refreshDashboard();});
$('owner-search').addEventListener('input',()=>{clearTimeout(searchTimer);$('owner-search-clear').hidden=!$('owner-search').value.trim();searchTimer=setTimeout(()=>{customerPage=1;void refreshDashboard();},320);});
$('owner-search-clear').addEventListener('click',()=>{$('owner-search').value='';$('owner-search-clear').hidden=true;clearTimeout(searchTimer);customerPage=1;void refreshDashboard();$('owner-search').focus();});
$('owner-refresh').addEventListener('click',()=>{clearTimeout(searchTimer);void refreshDashboard();});
$('owner-setup-toggle').addEventListener('click',()=>{
  const open=$('owner-setup-guide').hidden;$('owner-setup-guide').hidden=!open;
  $('owner-setup-toggle').setAttribute('aria-expanded',String(open));
});
function syncFeedback(result){
  const issues=result.issues||{},requested=Number(result.requested)||0,verified=Number(result.verified)||0,unverified=Number(result.unverified)||0;
  if(issues.storageError){
    const stage=issues.storage?.stages||{},kind=issues.storage?.kinds||{};
    if(kind.schema)return 'Clerk sync found a database schema mismatch. Check the production D1 migration before retrying. Existing contacts are preserved.';
    if(kind.constraint)return 'Clerk sync hit a database constraint. Check the Worker contact-write path. Existing contacts are preserved.';
    if(stage.welcome_grant)return 'Clerk verified the contact, but the optional welcome-credit reconciliation failed. Check the Worker database without changing paid balances.';
    if(kind.temporary)return 'Clerk sync hit a temporary database error after retrying. Existing contacts are preserved; another account can still sync.';
    return 'Clerk sync encountered a database operation error. Check the Worker database diagnostics before retrying. Existing contacts are preserved.';
  }
  if(issues.invalidKey)return 'Clerk rejected a backend key. Check the production key for the affected instance: LAB_CLERK_V2_SECRET_KEY for pvlab.studio, or LAB_CLERK_SECRET_KEY for legacy accounts.';
  if(issues.missingUser)return 'Clerk could not find '+issues.missingUser+' customer record(s). Check the production Clerk instance and identity link for those accounts.';
  if(issues.networkError)return 'Clerk could not be reached from the Cloudflare Worker ('+issues.networkError+' request). Check Worker outbound access and retry.';
  if(issues.upstreamError)return 'Clerk returned an upstream HTTP error ('+issues.upstreamError+' request). Try again or inspect Clerk API status.';
  if(issues.invalidResponse)return 'Clerk returned an unexpected user response ('+issues.invalidResponse+' request). Check the configured Clerk instance.';
  if(issues.rateLimited)return 'Clerk API rate limited '+issues.rateLimited+' request(s). Wait before retrying.';
  if(issues.transient)return 'Clerk could not complete '+issues.transient+' request(s). Check API connectivity and try again.';
  if(issues.missingKey)return 'The Cloudflare Clerk secret is missing for an account instance. Check LAB_CLERK_V2_SECRET_KEY for pvlab.studio and LAB_CLERK_SECRET_KEY for legacy accounts.';
  if(!requested)return 'All currently eligible customer email records have been checked.';
  if(verified)return verified+' verified email'+(verified===1?'':'s')+' fetched from Clerk.'+(unverified?' '+unverified+' account(s) have no verified primary email.':'');
  if(unverified)return 'Clerk is responding, but '+unverified+' account(s) have no verified primary email. Check email verification in Clerk → Users.';
  // Older deployed Workers may not yet include diagnostic fields.
  if(Number(result.synced)===0)return 'No emails were synchronized. The Worker did not provide a reason. Check the deployed Worker version and its Clerk connection.';
  return Number(result.synced)+' account(s) checked. Refresh to confirm their emails.';
}
async function synchronizeClerkEmails(automatic=false){
  if(syncing||!profile?.owner)return;
  const current=revision;
  syncing=true;$('owner-sync').disabled=true;
  syncNotice=automatic?'Checking the missing Clerk emails automatically…':'Checking Clerk securely…';
  $('owner-email-status').textContent=syncNotice;
  $('owner-sync-state').textContent='Checking Clerk connection';
  try{
    const result=await call('/api/admin/customers/sync',{method:'POST'});
    if(current!==revision)return;
    syncNotice=syncFeedback(result);
    await refreshDashboard();
    if(current!==revision)return;
    $('owner-email-status').textContent=syncNotice;
    if(result.issues?.invalidKey||result.issues?.missingUser||result.issues?.transient||result.issues?.missingKey||result.issues?.storageError)
      $('owner-sync-state').textContent='Clerk sync needs attention';
    else if(Number(result.verified)>0)$('owner-sync-state').textContent='Verified emails available';
    else $('owner-sync-state').textContent='Clerk checked, emails unavailable';
  }catch(error){
    if(current!==revision)return;
    syncNotice=error.message||'Unable to sync Clerk emails.';
    $('owner-email-status').textContent=syncNotice;
    $('owner-sync-state').textContent='Clerk sync needs attention';
  }finally{
    syncing=false;$('owner-sync').disabled=!emailSyncReady;
  }
}
$('owner-sync').addEventListener('click',()=>{autoClerkSyncAttempted=true;void synchronizeClerkEmails(false);});

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
try{clerk=await loadLabAccount();
  const onClerkAuthUpdate=createOwnerAuthGuard({
    getClerk:()=>clerk,
    onIdentityChange:()=>void refreshSession()
  });
  clerk.addListener(onClerkAuthUpdate);
  // Initial login is handled exactly once. Token renewal/focus updates never
  // tear down the dashboard or close an open generation-review dialog.
  onClerkAuthUpdate();
}
catch{status('Sign-in could not load. Reload this page to try again.');$('owner-gate').hidden=false;$('owner-signin').disabled=true;}
