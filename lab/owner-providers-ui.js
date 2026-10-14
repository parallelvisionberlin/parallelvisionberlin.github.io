// Owner Control Room finance renderer. All values come from the owner-protected Worker response.
// This module never receives, stores, or makes requests with provider credentials.
const $=id=>document.getElementById(id);
const logos=Object.freeze({
  spicy:['SP','https://spicyapi.ai/favicon.ico'],
  fal:['fal','https://fal.ai/favicon.ico'],
  higgsfield:['HF','https://higgsfield.ai/favicon.ico'],
  gemini:['G','https://aistudio.google.com/favicon.ico'],
  fashn:['F','https://fashn.ai/favicon.ico']
});
const billingUrls=Object.freeze({
  spicy:'https://spicyapi.ai/console/billing',
  fal:'https://fal.ai/dashboard/billing',
  higgsfield:'https://open.higgsfield.ai',
  gemini:'https://aistudio.google.com/billing',
  fashn:'https://app.fashn.ai/billing/api'
});
const element=(tag,cls,content)=>{
  const el=document.createElement(tag);
  if(cls)el.className=cls;
  if(content!==undefined&&content!==null)el.textContent=String(content);
  return el;
};
function money(value,unit){
  if(value==null)return null;
  const n=Number(value);
  if(!Number.isFinite(n))return null;
  if(unit==='credits')return n.toLocaleString('en-GB',{maximumFractionDigits:0})+' credits';
  if(unit==='USD')return '$'+n.toLocaleString('en-GB',{minimumFractionDigits:2,maximumFractionDigits:2});
  return null;
}
function timeString(value){
  if(!value||!Number.isFinite(Date.parse(value)))return 'Not available';
  return new Date(value).toLocaleDateString('en-GB',{day:'numeric',month:'short',hour:'2-digit',minute:'2-digit',timeZone:'UTC'})+' UTC';
}
function mark(id){
  const props=logos[id],item=element('span','owner-provider-mark',props?.[0]||'?');
  if(props){
    const img=document.createElement('img');
    img.alt='';img.src=props[1];img.loading='lazy';img.referrerPolicy='no-referrer';
    img.addEventListener('error',()=>img.remove());item.append(img);
  }
  return item;
}
function stateOf(p){
  if(!p.configured)return {level:'offline',text:'Not configured'};
  if(p.low&&p.balance!=null)return {level:'low',text:'Low balance'};
  if(p.status==='live')return {level:'live',text:'Live data'};
  if(p.status==='configured')return {level:'unknown',text:'API configured'};
  return {level:'unknown',text:p.status==='permission-required'?'Billing access needed':'Unavailable'};
}
function statusOf(p){
  const s=stateOf(p),el=element('span','owner-provider-status',s.text);
  el.dataset.level=s.level;return el;
}
function stat(label,value,details){
  const div=element('div','owner-provider-stat');
  div.append(element('span','',label),element('strong','',value));
  if(details)div.append(element('small','',details));
  return div;
}
export function renderOwnerProviderFinances(data){
  if(!Array.isArray(data?.providers))throw Error('Provider report response is unavailable.');
  const preview=$('owner-provider-previews'),details=$('owner-provider-details');
  preview.replaceChildren();details.replaceChildren();
  for(const p of data.providers){
    if(!Object.hasOwn(logos,p.id))continue;
    const balance=money(p.balance,p.balanceUnit)||'Balance unavailable';
    const card=element('a','owner-provider-preview');card.href='#owner-providers-section';
    const head=element('div','owner-provider-preview-head');
    head.append(mark(p.id),element('strong','owner-provider-name',p.name));
    const figure=element('div','owner-provider-preview-balance',balance);figure.dataset.empty=String(p.balance==null);
    const foot=element('div','owner-provider-preview-foot');
    foot.append(element('span','',p.billingType||'Billing unavailable'),statusOf(p));
    card.append(head,figure,foot);preview.append(card);
    const row=element('article','owner-provider-detail');
    const identity=element('div','owner-provider-detail-identity'),title=element('div','');
    title.append(element('h3','',p.name),element('small','',p.billingType||'Check provider billing'));
    identity.append(mark(p.id),title);
    row.append(identity,
      stat('Available balance',balance,p.held!=null?'On hold: '+money(p.held,'USD'):''),
      stat('Spent today',money(p.spendToday,p.spendUnit)||'Unavailable',p.spendKind||''),
      stat('This month',money(p.spendMonth,p.spendUnit)||'Unavailable',p.spendKind||''),
      stat('Last successful sync',timeString(p.lastSuccess),p.lastChecked?'Checked '+timeString(p.lastChecked):'')
    );
    const actions=element('div','owner-provider-detail-action');
    const link=element('a','','Billing dashboard ↗');
    link.href=billingUrls[p.id];link.target='_blank';link.rel='noopener noreferrer';
    actions.append(statusOf(p),link);row.append(actions);
    if(p.id==='spicy'&&p.funding){
      const amounts=element('div','owner-provider-key-usage');
      amounts.append(element('p','','USD funding breakdown · not additive to wallet balance'));
      const ul=document.createElement('ul');
      for(const [key,label] of [['prepaid','Prepaid available'],['grants','Promotional grants'],['creditAvailable','Approved credit available']]){
        if(p.funding[key]!=null){
          const item=element('li','');
          item.append(element('strong','',label),element('span','',' · '+(money(p.funding[key],'USD')||'Unavailable')));
          ul.append(item);
        }
      }
      amounts.append(ul);row.append(amounts);
    }
    if(p.id==='spicy'&&Array.isArray(p.keyUsage)){
      const keys=element('div','owner-provider-key-usage');
      keys.append(element('p','','SpicyAPI · one shared wallet; per-key settled spending (UTC)'));
      const ul=document.createElement('ul');
      for(const k of p.keyUsage){
        const li=element('li','');
        li.append(element('strong','',k.label),element('span','',
          ' · Today: '+(money(k.spendToday,'USD')||'Unavailable')+
          ' · Month: '+(money(k.spendMonth,'USD')||'Unavailable')+
          ' · '+(k.configured?(k.status==='live'?'Verified':'Not available'):'Key not connected')));
        ul.append(li);
      }
      keys.append(ul);row.append(keys);
    }
    if(p.components){
      const comp=element('div','owner-provider-key-usage');
      comp.append(element('p','','FASHN credit breakdown'),
        element('span','','Subscription: '+money(p.components.subscription,'credits')+
          ' · On-demand: '+money(p.components.onDemand,'credits')));
      row.append(comp);
    }
    if(p.note||p.error)row.append(element('p','owner-provider-detail-note',[p.error,p.note].filter(Boolean).join(' ')));
    details.append(row);
  }
  if(!preview.children.length)preview.append(element('p','owner-providers-loading','No provider information is available.'));
  const wallet=data.customerWallet;
  $('owner-customer-liability').textContent=wallet?.credits==null?'Unavailable':
    Number(wallet.credits).toLocaleString('en-GB')+' PV LAB credits';
  $('owner-customer-liability-note').textContent=wallet?.note||'Customer wallet credits are separate from provider funds.';
  const legacy=Array.isArray(data.legacy)?data.legacy:[];
  $('owner-provider-legacy').textContent=legacy.length
    ?legacy.map(x=>x.name+': '+x.status).join('. ')+'. Excluded from active provider balances.'
    :'No additional active generation providers were identified in the configured Worker.';
  $('owner-balance-updated').textContent='Report checked '+timeString(data.asOf)+(data.cached?' · cached':'');
}
export function createOwnerProviderUI({call,getOwner}){
  let sequence=0;
  const buttons=()=>Array.from(document.querySelectorAll('[data-owner-balance-refresh]'));
  function clear(){
    sequence++;
    $('owner-provider-previews').replaceChildren(element('p','owner-providers-loading','Loading available provider balances…'));
    $('owner-provider-details').replaceChildren(element('p','owner-providers-loading','Waiting for the provider report…'));
    $('owner-customer-liability').textContent='Unavailable';
    $('owner-balance-updated').textContent='Awaiting secure connection';
    for(const button of buttons()){button.disabled=false;button.textContent='Refresh balances ↻';}
  }
  async function refresh(force=false){
    if(!getOwner())return;
    const current=++sequence;
    for(const button of buttons()){button.disabled=true;button.textContent='Checking…';}
    $('owner-balance-updated').textContent='Checking read-only provider APIs…';
    try{
      const data=await call('/api/admin/providers'+(force?'?refresh=1':''));
      if(current!==sequence||!getOwner())return;
      renderOwnerProviderFinances(data);
    }catch{
      if(current!==sequence||!getOwner())return;
      $('owner-balance-updated').textContent='Provider information unavailable';
      const message='Provider data could not be loaded. Select Refresh balances to try again.';
      if(!$('owner-provider-previews').querySelector('.owner-provider-preview'))
        $('owner-provider-previews').replaceChildren(element('p','owner-providers-loading',message));
      if(!$('owner-provider-details').querySelector('.owner-provider-detail'))
        $('owner-provider-details').replaceChildren(element('p','owner-providers-loading',message));
    }finally{
      if(current===sequence)for(const button of buttons()){button.disabled=false;button.textContent='Refresh balances ↻';}
    }
  }
  for(const button of buttons())button.addEventListener('click',()=>void refresh(true));
  return {clear,refresh};
}
