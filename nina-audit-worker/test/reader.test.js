import test from 'node:test';
import assert from 'node:assert/strict';
import { DatabaseSync } from 'node:sqlite';
import { readFileSync } from 'node:fs';
import { berlinMidnight,period,readDb,searchConversations,fetchConversation,accountActivity,periodSummary } from '../src/data.js';
import { approvedCallback,boundedJson,ownerFromClerk,validGrantOwner,handleConsent,SCOPE,SITE,AUDIT } from '../src/access.js';
import { TOOLS,handleProtocol } from '../src/protocol.js';
const NOW=Date.parse('2026-09-09T12:00:00Z');
function fixture(){
 const sqlite=new DatabaseSync(':memory:');
 for(const file of ['0001_nina_memory.sql','0002_authenticated_users.sql','0003_signal_credits.sql','0004_signal_credit_purchases.sql','0006_live_nina_sessions.sql','0010_nina_analytics.sql','20260909_nina_web_conversations.sql']){
  sqlite.exec(readFileSync(new URL('../../anam-token-worker/migrations/'+file,import.meta.url),'utf8'));
 }
 for(const [id,role,subject] of [['owner','owner','user_Owner'],['reader','user','user_Regular']]){
  sqlite.prepare('INSERT INTO visitors VALUES (?,?,?,?,?)').run(id,id,role==='owner'?'owner':'visitor','2026-09-08T22:01:00.000Z','2026-09-08T22:01:00.000Z');
  sqlite.prepare('INSERT INTO users VALUES (?,?,?,?,?,?,?,?,?)').run(id,'clerk',subject,id+'@example.invalid',id,role,id,'2026-09-08T22:01:00.000Z','2026-09-08T22:01:00.000Z');
  sqlite.prepare('INSERT INTO conversations VALUES (?,?,?,?)').run('convo-'+id,id,'2026-09-08T22:05:00.000Z','2026-09-08T22:08:00.000Z');
  for(let n=0;n<5;n++)sqlite.prepare('INSERT INTO messages VALUES (?,?,?,?,?,?)').run(id+n,'convo-'+id,id,n%2?'user':'persona',id+' saved text '+n,'2026-09-08T22:06:0'+n+'.000Z');
  sqlite.prepare('INSERT INTO nina_analytics_sessions VALUES (?,?,?,?,?,?,?,?,?,?,?,?,?,?)').run('call-'+id,'entry-'+id,'browser-'+id,id,'user:'+id,1,role==='owner'?'owner':'public',0,'ended','2026-09-08T22:05:10.000Z','2026-09-08T22:06:10.000Z','2026-09-08T22:06:10.000Z',60,'2026-09-08');
  sqlite.prepare('INSERT INTO signal_credit_accounts VALUES (?,0,0,0,?,?)').run(id,'2026-09-08T22:00:00.000Z','2026-09-08T22:00:00.000Z');
 }
 sqlite.prepare('INSERT INTO signal_credit_transactions VALUES (?,?,30,?,?,?,?,?)').run('trial','reader','credit','signup_trial','trial-reader','Synthetic trial','2026-09-08T22:01:00.000Z');
 const queries=[];
 const db={prepare(sql){queries.push(sql);const make=args=>({bind(...a){return make(a)},async first(){return sqlite.prepare(sql).get(...args)||null},async all(){return {results:sqlite.prepare(sql).all(...args)}}});return make([])}};
 const store=new Map();
 const env={NINA_MEMORY_DB:db,AUDIT_ENABLED:'true',AUDIT_ORIGIN:AUDIT,SITE_ORIGIN:SITE,CLERK_ISSUER:'https://reader-test.clerk.accounts.dev',
  OAUTH_KV:{async get(k,type){const v=store.get(k);return type==='json'&&v?JSON.parse(v):v||null},async put(k,v){store.set(k,v)},async delete(k){store.delete(k)}}};
 return {sqlite,queries,env,store};
}
const props={userId:'owner',subject:'user_Owner',scope:SCOPE};
const closed=async(fn)=>{const f=fixture();try{await fn(f)}finally{f.sqlite.close()}};
test('Berlin day includes calls after local midnight while UTC is still yesterday',async()=>closed(async({env})=>{
 assert.equal(new Date(berlinMidnight(NOW)).toISOString(),'2026-09-08T22:00:00.000Z');
 const r=await searchConversations(env,{},NOW);assert.equal(r.results.length,1);assert.equal(r.results[0].id,'convo-reader');
 assert.equal(r.results[0].userMessages,2);assert.equal(r.results[0].ninaMessages,3);
}));
test('Berlin midnight handles winter and both DST dates',()=>{
 for(const [date,wanted] of [['2026-12-09T11:00Z','2026-12-08T23:00:00.000Z'],['2026-03-29T11:00Z','2026-03-28T23:00:00.000Z'],['2026-10-25T11:00Z','2026-10-24T22:00:00.000Z']])assert.equal(new Date(berlinMidnight(Date.parse(date))).toISOString(),wanted);
});
test('queries and invalid ranges cannot become SQL',async()=>closed(async({env,sqlite})=>{
 assert.equal((await searchConversations(env,{query:"' OR 1=1 --"},NOW)).results.length,0);
 assert.throws(()=>period({from:'2026-09-01',to:'2026-09-02'},NOW));
 await assert.rejects(fetchConversation(env,{id:"x';DROP TABLE users;"}));assert.equal(sqlite.prepare('SELECT COUNT(*) AS n FROM users').get().n,2);
 assert.throws(()=>readDb(env).prepare('DELETE FROM messages'));
 assert.equal(readDb(env).prepare('SELECT 1').run,undefined);
}));
test('owner explicit inclusion and every transcript page retain exact source text',async()=>closed(async({env})=>{
 const a=await searchConversations(env,{includeOwner:true,limit:1},NOW);assert.equal(a.results.length,1);assert.equal(a.nextOffset,1);
 const b=await searchConversations(env,{includeOwner:true,limit:1,offset:a.nextOffset},NOW);assert.equal(b.results.length,1);assert.equal(b.nextOffset,null);
 let offset=0,all=[];do{const r=await fetchConversation(env,{id:'convo-reader',limit:2,offset});all.push(...r.messages);offset=r.nextOffset;}while(offset!==null);
 assert.equal(all.length,5);assert.ok(all.every(m=>m.content.startsWith('reader saved text')));
}));
test('account activity distinguishes connected time from ledger and returns missing optional data honestly',async()=>closed(async({env,sqlite})=>{
 sqlite.exec('DROP TABLE nina_qualified_conversations');const r=await accountActivity(env,{userId:'reader'},NOW);
 assert.equal(r.analytics.data.records[0].connectedSeconds,60);assert.equal(r.balance.data.balance,30);
 assert.equal(r.ledger.data.records[0].source,'signup_trial');assert.deepEqual(r.live.data.records,[]);
 assert.equal(r.qualification.available,false);assert.equal(r.qualification.data,null);
}));
test('read summary does not mutate users, calls, credits or transcripts',async()=>closed(async({env,queries})=>{
 const r=await periodSummary(env,{},NOW);assert.equal(r.sessions.data.sessions,1);assert.equal(r.registrations.data.users,1);
 await fetchConversation(env,{id:'convo-reader'});await accountActivity(env,{userId:'reader'},NOW);
 assert.ok(queries.every(q=>/^\s*SELECT\b/.test(q)));
}));
test('permission is owner-only, rechecked, scoped and disabled by kill switch',async()=>closed(async({env,sqlite})=>{
 assert.equal(await validGrantOwner(env,props),true);
 for(const bad of [null,{...props,scope:'write'},{...props,userId:'reader'},{...props,subject:'user_Other'}])assert.equal(await validGrantOwner(env,bad),false);
 assert.equal(await validGrantOwner({...env,AUDIT_ENABLED:'false'},props),false);
 sqlite.prepare("UPDATE users SET role='user' WHERE id='owner'").run();assert.equal(await validGrantOwner(env,props),false);
}));
test('callback validation rejects off-domain, HTTP and user-info URLs',()=>{
 assert.equal(approvedCallback('https://chatgpt.com/connector_platform/oauth_redirect'),true);
 for(const u of ['https://chatgpt.com.evil.invalid/cb','http://chatgpt.com/cb','https://evil.invalid','https://name:pass@chatgpt.com/cb','javascript:alert(1)'])assert.equal(approvedCallback(u),false);
});
test('all exposed tools are read-only; no unauthenticated or wrong-owner tool use',async()=>closed(async({env})=>{
 assert.ok(TOOLS.every(t=>t.annotations.readOnlyHint===true&&t.annotations.destructiveHint===false));
 const req=method=>new Request(AUDIT+'/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:1,method})});
 assert.equal((await handleProtocol(req('tools/list'),env,{})).status,403);
 const r=await handleProtocol(req('tools/list'),env,props);assert.equal((await r.json()).result.tools.length,4);
 const init=await handleProtocol(req('initialize'),env,props);assert.equal((await init.json()).result.protocolVersion,'2025-06-18');
}));
test('MCP fetch returns exact paginated records and rejects arbitrary operations',async()=>closed(async({env})=>{
 const req=(name,args)=>new Request(AUDIT+'/mcp',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name,arguments:args}})});
 const ok=await (await handleProtocol(req('fetch',{id:'convo-reader',limit:2}),env,props)).json();assert.equal(ok.result.structuredContent.messages.length,2);
 const bad=await (await handleProtocol(req('fetch',{id:'convo-reader',sql:'DELETE'}),env,props)).json();assert.equal(bad.error.code,-32602);
 const unknown=await (await handleProtocol(req('delete',{}),env,props)).json();assert.equal(unknown.error.code,-32602);
}));
test('body bounds reject oversized, arrays and invalid content types',async()=>{
 for(const [body,type] of [['x'.repeat(17000),'application/json'],['[]','application/json'],['{}','text/plain']])await assert.rejects(boundedJson(new Request(AUDIT,{method:'POST',headers:{'Content-Type':type},body})));
});
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
test('real RSA-signed Clerk proof, explicit consent, pending expiry and revocation',async()=>closed(async({env,store})=>{
 const keys=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
 const jwk=await crypto.subtle.exportKey('jwk',keys.publicKey);jwk.kid='reader-key';
 const original=globalThis.fetch;globalThis.fetch=async()=>new Response(JSON.stringify({keys:[jwk]}));
 const token=async subject=>{const now=Math.floor(Date.now()/1000),input=encode({alg:'RS256',kid:jwk.kid})+'.'+encode({iss:env.CLERK_ISSUER,sub:subject,azp:SITE,iat:now,exp:now+300});return input+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',keys.privateKey,new TextEncoder().encode(input))).toString('base64url')};
 let grants=0,revocations=0;
 env.OAUTH_PROVIDER={async parseAuthRequest(req){return {clientId:'client',redirectUri:new URL(req.url).searchParams.get('redirect_uri'),scope:[SCOPE]}},async lookupClient(){return {clientName:'ChatGPT'}},async completeAuthorization(params){assert.equal(params.userId,'owner');assert.deepEqual(params.scope,[SCOPE]);grants++;return {redirectTo:'https://chatgpt.com/connector_platform/oauth_redirect?code=synthetic'}},async listUserGrants(){return {items:[{id:'grant-id',scope:[SCOPE]}]}},async revokeGrant(id,user){assert.equal(id,'grant-id');assert.equal(user,'owner');revocations++}};
 try{
  const ownerToken=await token('user_Owner'),userToken=await token('user_Regular');
  const req=(path,data={},bearer=ownerToken)=>new Request(AUDIT+path,{method:'POST',headers:{Origin:SITE,Authorization:'Bearer '+bearer,'Content-Type':'application/json'},body:JSON.stringify(data)});
  assert.equal(await ownerFromClerk(env,req('/connect/inspect',{},userToken)),null);
  const authUrl=AUDIT+'/authorize?redirect_uri='+encodeURIComponent('https://chatgpt.com/connector_platform/oauth_redirect')+'&code_challenge_method=S256&code_challenge='+'a'.repeat(43);
  const begin=await handleConsent(new Request(authUrl),env);assert.equal(begin.status,302);
  const id=new URL(begin.headers.get('Location')).hash.slice(1);assert.equal(id.length,64);
  assert.equal((await handleConsent(req('/connect/inspect',{request:id}),env)).status,200);
  assert.equal((await handleConsent(req('/connect/approve',{request:id,consent:false}),env)).status,400);assert.equal(grants,0);
  assert.equal((await handleConsent(req('/connect/approve',{request:id,consent:true}),env)).status,200);assert.equal(grants,1);assert.equal(store.size,0);
  assert.equal((await handleConsent(req('/connect/approve',{request:id,consent:true}),env)).status,400);
  assert.equal((await handleConsent(req('/connect/revoke',{grantId:'grant-id'}),env)).status,200);assert.equal(revocations,1);
 }finally{globalThis.fetch=original}
}));
