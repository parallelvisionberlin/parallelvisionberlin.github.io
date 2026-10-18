// Studio reuses homepage SKUs and checkout, with its own approved compact visual treatment.
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
  link.href=href+(file==='pricing-overlay.css'?'?v=20261018-wide-pricing1':'');
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
    // Modal-only presentation; product values, prices, IDs and buttons still
    // come directly from the homepage. Never rewrite the public pricing page.
    section.classList.add('lab-studio-pricing');
    const comparison=section.querySelector('.lab-pricing-comparison');
    comparison?.insertAdjacentHTML('afterbegin','<span class="lab-overlay-brand">PV LAB</span><p class="lab-overlay-tagline" aria-hidden="true">SAME VISION.\\nMORE POSSIBILITIES.</p>');
    const heading=section.querySelector('#lab-plans-title');
    if(heading)heading.innerHTML='More room <span>to create.</span>';
    const intro=section.querySelector('.lab-plans-intro');
    if(intro)intro.textContent='Credits give you access to images, video and upscaling. Choose a plan or get one-time credits.';
    const svgIcons={"credits":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><ellipse cx=\"12\" cy=\"5\" rx=\"8\" ry=\"3\"/><path d=\"M4 5v5c0 1.7 3.6 3 8 3s8-1.3 8-3V5M4 10v5c0 1.7 3.6 3 8 3s8-1.3 8-3v-5M4 15v4c0 1.6 3.6 3 8 3s8-1.4 8-3v-4\"/></svg>","image":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><circle cx=\"8\" cy=\"9\" r=\"1.4\"/><path d=\"m4 17 5-5 3 3 3-4 5 6\"/></svg>","video":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><rect x=\"3\" y=\"4\" width=\"18\" height=\"16\" rx=\"2\"/><path d=\"m10 8 6 4-6 4z\"/></svg>","spark":"<svg viewBox=\"0 0 24 24\" aria-hidden=\"true\"><path d=\"m12 3 1.7 5.3L19 10l-5.3 1.7L12 17l-1.7-5.3L5 10l5.3-1.7L12 3Zm7 13 .8 2.2L22 19l-2.2.8L19 22l-.8-2.2L16 19l2.2-.8L19 16ZM4 2l.5 1.5L6 4l-1.5.5L4 6l-.5-1.5L2 4l1.5-.5L4 2Z\"/></svg>"};
    function addIcon(node,name){
      if(!node)return;
      const wrapper=document.createElement('span');
      wrapper.className='lab-overlay-icon';
      wrapper.setAttribute('aria-hidden','true');
      wrapper.innerHTML=svgIcons[name];
      node.prepend(wrapper);
    }
    for(const plan of section.querySelectorAll('.lab-plan')){
      const button=plan.querySelector('button[data-lab-buy]');
      if(!button)continue;
      const sku=button.dataset.labBuy;
      addIcon(plan.querySelector('.lab-plan-credits'),'credits');
      const usage=plan.querySelectorAll('.lab-plan-usage-stats > span');
      addIcon(usage[0],'image');
      addIcon(usage[1],'video');
      const detail=document.createElement('p');
      detail.className='lab-overlay-plan-note';
      addIcon(detail,'spark');
      const note={
        starter:'Image, video and upscaling tools',
        creator:'More credits for creative iterations',
        studio:'Higher allowance for larger projects',
        topup10:'One-time credits for your next project',
        topup29:'One-time credits for your next project',
        topup75:'One-time credits for your next project'
      }[sku]||'Image, video and upscaling tools';
      detail.append(document.createTextNode(note));
      button.before(detail);
      const billing=document.createElement('p');
      billing.className='lab-overlay-card-fineprint';
      billing.textContent=sku.startsWith('topup')?'Pay once · No recurring charge':'Billed monthly · Renews until cancelled';
      button.after(billing);
    }
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
