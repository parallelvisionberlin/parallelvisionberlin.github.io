import {createPartnerPayoutUI} from './partner-payouts.js?v=20261028-cost1';
import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createAccountMenu} from './account-menu.js?v=20261027-partners1';
const $=id=>document.getElementById(id);
const workspaceSlug=document.body.dataset.partnerWorkspace||'vitolas-studio';
const studioName=workspaceSlug==='robin-studio'?'Robin / König Media':['bellini-studio','robin-studio'].includes(workspaceSlug)?'Bellini Studios':'Vitolas Studio';
const studioAlias=workspaceSlug==='robin-studio'?'robin':['bellini-studio','robin-studio'].includes(workspaceSlug)?'bellini':'vitolas';
const menu=createAccountMenu($('account-menu'));
let clerk=null,revision=0,nextOffset=null,loading=false;
let dashboardPath='/api/customer/partner';
let voucherBusy=false,voucherData=null,createdVoucher=null,requestId=crypto.randomUUID();
let commissionData=null,commissionLimit=25;
let customerFilter='all',customerRevision=0,searchTimer=null;
let customerItems=[],customerPage=0;const customerPageSize=20;
let voucherPage=0,redemptionPage=0;
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
const status=message=>{$('partner-status').textContent=message;};
async function api(path,body){
  const response=await request(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?'Esta cuenta no tiene acceso a '+studioName+'.':data.error||'No pudimos cargar el panel. Inténtalo de nuevo.');
  return data;
}
const payoutUI=createPartnerPayoutUI({root:document.querySelector('[data-partner-payouts]'),api,isCurrent:value=>value===revision&&!!clerk?.isSignedIn,onCommissions:commissions=>{if(commissions)drawCommissions(commissions);}});
const views={overview:'partner-overview',clients:'partner-customers',invitations:'partner-invitations',commissions:'partner-commission-history',guide:'partner-help'};
const viewHashes={overview:'resumen',clients:'clientes',invitations:'invitaciones',commissions:'comisiones',guide:'guia'};
function readView(){const hash=location.hash.slice(1);return Object.keys(views).find(key=>key===hash||views[key]===hash||viewHashes[key]===hash)||'overview';}
function activateView(key,{write=true,focus=false,resetPosition=false}={}){
  if(!Object.hasOwn(views,key))key='overview';
  for(const [name,id] of Object.entries(views))$(id).hidden=name!==key;
  for(const tab of document.querySelectorAll('.partner-worknav [role=tab]')){const selected=tab.dataset.partnerView===key;tab.setAttribute('aria-selected',String(selected));tab.tabIndex=selected?0:-1;}
  if(write){const url=new URL(location.href);url.hash=viewHashes[key];history.replaceState(null,'',url);}
  const panel=$(views[key]);if(focus)panel.focus({preventScroll:true});if(resetPosition)window.scrollTo({top:0,left:0,behavior:'instant'});
}
for(const button of document.querySelectorAll('[data-partner-view]'))button.onclick=()=>activateView(button.dataset.partnerView,{focus:button.getAttribute('role')!=='tab',resetPosition:true});
const tabs=[...document.querySelectorAll('.partner-worknav [role=tab]')];
for(const tab of tabs)tab.addEventListener('keydown',event=>{let next=tabs.indexOf(tab);if(event.key==='ArrowRight')next=(next+1)%tabs.length;else if(event.key==='ArrowLeft')next=(next+tabs.length-1)%tabs.length;else if(event.key==='Home')next=0;else if(event.key==='End')next=tabs.length-1;else return;event.preventDefault();tabs[next].focus({preventScroll:true});activateView(tabs[next].dataset.partnerView,{resetPosition:true});});
window.addEventListener('hashchange',()=>activateView(readView(),{write:false,resetPosition:true}));
const voucherStatus=message=>{$('partner-voucher-status').textContent=message;};
function updatePager(prefix,page,count){const start=count?page*20+1:0,end=Math.min(count,(page+1)*20);$(prefix+'-page').textContent=start+'–'+end+' de '+count;$(prefix+'-prev').disabled=page===0;$(prefix+'-next').disabled=end>=count;}
function clear(){
  payoutUI.clear();
  activateView('overview',{write:false});voucherPage=0;redemptionPage=0;updatePager('partner-voucher',0,0);updatePager('partner-redemption',0,0);
  $('partner-create-layout').classList.remove('is-ready');$('partner-gift-preview').hidden=false;$('partner-start').hidden=false;$('partner-recent-activity').hidden=true;$('partner-overview-budget').textContent='';
  customerItems=[];customerPage=0;$('partner-page').textContent='1';$('partner-prev').disabled=true;
  clearTimeout(searchTimer);$('partner-search').value='';$('partner-customer-status').textContent='';
  $('partner-voucher-form').hidden=false;voucherStatus('');
  menu.update();nextOffset=null;loading=false;
  customerFilter='all';customerRevision++;for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b.dataset.partnerFilter==='all'));
  voucherBusy=false;voucherData=null;createdVoucher=null;requestId=crypto.randomUUID();
  commissionData=null;commissionLimit=25;$('partner-export').disabled=true;$('partner-commission-more').hidden=true;
  for(const id of ['partner-commission-rows','partner-latest-signups','partner-recent-purchases'])$(id).replaceChildren();
  for(const id of ['partner-commission','partner-report-commission','partner-revenue','partner-overview-revenue','partner-commission-held'])$(id).textContent='0,00 €';
  $('partner-commission-status').textContent='';
  $('partner-voucher-workspace').hidden=true;$('partner-invite-balance').hidden=true;$('partner-budget-manage').hidden=true;$('partner-budget-form').hidden=true;$('partner-budget-toggle').setAttribute('aria-expanded','false');$('partner-voucher-result').hidden=true;
  $('partner-voucher-url').value='';$('partner-voucher-code').textContent='';$('partner-voucher-detail').textContent='';$('partner-copy-status').textContent='';
  $('partner-voucher-note').value='';$('partner-voucher-credits').value='100';$('partner-voucher-days').value='14';$('partner-budget-total').value='';$('partner-voucher-status').textContent='';
  $('partner-voucher-rows').replaceChildren();$('partner-redemption-rows').replaceChildren();$('partner-redemption-count').textContent='0';
  for(const key of ['available','reserved','redeemed'])$('partner-budget-'+key).textContent='0';
  $('partner-voucher-create').disabled=true;
  preview();
  $('partner-content').hidden=true;$('partner-more').hidden=false;$('partner-more').disabled=true;
  $('partner-url').value='';$('partner-rows').replaceChildren();
  for(const id of ['registered','overview-registered','paying','subscribed','purchases'])$('partner-'+id).textContent='0';
}
function rows(items){customerItems=items;customerPage=0;renderCustomers();}
function renderCustomers(){
  const items=customerItems.slice(customerPage*customerPageSize,(customerPage+1)*customerPageSize);
  const body=$('partner-rows');body.replaceChildren();
  $('partner-page').textContent=String(customerPage+1);$('partner-prev').disabled=customerPage===0;
  $('partner-more').disabled=(customerPage+1)*customerPageSize>=customerItems.length&&nextOffset===null;
  if(!items.length){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=4;
    const title=document.createElement('span');title.className='partner-empty';
    title.textContent=customerFilter==='all'&&!$('partner-search').value.trim()?'Tu próximo cliente empieza con una invitación.':'No hay clientes con este filtro.';
    cell.append(title,document.createTextNode(customerFilter==='all'&&!$('partner-search').value.trim()?'Comparte tu enlace o invita con créditos. Sus registros y pagos aparecerán aquí.':'Prueba otro filtro o busca otro correo.'));return;}
  for(const person of items){
    const row=body.insertRow(),name=row.insertCell(),button=document.createElement('button');button.type='button';button.className='partner-client-name';
    const label=person.closed?'Cuenta cerrada':person.email||'Correo pendiente de verificación';
    const avatar=document.createElement('span');avatar.className='partner-client-avatar';avatar.setAttribute('aria-hidden','true');
    const tokens=(person.email?.split('@')[0]||'').match(/[a-z0-9]+/gi)||[];avatar.textContent=person.closed?'×':tokens.length>1?(tokens[0][0]+tokens[1][0]).toUpperCase():(tokens[0]?.slice(0,2)||'?').toUpperCase();
    const identity=document.createElement('span'),primary=document.createElement('strong');identity.className='partner-client-identity';primary.textContent=label;identity.append(primary);
    button.append(avatar,identity);button.setAttribute('aria-expanded','false');name.append(button);
    row.insertCell().textContent=date(person.registeredAt);
    const badge=document.createElement('span');badge.className='partner-badge';badge.dataset.active=String(!!person.subscribed);
    badge.textContent=person.closed?'Cerrada':person.subscribed?'Suscripción':person.paid?'De pago':'Registrada';row.insertCell().append(badge);
    const earned=row.insertCell(),amount=document.createElement('span');amount.textContent=Number.isSafeInteger(person.commissionCents)?money(person.commissionCents):'No disponible';earned.append(amount);
    if(person.heldCommissionCents||person.needsReconciliation){const review=document.createElement('small');review.textContent=person.needsReconciliation?'Por conciliar':'En revisión';earned.append(review);}
    button.onclick=()=>{
      const existing=row.nextElementSibling;
      if(existing?.classList.contains('partner-client-detail')){existing.remove();button.setAttribute('aria-expanded','false');return;}
      const detail=document.createElement('tr');detail.className='partner-client-detail';const cell=detail.insertCell();cell.colSpan=4;
      const summary=document.createElement('p');summary.textContent='Registro: '+date(person.registeredAt)+' · '+person.purchases+' compras verificadas';cell.append(summary);
      const references=new Set(person.paymentReferences||[]),payments=commissionData?.receipts.filter(p=>references.has(p.reference))||[];
      if(payments.length){const list=document.createElement('ul');for(const payment of payments){const item=document.createElement('li');item.textContent=date(payment.paidAt||payment.recordedAt)+' · '+(payment.kind==='subscription'?'Suscripción':'Créditos')+' · '+money(payment.amountCents)+' · Comisión: '+(payment.status==='needs_reconciliation'?'por conciliar':money(payment.commissionCents))+' · '+(receiptStatus[payment.status]||'En revisión');list.append(item);}cell.append(list);}
      else{const empty=document.createElement('p');empty.textContent='Aún no hay pagos con comisión registrada.';cell.append(empty);}
      row.after(detail);button.setAttribute('aria-expanded','true');
    };
    row.className='partner-customer-row';row.onclick=event=>{if(!event.target.closest('button'))button.click();};
  }
}
async function refresh(){
  const wantedView=readView(),current=++revision;clear();$('partner-copy').textContent='Copiar';
  $('partner-signin').hidden=!!clerk?.isSignedIn;$('partner-signin').disabled=!clerk;
  if(!clerk?.isSignedIn){status('Inicia sesión con tu cuenta autorizada para abrir '+studioName+'.');return;}
  status('Cargando tu panel…');
  try{
    const profile=await api('/api/session');if(current!==revision)return;
    menu.update({signed:true,user:clerk.user,profile});
    dashboardPath=profile.owner===true?'/api/admin/partners/'+workspaceSlug:'/api/customer/partner';
    const data=await api(dashboardPath+(profile.owner===true?'':'?workspace='+workspaceSlug));if(current!==revision)return;
    if(data.workspace?.slug!==workspaceSlug)throw Error('Esta cuenta no tiene acceso a '+studioName+'.');
    if(data.awaitingPartner){status('Tu acceso de owner está activo. La cuenta de '+studioName+' debe iniciar sesión una vez para activar su enlace y sus datos.');return;}
    menu.update({signed:true,user:clerk.user,profile:{...profile,partnerDashboard:data.workspace}});
    const link=new URL(data.shareUrl||data.referralUrl);
    if(!['https://pvlab.studio','https://www.pvlab.studio','https://parallelvisionlabel.com'].includes(link.origin))throw Error('El enlace no está disponible.');
    $('partner-url').value=link.href;
    for(const [id,key] of [['registered','registered'],['overview-registered','registered'],['paying','payingCustomers'],['subscribed','activeSubscriptions'],['purchases','purchases']])$('partner-'+id).textContent=Number(data.totals[key]||0).toLocaleString('es');
    drawBusiness(data);nextOffset=data.nextOffset;rows(data.customers);
    $('partner-content').hidden=false;activateView(wantedView,{write:false});status('');await loadVouchers(current);if(current===revision)await payoutUI.load({path:dashboardPath+'/payouts',owner:data.ownerView===true,revision:current});
  }catch(error){if(current===revision)status(error.message);}
}
$('partner-signin').onclick=()=>clerk?.openSignIn();
$('partner-signout').onclick=async()=>{++revision;clear();status('Cerrando sesión…');try{await clerk?.signOut();await refresh();}catch{status('No se pudo cerrar sesión. Inténtalo de nuevo.');}};
$('partner-refresh').onclick=()=>void refresh();
for(const button of document.querySelectorAll('[data-partner-overview-filter]'))button.addEventListener('click',()=>document.querySelector('[data-partner-filter="'+button.dataset.partnerOverviewFilter+'"]').click());
$('partner-copy').onclick=async()=>{
  const current=revision,value=$('partner-url').value;if(!value)return;
  try{await navigator.clipboard.writeText(value);if(current===revision)$('partner-copy').textContent='Copiado';}
  catch{if(current===revision){$('partner-url').focus({preventScroll:true});$('partner-url').select();status('Selecciona y copia tu enlace.');}}
};
function customerQuery(offset=0){const params=new URLSearchParams({filter:customerFilter,offset:String(offset)});const q=$('partner-search').value.trim();if(q)params.set('q',q);return dashboardPath+'?'+params;}
async function loadCustomers(){
  const current=revision,local=++customerRevision;customerItems=[];customerPage=0;$('partner-page').textContent='1';loading=true;nextOffset=null;$('partner-more').disabled=true;$('partner-prev').disabled=true;$('partner-customer-status').textContent='Buscando…';$('partner-rows').replaceChildren();
  try{const data=await api(customerQuery());if(current!==revision||local!==customerRevision)return;
    nextOffset=data.nextOffset;rows(data.customers);$('partner-customer-status').textContent='';
  }catch(error){if(current===revision&&local===customerRevision)$('partner-customer-status').textContent=error.message;}
  finally{if(current===revision&&local===customerRevision){loading=false;$('partner-more').disabled=(customerPage+1)*customerPageSize>=customerItems.length&&nextOffset===null;}}
}
$('partner-prev').onclick=()=>{if(loading||customerPage===0)return;customerPage--;renderCustomers();};
$('partner-more').onclick=async()=>{
  if(loading)return;
  if((customerPage+1)*customerPageSize<customerItems.length){customerPage++;renderCustomers();return;}
  if(nextOffset===null)return;
  const current=revision,local=customerRevision;loading=true;$('partner-more').disabled=true;
  try{const data=await api(customerQuery(nextOffset));if(current!==revision||local!==customerRevision)return;
    const previousLength=customerItems.length;customerItems.push(...data.customers);nextOffset=data.nextOffset;
    if(customerItems.length>previousLength)customerPage++;renderCustomers();$('partner-customer-status').textContent='';
  }catch(error){if(current===revision&&local===customerRevision)$('partner-customer-status').textContent=error.message;}
  finally{if(current===revision&&local===customerRevision){loading=false;$('partner-more').disabled=(customerPage+1)*customerPageSize>=customerItems.length&&nextOffset===null;}}
};
for(const button of document.querySelectorAll('[data-partner-filter]'))button.onclick=()=>{
  if(button.dataset.partnerFilter===customerFilter)return;
  customerFilter=button.dataset.partnerFilter;
  for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b===button));
  clearTimeout(searchTimer);void loadCustomers();
};
$('partner-search').oninput=()=>{clearTimeout(searchTimer);++customerRevision;loading=true;nextOffset=null;$('partner-more').disabled=true;$('partner-prev').disabled=true;searchTimer=setTimeout(()=>void loadCustomers(),250);};
const date=value=>new Date(value).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
const money=cents=>new Intl.NumberFormat('es',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);
const receiptStatus={accrued:'Registrada',held:'En revisión',needs_reconciliation:'Por conciliar',not_eligible:'Fuera del acuerdo'};
function labelCells(id,labels){for(const row of $(id).rows)if(row.cells.length===labels.length)labels.forEach((label,index)=>{row.cells[index].dataset.label=label;});}
function commissionRows(){
  const body=$('partner-commission-rows');body.replaceChildren();const receipts=commissionData?.receipts||[];
  if(!receipts.length){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Tu informe se completará cuando tus referidos realicen pagos verificados.';}
  for(const payment of receipts.slice(0,commissionLimit)){
    const row=body.insertRow(),name=row.insertCell(),label=document.createElement('strong'),reference=document.createElement('small');
    label.textContent=payment.closed?'Cuenta cerrada':payment.email||'Correo pendiente de verificación';reference.textContent=(payment.kind==='subscription'?'Suscripción':'Recarga')+' · '+payment.reference;name.append(label,reference);
    row.insertCell().textContent=date(payment.paidAt||payment.recordedAt);row.insertCell().textContent=money(payment.amountCents);
    const earned=row.insertCell();earned.textContent=payment.status==='needs_reconciliation'?'Por conciliar':money(payment.commissionCents)+' · '+payment.rate+'%';
    if(Number.isSafeInteger(payment.baseCents)){const base=document.createElement('small');base.textContent='Base neta: '+money(payment.baseCents)+' · Stripe: '+money(payment.feeCents)+' · Impuestos: '+money(payment.taxCents);earned.append(base);}
    if(payment.kind==='subscription'&&payment.subscriptionWindowEndsAt){const window=document.createElement('small');window.textContent='Periodo hasta '+date(payment.subscriptionWindowEndsAt);earned.append(window);}
    if(payment.costAdjustmentCents){earned.firstChild.textContent=money(payment.commissionCents);const note=document.createElement('small');note.textContent='Ajuste por costes: '+money(payment.costAdjustmentCents)+' · '+payment.costReason;earned.append(note);}
    if(payment.costReserveCents){const note=document.createElement('small');note.textContent='En conciliación por costes: '+money(payment.costReserveCents);earned.append(note);}
    if(payment.costReviewRequired){const note=document.createElement('small');note.textContent='Revisión del owner: coste posterior a una liquidación cerrada. El abono realizado se conserva.';earned.append(note);}
    const badge=document.createElement('span');badge.className='partner-badge';badge.textContent=receiptStatus[payment.status]||'En revisión';row.insertCell().append(badge);
  }
  labelCells('partner-commission-rows',['Cuenta / pago','Fecha','Importe','Tu comisión','Estado']);$('partner-commission-more').hidden=receipts.length<=commissionLimit;
}
function activity(target,items,kind){
  const list=$(target);list.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='partner-activity-empty';p.textContent=kind==='signup'?'Los registros de tu enlace aparecerán aquí.':'Las compras de tus clientes aparecerán aquí, con el importe y tu comisión.';list.append(p);return;}
  for(const item of items.slice(0,5)){
    const row=document.createElement('div');row.className='partner-activity-row';const identity=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),aside=document.createElement('div'),value=document.createElement('strong'),stamp=document.createElement('small');
    name.textContent=item.closed?'Cuenta cerrada':item.email||'Correo pendiente de verificación';
    detail.textContent=kind==='signup'?(item.subscribed?'Suscripción activa':item.paid?'Cliente de pago':'Registrada'):(item.kind==='subscription'?'Cuota de suscripción':'Compra de créditos');
    value.textContent=kind==='signup'?date(item.registeredAt):money(item.amountCents);stamp.textContent=kind==='signup'?'':date(item.paidAt||item.recordedAt);
    identity.append(name,detail);if(kind==='purchase'){const earned=document.createElement('small');earned.textContent=item.status==='accrued'?'Tu comisión: '+money(item.commissionCents):receiptStatus[item.status]||'En revisión';identity.append(earned);}
    aside.append(value,stamp);row.append(identity,aside);list.append(row);
  }
}
function drawBusiness(data){
  activity('partner-latest-signups',data.customers,'signup');$('partner-start').hidden=Number(data.totals.registered)>0;$('partner-recent-activity').hidden=Number(data.totals.registered)===0&&Number(data.totals.purchases)===0;drawCommissions(data.commissions);
}
function drawCommissions(report){
  commissionData=report||null;
  if(!commissionData){for(const id of ['partner-commission','partner-report-commission','partner-revenue','partner-overview-revenue','partner-commission-held'])$(id).textContent='No disponible';$('partner-commission-status').textContent='No pudimos cargar el informe de comisiones. Actualiza el panel.';$('partner-recent-purchases').textContent='Informe no disponible. Actualiza el panel.';return;}
  const totals=commissionData.totals;
  $('partner-commission').textContent=money(totals.commissionCents);$('partner-report-commission').textContent=money(totals.commissionCents);$('partner-revenue').textContent=money(totals.revenueCents);$('partner-overview-revenue').textContent=money(totals.revenueCents);$('partner-commission-held').textContent=money(totals.heldCommissionCents);
  $('partner-commission-status').textContent=totals.needsReconciliation?totals.needsReconciliation+(['bellini-studio','robin-studio'].includes(workspaceSlug)?' pagos pendientes de conciliación.':' pagos sin fecha verificable pendientes de conciliación.'):'';
  activity('partner-recent-purchases',commissionData.recentPurchases||commissionData.receipts,'purchase');commissionRows();$('partner-export').disabled=!commissionData.receipts.length;
}
$('partner-commission-more').onclick=()=>{commissionLimit+=25;commissionRows();};
$('partner-export').onclick=()=>{
  if(!commissionData?.receipts.length)return;
  const safe=value=>{let text=String(value??'');if(/^[\s=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const rows=[['Fecha','Cuenta','Referencia','Tipo','Importe EUR','Porcentaje','Comisión EUR','Estado','Fin del periodo de suscripción']];
  const net=commissionData.policy?.basis==='verified_net';if(net)rows[0].push('Stripe EUR','Impuestos EUR','Base neta EUR');
  const protectedCosts=!!commissionData.policy?.costProtection;if(protectedCosts)rows[0].push('Comisión inicial EUR','Ajuste costes EUR','Reserva costes EUR','Coste confirmado EUR','Motivo');
  for(const p of commissionData.receipts){const row=[new Date(p.paidAt||p.recordedAt).toISOString(),p.closed?'Cuenta cerrada':p.email||'Correo pendiente',p.reference,p.kind,(p.amountCents/100).toFixed(2),p.rate,(p.commissionCents/100).toFixed(2),receiptStatus[p.status],p.subscriptionWindowEndsAt?new Date(p.subscriptionWindowEndsAt).toISOString():''];if(net)row.push(...[p.feeCents,p.taxCents,p.baseCents].map(n=>Number.isSafeInteger(n)?(n/100).toFixed(2):''));if(protectedCosts)row.push(...[p.nominalCommissionCents??p.commissionCents,p.costAdjustmentCents||0,p.costReserveCents||0,p.generationCostCents].map(n=>Number.isSafeInteger(n)?(n/100).toFixed(2):''),p.costReason||'');rows.push(row);}
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download=studioAlias+'-comisiones-'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function preview(){
  const credits=Number($('partner-voucher-credits').value),days=Number($('partner-voucher-days').value);
  $('partner-preview-credits').textContent=Number.isSafeInteger(credits)&&credits>0?credits.toLocaleString('es'):'0';$('partner-preview-note').textContent=$('partner-voucher-note').value.trim()||'Una invitación de '+studioName+'.';$('partner-preview-expiry').textContent='Un canje · '+days+' días de validez';
  for(const button of document.querySelectorAll('[data-partner-credits]'))button.setAttribute('aria-pressed',String(Number(button.dataset.partnerCredits)===credits));
  $('partner-voucher-create').textContent=createdVoucher?'Enlace creado':'Crear enlace';
  $('partner-voucher-create').disabled=!!createdVoucher||voucherBusy||!voucherData||!Number.isSafeInteger(credits)||credits<1||credits>500||credits>voucherData.budget.available||!Number.isSafeInteger(days)||days<1||days>30;
}
function drawBudget(budget){
  if(voucherData)voucherData.budget=budget;
  for(const key of ['available','reserved','redeemed'])$('partner-budget-'+key).textContent=Number(budget[key]).toLocaleString('es');
  $('partner-budget-total').value=budget.total;$('partner-overview-budget').textContent=budget.total===0?'Presupuesto de invitaciones pendiente de asignación':Number(budget.available).toLocaleString('es')+' créditos disponibles para invitar';$('partner-overview-budget-action').textContent=voucherData?.ownerView&&budget.total===0?'Asignar presupuesto':'Gestionar invitaciones';
  $('partner-budget-empty').hidden=budget.total>0;
  preview();
}
function safeInvitation(value){
  const url=new URL(value);
  if(!['https://pvlab.studio','https://www.pvlab.studio','https://parallelvisionlabel.com'].includes(url.origin)||url.username||url.password)throw Error('El enlace no está disponible.');
  return url.href;
}
async function copy(value){
  const current=revision;
  try{await navigator.clipboard.writeText(value);if(current===revision)$('partner-copy-status').textContent='Copiado. Listo para compartir.';}
  catch{if(current===revision){$('partner-voucher-url').focus({preventScroll:true});$('partner-voucher-url').select();$('partner-copy-status').textContent='Selecciona y copia tu enlace.';}}
}
function showInvitation(voucher){
  createdVoucher={...voucher,url:safeInvitation(voucher.url)};
  $('partner-voucher-url').value=createdVoucher.url;$('partner-voucher-code').textContent=voucher.code;
  $('partner-voucher-detail').textContent=voucher.credits+' créditos · válida hasta '+date(voucher.expiresAt);
  $('partner-voucher-result').hidden=false;$('partner-voucher-form').hidden=false;$('partner-gift-preview').hidden=true;$('partner-create-layout').classList.remove('is-ready');$('partner-copy-status').textContent='';if(!$('partner-invitations').hidden){$('partner-voucher-copy').focus({preventScroll:true});}
}
function drawVouchers(data){
  voucherPage=Math.max(0,Math.min(voucherPage,Math.max(0,Math.ceil(data.vouchers.length/20)-1)));redemptionPage=Math.max(0,Math.min(redemptionPage,Math.max(0,Math.ceil(data.redemptions.length/20)-1)));updatePager('partner-voucher',voucherPage,data.vouchers.length);updatePager('partner-redemption',redemptionPage,data.redemptions.length);
  const body=$('partner-voucher-rows');body.replaceChildren();
  if(!data.vouchers.length){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Tu primera invitación empieza aquí.';}
  for(const voucher of data.vouchers.slice(voucherPage*20,(voucherPage+1)*20)){
    const row=body.insertRow(),name=row.insertCell(),label=document.createElement('strong'),code=document.createElement('small');
    label.textContent=voucher.note;code.textContent=voucher.code;name.append(label,code);
    row.insertCell().textContent=Number(voucher.credits).toLocaleString('es');row.insertCell().textContent=date(voucher.expiresAt);
    const used=voucher.redemptionCount>=voucher.maxRedemptions,expired=voucher.expiresAt<=Date.now();
    const state=row.insertCell(),badge=document.createElement('span');badge.className='partner-badge';badge.dataset.active=String(!!voucher.active&&!expired&&!used);
    badge.textContent=used?'Canjeada':!voucher.active?'Desactivada':expired?'Caducada':'Disponible';state.append(badge);
    const actions=row.insertCell();
    if(voucher.active&&!expired&&!used){
      const link=document.createElement('button');link.type='button';link.className='account-text-button';link.textContent='Compartir';
      link.onclick=()=>{showInvitation(voucher);activateView('invitations',{resetPosition:true});$('partner-voucher-copy').focus({preventScroll:true});};
      const deactivate=document.createElement('button');deactivate.type='button';deactivate.className='account-text-button';deactivate.textContent='Desactivar';
      deactivate.onclick=()=>void mutate('/vouchers/deactivate',{code:voucher.code});actions.append(link,deactivate);
    }else actions.textContent='';
  }
  const claims=$('partner-redemption-rows');claims.replaceChildren();$('partner-redemption-count').textContent=String(data.redemptions.length);
  if(!data.redemptions.length){const row=claims.insertRow(),cell=row.insertCell();cell.colSpan=4;cell.textContent='Los canjes aparecerán aquí cuando tus contactos activen su regalo.';}
  for(const claim of data.redemptions.slice(redemptionPage*20,(redemptionPage+1)*20)){const row=claims.insertRow();for(const value of [claim.closed?'Cuenta cerrada':claim.email||'Correo pendiente de verificación',claim.note,claim.credits,date(claim.redeemedAt)])row.insertCell().textContent=String(value);}
  labelCells('partner-voucher-rows',['Invitación','Créditos','Caducidad','Estado','Acciones']);labelCells('partner-redemption-rows',['Cuenta','Invitación','Créditos','Canje']);
}
async function loadVouchers(current){
  voucherStatus('Cargando invitaciones…');
  try{
    const data=await api(dashboardPath+'/vouchers');if(current!==revision)return;
    voucherData=data;drawBudget(data.budget);drawVouchers(data);
    $('partner-budget-manage').hidden=data.ownerView!==true;$('partner-invite-balance').hidden=false;if(data.ownerView!==true){$('partner-budget-form').hidden=true;$('partner-budget-toggle').setAttribute('aria-expanded','false');}$('partner-voucher-workspace').hidden=false;voucherStatus('');return true;
  }catch(error){if(current===revision){voucherStatus(error.message);$('partner-overview-budget').textContent='No pudimos cargar los créditos para invitar. Actualiza el panel.';}}
}
async function mutate(action,body){
  if(voucherBusy||!voucherData)return;
  const current=revision;voucherBusy=true;preview();voucherStatus('Guardando…');
  try{
    const result=await api(dashboardPath+action,body);if(current!==revision)return;
    if(result.voucher){voucherPage=0;showInvitation(result.voucher);requestId=crypto.randomUUID();}
    if(result.deactivated&&createdVoucher?.code===body.code){createdVoucher=null;$('partner-voucher-result').hidden=true;$('partner-voucher-form').hidden=false;$('partner-gift-preview').hidden=false;$('partner-create-layout').classList.remove('is-ready');$('partner-voucher-url').value='';}
    const loaded=await loadVouchers(current);
    if(current===revision&&loaded)voucherStatus(result.voucher?'Invitación creada. Lista para compartir.':result.deactivated?'Invitación desactivada. Sus créditos están disponibles.':'Presupuesto guardado.');
  }catch(error){if(current===revision)voucherStatus(error.message);}
  finally{if(current===revision){voucherBusy=false;preview();}}
}
$('partner-voucher-form').onsubmit=event=>{event.preventDefault();void mutate('/vouchers',{note:$('partner-voucher-note').value.trim()||'Invitación '+studioName,credits:Number($('partner-voucher-credits').value),days:Number($('partner-voucher-days').value),requestId});};
$('partner-voucher-form').oninput=()=>{requestId=crypto.randomUUID();preview();};
for(const button of document.querySelectorAll('[data-partner-credits]'))button.onclick=()=>{$('partner-voucher-credits').value=button.dataset.partnerCredits;requestId=crypto.randomUUID();preview();};
$('partner-another-invite').onclick=()=>{$('partner-gift-preview').hidden=false;$('partner-create-layout').classList.remove('is-ready');createdVoucher=null;$('partner-voucher-result').hidden=true;$('partner-voucher-form').hidden=false;$('partner-voucher-note').value='';$('partner-voucher-url').value='';requestId=crypto.randomUUID();voucherStatus('');preview();$('partner-voucher-note').focus({preventScroll:true});};
for(const [prefix,kind] of [['partner-voucher','voucher'],['partner-redemption','redemption']])for(const [direction,step] of [['prev',-1],['next',1]])$(prefix+'-'+direction).onclick=()=>{if(!voucherData)return;if(kind==='voucher')voucherPage+=step;else redemptionPage+=step;drawVouchers(voucherData);};
$('partner-budget-toggle').onclick=()=>{if(voucherData?.ownerView!==true)return;const open=$('partner-budget-form').hidden;$('partner-budget-form').hidden=!open;$('partner-budget-toggle').setAttribute('aria-expanded',String(open));};
$('partner-budget-form').onsubmit=event=>{event.preventDefault();void mutate('/budget',{total:Number($('partner-budget-total').value)});};
$('partner-voucher-copy').onclick=()=>createdVoucher&&void copy(createdVoucher.url);
$('partner-message-copy').onclick=()=>createdVoucher&&void copy('Hola, te invito a probar PV LAB con '+createdVoucher.credits+' créditos de parte de '+studioName+'. Puedes explorar imágenes para tu marca o tus productos. Entra, inicia sesión y canjea tu código antes del '+date(createdVoucher.expiresAt)+': '+createdVoucher.url);
window.addEventListener('pagehide',()=>{++revision;clear();});
window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
// Clerk also emits during token renewal. Reload only when account identity changes.
function accountIdentity(){return JSON.stringify([!!clerk?.isSignedIn,clerk?.user?.id||null,clerk?.session?.id||null,clerk?.user?.primaryEmailAddressId||null,(clerk?.user?.emailAddresses||[]).map(email=>[email.id,email.emailAddress,email.verification?.status])]);}
try{clerk=await loadLabAccount();let identity=accountIdentity();clerk.addListener(()=>{const next=accountIdentity();if(next===identity)return;identity=next;void refresh();});await refresh();}
catch{status('No pudimos cargar el inicio de sesión. Recarga la página.');}
