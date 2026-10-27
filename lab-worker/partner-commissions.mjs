const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results||[];
import {netPartnerReceipts} from './partner-fees.mjs';
export const partnerCommissionPolicy=Object.freeze({version:'vitolas-20261025-v1',firstPaymentPercent:50,renewalPercent:20,subscriptionMonths:6,currency:'EUR'});

// Called only inside already-verified, fully paid EUR webhook branches.
// Older synthetic events without processor timestamps have no timing context.
export async function recordPartnerPaymentContext(env,{reference,paidAt,kind,subscriptionId=null}){
  if(!Number.isSafeInteger(paidAt)||paidAt<=0)return;
  await env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_payment_context(reference,paid_at,kind,subscription_id)
    VALUES(?,?,?,?)`).bind(reference,paidAt,kind,subscriptionId).run();
}
export function sixCalendarMonthsAfter(value){
  const date=new Date(value),day=date.getUTCDate();date.setUTCDate(1);date.setUTCMonth(date.getUTCMonth()+6);
  const last=new Date(Date.UTC(date.getUTCFullYear(),date.getUTCMonth()+1,0)).getUTCDate();date.setUTCDate(Math.min(day,last));return date.valueOf();
}
export function calculatePartnerCommissions(payments){
  const ordered=[...payments].sort((a,b)=>(a.paidAt??a.recordedAt)-(b.paidAt??b.recordedAt)||a.reference.localeCompare(b.reference));
  const groups=new Map();for(const payment of ordered){const rows=groups.get(payment.customerId)||[];rows.push(payment);groups.set(payment.customerId,rows);}
  const results=[];
  for(const rows of groups.values()){
    // Without the signed timing of every earlier receipt, do not guess which
    // receipt was first or where a recurring commission window begins.
    const incomplete=rows.some(p=>!p.paidAt)||rows.length>1&&rows[0].paidAt===rows[1].paidAt;
    const subscription=rows.filter(p=>p.kind==='subscription'&&p.paidAt).sort((a,b)=>a.paidAt-b.paidAt)[0];
    const windowEnd=subscription?sixCalendarMonthsAfter(subscription.paidAt):null;
    rows.forEach((payment,index)=>{
      const rate=incomplete?0:index===0?50:payment.kind==='subscription'&&payment.paidAt<windowEnd?20:0;
      const commissionCents=Math.round(payment.amountCents*rate/100);
      const status=incomplete?'needs_reconciliation':payment.billingReview?'held':rate?'accrued':'not_eligible';
      const {customerId,...publicPayment}=payment;
      results.push({...publicPayment,rate,commissionCents,status,subscriptionWindowEndsAt:windowEnd});
    });
  }
  return results.sort((a,b)=>(b.paidAt??b.recordedAt)-(a.paidAt??a.recordedAt)||a.reference.localeCompare(b.reference));
}
export async function partnerCommissionReport(env,subject,customerSummaries=new Map(),{netOfFees=false}={}){
  const payments=await all(env,`SELECT v.reference,v.customer_id AS customerId,v.amount_cents AS amountCents,v.created_at AS recordedAt,
    t.paid_at AS paidAt,e.kind,
    CASE WHEN x.customer_id IS NULL AND p.verified_at IS NOT NULL THEN p.email ELSE NULL END AS email,
    CASE WHEN x.customer_id IS NULL THEN 0 ELSE 1 END AS closed,
    EXISTS(SELECT 1 FROM lab_billing_reviews b WHERE b.customer_id=v.customer_id) AS billingReview
    FROM lab_revenue_events v JOIN lab_referrals r ON r.referred_customer_id=v.customer_id
    JOIN lab_credit_entries e ON e.reference=v.reference AND e.customer_id=v.customer_id AND e.kind IN ('purchase','subscription')
    LEFT JOIN lab_payment_context t ON t.reference=v.reference AND t.kind=e.kind
    LEFT JOIN lab_customer_contacts p ON p.customer_id=v.customer_id
    LEFT JOIN lab_account_closures x ON x.customer_id=v.customer_id
    WHERE r.referrer_customer_id=?`,subject);
  let receipts=calculatePartnerCommissions(payments);
  if(netOfFees)receipts=await netPartnerReceipts(env,receipts,subject);
  // Join by the immutable ledger identity, never by an email or redacted label.
  // The map is server-only; internal subject IDs are never serialized.
  const identities=new Map(payments.map(p=>[p.reference,p.customerId]));
  for(const receipt of receipts){
    const id=identities.get(receipt.reference);
    const summary=customerSummaries.get(id)||{commissionCents:0,heldCommissionCents:0,needsReconciliation:0,paymentReferences:[]};
    if(receipt.status==='accrued')summary.commissionCents+=receipt.commissionCents;
    if(receipt.status==='held')summary.heldCommissionCents+=receipt.commissionCents;
    if(receipt.status==='needs_reconciliation')summary.needsReconciliation++;
    summary.paymentReferences.push(receipt.reference);customerSummaries.set(id,summary);
  }
  const totals={revenueCents:0,commissionCents:0,heldCommissionCents:0,payments:receipts.length,needsReconciliation:0};
  for(const receipt of receipts){totals.revenueCents+=receipt.amountCents;if(receipt.status==='accrued')totals.commissionCents+=receipt.commissionCents;
    if(receipt.status==='held')totals.heldCommissionCents+=receipt.commissionCents;
    if(receipt.status==='needs_reconciliation')totals.needsReconciliation++;}
  return {policy:netOfFees?{...partnerCommissionPolicy,version:'bellini-net-20261027-v1',basis:'verified_net'}:partnerCommissionPolicy,totals,recentPurchases:receipts.slice(0,10),receipts,
    note:netOfFees?'50% del primer pago y 20% de las suscripciones durante seis meses. Base neta de impuestos aplicables y gastos reales de procesamiento. Transferencias los días 15 y 30; en febrero, el segundo abono es el último día del mes.':'50% del primer pago; después 20% de las cuotas durante seis meses naturales desde la primera cuota pagada. Importes realmente cobrados en EUR, sin deducir gastos. Las cuentas con devoluciones o disputas quedan en revisión hasta conciliar sus ajustes. Este panel registra comisiones; no ejecuta transferencias.'};
}
