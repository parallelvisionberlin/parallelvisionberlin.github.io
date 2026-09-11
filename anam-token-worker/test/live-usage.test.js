import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { DatabaseSync } from "node:sqlite";
import { readFileSync } from "node:fs";
import { creditSignalCredits, ensureVerifiedSignupTrial, getSignalCreditBalance } from "../src/credits.js";
import {
  CREDITS_PER_MINUTE, SECONDS_PER_CREDIT, SIGNUP_TRIAL_GRACE_SECONDS, activateLiveNinaSession, beginLiveNinaTrialGrace, createLiveNinaSession,
  creditsToSeconds, failLiveNinaSession, formatLiveTime, settleLiveNinaSession
} from "../src/live-usage.js";

function liveDb() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = OFF");
  for (const file of ["0001_nina_memory.sql", "0002_authenticated_users.sql", "0003_signal_credits.sql", "0006_live_nina_sessions.sql"]) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  sqlite.exec("PRAGMA foreign_keys = OFF");
  return {
    sqlite,
    get transactions() { return sqlite.prepare("SELECT * FROM signal_credit_transactions ORDER BY rowid").all(); },
    sessions: { get(id) { return sqlite.prepare("SELECT * FROM live_nina_sessions WHERE id = ?").get(id); } },
    prepare(sql) {
      let values = [];
      return {
        bind(...bound) { values = bound; return this; },
        async run() { return { meta: { changes: Number(sqlite.prepare(sql).run(...values).changes) } }; },
        async first() { return sqlite.prepare(sql).get(...values) || null; },
        async all() { return { results: sqlite.prepare(sql).all(...values) }; }
      };
    }
  };
}

async function fundedSession(credits, start = Date.parse("2026-08-28T12:00:00Z")) {
  const db=liveDb(),env={NINA_MEMORY_DB:db},user={id:"user-1",role:"user"};
  await creditSignalCredits(env,user.id,credits,{source:"test",referenceId:`fund-${credits}`});
  const opened=await createLiveNinaSession(env,user,start);await activateLiveNinaSession(env,user,opened.sessionId,start);
  return {db,env,user,sessionId:opened.sessionId,start};
}

test("canonical Live Nina conversion stays integer and exact",()=>{
  assert.equal(CREDITS_PER_MINUTE,10);assert.equal(SECONDS_PER_CREDIT,6);
  for(const [credits,seconds] of [[10,60],[30,180],[100,600],[300,1800],[750,4500]])assert.equal(creditsToSeconds(credits),seconds);
  assert.equal(formatLiveTime(23),"2:18");
});

test("zero-credit users cannot open paid Live Nina and owners bypass the full billing lifecycle",async()=>{
  const db=liveDb(),env={NINA_MEMORY_DB:db};
  await assert.rejects(()=>createLiveNinaSession(env,{id:"u",role:"user"}),error=>error.code==="insufficient_credits");
  const owner={id:"owner",role:"owner"};
  assert.equal((await createLiveNinaSession(env,owner)).bypass,true);
  assert.equal((await activateLiveNinaSession(env,owner,null)).bypass,true);
  const settled=await settleLiveNinaSession(env,owner,null,{end:true});
  assert.equal(settled.bypass,true);assert.equal(settled.debited,0);
  assert.equal(db.transactions.length,0);
});

test("verified memory-shaped user identity receives one trial and can create a Live Nina session",async()=>{
  const originalFetch=globalThis.fetch;
  globalThis.fetch=async()=>new Response(JSON.stringify({
    primary_email_address_id:"idn_primary",
    email_addresses:[{id:"idn_primary",verification:{status:"verified"}}]
  }),{status:200});
  try {
    const db=liveDb(),env={NINA_MEMORY_DB:db,CLERK_SECRET_KEY:"clerk-secret"};
    const identity={user_id:"user-memory-shape",visitor_id:"memory-visitor",role:"user",account_authenticated:true};
    const first=await ensureVerifiedSignupTrial(env,identity,"user_clerk");
    const repeated=await ensureVerifiedSignupTrial(env,identity,"user_clerk");
    const opened=await createLiveNinaSession(env,identity);
    assert.equal(first.granted,true);
    assert.equal(repeated.granted,false);
    assert.equal(opened.balance,30);
    assert.equal(opened.remainingSeconds,180);
    assert.equal(opened.trialActivationPending,true);
    assert.equal(db.transactions.filter(row=>row.source==="signup_trial").length,1);
    assert.equal(db.sessions.get(opened.sessionId).user_id,identity.user_id);
  } finally { globalThis.fetch=originalFetch; }
});

test("signup-trial setup grace is cumulative across reconnects while first speech can always activate",async()=>{
  const start=Date.parse("2026-09-01T12:00:00Z");
  const db=liveDb(),env={NINA_MEMORY_DB:db},user={id:"trial-user",role:"user"};
  await creditSignalCredits(env,user.id,30,{source:"signup_trial",referenceId:"signup-trial:trial-user"});

  const first=await createLiveNinaSession(env,user,start);
  const firstReady=await beginLiveNinaTrialGrace(env,user,first.sessionId,start+1000);
  assert.equal(firstReady.graceSeconds,60);
  await settleLiveNinaSession(env,user,first.sessionId,{end:true,now:start+31000});
  assert.equal((await getSignalCreditBalance(env,user.id)).balance,30);

  const second=await createLiveNinaSession(env,user,start+32000);
  const secondReady=await beginLiveNinaTrialGrace(env,user,second.sessionId,start+33000);
  assert.equal(secondReady.graceSeconds,30);
  await settleLiveNinaSession(env,user,second.sessionId,{end:true,now:start+63000});

  const third=await createLiveNinaSession(env,user,start+64000);
  const thirdReady=await beginLiveNinaTrialGrace(env,user,third.sessionId,start+65000);
  assert.equal(thirdReady.graceSeconds,0);
  // Spending the setup grace never blocks a real first utterance from starting the trial.
  await activateLiveNinaSession(env,user,third.sessionId,start+70000);
  const settled=await settleLiveNinaSession(env,user,third.sessionId,{now:start+76000});
  assert.equal(settled.debited,1);
  assert.equal(settled.balance,29);

  const purchasedDb=liveDb(),purchasedEnv={NINA_MEMORY_DB:purchasedDb},purchasedUser={id:"paid-user",role:"user"};
  await creditSignalCredits(purchasedEnv,purchasedUser.id,60,{source:"stripe_checkout",referenceId:"purchase-1"});
  const purchased=await createLiveNinaSession(purchasedEnv,purchasedUser,start);
  assert.equal(purchased.trialActivationPending,false);
});

test("frontend delays only trial activation until a new completed user message and has a dedicated grace-timeout state",async()=>{
  const frontend=await readFile(new URL("../../js/nina-access.js",import.meta.url),"utf8");
  assert.match(frontend,/NINA_SIGNUP_TRIAL_GRACE_MS = 60000/);
  assert.match(frontend,/if \(ninaTrialActivationPending\) \{\s*beginNinaTrialGrace\(attempt, client\);\s*return;/);
  assert.ok((frontend.match(/if \(ninaTrialActivationPending\) \{/g)||[]).length>=3);
  assert.match(frontend,/completedMessages\.some\(message => message\.role === "user"\)/);
  assert.match(frontend,/knownKeys\.has\(key\) \|\| ninaSessionMessageKeys\.has\(key\)/);
  assert.match(frontend,/!role \|\| !content \|\| message\?\.interrupted/);
  assert.match(frontend,/setNinaScrim\("WE CAN'T HEAR YOU", "", "Check your microphone and try again\.", "TRY AGAIN"\)/);
  assert.match(frontend,/ninaUsageActivationPromise = requestNinaUsage\("activate"\)/);
  assert.match(frontend,/if \(ninaTrialActivationPending\) beginNinaTrialGrace\(attempt, client\);\s*else\s*\{\s*connectionPhase = "activation";\s*await activateNinaUsage/);
  const cannotHear=frontend.match(/function showNinaCannotHear\(\) \{[\s\S]*?\n\}/)?.[0]||"";
  assert.doesNotMatch(cannotHear,/CONNECTION FAILED/);
});

test("failed startup and sub-six-second sessions debit nothing",async()=>{
  const {db,env,user,sessionId,start}=await fundedSession(10);
  const pending=await createLiveNinaSession(env,user,start);await failLiveNinaSession(env,user.id,pending.sessionId,start+1000);
  assert.equal(db.transactions.filter(row=>row.type==="debit").length,0);
  await settleLiveNinaSession(env,user,sessionId,{end:true,now:start+5999});
  assert.equal((await getSignalCreditBalance(env,user.id)).balance,10);
});

test("completed six-second units debit exactly and periodic retries are idempotent",async()=>{
  const {db,env,user,sessionId,start}=await fundedSession(20);
  assert.equal((await settleLiveNinaSession(env,user,sessionId,{now:start+6000})).debited,1);
  assert.equal((await settleLiveNinaSession(env,user,sessionId,{now:start+6000})).debited,0);
  assert.equal((await settleLiveNinaSession(env,user,sessionId,{now:start+60000})).debited,9);
  assert.deepEqual(db.transactions.filter(row=>row.source==="anam_session").map(row=>row.reference_id),[`anam-session:${sessionId}:through:1`, `anam-session:${sessionId}:through:10`]);
  assert.equal((await getSignalCreditBalance(env,user.id)).balance,10);
  assert.equal(db.transactions.filter(row=>row.source==="anam_session").reduce((sum,row)=>sum-row.amount,0),10);
});

test("session end settles completed units once and exhaustion cannot go negative",async()=>{
  const first=await fundedSession(5);
  assert.equal((await settleLiveNinaSession(first.env,first.user,first.sessionId,{end:true,now:first.start+17000})).debited,2);
  assert.equal((await settleLiveNinaSession(first.env,first.user,first.sessionId,{end:true,now:first.start+17000})).debited,0);
  assert.equal((await getSignalCreditBalance(first.env,first.user.id)).balance,3);
  const last=await fundedSession(1);
  const exhausted=await settleLiveNinaSession(last.env,last.user,last.sessionId,{now:last.start+6000});
  assert.equal(exhausted.status,"exhausted");assert.equal(exhausted.balance,0);
});

test("migration and frontend wire only authenticated Live Nina lifecycle billing",async()=>{
  const [migration,frontend,worker]=await Promise.all([readFile(new URL("../migrations/0006_live_nina_sessions.sql",import.meta.url),"utf8"),readFile(new URL("../../js/nina-access.js",import.meta.url),"utf8"),readFile(new URL("../src/index.js",import.meta.url),"utf8")]);
  assert.match(migration,/CREATE TABLE live_nina_sessions/);assert.match(migration,/credits_debited INTEGER/);
  assert.match(frontend,/\/api\/nina\/live\/\$\{action\}/);assert.match(frontend,/requestNinaUsage\("activate"\)/);assert.match(frontend,/requestNinaUsage\(end \? "end" : "settle"/);
  assert.match(frontend,/Text conversations do not use Signal Credits/);
  assert.match(frontend,/if \(ninaOwnerBypass\) showNinaReady\(null, "OWNER SIGNAL · UNMETERED"\)/);
  assert.match(worker,/ownerBypass: identity\.user\.role === "owner"/);
  assert.match(worker,/identity\.account_authenticated \? buildRelationshipContext\(env, identity\.user_id\)/);
  assert.doesNotMatch(frontend,/debitSignalCredits/);
});

test("overlapping settlements use the real ledger atomically and survive a stale session row", async () => {
  const { db, env, user, sessionId, start } = await fundedSession(30);
  await Promise.all([6, 12, 18, 24, 30, 30, 36, 42, 42, 48].map(seconds =>
    settleLiveNinaSession(env, user, sessionId, { now: start + seconds * 1000 })));
  assert.equal((await getSignalCreditBalance(env, user.id)).balance, 22);
  assert.equal(db.transactions.filter(t => t.source === "anam_session").reduce((sum, t) => sum - t.amount, 0), 8);
  // A crash after the ledger insert but before the session summary update
  // cannot make a retry charge already recorded time again.
  db.sqlite.prepare("UPDATE live_nina_sessions SET credits_debited = 0 WHERE id = ?").run(sessionId);
  assert.equal((await settleLiveNinaSession(env, user, sessionId, { now: start + 48000 })).debited, 0);
  assert.equal((await getSignalCreditBalance(env, user.id)).balance, 22);
  await Promise.all([48, 54, 60].map(seconds => settleLiveNinaSession(env, user, sessionId, { end: true, now: start + seconds * 1000 })));
  const balance = (await getSignalCreditBalance(env, user.id)).balance;
  await settleLiveNinaSession(env, user, sessionId, { now: start + 180000 });
  assert.equal((await getSignalCreditBalance(env, user.id)).balance, balance);
});

test("grace does not restart on duplicate ready, abandoned setup, or a trial reconnection", async () => {
  const db = liveDb(), env = { NINA_MEMORY_DB: db }, user = { id: "recover", role: "user" };
  const start = Date.parse("2026-09-11T12:00:00Z");
  await creditSignalCredits(env, user.id, 30, { source: "signup_trial", referenceId: "signup-trial:recover" });
  const first = await createLiveNinaSession(env, user, start);
  assert.equal((await beginLiveNinaTrialGrace(env, user, first.sessionId, start)).graceSeconds, 60);
  assert.equal((await beginLiveNinaTrialGrace(env, user, first.sessionId, start + 20000)).graceSeconds, 40);
  const retry = await createLiveNinaSession(env, user, start + 61000);
  assert.equal(retry.trialSetupRecovery, true);
  const ready = await beginLiveNinaTrialGrace(env, user, retry.sessionId, start + 62000);
  assert.equal(ready.graceSeconds, 0);
  assert.equal(ready.recoverySeconds, 10);
  await activateLiveNinaSession(env, user, retry.sessionId, start + 65000);
  await settleLiveNinaSession(env, user, retry.sessionId, { end: true, now: start + 77000 });
  const next = await createLiveNinaSession(env, user, start + 80000);
  assert.equal(next.trialActivationPending, false);
  assert.equal(next.balance, 28);
  await activateLiveNinaSession(env, user, next.sessionId, start + 81000);
  const duplicate = await activateLiveNinaSession(env, user, next.sessionId, start + 87000);
  assert.equal(duplicate.remainingSeconds, 162);
});
