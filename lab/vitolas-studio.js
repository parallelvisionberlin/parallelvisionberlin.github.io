import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createAccountMenu} from './account-menu.js?v=20261024-vitolas1';
const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
let clerk=null,revision=0,nextOffset=null,loading=false;
let dashboardPath='/api/customer/partner';
let voucherBusy=false,voucherData=null,createdVoucher=null,requestId=crypto.randomUUID();
let commissionData=null,commissionLimit=25;
let customerFilter='all',customerRevision=0;
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
const status=message=>{$('partner-status').textContent=message;};
async function api(path,body){
  const response=await request(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?'Esta cuenta no tiene acceso a Vitolas Studio.':data.error||'No pudimos cargar el panel. Inténtalo de nuevo.');
  return data;
}
function clear(){
  menu.update();nextOffset=null;loading=false;
  customerFilter='all';customerRevision++;for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b.dataset.partnerFilter==='all'));
  voucherBusy=false;voucherData=null;createdVoucher=null;requestId=crypto.randomUUID();
  commissionData=null;commissionLimit=25;$('partner-export').disabled=true;$('partner-commission-more').hidden=true;
  for(const id of ['partner-latest-signups','partner-recent-purchases','partner-commission-rows'])$(id).replaceChildren();
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
  if(!items.length&&!append){const row=document.createElement('tr'),cell=document.createElement('td');cell.colSpan=4;cell.textContent='Todavía no hay registros a través de tu enlace.';row.append(cell);body.append(row);return;}
  for(const person of items){
    const row=document.createElement('tr');
    const values=[person.closed?'Cuenta cerrada':person.email||'Correo pendiente de verificación',
      new Date(person.registeredAt).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'}),
      person.closed?'Cerrada':person.subscribed?'Suscripción activa':person.paid?'Cliente de pago':'Registrada',person.purchases];
    for(const value of values){const cell=document.createElement('td');cell.textContent=String(value);row.append(cell);}
    body.append(row);
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
    rows(data.customers);drawBusiness(data);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;
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
$('partner-more').onclick=async()=>{
  if(loading||nextOffset===null)return;
  const current=revision;loading=true;$('partner-more').disabled=true;
  try{const data=await api(dashboardPath+'?offset='+nextOffset+'&filter='+customerFilter);if(current!==revision)return;rows(data.customers,true);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;status('');}
  catch(error){if(current===revision)status(error.message);}
  finally{if(current===revision){loading=false;$('partner-more').disabled=false;}}
};
for(const button of document.querySelectorAll('[data-partner-filter]'))button.onclick=async()=>{
  if(loading||button.dataset.partnerFilter===customerFilter)return;
  const current=revision,local=++customerRevision;loading=true;$('partner-more').disabled=true;
  try{const data=await api(dashboardPath+'?filter='+button.dataset.partnerFilter);if(current!==revision||local!==customerRevision)return;
    customerFilter=button.dataset.partnerFilter;rows(data.customers);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;
    for(const b of document.querySelectorAll('[data-partner-filter]'))b.setAttribute('aria-pressed',String(b===button));
  }catch(error){if(current===revision)status(error.message);}
  finally{if(current===revision&&local===customerRevision){loading=false;$('partner-more').disabled=false;}}
};
const date=value=>new Date(value).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
const money=cents=>new Intl.NumberFormat('es',{style:'currency',currency:'EUR'}).format(Number(cents||0)/100);
const receiptStatus={accrued:'Registrada',held:'En revisión',needs_reconciliation:'Por conciliar',not_eligible:'Fuera del acuerdo'};
function activity(target,items,kind){
  const list=$(target);list.replaceChildren();
  if(!items.length){const p=document.createElement('p');p.className='partner-activity-empty';p.textContent=kind==='signup'?'Los nuevos registros de tu enlace aparecerán aquí.':'Las compras verificadas de tus referidos aparecerán aquí.';list.append(p);return;}
  for(const item of items){
    const row=document.createElement('div');row.className='partner-activity-row';const identity=document.createElement('div'),name=document.createElement('strong'),detail=document.createElement('small'),aside=document.createElement('div'),value=document.createElement('strong'),stamp=document.createElement('small');
    name.textContent=item.closed?'Cuenta cerrada':item.email||'Correo pendiente de verificación';
    detail.textContent=kind==='signup'?(item.subscribed?'Suscripción activa':item.paid?'Cliente de pago':'Registrada'):(item.kind==='subscription'?'Cuota de suscripción':'Compra de créditos');
    value.textContent=kind==='signup'?'Registro':money(item.amountCents);stamp.textContent=date(item.registeredAt||item.paidAt||item.recordedAt);
    identity.append(name,detail);aside.append(value,stamp);row.append(identity,aside);list.append(row);
  }
}
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
  activity('partner-latest-signups',data.customers.slice(0,5),'signup');commissionData=data.commissions||null;
  if(!commissionData){for(const id of ['partner-commission','partner-revenue','partner-commission-held'])$(id).textContent='No disponible';$('partner-commission-status').textContent='No pudimos cargar el informe de comisiones. Actualiza el panel.';return;}
  const totals=commissionData.totals;
  $('partner-commission').textContent=money(totals.commissionCents);$('partner-revenue').textContent=money(totals.revenueCents);$('partner-commission-held').textContent=money(totals.heldCommissionCents);
  $('partner-commission-status').textContent=totals.needsReconciliation?totals.needsReconciliation+' pagos sin fecha verificable pendientes de conciliación.':'';
  activity('partner-recent-purchases',commissionData.recentPurchases.slice(0,5),'purchase');commissionRows();$('partner-export').disabled=!commissionData.receipts.length;
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
  const credits=Number($('partner-voucher-credits').value),days=Number($('partner-voucher-days').value);
  $('partner-preview-credits').textContent=Number.isSafeInteger(credits)&&credits>0?credits.toLocaleString('es'):'0';
  $('partner-preview-note').textContent=$('partner-voucher-note').value.trim()||'Una invitación a crear.';
  $('partner-preview-expiry').textContent='UNA PERSONA\n'+days+' DÍAS PARA EMPEZAR';
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
  $('partner-voucher-result').hidden=false;$('partner-copy-status').textContent='';
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
      link.onclick=()=>{showInvitation(voucher);$('partner-voucher-result').scrollIntoView({behavior:'smooth',block:'center'});};
      const deactivate=document.createElement('button');deactivate.type='button';deactivate.className='account-text-button';deactivate.textContent='Desactivar';
      deactivate.onclick=()=>void mutate('/vouchers/deactivate',{code:voucher.code});actions.append(link,deactivate);
    }else actions.textContent='—';
  }
  const claims=$('partner-redemption-rows');claims.replaceChildren();$('partner-redemption-count').textContent=String(data.redemptions.length);
  if(!data.redemptions.length){const row=claims.insertRow(),cell=row.insertCell();cell.colSpan=4;cell.textContent='Los canjes aparecerán aquí cuando tus contactos activen su regalo.';}
  for(const claim of data.redemptions){const row=claims.insertRow();for(const value of [claim.closed?'Cuenta cerrada':claim.email||'Correo pendiente de verificación',claim.note,claim.credits,date(claim.redeemedAt)])row.insertCell().textContent=String(value);}
}
async function loadVouchers(current){
  $('partner-voucher-status').textContent='Cargando invitaciones…';
  try{
    const data=await api(dashboardPath+'/vouchers');if(current!==revision)return;
    voucherData=data;drawBudget(data.budget);drawVouchers(data);
    $('partner-budget-form').hidden=data.ownerView!==true;$('partner-voucher-workspace').hidden=false;$('partner-voucher-status').textContent='';return true;
  }catch(error){if(current===revision)$('partner-voucher-status').textContent=error.message;}
}
async function mutate(action,body){
  if(voucherBusy||!voucherData)return;
  const current=revision;voucherBusy=true;preview();$('partner-voucher-status').textContent='Guardando…';
  try{
    const result=await api(dashboardPath+action,body);if(current!==revision)return;
    if(result.voucher){showInvitation(result.voucher);requestId=crypto.randomUUID();}
    if(result.deactivated&&createdVoucher?.code===body.code){createdVoucher=null;$('partner-voucher-result').hidden=true;$('partner-voucher-url').value='';}
    const loaded=await loadVouchers(current);
    if(current===revision&&loaded)$('partner-voucher-status').textContent=result.voucher?'Invitación creada. Sus créditos están reservados hasta el canje o la caducidad.':result.deactivated?'Invitación desactivada. Su reserva ha quedado disponible.':'Presupuesto guardado.';
  }catch(error){if(current===revision)$('partner-voucher-status').textContent=error.message;}
  finally{if(current===revision){voucherBusy=false;preview();}}
}
$('partner-voucher-form').onsubmit=event=>{event.preventDefault();void mutate('/vouchers',{note:$('partner-voucher-note').value.trim(),credits:Number($('partner-voucher-credits').value),days:Number($('partner-voucher-days').value),requestId});};
$('partner-voucher-form').oninput=()=>{requestId=crypto.randomUUID();preview();};
for(const button of document.querySelectorAll('[data-partner-credits]'))button.onclick=()=>{$('partner-voucher-credits').value=button.dataset.partnerCredits;requestId=crypto.randomUUID();preview();};
$('partner-budget-form').onsubmit=event=>{event.preventDefault();void mutate('/budget',{total:Number($('partner-budget-total').value)});};
$('partner-voucher-copy').onclick=()=>createdVoucher&&void copy(createdVoucher.url);
$('partner-message-copy').onclick=()=>createdVoucher&&void copy('Hola, te invito a probar PV LAB con '+createdVoucher.credits+' créditos de parte de Vitolas Studio. Puedes explorar imágenes para tu marca o tus productos. Entra, inicia sesión y canjea tu código antes del '+date(createdVoucher.expiresAt)+': '+createdVoucher.url);
window.addEventListener('pagehide',()=>{++revision;clear();});
window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
try{clerk=await loadLabAccount();clerk.addListener(()=>void refresh());await refresh();}
catch{status('No pudimos cargar el inicio de sesión. Recarga la página.');}
