const money=n=>new Intl.NumberFormat('es',{style:'currency',currency:'EUR'}).format((n||0)/100);
const date=n=>n?new Date(typeof n==='string'?n+'T12:00:00Z':n).toLocaleDateString('es',{timeZone:'Europe/Berlin',day:'numeric',month:'short',year:'numeric'}):'';
const node=(tag,text,cls)=>{const e=document.createElement(tag);if(text!==undefined)e.textContent=text;if(cls)e.className=cls;return e;};
const button=(text,fn)=>{const b=node('button',text,'account-button');b.type='button';b.onclick=fn;return b;};
function table(head,rows){
 const wrap=node('div',undefined,'partner-table-wrap'),t=node('table',undefined,'partner-record-table'),thead=t.createTHead().insertRow();
 for(const h of head){const th=node('th',h);th.scope='col';thead.append(th);}
 const body=t.createTBody();for(const values of rows){const row=body.insertRow();values.forEach((value,i)=>{const td=row.insertCell();td.dataset.label=head[i];if(value instanceof Node)td.append(value);else td.textContent=value;});}
 if(!rows.length){const td=body.insertRow().insertCell();td.colSpan=head.length;td.textContent='Todavía no hay movimientos.';}
 wrap.append(t);return wrap;
}
export function createPartnerPayoutUI({root,api,isCurrent,onCommissions=()=>{}}){
 if(!root)return {clear(){},async load(){}};
 let serial=0,path='',owner=false,revision=0,busy=false,requestId=crypto.randomUUID();
 const clear=()=>{serial++;root.replaceChildren();root.hidden=true;busy=false;requestId=crypto.randomUUID();};
 async function action(suffix,body){
  if(busy||!isCurrent(revision))return;
  busy=true;const wanted=serial;for(const b of root.querySelectorAll('button'))b.disabled=true;
  const status=root.querySelector('[role=status]');status.textContent='Procesando…';
  try{
   let data;
   if(suffix==='request')data=await api(path,{requestId,expectedAmountCents:body.expectedAmountCents});
   else data=await api(path+suffix,body);
   if(wanted!==serial||!isCurrent(revision))return;
   paint(data);if(suffix==='request'&&data.requestedCents)requestId=crypto.randomUUID();onCommissions(data.commissionReport);
   root.querySelector('[role=status]').textContent=suffix==='request'?(data.requestedCents?'Solicitud recibida. Puedes seguir su estado aquí.':'El importe está pendiente de conciliación con Stripe.'):suffix==='/confirm'?'Abono registrado.':suffix==='/cancel'?'Solicitud cancelada.':'Cálculo actualizado.';
  }catch(e){if(wanted===serial&&isCurrent(revision))status.textContent=e.message;}
  finally{if(wanted===serial&&isCurrent(revision)){busy=false;for(const b of root.querySelectorAll('button'))b.disabled=b.dataset.disabled==='true';}}
 }
 function paint(data){
  root.replaceChildren();root.hidden=false;
  root.append(node('p','BELLINI STUDIOS / PAGOS','account-eyebrow'),node('h3','Tu próximo abono'));
  root.append(node('p','Transferencias los días 15 y 30. En febrero, el segundo abono es el último día del mes.','account-muted'));
  const grid=node('div',undefined,'partner-payout-totals');
  for(const [label,key] of [['Disponible para solicitar','availableCents'],['Pendiente de pago','requestedCents'],['Ya transferido','paidCents']]){
   const item=node('div');item.append(node('span',label),node('strong',money(data[key])));grid.append(item);
  }
  root.append(grid,node('p','Próxima fecha de abono: '+date(data.nextPayDate)));
  const controls=node('div',undefined,'partner-payout-actions');
  if(owner)controls.append(button('Actualizar cálculo de Stripe',()=>action('/prepare',{})));
  else{
   const calculating=data.feePending&&!data.availableCents;
   const b=button(calculating?'Calcular neto':'Solicitar pago',()=>calculating?action('/prepare',{}):action('request',{expectedAmountCents:data.availableCents}));
   const disabled=!!data.requestedCents||(!calculating&&data.availableCents<(data.minimumCents||5000));b.disabled=disabled;b.dataset.disabled=String(disabled);controls.append(b);
   if(!calculating)controls.append(button('Actualizar saldo',()=>action('/prepare',{})));
  }
  root.append(controls,node('p','Mínimo para solicitar un pago: '+money(data.minimumCents||5000)+' netos.','partner-form-help'));
  const status=node('p',data.feePending?data.feePending+' pagos pendientes de confirmar sus gastos reales de Stripe.':'','account-status');status.role='status';status.setAttribute('aria-live','polite');root.append(status);
  root.append(node('p','La comisión se calcula sobre el cobro neto de impuestos aplicables y gastos reales de procesamiento. Los pagos con incidencias quedan en revisión.','partner-form-help'));
  root.append(node('h3','Desglose del importe disponible'));
  root.append(table(['Pago','Cobrado','Stripe','Impuestos','Base neta','Tu comisión'],(data.breakdown||[]).slice(0,10).map(p=>[p.reference,money(p.amountCents),money(p.feeCents),money(p.taxCents),money(p.baseCents),money(p.commissionCents)+' · '+p.rate+'%'])));
  if(data.breakdown?.length>10)root.append(node('p','Se muestran los primeros 10 pagos disponibles. La solicitud incluye todo el importe conciliado.','partner-form-help'));
  root.append(node('h3','Tus solicitudes'));
  const labels={pending:'Pendiente',paid:'Transferido',cancelled:'Cancelado'};
  root.append(table(['Fecha','Importe','Estado','Referencia'],(data.history||[]).slice(0,10).map(p=>[date(p.createdAt),money(p.amountCents),labels[p.status],p.transferReference||(p.status==='pending'?'Pendiente de abono':'Sin transferencia')])));
  if(owner)for(const p of data.history||[]){if(p.status!=='pending')continue;
   const form=node('form',undefined,'partner-payout-confirm');const label=node('label','Referencia del abono realizado');const input=node('input');input.type='text';input.required=true;input.maxLength=100;input.placeholder='Referencia de tu transferencia';label.append(input);form.append(label);
   const confirm=node('button','Confirmar abono de '+money(p.amountCents),'account-button');confirm.type='submit';form.append(confirm);
   form.onsubmit=e=>{e.preventDefault();if(form.reportValidity())void action('/confirm',{id:p.id,transferReference:input.value});};
   form.append(button('Cancelar solicitud',()=>action('/cancel',{id:p.id})));root.append(form);
  }
 }
 return {clear,async load(options){
  path=options.path;owner=options.owner;revision=options.revision;const wanted=++serial;
  try{const data=await api(path);if(wanted!==serial||!isCurrent(revision))return;paint(data);onCommissions(data.commissionReport);}
  catch(e){if(wanted===serial&&isCurrent(revision)){root.hidden=false;root.replaceChildren(node('p','No pudimos cargar tus pagos. Actualiza el panel.','account-status'));}}
 }};
}
export function createOwnerPayoutNotice({root,api,isCurrent}){
 let serial=0;
 return {clear(){serial++;if(root){root.hidden=true;root.replaceChildren();}},async load(revision){
  if(!root)return;const wanted=++serial;
  try{const data=await api('/api/admin/partner-payouts');if(wanted!==serial||!isCurrent(revision))return;
   root.replaceChildren();root.hidden=!data.requests?.length;
   if(data.requests?.length){const total=data.requests.reduce((n,p)=>n+p.amountCents,0),a=node('a','Bellini Studios: '+money(total)+' pendientes de abono');a.href='./bellini-studio.html#comisiones';root.append(a);}
  }catch{if(wanted===serial&&isCurrent(revision)){root.hidden=false;root.textContent='No pudimos cargar las solicitudes de retiro.';}}
 }};
}
