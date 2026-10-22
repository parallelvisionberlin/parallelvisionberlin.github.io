// Shared pricing presentation only. Billing products and checkout remain server-controlled.
(() => {
  const section=document.querySelector('#pricing');
  if(!section)return;
  const monthly=section.querySelector('#lab-monthly-plans');
  const onetime=section.querySelector('#lab-one-time-credits');
  const tabs=[section.querySelector('#lab-tab-monthly'),section.querySelector('#lab-tab-onetime')];
  const billingCopy=section.querySelector('#lab-pricing-billing-copy');
  if(!monthly||!onetime||tabs.some(t=>!t))return;
  function select(which,focus=false){
    const one=which==='onetime';
    monthly.hidden=one;onetime.hidden=!one;
    if(billingCopy)billingCopy.textContent=one?'Pay once. No recurring charge.':'Renews monthly until cancelled.';
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
  // Pricing estimate explanations remain accessible by hover, keyboard and tap.
  // The checkout arrows keep their original handlers; information clicks never buy.
  const estimateControls=[...section.querySelectorAll('.lab-estimate-toggle')];
  function closeEstimates(except=null){
    for(const button of estimateControls){
      if(button!==except){
        const details=button.closest('.lab-estimate-details');
        if(button.getAttribute('aria-expanded')==='true')details?.classList.add('is-dismissed');
        button.setAttribute('aria-expanded','false');
        details?.classList.remove('is-open');
      }
    }
  }
  estimateControls.forEach(button=>{
    const details=button.closest('.lab-estimate-details');
    button.addEventListener('click',event=>{
      event.preventDefault();
      event.stopPropagation();
      const willOpen=button.getAttribute('aria-expanded')!=='true';
      closeEstimates(button);
      button.setAttribute('aria-expanded',String(willOpen));
      details?.classList.toggle('is-open',willOpen);
      // On touch browsers, :hover and :focus-within can linger after a tap.
      // An intentional second tap must hide the explanation nonetheless.
      details?.classList.toggle('is-dismissed',!willOpen);
    });
    // A fresh keyboard focus or desktop pointer entry may reveal the hint again.
    button.addEventListener('focus',()=>details?.classList.remove('is-dismissed'));
    details?.addEventListener('pointerleave',event=>{
      if(event.pointerType==='mouse')details.classList.remove('is-dismissed');
    });
  });
  document.addEventListener('pointerdown',event=>{
    if(!event.target.closest('#pricing .lab-estimate-details'))closeEstimates();
  });
  document.addEventListener('keydown',event=>{
    if(event.key!=='Escape')return;
    closeEstimates();
    if(document.activeElement?.matches('.lab-estimate-toggle'))document.activeElement.blur();
  });
  if(location.hash==='#lab-one-time-credits')select('onetime');
  window.addEventListener('hashchange',()=>{if(location.hash==='#lab-one-time-credits')select('onetime')});
})();
