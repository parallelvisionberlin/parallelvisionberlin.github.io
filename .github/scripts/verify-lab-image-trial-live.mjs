// Read-only production verification. Prints only policy and invariant booleans.
const token=(process.env.CLOUDFLARE_API_TOKEN||'').replace(/\s/g,'');
if(!token)throw Error('Cloudflare credential is unavailable.');
const root='https://api.cloudflare.com/client/v4/accounts/a40ce1725295563a7b7db9fc3160480a';
async function api(path,sql){
  const r=await fetch(root+path,{method:sql?'POST':'GET',headers:{Authorization:'Bearer '+token,'Content-Type':'application/json'},...(sql?{body:JSON.stringify({sql})}:{}),signal:AbortSignal.timeout(30000)});
  const body=await r.json();
  if(!r.ok||!body.success)throw Error('Production verification unavailable: HTTP '+r.status);
  return body.result;
}
let failed=false;
function check(name,ok){console.log((ok?'PASS: ':'FAIL: ')+name);if(!ok)failed=true;}
const settings=await api('/workers/scripts/parallel-vision-lab/settings');
for(const [name,value] of Object.entries({LAB_IMAGE_TRIAL_ENABLED:'true',LAB_WELCOME_CREDITS_ENABLED:'false',LAB_FREE_TRIAL_PAUSED:'false',LAB_CHECKOUT_ENABLED:'true',LAB_PUBLIC_GENERATION_ENABLED:'true'})){
  check(name,settings.bindings.some(b=>b.name===name&&b.type==='plain_text'&&b.text===value));
}
const results=await api('/d1/database/36e13edc-1557-48a3-a49c-08bbc0f9618f/query',`SELECT
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0051-first-image-40-credit-trial') AS migration_0051,
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0052-spend-all-image-trial-credits') AS migration_0052,
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0053-single-image-trial') AS migration_0053,
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0056-use-image-credit-balance') AS migration_0056,
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0060-paid-signup-existing-wallets') AS migration_0060,
  EXISTS(SELECT 1 FROM lab_migrations WHERE id='0061-resume-40-credit-image-trial') AS migration_0061,
  NOT EXISTS(SELECT 1 FROM lab_credit_entries e
    LEFT JOIN lab_customers c ON c.id=e.customer_id
    JOIN lab_image_trial_controls t ON t.id=1
    JOIN lab_migrations m ON m.id='0060-paid-signup-existing-wallets'
    WHERE e.reference='welcome:'||e.customer_id AND e.created_at>=m.applied_at
      AND (c.id IS NULL OR e.delta_credits<>40 OR c.created_at<t.started_at
        OR NOT EXISTS(SELECT 1 FROM lab_customer_contacts p WHERE p.customer_id=c.id AND p.verified_at IS NOT NULL))) AS only_eligible_40_credit_grants_after_pause,
  NOT EXISTS(SELECT 1 FROM lab_welcome_claims w
    LEFT JOIN lab_customers c ON c.id=w.customer_id
    JOIN lab_image_trial_controls t ON t.id=1
    JOIN lab_migrations m ON m.id='0060-paid-signup-existing-wallets'
    WHERE w.claimed_at>=m.applied_at AND (c.id IS NULL OR c.created_at<t.started_at)) AS only_post_cutoff_claims_after_pause,
  EXISTS(SELECT 1 FROM lab_image_trial_controls WHERE id=1 AND started_at=1793487600000) AS berlin_cutoff,
  EXISTS(SELECT 1 FROM lab_trial_program_controls WHERE id=1 AND welcome_enabled=0 AND free_generation_enabled=1) AS signup_closed_existing_wallets_usable,
  EXISTS(SELECT 1 FROM sqlite_master WHERE type='trigger' AND name='lab_trial_pause_new_welcome_claims' AND sql LIKE '%lab_image_trial_controls%' AND sql LIKE '%welcome_enabled=0%') AS image_trial_only_welcome_exception,
  (SELECT COUNT(*) FROM sqlite_master WHERE type='trigger' AND name IN ('lab_trial_pause_unpaid_job_inserts','lab_trial_pause_unpaid_job_activation') AND sql LIKE '%delta_credits=40%' AND sql LIKE '%$.type%' AND sql LIKE '%$.mode%' AND sql NOT LIKE '%lab_generation_finance%')=2 AS image_balance_database_guards,
  NOT EXISTS(SELECT 1 FROM lab_customers WHERE balance_credits<0) AS no_negative_balances,
  NOT EXISTS(SELECT 1 FROM lab_customers c WHERE c.balance_credits != COALESCE((SELECT SUM(e.delta_credits) FROM lab_credit_entries e WHERE e.customer_id=c.id),0)) AS wallet_ledger_reconciles,
  NOT EXISTS(SELECT 1 FROM lab_credit_entries e JOIN lab_customers c ON c.id=e.customer_id WHERE e.reference='welcome:'||c.id AND c.created_at>=1793487600000 AND e.delta_credits<>40) AS new_welcome_amount_exactly_40,
  NOT EXISTS(SELECT customer_id FROM lab_credit_entries WHERE reference='welcome:'||customer_id GROUP BY customer_id HAVING COUNT(*)>1) AS no_duplicate_welcome_receipts,
  NOT EXISTS(SELECT reference FROM lab_credit_entries WHERE kind IN ('purchase','subscription','generation') GROUP BY reference HAVING COUNT(*)>1) AS no_duplicate_payment_or_job_receipts,
  NOT EXISTS(SELECT 1 FROM jobs j JOIN lab_credit_entries d ON d.reference='job:'||j.id AND d.kind='generation' WHERE j.state='failed' AND NOT EXISTS(SELECT 1 FROM lab_credit_entries r WHERE r.reference='refund:job:'||j.id AND r.kind='refund' AND r.customer_id=d.customer_id AND r.delta_credits=-d.delta_credits)) AS failed_jobs_refunded;`);
const row=results[0]?.results?.[0];
if(!row)throw Error('Production trial verification returned no result.');
for(const [key,value] of Object.entries(row))check(key,value===1);
if(failed)process.exitCode=1;
