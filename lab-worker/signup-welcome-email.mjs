// Transactional PV LAB welcome email: once per new customer wallet, never per login.
// Disabled unless the sender domain is verified and the Resend secret is configured.
// No marketing, free-credit offers, address tracking, or backend delivery to closed users.
import {syncCustomerEmail} from './promotions.mjs';
import {welcomeReviewFlag} from './welcome-guard.mjs';

const CUSTOMER=/^user_PvLabV2[A-Za-z0-9]+$/;
const EMAIL=/^[^\s@,;<>]{1,64}@[a-z0-9.-]+\.[a-z]{2,}$/i;
const QUEUE_LIFE=72*60*60*1000;
const STUCK=20*60*1000;
const RETRY_GAP=15*60*1000;
const DAILY_LIMIT=80; // Resend free tier: 100 per day.
const API='https://api.resend.com/emails';
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const all=async(env,sql,...args)=>(await env.LAB_DB.prepare(sql).bind(...args).all()).results;

export function signupWelcomeMessage(){
  const subject='Welcome to PV LAB. Your creative space is ready.';
  const text=[
    'PV LAB','Fashion. Reimagined.','','Your creative space is ready.','','Welcome to PV LAB.',
    'Create images, reinterpret photographs and bring them into motion.',
    'Start from a prompt, a photograph or one of our Explore Moods.','',
    'OPEN YOUR STUDIO','https://pvlab.studio/studio.html','',
    'EXPLORE MOODS','https://pvlab.studio/moods','','PV LAB · Berlin','',
    'You received this message because you created a PV LAB account.',
    'For help, email contact@parallelvisionlabel.com.'
  ].join('\n');
  const html=[
    '<!doctype html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">',
    '<title>Welcome to PV LAB</title></head>',
    '<body style="margin:0;padding:0;background:#111;color:#f1f0ed;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%">',
    '<div style="display:none;font-size:1px;color:#111;max-height:0;max-width:0;opacity:0;overflow:hidden">Your creative space is ready. Open PV LAB and start creating.</div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:#111"><tr><td align="center" style="padding:44px 20px 48px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="max-width:560px">',
    '<tr><td style="padding:0 0 34px;border-bottom:1px solid #353535">',
    '<span style="font-weight:300;font-size:37px;letter-spacing:1px;line-height:1.15;color:#f3f1ed">PV LAB</span>',
    '<div style="padding-top:5px;color:#b4b4b2;font-size:12px">Fashion. Reimagined.</div>',
    '</td></tr><tr><td style="padding:46px 0 14px">',
    '<p style="margin:0 0 22px;color:#a8a8a7;font-size:11px;letter-spacing:2px">WELCOME TO YOUR STUDIO</p>',
    '<h1 style="font-weight:400;font-size:38px;line-height:1.14;letter-spacing:-1.4px;margin:0;color:#f3f1ed">Your creative space<br>is ready.</h1>',
    '</td></tr><tr><td style="padding:14px 0 30px;color:#c8c7c4;font-size:16px;line-height:1.75">',
    'Create images, reinterpret photographs and bring them into motion.<br>',
    'Start from a prompt, a photograph or one of our Explore Moods.</td></tr>',
    '<tr><td style="padding:4px 0 20px">',
    '<a href="https://pvlab.studio/studio.html" style="display:inline-block;box-sizing:border-box;background:#f1f0ed;color:#121212;text-decoration:none;font-size:14px;font-weight:600;padding:17px 28px;border-radius:3px">Open your studio &#8599;</a>',
    '</td></tr><tr><td style="padding:10px 0 48px">',
    '<a href="https://pvlab.studio/moods" style="color:#d9d8d4;font-size:14px;text-decoration:underline">Explore Moods</a>',
    '</td></tr><tr><td style="border-top:1px solid #353535;padding-top:25px;color:#8d8e8e;font-size:12px;line-height:1.7">',
    'PV LAB · Berlin<br>You received this message because you created a PV LAB account.<br>',
    'Need help? <a style="color:#c4c4c2;text-decoration:underline" href="mailto:contact@parallelvisionlabel.com">Contact PV LAB</a>.',
    '</td></tr></table></td></tr></table></body></html>'
  ].join('');
  return {
    from:'PV LAB <hello@pvlab.studio>',reply_to:'contact@parallelvisionlabel.com',
    subject,text,html
  };
}

export async function queueSignupWelcome(env,customerId,{clock=Date.now}={}){
  if(env.LAB_WELCOME_EMAIL_ENABLED!=='true'||!CUSTOMER.test(customerId))return false;
  // Explicit new-account path only. No historical backfill.
  const result=await run(env,[
    'INSERT OR IGNORE INTO lab_signup_welcome_emails(customer_id,queued_at)',
    'SELECT c.id,? FROM lab_customers c',
    "JOIN lab_clerk_identity_links l ON l.canonical_id=c.id AND l.kind='customer'",
    "WHERE c.id=? AND c.id=('user_PvLabV2'||substr(l.new_subject,6))",
    'AND NOT EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=c.id)'
  ].join(' '),clock(),customerId);
  return Number(result.meta?.changes)===1;
}

export async function processSignupWelcomeEmails(env,{
  customerId=null,clock=Date.now,fetcher=fetch,syncEmail=syncCustomerEmail,limit=4
}={}){
  if(env.LAB_WELCOME_EMAIL_ENABLED!=='true'||!String(env.LAB_RESEND_API_KEY||'').startsWith('re_'))
    return {status:'disabled_or_unconfigured',sent:0};
  const now=clock();
  if(!await one(env,"SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='lab_customers'"))
    return {status:'no_customers',sent:0};
  if(!await one(env,"SELECT 1 AS ok FROM sqlite_master WHERE type='table' AND name='lab_signup_welcome_emails'"))
    throw Error('PV LAB welcome migration 0031 missing');

  // If an HTTP result is ambiguous, do not send a duplicate later.
  await run(env,[
    "UPDATE lab_signup_welcome_emails SET state='uncertain',last_error='interrupted_send'",
    "WHERE state='sending' AND attempted_at<?"
  ].join(' '),now-STUCK);
  await run(env,[
    "UPDATE lab_signup_welcome_emails SET state='skipped',last_error='expired_before_send'",
    "WHERE state='pending' AND queued_at<?"
  ].join(' '),now-QUEUE_LIFE);

  const start=Math.floor(now/86400000)*86400000;
  const cap=await one(env,[
    'SELECT COUNT(*) AS n FROM lab_signup_welcome_emails',
    'WHERE attempted_at>=? AND attempted_at<?'
  ].join(' '),start,start+86400000);
  let remaining=Math.max(0,DAILY_LIMIT-Number(cap?.n||0));
  if(!remaining)return {status:'daily_cap',sent:0};
  const candidates=await all(env,[
    'SELECT w.customer_id,w.queued_at,w.attempted_at,w.attempts',
    'FROM lab_signup_welcome_emails w',
    'JOIN lab_customers c ON c.id=w.customer_id',
    "JOIN lab_clerk_identity_links l ON l.canonical_id=w.customer_id AND l.kind='customer'",
    "WHERE w.state='pending' AND (? IS NULL OR w.customer_id=?)",
    "AND w.customer_id=('user_PvLabV2'||substr(l.new_subject,6))",
    'AND NOT EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=w.customer_id)',
    'AND (w.attempted_at IS NULL OR w.attempted_at<?)',
    'ORDER BY w.queued_at LIMIT 5'
  ].join(' '),customerId,customerId,now-RETRY_GAP);
  let sent=0;
  for(const candidate of candidates.slice(0,Math.min(5,Math.max(1,limit)))){
    if(remaining<=0)break;
    const id=candidate.customer_id;
    if(!CUSTOMER.test(id))continue;
    if(candidate.attempts>=3){
      await run(env,"UPDATE lab_signup_welcome_emails SET state='failed',last_error='retry_limit' WHERE customer_id=? AND state='pending'",id);
      continue;
    }
    let contact=await one(env,'SELECT email,verified_at,synced_at FROM lab_customer_contacts WHERE customer_id=?',id);
    if((!contact?.email||!contact?.verified_at)&&(!contact?.synced_at||contact.synced_at<=now-120000)){
      try{await syncEmail(env,id,{force:true});}catch{/* Remain pending until verification succeeds. */}
      contact=await one(env,'SELECT email,verified_at,synced_at FROM lab_customer_contacts WHERE customer_id=?',id);
    }
    const address=contact?.email;
    if(!contact?.verified_at||typeof address!=='string'||address.length>254||!EMAIL.test(address))continue;
    if(welcomeReviewFlag(address,env)==='disposable-email'){
      await run(env,"UPDATE lab_signup_welcome_emails SET state='skipped',last_error='ineligible_address' WHERE customer_id=? AND state='pending'",id);
      continue;
    }

    // Atomic claim rejects parallel cron/browser requests and account closures.
    const claim=await run(env,[
      "UPDATE lab_signup_welcome_emails SET state='sending',attempted_at=?,attempts=attempts+1,last_error=NULL",
      "WHERE customer_id=? AND state='pending' AND queued_at>=?",
      'AND EXISTS(SELECT 1 FROM lab_customer_contacts c',
      'WHERE c.customer_id=? AND c.email=? AND c.verified_at IS NOT NULL)',
      'AND NOT EXISTS(SELECT 1 FROM lab_account_closures x WHERE x.customer_id=?)'
    ].join(' '),now,id,now-QUEUE_LIFE,id,address,id);
    if(Number(claim.meta?.changes)!==1)continue;
    remaining--;
    try{
      const response=await fetcher(API,{
        method:'POST',redirect:'manual',signal:AbortSignal.timeout(10000),
        headers:{
          Authorization:'Bearer '+env.LAB_RESEND_API_KEY,
          'Content-Type':'application/json',
          'Idempotency-Key':'pvlab-signup-welcome-v1:'+id
        },
        body:JSON.stringify({...signupWelcomeMessage(),to:[address]})
      });
      if(response.status===429){
        await run(env,"UPDATE lab_signup_welcome_emails SET state='pending',last_error='rate_limited' WHERE customer_id=? AND state='sending'",id);
        continue;
      }
      if(response.status>=400&&response.status<500){
        await run(env,"UPDATE lab_signup_welcome_emails SET state='failed',last_error=? WHERE customer_id=? AND state='sending'",'provider_http_'+response.status,id);
        continue;
      }
      if(!response.ok){
        await run(env,"UPDATE lab_signup_welcome_emails SET state='uncertain',last_error='provider_unknown' WHERE customer_id=? AND state='sending'",id);
        continue;
      }
      const result=await response.json().catch(()=>null);
      if(typeof result?.id!=='string'||!result.id||result.id.length>128){
        await run(env,"UPDATE lab_signup_welcome_emails SET state='uncertain',last_error='missing_provider_receipt' WHERE customer_id=? AND state='sending'",id);
        continue;
      }
      await run(env,[
        "UPDATE lab_signup_welcome_emails SET state='sent',sent_at=?,provider_message_id=?,last_error=NULL",
        "WHERE customer_id=? AND state='sending'"
      ].join(' '),clock(),result.id,id);
      sent++;
    }catch{
      // Provider timeout may still have delivered. Never blindly resend.
      await run(env,"UPDATE lab_signup_welcome_emails SET state='uncertain',last_error='delivery_unconfirmed' WHERE customer_id=? AND state='sending'",id).catch(()=>{});
    }
  }
  return {status:'processed',sent};
}
