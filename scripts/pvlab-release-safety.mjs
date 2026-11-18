// Local/mocked tests only. This runner never deploys or supplies credentials.
import {readFileSync,existsSync} from 'node:fs';
import {resolve,dirname} from 'node:path';
import {fileURLToPath,pathToFileURL} from 'node:url';
import {spawnSync} from 'node:child_process';

const root=resolve(dirname(fileURLToPath(import.meta.url)),'..');
export const profile=JSON.parse(readFileSync(new URL('../.github/pvlab-customer-safety.json',import.meta.url),'utf8'));

export function runSafety({execute=spawnSync,files=profile.tests,directory=root}={}){
  if(!Array.isArray(files)||!files.length||new Set(files).size!==files.length)
    throw Error('Safety suite must contain a nonempty, unique set of tests.');
  for(const file of files){
    if(!/^tests\/[a-z0-9-]+\.test\.mjs$/.test(file)||!existsSync(resolve(directory,file)))
      throw Error('Missing or invalid safety test: '+file);
  }
  const result=execute(process.execPath,['--test',...files],{cwd:directory,stdio:'inherit'});
  if(result.error)throw result.error;
  return Number.isInteger(result.status)&&result.status===0&&!result.signal?0:1;
}

if(process.argv[1]&&import.meta.url===pathToFileURL(resolve(process.argv[1])).href){
  if(process.argv.length!==2){console.error('Run the complete suite: node scripts/pvlab-release-safety.mjs');process.exitCode=1;}
  else try{process.exitCode=runSafety();}catch(error){console.error(error.message);process.exitCode=1;}
}
