import {clerkEmailStatus,requireOwner} from './promotions.mjs';
import {referralRoute} from './referrals.mjs';
import {partnerCommissionReport} from './partner-commissions.mjs';

// Exact, owner-approved verified email, hashed to keep it out of public source.
const VITOLAS_EMAIL_SHA256 = 'e502c5f0d08298cb39182f9711784dd5f468d3a1eb721699c0acf061a642445a';
const partners=Object.freeze([
  {workspace:Object.freeze({slug:'vitolas-studio',name:'Vitolas Studio'}),alias:'vitolas',emailHash:VITOLAS_EMAIL_SHA256},
  {workspace:Object.freeze({slug:'bellini-studio',name:'Bellini Studios'}),alias:'bellini',emailHash:'c484790dd1d02365be89451c4917401abe80da73d059b7f159995a59dac5aefd'},
  {workspace:Object.freeze({slug:'robin-studio',name:'Robin / König Media'}),alias:'robin',emailHash:'b7cae886d711f0a9cbc38c5323cd744d9ac59c7d7a3b209869e202422d265248'}
]);
export const partnerConfiguration=slug=>partners.find(partner=>partner.workspace.slug===slug)||null;
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
async function approvedWorkspace(email){
  if(typeof email!=='string')return null;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.trim().toLowerCase()));
  const hash=Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('');
  return partners.find(partner=>partner.emailHash===hash)?.workspace||null;
}
export async function partnerWorkspace(env,subject,{verify=false}={}){
  let contact;
  try{
    contact=await one(env,`SELECT p.email,p.verified_at,p.synced_at FROM lab_customer_contacts p
      JOIN lab_customers c ON c.id=p.customer_id
      WHERE p.customer_id=? AND NOT EXISTS
        (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=p.customer_id)`,subject);
  }catch(error){
    // Older owner-only fixtures have no contact schema. Never grant access.
    if(/no such table:/i.test(String(error?.message)))return null;
    throw error;
  }
  // Session discovery must remain read-only and never wait on Clerk. The
  // existing background contact sync populates first-login menu eligibility.
  if(verify){
    const status=await clerkEmailStatus(env,subject,true);
    if(status!=='verified')return null;
    contact=await one(env,`SELECT email,verified_at,synced_at FROM lab_customer_contacts
      WHERE customer_id=? AND NOT EXISTS
        (SELECT 1 FROM lab_account_closures WHERE customer_id=?)`,subject,subject);
  }
  if(!contact?.verified_at||!Number.isFinite(contact.synced_at)||
     contact.synced_at>Date.now()||Date.now()-contact.synced_at>86400000)return null;
  return approvedWorkspace(contact.email);
}
export async function partnerDashboardRoute(request,env,subject){
  const url=new URL(request.url);
  if(url.pathname!=='/api/customer/partner')fail(404,'Unknown partner endpoint.');
  if(request.method!=='GET')fail(405,'This dashboard is read-only.');
  const access=await partnerWorkspace(env,subject,{verify:true});
  if(!access)fail(403,'This account does not have access to a partner workspace.');
  const requested=url.searchParams.get('workspace');
  if(requested&&requested!==access.slug)fail(403,'This account does not have access to this workspace.');
  return readPartnerDashboard(request,env,subject,access);
}
export async function ownerPartnerDashboardRoute(request,env,owner){
  await requireOwner(env,owner);
  const slug=new URL(request.url).pathname.match(/^\/api\/admin\/partners\/([^/]+)$/)?.[1];
  const config=partnerConfiguration(slug);
  if(!config)fail(404,'Unknown partner endpoint.');
  if(request.method!=='GET')fail(405,'This dashboard is read-only.');
  const partner=await resolveApprovedPartner(env,slug);
  if(partner)return readPartnerDashboard(request,env,partner.subject,partner.access,{ownerView:true});
  return json({workspace:config.workspace,ownerView:true,awaitingPartner:true});
}
export async function resolveApprovedPartner(env,slug='vitolas-studio'){
  if(!partnerConfiguration(slug))fail(404,'Unknown partner workspace.');
  const result=await env.LAB_DB.prepare(`SELECT p.customer_id,p.email FROM lab_customer_contacts p
    JOIN lab_customers c ON c.id=p.customer_id
    WHERE p.verified_at IS NOT NULL AND p.email IS NOT NULL AND NOT EXISTS
      (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=p.customer_id)
    ORDER BY c.created_at DESC,p.customer_id`).bind().all();
  let hadCandidate=false;
  for(const contact of result.results||[]){
    if((await approvedWorkspace(contact.email))?.slug!==slug)continue;
    hadCandidate=true;
    const access=await partnerWorkspace(env,contact.customer_id,{verify:true});
    if(access?.slug===slug)return {subject:contact.customer_id,access};
  }
  if(hadCandidate)fail(503,'No pudimos verificar la cuenta de '+partnerConfiguration(slug).workspace.name+'. Inténtalo de nuevo.');
  return null;
}
async function readPartnerDashboard(request,env,subject,access,{ownerView=false}={}){
  const url=new URL(request.url);
  const offset=Number(url.searchParams.get('offset')||0),limit=100;
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'Invalid page.');
  const filter=url.searchParams.get('filter')||'all';
  if(!['all','registered','paying','subscribed'].includes(filter))fail(400,'Invalid contact filter.');
  const paid=`EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=r.referred_customer_id
    AND e.kind IN ('purchase','subscription'))`;
  const active=`EXISTS(SELECT 1 FROM lab_subscriptions s WHERE s.customer_id=r.referred_customer_id
    AND s.status IN ('active','trialing') AND NOT EXISTS
      (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=s.customer_id))`;
  const condition=filter==='paying'?paid:filter==='subscribed'?active:filter==='registered'?`NOT (${paid})`:'1=1';
  const search=(url.searchParams.get('q')||'').trim().toLowerCase();
  if(search.length>80)fail(400,'Search is too long.');
  // Search only the same verified, open contacts that can be displayed.
  const searchCondition=search?'AND x.customer_id IS NULL AND p.verified_at IS NOT NULL AND instr(lower(p.email),?)>0':'';
  const totals=await one(env,`SELECT COUNT(*) AS registered,
    COALESCE(SUM(CASE WHEN ${paid} THEN 1 ELSE 0 END),0) AS payingCustomers,
    COALESCE(SUM(CASE WHEN ${active} THEN 1 ELSE 0 END),0) AS activeSubscriptions,
    (SELECT COUNT(*) FROM lab_credit_entries e JOIN lab_referrals f ON f.referred_customer_id=e.customer_id
      WHERE f.referrer_customer_id=? AND e.kind IN ('purchase','subscription')) AS purchases
    FROM lab_referrals r WHERE r.referrer_customer_id=?`,subject,subject);
  const result=await env.LAB_DB.prepare(`SELECT r.referred_customer_id AS customerId,r.attributed_at AS registeredAt,
    CASE WHEN x.customer_id IS NULL AND p.verified_at IS NOT NULL THEN p.email ELSE NULL END AS email,
    CASE WHEN x.customer_id IS NULL THEN 0 ELSE 1 END AS closed,
    CASE WHEN ${paid} THEN 1 ELSE 0 END AS paid,
    CASE WHEN ${active} THEN 1 ELSE 0 END AS subscribed,
    (SELECT COUNT(*) FROM lab_credit_entries e WHERE e.customer_id=r.referred_customer_id
      AND e.kind IN ('purchase','subscription')) AS purchases
    FROM lab_referrals r LEFT JOIN lab_customer_contacts p ON p.customer_id=r.referred_customer_id
    LEFT JOIN lab_account_closures x ON x.customer_id=r.referred_customer_id
    WHERE r.referrer_customer_id=? AND ${condition} ${searchCondition} ORDER BY r.attributed_at DESC,r.referred_customer_id
    LIMIT ? OFFSET ?`).bind(subject,...(search?[search]:[]),limit+1,offset).all();
  const linkRequest=new Request(new URL('/api/customer/referrals',request.url),{headers:request.headers});
  const referral=await (await referralRoute(linkRequest,env,subject)).json();
  const config=partnerConfiguration(access.slug);
  await env.LAB_DB.prepare('INSERT OR IGNORE INTO lab_partner_links(slug,customer_id,created_at) VALUES(?,?,?)').bind(config.alias,subject,Date.now()).run();
  const alias=await one(env,'SELECT customer_id FROM lab_partner_links WHERE slug=?',config.alias);
  const customerSummaries=new Map();
  const commissions=await partnerCommissionReport(env,subject,customerSummaries,{netOfFees:['bellini-studio','robin-studio'].includes(access.slug),costProtection:['bellini-studio','robin-studio'].includes(access.slug)});
  const found=result.results||[];
  const customers=found.slice(0,limit).map(({customerId,...person})=>({...person,...(customerSummaries.get(customerId)||{commissionCents:0,heldCommissionCents:0,needsReconciliation:0,paymentReferences:[]})}));
  return json({workspace:access,ownerView,referralUrl:referral.url,shareUrl:alias?.customer_id===subject?'https://pvlab.studio/'+config.alias:referral.url,totals,customers,commissions,filter,
    nextOffset:found.length>limit?offset+limit:null});
}
export async function publicPartnerLink(request,env){
  if(request.method!=='GET')fail(405,'Method not allowed.');
  const alias=new URL(request.url).pathname.match(/^\/api\/partners\/([^/]+)\/link$/)?.[1];
  const config=partners.find(partner=>partner.alias===alias);
  if(!config)fail(404,'Unknown partner link.');
  let link=await one(env,`SELECT r.code FROM lab_partner_links l JOIN lab_referral_codes r ON r.customer_id=l.customer_id
    JOIN lab_customers c ON c.id=l.customer_id WHERE l.slug=? AND NOT EXISTS
      (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=l.customer_id)`,alias);
  if(!link){
    // Activate the public alias from an already-existing personal referral and
    // a recent verified snapshot. Never look up Clerk or invent an account on
    // an anonymous visit; no private account data is returned.
    const candidates=await env.LAB_DB.prepare(`SELECT p.customer_id,p.email,r.code FROM lab_customer_contacts p
      JOIN lab_referral_codes r ON r.customer_id=p.customer_id JOIN lab_customers c ON c.id=p.customer_id
      WHERE p.verified_at IS NOT NULL AND p.synced_at>=? AND p.synced_at<=? AND NOT EXISTS
        (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=p.customer_id) ORDER BY c.created_at DESC`).bind(Date.now()-86400000,Date.now()).all();
    for(const candidate of candidates.results||[]){
      if((await approvedWorkspace(candidate.email))?.slug!==config.workspace.slug)continue;
      await env.LAB_DB.prepare('INSERT OR IGNORE INTO lab_partner_links(slug,customer_id,created_at) VALUES(?,?,?)').bind(alias,candidate.customer_id,Date.now()).run();
      const registered=await one(env,'SELECT customer_id FROM lab_partner_links WHERE slug=?',alias);
      if(registered?.customer_id===candidate.customer_id)link={code:candidate.code};
      break;
    }
  }
  if(!link)fail(503,'La invitación todavía no está disponible.');
  return json({url:'https://pvlab.studio/?ref='+encodeURIComponent(link.code)});
}
