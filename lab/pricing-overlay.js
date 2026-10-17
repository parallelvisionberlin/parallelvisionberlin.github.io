// The Studio opens the exact public homepage pricing design, in-place.
// No hard-coded SKU amounts or prices: markup comes from the live PV LAB
// homepage and Stripe purchases use the existing authenticated wallet.
const home=new URL('./index.html',import.meta.url);
const cssFiles=['credits.css','pricing.css','pricing-refresh.css','pricing-mobile.css','pricing-overlay.css'];
const styles=new Map();
function addStyle(file){
  if(styles.has(file))return styles.get(file);
  const href=new URL(file,import.meta.url).href;
  const existing=[...document.querySelectorAll('link[rel="stylesheet"]')]
    .find(link=>link.href.split('?')[0]===href);
  if(existing)return Promise.resolve();
  const link=document.createElement('link');link.rel='stylesheet';
  link.href=href+(file==='pricing-overlay.css'?'?v=20261017-editorial1':'');
  const result=new Promise((resolve,reject)=>{
    link.addEventListener('load',resolve,{once:true});
    link.addEventListener('error',()=>reject(new Error('Pricing design could not load. Try again.')),{once:true});
  });
  styles.set(file,result);
  document.head.append(link);
  return result;
}
export function createPricingOverlay({buy,getAccount,onSignIn}){
  const dialog=document.getElementById('lab-pricing-overlay');
  const surface=document.getElementById('lab-pricing-overlay-body');
  const closeButton=document.getElementById('lab-pricing-overlay-close');
  const status=document.getElementById('lab-pricing-overlay-status');
  if(!dialog||!surface||!closeButton)throw new Error('PV LAB pricing overlay is unavailable.');
  let loaded=null,previousFocus=null,submitting=false;
  const note=(message='')=>{
    if(!status)return;
    status.hidden=!message;status.textContent=message;
  };
  function close(){if(dialog.open&&!submitting)dialog.close();}
  closeButton.addEventListener('click',close);
  dialog.addEventListener('close',()=>{
    note('');
    const restore=previousFocus;
    previousFocus=null;
    if(restore?.isConnected&&typeof restore.focus==='function')restore.focus({preventScroll:true});
  });
  dialog.addEventListener('click',event=>{
    if(event.target===dialog)close();
  });
  async function install(){
    // The original homepage owns the six plan cards, display figures and imagery.
    // One request, only on demand. Nothing is inserted into the Studio's prompt.
    await Promise.all(cssFiles.map(addStyle));
    const response=await fetch(home,{credentials:'same-origin',cache:'no-store'});
    if(!response.ok)throw new Error('Plans could not be loaded. Please try again.');
    const markup=new DOMParser().parseFromString(await response.text(),'text/html');
    const original=markup.querySelector('section#pricing.lab-plans');
    if(!original)throw new Error('PV LAB pricing is temporarily unavailable.');
    const section=document.importNode(original,true);
    section.querySelectorAll('script').forEach(node=>node.remove());
    surface.replaceChildren(section);
    // The existing homepage pricing tabs implement the same monthly / one-time
    // switch, estimate popovers and keyboard navigation inside this modal.
    await import('./pricing-tabs.js?v=20261017-editorial-overlay1');
    for(const button of section.querySelectorAll('button[data-lab-buy]')){
      button.addEventListener('click',()=>void purchase(button));
    }
  }
  function ensure(){
    if(!loaded)loaded=install().catch(error=>{loaded=null;throw error;});
    return loaded;
  }
  async function purchase(button){
    if(submitting||!dialog.open)return;
    const sku=button.dataset.labBuy;
    if(!['starter','creator','studio','topup10','topup29','topup75'].includes(sku))return;
    const account=getAccount?.()||{};
    if(!account.signedIn){
      note('Sign in to select a PV LAB plan.');
      close();
      onSignIn?.();
      return;
    }
    if(!account.customer){
      note('Use a customer account to purchase credits. Owner accounts cannot buy customer plans.');
      return;
    }
    submitting=true;
    const buttons=[...surface.querySelectorAll('button[data-lab-buy]')];
    buttons.forEach(node=>{node.disabled=true;node.setAttribute('aria-busy',String(node===button));});
    note('Opening secure checkout…');
    try{
      await buy(sku,message=>note(message||''));
    }catch(error){
      note(error?.message||'Secure checkout could not be opened. Nothing was charged.');
    }finally{
      submitting=false;
      buttons.forEach(node=>{node.disabled=false;node.setAttribute('aria-busy','false');});
    }
  }
  async function open({oneTime=false}={}){
    if(!dialog.open){
      previousFocus=document.activeElement;
      dialog.showModal();
      closeButton.focus({preventScroll:true});
    }
    note(surface.querySelector('#pricing')?'':'Loading plans…');
    try{
      await ensure();
      note('');
      const tab=surface.querySelector(oneTime?'#lab-tab-onetime':'#lab-tab-monthly');
      if(tab&&tab.getAttribute('aria-selected')!=='true')tab.click();
      if(dialog.open)closeButton.focus({preventScroll:true});
    }catch(error){
      note(error?.message||'Pricing is unavailable. Please try again.');
    }
  }
  // Keep existing Studio Pricing links on this page; no homepage hero jump.
  document.addEventListener('click',event=>{
    const anchor=event.target.closest?.('a[href]');
    if(!anchor||event.defaultPrevented)return;
    let url;try{url=new URL(anchor.href,location.href);}catch{return;}
    if(url.origin!==location.origin||url.hash!=='#pricing')return;
    if(!['/','/lab/','/lab/index.html','/index.html'].includes(url.pathname))return;
    event.preventDefault();
    void open();
  });
  return {open,close};
}
