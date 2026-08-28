import { creditSignalCredits } from "./credits.js";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
const REFERRAL_CODE_LENGTH = 8;
const REFERRAL_CODE_PATTERN = /^[A-HJ-NP-Z2-9]{8}$/;
const REFERRAL_LINK_ORIGIN = "https://parallelvisionlabel.com";
const REFERRAL_REWARD_CREDITS = 100;
const REFERRAL_REWARD_THRESHOLD = 100;

export class ReferralError extends Error {
  constructor(code, message, status = 400) {
    super(message);
    this.name = "ReferralError";
    this.code = code;
    this.status = status;
  }
}

export function normalizeReferralCode(value) {
  const code = typeof value === "string" ? value.trim().toUpperCase() : "";
  return REFERRAL_CODE_PATTERN.test(code) ? code : "";
}

export function generateReferralCode() {
  const bytes = new Uint8Array(REFERRAL_CODE_LENGTH);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, byte => REFERRAL_ALPHABET[byte & 31]).join("");
}

async function referralRow(env, userId) {
  return env.NINA_MEMORY_DB.prepare(`
    SELECT referral_code, referred_by_user_id, referral_created_at
    FROM users WHERE id = ? LIMIT 1
  `).bind(userId).first();
}

function publicReferral(row) {
  const referralCode = normalizeReferralCode(row?.referral_code);
  if (!referralCode) throw new ReferralError("referral_unavailable", "Referral code unavailable", 503);
  return {
    referral_code: referralCode,
    referral_link: `${REFERRAL_LINK_ORIGIN}/?ref=${encodeURIComponent(referralCode)}`
  };
}

export async function getOrCreateReferral(env, userId) {
  let row = await referralRow(env, userId);
  if (!row) throw new ReferralError("account_unavailable", "Account unavailable", 404);
  if (normalizeReferralCode(row.referral_code)) return publicReferral(row);

  for (let attempt = 0; attempt < 8; attempt += 1) {
    const code = generateReferralCode();
    const now = new Date().toISOString();
    try {
      await env.NINA_MEMORY_DB.prepare(`
        UPDATE users
        SET referral_code = ?, referral_created_at = ?, updated_at = ?
        WHERE id = ? AND referral_code IS NULL
      `).bind(code, now, now, userId).run();
    } catch (error) {
      if (!String(error?.message || error).toLowerCase().includes("unique")) throw error;
    }
    row = await referralRow(env, userId);
    if (normalizeReferralCode(row?.referral_code)) return publicReferral(row);
  }
  throw new ReferralError("referral_unavailable", "Referral code unavailable", 503);
}

export async function attributeReferral(env, userId, suppliedCode) {
  const code = normalizeReferralCode(suppliedCode);
  if (!code) throw new ReferralError("invalid_referral_code", "Invalid referral code", 400);

  const ownReferral = await getOrCreateReferral(env, userId);
  if (ownReferral.referral_code === code) throw new ReferralError("self_referral", "Self-referral is not allowed", 409);

  const referrer = await env.NINA_MEMORY_DB.prepare(`
    SELECT id FROM users WHERE referral_code = ? COLLATE NOCASE LIMIT 1
  `).bind(code).first();
  if (!referrer?.id) throw new ReferralError("invalid_referral_code", "Invalid referral code", 404);

  const current = await referralRow(env, userId);
  if (!current) throw new ReferralError("account_unavailable", "Account unavailable", 404);
  if (current.referred_by_user_id) return { attributed: false, status: "already_attributed" };

  const now = new Date().toISOString();
  const result = await env.NINA_MEMORY_DB.prepare(`
    UPDATE users
    SET referred_by_user_id = ?, updated_at = ?
    WHERE id = ? AND referred_by_user_id IS NULL AND id <> ?
  `).bind(referrer.id, now, userId, referrer.id).run();
  return Number(result?.meta?.changes || 0) > 0
    ? { attributed: true, status: "attributed" }
    : { attributed: false, status: "already_attributed" };
}

export async function rewardQualifyingReferral(env, referredUserId, purchasedCredits) {
  if (!Number.isSafeInteger(purchasedCredits) || purchasedCredits < REFERRAL_REWARD_THRESHOLD) {
    return { rewarded: false, status: "not_qualified" };
  }
  const referral = await env.NINA_MEMORY_DB.prepare(`
    SELECT referred_by_user_id FROM users WHERE id = ? LIMIT 1
  `).bind(referredUserId).first();
  const referrerUserId = referral?.referred_by_user_id;
  if (typeof referrerUserId !== "string" || !referrerUserId || referrerUserId === referredUserId) {
    return { rewarded: false, status: "not_referred" };
  }
  const result = await creditSignalCredits(env, referrerUserId, REFERRAL_REWARD_CREDITS, {
    source: "referral_reward",
    referenceId: `referral-reward:${referredUserId}`,
    description: "Qualified referral reward"
  });
  return {
    rewarded: !result.idempotent,
    status: result.idempotent ? "already_rewarded" : "rewarded"
  };
}
