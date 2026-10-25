import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createAccountMenu} from './account-menu.js?v=20261024-vitolas1';
const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
let clerk=null,revision=0,nextOffset=null,loading=false;
let dashboardPath='/api/customer/partner';
let voucherBusy=false,voucherData=null,createdVoucher=null,requestId=crypto.randomUUID();
let commissionData=null,commissionLimit=25;
let customerFilter='all',customerRevision=0,searchTimer=null;
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
const status=message=>{$('partner-status').textContent=message;};
async function api(path,body){
  const response=await request(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?'Esta cuenta no tiene acceso a Vitolas Studio.':data.error||'No pudimos cargar el panel. Inténtalo de nuevo.');
  return data;
}
function openDialog(id){
  const dialog=$(id);if(!dialog||!clerk?.isSignedIn||$('partner-content').hidden)return;
  for(const other of document.querySelectorAll('.partner-dialog[open]'))if(other!==dialog)other.close();
  if(!dialog.open)dialog.showModal();
}
for(const button of document.querySelectorAll('[data-partner-dialog]'))button.onclick=()=>openDialog(button.dataset.partnerDialog);
for(const dialog of document.querySelectorAll('.partner-dialog')){
  dialog.querySelector('[data-partner-close]').onclick=()=>dialog.close();
  dialog.addEventListener('click',event=>{if(event.target!==dialog)return;const box=dialog.getBoundingClientRect();if(event.clientX<box.left||event.clientX>box.right||event.clientY<box.top||event.clientY>box.bottom)dialog.close();});
}
const voucherStatus=message=>{for(const id of ['partner-voucher-status','partner-history-status'])$(id).textContent=message;};
function clear(){
  for(const dialog of document.querySelectorAll('.partner-dialog[open]'))dialog.close();
  clearTimeout(searchTimer);$('partner-search').value='';$('partner-customer-status').textContent='';
  $('partner-voucher-form').hidden=false;voucherStatus('');
  menu.update();nextOffset=null;loading=false;
  customerFilter='all';customerRevision++;for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b.dataset.partnerFilter==='all'));
  voucherBusy=false;voucherData=null;createdVoucher=null;requestId=crypto.randomUUID();
  commissionData=null;commissionLimit=25;$('partner-export').disabled=true;$('partner-commission-more').hidden=true;
  $('partner-commission-rows').replaceChildren();
  for(const id of ['partner-commission','partner-revenue','partner-commission-held'])$(id).textContent='0,00 €';
  $('partner-commission-status').textContent='';
  $('partner-voucher-workspace').hidden=true;$('partner-budget-form').hidden=true;$('partner-voucher-result').hidden=true;
  $('partner-voucher-url').value='';$('partner-voucher-code').textContent='';$('partner-voucher-detail').textContent='';$('partner-copy-status').textContent='';
  $('partner-voucher-note').value='';$('partner-voucher-credits').value='100';$('partner-voucher-days').value='14';$('partner-budget-total').value='';$('partner-voucher-status').textContent='';
  $('partner-voucher-rows').replaceChildren();$('partner-redemption-rows').replaceChildren();$('partner-redemption-count').textContent='0';
  for(const key of ['available','reserved','redeemed'])$('partner-budget-'+key).textContent='0';
  $('partner-voucher-create').disabled=true;
  preview();
  $('partner-content').hidden=true;$('partner-more').hidden=true;$('partner-more').disabled=false;
  $('partner-url').value='';$('partner-rows').replaceChildren();
  for(const id of ['registered','paying','subscribed','purchases'])$('partner-'+id).textContent='0';
}
function rows(items,append=false){
  const body=$('partner-rows');if(!append)body.replaceChildren();
  if(!items.length&&!append){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=4;
    const title=document.createElement('span');title.className='partner-empty';
    title.textContent=customerFilter==='all'&&!$('partner-search').value.trim()?'Tu próximo cliente empieza con una invitación.':'No hay clientes con este filtro.';
    cell.append(title,document.createTextNode(customerFilter==='all'&&!$('partner-search').value.trim()?'Comparte tu enlace o invita con créditos. Sus registros y pagos aparecerán aquí.':'Prueba otro filtro o busca otro correo.'));return;}
  for(const person of items){
    const row=body.insertRow(),name=row.insertCell(),button=document.createElement('button');button.type='button';button.className='partner-client-name';
    button.textContent=person.closed?'Cuenta cerrada':person.email||'Correo pendiente de verificación';button.setAttribute('aria-expanded','false');name.append(button);
    row.insertCell().textContent=date(person.registeredAt);
    const badge=document.createElement('span');badge.className='partner-badge';badge.dataset.active=String(!!person.subscribed);
    badge.textContent=person.closed?'Cerrada':person.subscribed?'Suscripción':person.paid?'De pago':'Registrada';row.insertCell().append(badge);
    const earned=row.insertCell();earned.textContent=Number.isSafeInteger(person.commissionCents)?money(person.commissionCents):'No disponible';
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
  }
}
async function refresh(){
  const current=++revision;clear();$('partner-copy').textContent='Copiar';
  $('partner-signin').hidden=!!clerk?.isSignedIn;$('partner-signin').disabled=!clerk;
  if(!clerk?.isSignedIn){status('Inicia sesión con tu cuenta autorizada para abrir Vitolas Studio.');return;}
  status('Cargando tu panel…');
  try{
    const profile=await api('/api/session');if(current!==revision)return;
    menu.update({signed:true,user:clerk.user,profile});
    dashboardPath=profile.owner===true?'/api/admin/partners/vitolas-studio':'/api/customer/partner';
    const data=await api(dashboardPath);if(current!==revision)return;
    if(data.awaitingPartner){status('Tu acceso de owner está activo. Victoria debe iniciar sesión una vez para activar su enlace y sus datos.');return;}
    menu.update({signed:true,user:clerk.user,profile:{...profile,partnerDashboard:data.workspace}});
    const link=new URL(data.shareUrl||data.referralUrl);
    if(!['https://pvlab.studio','https://www.pvlab.studio','https://parallelvisionlabel.com'].includes(link.origin))throw Error('El enlace no está disponible.');
    $('partner-url').value=link.href;
    for(const [id,key] of [['registered','registered'],['paying','payingCustomers'],['subscribed','activeSubscriptions'],['purchases','purchases']])$('partner-'+id).textContent=Number(data.totals[key]||0).toLocaleString('es');
    drawBusiness(data);rows(data.customers);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;
    $('partner-content').hidden=false;status('');await loadVouchers(current);
  }catch(error){if(current===revision)status(error.message);}
}
$('partner-signin').onclick=()=>clerk?.openSignIn();
$('partner-signout').onclick=async()=>{++revision;clear();status('Cerrando sesión…');try{await clerk?.signOut();await refresh();}catch{status('No se pudo cerrar sesión. Inténtalo de nuevo.');}};
$('partner-refresh').onclick=()=>void refresh();
$('partner-copy').onclick=async()=>{
  const current=revision,value=$('partner-url').value;if(!value)return;
  try{await navigator.clipboard.writeText(value);if(current===revision)$('partner-copy').textContent='Copiado';}
  catch{if(current===revision){$('partner-url').focus();$('partner-url').select();status('Selecciona y copia tu enlace.');}}
};
function customerQuery(offset=0){const params=new URLSearchParams({filter:customerFilter,offset:String(offset)});const q=$('partner-search').value.trim();if(q)params.set('q',q);return dashboardPath+'?'+params;}
async function loadCustomers(){
  const current=revision,local=++customerRevision;loading=true;nextOffset=null;$('partner-more').hidden=true;$('partner-customer-status').textContent='Buscando…';$('partner-rows').replaceChildren();
  try{const data=await api(customerQuery());if(current!==revision||local!==customerRevision)return;
    rows(data.customers);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;$('partner-customer-status').textContent='';
  }catch(error){if(current===revision&&local===customerRevision)$('partner-customer-status').textContent=error.message;}
  finally{if(current===revision&&local===customerRevision){loading=false;$('partner-more').disabled=false;}}
}
$('partner-more').onclick=async()=>{
  if(loading||nextOffset===null)return;
  const current=revision,local=customerRevision;loading=true;$('partner-more').disabled=true;
  try{const data=await api(customerQuery(nextOffset));if(current!==revision||local!==customerRevision)return;rows(data.customers,true);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;$('partner-customer-status').textContent='';}
  catch(error){if(current===revision&&local===customerRevision)$('partner-customer-status').textContent=error.message;}
  finally{if(current===revision&&local===customerRevision){loading=false;$('partner-more').disabled=false;}}
};
for(const button of document.querySelectorAll('[data-partner-filter]'))button.onclick=()=>{
  if(button.dataset.partnerFilter===customerFilter)return;
  customerFilter=button.dataset.partnerFilter;
  for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b===button));
  clearTimeout(searchTimer);void loadCustomers();
};
$('partner-search').oninput=()=>{clearTimeout(searchTimer);++customerRevision;nextOffset=null;$('partner-more').hidden=true;searchTimer=setTimeout(()=>void loadCustomers(),250);};
const date=value=>new Date(value).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
const money=cents=>new Intl.NumberFormat('es',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);
const receiptStatus={accrued:'Registrada',held:'En revisión',needs_reconciliation:'Por conciliar',not_eligible:'Fuera del acuerdo'};
function commissionRows(){
  const body=$('partner-commission-rows');body.replaceChildren();const receipts=commissionData?.receipts||[];
  if(!receipts.length){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Tu informe se completará cuando tus referidos realicen pagos verificados.';}
  for(const payment of receipts.slice(0,commissionLimit)){
    const row=body.insertRow(),name=row.insertCell(),label=document.createElement('strong'),reference=document.createElement('small');
    label.textContent=payment.closed?'Cuenta cerrada':payment.email||'Correo pendiente de verificación';reference.textContent=(payment.kind==='subscription'?'Suscripción':'Recarga')+' · '+payment.reference;name.append(label,reference);
    row.insertCell().textContent=date(payment.paidAt||payment.recordedAt);row.insertCell().textContent=money(payment.amountCents);
    const earned=row.insertCell();earned.textContent=payment.status==='needs_reconciliation'?'Por conciliar':money(payment.commissionCents)+' · '+payment.rate+'%';
    if(payment.kind==='subscription'&&payment.subscriptionWindowEndsAt){const window=document.createElement('small');window.textContent='Periodo hasta '+date(payment.subscriptionWindowEndsAt);earned.append(window);}
    const badge=document.createElement('span');badge.className='partner-badge';badge.textContent=receiptStatus[payment.status]||'En revisión';row.insertCell().append(badge);
  }
  $('partner-commission-more').hidden=receipts.length<=commissionLimit;
}
function drawBusiness(data){
  commissionData=data.commissions||null;
  if(!commissionData){for(const id of ['partner-commission','partner-revenue','partner-commission-held'])$(id).textContent='No disponible';$('partner-commission-status').textContent='No pudimos cargar el informe de comisiones. Actualiza el panel.';return;}
  const totals=commissionData.totals;
  $('partner-commission').textContent=money(totals.commissionCents);$('partner-revenue').textContent=money(totals.revenueCents);$('partner-commission-held').textContent=money(totals.heldCommissionCents);
  $('partner-commission-status').textContent=totals.needsReconciliation?totals.needsReconciliation+' pagos sin fecha verificable pendientes de conciliación.':'';
  commissionRows();$('partner-export').disabled=!commissionData.receipts.length;
}
$('partner-commission-more').onclick=()=>{commissionLimit+=25;commissionRows();};
$('partner-export').onclick=()=>{
  if(!commissionData?.receipts.length)return;
  const safe=value=>{let text=String(value??'');if(/^[\s=+@-]/.test(text))text="'"+text;return '"'+text.replaceAll('"','""')+'"';};
  const rows=[['Fecha','Cuenta','Referencia','Tipo','Importe EUR','Porcentaje','Comisión EUR','Estado','Fin del periodo de suscripción']];
  for(const p of commissionData.receipts)rows.push([new Date(p.paidAt||p.recordedAt).toISOString(),p.closed?'Cuenta cerrada':p.email||'Correo pendiente',p.reference,p.kind,(p.amountCents/100).toFixed(2),p.rate,(p.commissionCents/100).toFixed(2),receiptStatus[p.status],p.subscriptionWindowEndsAt?new Date(p.subscriptionWindowEndsAt).toISOString():'']);
  const url=URL.createObjectURL(new Blob(['\uFEFF'+rows.map(row=>row.map(safe).join(',')).join('\r\n')],{type:'text/csv;charset=utf-8'}));
  const link=document.createElement('a');link.href=url;link.download='vitolas-comisiones-'+new Date().toISOString().slice(0,10)+'.csv';link.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
};
function preview(){
  const credits=Number($('partner-voucher-credits').value);
  for(const button of document.querySelectorAll('[data-partner-credits]'))button.setAttribute('aria-pressed',String(Number(button.dataset.partnerCredits)===credits));
  $('partner-voucher-create').disabled=voucherBusy||!voucherData||!Number.isSafeInteger(credits)||credits<1||credits>500||credits>voucherData.budget.available;
}
function drawBudget(budget){
  if(voucherData)voucherData.budget=budget;
  for(const key of ['available','reserved','redeemed'])$('partner-budget-'+key).textContent=Number(budget[key]).toLocaleString('es');
  $('partner-budget-total').value=budget.total;
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
  catch{if(current===revision){$('partner-voucher-url').focus();$('partner-voucher-url').select();$('partner-copy-status').textContent='Selecciona y copia tu enlace.';}}
}
function showInvitation(voucher){
  createdVoucher={...voucher,url:safeInvitation(voucher.url)};
  $('partner-voucher-url').value=createdVoucher.url;$('partner-voucher-code').textContent=voucher.code;
  $('partner-voucher-detail').textContent=voucher.credits+' créditos · válida hasta '+date(voucher.expiresAt);
  $('partner-voucher-result').hidden=false;$('partner-voucher-form').hidden=true;$('partner-copy-status').textContent='';
}
function drawVouchers(data){
  const body=$('partner-voucher-rows');body.replaceChildren();
  if(!data.vouchers.length){const row=body.insertRow(),cell=row.insertCell();cell.colSpan=5;cell.textContent='Tu primera invitación empieza aquí.';}
  for(const voucher of data.vouchers){
    const row=body.insertRow(),name=row.insertCell(),label=document.createElement('strong'),code=document.createElement('small');
    label.textContent=voucher.note;code.textContent=voucher.code;name.append(label,code);
    row.insertCell().textContent=Number(voucher.credits).toLocaleString('es');row.insertCell().textContent=date(voucher.expiresAt);
    const used=voucher.redemptionCount>=voucher.maxRedemptions,expired=voucher.expiresAt<=Date.now();
    const state=row.insertCell(),badge=document.createElement('span');badge.className='partner-badge';badge.dataset.active=String(!!voucher.active&&!expired&&!used);
    badge.textContent=used?'Canjeada':!voucher.active?'Desactivada':expired?'Caducada':'Disponible';state.append(badge);
    const actions=row.insertCell();
    if(voucher.active&&!expired&&!used){
      const link=document.createElement('button');link.type='button';link.className='account-text-button';link.textContent='Compartir ↗';
      link.onclick=()=>{showInvitation(voucher);openDialog('partner-invitations');};
      const deactivate=document.createElement('button');deactivate.type='button';deactivate.className='account-text-button';deactivate.textContent='Desactivar';
      deactivate.onclick=()=>void mutate('/vouchers/deactivate',{code:voucher.code});actions.append(link,deactivate);
    }else actions.textContent='';
  }
  const claims=$('partner-redemption-rows');claims.replaceChildren();$('partner-redemption-count').textContent=String(data.redemptions.length);
  if(!data.redemptions.length){const row=claims.insertRow(),cell=row.insertCell();cell.colSpan=4;cell.textContent='Los canjes aparecerán aquí cuando tus contactos activen su regalo.';}
  for(const claim of data.redemptions){const row=claims.insertRow();for(const value of [claim.closed?'Cuenta cerrada':claim.email||'Correo pendiente de verificación',claim.note,claim.credits,date(claim.redeemedAt)])row.insertCell().textContent=String(value);}
}
async function loadVouchers(current){
  voucherStatus('Cargando invitaciones…');
  try{
    const data=await api(dashboardPath+'/vouchers');if(current!==revision)return;
    voucherData=data;drawBudget(data.budget);drawVouchers(data);
    $('partner-budget-form').hidden=data.ownerView!==true;$('partner-voucher-workspace').hidden=false;voucherStatus('');return true;
  }catch(error){if(current===revision)voucherStatus(error.message);}
}
async function mutate(action,body){
  if(voucherBusy||!voucherData)return;
  const current=revision;voucherBusy=true;preview();voucherStatus('Guardando…');
  try{
    const result=await api(dashboardPath+action,body);if(current!==revision)return;
    if(result.voucher){showInvitation(result.voucher);requestId=crypto.randomUUID();}
    if(result.deactivated&&createdVoucher?.code===body.code){createdVoucher=null;$('partner-voucher-result').hidden=true;$('partner-voucher-form').hidden=false;$('partner-voucher-url').value='';}
    const loaded=await loadVouchers(current);
    if(current===revision&&loaded)voucherStatus(result.voucher?'Invitación creada. Lista para compartir.':result.deactivated?'Invitación desactivada. Sus créditos están disponibles.':'Presupuesto guardado.');
  }catch(error){if(current===revision)voucherStatus(error.message);}
  finally{if(current===revision){voucherBusy=false;preview();}}
}
$('partner-voucher-form').onsubmit=event=>{event.preventDefault();void mutate('/vouchers',{note:$('partner-voucher-note').value.trim()||'Invitación Vitolas',credits:Number($('partner-voucher-credits').value),days:Number($('partner-voucher-days').value),requestId});};
$('partner-voucher-form').oninput=()=>{requestId=crypto.randomUUID();preview();};
for(const button of document.querySelectorAll('[data-partner-credits]'))button.onclick=()=>{$('partner-voucher-credits').value=button.dataset.partnerCredits;requestId=crypto.randomUUID();preview();};
$('partner-another-invite').onclick=()=>{createdVoucher=null;$('partner-voucher-result').hidden=true;$('partner-voucher-form').hidden=false;$('partner-voucher-note').value='';$('partner-voucher-url').value='';requestId=crypto.randomUUID();voucherStatus('');$('partner-voucher-note').focus();};
$('partner-budget-form').onsubmit=event=>{event.preventDefault();void mutate('/budget',{total:Number($('partner-budget-total').value)});};
$('partner-voucher-copy').onclick=()=>createdVoucher&&void copy(createdVoucher.url);
$('partner-message-copy').onclick=()=>createdVoucher&&void copy('Hola, te invito a probar PV LAB con '+createdVoucher.credits+' créditos de parte de Vitolas Studio. Puedes explorar imágenes para tu marca o tus productos. Entra, inicia sesión y canjea tu código antes del '+date(createdVoucher.expiresAt)+': '+createdVoucher.url);
window.addEventListener('pagehide',()=>{++revision;clear();});
window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
try{clerk=await loadLabAccount();clerk.addListener(()=>void refresh());await refresh();}
catch{status('No pudimos cargar el inicio de sesión. Recarga la página.');}
