import {ownerProviderBalances} from './owner-providers.mjs';
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
export function voucherLink(env,code){
  const base=new URL(env.LAB_PUBLIC_APP_URL||'https://parallelvisionlabel.com/lab/studio.html');
  if(base.protocol!=='https:'||base.username||base.password)fail(503,'PV Lab URL is not configured.');
  const link=new URL('account.html',base);
  link.searchParams.set('voucher',code);
  link.hash='voucher';
  return link.href;
}

// Clerk is authoritative for verified account email. Never accept an email claimed by the browser.
// Provide safe status information for owner-initiated diagnostics without returning Clerk data.
async function clerkEmailStatus(env,subject,force=false){
  const secret=env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY;
  if(!secret)return 'missing_key';
  if(!/^user_[A-Za-z0-9]+$/.test(subject))return 'invalid_subject';
  const contact=await one(env,'SELECT email,synced_at FROM lab_customer_contacts WHERE customer_id=?',subject);
  const ttl=contact?.email?86400000:7*86400000;
  if(!force&&contact?.synced_at&&Date.now()-contact.synced_at<ttl)return 'cached';
  let response;
  try{
    response=await fetch('https://api.clerk.com/v1/users/'+encodeURIComponent(subject),{
      headers:{Authorization:'Bearer '+secret,Accept:'application/json'},redirect:'error',
      signal:AbortSignal.timeout(8000)
    });
  }catch{return 'network_error';}
  if(response.status===401||response.status===403)return 'invalid_key';
  if(response.status===404)return 'missing_user';
  if(response.status===429)return 'rate_limited';
  if(!response.ok)return 'upstream_error';
  const account=await response.json().catch(()=>null);
  if(account?.id!==subject||!Array.isArray(account.email_addresses))return 'invalid_response';
  const primary=account.email_addresses.find(item=>item.id===account.primary_email_address_id);
  const email=primary?.verification?.status==='verified'&&typeof primary.email_address==='string'&&
    primary.email_address.length<=254&&EMAIL.test(primary.email_address)?primary.email_address.toLowerCase():null;
  const t=Date.now();
  await run(env,`INSERT INTO lab_customer_contacts(customer_id,email,verified_at,synced_at)
    VALUES(?,?,?,?)
    ON CONFLICT(customer_id) DO UPDATE SET email=excluded.email,verified_at=excluded.verified_at,synced_at=excluded.synced_at`,
    subject,email,email?t:null,t);
  return email?'verified':'unverified';
}
export async function syncCustomerEmail(env,subject,options={}){
  const status=await clerkEmailStatus(env,subject,!!options.force);
  return options.details?{status}:['verified','unverified','cached'].includes(status);
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
    if(!voucher||!voucher.active||voucher.expires&&voucher.expires<=Date.now()||voucher.used>=voucher.maximum)
      fail(409,'This voucher is unavailable or has expired.');
    if(await one(env,'SELECT 1 AS claimed FROM lab_voucher_redemptions WHERE voucher_code=? COLLATE NOCASE AND customer_id=?',code,subject))
      fail(409,'You have already redeemed this voucher.');
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

async function requireOwner(env,owner){
  const row=await env.OWNER_DB.prepare("SELECT id FROM users WHERE id=? AND role='owner' AND auth_provider='clerk' LIMIT 1").bind(owner).first();
  if(!row)fail(403,'PV Lab owner access required.');
}
export async function labAdminRoute(request,env,owner,{decryptKey,providerFetcher,providerClock}={}){
  await requireOwner(env,owner);
  const url=new URL(request.url),path=url.pathname,method=request.method;
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
  if(path==='/api/admin/overview'&&method==='GET'){
    const search=(url.searchParams.get('search')||'').trim().slice(0,80),match='%'+search.replace(/[\\%_]/g,'\\$&')+'%';
    const summary=await one(env,`SELECT COUNT(*) AS accounts,
      (SELECT COUNT(DISTINCT customer_id) FROM lab_credit_entries WHERE kind IN ('purchase','subscription')) AS payingCustomers,
      (SELECT COUNT(*) FROM lab_subscriptions WHERE status IN ('active','trialing')) AS activeSubscriptions,
      (SELECT COUNT(*) FROM lab_voucher_redemptions) AS voucherClaims,
      (SELECT COUNT(*) FROM lab_referrals WHERE rewarded_at IS NOT NULL) AS rewardedReferrals
      FROM lab_customers`);
    const customers=await all(env,`SELECT c.id,c.balance_credits AS balanceCredits,c.created_at AS joinedAt,
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
    return json({summary,customers,payments,referrals,
      vouchers:vouchers.map(v=>({...v,url:voucherLink(env,v.code)})),
      emailSyncConfigured:!!(env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY),
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
        return json({voucher:{code,credits,maxRedemptions:maximum,expiresAt,note,url:voucherLink(env,code)}},201);
      }catch(e){
        if(/unique constraint/i.test(String(e?.message||''))){if(chosen)fail(409,'That voucher code already exists.');continue;}
        throw e;
      }
    }
    fail(503,'Could not create a unique voucher. Please try again.');
  }
  if(path==='/api/admin/vouchers/deactivate'&&method==='POST'){
    const data=await payload(request),code=codeOf(data.code);
    if(!code)fail(400,'Invalid voucher code.');
    const result=await run(env,'UPDATE lab_vouchers SET active=0 WHERE code=? COLLATE NOCASE AND active=1',code);
    if(!result.meta?.changes)fail(409,'Voucher is not active or does not exist.');
    return json({deactivated:true});
  }
  if(path==='/api/admin/customers/sync'&&method==='POST'){
    if(!(env.LAB_CLERK_SECRET_KEY||env.CLERK_SECRET_KEY))fail(503,'Clerk email sync needs a private Worker secret.');
    const candidates=await all(env,`SELECT c.id FROM lab_customers c LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
      WHERE p.email IS NULL OR p.synced_at IS NULL OR p.synced_at<?
      ORDER BY CASE WHEN p.synced_at IS NULL THEN 0 ELSE 1 END,COALESCE(p.synced_at,0),c.created_at DESC LIMIT 12`,Date.now()-86400000);
    const outcomes={verified:0,unverified:0,invalid_key:0,missing_user:0,rate_limited:0,network_error:0,upstream_error:0,invalid_response:0,missing_key:0,invalid_subject:0};
    let checked=0;
    for(const {id} of candidates){
      const {status}=await syncCustomerEmail(env,id,{force:true,details:true});
      outcomes[status]=(outcomes[status]||0)+1;
      checked++;
      // Stop when the key is rejected or the upstream API asks us to slow down.
      if(status==='invalid_key'||status==='rate_limited')break;
    }
    return json({requested:candidates.length,checked,synced:outcomes.verified+outcomes.unverified,
      verified:outcomes.verified,unverified:outcomes.unverified,
      issues:{invalidKey:outcomes.invalid_key,missingUser:outcomes.missing_user,
        transient:outcomes.rate_limited+outcomes.network_error+outcomes.upstream_error+outcomes.invalid_response,
        missingKey:outcomes.missing_key,invalidSubject:outcomes.invalid_subject}});

  }
  fail(404,'Unknown owner endpoint.');
}
