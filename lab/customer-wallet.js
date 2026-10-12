// Credit wallet UI. Backend verifies every price, balance, webhook and receipt.
export function createCustomerWallet({api,notify=()=>{},onClosed=()=>{}}){
  const $=id=>document.getElementById(id);
  let account=false,billingReady=false,balance=0,products=[],referralLoading=false,referralEpoch=0,soulIdTrainingCredits=null,billingReview=false,accountClosed=false,accountEpoch=0;
  const toggle=$('lab-wallet-toggle'),dialog=$('lab-credits-dialog'),referralDialog=$('lab-referrals-dialog'),amount=$('lab-credit-balance'),
        list=$('lab-credit-products'),state=$('lab-wallet-state'),
        referralUrl=$('lab-referral-url'),referralCopy=$('lab-referral-copy'),
        referralState=$('lab-referral-status'),referralStats=$('lab-referral-stats');
  const cost=usd=>Math.max(7,Math.ceil(Math.round(Number(usd)*1e6)*460/1e6));
  function describe(usd){return (Number.isFinite(Number(usd))?cost(Number(usd)).toLocaleString():'?')+' credits';}
  function jobCharge(job){
    if(job?.settings?.provider==='higgsfield'&&job.settings.mode==='soul-id-training'&&soulIdTrainingCredits!==null)
      return soulIdTrainingCredits.toLocaleString()+' credits';
    return describe(job?.estimatedUsd);
  }
  function update(){
    toggle.hidden=!account;
    if(!account){if(dialog?.open)dialog.close();if(referralDialog?.open)referralDialog.close();return;}
    toggle.textContent=balance.toLocaleString()+' credits';
    amount.textContent=balance.toLocaleString()+' credits';
    state.textContent=accountClosed?'Your PV Lab account is closed. Content deletion is '+(accountClosed.state==='deleted'?'complete.':'queued. Contact support if you need help.')+' Billing management remains available.':billingReview?'A refund or dispute is under review. Contact support; billing management remains available.':billingReady?'Your private credit balance.':'Checkout setup is being finalized. Payments are not being accepted yet.';
    list.replaceChildren();
    for(const p of products){
      const button=document.createElement('button');button.type='button';
      const label=document.createElement('span'),price=document.createElement('span');
      label.textContent=p.title.replace('PV Lab · ','').replace('PV Lab ','');
      price.textContent=p.credits.toLocaleString()+' credits · €'+p.priceEur.toFixed(2);
      button.append(label,price);button.disabled=!billingReady;
      button.onclick=()=>void purchase(p.id);
      list.append(button);
    }
  }
  async function purchase(sku){
    if(!account||!billingReady){state.textContent='Checkout has not been enabled. No payment was attempted.';return;}
    state.textContent='Opening secure checkout…';
    try{
      const data=await api('/api/billing/checkout',{method:'POST',body:{sku}});
      const uri=new URL(data.url);
      if(uri.protocol!=='https:'||!(uri.hostname==='stripe.com'||uri.hostname.endsWith('.stripe.com')))throw new Error('Unverified checkout link.');
      location.assign(uri.href);
    }catch(e){state.textContent=e.message;notify(e.message,true);}
  }
  function open(){
    if(!account)return;
    if(referralDialog.open)referralDialog.close();
    if(!dialog.open)dialog.showModal();
    void loadAccount();
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
  $('lab-credit-invite').onclick=openReferrals;
  $('lab-referrals-close').onclick=()=>referralDialog.close();
  referralCopy.onclick=async()=>{
    if(!referralUrl.value)return;
    try{await navigator.clipboard.writeText(referralUrl.value);referralState.textContent='Invite link copied.';}
    catch{referralUrl.focus();referralUrl.select();referralState.textContent='Select and copy this invite link.';}
  };
  $('lab-credits-close').onclick=()=>dialog.close();
  $('lab-credit-refresh').onclick=()=>void refresh();
  $('lab-credit-manage').onclick=async()=>{
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
    try{
      const data=await api('/api/customer/wallet');
      if(!account||current!==accountEpoch)return;billingReview=!!data.billingReview;accountClosed=data.accountClosed||false;balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;
      products=Array.isArray(data.products)?data.products:products;update();
    }catch(e){notify(e.message,true);}
  }
  function connect(data){
    const next=!!data.customer;accountEpoch++;billingReview=!!data.billingReview;accountClosed=data.accountClosed||false;
    if($('lab-close-confirm'))$('lab-close-confirm').value='';
    if($('lab-close-account'))$('lab-close-account').disabled=true;
    referralEpoch++;referralLoading=false;
    referralUrl.value='';referralCopy.disabled=true;referralStats.textContent='';referralState.textContent='';
    account=next;soulIdTrainingCredits=account&&Number.isSafeInteger(data.soulIdTrainingCredits)?data.soulIdTrainingCredits:null;
    if(account){balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;products=data.products||[];}
    update();
  }
  return {connect,refresh,open,openReferrals,cost,describe,jobCharge,isCustomer:()=>account};
}
