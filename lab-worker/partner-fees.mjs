const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results||[];
const id=value=>typeof value==='string'?value:value?.id;
const cents=value=>Number.isSafeInteger(value)&&value>=0;
const invalid=()=>{throw Error('El pago todavía requiere conciliación con Stripe.');};

export async function netPartnerReceipts(env,receipts,subject){
 const facts=new Map((await all(env,`SELECT f.reference,f.amount_cents AS amountCents,f.fee_cents AS feeCents,f.tax_cents AS taxCents
  FROM lab_partner_payment_facts f JOIN lab_revenue_events e ON e.reference=f.reference
  JOIN lab_referrals r ON r.referred_customer_id=e.customer_id WHERE r.referrer_customer_id=?`,subject)).map(f=>[f.reference,f]));
 return receipts.map(p=>{
  if(!p.rate||p.status==='needs_reconciliation')return p;
  const f=facts.get(p.reference);
  if(!f||f.amountCents!==p.amountCents)return {...p,grossCommissionCents:p.commissionCents,commissionCents:0,status:p.status==='held'?'held':'needs_reconciliation',feePending:true};
  const baseCents=Math.max(0,p.amountCents-f.feeCents-f.taxCents);
  return {...p,grossCommissionCents:p.commissionCents,feeCents:f.feeCents,taxCents:f.taxCents,baseCents,commissionCents:Math.round(baseCents*p.rate/100)};
 });
}
async function stripeGet(env,path){
 if(!/^(?:sk|rk)_(?:live|test)_/.test(env.LAB_STRIPE_SECRET_KEY||''))invalid();
 const r=await fetch('https://api.stripe.com/v1/'+path,{redirect:'error',headers:{Authorization:'Bearer '+env.LAB_STRIPE_SECRET_KEY},signal:AbortSignal.timeout(10000)});
 if(!r.ok)invalid();return r.json();
}
function taxAmount(obj,isInvoice){
 if(!isInvoice)return obj.total_details?.amount_tax;
 if(Array.isArray(obj.total_taxes))return obj.total_taxes.reduce((n,t)=>n+(cents(t.amount)?t.amount:NaN),0);
 if(Array.isArray(obj.total_tax_amounts))return obj.total_tax_amounts.reduce((n,t)=>n+(cents(t.amount)?t.amount:NaN),0);
 if(Object.hasOwn(obj,'tax'))return obj.tax===null?0:obj.tax;
 if(cents(obj.total)&&cents(obj.total_excluding_tax))return obj.total-obj.total_excluding_tax;
 invalid();
}
export async function reconcilePartnerFees(env,subject,limit=10){
 const rows=await all(env,`SELECT e.reference,e.amount_cents AS amountCents,c.stripe_customer_id AS stripeCustomer
  FROM lab_revenue_events e JOIN lab_referrals r ON r.referred_customer_id=e.customer_id
  JOIN lab_customers c ON c.id=e.customer_id
  LEFT JOIN lab_partner_payment_facts f ON f.reference=e.reference
  WHERE r.referrer_customer_id=? AND f.reference IS NULL
   AND NOT EXISTS(SELECT 1 FROM lab_billing_reviews b WHERE b.customer_id=e.customer_id)
  ORDER BY e.created_at,e.reference LIMIT ?`,subject,limit);
 let reconciled=0,pending=0;
 for(const payment of rows){
  try{
   const invoice=payment.reference.startsWith('invoice:'),objectId=payment.reference.slice(payment.reference.indexOf(':')+1);
   if(!/^(?:cs|in)_[A-Za-z0-9_]+$/.test(objectId)||!payment.stripeCustomer)invalid();
   const obj=await stripeGet(env,(invoice?'invoices/':'checkout/sessions/')+objectId);
   if(obj.id!==objectId||obj.currency!=='eur'||id(obj.customer)!==payment.stripeCustomer||
    (invoice?obj.status!=='paid'||obj.amount_paid!==payment.amountCents:obj.payment_status!=='paid'||obj.mode!=='payment'||obj.amount_total!==payment.amountCents))invalid();
   const taxCents=taxAmount(obj,invoice);if(!cents(taxCents)||taxCents>payment.amountCents)invalid();
   let pi=id(obj.payment_intent),chargeId=id(obj.charge);
   if(invoice&&!pi&&!chargeId){
    const list=await stripeGet(env,'invoice_payments?'+new URLSearchParams({invoice:objectId,status:'paid',limit:'100'}));
    const payments=list.data?.filter(p=>id(p.invoice)===objectId&&p.status==='paid');
    if(list.has_more||payments?.length!==1||payments[0].amount_paid!==payment.amountCents)invalid();
    pi=id(payments[0].payment?.payment_intent);
   }
   if(!chargeId){
    if(!/^pi_[A-Za-z0-9]+$/.test(pi||''))invalid();
    const intent=await stripeGet(env,'payment_intents/'+pi);
    if(intent.id!==pi||intent.currency!=='eur'||intent.status!=='succeeded'||intent.amount_received!==payment.amountCents||id(intent.customer)!==payment.stripeCustomer)invalid();
    chargeId=id(intent.latest_charge);
   }
   if(!/^ch_[A-Za-z0-9]+$/.test(chargeId||''))invalid();
   const charge=await stripeGet(env,'charges/'+chargeId+'?expand[]=balance_transaction');
   const bt=charge.balance_transaction,expectedLive=/_(live)_/.test(env.LAB_STRIPE_SECRET_KEY);
   if(charge.id!==chargeId||charge.currency!=='eur'||charge.amount!==payment.amountCents||!charge.paid||!charge.captured||charge.refunded||charge.disputed||charge.amount_refunded!==0||
    id(charge.customer)!==payment.stripeCustomer||charge.livemode!==expectedLive||!bt||typeof bt!=='object'||
    !/^txn_[A-Za-z0-9]+$/.test(bt.id||'')||id(bt.source)!==chargeId||bt.currency!=='eur'||bt.amount!==payment.amountCents||!cents(bt.fee)||bt.fee>bt.amount||bt.net!==bt.amount-bt.fee)invalid();
   const inserted=await env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_partner_payment_facts
    (reference,charge_id,balance_transaction_id,amount_cents,fee_cents,tax_cents,verified_at) VALUES(?,?,?,?,?,?,?)`)
    .bind(payment.reference,chargeId,bt.id,payment.amountCents,bt.fee,taxCents,Date.now()).run();
   if(inserted.meta?.changes)reconciled++;
  }catch{pending++;}
 }
 return {reconciled,pending};
}
