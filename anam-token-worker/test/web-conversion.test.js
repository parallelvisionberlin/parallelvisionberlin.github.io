import assert from "node:assert/strict";
import test from "node:test";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { countCompletedExchanges, excludeWebMeasurement, qualifyWebConversation } from "../src/web-conversation.js";
import { createConversationProgress, isNinaWebsite } from "../../js/nina-web-flow.js";

const u = "11111111-1111-4111-8111-111111111111";
const c = "22222222-2222-4222-8222-222222222222";
const l = "33333333-3333-4333-8333-333333333333";
const now = Date.parse("2026-09-09T00:02:00Z");
const iso = n => new Date(n).toISOString();
function fixture() {
  const sqlite = new DatabaseSync(":memory:");
  sqlite.exec("PRAGMA foreign_keys = ON;");
  for (const file of ["0001_nina_memory.sql","0002_authenticated_users.sql","0006_live_nina_sessions.sql","20260909_nina_web_conversations.sql"]) {
    sqlite.exec(readFileSync(new URL(`../migrations/${file}`, import.meta.url), "utf8"));
  }
  const start = iso(now-90000);
  sqlite.prepare("INSERT INTO visitors VALUES (?,?,?,?,?)").run(u,"Visitor","visitor",start,start);
  sqlite.prepare("INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)").run(u,"clerk","user_test","test@example.invalid","Visitor","user",u,start,start);
  sqlite.prepare("INSERT INTO conversations VALUES (?,?,?,NULL)").run(c,u,start);
  sqlite.prepare("INSERT INTO live_nina_sessions VALUES (?,?,'active',?,?,?,NULL,30,10,?,?)").run(l,u,start,start,iso(now+90000),start,start);
  ["persona","user","persona","user","persona"].forEach((role,i) => sqlite.prepare("INSERT INTO messages VALUES (?,?,?,?,?,?)").run(`m${i}`,c,u,role,"private text never exported",iso(now-80000+i*5000)));
  const db = { prepare(sql) { return { bind(...values) { return {
    async first() { return sqlite.prepare(sql).get(...values) || null; },
    async all() { return { results: sqlite.prepare(sql).all(...values) }; },
    async run() { const result=sqlite.prepare(sql).run(...values);return {meta:{changes:Number(result.changes)}}; }
  }; } }; } };
  return {sqlite,env:{NINA_MEMORY_DB:db,META_CAPI_ACCESS_TOKEN:"test"}, user:{id:u,memory_visitor_id:u,role:"user",email:"test@example.invalid"}, input:{conversationId:c,usageSessionId:l,audioConfirmed:true,marketingAllowed:true}, info:{eventSourceUrl:"https://parallelvisionlabel.com/nina-project.html"}};
}

test("web flow never opts the native Nina page into new audio behavior", () => {
  assert.equal(isNinaWebsite("/nina-app.html"),false);
  assert.equal(isNinaWebsite("/nina-project.html"),true);
});
test("qualified progress excludes greetings, repeats, silence, failed output and hidden playback", () => {
  let clock=0;const p=createConversationProgress(()=>clock);
  p.observe([{role:"persona"},{role:"persona"}]);clock=90000;
  assert.equal(p.qualifies(true,true,true),false);
  p.observe([{role:"user"},{role:"persona"},{role:"user"},{role:"persona"}]);clock+=59000;
  assert.equal(p.qualifies(true,true,true),false);clock+=1000;
  assert.equal(p.qualifies(true,true,true),true);
  for(const args of [[false,true,true],[true,false,true],[true,true,false]]) assert.equal(p.qualifies(...args),false);
  p.fail();assert.equal(p.qualifies(true,true,true),false);
});
test("server counts responses to distinct user turns, never opening monologues", () => {
  assert.deepEqual(countCompletedExchanges([{role:"persona"},{role:"persona"},{role:"user"},{role:"user"},{role:"persona"},{role:"persona"}]),{userMessages:2,replies:1});
});
test("owner and configured test accounts do not qualify", async () => {
  const f=fixture();assert.equal(excludeWebMeasurement({}, {...f.user,role:"owner"}),true);
  f.env.NINA_ANALYTICS_EXCLUDED_USER_IDS=u;
  assert.equal((await qualifyWebConversation(f.env,f.user,f.input,f.info,now)).excluded,true);
});
test("server verifies ownership, duration, actual exchanges and output confirmation", async () => {
  const f=fixture();const send=async()=>assert.fail("must not send");
  for(const input of [{...f.input,audioConfirmed:false},{...f.input,conversationId:"not-id"}]) assert.equal((await qualifyWebConversation(f.env,f.user,input,f.info,now,send)).qualified,false);
  assert.equal((await qualifyWebConversation(f.env,{...f.user,id:"someone-else"},f.input,f.info,now,send)).qualified,false);
  assert.equal((await qualifyWebConversation(f.env,f.user,f.input,f.info,now-60000,send)).qualified,false);
  f.sqlite.exec("DELETE FROM messages WHERE message_id = 'm4'");
  assert.equal((await qualifyWebConversation(f.env,f.user,f.input,f.info,now,send)).qualified,false);
});
test("first qualifying conversation persists once, sends no transcript, and reuses a stable Meta ID", async () => {
  const f=fixture();const events=[];const send=async(_,event)=>{events.push(event);return {accepted:true};};
  const a=await qualifyWebConversation(f.env,f.user,f.input,f.info,now,send);
  const b=await qualifyWebConversation(f.env,f.user,f.input,f.info,now+2000,send);
  assert.equal(a.qualified,true);assert.equal(a.metaSent,true);assert.equal(a.eventId,b.eventId);assert.equal(events.length,1);
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM nina_qualified_conversations").get().n,1);
  assert.ok(!JSON.stringify(events).includes("private text"));
  assert.deepEqual(Object.keys(events[0]).sort(),["eventName","eventId","eventSourceUrl","clientUserAgent","clientIpAddress","fbp","fbc","email"].sort());
});
test("failed CAPI retries use the acquisition ID; marketing-off records only first-party milestone", async () => {
  const f=fixture();const events=[];
  const send=async(_,event)=>{events.push(event);if(events.length===1)throw new Error("network");};
  const a=await qualifyWebConversation(f.env,f.user,f.input,f.info,now,send);
  const b=await qualifyWebConversation(f.env,f.user,f.input,f.info,now+1000,send);
  assert.equal(a.metaSent,false);assert.equal(b.metaSent,true);assert.equal(events[0].eventId,events[1].eventId);
  const late=await qualifyWebConversation(f.env,f.user,f.input,f.info,now+86400001,send);
  assert.equal(late.emitPixel,false);
  const noConsent=fixture();const result=await qualifyWebConversation(noConsent.env,noConsent.user,{...noConsent.input,marketingAllowed:false},noConsent.info,now,()=>assert.fail("must not send"));
  assert.equal(result.qualified,true);assert.equal(result.emitPixel,false);
});
test("new milestone cascades on account deletion; additive migration is repeatable", async () => {
  const f=fixture();await qualifyWebConversation(f.env,f.user,{...f.input,marketingAllowed:false},f.info,now);
  f.sqlite.exec(readFileSync(new URL('../migrations/20260909_nina_web_conversations.sql',import.meta.url),'utf8'));
  f.sqlite.prepare("DELETE FROM users WHERE id=?").run(u);
  assert.equal(f.sqlite.prepare("SELECT count(*) n FROM nina_qualified_conversations").get().n,0);
});
test("website wiring keeps native microphone acquisition and app bridge unchanged", () => {
  const source=readFileSync(new URL('../../js/nina-access.js',import.meta.url),'utf8');
  assert.match(source,/streamToVideoElement\("nina-anam-video", ninaMicrophoneStream\)/);
  assert.match(source,/window\.__PV_NINA_AUTH_PROVIDER__/);
  assert.match(source,/if \(NINA_WEB_FLOW && ninaTrialActivationPending/);
  assert.match(source,/ninaWebAudio\?\.confirmed\(\)/);
  assert.match(source,/CONTINUE · 6 MIN · €3\.50/);
  assert.match(source,/addNinaPurchaseReturn\(true\)/);
  assert.match(source,/resumeNinaWebAuth\(clerk\)/);
  const worker=readFileSync(new URL('../src/index.js',import.meta.url),'utf8');
  assert.match(worker,/body\.webFlowVersion === 1 && !owner/);
  assert.match(worker,/Use verified conversation endpoint/);
});

test("deleting conversation memory does not reset acquisition deduplication", async () => {
  const f=fixture();await qualifyWebConversation(f.env,f.user,{...f.input,marketingAllowed:false},f.info,now);
  f.sqlite.prepare("DELETE FROM conversations WHERE conversation_id = ?").run(c);
  const row=f.sqlite.prepare("SELECT * FROM nina_qualified_conversations").get();
  assert.ok(row);assert.equal(row.conversation_id,null);assert.ok(row.event_id);
});
