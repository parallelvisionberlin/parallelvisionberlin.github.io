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
  // Responsive editorial EMAIL rather than a phone-shaped poster. Real,
  // accessible HTML copy and buttons remain visible if images are blocked.
  // Delivery, deduplication and verification are handled below, unchanged.
  const subject='Welcome to PV LAB. Your creative space is ready.';
  const text=[
    'PV LAB','Fashion. Reimagined.','',
    'WELCOME TO YOUR STUDIO','',
    'Your creative space is ready.','',
    'Begin with a feeling. A face, a fabric, a room, a gesture.',
    'Turn still images into atmosphere, rework photographs into something new,',
    'and shape visual worlds that feel entirely your own.','',
    'ENTER THE STUDIO','https://pvlab.studio/','',
    'EXPLORE MOODS','https://pvlab.studio/moods','',
    'PV LAB · Berlin',
    'You received this message because you created a PV LAB account.',
    'Need help? Contact PV LAB at contact@parallelvisionlabel.com.'
  ].join('\n');
  const html=[
    '<!doctype html><html lang="en"><head><meta charset="utf-8">',
    '<meta name="viewport" content="width=device-width,initial-scale=1">',
    '<meta name="color-scheme" content="light dark"><meta name="supported-color-schemes" content="light dark">',
    '<title>Welcome to PV LAB</title>',
    '<style type="text/css">',
    'body,table,td,p,h1{margin:0;padding:0}',
    'img{border:0;outline:none;text-decoration:none;-ms-interpolation-mode:bicubic}',
    'a{text-decoration:none}',
    '@media only screen and (max-width:600px){',
    '.pv-gutter{padding:12px 9px 22px!important}',
    '.pv-brand{padding:22px 23px 19px!important}',
    '.pv-wordmark{font-size:30px!important}',
    '.pv-copy{padding:25px 24px 0!important}',
    '.pv-title{font-size:34px!important;line-height:1.13!important;letter-spacing:-1.15px!important}',
    '.pv-description{font-size:15px!important;line-height:1.65!important}',
    '.pv-thumbs{padding:22px 22px 0!important}',
    '.pv-action{padding:24px 24px 0!important}',
    '.pv-footer{padding:0 24px 28px!important}',
    '}',
    '</style></head>',
    '<body style="margin:0;padding:0;background:#eeedea;color:#f3f2ee;font-family:Arial,Helvetica,sans-serif;-webkit-text-size-adjust:100%;-ms-text-size-adjust:100%">',
    '<div style="display:none;font-size:1px;color:#eeedea;max-height:0;max-width:0;opacity:0;overflow:hidden">',
    'Begin with a feeling. Your PV LAB creative space is ready.',
    '</div>',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#eeedea" style="background:#eeedea;width:100%">',
    '<tr><td align="center" class="pv-gutter" style="padding:30px 24px 45px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#0d0d0d" style="width:100%;max-width:680px;background:#0d0d0d;border:1px solid #303030">',
    '<tr><td class="pv-brand" bgcolor="#0d0d0d" style="padding:29px 39px 23px">',
    '<a href="https://pvlab.studio/" target="_blank" style="color:#f4f3ef;text-decoration:none">',
    '<span class="pv-wordmark" style="display:block;font-weight:300;font-size:35px;line-height:1.1;letter-spacing:.6px;color:#f4f3ef">PV LAB</span>',
    '<span style="display:block;margin-top:7px;color:#aaa9a5;font-size:13px;line-height:1.3">Fashion. Reimagined.</span>',
    '</a></td></tr>',
    '<tr><td>',
    '<a href="https://pvlab.studio/" target="_blank" style="display:block;color:#f3f2ee;text-decoration:none">',
    '<img src="https://pvlab.studio/email/welcome-hero-horizontal.jpg" width="678" alt="Fashion editorial portrait in sculptural translucent fabric" style="display:block;width:100%;height:auto;max-width:678px;background:#151515;color:#f3f2ee;font-size:13px;line-height:1.5">',
    '</a></td></tr>',
    '<tr><td class="pv-copy" style="padding:34px 39px 0">',
    '<p style="margin:0 0 16px;color:#aaa9a7;font-size:10px;line-height:1.6;letter-spacing:2.8px">WELCOME TO YOUR STUDIO</p>',
    '<h1 class="pv-title" style="margin:0 0 18px;font-weight:400;font-size:43px;line-height:1.12;letter-spacing:-1.65px;color:#f4f3ef">',
    'Your creative<br>space is ready.</h1>',
    '<p class="pv-description" style="margin:0;color:#c8c6c2;font-size:16px;line-height:1.72">',
    'Begin with a feeling. A face, a fabric, a room, a gesture. Turn still images into atmosphere, rework photographs into something new, and shape visual worlds that feel entirely your own.',
    '</p></td></tr>',
    '<tr><td class="pv-thumbs" style="padding:27px 39px 0">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="width:100%">',
    '<tr>',
    '<td width="33.33%" valign="top" style="width:33.33%;padding-right:5px">',
    '<img src="https://pvlab.studio/email/welcome-detail-1.jpg" width="198" alt="Monochrome fashion portrait detail" style="display:block;width:100%;height:auto;background:#242424">',
    '</td>',
    '<td width="33.33%" valign="top" style="width:33.33%;padding:0 3px">',
    '<img src="https://pvlab.studio/email/welcome-detail-2.jpg" width="198" alt="Illuminated architectural space with a figure" style="display:block;width:100%;height:auto;background:#242424">',
    '</td>',
    '<td width="33.33%" valign="top" style="width:33.33%;padding-left:5px">',
    '<img src="https://pvlab.studio/email/welcome-detail-3.jpg" width="198" alt="Sculptural translucent fabric" style="display:block;width:100%;height:auto;background:#242424">',
    '</td></tr></table></td></tr>',
    '<tr><td class="pv-action" style="padding:30px 39px 0">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" bgcolor="#f2f1ee" style="width:100%;background:#f2f1ee;border-radius:7px">',
    '<tr><td align="center">',
    '<a href="https://pvlab.studio/" target="_blank" style="display:block;padding:20px 12px;background:#f2f1ee;border-radius:7px;color:#111;text-decoration:none;text-align:center;font-size:17px;font-weight:500;line-height:1.3">Enter the studio</a>',
    '</td></tr></table></td></tr>',
    '<tr><td align="center" style="padding:23px 15px 32px">',
    '<a href="https://pvlab.studio/moods" target="_blank" style="color:#d7d5d0;font-size:14px;line-height:1.5;text-decoration:underline">Explore Moods</a>',
    '</td></tr>',
    '<tr><td class="pv-footer" style="padding:0 39px 33px">',
    '<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr><td style="height:1px;background:#343434;font-size:1px;line-height:1px">&nbsp;</td></tr></table>',
    '<p style="padding-top:21px;margin:0;color:#92918e;font-size:12px;line-height:1.75">',
    'PV LAB · Berlin<br>',
    'You received this message because you created a PV LAB account.<br>',
    'Need help? <a href="mailto:contact@parallelvisionlabel.com" style="color:#d1d0cb;text-decoration:underline">Contact PV LAB</a>.',
    '</p></td></tr>',
    '</table></td></tr></table></body></html>'
  ].join('');
  return {
    from:'PV LAB <hello@pvlab.studio>',
    reply_to:'contact@parallelvisionlabel.com',
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
