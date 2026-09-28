import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import test from "node:test";
import vm from "node:vm";
import { extractConversationalPreferredName, getAccountPreferences, getBillingHistory, learnPreferredNameFromConversation, updateAccountProfile, updateNewsletterPreferences } from "../src/account.js";
import { clearUserMemory } from "../src/memory.js";
import worker from "../src/index.js";

function accountDb() {
  const preferences = new Map();
  const users = new Map([["user-a", { display_name: "A" }], ["user-b", { display_name: "B" }]]);
  const visitors = new Map([["memory-a", { display_name: "A" }], ["memory-b", { display_name: "B" }]]);
  const purchases = [
    { id:"p1",user_id:"user-a",pack_id:"signal_30",credits:30,currency:"eur",amount_total:300,status:"paid",created_at:"2026-08-01T00:00:00Z",paid_at:"2026-08-01T00:01:00Z" },
    { id:"p2",user_id:"user-b",pack_id:"signal_100",credits:100,currency:"eur",amount_total:900,status:"paid",created_at:"2026-08-02T00:00:00Z",paid_at:"2026-08-02T00:01:00Z" }
  ];
  const messages = new Map();
  return { preferences, users, visitors, purchases, messages, prepare(sql) { sql=sql.replace(/nina_(?:personal|scoped)_messages/g,"messages"); const normalized=sql.replace(/\s+/g," ").trim();let values=[];return {bind(...bound){values=bound;return this},async run(){if(normalized.startsWith("INSERT OR IGNORE INTO account_preferences")){if(!preferences.has(values[0]))preferences.set(values[0],{preferred_name:"",language:"en",newsletter_updates:0,nina_transmissions:0,updated_at:values[2]});return{meta:{changes:1}}}if(normalized.startsWith("UPDATE account_preferences SET preferred_name")&&normalized.includes("language")){Object.assign(preferences.get(values[3]),{preferred_name:values[0],language:values[1],updated_at:values[2]});return{meta:{changes:1}}}if(normalized.startsWith("UPDATE account_preferences SET preferred_name")){Object.assign(preferences.get(values[2]),{preferred_name:values[0],updated_at:values[1]});return{meta:{changes:1}}}if(normalized.startsWith("UPDATE account_preferences")&&normalized.includes("newsletter_updates")){Object.assign(preferences.get(values[3]),{newsletter_updates:values[0],nina_transmissions:values[1],updated_at:values[2]});return{meta:{changes:1}}}if(normalized.startsWith("UPDATE users")){if(users.has(values[2]))users.get(values[2]).display_name=values[0];return{meta:{changes:1}}}if(normalized.startsWith("UPDATE visitors")){if(visitors.has(values[2]))visitors.get(values[2]).display_name=values[0];return{meta:{changes:1}}}throw new Error(`Unexpected run: ${normalized}`)},async first(){if(normalized.includes("FROM account_preferences"))return preferences.get(values[0])||null;throw new Error(`Unexpected first: ${normalized}`)},async all(){if(normalized.includes("FROM messages"))return{results:messages.get(`${values[0]}:${values[1]}`)||[]};if(normalized.includes("FROM signal_credit_purchases"))return{results:purchases.filter(row=>row.user_id===values[0]).slice(0,values[1])};throw new Error(`Unexpected all: ${normalized}`)}}},async batch(statements){for(const statement of statements)await statement.run()}};
}

test("profile preferences are isolated by authenticated internal user", async () => {
  const db=accountDb(),env={NINA_MEMORY_DB:db};
  await updateAccountProfile(env,{id:"user-a",role:"user",memory_visitor_id:"memory-a"},{preferredName:"  Zoë  ",language:"de"});
  assert.equal((await getAccountPreferences(env,"user-a")).preferredName,"Zoë");
  assert.equal((await getAccountPreferences(env,"user-b")).preferredName,"");
  assert.equal(db.users.get("user-b").display_name,"B");
});

test("newsletter preferences persist per account", async () => {
  const db=accountDb(),env={NINA_MEMORY_DB:db};
  await updateNewsletterPreferences(env,"user-a",{newsletterUpdates:true,ninaTransmissions:false});
  assert.deepEqual({...(await getAccountPreferences(env,"user-a")),updatedAt:undefined},{preferredName:"",language:"en",newsletterUpdates:true,ninaTransmissions:false,updatedAt:undefined});
});

test("completed conversations learn and replace only explicit preferred names", async () => {
  const db=accountDb(),env={NINA_MEMORY_DB:db};
  db.messages.set("memory-a:conversation-1",[
    {content:"My friend Vlad moved to Berlin."},{content:"My name is Vlad."},{content:"Call me papi."},{content:"Actually call me V."}
  ]);
  assert.deepEqual(await learnPreferredNameFromConversation(env,"user-a","memory-a","conversation-1"),{updated:true,preferredName:"V"});
  assert.equal((await getAccountPreferences(env,"user-a")).preferredName,"V");
  db.messages.set("memory-a:conversation-2",[{content:"My friend Vlad is visiting."}]);
  assert.deepEqual(await learnPreferredNameFromConversation(env,"user-a","memory-a","conversation-2"),{updated:false,preferredName:""});
  assert.equal((await getAccountPreferences(env,"user-a")).preferredName,"V");
});

test("conversational preferred-name extraction is narrow and supports explicit address forms", () => {
  assert.equal(extractConversationalPreferredName("My name is Vlad."),"Vlad");
  assert.equal(extractConversationalPreferredName("I'm Vlad."),"Vlad");
  assert.equal(extractConversationalPreferredName("Call me papi."),"papi");
  assert.equal(extractConversationalPreferredName("You can call me Papi."),"Papi");
  assert.equal(extractConversationalPreferredName("Don't call me Vlad, call me Vladi."),"Vladi");
  assert.equal(extractConversationalPreferredName("Call me papi from now on."),"papi");
  assert.equal(extractConversationalPreferredName("My friend Vlad moved to Berlin."),"");
  assert.equal(extractConversationalPreferredName("I'm tired."),"");
});

test("billing history cannot read another user's purchases", async () => {
  const rows=await getBillingHistory({NINA_MEMORY_DB:accountDb()},"user-a");
  assert.equal(rows.length,1);assert.equal(rows[0].packId,"signal_30");assert.equal(rows[0].amount,3);
});

test("account migration and frontend preserve profile-memory separation", async () => {
  const [migration,page,frontend,accountCss,index,project,app]=await Promise.all([
    readFile(new URL("../migrations/0005_account_preferences.sql",import.meta.url),"utf8"),readFile(new URL("../../account.html",import.meta.url),"utf8"),readFile(new URL("../../js/account.js",import.meta.url),"utf8"),readFile(new URL("../../css/account.css",import.meta.url),"utf8"),readFile(new URL("../../index.html",import.meta.url),"utf8"),readFile(new URL("../../nina-project.html",import.meta.url),"utf8"),readFile(new URL("../../nina-app.html",import.meta.url),"utf8")
  ]);
  assert.match(migration,/CREATE TABLE account_preferences/);assert.match(migration,/user_id TEXT PRIMARY KEY REFERENCES users\(id\)/);
  assert.match(page,/id="memoryConfirm" hidden/);assert.match(frontend,/method:"DELETE",body:"\{\}"/);assert.match(frontend,/\/api\/account\/billing/);
  assert.match(index,/id="ninaAccountShell">/);assert.match(project,/id="ninaAccountShell">/);assert.match(index,/id="ninaAccountLoggedOut"/);
  assert.match(frontend,/clearLocalNinaMemory/);assert.match(frontend,/openConfirm/);assert.match(frontend,/clerk\?\.openSignIn/);
  assert.match(accountCss,/\[hidden\]\s*\{\s*display:\s*none\s*!important/);
  assert.match(frontend,/paid:"COMPLETED",open:"NOT COMPLETED",failed:"FAILED",expired:"EXPIRED"/);
  assert.match(frontend,/paid:"ABGESCHLOSSEN",open:"NICHT ABGESCHLOSSEN",failed:"FEHLGESCHLAGEN",expired:"ABGELAUFEN"/);
  assert.doesNotMatch(frontend,/\$\{row\.status\}/);
  for(const [name,html] of [["Homepage",index],["Nina project",project],["Native app",app]]){
    const accountMenu=html.match(/<div\b[^>]*class="nina-account-menu"[^>]*>([\s\S]*?)<\/div>/)?.[1];
    assert.ok(accountMenu,`${name} account menu exists`);
    assert.match(accountMenu,/Profile<\/a>/);assert.match(accountMenu,/Billing<\/a>/);assert.match(accountMenu,/Memory<\/a>/);
    assert.match(accountMenu,/<a id="ninaAccountNewsletter" href="\.\/account\.html#newsletter" hidden>Newsletter<\/a>/);
  }
  assert.match(page,/id="newsletterForm"/);assert.match(frontend,/api\("\/api\/account\/preferences"/);
  assert.match(page,/id="deleteAccountSection" hidden/);
});

test("newsletter menu follows authenticated account role and resets on logout", async () => {
  const source=await readFile(new URL("../../js/nina-access.js",import.meta.url),"utf8");
  const extract=name=>{
    const match=source.match(new RegExp(`(?:async )?function ${name}\\([^]*?\\n\\}`));
    assert.ok(match,`Production function ${name} exists`);
    return match[0];
  };
  let responseData={role:"user",displayName:"Visitor"}, responseOk=true, fetchCalls=0;
  const clerk={isSignedIn:true,session:{getToken:async()=>"test-token"}};
  const state={
    ninaAccountNewsletter:{hidden:true},ninaAccountName:{textContent:""},
    ninaAccountAnalytics:{hidden:true},ninaAccountLab:{hidden:true},
    ninaReferralCodeValue:"",ninaReferralLink:"",ninaClerk:clerk,
    ANAM_SESSION_TOKEN_ENDPOINT:"https://worker.example/session-token",
    normalizedReferralCode:value=>value||"",submitCapturedReferral:async()=>{},
    fetch:async(url,options)=>{fetchCalls++;assert.equal(url,"https://worker.example/api/account");assert.equal(options.headers.Authorization,"Bearer test-token");return{ok:responseOk,json:async()=>responseData};},
    ninaTrialPromotion:{setUser(){}},ninaSignIn:null,ninaSignInEmail:null,
    ninaAccountShell:null,ninaAccountLoggedOut:null,ninaAccountLoggedIn:null,
    ninaCreditsUserId:"user-a",ninaCreditsRequest:0,ninaCreditsBalance:null,
    ninaCreditsLoadPromise:null,ninaCreditsLoadUserId:"",ninaOwnerBypass:false,
    clearSignalCreditSnapshot(){},syncNinaAccountCreditActions(){},
    ninaSignalCredits:null,ninaLiveTime:null,ninaAccountPanel:null
  };
  vm.createContext(state);
  vm.runInContext(extract("loadAccountDisplayName")+"\n"+extract("updateNinaAccountControls"),state);
  for(const role of ["user","owner",undefined,"unexpected"]){
    responseData={role};
    await state.loadAccountDisplayName(clerk);
    assert.equal(state.ninaAccountNewsletter.hidden,role!=="user",`Newsletter visibility for ${role}`);
    assert.equal(state.ninaAccountAnalytics.hidden,role!=="owner");
    assert.equal(state.ninaAccountLab.hidden,role!=="owner");
  }
  responseData={role:"user"};
  await state.loadAccountDisplayName(clerk);
  assert.equal(state.ninaAccountNewsletter.hidden,false);
  responseOk=false;
  await state.loadAccountDisplayName(clerk);
  assert.equal(state.ninaAccountNewsletter.hidden,true,"Failed account lookup cannot show Newsletter");
  responseOk=true;
  await state.loadAccountDisplayName(clerk);
  state.updateNinaAccountControls({isSignedIn:false,session:null});
  assert.equal(state.ninaAccountNewsletter.hidden,true,"Signing out clears role-specific visibility");
  const callsBeforeLogout=fetchCalls;
  await state.loadAccountDisplayName({isSignedIn:false,session:null});
  assert.equal(fetchCalls,callsBeforeLogout,"Signed-out account does not fetch role data");
});

test("authenticated memory deletion cannot delete credits, purchases or profile preferences", () => {
  const source=clearUserMemory.toString();
  for(const table of ["conversations","memory_summaries","pinned_memories","open_threads"])assert.match(source,new RegExp(`DELETE FROM ${table}`));
  assert.doesNotMatch(source,/signal_credit|account_preferences|DELETE FROM users|DELETE FROM visitors/);
});

test("account APIs reject requests without a verified Clerk session", async () => {
  for(const [path,method] of [["/api/account","GET"],["/api/account/referral","POST"],["/api/account/profile","PUT"],["/api/account/preferences","PUT"],["/api/account/billing","GET"]]){
    const response=await worker.fetch(new Request(`https://worker.example${path}`,{method,headers:{Origin:"https://parallelvisionlabel.com","Content-Type":"application/json"},...(["POST","PUT"].includes(method)?{body:"{}"}:{})}),{}, {waitUntil(){}});
    assert.equal(response.status,401);
  }
});
