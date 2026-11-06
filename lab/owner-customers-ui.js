// One customer list. Reuse existing read-only reports and the existing private profile.
const PAGE_SIZE=20,CACHE_MS=5*60*1000;
const el=(tag,value,className)=>{const node=document.createElement(tag);if(value!==undefined)node.textContent=String(value);if(className)node.className=className;return node;};
const validId=value=>typeof value==='string'&&/^[A-Za-z0-9_-]{4,160}$/.test(value);
export function customerUsageForId(customers,id){return validId(id)&&Array.isArray(customers)?customers.find(row=>row?.id===id)||null:null;}
export function customerReportPageCount(pagination){
  const total=Number(pagination?.total),size=Number(pagination?.pageSize)||PAGE_SIZE;
  return Number.isSafeInteger(total)&&total>=0&&Number.isSafeInteger(size)&&size>0?Math.max(1,Math.ceil(total/size)):1;
}
const number=value=>typeof value==='number'&&Number.isFinite(value)?value:null;
const stamp=value=>number(value)!==null&&value>0?new Date(value).toLocaleString('en-GB',{day:'numeric',month:'short',year:'numeric',hour:'2-digit',minute:'2-digit'}):'Not recorded';
const money=(value,symbol,multiplier=1)=>number(value)===null?'Unavailable':symbol+(value*multiplier).toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
export function customerLifetimeState(customer){
  if(!customer)return 'Not loaded';
  return customer.accountClosed?'Closed account':customer.promoHeld?'Free generation paused'
    :customer.reviewFlag==='disposable-email'?'Review temporary email':customer.reviewFlag==='unverified'?'Email not verified'
    :Number(customer.revenueCents)>0?'Purchased':Number(customer.checkoutStarts)>0?'Checkout started · no payment recorded'
    :Number(customer.completedJobs)>0?'Completed generations':Number(customer.creditsSpent)>0?'Credits consumed':'No completed jobs';
}
export function createOwnerCustomersUI({call,ownerReady,revision,openActivity,openReview,formatDate,formatNumber,mobileLabels}={}){
  const body=document.getElementById('owner-customers');
  let epoch=0,directorySerial=0,directory={customers:[],pagination:{page:1},search:''},rows=[],notes={};
  const reports=new Map(),usage=new Map(),pending=new Map();
  const numeric=value=>number(value)===null?'Unavailable':formatNumber(value);
  const fresh=value=>value&&Date.now()-value.at<CACHE_MS;
  const usageFor=id=>{const saved=usage.get(id);return fresh(saved)?saved.customer:null;};
  function remember(report,fallbackPage=1){
    if(!Array.isArray(report?.customers))throw Error('Customer activity unavailable.');
    const page=Number(report.pagination?.page)||fallbackPage,at=Date.now();
    reports.set(page,{report,at});notes=report.notes||notes;
    for(const customer of report.customers)if(validId(customer?.id))usage.set(customer.id,{customer,at});
  }
  async function reportPage(page){
    const cached=reports.get(page);if(fresh(cached))return cached.report;
    if(pending.has(page))return pending.get(page);
    const currentEpoch=epoch,currentRevision=revision();
    const task=(async()=>{
      const report=await call('/api/admin/acquisition?days=7&page='+page);
      if(currentEpoch!==epoch||currentRevision!==revision()||!ownerReady())return null;
      remember(report,page);return report;
    })();
    pending.set(page,task);
    try{return await task;}finally{if(pending.get(page)===task)pending.delete(page);}
  }
  function detailField(list,label,value){const group=el('div');group.append(el('dt',label),el('dd',value??'Unavailable'));list.append(group);}
  function paintDetails(row){
    const c=row.customer,u=row.usage,root=row.content;root.replaceChildren();
    const status=el('p',u?'Lifetime records · same customer account':row.state==='loading'?'Loading lifetime activity…':row.state==='unavailable'?'Lifetime activity unavailable. Open Activity for retained generations and credit movements.':'Lifetime activity not loaded. Expand Details to read it.','owner-customer-usage-status');
    root.append(status);
    const fields=el('dl',undefined,'owner-customer-detail-fields');
    for(const [label,value] of [
      ['Email',c.accountClosed?'Closed account':c.email||'Verified email pending'],['Account ID',c.id],['Joined',formatDate(c.joinedAt)],
      ['Current balance',numeric(c.balanceCredits)+' credits'],['Verified payments',numeric(c.verifiedPayments)],
      ['Subscription',c.subscription&&c.subscription!=='none'?c.subscription:'None recorded'],['Plan',c.plan||'None recorded'],['Last payment',stamp(c.lastPaidAt)]
    ])detailField(fields,label,value);
    const absent=row.state==='unavailable'?'Unavailable':row.state==='loading'?'Loading…':'Not loaded';
    const metric=key=>u?numeric(u[key]):absent;
    for(const [label,value] of [
      ['Completed generations',metric('completedJobs')],['Last completed',u?stamp(u.lastCompletedAt):absent],
      ['Net credits used',metric('creditsSpent')],['Provider exposure',u?money(u.providerExposureUsd,'$'):absent],
      ['Archived finance records',metric('archivedJobs')],['Archived provider exposure',u?money(u.archivedExposureUsd,'$'):absent],
      ['Checkout starts',metric('checkoutStarts')],['Recorded gross receipts',u?money(u.revenueCents,'€',.01):absent],
      ['Lifetime activity',u?customerLifetimeState(u):absent],['Review flag',u?(u.reviewFlag||'None recorded'):absent],
      ['Promotional hold',u?(u.promoHeld===true?'Free generation paused':'No active hold recorded'):absent]
    ])detailField(fields,label,value);
    for(const [label,key] of [['Total jobs','totalJobs'],['Failed jobs','failedJobs'],['Reconstructed historical records','reconstructedCompleted'],['Welcome credits recorded','welcomeCredits']])if(u&&number(u[key])!==null)detailField(fields,label,numeric(u[key]));
    root.append(fields);
    if(u?.promoHeld===true&&typeof openReview==='function'){
      const button=el('button','Review generations','owner-customer-review-action');button.type='button';
      button.addEventListener('click',()=>{if(ownerReady())openReview({...c,...u,id:c.id});});root.append(button);
    }
    if(u){root.append(el('p',notes.cost||'Provider exposure includes recorded settled costs or reservation estimates. It is not verified profit.','owner-small'));
      if(notes.checkout)root.append(el('p',notes.checkout,'owner-small'));}
  }
  function updateRow(row){
    const candidate=usageFor(row.customer.id);row.usage=candidate;if(candidate)row.state='ready';else if(row.state==='ready')row.state='not_loaded';
    row.completed.textContent=row.usage?numeric(row.usage.completedJobs):row.state==='loading'?'Loading…':row.state==='unavailable'?'Unavailable':'Not loaded';
    row.lastActive.textContent=row.usage?stamp(row.usage.lastCompletedAt):row.state==='loading'?'Loading…':row.state==='unavailable'?'Unavailable':'Not loaded';
    if(row.details.open)paintDetails(row);
  }
  function updateRows(){for(const row of rows)updateRow(row);mobileLabels?.();}
  async function loadRow(row){
    if(!ownerReady()||row.usage||row.state==='loading')return;
    const selected=directorySerial,currentEpoch=epoch,currentRevision=revision();
    const current=()=>selected===directorySerial&&currentEpoch===epoch&&currentRevision===revision()&&ownerReady()&&row.details.open;
    row.state='loading';updateRow(row);
    try{
      // Each request is bounded by the existing server pagination. Search does
      // not support IDs, so a missing row is looked up only after explicit expansion.
      let last=1;
      for(let page=1;page<=last;page++){
        if(!current())return;
        const report=await reportPage(page);if(!current()||!report)return;
        last=customerReportPageCount(report.pagination);updateRows();
        if(row.usage)return;
      }
      if(current()){row.state='unavailable';updateRow(row);}
    }catch{if(current()){row.state='unavailable';updateRow(row);}}
    finally{if(row.state==='loading')row.state='not_loaded';}
  }
  function render(){
    body.replaceChildren();rows=[];
    if(!directory.customers.length){const tr=el('tr'),td=el('td',directory.search?'No matching accounts. Try a different email or account ID.':'No customer accounts have joined yet.');td.colSpan=7;tr.append(td);body.append(tr);return;}
    for(const c of directory.customers){
      const tr=el('tr'),identity=el('td'),name=el('strong',c.accountClosed?'Closed account':c.email||'Verified email pending');identity.append(name);
      const activity=el('button','View activity','owner-customer-open');activity.type='button';activity.setAttribute('aria-label','View activity and generated content for '+(c.email||c.id));
      activity.addEventListener('click',()=>{if(ownerReady())openActivity(c);});identity.append(activity);tr.append(identity);
      const append=value=>{const td=el('td',value);tr.append(td);return td;};
      append(formatDate(c.joinedAt));append(numeric(c.balanceCredits));const payments=append(numeric(c.verifiedPayments));
      if(c.subscription&&c.subscription!=='none')payments.append(el('small',c.subscription));
      const completed=append('Not loaded'),lastActive=append('Not loaded'),detailCell=el('td');
      const details=el('details',undefined,'owner-customer-row-details'),summary=el('summary','Details');details.append(summary);detailCell.append(details);tr.append(detailCell);
      const expanded=el('tr',undefined,'owner-customer-usage-row'),expandedCell=el('td'),content=el('div',undefined,'owner-customer-usage-details');expanded.hidden=true;expandedCell.colSpan=7;expandedCell.append(content);expanded.append(expandedCell);
      expanded.id='owner-customer-details-'+rows.length;summary.setAttribute('aria-controls',expanded.id);
      const row={customer:c,usage:usageFor(c.id),state:'not_loaded',completed,lastActive,details,expanded,content};
      details.addEventListener('toggle',()=>{expanded.hidden=!details.open;if(details.open){paintDetails(row);void loadRow(row);}});
      rows.push(row);body.append(tr,expanded);updateRow(row);
    }
    mobileLabels?.();
  }
  function setDirectory({customers=[],pagination={},search=''}={}){
    if(!ownerReady()){clear();return;}
    directorySerial++;directory={customers:Array.isArray(customers)?customers:[],pagination,search:String(search||'').trim()};render();
  }
  async function show(){
    if(!ownerReady()||directory.search)return;
    const selected=directorySerial,currentRevision=revision();updateRows();
    try{await reportPage(Math.max(1,Number(directory.pagination.page)||1));
      if(selected===directorySerial&&currentRevision===revision()&&ownerReady())updateRows();
    }catch{/* Main directory remains usable. Missing lifetime fields are not invented. */}
  }
  function seed(report){if(!ownerReady())return;try{remember(report);updateRows();}catch{/* Keep directory and explicit retry usable. */}}
  function invalidate(){epoch++;directorySerial++;reports.clear();usage.clear();pending.clear();for(const row of rows){row.state='not_loaded';row.usage=null;}updateRows();}
  function clear(){epoch++;directorySerial++;reports.clear();usage.clear();pending.clear();rows=[];notes={};directory={customers:[],pagination:{page:1},search:''};body.replaceChildren();}
  return {setDirectory,show,seed,invalidate,clear};
}
