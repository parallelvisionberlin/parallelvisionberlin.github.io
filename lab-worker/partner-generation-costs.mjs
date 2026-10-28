const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results||[];
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const terminal=new Set(['completed','failed','reconstructed_completed']);
const day=at=>new Date(at).toISOString().slice(0,10);
const safe=n=>Number.isSafeInteger(n)&&n>=0;
export const costPolicyVersion='bellini-costs-20261028-v1';
export const ECB_HISTORY_URL='https://www.ecb.europa.eu/stats/eurofxref/eurofxref-hist-90d.xml';

// Official ECB quotes are USD per EUR. They are accounting reference rates,
// not bank execution prices. Unknown/stale/missing rates never become 1:1.
export function parseEcbRates(xml,now=Date.now()){
 if(typeof xml!=='string'||xml.length>2000000||!/www\.ecb\.int\/vocabulary\/2002-08-01\/eurofxref/.test(xml))throw Error('Invalid ECB feed');
 const result=[];
 for(const m of xml.matchAll(/<Cube\s+time=['"](\d{4}-\d{2}-\d{2})['"]\s*>([\s\S]*?)<\/Cube>/g)){
  const at=Date.parse(m[1]+'T00:00:00Z'),usd=m[2].match(/<Cube\s+currency=['"]USD['"]\s+rate=['"](\d+(?:\.\d{1,6})?)['"]\s*\/>/);
  if(!usd||!Number.isFinite(at)||day(at)!==m[1]||m[1]>day(now))continue;
  const rate=Math.round(Number(usd[1])*1000000);if(!safe(rate)||rate<100000||rate>10000000)throw Error('Invalid ECB USD quote');
  if(result.some(r=>r.day===m[1]))throw Error('Duplicate ECB date');
  result.push({day:m[1],usdPerEurMicros:rate});
 }
 if(!result.length||now-Date.parse(result.map(r=>r.day).sort().at(-1)+'T00:00:00Z')>7*86400000)throw Error('ECB feed is stale');
 return result;
}
export async function refreshPartnerCostFx(env,{fetcher=fetch,now=Date.now()}={}){
 const cached=await one(env,'SELECT fx_checked_at AS at,fx_ok AS ok FROM lab_partner_cost_refresh WHERE id=1');
 if(cached?.at&&now-cached.at>=0&&now-cached.at<(cached.ok?3600000:300000))return cached.ok?{cached:true}:{pending:true};
 try{
  const response=await fetcher(ECB_HISTORY_URL,{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('ECB unavailable');
  const rates=parseEcbRates(await response.text(),now);
  // Historical observations are immutable; a different quote cannot silently
  // rewrite a previously used conversion or a paid commission snapshot.
  await env.LAB_DB.batch([...rates.map(r=>env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_partner_fx_rates
   (day,usd_per_eur_micros,source,verified_at) VALUES(?,?,'ECB',?)`).bind(r.day,r.usdPerEurMicros,now)),env.LAB_DB.prepare('UPDATE lab_partner_cost_refresh SET fx_checked_at=?,fx_ok=1 WHERE id=1').bind(now)]);
  return {updated:true};
 }catch{await env.LAB_DB.prepare('UPDATE lab_partner_cost_refresh SET fx_checked_at=?,fx_ok=0 WHERE id=1').bind(now).run();return {pending:true};}
}
function eurMicros(cost,at,rates){
 if(typeof cost!=='number'||!Number.isFinite(cost)||cost<0||cost>1000000)return null;
 if(cost===0)return 0n;
 const date=day(at),rate=[...rates].reverse().find(r=>r.day<=date&&Date.parse(date)-Date.parse(r.day)<=7*86400000);
 if(!rate)return null;
 const denominator=BigInt(rate.usdPerEurMicros),usd=BigInt(Math.round(cost*1000000));
 return (usd*1000000n+denominator/2n)/denominator;
}

// Replay the immutable wallet chronologically. Every grant is a separate FIFO
// funding lot, including free gifts. A job refund restores its original lots;
// its confirmed provider expense remains attributed there, once, even after
// creative job/media deletion. No wallet rows or balances are changed here.
export function allocateGenerationCosts(entries,finance,rates=[]){
 const lots=[],jobs=new Map(),fin=new Map(finance.map(f=>[f.jobId,f]));let incomplete=false;
 const rank=e=>e.kind==='refund'?2:e.deltaCredits>0?0:1;
 const ordered=[...entries].sort((a,b)=>a.createdAt-b.createdAt||rank(a)-rank(b)||a.id.localeCompare(b.id));
 for(const e of ordered){
  if(!Number.isSafeInteger(e.deltaCredits)||!e.deltaCredits){incomplete=true;continue;}
  if(e.deltaCredits>0){
   const job=e.kind==='refund'&&e.reference.startsWith('refund:job:')?jobs.get(e.reference.slice(11)):null;
   if(job){
    if(job.refunded||e.deltaCredits!==job.credits){incomplete=true;continue;}
    job.refunded=true;for(const a of job.allocations)a.lot.remaining+=a.credits;
   }else{
    if(e.kind==='refund')incomplete=true;
    lots.push({reference:e.reference,credits:e.deltaCredits,remaining:e.deltaCredits,costMicros:0n,pending:false});
   }
   continue;
  }
  let needed=-e.deltaCredits;const allocations=[];
  for(const lot of lots){if(!needed)break;const n=Math.min(needed,lot.remaining);if(n){lot.remaining-=n;needed-=n;allocations.push({lot,credits:n});}}
  if(needed)incomplete=true;
  if(e.kind!=='generation')continue;
  if(!e.reference.startsWith('job:')||jobs.has(e.reference.slice(4))){incomplete=true;continue;}
  jobs.set(e.reference.slice(4),{credits:-e.deltaCredits,allocations,refunded:false});
 }
 for(const [id,job] of jobs){
  const f=fin.get(id),cost=f?eurMicros(f.settledCostUsd,f.createdAt,rates):null;
  const pending=!f||!terminal.has(f.state)||cost===null;
  let assigned=0n;
  job.allocations.forEach((a,i)=>{
   a.lot.pending ||= pending;
   if(cost!==null){const portion=i===job.allocations.length-1?cost-assigned:cost*BigInt(a.credits)/BigInt(job.credits);a.lot.costMicros+=portion;assigned+=portion;}
  });
 }
 return new Map(lots.map(l=>[l.reference,{remainingCredits:l.remaining,costCents:Number((l.costMicros+5000n)/10000n),final:!incomplete&&!l.remaining&&!l.pending,allocationIncomplete:incomplete}]));
}

export async function protectPartnerGenerationCosts(env,receipts,payments,subject,revisionAtStart=null){
 const before=revisionAtStart??(await one(env,'SELECT revision FROM lab_partner_cost_revision WHERE id=1')).revision;
 const [entries,finance,rates,legacy,paid]=await Promise.all([
  all(env,`SELECT e.id,e.customer_id AS customerId,e.reference,e.delta_credits AS deltaCredits,e.kind,e.created_at AS createdAt
   FROM lab_credit_entries e JOIN lab_referrals r ON r.referred_customer_id=e.customer_id
   WHERE r.referrer_customer_id=? ORDER BY e.created_at,e.id`,subject),
  all(env,`SELECT f.job_id AS jobId,f.customer_id AS customerId,f.created_at AS createdAt,f.last_state AS state,f.settled_cost_usd AS settledCostUsd
   FROM lab_generation_finance f JOIN lab_referrals r ON r.referred_customer_id=f.customer_id WHERE r.referrer_customer_id=?`,subject),
  all(env,'SELECT day,usd_per_eur_micros AS usdPerEurMicros FROM lab_partner_fx_rates ORDER BY day'),
  all(env,`SELECT c.reference FROM lab_partner_payout_claims c JOIN lab_partner_payouts p ON p.id=c.payout_id WHERE p.partner_customer_id=?`,subject),
  all(env,`SELECT s.reference,SUM(s.commission_cents) AS cents FROM lab_partner_payout_segments s JOIN lab_partner_payouts p ON p.id=s.payout_id WHERE p.partner_customer_id=? AND p.status='paid' GROUP BY s.reference`,subject)
 ]);
 const grouped=new Map(),finances=new Map(),funding=new Map(),grandfathered=new Set(legacy.map(p=>p.reference));
 for(const e of entries){if(!grouped.has(e.customerId))grouped.set(e.customerId,[]);grouped.get(e.customerId).push(e);}
 for(const f of finance){if(!finances.has(f.customerId))finances.set(f.customerId,[]);finances.get(f.customerId).push(f);}
 for(const [customer,rows] of grouped)for(const [ref,lot] of allocateGenerationCosts(rows,finances.get(customer)||[],rates))funding.set(ref,lot);
 const identities=new Map(payments.map(p=>[p.reference,p.customerId])),paidByReference=new Map(paid.map(p=>[p.reference,p.cents]));
 const result=receipts.map(p=>{
  if(p.rate!==50||!Number.isSafeInteger(p.baseCents)||p.status==='needs_reconciliation'||grandfathered.has(p.reference))return p;
  const lot=funding.get(p.reference),cap=Math.max(0,Math.min(Math.floor(p.baseCents*5/100),p.commissionCents-Math.round(p.baseCents*45/100)));
  const generationCostCents=lot&&!lot.allocationIncomplete?lot.costCents:null;
  const wantedAdjustment=generationCostCents===null?0:Math.min(cap,Math.max(0,generationCostCents-(p.baseCents-p.commissionCents)));
  const alreadyPaid=paidByReference.get(p.reference)||0;
  const costAdjustmentCents=Math.min(wantedAdjustment,Math.max(0,p.commissionCents-alreadyPaid));
  const wantedReserve=lot?.final?0:cap-wantedAdjustment;
  const costReserveCents=Math.min(wantedReserve,Math.max(0,p.commissionCents-costAdjustmentCents-alreadyPaid));
  const costReviewRequired=costAdjustmentCents!==wantedAdjustment||costReserveCents!==wantedReserve;

  return {...p,nominalCommissionCents:p.commissionCents,commissionCents:p.commissionCents-costAdjustmentCents,
   costAdjustmentCents,costReserveCents,generationCostCents,payableCents:p.commissionCents-costAdjustmentCents-costReserveCents,
   costPending:!lot?.final,costReviewRequired,remainingCredits:lot?.remainingCredits??null,costReason:costAdjustmentCents?'Costes de generación superiores a la parte de PV LAB. Ajuste limitado a 5 puntos.':null,
   costCustomer:identities.get(p.reference)};
 });
 const after=(await one(env,'SELECT revision FROM lab_partner_cost_revision WHERE id=1')).revision;
 if(before!==after){const e=Error('Los costes cambiaron. Actualiza el informe.');e.status=409;throw e;}
 // Internal accounting identities never leave this module.
 return {receipts:result.map(({costCustomer,...p})=>p),revision:after};
}

export function costSnapshotStatement(env,subject,receipts,revision){
 const rows=receipts.filter(p=>p.status==='accrued'&&Number.isSafeInteger(p.baseCents)&&p.rate).map(p=>[
  p.reference,p.baseCents,p.rate,p.nominalCommissionCents??p.commissionCents,p.costAdjustmentCents||0,p.costReserveCents||0,p.generationCostCents??null,p.payableCents??p.commissionCents
 ]);
 return env.LAB_DB.prepare(`INSERT OR REPLACE INTO lab_partner_cost_snapshots
  (reference,partner_customer_id,revision,base_cents,rate,nominal_cents,adjustment_cents,reserve_cents,cost_cents,payable_cents)
  SELECT json_extract(value,'$[0]'),?,?,json_extract(value,'$[1]'),json_extract(value,'$[2]'),json_extract(value,'$[3]'),
   json_extract(value,'$[4]'),json_extract(value,'$[5]'),json_extract(value,'$[6]'),json_extract(value,'$[7]') FROM json_each(?)`)
  .bind(subject,revision,JSON.stringify(rows));
}
