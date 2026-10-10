// Credit wallet UI. Backend verifies every price, balance, webhook and receipt.
export function createCustomerWallet({api,notify=()=>{}}){
  const $=id=>document.getElementById(id);
  let account=false,billingReady=false,balance=0,products=[],referralLoading=false,referralEpoch=0;
  const toggle=$('lab-wallet-toggle'),dialog=$('lab-credits-dialog'),referralDialog=$('lab-referrals-dialog'),amount=$('lab-credit-balance'),
        list=$('lab-credit-products'),state=$('lab-wallet-state'),
        referralUrl=$('lab-referral-url'),referralCopy=$('lab-referral-copy'),
        referralState=$('lab-referral-status'),referralStats=$('lab-referral-stats');
  const cost=usd=>Math.max(7,Math.ceil(Math.round(Number(usd)*1e6)*460/1e6));
  function describe(usd){return (Number.isFinite(Number(usd))?cost(Number(usd)).toLocaleString():'?')+' credits';}
  function update(){
    toggle.hidden=!account;
    if(!account){if(dialog?.open)dialog.close();if(referralDialog?.open)referralDialog.close();return;}
    toggle.textContent=balance.toLocaleString()+' credits';
    amount.textContent=balance.toLocaleString()+' credits';
    state.textContent=billingReady?'Your private credit balance.':'Checkout setup is being finalized. Payments are not being accepted yet.';
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
  }
  function openReferrals(){
    if(!account)return;
    if(dialog.open)dialog.close();
    if(!referralDialog.open)referralDialog.showModal();
    void loadReferral();
  }
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
    if(!account)return;
    try{
      const data=await api('/api/customer/wallet');
      if(!account)return;balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;
      products=Array.isArray(data.products)?data.products:products;update();
    }catch(e){notify(e.message,true);}
  }
  function connect(data){
    const next=!!data.customer;
    referralEpoch++;referralLoading=false;
    referralUrl.value='';referralCopy.disabled=true;referralStats.textContent='';referralState.textContent='';
    account=next;
    if(account){balance=Number(data.balanceCredits)||0;billingReady=!!data.billingReady;products=data.products||[];}
    update();
  }
  return {connect,refresh,open,openReferrals,cost,describe,isCustomer:()=>account};
}
