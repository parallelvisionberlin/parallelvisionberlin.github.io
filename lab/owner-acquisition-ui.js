// Owner-only acquisition UI. Renders only text from the secure admin endpoint.
export function createOwnerAcquisitionUI({request,ownerReady,revision,days,formatDate,formatNumber,openActivity,mobileLabels}){
  const $=id=>document.getElementById(id);
  const money=(value,symbol,multiplier=1)=>symbol+(Number(value||0)*multiplier)
    .toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  const node=(tag,text,className)=>{
    const item=document.createElement(tag);
    item.textContent=String(text??'—');
    if(className)item.className=className;
    return item;
  };
  let serial=0;
  const cell=(row,value,kind)=>{
    const td=node('td',value,kind);
    row.append(td);
    return td;
  };
  function paint(data){
    const s=data.summary||{},starts=Number(s.checkoutStarts)||0,paid=Number(s.checkoutPaid)||0;
    $('owner-acquisition-new').textContent=formatNumber(s.newUsers);
    $('owner-acquisition-active').textContent=formatNumber(s.activatedUsers);
    $('owner-acquisition-cost').textContent=money(s.providerExposureUsd,'$');
    $('owner-acquisition-revenue').textContent=money(s.revenueCents,'€',.01);
    $('owner-acquisition-checkout').textContent=starts?(100*paid/starts).toFixed(1)+'%':'—';
    $('owner-acquisition-checkout-note').textContent=starts?
      paid+' paid / '+starts+' tracked sessions':'No tracked sessions yet';
    $('owner-acquisition-summary').textContent='Last '+data.days+' days · '+
      formatNumber(s.completedJobs)+' completed jobs · '+formatNumber(s.netCreditsSpent)+
      ' net credits used. Customer rows show lifetime usage.';
    const body=$('owner-acquisition-customers');
    body.replaceChildren();
    const customers=Array.isArray(data.customers)?data.customers:[];
    if(!customers.length){
      const tr=document.createElement('tr'),td=cell(tr,'No customer records yet.');
      td.colSpan=9;body.append(tr);
    }
    for(const customer of customers){
      const row=document.createElement('tr'),identity=document.createElement('td');
      identity.append(node('strong',customer.email||'Verified email pending','owner-acquisition-identity'));
      identity.append(node('small',customer.id||'','owner-acquisition-subid'));
      const button=node('button','View activity ↗','owner-acquisition-open');
      button.type='button';
      button.addEventListener('click',()=>openActivity(customer));
      identity.append(button);row.append(identity);
      cell(row,formatDate(customer.joinedAt));
      cell(row,formatNumber(customer.completedJobs));
      cell(row,customer.lastCompletedAt?new Date(Number(customer.lastCompletedAt)).toLocaleString('en-GB',
        {day:'numeric',month:'short',hour:'2-digit',minute:'2-digit'}):'—');
      cell(row,formatNumber(customer.creditsSpent));
      cell(row,money(customer.providerExposureUsd,'$'));
      cell(row,formatNumber(customer.checkoutStarts));
      cell(row,money(customer.revenueCents,'€',.01));
      const status=customer.promoHeld?'Free generation paused'
        :customer.reviewFlag==='disposable-email'?'Review temporary email'
        :customer.reviewFlag==='unverified'?'Email not verified'
        :Number(customer.revenueCents)>0?'Purchased'
        :Number(customer.checkoutStarts)>0?'Checkout unfinished'
        :Number(customer.completedJobs)>0?'Generating'
        :Number(customer.creditsSpent)>0?'Credits consumed'
        :'No completed jobs';
      const review=cell(row,status,'owner-acquisition-review');
      review.dataset.level=customer.reviewFlag?'review':'normal';
      body.append(row);
    }
    $('owner-acquisition-notes').textContent=(data.notes?.checkout||'')+' '+
      (data.notes?.cost||'')+' Returning visitors are not tracked by the anonymous meter.';
    $('owner-acquisition-content').hidden=false;
    $('owner-acquisition-status').textContent='';
    mobileLabels();
  }
  async function refresh(){
    if(!ownerReady())return;
    const version=revision(),id=++serial,button=$('owner-acquisition-refresh');
    button.disabled=true;
    $('owner-acquisition-status').textContent='Refreshing private business activity…';
    try{
      const report=await request('/api/admin/acquisition?days='+days());
      if(version!==revision()||id!==serial)return;
      paint(report);
    }catch(error){
      if(version!==revision()||id!==serial)return;
      $('owner-acquisition-content').hidden=true;
      $('owner-acquisition-status').textContent='Unable to read business metrics: '+(error.message||'Retry.');
    }finally{
      if(version===revision()&&id===serial)button.disabled=false;
    }
  }
  $('owner-acquisition-refresh').addEventListener('click',()=>void refresh());
  return {refresh};
}
