// Manual publication only. Reuses the repository's existing Cloudflare secret.
import { writeFileSync,mkdirSync,unlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { spawnSync } from 'node:child_process';
import { pathToFileURL } from 'node:url';
import { config } from './worker.mjs';

export function deploymentConfig(env){
  const c=config({...env,OWNER_SUBJECTS:env.OWNER_SUBJECTS||JSON.stringify(env.OWNER_SUBJECT ? [env.OWNER_SUBJECT] : [])}),host=new URL(c.resource).hostname;
  if(!host.endsWith('.pvlab.studio')||host==='pvlab.studio'||host==='clerk.pvlab.studio')throw Error('Use a dedicated PV LAB subdomain.');
  if(!['true','false'].includes(env.MCP_ACTIVATE))throw Error('Explicit activation choice required.');
  return {
    name:'pvlab-admin-mcp',main:resolve('worker.mjs'),compatibility_date:'2026-11-04',workers_dev:false,
    routes:[{pattern:host,custom_domain:true}],
    vars:{MCP_ENABLED:env.MCP_ACTIVATE,MCP_RESOURCE_URL:c.resource,OAUTH_ISSUER:c.issuer,OAUTH_JWKS_URL:c.jwks,OWNER_SUBJECTS:JSON.stringify(c.subjects)},
    d1_databases:[{binding:'LAB_DB',database_name:'parallel-vision-lab',database_id:'36e13edc-1557-48a3-a49c-08bbc0f9618f'}],
    observability:{enabled:true,head_sampling_rate:1}
  };
}
export async function preflight(c,fetcher=fetch){
  const issuer=c.vars.OAUTH_ISSUER;
  const response=await fetcher(issuer.replace(/\/$/,'')+'/.well-known/oauth-authorization-server',{redirect:'error',signal:AbortSignal.timeout(10000)});
  if(!response.ok)throw Error('OAuth metadata unavailable; no deployment.');
  const m=await response.json();
  if(m.issuer!==issuer||m.jwks_uri!==c.vars.OAUTH_JWKS_URL||!m.code_challenge_methods_supported?.includes('S256')||!['pvlab:read','offline_access'].every(s=>m.scopes_supported?.includes(s)))
    throw Error('OAuth issuer, JWKS, PKCE or custom scope is not ready; no deployment.');
  for(const key of ['authorization_endpoint','token_endpoint']){
    const u=new URL(m[key]);if(u.protocol!=='https:'||u.username||u.password)throw Error('Invalid OAuth endpoint; no deployment.');
  }
  return true;
}
if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv[2]!=='--deploy')throw Error('Explicit --deploy required.');
  const c=deploymentConfig(process.env);
  await preflight(c);
  if(!process.env.CLOUDFLARE_API_TOKEN)throw Error('Cloudflare deployment credential is missing.');
  mkdirSync('.wrangler',{recursive:true});const filename=resolve('.wrangler/admin-deploy.json');
  writeFileSync(filename,JSON.stringify(c));
  try{
    const run=spawnSync(process.execPath,['node_modules/wrangler/bin/wrangler.js','deploy','--config',filename],{
      stdio:'inherit',env:{...process.env,WRANGLER_SEND_METRICS:'false'}});
    if(run.error)throw run.error;
    process.exitCode=run.status??1;
  }finally{unlinkSync(filename);}
}
