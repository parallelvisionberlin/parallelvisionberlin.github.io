import {clerkEmailStatus} from './promotions.mjs';
import {referralRoute} from './referrals.mjs';

// Exact, owner-approved verified email, hashed to keep it out of public source.
const VITOLAS_EMAIL_SHA256 = 'e502c5f0d08298cb39182f9711784dd5f468d3a1eb721699c0acf061a642445a';
const workspace = Object.freeze({slug:'vitolas-studio',name:'Vitolas Studio'});
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const json=value=>new Response(JSON.stringify(value),{headers:{'Content-Type':'application/json','Cache-Control':'private, no-store'}});
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
async function approvedEmail(email){
  if(typeof email!=='string')return false;
  const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(email.trim().toLowerCase()));
  return Array.from(new Uint8Array(digest),b=>b.toString(16).padStart(2,'0')).join('')===VITOLAS_EMAIL_SHA256;
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
  return await approvedEmail(contact.email)?workspace:null;
}
export async function partnerDashboardRoute(request,env,subject){
  const url=new URL(request.url);
  if(url.pathname!=='/api/customer/partner')fail(404,'Unknown partner endpoint.');
  if(request.method!=='GET')fail(405,'This dashboard is read-only.');
  const access=await partnerWorkspace(env,subject,{verify:true});
  if(!access)fail(403,'This account does not have access to Vitolas Studio.');
  const offset=Number(url.searchParams.get('offset')||0),limit=100;
  if(!Number.isSafeInteger(offset)||offset<0||offset>1000000)fail(400,'Invalid page.');
  const paid=`EXISTS(SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=r.referred_customer_id
    AND e.kind IN ('purchase','subscription'))`;
  const active=`EXISTS(SELECT 1 FROM lab_subscriptions s WHERE s.customer_id=r.referred_customer_id
    AND s.status IN ('active','trialing') AND NOT EXISTS
      (SELECT 1 FROM lab_account_closures x WHERE x.customer_id=s.customer_id))`;
  const totals=await one(env,`SELECT COUNT(*) AS registered,
    COALESCE(SUM(CASE WHEN ${paid} THEN 1 ELSE 0 END),0) AS payingCustomers,
    COALESCE(SUM(CASE WHEN ${active} THEN 1 ELSE 0 END),0) AS activeSubscriptions,
    (SELECT COUNT(*) FROM lab_credit_entries e JOIN lab_referrals f ON f.referred_customer_id=e.customer_id
      WHERE f.referrer_customer_id=? AND e.kind IN ('purchase','subscription')) AS purchases
    FROM lab_referrals r WHERE r.referrer_customer_id=?`,subject,subject);
  const result=await env.LAB_DB.prepare(`SELECT r.attributed_at AS registeredAt,
    CASE WHEN x.customer_id IS NULL AND p.verified_at IS NOT NULL THEN p.email ELSE NULL END AS email,
    CASE WHEN x.customer_id IS NULL THEN 0 ELSE 1 END AS closed,
    CASE WHEN ${paid} THEN 1 ELSE 0 END AS paid,
    CASE WHEN ${active} THEN 1 ELSE 0 END AS subscribed,
    (SELECT COUNT(*) FROM lab_credit_entries e WHERE e.customer_id=r.referred_customer_id
      AND e.kind IN ('purchase','subscription')) AS purchases
    FROM lab_referrals r LEFT JOIN lab_customer_contacts p ON p.customer_id=r.referred_customer_id
    LEFT JOIN lab_account_closures x ON x.customer_id=r.referred_customer_id
    WHERE r.referrer_customer_id=? ORDER BY r.attributed_at DESC,r.referred_customer_id
    LIMIT ? OFFSET ?`).bind(subject,limit,offset).all();
  const linkRequest=new Request(new URL('/api/customer/referrals',request.url),{headers:request.headers});
  const referral=await (await referralRoute(linkRequest,env,subject)).json();
  const customers=result.results||[];
  return json({workspace:access,referralUrl:referral.url,totals,customers,
    nextOffset:offset+customers.length<Number(totals.registered)?offset+customers.length:null});
}
