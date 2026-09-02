import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { createVoucher, redeemVoucher, VoucherError } from "../src/vouchers.js";

function voucherDb() {
  const accounts = new Map();
  const vouchers = [];
  const redemptions = [];
  const transactions = [];
  return { accounts, vouchers, redemptions, transactions, prepare(sql) {
    const query = sql.replace(/\s+/g, " ").trim();
    let values = [];
    return { bind(...bound) { values = bound; return this; }, async run() {
      if (query.startsWith("INSERT OR IGNORE INTO signal_credit_accounts")) {
        if (!accounts.has(values[0])) accounts.set(values[0], { balance: 0, lifetime_credited: 0, lifetime_debited: 0, updated_at: values[2] });
        return { meta: { changes: 1 } };
      }
      if (query.startsWith("INSERT INTO vouchers")) {
        if (vouchers.some(row => row.code.toLowerCase() === String(values[1]).toLowerCase())) throw new Error("UNIQUE constraint failed");
        const [id, code, credit_amount, maximum_redemptions, expires_at, is_active, created_at, created_by_user_id] = values;
        vouchers.push({ id, code, credit_amount, maximum_redemptions, expires_at, is_active, created_at, created_by_user_id });
        return { meta: { changes: 1 } };
      }
      if (query.startsWith("INSERT INTO voucher_redemptions")) {
        const [id, userId, redeemedAt, accountUserId, code, cutoff, duplicateUserId] = values;
        const voucher = vouchers.find(row => row.code.toLowerCase() === String(code).toLowerCase());
        const used = voucher ? redemptions.filter(row => row.voucher_id === voucher.id) : [];
        if (!voucher || !voucher.is_active || (voucher.expires_at && voucher.expires_at <= cutoff) || used.some(row => row.user_id === duplicateUserId) || used.length >= voucher.maximum_redemptions) return { meta: { changes: 0 } };
        if (redemptions.some(row => row.voucher_id === voucher.id && row.user_id === userId)) throw new Error("UNIQUE constraint failed");
        const account = accounts.get(accountUserId);
        const redemption = { id, voucher_id: voucher.id, user_id: userId, credit_amount: voucher.credit_amount, previous_balance: account.balance, resulting_balance: account.balance + voucher.credit_amount, redeemed_at: redeemedAt };
        redemptions.push(redemption);
        transactions.push({ id, user_id: userId, amount: voucher.credit_amount, source: "voucher" });
        account.balance += voucher.credit_amount; account.lifetime_credited += voucher.credit_amount; account.updated_at = redeemedAt;
        return { meta: { changes: 1 } };
      }
      throw new Error(`Unexpected run: ${query}`);
    }, async first() {
      if (query.includes("FROM signal_credit_accounts")) return accounts.get(values[0]) || null;
      if (query.includes("FROM vouchers WHERE code = ?")) {
        const voucher = vouchers.find(row => row.code.toLowerCase() === String(values[1]).toLowerCase());
        if (!voucher) return null;
        const used = redemptions.filter(row => row.voucher_id === voucher.id);
        return { ...voucher, redemption_count: used.length, redeemed_by_user: used.some(row => row.user_id === values[0]) ? 1 : 0 };
      }
      throw new Error(`Unexpected first: ${query}`);
    } };
  } };
}

const envFor = db => ({ NINA_MEMORY_DB: db });
const create = (env, code, overrides = {}) => createVoucher(env, "owner-1", { code, creditAmount: 20, maximumRedemptions: 1, active: true, ...overrides });
const rejectsCode = (promise, code) => assert.rejects(promise, error => error instanceof VoucherError && error.code === code);

test("single-use voucher credits one authenticated account exactly once", async () => {
  const db = voucherDb(), env = envFor(db);
  await create(env, "NINA20");
  assert.equal((await redeemVoucher(env, "user-1", " nina20 ")).balance, 20);
  await rejectsCode(redeemVoucher(env, "user-1", "NINA20"), "already_redeemed");
  assert.equal(db.accounts.get("user-1").balance, 20);
  assert.equal(db.redemptions.length, 1);
  assert.equal(db.transactions.length, 1);
});

test("limited vouchers stop at capacity and concurrent attempts cannot duplicate credits", async () => {
  const db = voucherDb(), env = envFor(db);
  await create(env, "PVFRIEND", { maximumRedemptions: 2 });
  const firstPair = await Promise.all([redeemVoucher(env, "user-1", "PVFRIEND"), redeemVoucher(env, "user-1", "PVFRIEND").catch(error => error)]);
  assert.equal(firstPair.filter(result => !(result instanceof Error)).length, 1);
  assert.equal(db.accounts.get("user-1").balance, 20);
  assert.equal((await redeemVoucher(env, "user-2", "PVFRIEND")).balance, 20);
  await rejectsCode(redeemVoucher(env, "user-3", "PVFRIEND"), "voucher_limit_reached");
  assert.equal(db.redemptions.length, 2);
});

test("expired and disabled vouchers fail without changing balances", async () => {
  const db = voucherDb(), env = envFor(db);
  await create(env, "OLD2063", { expiresAt: "2025-01-01T00:00:00.000Z" });
  await create(env, "OFFLINE", { active: false });
  await rejectsCode(redeemVoucher(env, "user-1", "OLD2063", new Date("2026-01-01T00:00:00.000Z")), "voucher_expired");
  await rejectsCode(redeemVoucher(env, "user-1", "OFFLINE"), "voucher_inactive");
  assert.equal(db.accounts.get("user-1").balance, 0);
  assert.equal(db.transactions.length, 0);
});

test("voucher schema and interfaces enforce atomic ledger integration", async () => {
  const [migration, worker, account, admin] = await Promise.all([
    readFile(new URL("../migrations/0011_credit_gifts_and_vouchers.sql", import.meta.url), "utf8"),
    readFile(new URL("../src/index.js", import.meta.url), "utf8"),
    readFile(new URL("../../account.html", import.meta.url), "utf8"),
    readFile(new URL("../../nina-admin/index.html", import.meta.url), "utf8")
  ]);
  assert.match(migration, /UNIQUE\(voucher_id, user_id\)/);
  assert.match(migration, /voucher_redemptions_apply_ledger/);
  assert.match(migration, /INSERT INTO signal_credit_transactions/);
  assert.match(worker, /role !== "owner"/);
  assert.match(worker, /\/api\/nina\/credits\/redeem/);
  assert.match(account, /id="redeemForm"/);
  assert.match(admin, /Gift Credits/);
  assert.match(admin, /Create Voucher/);
});
