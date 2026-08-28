const NAME_LIMIT = 50;

function cleanPreferredName(value) {
  if (typeof value !== "string") return "";
  return value.normalize("NFKC").replace(/[^\p{L}\p{M} .'-]/gu, " ").replace(/\s+/g, " ").trim().slice(0, NAME_LIMIT);
}

function preferenceRow(row) {
  return {
    preferredName: typeof row?.preferred_name === "string" ? row.preferred_name : "",
    language: row?.language === "de" ? "de" : "en",
    newsletterUpdates: Boolean(row?.newsletter_updates),
    ninaTransmissions: Boolean(row?.nina_transmissions),
    updatedAt: row?.updated_at || null
  };
}

async function ensurePreferences(env, userId) {
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    INSERT OR IGNORE INTO account_preferences
      (user_id, preferred_name, language, newsletter_updates, nina_transmissions, created_at, updated_at)
    VALUES (?, '', 'en', 0, 0, ?, ?)
  `).bind(userId, now, now).run();
}

export async function getAccountPreferences(env, userId) {
  await ensurePreferences(env, userId);
  const row = await env.NINA_MEMORY_DB.prepare(`
    SELECT preferred_name, language, newsletter_updates, nina_transmissions, updated_at
    FROM account_preferences WHERE user_id = ? LIMIT 1
  `).bind(userId).first();
  return preferenceRow(row);
}

export async function updateAccountProfile(env, user, input) {
  const preferredName = cleanPreferredName(input?.preferredName);
  if (!preferredName) throw new Error("invalid_preferred_name");
  const language = input?.language === "de" ? "de" : input?.language === "en" ? "en" : null;
  if (!language) throw new Error("invalid_language");
  await ensurePreferences(env, user.id);
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.batch([
    env.NINA_MEMORY_DB.prepare("UPDATE account_preferences SET preferred_name = ?, language = ?, updated_at = ? WHERE user_id = ?")
      .bind(preferredName, language, now, user.id),
    env.NINA_MEMORY_DB.prepare("UPDATE users SET display_name = ?, updated_at = ? WHERE id = ? AND role = 'user'")
      .bind(preferredName, now, user.id),
    env.NINA_MEMORY_DB.prepare("UPDATE visitors SET display_name = ?, updated_at = ? WHERE visitor_id = ? AND profile_type = 'visitor'")
      .bind(preferredName, now, user.memory_visitor_id)
  ]);
  return { preferredName, language, updatedAt: now };
}

export async function updateNewsletterPreferences(env, userId, input) {
  if (typeof input?.newsletterUpdates !== "boolean" || typeof input?.ninaTransmissions !== "boolean") {
    throw new Error("invalid_newsletter_preferences");
  }
  await ensurePreferences(env, userId);
  const now = new Date().toISOString();
  await env.NINA_MEMORY_DB.prepare(`
    UPDATE account_preferences
    SET newsletter_updates = ?, nina_transmissions = ?, updated_at = ?
    WHERE user_id = ?
  `).bind(input.newsletterUpdates ? 1 : 0, input.ninaTransmissions ? 1 : 0, now, userId).run();
  return { newsletterUpdates: input.newsletterUpdates, ninaTransmissions: input.ninaTransmissions, updatedAt: now };
}

export async function getBillingHistory(env, userId, limit = 20) {
  const safeLimit = Math.min(50, Math.max(1, Number.parseInt(limit, 10) || 20));
  const result = await env.NINA_MEMORY_DB.prepare(`
    SELECT pack_id, credits, currency, amount_total, status, created_at, paid_at
    FROM signal_credit_purchases
    WHERE user_id = ? AND status IN ('open', 'paid', 'failed', 'expired')
    ORDER BY created_at DESC, id DESC LIMIT ?
  `).bind(userId, safeLimit).all();
  return (result?.results || []).map(row => ({
    packId: row.pack_id,
    credits: Number(row.credits),
    currency: String(row.currency || "").toUpperCase(),
    amount: Number(row.amount_total) / 100,
    status: row.status,
    createdAt: row.created_at,
    paidAt: row.paid_at || null
  }));
}
