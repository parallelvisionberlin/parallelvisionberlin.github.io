// PV LAB-only verified welcome-credit protection. Never modify Clerk sign-in
// or Nina's owner records. Existing credit receipts and paid balances remain.
const KNOWN_DISPOSABLE_DOMAINS=new Set(['yournike.com','weekprime.com']);
const first=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const rows=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;
const execute=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const subjectPattern=/^user_[A-Za-z0-9]+$/;
export function normalizeWelcomeEmail(input){
  if(typeof input!=='string'||input.length>254)return '';
  const email=input.trim().toLowerCase(),split=email.lastIndexOf('@');
  if(split<=0||split===email.length-1)return '';
  let local=email.slice(0,split),domain=email.slice(split+1);
  if(!/^[a-z0-9.-]+$/.test(domain)||!local)return '';
  if(domain==='gmail.com'||domain==='googlemail.com'){
    domain='gmail.com';
    local=local.split('+')[0].replace(/\./g,'');
  }
  return local?local+'@'+domain:'';
}
export function welcomeReviewFlag(email,env={}){
  const normalized=normalizeWelcomeEmail(email);
  if(!normalized)return 'unverified';
  const domain=normalized.slice(normalized.lastIndexOf('@')+1);
  const more=String(env.LAB_WELCOME_BLOCKED_DOMAINS||'').toLowerCase().split(',')
    .map(value=>value.trim()).filter(Boolean);
  return KNOWN_DISPOSABLE_DOMAINS.has(domain)||more.includes(domain)?'disposable-email':'';
}
async function emailKey(env,normalizedEmail){
  // A stable keyed digest, not an unkeyed email hash that can be dictionary-attacked.
  if(typeof env.LAB_SECRET!=='string'||env.LAB_SECRET.length<40)return '';
  const key=await crypto.subtle.importKey('raw',new TextEncoder().encode(env.LAB_SECRET),
    {name:'HMAC',hash:'SHA-256'},false,['sign']);
  const result=new Uint8Array(await crypto.subtle.sign('HMAC',key,
    new TextEncoder().encode('pvlab-welcome-v1:'+normalizedEmail)));
  return Array.from(result,b=>b.toString(16).padStart(2,'0')).join('');
}
// A legacy welcome grant might predate email-keyed claims. Preserve the
// verified normalized email as a keyed digest before removing its contact row.
// The account closure blocks a second award by the INSERT trigger.
export async function preserveClosedWelcomeClaim(env,subject){
  if(!subjectPattern.test(subject))return false;
  const gift=await first(env,'SELECT 1 AS found FROM lab_credit_entries WHERE customer_id=? AND reference=?',
    subject,'welcome:'+subject);
  if(!gift)return true;
  if(await first(env,'SELECT 1 AS found FROM lab_welcome_claims WHERE customer_id=?',subject))return true;
  const contact=await first(env,`SELECT email FROM lab_customer_contacts
    WHERE customer_id=? AND verified_at IS NOT NULL AND email IS NOT NULL`,subject);
  const normalized=normalizeWelcomeEmail(contact?.email);
  if(!normalized)return false; // No recoverable verified identity for this historical gift.
  const key=await emailKey(env,normalized);
  if(!key)throw Error('Verified welcome-claim protection is not configured.');
  await execute(env,`INSERT OR IGNORE INTO lab_welcome_claims(email_key,customer_id,claimed_at)
    SELECT ?,?,? WHERE EXISTS(SELECT 1 FROM lab_account_closures WHERE customer_id=?)`,
    key,subject,Date.now(),subject);
  return !!await first(env,'SELECT 1 AS found FROM lab_welcome_claims WHERE email_key=?',key);
}

export async function grantVerifiedWelcome(env,subject){
  if(env.LAB_WELCOME_CREDITS_ENABLED!=='true'||!subjectPattern.test(subject))return false;
  const contact=await first(env,`SELECT email FROM lab_customer_contacts
    WHERE customer_id=? AND email IS NOT NULL AND verified_at IS NOT NULL`,subject);
  const normalized=normalizeWelcomeEmail(contact?.email);
  if(!normalized||welcomeReviewFlag(normalized,env))return false;
  const key=await emailKey(env,normalized);
  if(!key)return false; // Defer a free bonus rather than issue unbounded grants.
  const old=await first(env,`SELECT customer_id FROM lab_welcome_claims WHERE email_key=?`,key);
  if(old)return old.customer_id===subject;
  const prior=await first(env,`SELECT 1 AS ok FROM lab_credit_entries
    WHERE customer_id=? AND reference=?`,subject,'welcome:'+subject);
  // Prior gifts may predate this guard. Detect aliases on their verified domain
  // before granting another account's first gift.
  const domain=normalized.slice(normalized.lastIndexOf('@')+1);
  const legacy=await rows(env,`SELECT p.customer_id,p.email
    FROM lab_customer_contacts p JOIN lab_credit_entries e ON e.customer_id=p.customer_id
    WHERE e.reference='welcome:'||p.customer_id
      AND p.email LIKE ? AND p.verified_at IS NOT NULL`, '%@'+domain);
  if(legacy.some(row=>row.customer_id!==subject&&normalizeWelcomeEmail(row.email)===normalized))
    return false;
  const claim=await execute(env,`INSERT OR IGNORE INTO lab_welcome_claims(email_key,customer_id,claimed_at)
    SELECT ?,?,? WHERE EXISTS (SELECT 1 FROM lab_customers WHERE id=?)
      AND NOT EXISTS (SELECT 1 FROM lab_account_closures WHERE customer_id=?)`,
    key,subject,Date.now(),subject,subject);
  // A prior receipt stays one receipt; the database trigger only grants new ones.
  return !!claim.meta?.changes||!!prior;
}
