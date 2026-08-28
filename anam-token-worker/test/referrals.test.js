import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { ReferralError, attributeReferral, getOrCreateReferral } from "../src/referrals.js";

function referralDb() {
  const users = new Map([
    ["user-a", { id: "user-a", referral_code: null, referred_by_user_id: null, referral_created_at: null }],
    ["user-b", { id: "user-b", referral_code: null, referred_by_user_id: null, referral_created_at: null }],
    ["user-c", { id: "user-c", referral_code: null, referred_by_user_id: null, referral_created_at: null }]
  ]);
  return {
    users,
    prepare(sql) {
      const normalized = sql.replace(/\s+/g, " ").trim();
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() {
          if (normalized.startsWith("SELECT referral_code")) return users.get(values[0]) || null;
          if (normalized.startsWith("SELECT id FROM users WHERE referral_code")) {
            const code = String(values[0]).toUpperCase();
            return [...users.values()].find(user => String(user.referral_code || "").toUpperCase() === code) || null;
          }
          throw new Error(`Unexpected first: ${normalized}`);
        },
        async run() {
          if (normalized.startsWith("UPDATE users SET referral_code")) {
            const [code, createdAt, updatedAt, userId] = values;
            const user = users.get(userId);
            if (!user || user.referral_code) return { meta: { changes: 0 } };
            if ([...users.values()].some(candidate => candidate.referral_code === code)) throw new Error("UNIQUE constraint failed: users.referral_code");
            Object.assign(user, { referral_code: code, referral_created_at: createdAt, updated_at: updatedAt });
            return { meta: { changes: 1 } };
          }
          if (normalized.startsWith("UPDATE users SET referred_by_user_id")) {
            const [referrerId, updatedAt, userId, excludedId] = values;
            const user = users.get(userId);
            if (!user || user.referred_by_user_id || userId === excludedId) return { meta: { changes: 0 } };
            Object.assign(user, { referred_by_user_id: referrerId, updated_at: updatedAt });
            return { meta: { changes: 1 } };
          }
          throw new Error(`Unexpected run: ${normalized}`);
        }
      };
    }
  };
}

test("referral codes are unique, URL-safe and stable across repeated reads", async () => {
  const db = referralDb();
  const env = { NINA_MEMORY_DB: db };
  const first = await getOrCreateReferral(env, "user-a");
  const repeated = await getOrCreateReferral(env, "user-a");
  const secondUser = await getOrCreateReferral(env, "user-b");
  assert.match(first.referral_code, /^[A-HJ-NP-Z2-9]{8}$/);
  assert.equal(repeated.referral_code, first.referral_code);
  assert.notEqual(secondUser.referral_code, first.referral_code);
  assert.equal(first.referral_link, `https://parallelvisionlabel.com/?ref=${first.referral_code}`);
});

test("referral reads are isolated to the authenticated internal user", async () => {
  const db = referralDb();
  const env = { NINA_MEMORY_DB: db };
  db.users.get("user-a").referral_code = "ABCDEFGH";
  db.users.get("user-b").referral_code = "JKLMNPQR";
  assert.equal((await getOrCreateReferral(env, "user-a")).referral_code, "ABCDEFGH");
  assert.equal((await getOrCreateReferral(env, "user-b")).referral_code, "JKLMNPQR");
});

test("a valid referral attributes once and cannot be overwritten", async () => {
  const db = referralDb();
  const env = { NINA_MEMORY_DB: db };
  const referrerA = await getOrCreateReferral(env, "user-a");
  const referrerC = await getOrCreateReferral(env, "user-c");
  assert.deepEqual(await attributeReferral(env, "user-b", referrerA.referral_code.toLowerCase()), { attributed: true, status: "attributed" });
  assert.equal(db.users.get("user-b").referred_by_user_id, "user-a");
  assert.deepEqual(await attributeReferral(env, "user-b", referrerC.referral_code), { attributed: false, status: "already_attributed" });
  assert.equal(db.users.get("user-b").referred_by_user_id, "user-a");
});

test("self-referral is rejected without attribution", async () => {
  const db = referralDb();
  const env = { NINA_MEMORY_DB: db };
  const own = await getOrCreateReferral(env, "user-a");
  await assert.rejects(() => attributeReferral(env, "user-a", own.referral_code), error => error instanceof ReferralError && error.code === "self_referral" && error.status === 409);
  assert.equal(db.users.get("user-a").referred_by_user_id, null);
});

test("invalid or unknown referral codes return safe errors and do nothing", async () => {
  const db = referralDb();
  const env = { NINA_MEMORY_DB: db };
  await assert.rejects(() => attributeReferral(env, "user-b", "bad"), error => error instanceof ReferralError && error.code === "invalid_referral_code" && error.status === 400);
  await assert.rejects(() => attributeReferral(env, "user-b", "ABCDEFGH"), error => error instanceof ReferralError && error.code === "invalid_referral_code" && error.status === 404);
  assert.equal(db.users.get("user-b").referred_by_user_id, null);
});

test("migration and account API expose only public referral fields", async () => {
  const [migration, source] = await Promise.all([
    readFile(new URL("../migrations/0007_user_referrals.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/index.js", import.meta.url), "utf8")
  ]);
  assert.match(migration, /referral_code TEXT/);
  assert.match(migration, /referred_by_user_id TEXT REFERENCES users\(id\)/);
  assert.match(migration, /UNIQUE INDEX users_referral_code_unique/);
  assert.match(source, /getOrCreateReferral\(env, user\.id\)/);
  assert.match(source, /\/api\/account\/referral/);
  assert.doesNotMatch(source, /jsonResponse\([^\n]*referred_by_user_id/);
});
