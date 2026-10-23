// Same-tab navigation context only. This never authorizes payment or generation.
export const checkoutPlans=['starter','creator','studio','topup10','topup29','topup75'];
const key='pv-lab-checkout-return-v1',maxAge=30*60*1000;
const tools=['image','video','upscale','retouch','assets','fashion'];
export function rememberCheckout({sku,ownerId,tool='image',imageDraft=false}){
  if(!checkoutPlans.includes(sku)||!ownerId)throw Error('Select a plan again for this account.');
  const intent={sku,ownerId,tool:tools.includes(tool)?tool:'image',imageDraft:imageDraft===true,at:Date.now()};
  try{sessionStorage.setItem(key,JSON.stringify(intent));}
  catch{throw Error('This browser could not save your checkout selection. Keep Studio open and try again.');}
}
export function takeCheckoutReturn(profile,{back=false}={}){
  const url=new URL(location.href),billing=url.searchParams.get('billing')||(back?'cancel':null);
  if(!['success','cancel'].includes(billing))return null;
  let intent;try{intent=JSON.parse(sessionStorage.getItem(key));sessionStorage.removeItem(key);}catch{}
  // Consume the navigation marker, even when stale. Reload cannot replay a return.
  url.searchParams.delete('billing');history.replaceState(history.state,'',url);
  const age=Date.now()-Number(intent?.at);
  if(!profile?.customer||!intent||intent.ownerId!==profile.ownerId||!checkoutPlans.includes(intent.sku)||
    !tools.includes(intent.tool)||!Number.isFinite(age)||age<0||age>maxAge)return null;
  return {...intent,billing};
}
