// Shared pricing presentation only. Billing products and checkout remain server-controlled.
(() => {
  const section=document.querySelector('#pricing');
  if(!section)return;
  const monthly=section.querySelector('#lab-monthly-plans');
  const onetime=section.querySelector('#lab-one-time-credits');
  const tabs=[section.querySelector('#lab-tab-monthly'),section.querySelector('#lab-tab-onetime')];
  if(!monthly||!onetime||tabs.some(t=>!t))return;
  function select(which,focus=false){
    const one=which==='onetime';
    monthly.hidden=one;onetime.hidden=!one;
    tabs.forEach((tab,index)=>{
      const active=index===(one?1:0);
      tab.setAttribute('aria-selected',String(active));
      tab.tabIndex=active?0:-1;
    });
    if(focus)tabs[one?1:0].focus();
  }
  tabs[0].addEventListener('click',()=>select('monthly'));
  tabs[1].addEventListener('click',()=>select('onetime'));
  tabs.forEach((tab,index)=>tab.addEventListener('keydown',event=>{
    if(!['ArrowLeft','ArrowRight','Home','End'].includes(event.key))return;
    event.preventDefault();
    const next=event.key==='Home'?0:event.key==='End'?1:(index+(event.key==='ArrowRight'?1:-1)+2)%2;
    select(next?'onetime':'monthly',true);
  }));
  if(location.hash==='#lab-one-time-credits')select('onetime');
  window.addEventListener('hashchange',()=>{if(location.hash==='#lab-one-time-credits')select('onetime')});
})();
