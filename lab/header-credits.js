// Shared PV LAB header credit presentation. Pure display logic only.
// Never grant, infer, spend or persist credits. Only a verified, nonnegative
// integer from the current authenticated session may be displayed as a balance.
export function creditHeaderState({signed=false,profile=null,guestVisible=false}={}){
  if(!signed)return {
    visible:guestVisible,label:'Get credits',unit:false,
    description:'Get credits and view pricing',status:'guest'
  };
  if(profile?.accountClosed)return {
    visible:true,label:'Account closed',unit:false,
    description:'Account closed. View account and billing',status:'closed'
  };
  const amount=profile?.customer===true?profile.balanceCredits:null;
  if(Number.isSafeInteger(amount)&&amount>=0)return {
    visible:true,label:amount.toLocaleString('en-GB'),unit:true,
    description:amount.toLocaleString('en-GB')+' credits. View credits and billing',
    status:'verified'
  };
  return {
    visible:true,label:'Credits',unit:false,
    description:'Balance unavailable. View credits and billing',status:'unavailable'
  };
}
export function renderHeaderCredits(link,{signed=false,profile=null,guestVisible=false,guestHref='#pricing',billingHref='./account.html#balance'}={}){
  if(!link)return null;
  const state=creditHeaderState({signed,profile,guestVisible});
  link.hidden=!state.visible;
  const copy=link.querySelector('.lab-home-credit-copy');
  const unit=link.querySelector('.lab-home-credit-unit');
  if(copy)copy.textContent=state.label;
  if(unit)unit.hidden=!state.unit;
  link.href=signed?billingHref:guestHref;
  link.setAttribute('aria-label',state.description);
  link.title=state.description;
  link.dataset.balanceStatus=state.status;
  return state;
}
