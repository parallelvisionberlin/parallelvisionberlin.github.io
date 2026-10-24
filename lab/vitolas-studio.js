import {loadLabAccount} from './native-account.js?v=20261012-unified-header1&studioAuth=20261015-1';
import {createSessionRequest} from './session-request.js?v=20260927-auth1&studioAuth=20261015-1';
import {createAccountMenu} from './account-menu.js?v=20261024-vitolas1';
const $=id=>document.getElementById(id);
const menu=createAccountMenu($('account-menu'));
let clerk=null,revision=0,nextOffset=null,loading=false;
let dashboardPath='/api/customer/partner';
const request=createSessionRequest({baseUrl:'https://parallel-vision-lab.parallelvision.workers.dev',getSession:()=>clerk?.session});
const status=message=>{$('partner-status').textContent=message;};
async function api(path){
  const response=await request(path),data=await response.json().catch(()=>({}));
  if(!response.ok)throw Error(response.status===403?'Esta cuenta no tiene acceso a Vitolas Studio.':data.error||'No pudimos cargar el panel. Inténtalo de nuevo.');
  return data;
}
function clear(){
  menu.update();nextOffset=null;loading=false;
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
    $('partner-content').hidden=false;status('');
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
window.addEventListener('pagehide',()=>{++revision;clear();});
window.addEventListener('pageshow',event=>{if(event.persisted)void refresh();});
try{clerk=await loadLabAccount();clerk.addListener(()=>void refresh());await refresh();}
catch{status('No pudimos cargar el inicio de sesión. Recarga la página.');}
