import {readFileSync,writeFileSync,existsSync} from 'node:fs';
import {dirname,join} from 'node:path';
import {fileURLToPath} from 'node:url';
import {spawnSync} from 'node:child_process';
const root=dirname(fileURLToPath(import.meta.url));
process.chdir(root);
const cli=join(root,'node_modules/wrangler/bin/wrangler.js');
function run(args,capture=false){
  const result=spawnSync(process.execPath,[cli,...args],{cwd:root,encoding:'utf8',stdio:capture?'pipe':'inherit'});
  if(result.status!==0){if(capture)process.stderr.write(result.stderr||'');throw new Error('Wrangler failed. No further steps were run.');}
  return result.stdout||'';
}
try {
  if(!existsSync(cli))throw new Error('Install nina-audit-worker dependencies first: npm.cmd install');
  const base=JSON.parse(readFileSync('wrangler.json','utf8'));
  if(base.name!=='parallel-vision-nina-audit')throw new Error('Unexpected Worker name');
  const configPath='wrangler.deploy.json';
  let config;
  if(existsSync(configPath)){
    config=JSON.parse(readFileSync(configPath,'utf8'));
    if(config.name!==base.name || !/^[0-9a-f]{32}$/.test(config.kv_namespaces?.[0]?.id || ''))throw new Error('Invalid local audit configuration');
    config={...base,kv_namespaces:config.kv_namespaces};
  } else {
    // Reuse the dedicated namespace on repeat setup; never touch any existing Nina storage.
    const text=run(['kv','namespace','list','--config','wrangler.json'],true);
    let list;try{list=JSON.parse(text);}catch{throw new Error('Could not read KV namespace list. Nothing was changed.');}
    const title=base.name+'-OAUTH_KV';
    let id=list.find(item=>item.title===title)?.id;
    if(!id){
      const created=run(['kv','namespace','create','OAUTH_KV','--config','wrangler.json'],true);
      id=created.match(/"id"\s*:\s*"([0-9a-f]{32})"/i)?.[1] || created.match(/id\s*=\s*"([0-9a-f]{32})"/i)?.[1];
      if(!id)throw new Error('KV was created, but its ID could not be read. Rerun setup to reuse the namespace.');
    }
    if(!/^[0-9a-f]{32}$/i.test(id))throw new Error('Invalid KV ID');
    config={...base,kv_namespaces:[{binding:'OAUTH_KV',id}]};
  }
  writeFileSync(configPath,JSON.stringify(config,null,2)+'\n');
  run(['deploy','--config',configPath,'--dry-run']);
  run(['deploy','--config',configPath]);
  console.log('\nAudit Worker deployed. Add this to ChatGPT as an OAuth custom app:\n'+base.vars.AUDIT_ORIGIN+'/mcp');
  console.log('Your live Nina calling/payment Worker was not deployed or changed.');
} catch(error){console.error(error.message);process.exitCode=1;}
