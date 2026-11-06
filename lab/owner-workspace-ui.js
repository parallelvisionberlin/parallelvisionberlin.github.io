// Presentation routing only. Original sections, forms, dialogs and access checks stay intact.
const routes={
  'owner-overview':['home','home','owner-overview'],
  'owner-business':['business','conversion','owner-acquisition-section'],
  'owner-traffic-section':['business','traffic','owner-traffic-section'],
  'owner-acquisition-section':['business','conversion','owner-acquisition-section'],
  'owner-payments-section':['business','payments','owner-payments-section'],
  'owner-providers-section':['business','costs','owner-providers-section'],
  'owner-referrals-section':['business','referrals','owner-referrals-section'],
  'owner-vouchers-section':['business','vouchers','owner-vouchers-section'],
  'owner-customers-section':['customers','directory','owner-customers-section'],
  'owner-customer-usage':['customers','usage','owner-customer-usage'],
  'owner-system':['system','attention','owner-system-attention'],
  'owner-system-attention':['system','attention','owner-system-attention'],
  'owner-work-section':['system','work','owner-work-section'],
  'owner-release-section':['system','documentation','owner-release-section']
};
export function resolveOwnerRoute(hash=''){
  const key=String(hash).replace(/^#/,'');
  const [view,tab,section]=(Object.hasOwn(routes,key)?routes[key]:routes['owner-overview']);
  return {view,tab,section};
}
export function createOwnerWorkspace({ownerReady=()=>false,onNavigate=()=>{}}={}){
  const $=id=>document.getElementById(id);
  const groups={
    home:['owner-home-attention','owner-partner-payout-notice'],
    business:['owner-traffic-section','owner-acquisition-section','owner-payments-section','owner-providers-section','owner-referrals-section','owner-vouchers-section'],
    customers:['owner-customers-section','owner-customer-usage'],
    system:['owner-system-attention','owner-work-section','owner-release-section']
  };
  const homeNodes=[...document.querySelectorAll('.owner-metrics,.owner-activity')];
  for(const node of homeNodes)node.dataset.ownerView='home';
  for(const [view,ids] of Object.entries(groups))for(const id of ids){const node=$(id);if(node)node.dataset.ownerView=view;}
  // One customer profile is reached from the directory and lifetime usage report.
  const directory=$('owner-customers-section');
  if(directory){
    for(const dialog of directory.querySelectorAll('dialog'))$('owner-dashboard')?.append(dialog);
    for(const id of ['owner-integrations','owner-setup-guide']){const node=$(id);if(node)directory.append(node);}
  }
  let active=resolveOwnerRoute(location.hash);
  function route(hash=location.hash,{scroll=false}={}){
    active=resolveOwnerRoute(hash);
    for(const node of document.querySelectorAll('[data-owner-view]')){
      const view=node.dataset.ownerView;
      const panel=Object.values(groups).flat().includes(node.id);
      const visible=view===active.view&&(!panel||view==='home'||node.id===active.section);
      node.classList.toggle('owner-view-hidden',!visible);
    }
    for(const [id,view] of [['owner-business-nav','business'],['owner-customer-nav','customers'],['owner-system-nav','system']])$(id)?.classList.toggle('owner-view-hidden',view!==active.view);
    $('owner-promotions-nav')?.classList.toggle('owner-view-hidden',!['referrals','vouchers'].includes(active.tab));
    const titles={home:['PV LAB / OVERVIEW','Home','Your business and the work that needs attention.'],business:['PV LAB / BUSINESS','Business','Traffic, conversion, payments and costs.'],customers:['PV LAB / CUSTOMERS','Customers','One directory. One customer profile.'],system:['PV LAB / OPERATIONS','System','What needs attention, what changed and where to continue.']};
    const [eyebrow,title,intro]=titles[active.view];
    if($('owner-view-title'))$('owner-view-title').textContent=title;
    if($('owner-view-eyebrow'))$('owner-view-eyebrow').textContent=eyebrow;
    if($('owner-view-intro'))$('owner-view-intro').textContent=intro;
    for(const link of document.querySelectorAll('[data-owner-nav],.owner-jumpbar a[href^="#"]')){
      const selected=resolveOwnerRoute(link.hash).view===active.view;
      if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    for(const link of document.querySelectorAll('[data-owner-tab]')){
      const tab=resolveOwnerRoute(link.hash).tab;
      const selected=link.dataset.ownerTab==='promotions'?['referrals','vouchers'].includes(active.tab):tab===active.tab;
      if(selected)link.setAttribute('aria-current','page');else link.removeAttribute('aria-current');
    }
    if(ownerReady())onNavigate({...active});
    if(scroll)$('owner-main')?.scrollIntoView({block:'start',behavior:'instant'});
    return {...active};
  }
  document.addEventListener('click',event=>{
    const link=event.target.closest('a[href^="#owner-"]');
    if(!link||event.defaultPrevented||event.button>0||event.ctrlKey||event.metaKey||event.shiftKey||event.altKey)return;
    const hash=link.getAttribute('href');
    if(!routes[hash.slice(1)])return;
    event.preventDefault();
    if(location.hash!==hash)history.pushState(null,'',hash);
    route(hash,{scroll:true});
    if($('owner-mobile-access'))$('owner-mobile-access').open=false;
  });
  window.addEventListener('hashchange',()=>route(location.hash,{scroll:true}));
  window.addEventListener('popstate',()=>route(location.hash,{scroll:true}));
  route(location.hash);
  return {route,current:()=>({...active}),reset:()=>route(location.hash)};
}
