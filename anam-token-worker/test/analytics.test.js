import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import worker from "../src/index.js";
import { endNinaAnalyticsSession, getNinaAnalyticsDashboard, startNinaAnalyticsSession, touchNinaAnalyticsSession } from "../src/analytics.js";

function lifecycleDb() {
  const rows = [];
  return {
    rows,
    prepare(sql) {
      const query = sql.replace(/\s+/g, " ").trim();
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async first() {
          if (query.includes("WHERE client_entry_id = ?")) return rows.find(row => row.client_entry_id === values[0]) || null;
          if (query.includes("WHERE user_key = ? LIMIT 1")) return rows.some(row => row.user_key === values[0]) ? { found: 1 } : null;
          if (query.includes("WHERE id = ? AND client_entry_id = ? AND user_key = ?")) {
            return rows.find(row => row.id === values[0] && row.client_entry_id === values[1] && row.user_key === values[2]) || null;
          }
          throw new Error(`Unexpected first: ${query}`);
        },
        async run() {
          if (query.startsWith("INSERT INTO nina_analytics_sessions")) {
            const [id, entry, visitor, userId, userKey, authenticated, actorType, returning, startedAt, lastSeenAt, date] = values;
            if (rows.some(row => row.client_entry_id === entry)) throw new Error("UNIQUE");
            rows.push({ id, client_entry_id: entry, visitor_id: visitor, user_id: userId, user_key: userKey, is_authenticated: authenticated, actor_type: actorType, is_returning: returning, status: "active", started_at: startedAt, last_seen_at: lastSeenAt, ended_at: null, connected_seconds: 0, session_date: date });
            return { meta: { changes: 1 } };
          }
          if (query.includes("SET last_seen_at = ?, connected_seconds = ?")) {
            const row = rows.find(candidate => candidate.id === values[2] && candidate.client_entry_id === values[3] && candidate.user_key === values[4] && candidate.status === "active");
            if (row) Object.assign(row, { last_seen_at: values[0], connected_seconds: values[1] });
            return { meta: { changes: row ? 1 : 0 } };
          }
          if (query.includes("SET status = ?, last_seen_at = ?, ended_at = ?, connected_seconds = ?")) {
            const row = rows.find(candidate => candidate.id === values[4] && candidate.client_entry_id === values[5] && candidate.user_key === values[6] && candidate.status === "active");
            if (row) Object.assign(row, { status: values[0], last_seen_at: values[1], ended_at: values[2], connected_seconds: values[3] });
            return { meta: { changes: row ? 1 : 0 } };
          }
          throw new Error(`Unexpected run: ${query}`);
        }
      };
    }
  };
}

test("ready analytics sessions are idempotent and record a five-minute connection", async () => {
  const db = lifecycleDb();
  const env = { NINA_MEMORY_DB: db };
  const identity = { visitorId: "visitor-analytics-1", user: { id: "user-1", role: "user" }, clientEntryId: "11111111-1111-4111-8111-111111111111" };
  const started = Date.parse("2026-09-02T10:00:00.000Z");
  const first = await startNinaAnalyticsSession(env, identity, started);
  const duplicate = await startNinaAnalyticsSession(env, identity, started + 1000);
  assert.equal(db.rows.length, 1);
  assert.equal(duplicate.sessionId, first.sessionId);
  assert.equal(duplicate.duplicate, true);
  const heartbeat = await touchNinaAnalyticsSession(env, { ...identity, sessionId: first.sessionId }, started + 180000);
  assert.equal(heartbeat.connectedSeconds, 180);
  const ended = await endNinaAnalyticsSession(env, { ...identity, sessionId: first.sessionId, reason: "ended" }, started + 300000);
  assert.equal(ended.connectedSeconds, 300);
  assert.equal(db.rows[0].status, "ended");
  assert.equal((await endNinaAnalyticsSession(env, { ...identity, sessionId: first.sessionId }, started + 360000)).idempotent, true);
});

test("returning status is based on prior sessions for the same internal user key", async () => {
  const db = lifecycleDb();
  const env = { NINA_MEMORY_DB: db };
  const base = { visitorId: "visitor-analytics-2", user: null };
  await startNinaAnalyticsSession(env, { ...base, clientEntryId: "22222222-2222-4222-8222-222222222222" }, Date.parse("2026-09-01T10:00:00Z"));
  await startNinaAnalyticsSession(env, { ...base, clientEntryId: "33333333-3333-4333-8333-333333333333" }, Date.parse("2026-09-02T10:00:00Z"));
  assert.deepEqual(db.rows.map(row => row.is_returning), [0, 1]);
});

const encode = value => Buffer.from(typeof value === "string" ? value : JSON.stringify(value)).toString("base64url");
async function authFixture(origin) {
  const keys = await crypto.subtle.generateKey({ name: "RSASSA-PKCS1-v1_5", modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: "SHA-256" }, true, ["sign", "verify"]);
  const jwk = await crypto.subtle.exportKey("jwk", keys.publicKey);
  jwk.kid = "analytics-key";
  const issuer = "https://analytics.clerk.accounts.dev";
  return { issuer, jwk, async token(subject) {
    const now = Math.floor(Date.now() / 1000);
    const header = encode({ alg: "RS256", typ: "JWT", kid: jwk.kid });
    const payload = encode({ iss: issuer, sub: subject, azp: origin, iat: now, nbf: now, exp: now + 300 });
    const input = `${header}.${payload}`;
    const signature = await crypto.subtle.sign("RSASSA-PKCS1-v1_5", keys.privateKey, new TextEncoder().encode(input));
    return `${input}.${Buffer.from(signature).toString("base64url")}`;
  } };
}

function dashboardDb(users, recentSessions = []) {
  return { prepare(sql) {
    const query = sql.replace(/\s+/g, " ").trim();
    let values = [];
    return { bind(...bound) { values = bound; return this; }, async run() { return { meta: { changes: 0 } }; }, async all() {
      if (query.includes("LEFT JOIN users u ON u.id = s.user_id")) return { results: recentSessions };
      return { results: [] };
    }, async first() {
      if (query.includes("FROM users WHERE auth_provider = 'clerk'")) return users[values[0]] || null;
      if (query.includes("COUNT(DISTINCT user_key)")) return { unique_users: 0, sessions: 0, total_seconds: 0, average_seconds: 0, longest_seconds: 0, new_users: 0, returning_users: 0 };
      if (query.includes("COUNT(*) AS count")) return { count: 0 };
      throw new Error(`Unexpected dashboard query: ${query}`);
    } };
  } };
}

test("analytics dashboard API is server-authorized for the Clerk owner only", async () => {
  const origin = "http://127.0.0.1:4173";
  const auth = await authFixture(origin);
  const users = {
    user_owner: { id: "owner-1", auth_subject: "user_owner", display_name: "Alejandro", role: "owner", memory_visitor_id: "owner-1" },
    user_member: { id: "member-1", auth_subject: "user_member", display_name: "Member", role: "user", memory_visitor_id: "member-1" }
  };
  const env = { CLERK_ISSUER: auth.issuer, NINA_MEMORY_DB: dashboardDb(users), ANAM_ESTIMATED_PRICE_PER_MINUTE_EUR: "0.05" };
  const originalFetch = globalThis.fetch;
  globalThis.fetch = async url => String(url).includes("/.well-known/jwks.json")
    ? new Response(JSON.stringify({ keys: [auth.jwk] }))
    : Promise.reject(new Error(`Unexpected fetch: ${url}`));
  const request = token => worker.fetch(new Request("https://worker.example/api/nina/analytics/dashboard", {
    headers: { Origin: origin, ...(token ? { Authorization: `Bearer ${token}` } : {}) }
  }), env, { waitUntil() {} });
  try {
    assert.equal((await request()).status, 401);
    assert.equal((await request(await auth.token("user_member"))).status, 403);
    const owner = await request(await auth.token("user_owner"));
    assert.equal(owner.status, 200);
    assert.equal((await owner.json()).cost.label, "Estimated Anam cost");
  } finally { globalThis.fetch = originalFetch; }
});

test("owner dashboard identifies authenticated sessions from stored users and keeps visitors anonymous", async () => {
  const common = { actor_type: "public", is_returning: 0, status: "ended", started_at: "2026-09-04T10:00:00.000Z", last_seen_at: "2026-09-04T10:01:00.000Z", ended_at: "2026-09-04T10:01:00.000Z", connected_seconds: 60 };
  const recent = [
    { ...common, id: "session-member", user_key: "user:member-123456789", is_authenticated: 1, user_display_name: "Nina Listener", user_email: "listener@example.com" },
    { ...common, id: "session-visitor", user_key: "visitor:visitor-987654321", is_authenticated: 0, user_display_name: null, user_email: null }
  ];
  const data = await getNinaAnalyticsDashboard({ NINA_MEMORY_DB: dashboardDb({}, recent) }, Date.parse("2026-09-04T12:00:00.000Z"));
  assert.deepEqual(data.sessions.map(({ displayName, email, userIdentifier }) => ({ displayName, email, userIdentifier })), [
    { displayName: "Nina Listener", email: "listener@example.com", userIdentifier: "U-member-12345" },
    { displayName: "", email: "", userIdentifier: "V-visitor-9876" }
  ]);
});

test("Nina Admin renders stored identity details without a browser Clerk profile lookup", async () => {
  const frontend = await readFile(new URL("../../js/nina-admin.js", import.meta.url), "utf8");
  assert.match(frontend, /session\.displayName/);
  assert.match(frontend, /session\.email/);
  assert.match(frontend, /Anonymous visitor/);
  assert.doesNotMatch(frontend, /clerk\.user/);
});

test("frontend starts analytics only from markNinaOnline and keeps content out of analytics", async () => {
  const [frontend, migration] = await Promise.all([
    readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8"),
    readFile(new URL("../migrations/0010_nina_analytics.sql", import.meta.url), "utf8")
  ]);
  const beforeReady = frontend.slice(0, frontend.indexOf("function markNinaOnline()"));
  const ready = frontend.slice(frontend.indexOf("function markNinaOnline()"), frontend.indexOf("function clearNinaUsageTimer()"));
  assert.match(ready, /startNinaAnalyticsSession\(\)/);
  assert.doesNotMatch(beforeReady, /startNinaAnalyticsSession\(\)/);
  assert.match(frontend, /ninaAnalyticsLoad|ninaAnalyticsStartPromise/);
  assert.match(frontend, /const NINA_ANALYTICS_HEARTBEAT_MS = 10000;/);
  assert.doesNotMatch(migration, /message|transcript|content/i);
  assert.match(migration, /client_entry_id TEXT NOT NULL UNIQUE/);
});

test("Nina Admin formats connected totals as minutes and seconds", async () => {
  const frontend = await readFile(new URL("../../js/nina-admin.js", import.meta.url), "utf8");
  assert.match(frontend, /metric\(container, "Total connected time", duration\(data\.total_seconds\)\)/);
  assert.match(frontend, /\["Connected time", duration\(\(Number\(cost\.totalMinutes\) \|\| 0\) \* 60\)\]/);
  const duration = seconds => {
    const safe = Math.max(0, Math.round(Number(seconds) || 0));
    return `${Math.floor(safe / 60)}:${String(safe % 60).padStart(2, "0")}`;
  };
  assert.deepEqual([90, 328, 180].map(duration), ["1:30", "5:28", "3:00"]);
});

test("profile menu exposes Nina Analytics only from the authenticated server role", async () => {
  const [frontend, home, project] = await Promise.all([
    readFile(new URL("../../js/nina-access.js", import.meta.url), "utf8"),
    readFile(new URL("../../index.html", import.meta.url), "utf8"),
    readFile(new URL("../../nina-project.html", import.meta.url), "utf8")
  ]);
  for (const page of [home, project]) {
    assert.match(page, /id="ninaAccountAnalytics" href="\.\/nina-admin\/" hidden>Nina Analytics<\/a>/);
  }
  assert.match(frontend, /ninaAccountAnalytics\.hidden = true/);
  assert.match(frontend, /ninaAccountAnalytics\.hidden = data\.role !== "owner"/);
});
