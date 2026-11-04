import test from 'node:test';
import assert from 'node:assert/strict';
import {deploymentConfig,preflight} from '../deploy.mjs';
const env={MCP_RESOURCE_URL:'https://admin-tools.pvlab.studio/mcp',OAUTH_ISSUER:'https://clerk.pvlab.studio',
  OAUTH_JWKS_URL:'https://clerk.pvlab.studio/.well-known/jwks.json',OWNER_SUBJECTS:'["owner-fixture"]',MCP_ACTIVATE:'false'};
const metadata={issuer:env.OAUTH_ISSUER,jwks_uri:env.OAUTH_JWKS_URL,code_challenge_methods_supported:['S256'],
  scopes_supported:['pvlab:read','offline_access'],authorization_endpoint:env.OAUTH_ISSUER+'/oauth/authorize',token_endpoint:env.OAUTH_ISSUER+'/oauth/token'};
test('deployment uses a dedicated hostname, is explicitly activated and has no provider, Stripe or R2 bindings',()=>{
  const c=deploymentConfig(env);assert.equal(c.vars.MCP_ENABLED,'false');assert.equal(c.vars.OAUTH_ISSUER,env.OAUTH_ISSUER);
  assert.deepEqual(c.routes,[{pattern:'admin-tools.pvlab.studio',custom_domain:true}]);assert.equal(c.d1_databases.length,1);
  assert.ok(!c.r2_buckets);assert.ok(!c.services);
  for(const hostname of ['pvlab.studio','clerk.pvlab.studio','evil.test'])assert.throws(()=>deploymentConfig({...env,MCP_RESOURCE_URL:'https://'+hostname+'/mcp'}));
  assert.throws(()=>deploymentConfig({...env,MCP_ACTIVATE:undefined}));
});
test('publication preflight rejects missing scope, different issuer, missing PKCE and failing discovery',async()=>{
  const c=deploymentConfig(env);
  assert.equal(await preflight(c,async()=>Response.json(metadata)),true);
  for(const change of [{issuer:env.OAUTH_ISSUER+'/'},{jwks_uri:'https://evil.test/jwks'},{scopes_supported:[]},{code_challenge_methods_supported:[]}])
    await assert.rejects(preflight(c,async()=>Response.json({...metadata,...change})));
  await assert.rejects(preflight(c,async()=>new Response('',{status:503})));
});
