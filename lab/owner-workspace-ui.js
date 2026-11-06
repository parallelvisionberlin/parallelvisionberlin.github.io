// Navigation only. The existing reports, authorization and customer dialogs are reused.
const routes={
  'owner-overview':['home','home','owner-overview'],
  'owner-business':['sales','sales','owner-acquisition-section'],
  'owner-traffic-section':['traffic','traffic','owner-traffic-section'],
  'owner-acquisition-section':['sales','sales','owner-acquisition-section'],
  'owner-payments-section':['sales','sales','owner-payments-section'],
  'owner-providers-section':['costs','costs','owner-providers-section'],
  'owner-referrals-section':['promotions','promotions','owner-referrals-section'],
  'owner-vouchers-section':['promotions','promotions','owner-vouchers-section'],
  'owner-customers-section':['customers','customers','owner-customers-section'],
  'owner-customer-usage':['customers','customers','owner-customers-section'],
  'owner-system':['work','attention','owner-work-section'],
  'owner-system-attention':['work','attention','owner-work-section'],
  'owner-work-section':['work','work','owner-work-section'],
  'owner-release-section':['work','reference','owner-work-section']
};
export function resolveOwnerRoute(hash=''){
  const key=String(hash).replace(/^#/,'');
  const [view,tab,section]=Object.hasOwn(routes,key)?routes[key]:routes['owner-overview'];
  return {view,tab,section};
}
export function createOwnerWorkspace({ownerReady=()=>false,onNavigate=()=>{}}={}){
  const $=id=>document.getElementById(id);
  const groups={home:['owner-partner-payout-notice'],sales:['owner-acquisition-section','owner-payments-section'],traffic:['owner-traffic-section'],costs:['owner-providers-section'],promotions:['owner-referrals-section','owner-vouchers-section'],customers:['owner-customers-section'],work:['owner-work-section']};
  for(const node of document.querySelectorAll('.owner-metrics,.owner-activity'))node.dataset.ownerView='home';
  for(const [view,ids] of Object.entries(groups))for(const id of ids){if($(id))$(id).dataset.ownerView=view;}
  const directory=$('owner-customers-section');
  if(directory){
    for(const dialog of directory.querySelectorAll('dialog'))$('owner-dashboard')?.append(dialog);
    for(const id of ['owner-integrations','owner-setup-guide']){const node=$(id);if(node)$('owner-customer-tools')?.append(node);}
  }
  const dialogs=['owner-notifications-dialog','owner-system-dialog','owner-reference-dialog'];
  function openDialog(id){
    if(!ownerReady())return;
    for(const other of dialogs){if(other!==id&&$(other)?.open)$(other).close();}
    const dialog=$(id);if(dialog&&!dialog.open)dialog.showModal();
  }
  for(const button of document.querySelectorAll('[data-owner-open-dialog]'))button.addEventListener('click',()=>{openDialog(button.dataset.ownerOpenDialog);if(ownerReady())onNavigate({...active,utility:button.dataset.ownerOpenDialog});});
  for(const button of document.querySelectorAll('[data-owner-close-dialog]'))button.addEventListener('click',()=>$(button.dataset.ownerCloseDialog)?.close());
  let active=resolveOwnerRoute(location.hash);
  function route(hash=location.hash,{scroll=false}={}){
    active=resolveOwnerRoute(hash);
    for(const node of document.querySelectorAll('[data-owner-view]'))node.classList.toggle('owner-view-hidden',node.dataset.ownerView!==active.view);
    const titles={home:'Overview',customers:'Customers',sales:'Sales',traffic:'Traffic',costs:'Costs',promotions:'Promotions',work:'Work log'};
    if($('owner-view-title'))$('owner-view-title').textContent=titles[active.view];
    if($('owner-view-eyebrow'))$('owner-view-eyebrow').textContent='PV LAB / OWNER';
    if($('owner-view-intro'))$('owner-view-intro').hidden=true;
    for(const link of document.querySelectorAll('[data-owner-nav],.owner-jumpbar a[href^="#"]')){
      if(resolveOwnerRoute(link.hash).view===active.view)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    for(const id of dialogs)if($(id)?.open)$(id).close();
    if(String(hash)==='#owner-referrals-section'&&$('owner-referrals-detail'))$('owner-referrals-detail').open=true;
    if(ownerReady()){
      onNavigate({...active});
      if(active.tab==='attention')openDialog('owner-system-dialog');
      if(active.tab==='reference')openDialog('owner-reference-dialog');
    }
    if(scroll)$('owner-main')?.scrollIntoView({block:'start',behavior:'instant'});
    return {...active};
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#owner-"]');
    if(!link||event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const hash=link.getAttribute('href');if(!Object.hasOwn(routes,hash.slice(1)))return;
    event.preventDefault();if(location.hash!==hash)history.pushState(null,'',hash);
    route(hash,{scroll:true});if($('owner-mobile-access'))$('owner-mobile-access').open=false;
  });
  window.addEventListener('hashchange',()=>route(location.hash,{scroll:true}));
  window.addEventListener('popstate',()=>route(location.hash,{scroll:true}));
  route(location.hash);
  return {route,current:()=>({...active}),reset:()=>route(location.hash),openDialog};
}
