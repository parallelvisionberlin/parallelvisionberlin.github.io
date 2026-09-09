import test from 'node:test';import assert from 'node:assert/strict';
import provider from '../src/index.js';
import {fixture} from './fixture.js';import {kvFixture,clerkFixture} from './auth-fixture.js';
import {ORIGIN,SITE} from '../src/access.js';

test('Real OAuth provider: no anonymous access, PKCE owner consent, token read, scope and revocation',async()=>{
 const f=fixture(),auth=await clerkFixture(),previous=globalThis.fetch;
 globalThis.fetch=async url=>{if(String(url).startsWith(auth.issuer+'/'))return new Response(JSON.stringify({keys:[auth.jwk]}));throw new Error('Unexpected external request');};
 const env={...f.env,OAUTH_KV:kvFixture(),CLERK_ISSUER:auth.issuer};
 const ctx={waitUntil(){},passThroughOnException(){}};
 const send=(path,options)=>provider.fetch(new Request(ORIGIN+path,options),env,ctx);
 const json=value=>({'Content-Type':'application/json'});
 try{
  const unauth=await send('/mcp',{method:'POST',headers:json(),body:JSON.stringify({jsonrpc:'2.0',id:1,method:'tools/list'})});
  assert.equal(unauth.status,401);assert.ok(unauth.headers.get('WWW-Authenticate')?.includes('resource_metadata'));
  const register=await send('/oauth/register',{method:'POST',headers:json(),body:JSON.stringify({client_name:'Synthetic ChatGPT test',redirect_uris:['https://chatgpt.com/connector/oauth/nina-test'],token_endpoint_auth_method:'none',grant_types:['authorization_code','refresh_token'],response_types:['code'],scope:'nina:read'})});
  assert.equal(register.status,201);const client=await register.json();
  const verifier='A'.repeat(43);const digest=await crypto.subtle.digest('SHA-256',new TextEncoder().encode(verifier));
  const params=new URLSearchParams({client_id:client.client_id,redirect_uri:client.redirect_uris[0],response_type:'code',scope:'nina:read',state:'test-state',code_challenge:Buffer.from(digest).toString('base64url'),code_challenge_method:'S256',resource:ORIGIN+'/mcp'});
  const authorize=await send('/authorize?'+params);assert.equal(authorize.status,302);
  const approval=new URL(authorize.headers.get('Location'));assert.equal(approval.origin,SITE);const id=new URLSearchParams(approval.hash.slice(1)).get('request');assert.ok(id);
  const userToken=await auth.token('user_publica');
  const denied=await send('/consent',{method:'POST',headers:{...json(),Origin:SITE,Authorization:'Bearer '+userToken},body:JSON.stringify({id,approve:true})});assert.equal(denied.status,403);
  const ownerToken=await auth.token('user_ownera');
  const approved=await send('/consent',{method:'POST',headers:{...json(),Origin:SITE,Authorization:'Bearer '+ownerToken},body:JSON.stringify({id,approve:true})});assert.equal(approved.status,200);
  const callback=new URL((await approved.json()).redirectTo);assert.equal(callback.searchParams.get('state'),'test-state');
  const tokenResponse=await send('/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:new URLSearchParams({grant_type:'authorization_code',client_id:client.client_id,code:callback.searchParams.get('code'),redirect_uri:client.redirect_uris[0],code_verifier:verifier,resource:ORIGIN+'/mcp'})});
  assert.equal(tokenResponse.status,200);const token=await tokenResponse.json();assert.ok(token.access_token);assert.ok(token.refresh_token);
  const call=()=>send('/mcp',{method:'POST',headers:{...json(),Authorization:'Bearer '+token.access_token},body:JSON.stringify({jsonrpc:'2.0',id:3,method:'tools/call',params:{name:'search',arguments:{day:'2026-09-09',query:'public-a'}}})});
  const result=await call();assert.equal(result.status,200);const data=await result.json();assert.equal(data.result.isError,false);assert.equal(data.result.structuredContent.results[0].user_id,'public-a');
  const revoked=await send('/revoke-all',{method:'POST',headers:{...json(),Origin:SITE,Authorization:'Bearer '+ownerToken},body:JSON.stringify({confirm:true})});assert.equal(revoked.status,200);assert.equal((await call()).status,401);
 }finally{globalThis.fetch=previous;f.sqlite.close();}
});
