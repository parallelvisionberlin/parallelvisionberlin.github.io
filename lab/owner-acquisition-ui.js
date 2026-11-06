// Owner-only acquisition UI. Renders only text from the secure admin endpoint.
export function createOwnerAcquisitionUI({request,ownerReady,revision,days,formatDate,formatNumber,openActivity,openReview,mobileLabels,onReport}){
  const $=id=>document.getElementById(id);
  const money=(value,symbol,multiplier=1)=>symbol+(Number(value||0)*multiplier)
    .toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  let serial=0,page=1,lastDays=null;
  function paint(data){
    const s=data.summary||{},starts=Number(s.checkoutStarts)||0,paid=Number(s.checkoutPaid)||0;
    $('owner-acquisition-new').textContent=formatNumber(s.newUsers);
    $('owner-acquisition-active').textContent=formatNumber(s.activatedUsers);
    $('owner-acquisition-cost').textContent=money(s.providerExposureUsd,'$')+(s.unsettledFailedJobs?' + pending':'');
    $('owner-acquisition-cost').title=(s.unsettledFailedJobs||0)+' failed jobs await final provider billing confirmation.';
    $('owner-acquisition-revenue').textContent=money(s.revenueCents,'€',.01);
    $('owner-acquisition-checkout').textContent=starts?(100*paid/starts).toFixed(1)+'%':'—';
    $('owner-acquisition-checkout-note').textContent=starts?
      paid+' paid / '+starts+' tracked sessions':'No tracked sessions yet';
    const dollar=String.fromCharCode(36);
    $('owner-acquisition-summary').textContent='Last '+data.days+' days · '+formatNumber(s.completedJobs)+' completed generations · '+formatNumber(s.netCreditsSpent)+' credits used.';
    $('owner-acquisition-archive-note').textContent=formatNumber(s.archivedJobs||0)+' financial records retained after creative deletion ('+money(s.archivedExposureUsd,dollar)+' in settled or estimated provider exposure).';
    if(typeof onReport==='function')onReport(data);
    $('owner-acquisition-notes').textContent=(data.notes?.checkout||'')+' '+
      (data.notes?.cost||'')+' Returning visitors are not tracked by the anonymous meter.';
    $('owner-acquisition-content').hidden=false;
    $('owner-acquisition-status').textContent='';
    mobileLabels();
  }
  async function refresh({scroll=false}={}){
    if(!ownerReady())return;
    const selectedDays=days();
    if(lastDays!==selectedDays){page=1;lastDays=selectedDays;}
    const version=revision(),id=++serial,button=$('owner-acquisition-refresh');
    button.disabled=true;
    $('owner-acquisition-status').textContent='Reading sales…';
    try{
      let report=await request('/api/admin/acquisition?days='+selectedDays+'&page='+page);
      if(version!==revision()||id!==serial)return;
      const last=Math.max(1,Math.ceil((Number(report.pagination?.total)||0)/20));
      if(page>last){
        page=last;
        report=await request('/api/admin/acquisition?days='+selectedDays+'&page='+page);
        if(version!==revision()||id!==serial)return;
      }
      paint(report);
      if(scroll)$('owner-acquisition-section').scrollIntoView({block:'start'});
    }catch(error){
      if(version!==revision()||id!==serial)return;
      $('owner-acquisition-content').hidden=true;
      $('owner-acquisition-status').textContent='Sales figures unavailable: '+(error.message||'Retry.');
    }finally{
      if(version===revision()&&id===serial)button.disabled=false;
    }
  }
  $('owner-acquisition-refresh').addEventListener('click',()=>void refresh());
  function clear(){$('owner-acquisition-refresh').disabled=false;serial++;page=1;lastDays=null;$('owner-acquisition-content').hidden=true;}
  return {refresh,clear};
}
