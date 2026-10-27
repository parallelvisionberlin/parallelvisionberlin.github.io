import {partnerWorkspace,resolveApprovedPartner} from './partner-dashboard.mjs';
import {partnerCommissionReport} from './partner-commissions.mjs';
import {reconcilePartnerFees} from './partner-fees.mjs';
import {requireOwner} from './promotions.mjs';
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results||[];
const json=data=>new Response(JSON.stringify(data),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const fail=(status,message)=>{const e=Error(message);e.status=status;throw e;};
async function body(request){
 if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
 const text=await request.text();if(text.length>2048)fail(413,'Request too large.');
 try{const v=JSON.parse(text);if(v&&typeof v==='object'&&!Array.isArray(v))return v;}catch{}
 fail(400,'Invalid request.');
}
export function nextPartnerPayDate(now=Date.now()){
 const p=Object.fromEntries(new Intl.DateTimeFormat('en-CA',{timeZone:'Europe/Berlin',year:'numeric',month:'2-digit',day:'2-digit'}).formatToParts(now).filter(p=>p.type!=='literal').map(p=>[p.type,p.value]));
 let year=Number(p.year),month=Number(p.month);const day=Number(p.day),last=new Date(Date.UTC(year,month,0)).getUTCDate();
 let due=day<=15?15:Math.min(30,last);
 if(day>due){month++;if(month===13){year++;month=1;}due=15;}
 return year+'-'+String(month).padStart(2,'0')+'-'+String(due).padStart(2,'0');
}
async function report(env,subject){
 const commissions=await partnerCommissionReport(env,subject,new Map(),{netOfFees:true});
 const claimed=new Set((await all(env,'SELECT c.reference FROM lab_partner_payout_claims c JOIN lab_partner_payouts p ON p.id=c.payout_id WHERE p.partner_customer_id=?',subject)).map(x=>x.reference));
 const available=commissions.receipts.filter(p=>p.status==='accrued'&&p.commissionCents>0&&!claimed.has(p.reference));
 const history=await all(env,`SELECT id,status,amount_cents AS amountCents,created_at AS createdAt,paid_at AS paidAt,transfer_reference AS transferReference
  FROM lab_partner_payouts WHERE partner_customer_id=? ORDER BY created_at DESC,id LIMIT 100`,subject);
 const summary=await one(env,`SELECT COALESCE(SUM(CASE WHEN status='pending' THEN amount_cents ELSE 0 END),0) AS requestedCents,
  COALESCE(SUM(CASE WHEN status='paid' THEN amount_cents ELSE 0 END),0) AS paidCents FROM lab_partner_payouts WHERE partner_customer_id=?`,subject);
 return {available,view:{...summary,commissionReport:commissions,availableCents:available.reduce((n,p)=>n+p.commissionCents,0),feePending:commissions.receipts.filter(p=>p.feePending&&!claimed.has(p.reference)).length,
  minimumCents:5000,nextPayDate:nextPartnerPayDate(),history,breakdown:available.map(p=>({reference:p.reference,amountCents:p.amountCents,feeCents:p.feeCents,taxCents:p.taxCents,baseCents:p.baseCents,rate:p.rate,commissionCents:p.commissionCents}))}};
}
export async function partnerPayoutRoute(request,env,actor,{ownerView=false}={}){
 const path=new URL(request.url).pathname,adminQueue=path==='/api/admin/partner-payouts';
 let subject=actor;
 if(ownerView){
  await requireOwner(env,actor);
  if(adminQueue){
   if(request.method!=='GET')fail(405,'Method not allowed.');
   return json({requests:await all(env,`SELECT id,workspace,status,amount_cents AS amountCents,created_at AS createdAt
    FROM lab_partner_payouts WHERE status='pending' ORDER BY created_at,id LIMIT 100`)});
  }
  if(!path.startsWith('/api/admin/partners/bellini-studio/payouts'))fail(404,'Unknown payout workspace.');
  const partner=await resolveApprovedPartner(env,'bellini-studio');
  if(!partner)fail(409,'Bellini debe iniciar sesión primero.');subject=partner.subject;
 }else{
  const workspace=await partnerWorkspace(env,subject,{verify:true});
  if(workspace?.slug!=='bellini-studio')fail(403,'Esta cuenta no tiene acceso a los retiros de Bellini.');
 }
 const base=ownerView?'/api/admin/partners/bellini-studio/payouts':'/api/customer/partner/payouts';
 const action=path.slice(base.length);
 if(!['','/prepare','/confirm','/cancel'].includes(action))fail(404,'Unknown payout endpoint.');
 if(request.method==='GET'&&action==='')return json((await report(env,subject)).view);
 if(request.method!=='POST')fail(405,'Method not allowed.');
 if(['/confirm','/cancel'].includes(action)&&!ownerView)fail(403,'Solo el owner puede confirmar o cancelar un abono.');
 const data=await body(request);
 if(action==='/prepare'){
  const result=await reconcilePartnerFees(env,subject);
  return json({...((await report(env,subject)).view),reconciliation:result});
 }
 if(action==='/confirm'||action==='/cancel'){
  if(typeof data.id!=='string'||!/^[a-f0-9-]{36}$/.test(data.id))fail(400,'Solicitud no válida.');
  const payout=await one(env,'SELECT * FROM lab_partner_payouts WHERE id=? AND partner_customer_id=?',data.id,subject);
  if(!payout||payout.status!=='pending')fail(409,'Esta solicitud ya no está pendiente.');
  if(action==='/cancel'){
   await env.LAB_DB.batch([
    env.LAB_DB.prepare("DELETE FROM lab_partner_payout_claims WHERE payout_id=? AND EXISTS(SELECT 1 FROM lab_partner_payouts WHERE id=? AND status='pending')").bind(data.id,data.id),
    env.LAB_DB.prepare("UPDATE lab_partner_payouts SET status='cancelled',updated_at=? WHERE id=? AND status='pending'").bind(Date.now(),data.id)]);
  }else{
   const reference=typeof data.transferReference==='string'?data.transferReference.trim():'';
   if(!reference||reference.length>100||/[\u0000-\u001f]/.test(reference))fail(400,'Añade la referencia del abono realizado.');
   const current=await partnerCommissionReport(env,subject,new Map(),{netOfFees:true});
   const receipts=new Map(current.receipts.map(p=>[p.reference,p]));
   const snapshot=await all(env,'SELECT reference,rate,commission_cents AS commissionCents FROM lab_partner_payout_items WHERE payout_id=?',data.id);
   if(snapshot.some(p=>receipts.get(p.reference)?.status!=='accrued'||receipts.get(p.reference)?.rate!==p.rate||receipts.get(p.reference)?.commissionCents!==p.commissionCents))
    fail(409,'El cálculo de esta solicitud cambió. Revisa el informe antes de confirmar el abono.');
   const now=Date.now();const result=await env.LAB_DB.prepare(`UPDATE lab_partner_payouts SET status='paid',updated_at=?,paid_at=?,transfer_reference=?
    WHERE id=? AND status='pending' AND amount_cents=(SELECT SUM(commission_cents) FROM lab_partner_payout_items WHERE payout_id=?)
    AND ?=(SELECT COUNT(*) FROM lab_revenue_events v JOIN lab_referrals r ON r.referred_customer_id=v.customer_id
      JOIN lab_credit_entries e ON e.reference=v.reference AND e.customer_id=v.customer_id AND e.kind IN ('purchase','subscription') WHERE r.referrer_customer_id=?)
    AND NOT EXISTS(SELECT 1 FROM lab_partner_payout_items i JOIN lab_revenue_events e ON e.reference=i.reference JOIN lab_billing_reviews b ON b.customer_id=e.customer_id WHERE i.payout_id=?)`)
    .bind(now,now,reference,data.id,data.id,current.receipts.length,subject,data.id).run();
   if(!result.meta?.changes)fail(409,'Revisa las incidencias de estos pagos antes de confirmar la transferencia.');
  }
  return json((await report(env,subject)).view);
 }
 if(ownerView)fail(403,'La solicitud debe enviarla Bellini desde su cuenta.');
 if(typeof data.requestId!=='string'||!/^[a-f0-9-]{36}$/.test(data.requestId))fail(400,'Solicitud no válida.');
 const existing=await one(env,'SELECT id FROM lab_partner_payouts WHERE id=? AND partner_customer_id=?',data.requestId,subject);
 if(existing)return json((await report(env,subject)).view);
 const {available,view}=await report(env,subject);
 if(view.requestedCents)fail(409,'Ya tienes una solicitud pendiente.');
 if(view.availableCents<5000)fail(409,'El mínimo para solicitar un pago es de 50 € netos.');
 if(!Number.isSafeInteger(data.expectedAmountCents)||data.expectedAmountCents!==view.availableCents)fail(409,'El importe cambió. Actualiza el saldo y revisa el nuevo neto antes de solicitarlo.');
 const now=Date.now();const statements=[env.LAB_DB.prepare(`INSERT INTO lab_partner_payouts
  (id,workspace,partner_customer_id,status,amount_cents,created_at,updated_at) VALUES(?,'bellini-studio',?,'pending',?,?,?)`).bind(data.requestId,subject,view.availableCents,now,now)];
 const items=JSON.stringify(available.map(p=>[p.reference,p.amountCents,p.feeCents,p.taxCents,p.baseCents,p.rate,p.commissionCents]));
 statements.push(env.LAB_DB.prepare(`INSERT INTO lab_partner_payout_items
  (payout_id,reference,amount_cents,fee_cents,tax_cents,base_cents,rate,commission_cents)
  SELECT ?,json_extract(value,'$[0]'),json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),
   json_extract(value,'$[4]'),json_extract(value,'$[5]'),json_extract(value,'$[6]') FROM json_each(?)`).bind(data.requestId,items));
 statements.push(env.LAB_DB.prepare('INSERT INTO lab_partner_payout_claims(reference,payout_id) SELECT reference,payout_id FROM lab_partner_payout_items WHERE payout_id=?').bind(data.requestId));
 try{await env.LAB_DB.batch(statements);}catch{fail(409,'El saldo cambió. Actualiza el informe antes de solicitar el retiro.');}
 return json((await report(env,subject)).view);
}
