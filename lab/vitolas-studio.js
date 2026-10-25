import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createAccountMenu} from './account-menu.js?v=20261024-vitolas1';
const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
let clerk=null,revision=0,nextOffset=null,loading=false;
let dashboardPath='/api/customer/partner';
let voucherBusy=false,voucherData=null,createdVoucher=null,requestId=crypto.randomUUID();
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
const status=message=>{$('partner-status').textContent=message;};
async function api(path,body){
  const response=await request(path,body===undefined?{}:{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(body)}),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?'Esta cuenta no tiene acceso a Vitolas Studio.':data.error||'No pudimos cargar el panel. Inténtalo de nuevo.');
  return data;
}
function clear(){
  menu.update();nextOffset=null;loading=false;
  voucherBusy=false;voucherData=null;createdVoucher=null;requestId=crypto.randomUUID();
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
  const current=++revision;clear();$('partner-copy').textContent='Copiar enlace';
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
    const link=new URL(data.referralUrl);
    if(!['https://pvlab.studio','https://www.pvlab.studio','https://parallelvisionlabel.com'].includes(link.origin))throw Error('El enlace no está disponible.');
    $('partner-url').value=link.href;
    for(const [id,key] of [['registered','registered'],['paying','payingCustomers'],['subscribed','activeSubscriptions'],['purchases','purchases']])$('partner-'+id).textContent=Number(data.totals[key]||0).toLocaleString('es');
    rows(data.customers);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;
    $('partner-content').hidden=false;status('');await loadVouchers(current);
  }catch(error){if(current===revision)status(error.message);}
}
$('partner-signin').onclick=()=>clerk?.openSignIn();
$('partner-signout').onclick=async()=>{++revision;clear();status('Cerrando sesión…');try{await clerk?.signOut();await refresh();}catch{status('No se pudo cerrar sesión. Inténtalo de nuevo.');}};
$('partner-refresh').onclick=()=>void refresh();
$('partner-copy').onclick=async()=>{
  const current=revision,value=$('partner-url').value;if(!value)return;
  try{await navigator.clipboard.writeText(value);if(current===revision)$('partner-copy').textContent='Enlace copiado';}
  catch{if(current===revision){$('partner-url').focus();$('partner-url').select();status('Selecciona y copia tu enlace.');}}
};
$('partner-more').onclick=async()=>{
  if(loading||nextOffset===null)return;
  const current=revision;loading=true;$('partner-more').disabled=true;
  try{const data=await api(dashboardPath+'?offset='+nextOffset);if(current!==revision)return;rows(data.customers,true);nextOffset=data.nextOffset;$('partner-more').hidden=nextOffset===null;status('');}
  catch(error){if(current===revision)status(error.message);}
  finally{if(current===revision){loading=false;$('partner-more').disabled=false;}}
};
const date=value=>new Date(value).toLocaleDateString('es',{day:'numeric',month:'short',year:'numeric'});
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
