// Credit wallet UI. Backend verifies every price, balance, webhook and receipt.
import {referralsAvailable} from './account-menu.js?v=20261030-robin-partner1';
import {metaConsentGranted,trackLabEvent} from './meta-pixel.js?v=20261013-a1';
export function createCustomerWallet({api,notify=()=>{},onClosed=()=>{},onBalance=()=>{},openPricing=()=>{window.location.assign('./#pricing');}}){
  const $=id=>document.getElementById(id);
  let account=false,billingReady=false,balance=0,products=[],referralLoading=false,referralEpoch=0,soulIdTrainingCredits=null,billingReview=false,accountClosed=false,accountEpoch=0,trialGenerationPaused=false;
  let dismissed=false,purchasing=false,refreshing=null,refreshAgain=false;
  const add=$('lab-add-credits'),banner=$('lab-credit-banner');
  const toggle=$('lab-wallet-toggle'),dialog=$('lab-credits-dialog'),referralDialog=$('lab-referrals-dialog'),amount=$('lab-credit-balance'),
        list=$('lab-credit-products'),state=$('lab-wallet-state'),
        referralUrl=$('lab-referral-url'),referralCopy=$('lab-referral-copy'),
        referralState=$('lab-referral-status'),referralStats=$('lab-referral-stats');
  // A USD provider estimate is not an authoritative customer price. Only
  // backend-quoted creditCost may be displayed as a payable PV LAB amount.
  const cost=(_usd)=>null; // Legacy method only: never infer payable credits in a browser.
  function describe(_usd){return 'Price unavailable';}
  function jobCharge(job){
    if(job?.settings?.provider==='higgsfield'&&job.settings.mode==='soul-id-training'&&soulIdTrainingCredits!==null)
      return soulIdTrainingCredits.toLocaleString()+' credits';
    return Number.isSafeInteger(job?.creditCost)&&job.creditCost>=7?job.creditCost.toLocaleString()+' credits':describe(job?.estimatedUsd);
  }
  function update(){
    toggle.hidden=!account;
    if(add)add.hidden=!account;
    if(balance>0)dismissed=false;
    if(banner)banner.hidden=!account||balance>0||dismissed||!!accountClosed||billingReview;
    if(!account){if(dialog?.open)dialog.close();if(referralDialog?.open)referralDialog.close();list.replaceChildren();amount.textContent='0 credits';state.textContent='';return;}
    onBalance(balance);
    toggle.textContent=balance.toLocaleString()+' credits';
    amount.textContent=balance.toLocaleString()+' credits';
    state.textContent=accountClosed?'Your PV Lab account is closed. Visit Plans & billing for account support.':billingReview?'A refund or dispute is under review. Contact support; billing management remains available.':purchasing?'Opening secure checkout…':trialGenerationPaused?'Free generations are paused. Your existing credits are saved. Choose a credit pack to start generating.':billingReady?'':'Checkout setup is being finalized. Payments are not being accepted yet.';
    list.replaceChildren();
    for(const p of products.filter(p=>p.type==='payment')){
      const button=document.createElement('button');button.type='button';
      const label=document.createElement('span'),unit=document.createElement('span'),price=document.createElement('span'),action=document.createElement('span');
      label.className='lab-credit-pack-amount';label.textContent=p.credits.toLocaleString('en-GB');
      unit.className='lab-credit-pack-unit';unit.textContent='credits';
      price.className='lab-credit-pack-price';price.textContent=new Intl.NumberFormat('en-IE',{style:'currency',currency:'EUR',maximumFractionDigits:2,minimumFractionDigits:0}).format(p.priceEur);
      action.className='lab-credit-pack-action';action.textContent='Buy credits';
      const icon=document.createElementNS('http://www.w3.org/2000/svg','svg');icon.setAttribute('viewBox','0 0 24 24');icon.setAttribute('class','pv-arrow-svg');icon.setAttribute('aria-hidden','true');icon.innerHTML='<path d="M7 17 17 7M8 7h9v9"/>';action.append(' ',icon);
      button.append(label,unit,price,action);button.disabled=!billingReady||!!accountClosed||billingReview||purchasing;
      button.setAttribute('aria-label','Buy '+p.credits.toLocaleString('en-GB')+' credits for '+price.textContent+', one-time payment');
      button.onclick=()=>void purchase(p.id);
      list.append(button);
    }
  }
  async function purchase(sku,report=()=>{}){
    if(purchasing)return false;
    if(!account||!billingReady||accountClosed||billingReview){
      const message='Checkout is not available for this account. No payment was attempted.';
      state.textContent=message;report(message);return false;
    }
    const current=accountEpoch;purchasing=true;update();
    try{
      // Only forward voluntary analytics consent; Stripe remains the payment authority.
      const consent=metaConsentGranted();
      const data=await api('/api/billing/checkout',{method:'POST',body:consent?{sku,metaConsent:true}:{sku}});
      if(!account||current!==accountEpoch)return false;
      const uri=new URL(data.url);
      if(uri.protocol!=='https:'||!(uri.hostname==='stripe.com'||uri.hostname.endsWith('.stripe.com')))throw new Error('Unverified checkout link.');
      // Allow the consented browser event a moment to leave before navigating to Stripe.
      if(trackLabEvent('InitiateCheckout',{currency:'EUR',content_name:sku}))
        await new Promise(resolve=>setTimeout(resolve,240));
      if(!account||current!==accountEpoch)return false;
      report('Opening secure checkout…');
      location.assign(uri.href);
      return true;
    }catch(e){
      if(current===accountEpoch){
        purchasing=false;update();state.textContent=e.message;
        report(e.message);notify(e.message,true);
      }
      return false;
    }
  }
  function open(){
    if(!account)return;
    // Every active customer gets the same editorial six-plan pricing view.
    // The compact legacy wallet remains only for account-closure/billing
    // support. Purchases still use the verified Stripe SKU and wallet path.
    if(!accountClosed){
      if(dialog.open)dialog.close();
      openPricing({oneTime:true});
      return;
    }
    if(referralDialog.open)referralDialog.close();
    if(!dialog.open)dialog.showModal();
    void refresh();
  }
  function openReferrals(){
    if(!account)return;
    if(dialog.open)dialog.close();
    if(!referralDialog.open)referralDialog.showModal();
    void loadReferral();
  }
  async function loadAccount(){
    const current=accountEpoch;
    try{
      const data=await api('/api/customer/account');if(!account||current!==accountEpoch)return;
      const used=(data.storage.bytes/1024**3).toFixed(2);
      if($('lab-storage-status'))$('lab-storage-status').textContent=used+' GiB used / '+(data.storage.limitBytes/1024**3)+' GiB · '+data.storage.files+' files';
    }catch(e){if(current===accountEpoch&&$('lab-storage-status'))$('lab-storage-status').textContent=e.message;}
  }
  if($('lab-close-confirm'))$('lab-close-confirm').oninput=()=>{
    $('lab-close-account').disabled=$('lab-close-confirm').value!=='DELETE MY PV LAB ACCOUNT';
  };
  if($('lab-close-account'))$('lab-close-account').onclick=async()=>{
    const button=$('lab-close-account');button.disabled=true;
    try{
      await api('/api/customer/account',{method:'DELETE',body:{confirmation:$('lab-close-confirm').value}});
      await onClosed();
      notify('Your PV Lab account is closed. Creative data deletion is queued. Contact support for any remaining billing or data request.');
    }catch(e){state.textContent=e.message;button.disabled=false;}
  };
  toggle.onclick=open;
  if(add)add.onclick=()=>openPricing({oneTime:false});
  if($('lab-credit-banner-add'))$('lab-credit-banner-add').onclick=()=>openPricing({oneTime:true});
  if($('lab-credit-banner-dismiss'))$('lab-credit-banner-dismiss').onclick=()=>{dismissed=true;banner.hidden=true;};
  $('lab-credit-invite').onclick=openReferrals;
  $('lab-referrals-close').onclick=()=>referralDialog.close();
  referralCopy.onclick=async()=>{
    if(!referralUrl.value)return;
    try{await navigator.clipboard.writeText(referralUrl.value);referralState.textContent='Invite link copied.';}
    catch{referralUrl.focus();referralUrl.select();referralState.textContent='Select and copy this invite link.';}
  };
  $('lab-credits-close').onclick=()=>dialog.close();
  $('lab-credit-refresh').onclick=()=>void refresh();
  if($('lab-credit-manage'))$('lab-credit-manage').onclick=async()=>{
    state.textContent='Opening billing management…';
    try{
      const data=await api('/api/billing/portal',{method:'POST'});
      const uri=new URL(data.url);
      if(uri.protocol!=='https:'||!(uri.hostname==='stripe.com'||uri.hostname.endsWith('.stripe.com')))throw new Error('Unverified portal link.');
      location.assign(uri.href);
    }catch(e){state.textContent=e.message;}
  };
  async function loadReferral(){
    if(!account||referralLoading)return;
    const epoch=referralEpoch;
    referralLoading=true;referralState.textContent='Preparing your invite link…';
    try{
      const data=await api('/api/customer/referrals');
      if(!account||epoch!==referralEpoch)return;
      const url=new URL(data.url);
      if(url.protocol!=='https:')throw new Error('Invalid referral link.');
      referralUrl.value=url.href;referralCopy.disabled=false;
      const count=Number(data.rewarded)||0;
      referralStats.textContent=count+' successful invite'+(count===1?'':'s')+' · '+(Number(data.invited)||0)+' registered';
      referralState.textContent=data.rewardsAvailable?'Bonus credits are granted after your friend’s first qualifying payment.':'Rewards unlock when PV Lab public billing opens.';
    }catch(e){if(epoch===referralEpoch)referralState.textContent=e.message||'Your referral link is temporarily unavailable.';}
    finally{if(epoch===referralEpoch)referralLoading=false;}
  }
  async function refresh(){
    if(!account)return;const current=accountEpoch;
    if(refreshing){refreshAgain=true;return refreshing;}
    refreshing=(async()=>{
    try{
      const data=await api('/api/customer/wallet');
      if(!account||current!==accountEpoch)return;billingReview=!!data.billingReview;accountClosed=data.accountClosed||false;trialGenerationPaused=!!data.trialGenerationPaused;balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;
      products=Array.isArray(data.products)?data.products:products;$('lab-credit-invite').hidden=!referralsAvailable(data);update();
    }catch(e){if(account&&current===accountEpoch)notify(e.message,true);}
    finally{refreshing=null;if(refreshAgain){refreshAgain=false;if(account)void refresh();}}
    })();return refreshing;
  }
  function connect(data){
    const next=!!data.customer;accountEpoch++;dismissed=false;purchasing=false;refreshAgain=false;billingReview=!!data.billingReview;accountClosed=data.accountClosed||false;trialGenerationPaused=!!data.trialGenerationPaused;
    if($('lab-close-confirm'))$('lab-close-confirm').value='';
    if($('lab-close-account'))$('lab-close-account').disabled=true;
    referralEpoch++;referralLoading=false;
    referralUrl.value='';referralCopy.disabled=true;referralStats.textContent='';referralState.textContent='';
    account=next;soulIdTrainingCredits=account&&Number.isSafeInteger(data.soulIdTrainingCredits)?data.soulIdTrainingCredits:null;
    if(account){balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;products=data.products||[];}
    else{balance=0;billingReady=false;products=[];}
    $('lab-credit-invite').hidden=!referralsAvailable(data);
    update();
  }
  window.addEventListener('focus',()=>{if(account&&document.visibilityState==='visible')void refresh();});
  return {connect,refresh,open,openReferrals,cost,describe,jobCharge,buyPlan:purchase,isCustomer:()=>account};
}
