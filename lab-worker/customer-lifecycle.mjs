// Customer content belongs only to LAB_DB / LAB_MEDIA. Never mutate shared Clerk
// identities, Nina's OWNER_DB, or another account's objects.
import {welcomeReviewFlag,preserveClosedWelcomeClaim} from './welcome-guard.mjs';
const one=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).first();
const run=(env,sql,...args)=>env.LAB_DB.prepare(sql).bind(...args).run();
const fail=(status,message)=>{const error=new Error(message);error.status=status;throw error;};
export const STORAGE_LIMIT_BYTES=20*1024**3;
export async function customerRestrictions(env,id){
  const closed=await one(env,'SELECT state,requested_at,completed_at FROM lab_account_closures WHERE customer_id=?',id);
  const review=await one(env,"SELECT event_id FROM lab_billing_reviews WHERE customer_id=? AND state='open' LIMIT 1",id);
  return {closed:closed||null,billingReview:!!review};
}
// Only free generation is stopped. Clerk login, saved media, deletion, checkout
// and Stripe-verified paid credits are never blocked by an email review flag.
export async function customerPromotionalReview(env,id){
  // Pause across every customer generation endpoint. This remains reversible
  // without cancelling purchases or consuming existing complimentary balances.
  const policy=await one(env,'SELECT free_generation_enabled FROM lab_trial_program_controls WHERE id=1');
  const trialPaused=env.LAB_FREE_TRIAL_PAUSED==='true'||policy?.free_generation_enabled===0;
  if(!trialPaused&&env.LAB_PROMO_HOLDS_ENABLED!=='true')return {held:false};
  const account=await one(env,`SELECT c.id,p.email,
    h.reason AS holdReason,h.released_at AS releasedAt,
    EXISTS (SELECT 1 FROM lab_credit_entries e WHERE e.customer_id=c.id
      AND e.kind IN ('purchase','subscription')) AS hasPaid,
    EXISTS (SELECT 1 FROM lab_voucher_redemptions r
      WHERE r.customer_id=c.id) AS hasOwnerVoucher
    FROM lab_customers c
    LEFT JOIN lab_customer_contacts p ON p.customer_id=c.id
    LEFT JOIN lab_promo_generation_holds h ON h.customer_id=c.id
    WHERE c.id=?`,id);
  if(!account)return {held:false};
  const hasPaid=!!account.hasPaid;
  const explicitHold=env.LAB_PROMO_HOLDS_ENABLED==='true'&&
    !!account.holdReason&&account.releasedAt===null;
  const flaggedEmail=env.LAB_PROMO_HOLDS_ENABLED==='true'&&
    welcomeReviewFlag(account.email,env)==='disposable-email';
  // Owner-issued vouchers are redeemable gifts, not automatic signup credits.
  // Keep the temporary welcome/free-trial pause for unpaid accounts without a
  // voucher. An explicit abuse hold or flagged email still blocks free spending.
  const hasOwnerVoucher=!!account.hasOwnerVoucher;
  const held=!hasPaid&&(explicitHold||flaggedEmail||(trialPaused&&!hasOwnerVoucher));
  return {
    held,hasPaid,
    reason:held?(explicitHold||flaggedEmail?'disposable-email':'trial-paused'):null
  };
}
export async function assertCustomerOpen(env,id,{spending=false,promotion=false}={}){
  const state=await customerRestrictions(env,id);
  if(state.closed)fail(403,'This PV Lab account is closed. Content deletion is queued or complete. Contact support for a billing or data request.');
  if(spending&&state.billingReview)fail(409,'A refund or dispute is being reviewed. Purchases and generation are paused; billing management remains available.');
  if(promotion){
    const review=await customerPromotionalReview(env,id);
    if(review.held)fail(403,review.reason==='trial-paused'
      ?'Complimentary generation is paused. Your credits and saved work remain intact. Purchase credits to continue creating.'
      :'Free trial generation is unavailable for this account. Your saved work and billing remain accessible. Contact PV LAB support for a review.');
  }
  return state;
}
export async function customerAccount(env,id){
  const state=await customerRestrictions(env,id);
  const storage=await one(env,'SELECT COALESCE(SUM(bytes),0) AS bytes,COUNT(*) AS files FROM assets WHERE owner_id=?',id);
  return {...state,storage:{bytes:storage.bytes,files:storage.files,limitBytes:STORAGE_LIMIT_BYTES}};
}
export async function requestAccountClosure(env,id,confirmation){
  if(confirmation!=='DELETE MY PV LAB ACCOUNT')fail(400,'Type DELETE MY PV LAB ACCOUNT to confirm.');
  if(!await one(env,'SELECT id FROM lab_customers WHERE id=?',id))fail(403,'Only a customer can close their own PV Lab account.');
  if(await one(env,'SELECT customer_id FROM lab_account_closures WHERE customer_id=?',id))return {accepted:true};
  // A local subscription is a guard, not a Stripe cancellation. The customer
  // must cancel billing first; account deletion never implies a money refund.
  const subscription=await one(env,"SELECT stripe_subscription_id FROM lab_subscriptions WHERE customer_id=? AND status NOT IN ('none','canceled','incomplete_expired')",id);
  if(subscription)fail(409,'Cancel your subscription through Manage subscription first. After Stripe confirms cancellation, close your account here. Contact support if cancellation is scheduled for period end.');
  const result=await run(env,`INSERT OR IGNORE INTO lab_account_closures(customer_id,requested_at)
    SELECT ?,? WHERE NOT EXISTS(SELECT 1 FROM jobs WHERE owner_id=? AND state IN ('submitting','queued','running','saving','uncertain'))
    AND NOT EXISTS(SELECT 1 FROM soul_characters WHERE owner_id=? AND state IN ('submitting','queued','training','uncertain'))`,id,Date.now(),id,id);
  if(!result.meta?.changes)fail(409,'A generation is still running or needs reconciliation. Wait for it to finish, or contact support, then close your account.');
  return {accepted:true};
}
export async function processAccountClosures(env,verifyBilling){
  // Allow outstanding uploads to settle. Bound each cron invocation; failures
  // leave the durable request intact and are retried on the next scheduled run.
  const result=await env.LAB_DB.prepare("SELECT customer_id FROM lab_account_closures WHERE state='requested' AND requested_at<? ORDER BY requested_at LIMIT 5").bind(Date.now()-120000).all();
  let failed=false;
  for(const {customer_id:id} of result.results){
    try{
    if(!/^user_[A-Za-z0-9]+$/.test(id))throw new Error('Invalid customer deletion scope.');
    const customer=await one(env,'SELECT stripe_customer_id FROM lab_customers WHERE id=?',id);
    // Never delete content while subscription status is unknown or recurring
    // charges can continue. The caller supplies the verified Stripe check.
    if(customer?.stripe_customer_id&&(!verifyBilling||!await verifyBilling(env,customer.stripe_customer_id)))continue;
    const page=await env.LAB_MEDIA.list({prefix:id+'/',limit:100});
    for(const object of page.objects)await env.LAB_MEDIA.delete(object.key);
    // Re-list on the next run, including objects uploaded during this pass.
    if(page.objects.length||page.truncated)continue;
    const existing=await env.LAB_DB.prepare("SELECT name FROM sqlite_master WHERE type='table'").bind().all();
    const tables=new Set(existing.results.map(x=>x.name));
    if(tables.has('lab_welcome_claims')&&tables.has('lab_customer_contacts'))
      await preserveClosedWelcomeClaim(env,id);
    const statements=[];
    if(tables.has('soul_reinterpret_links'))statements.push(env.LAB_DB.prepare('DELETE FROM soul_reinterpret_links WHERE adapter_id IN (SELECT id FROM soul_characters WHERE owner_id=?) OR parent_id IN (SELECT id FROM soul_characters WHERE owner_id=?)').bind(id,id));
    for(const table of ['library_members','library_favorites','library_folders','moodboard_style_data','moodboards','moodboard_analysis_quota','element_visual_profiles','element_analysis_quota','lab_spicy_reference_cache','lab_mood_performance','packs','jobs','quotes','spend','soul_characters','soul_datasets','assets','settings']){
      if(tables.has(table))statements.push(env.LAB_DB.prepare('DELETE FROM '+table+' WHERE owner_id=?').bind(id));
    }
    if(tables.has('lab_referral_codes'))statements.push(env.LAB_DB.prepare('DELETE FROM lab_referral_codes WHERE customer_id=?').bind(id));
    if(tables.has('lab_referrals'))statements.push(env.LAB_DB.prepare('DELETE FROM lab_referrals WHERE (referrer_customer_id=? OR referred_customer_id=?) AND rewarded_at IS NULL').bind(id,id));
    if(tables.has('lab_clerk_migration_codes'))statements.push(env.LAB_DB.prepare('DELETE FROM lab_clerk_migration_codes WHERE canonical_id=?').bind(id));
    if(tables.has('lab_customer_contacts'))statements.push(env.LAB_DB.prepare('DELETE FROM lab_customer_contacts WHERE customer_id=?').bind(id));
    if(tables.has('lab_signup_welcome_emails'))statements.push(env.LAB_DB.prepare('DELETE FROM lab_signup_welcome_emails WHERE customer_id=?').bind(id));
    statements.push(env.LAB_DB.prepare("UPDATE lab_account_closures SET state='deleted',completed_at=? WHERE customer_id=?").bind(Date.now(),id));
    await env.LAB_DB.batch(statements);
    }catch{failed=true;}
  }
  if(failed)throw new Error('Account cleanup is pending: storage or billing verification unavailable.');
}
