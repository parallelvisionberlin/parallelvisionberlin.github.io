import {ensureCustomer,isLabCustomer} from './customer-billing.mjs';
import {LEGACY_ISSUER,STUDIO_ISSUER} from './clerk-issuer-policy.mjs';
import {rejectDeletedStudioSubject} from './studio-identity-deletion.mjs';
import {queueSignupWelcome} from './signup-welcome-email.mjs';

// Account linking requires TWO separately authenticated Clerk sessions. The old
// session generates a high-entropy single-use code; only a logged-in new session
// can redeem it. Neither email address nor an unsigned account ID is trusted.
const LIFE_MS=10*60*1000;
const CODE=/^[A-Za-z0-9_-]{43}$/;
const SUBJECT=/^user_[A-Za-z0-9]+$/;
const response=(data,status=200)=>new Response(JSON.stringify(data),{
  status,headers:{'Content-Type':'application/json','Cache-Control':'no-store'}
});
function fail(status,message){const error=Error(message);error.status=status;throw error;}
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
function randomCode(){
  return btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(32))))
    .replace(/\+/g,'-').replace(/\//g,'_').replace(/=+$/,'');
}
async function codeHash(code){
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(code));
  return Array.from(new Uint8Array(digest),x=>x.toString(16).padStart(2,'0')).join('');
}
async function readCode(request){
  if(!request.headers.get('content-type')?.startsWith('application/json'))fail(415,'Send JSON.');
  const raw=await request.text();
  if(raw.length>256)fail(413,'Invalid transfer code.');
  let value;try{value=JSON.parse(raw);}catch{fail(400,'Invalid transfer code.');}
  if(!CODE.test(value?.code||''))fail(400,'Invalid transfer code.');
  return value.code;
}
// Linked records are namespaced independently of the old Clerk subject. The
// original customer/owner canonical ID is preserved, so existing R2 objects,
// credits, Stripe customer, vouchers and jobs remain in place.
export async function linkedStudioIdentity(env,subject){
  if(!SUBJECT.test(subject))fail(401,'Invalid PV LAB account.');
  return one(env,'SELECT canonical_id,kind FROM lab_clerk_identity_links WHERE new_subject=?',subject);
}
// A freshly auto-created V2 trial may later be linked to its original account
// with the *same* verified two-session, one-time code. The trial must be unused:
// never strand paid work, an existing gallery, a subscription or customer credits.
function ownNewCustomer(identity){
  return identity.issuer===STUDIO_ISSUER&&identity.kind==='customer'&&
    identity.id==='user_PvLabV2'+identity.subject.slice(5);
}
async function disposableTrial(env,identity){
  if(!ownNewCustomer(identity))return false;
  if(await one(env,'SELECT 1 AS closed FROM lab_account_closures WHERE customer_id=?',identity.id))return false;
  const id=identity.id;
  const wallet=await one(env,'SELECT balance_credits,stripe_customer_id FROM lab_customers WHERE id=?',id);
  if(!wallet||![0,200].includes(wallet.balance_credits)||wallet.stripe_customer_id)return false;
  const counts=await one(env,`
    SELECT
      (SELECT COUNT(*) FROM lab_credit_entries WHERE customer_id=?) AS entries,
      (SELECT COUNT(*) FROM lab_credit_entries WHERE customer_id=? AND reference=? AND delta_credits=200 AND kind='adjustment') AS welcome,
      (SELECT COUNT(*) FROM jobs WHERE owner_id=?) AS jobs,
      (SELECT COUNT(*) FROM assets WHERE owner_id=?) AS assets,
      (SELECT COUNT(*) FROM quotes WHERE owner_id=?) AS quotes,
      (SELECT COUNT(*) FROM packs WHERE owner_id=?) AS packs,
      (SELECT COUNT(*) FROM moodboards WHERE owner_id=?) AS moods,
      (SELECT COUNT(*) FROM lab_subscriptions WHERE customer_id=?) AS subscriptions
  `,id,id,'welcome:'+id,id,id,id,id,id,id);
  // An unspent wallet can have its verified welcome grant or zero credits pending verification.
  const cleanWallet=wallet.balance_credits===0?counts?.entries===0
    :counts?.entries===1&&counts.welcome===1;
  return !!cleanWallet&&
    !counts.jobs&&!counts.assets&&!counts.quotes&&!counts.packs&&!counts.moods&&!counts.subscriptions;
}

export async function migrationRoute(request,env,identity){
  const path=new URL(request.url).pathname,method=request.method;
  const old=identity.issuer===LEGACY_ISSUER,studio=identity.issuer===STUDIO_ISSUER;
  if(path==='/api/migration/status'&&method==='GET')
    return response({oldDomain:old,linked:!!identity.id,
      kind:identity.kind||null,transferAvailable:old&&!!identity.id,
      relinkEligible:studio&&await disposableTrial(env,identity)});
  if(path==='/api/migration/issue'&&method==='POST'){
    if(!old||!identity.id||!['owner','customer'].includes(identity.kind))
      fail(403,'Sign in on the original PV LAB site to request a transfer code.');
    if(identity.kind==='customer'&&await one(env,'SELECT 1 FROM lab_account_closures WHERE customer_id=?',identity.id))
      fail(403,'This PV LAB account has been closed and cannot be transferred.');
    const code=randomCode(),hash=await codeHash(code),now=Date.now();
    await env.LAB_DB.batch([
      env.LAB_DB.prepare('DELETE FROM lab_clerk_migration_codes WHERE canonical_id=?').bind(identity.id),
      env.LAB_DB.prepare(
        'INSERT INTO lab_clerk_migration_codes(code_hash,canonical_id,kind,created_at,expires_at) VALUES(?,?,?,?,?)'
      ).bind(hash,identity.id,identity.kind,now,now+LIFE_MS)
    ]);
    return response({code,expiresAt:now+LIFE_MS,linkUrl:'https://pvlab.studio/connect-account.html'});
  }
  if(path==='/api/migration/new'&&method==='POST'){
    if(!studio||identity.id)fail(409,'This account has already been set up.');
    if(!SUBJECT.test(identity.subject))fail(401,'Invalid identity.');
    await rejectDeletedStudioSubject(env,identity.subject);
    const id='user_PvLabV2'+identity.subject.slice(5),t=Date.now();
    const result=await run(env,
      "INSERT OR IGNORE INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at) VALUES(?,?,'customer',?)",
      identity.subject,id,t);
    if(result.meta?.changes!==1)fail(409,'This account has already been set up.');
    await ensureCustomer(env,id); // Existing credit campaign remains independent.
    // One-time operational welcome, not on sign-in or migrated older accounts.
    // Never let an optional email block successful customer onboarding.
    if(env.LAB_WELCOME_EMAIL_ENABLED==='true')
      try{await queueSignupWelcome(env,id);}catch{/* Cron handles queued entries; signup stays successful. */}
    return response({linked:true,kind:'customer'},201);
  }
  if(path==='/api/migration/redeem'&&method==='POST'){
    const trial=identity.id&&await disposableTrial(env,identity);
    if(!studio||(identity.id&&!trial))fail(409,'This account already has work or is linked. Contact support before transferring an older account.');
    await rejectDeletedStudioSubject(env,identity.subject);
    const code=await readCode(request),hash=await codeHash(code),t=Date.now();
    const ticket=await one(env,
      'SELECT canonical_id,kind FROM lab_clerk_migration_codes WHERE code_hash=? AND expires_at>?',hash,t);
    if(!ticket)fail(400,'This transfer code is invalid or expired. Generate a new code from the original site.');
    if(ticket.kind==='customer'){
      if(!await isLabCustomer(env,ticket.canonical_id))fail(403,'Original customer account is unavailable.');
      if(await one(env,'SELECT 1 FROM lab_account_closures WHERE customer_id=?',ticket.canonical_id))
        fail(403,'This PV LAB account has been closed and cannot be restored.');
    }else if(ticket.kind==='owner'){
      const owner=await env.OWNER_DB.prepare(
        "SELECT id FROM users WHERE id=? AND auth_provider='clerk' AND role='owner' LIMIT 1"
      ).bind(ticket.canonical_id).first();
      if(!owner)fail(403,'The original owner account is no longer authorized.');
    }else fail(400,'Invalid account type.');
    const safeRelink=trial
      ? env.LAB_DB.prepare(
        "UPDATE lab_clerk_identity_links SET canonical_id=?,kind=? WHERE new_subject=? AND canonical_id=? AND kind='customer' "+
        "AND EXISTS (SELECT 1 FROM lab_customers c WHERE c.id=? AND c.stripe_customer_id IS NULL AND "+
        "((c.balance_credits=0 AND NOT EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=c.id)) OR "+
        "(c.balance_credits=200 AND (SELECT COUNT(*) FROM lab_credit_entries e WHERE e.customer_id=c.id)=1 "+
        "AND EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=c.id AND e.reference=? AND e.kind='adjustment' AND e.delta_credits=200)))) "+
        "AND NOT EXISTS (SELECT 1 FROM jobs WHERE owner_id=?) "+
        "AND NOT EXISTS (SELECT 1 FROM assets WHERE owner_id=?) "+
        "AND NOT EXISTS (SELECT 1 FROM quotes WHERE owner_id=?) "+
        "AND NOT EXISTS (SELECT 1 FROM packs WHERE owner_id=?) "+
        "AND NOT EXISTS (SELECT 1 FROM moodboards WHERE owner_id=?) "+
        "AND NOT EXISTS (SELECT 1 FROM lab_subscriptions WHERE customer_id=?)"
      ).bind(ticket.canonical_id,ticket.kind,identity.subject,identity.id,
        identity.id,'welcome:'+identity.id,
        identity.id,identity.id,identity.id,identity.id,identity.id,identity.id)
      : env.LAB_DB.prepare(
        'INSERT OR IGNORE INTO lab_clerk_identity_links(new_subject,canonical_id,kind,created_at) '+
        'SELECT ?,canonical_id,kind,? FROM lab_clerk_migration_codes WHERE code_hash=? AND expires_at>?'
      ).bind(identity.subject,t,hash,t);
    const results=await env.LAB_DB.batch([
      safeRelink,
      env.LAB_DB.prepare('DELETE FROM lab_clerk_migration_codes WHERE code_hash=?').bind(hash)
    ]);
    if(results[0]?.meta?.changes!==1)
      fail(409,'This account was already linked or the transfer code has been used.');
    return response({linked:true,kind:ticket.kind});
  }
  fail(404,'Unknown account transfer route.');
}
