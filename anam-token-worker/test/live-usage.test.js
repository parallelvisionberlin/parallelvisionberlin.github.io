import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import { creditSignalCredits, getSignalCreditBalance } from "../src/credits.js";
import {
  CREDITS_PER_MINUTE, SECONDS_PER_CREDIT, activateLiveNinaSession, createLiveNinaSession,
  creditsToSeconds, failLiveNinaSession, formatLiveTime, settleLiveNinaSession
} from "../src/live-usage.js";

function liveDb() {
  const accounts = new Map();
  const transactions = [];
  const sessions = new Map();
  return { accounts, transactions, sessions, prepare(sql) {
    const query = sql.replace(/\s+/g, " ").trim();
    let values = [];
    return { bind(...bound) { values = bound; return this; }, async run() {
      if (query.startsWith("INSERT OR IGNORE INTO signal_credit_accounts")) {
        if (!accounts.has(values[0])) accounts.set(values[0], { balance:0, lifetime_credited:0, lifetime_debited:0, updated_at:values[2] });
        return { meta:{changes:1} };
      }
      if (query.startsWith("INSERT INTO signal_credit_transactions")) {
        const [id,userId,amount,type,source,referenceId,description,createdAt]=values;
        const duplicate=transactions.find(row=>row.user_id===userId&&row.reference_id===referenceId);
        if(duplicate)throw new Error("UNIQUE constraint failed");
        const account=accounts.get(userId);if(account.balance+amount<0)throw new Error("insufficient_signal_credits");
        transactions.push({id,user_id:userId,amount,type,source,reference_id:referenceId,description,created_at:createdAt});
        account.balance+=amount;account.lifetime_credited+=amount>0?amount:0;account.lifetime_debited+=amount<0?-amount:0;account.updated_at=createdAt;
        return {meta:{changes:1}};
      }
      if (query.startsWith("INSERT INTO live_nina_sessions")) {
        const [id,userId,balance,createdAt,updatedAt]=values;
        sessions.set(id,{id,user_id:userId,status:"pending",started_at:null,last_billed_at:null,billable_until:null,ended_at:null,credits_available_on_start:balance,credits_debited:0,created_at:createdAt,updated_at:updatedAt});
        return {meta:{changes:1}};
      }
      if (query.startsWith("UPDATE live_nina_sessions SET status = 'failed'")) {
        const [endedAt,updatedAt,id,userId]=values,row=sessions.get(id);if(!row||row.user_id!==userId||row.status!=="pending")return{meta:{changes:0}};
        Object.assign(row,{status:"failed",ended_at:endedAt,updated_at:updatedAt});return{meta:{changes:1}};
      }
      if (query.includes("SET status = 'active', started_at")) {
        const [startedAt,lastBilledAt,billableUntil,balance,updatedAt,id,userId]=values,row=sessions.get(id);if(!row||row.user_id!==userId||row.status!=="pending")return{meta:{changes:0}};
        Object.assign(row,{status:"active",started_at:startedAt,last_billed_at:lastBilledAt,billable_until:billableUntil,credits_available_on_start:balance,updated_at:updatedAt});return{meta:{changes:1}};
      }
      if (query.includes("SET credits_debited = MAX")) {
        const [credits,lastBilledAt,status,,endedAt,updatedAt,id,userId]=values,row=sessions.get(id);if(!row||row.user_id!==userId||row.status!=="active")return{meta:{changes:0}};
        row.credits_debited=Math.max(row.credits_debited,credits);row.last_billed_at=lastBilledAt;row.status=status;if(status!=="active")row.ended_at=row.ended_at||endedAt;row.updated_at=updatedAt;return{meta:{changes:1}};
      }
      throw new Error(`Unexpected run: ${query}`);
    }, async first() {
      if(query.includes("FROM signal_credit_accounts"))return accounts.get(values[0])||null;
      if(query.includes("FROM signal_credit_transactions"))return transactions.find(row=>row.user_id===values[0]&&row.reference_id===values[1])||null;
      if(query.includes("FROM live_nina_sessions")){const row=sessions.get(values[0]);return row?.user_id===values[1]?{...row}:null;}
      throw new Error(`Unexpected first: ${query}`);
    }, async all(){return{results:[]}} };
  }};
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
  assert.match(worker,/ownerBypass: user\.role === "owner"/);
  assert.match(worker,/identity\.account_authenticated \? buildRelationshipContext\(env, identity\.user_id\)/);
  assert.doesNotMatch(frontend,/debitSignalCredits/);
});
