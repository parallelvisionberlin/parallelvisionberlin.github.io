import {ownerProviderBalances} from './owner-providers.mjs';
import {labTrafficReport} from './traffic.mjs';
import {grantVerifiedWelcome,welcomeReviewFlag} from './welcome-guard.mjs';
import {ownerGenerationReviewRoute} from './generation-review.mjs';
// PV LAB promotional credits and private customer administration.
// All money and wallet records belong to LAB_DB. OWNER_DB is read for owner authorization only.
const CODE=/^[A-Z0-9][A-Z0-9-]{5,23}$/;
const EMAIL=/^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const ALPHABET='ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const json=(data,status=200)=>new Response(JSON.stringify(data),{status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}});
function fail(status,message){const e=new Error(message);e.status=status;throw e;}
function codeOf(value){return typeof value==='string'&&CODE.test(value.trim().toUpperCase())?value.trim().toUpperCase():'';}
function newCode(){const bytes=crypto.getRandomValues(new Uint8Array(12));return 'PV'+Array.from(bytes,n=>ALPHABET[n&31]).join('');}
async function payload(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
  const raw=await request.text();
  if(raw.length>2048)fail(413,'Request is too large.');
  try {const data=JSON.parse(raw);if(!data||Array.isArray(data)||typeof data!=='object')throw Error();return data;}
  catch {fail(400,'Invalid request.');}
}
export function voucherLink(env,code,origin=''){
  const base=new URL(origin==='https://pvlab.studio'?'https://pvlab.studio/studio.html':
    origin==='https://www.pvlab.studio'?'https://www.pvlab.studio/studio.html':
    env.LAB_PUBLIC_APP_URL||'https://parallelvisionlabel.com/lab/studio.html');
  if(base.protocol!=='https:'||base.username||base.password)fail(503,'PV Lab URL is not configured.');
  const link=new URL('account.html',base);
  link.searchParams.set('voucher',code);
  link.hash='voucher';
  return link.href;
}

// Keep database error reporting private and finite. Never persist D1 error text:
// it can contain query parameters, identifiers or other customer information.
const CLERK_STORAGE_STAGES=['closure_read','identity_read','contact_read','contact_write','welcome_grant','unknown'];
const CLERK_STORAGE_KINDS=['temporary','schema','constraint','unknown'];
function clerkStorageKind(error){
  const message=String(error?.message||'');
  if(/SQLITE_BUSY|SQLITE_LOCKED|database (?:is )?(?:locked|busy)|timed? out|temporar(?:y|ily)|D1_ERROR.*unavailable/i.test(message))
    return 'temporary';
  if(/no such (?:table|column)|has no column named|SQLITE_SCHEMA|schema has changed/i.test(message))
    return 'schema';
  if(/SQLITE_CONSTRAINT|constraint failed/i.test(message))return 'constraint';
  return 'unknown';
}
async function clerkStorage(stage,action){
  for(let attempt=0;attempt<2;attempt++){
    try{return await action();}
    catch(cause){
      const kind=clerkStorageKind(cause);
      // Contact UPSERTs and welcome claims are idempotent. Retry only known
      // transient D1 errors once; never retry a broken schema or constraint.
      if(kind==='temporary'&&attempt===0){
        await new Promise(resolve=>setTimeout(resolve,120));
        continue;
      }
      const error=new Error('Clerk storage operation failed.');
      error.clerkSyncStage=stage;
      error.clerkSyncKind=kind;
      throw error;
    }
  }
}
// Clerk is authoritative for verified account email. Never accept an email claimed by the browser.
// Provide safe status information for owner-initiated diagnostics without returning Clerk data.
export async function clerkEmailStatus(env,subject,force=false){
  if(!/^user_[A-Za-z0-9]+$/.test(subject))return 'invalid_subject';
  if(await clerkStorage('closure_read',()=>one(env,'SELECT 1 AS closed FROM lab_account_closures WHERE customer_id=?',subject)))return 'closed';
  // Verified new Clerk identity maps to an internal D1 wallet ID; never infer identity by email.
  const link=subject.startsWith('user_PvLabV2')
    ?await clerkStorage('identity_read',()=>one(env,"SELECT new_subject FROM lab_clerk_identity_links WHERE canonical_id=? AND kind='customer'",subject))
    :null;
  const studio=!!link&&subject==='user_PvLabV2'+link.new_subject.slice(5);
  const realSubject=studio?link.new_subject:subject;
  const secret=studio?env.LAB_CLERK_V2_SECRET_KEY:(env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY);
  if(!secret)return 'missing_key';
  const contact=await clerkStorage('contact_read',()=>one(env,'SELECT email,synced_at FROM lab_customer_contacts WHERE customer_id=?',subject));
  const ttl=contact?.email?86400000:5*60000; // Newly verified users can receive their welcome grant promptly.
  if(!force&&contact?.synced_at&&Date.now()-contact.synced_at<ttl)return 'cached';
  let response;
  try{
    // Workers does not support redirect:'error'. Use manual and never forward
    // the private Clerk key to a redirect target.
    response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(realSubject),{
      method:'GET',headers:{Authorization:'Bearer '+secret,Accept:'application/json'},redirect:'manual',
      signal:AbortSignal.timeout(8000)
    });
  }catch{return 'network_error';}
  if(response.status>=300&&response.status<400)return 'upstream_error';
  if(response.status===401||response.status===403)return 'invalid_key';
  if(response.status===404)return 'missing_user';
  if(response.status===429)return 'rate_limited';
  if(!response.ok)return 'upstream_error';
  const account=await response.json().catch(()=>null);
  if(account?.id!==realSubject||!Array.isArray(account.email_addresses))return 'invalid_response';
  const primary=account.email_addresses.find(item=>item.id===account.primary_email_address_id);
  const email=primary?.verification?.status==='verified'&&typeof primary.email_address==='string'&&
    primary.email_address.length<=254&&EMAIL.test(primary.email_address)?primary.email_address.toLowerCase():null;
  const t=Date.now();
  // If closure was accepted while the Clerk GET was in flight, never recreate
  // a deleted email or its verified status.
  await clerkStorage('contact_write',()=>run(env,`INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at)
    SELECT ?,?,?,? WHERE NOT EXISTS
      (SELECT 1 FROM lab_account_closures WHERE customer_id=?)
    ON CONFLICT(customer_id) DO UPDATE SET
      email=excluded.email,verified_at=excluded.verified_at,synced_at=excluded.synced_at
    WHERE NOT EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=excluded.customer_id)`,
    subject,email,email?t:null,t,subject));
  return email?'verified':'unverified';
}
export async function syncCustomerEmail(env,subject,options={}){
  const status=await clerkEmailStatus(env,subject,!!options.force);
  if(status==='verified'||status==='cached')await clerkStorage('welcome_grant',()=>grantVerifiedWelcome(env,subject));
  return options.details?{status}:['verified','unverified','cached'].includes(status);
}

// A bounded read-only Clerk API lookup with private, aggregate-only D1 diagnostics.
// The scheduled path never trusts client input and does not read OWNER_DB.
const CLERK_STATUS_NAMES=['verified','unverified','invalid_key','missing_user','rate_limited',
  'network_error','upstream_error','invalid_response','missing_key','invalid_subject','cached','storage_error'];
const CLERK_CRON_GAP_MS=45*60*1000;
function responseForOutcomes(outcomes,requested,checked,storage){
  return {
    requested,checked,synced:outcomes.verified+outcomes.unverified,
    verified:outcomes.verified,unverified:outcomes.unverified,
    issues:{
      invalidKey:outcomes.invalid_key,missingUser:outcomes.missing_user,
      transient:outcomes.rate_limited+outcomes.network_error+outcomes.upstream_error+outcomes.invalid_response,
      rateLimited:outcomes.rate_limited,networkError:outcomes.network_error,
      upstreamError:outcomes.upstream_error,invalidResponse:outcomes.invalid_response,
      missingKey:outcomes.missing_key,invalidSubject:outcomes.invalid_subject,
      storageError:outcomes.storage_error,
      storage:outcomes.storage_error?storage:null
    }
  };
}
async function diagnosticSnapshot(env){
  const row=await one(env,'SELECT checked_at,source,result_json FROM lab_clerk_sync_diagnostics WHERE id=1');
  if(!row)return null;
  let result=null;
  try{result=JSON.parse(row.result_json);}catch{return null;}
  return {...result,checkedAt:row.checked_at,source:row.source};
}
async function syncMissingClerkBatch(env,{source='scheduled',force=false}={}){
  if(!['owner','scheduled'].includes(source))throw Error('Unsupported Clerk sync source.');
  const prior=source==='scheduled'?await diagnosticSnapshot(env):null;
  if(source==='scheduled'&&prior?.checkedAt&&Date.now()-prior.checkedAt<CLERK_CRON_GAP_MS)return null;
  const t=Date.now(),freshness=source==='scheduled'?t-86400000:t-86400000;
  // Missing email records are eligible on the first attempt. The periodic job
  // respects a 24-hour per-contact interval, and the owner button bypasses it.
  const condition=source==='scheduled'
    ?'WHERE (p.synced_at IS NULL OR p.synced_at<?)'
    :'WHERE (p.email IS NULL OR p.synced_at IS NULL OR p.synced_at<?)';
  const candidates=await all(env,`SELECT c.id FROM lab_customers c
    LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
    ${condition} AND NOT EXISTS
      (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id)
    ORDER BY CASE WHEN p.synced_at IS NULL THEN 0 ELSE 1 END,COALESCE(p.synced_at,0),c.created_at DESC LIMIT 12`,
    freshness);
  const outcomes=Object.fromEntries(CLERK_STATUS_NAMES.map(name=>[name,0]));
  let checked=0,storageFailures=0;
  const storage={
    stages:Object.fromEntries(CLERK_STORAGE_STAGES.map(name=>[name,0])),
    kinds:Object.fromEntries(CLERK_STORAGE_KINDS.map(name=>[name,0]))
  };
  const missingSecret=!(env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY||env.LAB_CLERK_V2_SECRET_KEY);
  if(missingSecret){
    outcomes.missing_key=candidates.length?1:0;
  }else{
    for(const {id} of candidates){
      let status;
      try{({status}=await syncCustomerEmail(env,id,{force:force||source==='scheduled',details:true}));}
      catch(error){
        status='storage_error';
        const stage=CLERK_STORAGE_STAGES.includes(error?.clerkSyncStage)?error.clerkSyncStage:'unknown';
        const kind=CLERK_STORAGE_KINDS.includes(error?.clerkSyncKind)?error.clerkSyncKind:'unknown';
        storage.stages[stage]++;
        storage.kinds[kind]++;
      }
      if(Object.hasOwn(outcomes,status))outcomes[status]++;
      else outcomes.invalid_response++;
      checked++;
      // A single bad/stale contact must not block other customers. Stop after
      // two storage failures to bound load if the database itself is unhealthy.
      if(status==='storage_error'&&++storageFailures>=2)break;
      if(status==='invalid_key'||status==='rate_limited')break;
    }
  }
  const report=responseForOutcomes(outcomes,candidates.length,checked,storage);
  // Store only bounded counters. No customer IDs, emails, provider responses or secrets.
  await run(env,`INSERT INTO lab_clerk_sync_diagnostics(id,checked_at,source,result_json)
    VALUES(1,?,?,?) ON CONFLICT(id) DO UPDATE SET checked_at=excluded.checked_at,
    source=excluded.source,result_json=excluded.result_json`,
    t,source,JSON.stringify(report));
  return report;
}
// The existing five-minute Worker cron checks a small batch, at most once per
// 45 minutes, so historical missing customers can be repaired without a page visit.
export async function scheduledClerkBackfill(env){
  try{return await syncMissingClerkBatch(env,{source:'scheduled'});}
  catch{return null;}
}

export async function voucherCustomerRoute(request,env,subject){
  const path=new URL(request.url).pathname;
  if(path==='/api/customer/vouchers'&&request.method==='GET'){
    const redemptions=await all(env,`SELECT r.voucher_code AS code,v.credits,r.redeemed_at AS redeemedAt
      FROM lab_voucher_redemptions r JOIN lab_vouchers v ON v.code=r.voucher_code
      WHERE r.customer_id=? ORDER BY r.redeemed_at DESC LIMIT 20`,subject);
    return json({redemptions});
  }
  if(path==='/api/customer/vouchers/redeem'&&request.method==='POST'){
    const data=await payload(request),code=codeOf(data.code);
    if(!code)fail(400,'Enter a valid PV Lab voucher code.');
    const voucher=await one(env,'SELECT code,credits,max_redemptions AS maximum,redeemed_count AS used,expires_at AS expires,active FROM lab_vouchers WHERE code=? COLLATE NOCASE',code);
    if(!voucher)fail(409,'This voucher code was not found.');
    if(await one(env,'SELECT 1 AS claimed FROM lab_voucher_redemptions WHERE voucher_code=? COLLATE NOCASE AND customer_id=?',code,subject))
      fail(409,'You have already redeemed this voucher.');
    if(!voucher.active)fail(409,'This voucher has been deactivated.');
    if(voucher.expires!==null&&voucher.expires<=Date.now())
      fail(409,'This voucher has expired. Please ask for a renewed invitation.');
    if(voucher.used>=voucher.maximum)fail(409,'This voucher has reached its redemption limit.');
    try{await run(env,'INSERT INTO lab_voucher_redemptions(voucher_code,customer_id,redeemed_at) VALUES(?,?,?)',voucher.code,subject,Date.now());}
    catch(e){
      if(/unique constraint|voucher unavailable|account unavailable|foreign key constraint/i.test(String(e?.message||'')))
        fail(409,'This voucher cannot be redeemed for your account.');
      throw e;
    }
    const wallet=await one(env,'SELECT balance_credits AS balance FROM lab_customers WHERE id=?',subject);
    return json({redeemed:true,credits:voucher.credits,balanceCredits:wallet?.balance});
  }
  fail(404,'Unknown voucher endpoint.');
}

export async function requireOwner(env,owner){
  const row=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk' LIMIT 1").bind(owner).first();
  if(!row)fail(403,'PV Lab owner access required.');
}
// Owner-only, on-demand Clerk lookup. Profile names are not saved in D1 and
// an unavailable Clerk response must never hide the audited redemption record.
async function voucherRecipientProfile(env,subject){
  if(!/^user_[A-Za-z0-9]+$/.test(subject))return null;
  let realSubject=subject,secret=env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY;
  if(subject.startsWith('user_PvLabV2')){
    const link=await one(env,"SELECT new_subject FROM lab_clerk_identity_links WHERE canonical_id=? AND kind='customer'",subject);
    if(link&&subject==='user_PvLabV2'+link.new_subject.slice(5)){
      realSubject=link.new_subject;secret=env.LAB_CLERK_V2_SECRET_KEY;
    }
  }
  if(!secret)return null;
  try{
    const response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(realSubject),{
      method:'GET',headers:{Authorization:'Bearer '+secret,Accept:'application/json'},
      redirect:'manual',signal:AbortSignal.timeout(4000)
    });
    if(!response.ok)return null;
    const account=await response.json();
    if(account?.id!==realSubject||!Array.isArray(account.email_addresses))return null;
    const name=[account.first_name,account.last_name]
      .filter(value=>typeof value==='string'&&value.trim())
      .map(value=>value.trim()).join(' ').slice(0,120)||null;
    const primary=account.email_addresses.find(item=>item.id===account.primary_email_address_id);
    const email=primary?.verification?.status==='verified'&&typeof primary.email_address==='string'&&
      primary.email_address.length<=254&&EMAIL.test(primary.email_address)
      ?primary.email_address.toLowerCase():null;
    return {name,email};
  }catch{return null;}
}

export async function labAdminRoute(request,env,owner,{decryptKey,providerFetcher,providerClock}={}){
  await requireOwner(env,owner);
  const url=new URL(request.url),path=url.pathname,method=request.method;
  // This handler remains behind requireOwner above. No customer token can read media.
  if(path==='/api/admin/customers/review'||path==='/api/admin/customers/review-thumbnail')
    return ownerGenerationReviewRoute(request,env,owner);
  if(path==='/api/admin/traffic'&&method==='GET'){
    const days=Number(url.searchParams.get('days')||'7');
    return json(await labTrafficReport(env,{days}));
  }
  if(path==='/api/admin/acquisition'&&method==='GET'){
    // Derived from finance-only rows. Creative jobs and R2 outputs may be deleted.
    const costUsd=`CASE WHEN f.last_state IN ('draft','failed','unknown') THEN 0
      ELSE COALESCE(f.settled_cost_usd,f.estimated_microusd/1000000.0) END`;
    const days=Number(url.searchParams.get('days')||'7');
    if(days!==7&&days!==30)fail(400,'Choose 7 or 30 days.');
    const nowTime=Date.now(),today=new Date(nowTime).toISOString().slice(0,10);
    const start=new Date(Date.parse(today+'T00:00:00Z')-(days-1)*86400000).getTime();
    const end=Date.parse(today+'T00:00:00Z')+86400000;
    const [accounts,active,jobs,credits,checkouts,revenue,customers]=await Promise.all([
      one(env,'SELECT COUNT(*) AS n FROM lab_customers WHERE created_at>=? AND created_at<?',start,end),
      one(env,`SELECT COUNT(*) AS n FROM lab_customers c
        WHERE c.created_at>=? AND c.created_at<?
          AND EXISTS(SELECT 1 FROM lab_generation_finance f WHERE f.customer_id=c.id
            AND f.last_state IN ('completed','reconstructed_completed'))`,start,end),
      one(env,`SELECT COALESCE(SUM(${costUsd}),0) AS exposureUsd,
        COALESCE(SUM(CASE WHEN f.last_state IN ('completed','reconstructed_completed') THEN 1 ELSE 0 END),0) AS completedJobs,
        COALESCE(SUM(CASE WHEN f.deleted_at IS NOT NULL THEN 1 ELSE 0 END),0) AS archivedJobs,
        COALESCE(SUM(CASE WHEN f.last_state='reconstructed_completed' THEN 1 ELSE 0 END),0) AS reconstructedCompleted,
        COALESCE(SUM(CASE WHEN f.deleted_at IS NOT NULL THEN ${costUsd} ELSE 0 END),0) AS archivedExposureUsd
        FROM lab_generation_finance f JOIN lab_customers c ON c.id=f.customer_id
        WHERE f.created_at>=? AND f.created_at<?`,start,end),
      one(env,`SELECT COALESCE(SUM(CASE WHEN kind='generation' THEN -delta_credits
          WHEN kind='refund' THEN -delta_credits ELSE 0 END),0) AS netSpent
        FROM lab_credit_entries WHERE created_at>=? AND created_at<?`,start,end),
      one(env,`SELECT COUNT(*) AS starts,COALESCE(SUM(CASE WHEN paid_at IS NOT NULL THEN 1 ELSE 0 END),0) AS paid
        FROM lab_checkout_attempts WHERE created_at>=? AND created_at<?`,start,end),
      one(env,`SELECT COALESCE(SUM(amount_cents),0) AS cents
        FROM lab_revenue_events WHERE created_at>=? AND created_at<?`,start,end),
      all(env,`SELECT c.id,c.created_at AS joinedAt,c.balance_credits AS balanceCredits,p.email,
        EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id) AS accountClosed,
        COALESCE(j.totalJobs,0) AS totalJobs,COALESCE(j.completedJobs,0) AS completedJobs,
        COALESCE(j.failedJobs,0) AS failedJobs,COALESCE(j.providerExposureUsd,0) AS providerExposureUsd,
        COALESCE(j.archivedJobs,0) AS archivedJobs,
        COALESCE(j.reconstructedCompleted,0) AS reconstructedCompleted,
        COALESCE(j.archivedExposureUsd,0) AS archivedExposureUsd,
        j.lastCompletedAt,
        h.reason AS promoHoldReason,h.released_at AS promoHoldReleasedAt,
        (SELECT COUNT(*) FROM lab_credit_entries payment
          WHERE payment.customer_id=c.id AND payment.kind IN ('purchase','subscription')) AS verifiedPayments,
        COALESCE(e.creditsSpent,0) AS creditsSpent,
        COALESCE(e.welcomeCredits,0) AS welcomeCredits,
        COALESCE(ch.starts,0) AS checkoutStarts,
        COALESCE(rv.cents,0) AS revenueCents
        FROM lab_customers c
        LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
        LEFT JOIN lab_promo_generation_holds h ON h.customer_id=c.id
        LEFT JOIN (
          SELECT f.customer_id,COUNT(*) AS totalJobs,
            SUM(CASE WHEN f.last_state IN ('completed','reconstructed_completed') THEN 1 ELSE 0 END) AS completedJobs,
            SUM(CASE WHEN f.last_state='failed' THEN 1 ELSE 0 END) AS failedJobs,
            SUM(CASE WHEN f.deleted_at IS NOT NULL THEN 1 ELSE 0 END) AS archivedJobs,
            SUM(CASE WHEN f.last_state='reconstructed_completed' THEN 1 ELSE 0 END) AS reconstructedCompleted,
            SUM(CASE WHEN f.deleted_at IS NOT NULL THEN ${costUsd} ELSE 0 END) AS archivedExposureUsd,
            MAX(CASE WHEN f.last_state='completed' THEN f.updated_at END) AS lastCompletedAt,
            SUM(${costUsd}) AS providerExposureUsd
          FROM lab_generation_finance f GROUP BY f.customer_id
        ) j ON j.customer_id=c.id
        LEFT JOIN (
          SELECT customer_id,
            SUM(CASE WHEN kind='generation' THEN -delta_credits
              WHEN kind='refund' THEN -delta_credits ELSE 0 END) AS creditsSpent,
            SUM(CASE WHEN kind='adjustment' AND reference='welcome:'||customer_id
              THEN delta_credits ELSE 0 END) AS welcomeCredits
          FROM lab_credit_entries GROUP BY customer_id
        ) e ON e.customer_id=c.id
        LEFT JOIN (SELECT customer_id,COUNT(*) AS starts FROM lab_checkout_attempts GROUP BY customer_id)
          ch ON ch.customer_id=c.id
        LEFT JOIN (SELECT customer_id,SUM(amount_cents) AS cents FROM lab_revenue_events GROUP BY customer_id)
          rv ON rv.customer_id=c.id
        ORDER BY c.created_at DESC LIMIT 100`)
    ]);
    return json({days,from:new Date(start).toISOString().slice(0,10),to:today,
      summary:{
        newUsers:Number(accounts?.n)||0,activatedUsers:Number(active?.n)||0,
        completedJobs:Number(jobs?.completedJobs)||0,providerExposureUsd:Number(jobs?.exposureUsd)||0,
        archivedJobs:Number(jobs?.archivedJobs)||0,
        archivedExposureUsd:Number(jobs?.archivedExposureUsd)||0,
        reconstructedCompleted:Number(jobs?.reconstructedCompleted)||0,
        netCreditsSpent:Number(credits?.netSpent)||0,checkoutStarts:Number(checkouts?.starts)||0,
        checkoutPaid:Number(checkouts?.paid)||0,revenueCents:Number(revenue?.cents)||0
      },
      customers:customers.map(customer=>{
        const emailFlag=welcomeReviewFlag(customer.email,env);
        const persistentHold=!!customer.promoHoldReason&&customer.promoHoldReleasedAt===null;
        return {...customer,reviewFlag:emailFlag==='disposable-email'||persistentHold?'disposable-email':emailFlag,
          promoHeld:env.LAB_PROMO_HOLDS_ENABLED==='true'&&Number(customer.verifiedPayments)===0&&
            (emailFlag==='disposable-email'||persistentHold),
          activated:Number(customer.completedJobs)>0};
      }),
      notes:{
        cost:'Provider exposure survives gallery and prompt deletion. Uses settled cost when recorded, otherwise a reservation estimate; reconstructed historical values have no verified provider invoice. Failed jobs and unrecorded vendor charges are excluded.',
        checkout:'Checkout starts and euro revenue are recorded only after this release. Earlier Stripe sessions are not backfilled.',
        source:'Anonymous page-source aggregates cannot be joined to individual customers or used as unique visitor counts.'
      }});
  }
  if(path==='/api/admin/providers'&&method==='GET'){
    // Financial data is owner-only. This branch executes AFTER requireOwner, not customer auth.
    const [settings,wallet]=await Promise.all([
      one(env,'SELECT encrypted_key FROM settings WHERE owner_id=?',owner),
      one(env,'SELECT COALESCE(SUM(balance_credits),0) AS credits FROM lab_customers')
    ]);
    let ownerSpicyKey=null;
    if(settings?.encrypted_key&&typeof decryptKey==='function'){
      try{ownerSpicyKey=await decryptKey(env,settings.encrypted_key);}
      catch{ /* Never expose credential or decryption diagnostics to the browser. */ }
    }
    const report=await ownerProviderBalances(env,{
      ownerSpicyKey,customerWalletCredits:Number.isSafeInteger(Number(wallet?.credits))?String(wallet.credits):null,
      force:url.searchParams.get('refresh')==='1',
      ...(providerFetcher?{fetcher:providerFetcher}:{}),
      ...(providerClock?{clock:providerClock}:{})
    });
    return json(report);
  }
  if(path==='/api/admin/customers/activity'&&method==='GET'){
    // Private, read-only activity. Owner access was verified before entering this route.
    const customerId=(url.searchParams.get('customerId')||'').trim();
    if(!/^[A-Za-z0-9_-]{4,160}$/.test(customerId))fail(400,'Invalid customer account ID.');
    const customer=await one(env,`SELECT c.id,c.balance_credits AS balanceCredits,c.created_at AS joinedAt,p.email
      FROM lab_customers c LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
      WHERE c.id=?`,customerId);
    if(!customer)fail(404,'Customer not found.');
    const [jobCounts,creditTotals,jobs,entries,archivedFinance]=await Promise.all([
      one(env,`SELECT COUNT(*) AS totalJobs,
        COALESCE(SUM(CASE WHEN last_state IN ('completed','reconstructed_completed') THEN 1 ELSE 0 END),0) AS completedJobs,
        COALESCE(SUM(CASE WHEN last_state='failed' THEN 1 ELSE 0 END),0) AS failedJobs,
        COALESCE(SUM(CASE WHEN deleted_at IS NOT NULL THEN 1 ELSE 0 END),0) AS archivedJobs,
        COALESCE(SUM(CASE WHEN last_state='reconstructed_completed' THEN 1 ELSE 0 END),0) AS reconstructedCompleted,
        COALESCE(SUM(CASE WHEN last_state NOT IN ('draft','failed','unknown')
          THEN COALESCE(settled_cost_usd,estimated_microusd/1000000.0) ELSE 0 END),0) AS providerExposureUsd
        FROM lab_generation_finance WHERE customer_id=?`,customerId),
      one(env,`SELECT COALESCE(SUM(CASE WHEN kind='generation' THEN -delta_credits ELSE 0 END),0) AS creditsCharged,
        COALESCE(SUM(CASE WHEN kind='refund' THEN delta_credits ELSE 0 END),0) AS creditsRefunded
        FROM lab_credit_entries WHERE customer_id=?`,customerId),
      all(env,`SELECT j.id,j.params,j.state,j.created_at AS createdAt,j.updated_at AS updatedAt,
        COALESCE((SELECT -SUM(e.delta_credits) FROM lab_credit_entries e
          WHERE e.customer_id=? AND e.kind='generation' AND e.reference='job:'||j.id),0) AS chargedCredits,
        COALESCE((SELECT SUM(e.delta_credits) FROM lab_credit_entries e
          WHERE e.customer_id=? AND e.kind='refund' AND e.reference='refund:job:'||j.id),0) AS refundedCredits
        FROM jobs j WHERE j.owner_id=? ORDER BY j.created_at DESC,j.id DESC LIMIT 50`,customerId,customerId,customerId),
      all(env,`SELECT kind,delta_credits AS credits,reference,created_at AS createdAt
        FROM lab_credit_entries WHERE customer_id=? ORDER BY created_at DESC,id DESC LIMIT 80`,customerId),
      all(env,`SELECT job_id AS jobId,created_at AS createdAt,last_state AS state,
        provider,tool_kind AS type,origin,
        CASE WHEN last_state IN ('draft','failed','unknown') THEN 0
          ELSE COALESCE(settled_cost_usd,estimated_microusd/1000000.0) END AS exposureUsd,
        CASE WHEN settled_cost_usd IS NOT NULL THEN 'settled' ELSE 'estimate' END AS costKind
        FROM lab_generation_finance WHERE customer_id=? AND deleted_at IS NOT NULL
        ORDER BY created_at DESC,job_id DESC LIMIT 50`,customerId)
    ]);
    // Return only curated metadata. Never expose prompts, reference URLs or private media.
    const safe=value=>typeof value==='string'?value.slice(0,120):'';
    const history=jobs.map(({params,...job})=>{
      let p={};try{p=JSON.parse(params||'{}');}catch{/* Legacy malformed settings */ }
      if(!p||typeof p!=='object'||Array.isArray(p))p={};
      return {...job,type:p.mode==='upscale'?'upscale':safe(p.type),model:safe(p.model),
        engine:safe(p.engine),provider:safe(p.provider)};
    });
    const descriptions={purchase:'Credit purchase',subscription:'Subscription credits',
      generation:'Generation charge',refund:'Generation refund',adjustment:'Credit adjustment'};
    return json({customer,summary:{
      totalJobs:Number(jobCounts?.totalJobs)||0,completedJobs:Number(jobCounts?.completedJobs)||0,
      failedJobs:Number(jobCounts?.failedJobs)||0,
      archivedJobs:Number(jobCounts?.archivedJobs)||0,
      reconstructedCompleted:Number(jobCounts?.reconstructedCompleted)||0,
      providerExposureUsd:Number(jobCounts?.providerExposureUsd)||0,
      creditsCharged:Number(creditTotals?.creditsCharged)||0,
      creditsRefunded:Number(creditTotals?.creditsRefunded)||0,
      netCreditsSpent:(Number(creditTotals?.creditsCharged)||0)-(Number(creditTotals?.creditsRefunded)||0)
    },jobs:history,archivedFinance,entries:entries.map(e=>({createdAt:e.createdAt,credits:e.credits,kind:e.kind,
      description:e.kind==='adjustment'&&e.reference?.startsWith('welcome:')?'Welcome credits':
        e.kind==='adjustment'&&e.reference?.startsWith('voucher:')?'Voucher credits':
        e.kind==='adjustment'&&e.reference?.startsWith('referral:')?'Referral credits':
        descriptions[e.kind]||'Credit movement'})),
      limits:{jobs:50,entries:80,archivedFinance:50}});
  }
  if(path==='/api/admin/vouchers/redemptions'&&method==='GET'){
    const code=codeOf(url.searchParams.get('code'));
    const rawOffset=url.searchParams.get('offset')||'0',offset=Number(rawOffset);
    if(!code||!/^\d{1,4}$/.test(rawOffset)||!Number.isSafeInteger(offset)||offset>1000)
      fail(400,'Choose a valid voucher and page.');
    const voucher=await one(env,'SELECT code FROM lab_vouchers WHERE code=? COLLATE NOCASE',code);
    if(!voucher)fail(404,'Voucher not found.');
    const claims=await all(env,`SELECT r.customer_id AS customerId,r.redeemed_at AS redeemedAt,
        CASE WHEN x.customer_id IS NULL THEN p.email ELSE NULL END AS email,
        CASE WHEN x.customer_id IS NULL THEN 0 ELSE 1 END AS accountClosed
      FROM lab_voucher_redemptions r
      LEFT JOIN lab_customer_contacts p ON p.customer_id=r.customer_id
      LEFT JOIN lab_account_closures x ON x.customer_id=r.customer_id
      WHERE r.voucher_code=? COLLATE NOCASE
      ORDER BY r.redeemed_at DESC,r.customer_id LIMIT 11 OFFSET ?`,voucher.code,offset);
    const page=claims.slice(0,10);
    const redemptions=await Promise.all(page.map(async claim=>{
      const identity=claim.accountClosed?null:await voucherRecipientProfile(env,claim.customerId);
      return {customerId:claim.customerId,redeemedAt:claim.redeemedAt,
        accountClosed:!!claim.accountClosed,name:identity?.name||null,
        email:claim.email||identity?.email||null};
    }));
    return json({code:voucher.code,redemptions,hasMore:claims.length>10,nextOffset:offset+page.length});
  }
  if(path==='/api/admin/overview'&&method==='GET'){
    const search=(url.searchParams.get('search')||'').trim().slice(0,80),match='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
    const summary=await one(env,`SELECT COUNT(*) AS totalAccounts,
      COALESCE(SUM(CASE WHEN NOT EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=lab_customers.id) THEN 1 ELSE 0 END),0) AS accounts,
      (SELECT COUNT(DISTINCT customer_id) FROM lab_credit_entries WHERE kind IN ('purchase','subscription')) AS payingCustomers,
      (SELECT COUNT(*) FROM lab_subscriptions WHERE status IN ('active','trialing')) AS activeSubscriptions,
      (SELECT COUNT(*) FROM lab_voucher_redemptions) AS voucherClaims,
      (SELECT COUNT(*) FROM lab_referrals WHERE rewarded_at IS NOT NULL) AS rewardedReferrals
      FROM lab_customers`);
    const customers=await all(env,`SELECT c.id,c.balance_credits AS balanceCredits,c.created_at AS joinedAt,
        EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id) AS accountClosed,
        p.email,COALESCE(s.plan_id,'') AS plan,COALESCE(s.status,'none') AS subscription,
        (SELECT COUNT(*) FROM lab_credit_entries e WHERE e.customer_id=c.id AND e.kind IN ('purchase','subscription')) AS verifiedPayments,
        (SELECT MAX(e.created_at) FROM lab_credit_entries e WHERE e.customer_id=c.id AND e.kind IN ('purchase','subscription')) AS lastPaidAt
      FROM lab_customers c LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
      LEFT JOIN lab_subscriptions s ON s.customer_id=c.id
      WHERE (?='' OR c.id LIKE ? ESCAPE '\\' OR p.email LIKE ? ESCAPE '\\')
      ORDER BY c.created_at DESC LIMIT 80`,search,match,match);
    const payments=await all(env,`SELECT e.customer_id AS customerId,p.email,e.kind,e.delta_credits AS credits,
      e.reference,e.created_at AS paidAt
      FROM lab_credit_entries e LEFT JOIN lab_customer_contacts p ON p.customer_id=e.customer_id
      WHERE e.kind IN ('purchase','subscription')
      ORDER BY e.created_at DESC LIMIT 50`);
    const referrals=await all(env,`SELECT r.referrer_customer_id AS referrerId,a.email AS referrerEmail,
      r.referred_customer_id AS invitedId,b.email AS invitedEmail,r.attributed_at AS joinedAt,r.rewarded_at AS rewardedAt
      FROM lab_referrals r LEFT JOIN lab_customer_contacts a ON a.customer_id=r.referrer_customer_id
      LEFT JOIN lab_customer_contacts b ON b.customer_id=r.referred_customer_id
      ORDER BY r.attributed_at DESC LIMIT 50`);
    const vouchers=await all(env,`SELECT code,credits,max_redemptions AS maxRedemptions,redeemed_count AS redemptionCount,
      active,expires_at AS expiresAt,created_at AS createdAt,note
      FROM lab_vouchers ORDER BY created_at DESC LIMIT 60`);
    const clerkSyncDiagnostic=await diagnosticSnapshot(env);
    return json({summary,customers,payments,referrals,
      vouchers:vouchers.map(v=>({...v,url:voucherLink(env,v.code,request.headers.get('Origin')||'')})),
      emailSyncConfigured:!!(env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY||env.LAB_CLERK_V2_SECRET_KEY),
      clerkSyncDiagnostic,
      resultLimit:80});
  }
  if(path==='/api/admin/vouchers'&&method==='POST'){
    const data=await payload(request);
    const credits=Number(data.credits),maximum=Number(data.maxRedemptions),note=typeof data.note==='string'?data.note.trim():'';
    const expiresAt=data.expiresAt===null||data.expiresAt===''||data.expiresAt===undefined?null:Number(data.expiresAt);
    if(!Number.isSafeInteger(credits)||credits<1||credits>20000)fail(400,'Choose 1 to 20,000 credits.');
    if(!Number.isSafeInteger(maximum)||maximum<1||maximum>1000)fail(400,'Choose 1 to 1,000 redemptions.');
    if(note.length>160)fail(400,'Note must be 160 characters or less.');
    if(expiresAt!==null&&(!Number.isSafeInteger(expiresAt)||expiresAt<=Date.now()||expiresAt>Date.now()+366*86400000))
      fail(400,'Choose a future expiration within one year.');
    if(data.code!==undefined&&data.code!==''&&!codeOf(data.code))fail(400,'Use 6 to 24 letters, numbers or hyphens.');
    const chosen=codeOf(data.code),t=Date.now();
    for(let attempt=0;attempt<(chosen?1:5);attempt++){
      const code=chosen||newCode();
      try {
        await run(env,`INSERT INTO lab_vouchers(code,credits,max_redemptions,redeemed_count,active,expires_at,note,created_at,created_by)
          VALUES(?,?,?,0,1,?,?,?,?)`,code,credits,maximum,expiresAt,note,t,owner);
        return json({voucher:{code,credits,maxRedemptions:maximum,expiresAt,note,url:voucherLink(env,code,request.headers.get('Origin')||'')}},201);
      }catch(e){
        if(/unique constraint/i.test(String(e?.message||''))){if(chosen)fail(409,'That voucher code already exists.');continue;}
        throw e;
      }
    }
    fail(503,'Could not create a unique voucher. Please try again.');
  }
  // The owner may restore an expired, still-active voucher without issuing credits.
  // Existing redemption caps and each recipient's one-time claim remain unchanged.
  if(path==='/api/admin/vouchers/restore'&&method==='POST'){
    const data=await payload(request),code=codeOf(data.code);
    if(!code)fail(400,'Invalid voucher code.');
    const restored=await run(env,`UPDATE lab_vouchers SET expires_at=NULL
      WHERE code=? COLLATE NOCASE AND active=1 AND expires_at IS NOT NULL
        AND expires_at<=? AND redeemed_count<max_redemptions`,code,Date.now());
    if(!restored.meta?.changes)
      fail(409,'Only expired, active vouchers with unused redemptions can be restored.');
    return json({restored:true,code,expiresAt:null});
  }
  if(path==='/api/admin/vouchers/deactivate'&&method==='POST'){
    const data=await payload(request),code=codeOf(data.code);
    if(!code)fail(400,'Invalid voucher code.');
    const result=await run(env,'UPDATE lab_vouchers SET active=0 WHERE code=? COLLATE NOCASE AND active=1',code);
    if(!result.meta?.changes)fail(409,'Voucher is not active or does not exist.');
    return json({deactivated:true});
  }
  if(path==='/api/admin/customers/sync'&&method==='POST'){
    const report=await syncMissingClerkBatch(env,{source:'owner',force:true});
    return json(report);
  }
  fail(404,'Unknown owner endpoint.');
}
