// PV Lab referrals stay in LAB_DB and never touch Nina's referral records.
export const REFERRAL_BONUS_CREDITS = 200;
export const REFERRAL_MIN_PURCHASE_CENTS = 1000;
const ALPHABET = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
const CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const NEW_ACCOUNT_WINDOW_MS = 24 * 60 * 60 * 1000;
const now = () => Date.now();
const one = (env, sql, ...params) => env.LAB_DB.prepare(sql).bind(...params).first();
const run = (env, sql, ...params) => env.LAB_DB.prepare(sql).bind(...params).run();
const response = (value, status = 200) => new Response(JSON.stringify(value), {
  status, headers: { 'Content-Type': 'application/json', 'Cache-Control': 'no-store' }
});
function fail(status, message) {
  const error = new Error(message);
  error.status = status;
  throw error;
}
export function normalizeReferralCode(input) {
  const value = typeof input === 'string' ? input.trim().toUpperCase() : '';
  return CODE_PATTERN.test(value) ? value : '';
}
export function generateReferralCode() {
  const bytes = crypto.getRandomValues(new Uint8Array(8));
  return Array.from(bytes, byte => ALPHABET[byte & 31]).join('');
}
export function referralLink(env, code) {
  const url = new URL(env.LAB_PUBLIC_APP_URL || 'https://parallelvisionlabel.com/lab/studio.html');
  if (url.protocol !== 'https:' || url.username || url.password) fail(503, 'Referral URL is not configured.');
  url.pathname = url.pathname.replace(/studio\.html$/, '');
  url.search = new URLSearchParams({ ref: code }).toString();
  url.hash = '';
  return url.href;
}
async function getOrCreateCode(env, subject) {
  const existing = await one(env, 'SELECT code FROM lab_referral_codes WHERE customer_id=?', subject);
  if (existing?.code) return existing.code;
  for (let tries = 0; tries < 8; tries++) {
    const candidate = generateReferralCode();
    await run(env,
      'INSERT OR IGNORE INTO lab_referral_codes(customer_id,code,created_at) VALUES(?,?,?)',
      subject, candidate, now());
    const row = await one(env, 'SELECT code FROM lab_referral_codes WHERE customer_id=?', subject);
    if (row?.code) return row.code;
  }
  fail(503, 'Could not create your referral link. Please try again.');
}
export async function attributeReferral(env, subject, suppliedCode) {
  const code = normalizeReferralCode(suppliedCode);
  if (!code) fail(400, 'Enter a valid referral code.');
  const referrer = await one(env, 'SELECT customer_id FROM lab_referral_codes WHERE code=? COLLATE NOCASE', code);
  if (!referrer) fail(404, 'Referral code not found.');
  if (referrer.customer_id === subject) fail(409, 'You cannot refer yourself.');
  const previous = await one(env, 'SELECT referrer_customer_id FROM lab_referrals WHERE referred_customer_id=?', subject);
  if (previous) return { attributed: false, status: 'already_attributed' };
  const t = now();
  const customer = await one(env, 'SELECT created_at FROM lab_customers WHERE id=?', subject);
  if (!customer || !Number.isFinite(customer.created_at) || customer.created_at > t ||
      t - customer.created_at > NEW_ACCOUNT_WINDOW_MS)
    fail(409, 'Referral codes are available only when first joining PV Lab.');
  const paid = await one(env,
    "SELECT id FROM lab_credit_entries WHERE customer_id=? AND kind IN ('purchase','subscription') LIMIT 1", subject);
  if (paid) fail(409, 'A referral must be applied before your first purchase.');
  // Atomic attribution: a customer can have only one referrer.
  const result = await run(env,
    `INSERT OR IGNORE INTO lab_referrals(referred_customer_id,referrer_customer_id,attributed_at)
      SELECT ?,customer_id,? FROM lab_referral_codes
      WHERE code=? COLLATE NOCASE AND customer_id<>?`,
    subject, t, code, subject);
  return { attributed: !!result.meta?.changes, status: result.meta?.changes ? 'attributed' : 'already_attributed' };
}
export async function referralRoute(request, env, subject) {
  const path = new URL(request.url).pathname;
  if (path === '/api/customer/referrals' && request.method === 'GET') {
    const code = await getOrCreateCode(env, subject);
    const totals = await one(env,
      `SELECT COUNT(*) AS invited,
        COALESCE(SUM(CASE WHEN rewarded_at IS NOT NULL THEN 1 ELSE 0 END),0) AS rewarded
       FROM lab_referrals WHERE referrer_customer_id=?`, subject);
    return response({
      code, url: referralLink(env, code),
      bonusCredits: REFERRAL_BONUS_CREDITS,
      qualifyingPurchaseEur: REFERRAL_MIN_PURCHASE_CENTS / 100,
      invited: totals?.invited || 0, rewarded: totals?.rewarded || 0,
      rewardsAvailable: env.LAB_CHECKOUT_ENABLED === 'true' && env.LAB_PUBLIC_GENERATION_ENABLED === 'true'
    });
  }
  if (path === '/api/customer/referrals/claim' && request.method === 'POST') {
    if (!request.headers.get('content-type')?.startsWith('application/json')) fail(415, 'Send JSON.');
    const payload = await request.text();
    if (payload.length > 512) fail(413, 'Referral request too large.');
    let data;
    try { data = JSON.parse(payload); } catch { fail(400, 'Invalid referral request.'); }
    return response(await attributeReferral(env, subject, data?.code));
  }
  fail(404, 'Unknown referral endpoint.');
}
// Runs ONLY after the existing signed Stripe webhook has written a qualifying
// paid purchase into the immutable Lab wallet ledger. Batch is atomic in D1.
// The referral rows gate all inserts, so duplicates/reordered events cannot
// credit either user twice or leave an incomplete two-sided payout.
export async function rewardQualifiedReferral(env, referredId, receipt, grossCents) {
  if (!/^user_[A-Za-z0-9]+$/.test(referredId) ||
      !/^(checkout:cs_[A-Za-z0-9_]+|invoice:in_[A-Za-z0-9_]+)$/.test(receipt) ||
      !Number.isSafeInteger(grossCents) || grossCents < REFERRAL_MIN_PURCHASE_CENTS)
    return { rewarded: false };
  const allowed = `FROM lab_referrals r
    WHERE r.referred_customer_id=? AND r.rewarded_at IS NULL
      AND EXISTS(SELECT 1 FROM lab_credit_entries e
        WHERE e.customer_id=r.referred_customer_id
          AND e.reference=? AND e.kind IN ('purchase','subscription'))`;
  const t = now();
  const statements = [
    env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_credit_entries
      (id,customer_id,delta_credits,kind,reference,created_at)
      SELECT 'referral:inviter:'||r.referred_customer_id,r.referrer_customer_id,
        ?, 'adjustment', 'referral:inviter:'||r.referred_customer_id, ?
      ${allowed}`).bind(REFERRAL_BONUS_CREDITS,t,referredId,receipt),
    env.LAB_DB.prepare(`INSERT OR IGNORE INTO lab_credit_entries
      (id,customer_id,delta_credits,kind,reference,created_at)
      SELECT 'referral:friend:'||r.referred_customer_id,r.referred_customer_id,
        ?, 'adjustment', 'referral:friend:'||r.referred_customer_id, ?
      ${allowed}`).bind(REFERRAL_BONUS_CREDITS,t,referredId,receipt),
    env.LAB_DB.prepare(`UPDATE lab_referrals
      SET rewarded_at=?,reward_reference=?
      WHERE referred_customer_id=? AND rewarded_at IS NULL
        AND EXISTS(SELECT 1 FROM lab_credit_entries e
          WHERE e.customer_id=lab_referrals.referred_customer_id AND e.reference=?
            AND e.kind IN ('purchase','subscription'))`).bind(t,receipt,referredId,receipt)
  ];
  const outcome = await env.LAB_DB.batch(statements);
  return { rewarded: Number(outcome[2]?.meta?.changes || 0) > 0 };
}
