import test from 'node:test';import assert from 'node:assert/strict';
import { fixture } from './fixture.js';import {kvFixture,clerkFixture} from './auth-fixture.js';
import {authHandler,mcpHandler,authorizeApi,ownerFromClerk,trustedCallback,SCOPE,SITE,ORIGIN} from '../src/access.js';
const post=(path,value,headers={})=>new Request(ORIGIN+path,{method:'POST',headers:{'Content-Type':'application/json',...headers},body:JSON.stringify(value)});

test('Only exact HTTPS ChatGPT callback hosts, not lookalikes, credentials or fragments',()=>{
 assert.equal(trustedCallback('https://chatgpt.com/connector/oauth/test'),true);
 for(const url of ['http://chatgpt.com/x','https://chatgpt.com.evil.test/x','https://evil.test/?chatgpt.com','https://u:p@chatgpt.com/x','https://chatgpt.com/x#token','javascript:alert(1)'])assert.equal(trustedCallback(url),false);
});
test('Consent requires signed-in stored owner, production origin and explicit approval',async()=>{
 const f=fixture(),kv=kvFixture(),auth=await clerkFixture(),previous=globalThis.fetch;
 globalThis.fetch=async()=>new Response(JSON.stringify({keys:[auth.jwk]}));
 const env={...f.env,OAUTH_KV:kv,CLERK_ISSUER:auth.issuer};
 try{
 const req=(token,origin=SITE)=>post('/revoke-all',{confirm:true},{Origin:origin,...(token?{Authorization:'Bearer '+token}:{})});
 assert.equal(await ownerFromClerk(req(null),env),null);
 assert.equal(await ownerFromClerk(req(await auth.token('user_publica')),env),null);
 const owner=await auth.token('user_ownera');assert.equal((await ownerFromClerk(req(owner),env)).role,'owner');
 assert.equal(await ownerFromClerk(req(owner,'https://evil.test'),env),null);
 assert.equal(await ownerFromClerk(req(await auth.token('user_ownera','http://localhost:4173')),env),null);
 const resp=await authHandler.fetch(req(owner),env);assert.equal(resp.status,200);assert.ok(kv.store.has('nina-owner-epoch:owner-a'));
 }finally{globalThis.fetch=previous;f.sqlite.close();}
});
test('MCP requires granted owner props, stored owner role and current access epoch',async()=>{
 const f=fixture(),kv=kvFixture(),env={...f.env,OAUTH_KV:kv};try{
 assert.equal(await authorizeApi(null,env,{}),null);
 assert.equal(await authorizeApi(null,env,{props:{ownerId:'public-a',scope:SCOPE,epoch:'initial'}}),null);
 const ctx={props:{ownerId:'owner-a',scope:SCOPE,epoch:'initial'}};
 assert.ok(await authorizeApi(null,env,ctx));await kv.put('nina-owner-epoch:owner-a','revoked');assert.equal(await authorizeApi(null,env,ctx),null);
 assert.equal((await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/list'}),env,ctx)).status,401);
 }finally{f.sqlite.close();}
});
test('Protocol exposes only read tools and rejects writes, malformed input, unauthorized origins',async()=>{
 const f=fixture(),env={...f.env,OAUTH_KV:kvFixture()},ctx={props:{ownerId:'owner-a',scope:SCOPE,epoch:'initial'}};try{
 const list=await (await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',id:1,method:'tools/list'}),env,ctx)).json();assert.equal(list.result.tools.length,4);
 const deny=await (await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'delete'}}),env,ctx)).json();assert.ok(deny.error);
 const bad=await (await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',id:2,method:'tools/call',params:{name:'search',arguments:{sql:'DELETE FROM users'}}}),env,ctx)).json();assert.equal(bad.result.isError,true);
 const res=await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',id:3,method:'tools/list'},{Origin:'https://evil.test'}),env,ctx);assert.equal(res.status,403);
 const notification=await mcpHandler.fetch(post('/mcp',{jsonrpc:'2.0',method:'notifications/initialized'}),env,ctx);assert.equal(notification.status,202);
 }finally{f.sqlite.close();}
});
test('Authorization route rejects missing PKCE before invoking provider or saving state',async()=>{
 const f=fixture(),kv=kvFixture();try{const res=await authHandler.fetch(new Request(ORIGIN+'/authorize'),{...f.env,OAUTH_KV:kv});assert.equal(res.status,400);assert.equal(kv.store.size,0);}finally{f.sqlite.close();}
});
