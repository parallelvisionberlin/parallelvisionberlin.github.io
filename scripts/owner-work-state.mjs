#!/usr/bin/env node
// One repository-owned work index for Owner and future project sessions.
import {readFile, writeFile, rename, open, unlink} from 'node:fs/promises';
import path from 'node:path';
import {fileURLToPath} from 'node:url';

export const WORK_STATUSES=Object.freeze(['planned','in_progress','needs_verification','deployed']);
export const DEFAULT_WORK_STATE=fileURLToPath(new URL('../lab/owner-work-records.json',import.meta.url));
const SHA=/^[a-f\d]{40}$/i;
const ID=/^[a-z\d]+(?:-[a-z\d]+)*$/;
const DATE=/^\d{4}-\d{2}-\d{2}(?:T\d{2}:\d{2}:\d{2}(?:\.\d{1,3})?Z)?$/;
const DEPLOY_STATES=['not_started','pending','blocked','verified','unverified'];
const EVIDENCE_KINDS=['source','automated_test','fixture','deployment','production_asset','production_health','signed_in_production','documented'];

function fail(message){throw new Error(message);}
function string(value,label,{empty=false,max=3000}={}){
  if(typeof value!=='string'||(!empty&&!value.trim())||value.length>max||/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/.test(value))fail(label+' must be a bounded text string.');
}
function array(value,label,max=80){if(!Array.isArray(value)||value.length>max)fail(label+' must be an array with at most '+max+' entries.');}
function date(value,label){if(typeof value!=='string'||!DATE.test(value)||!Number.isFinite(Date.parse(value)))fail(label+' must be an ISO date or UTC timestamp.');}
function sha(value,label){if(value!==null&&value!==undefined&&!(typeof value==='string'&&SHA.test(value)))fail(label+' must be a full commit SHA or null.');}
function repoPath(value,label){string(value,label,{max:300});if(value.startsWith('/')||value.includes('\\')||value.split('/').includes('..')||/[:\r\n]/.test(value))fail(label+' must be a relative repository path.');}
function url(value,label){
  string(value,label,{max:1500});let parsed;
  try{parsed=new URL(value);}catch{fail(label+' must be an HTTPS URL.');}
  if(parsed.protocol!=='https:'||parsed.username||parsed.password)fail(label+' must be an HTTPS URL without credentials.');
}
function source(value,label){if(value===undefined)return;if(/^https?:|^[a-z]+:/i.test(value))url(value,label);else repoPath(value,label);}
function textList(value,label){array(value,label,30);value.forEach((v,i)=>string(v,`${label}[${i}]`));}
function evidence(value,label){
  if(!value||typeof value!=='object'||Array.isArray(value))fail(label+' must be an object.');
  if(!EVIDENCE_KINDS.includes(value.kind))fail(label+'.kind is unknown.');
  string(value.summary,label+'.summary');string(value.scope,label+'.scope');
  if(value.observedAt!==undefined)date(value.observedAt,label+'.observedAt');
  source(value.source,label+'.source');textList(value.limitations,label+'.limitations');
}
export function validateWorkRecord(record){
  if(!record||typeof record!=='object'||Array.isArray(record))fail('Record must be an object.');
  if(!ID.test(record.id||''))fail('Record id must use lowercase words separated by hyphens.');
  for(const key of ['title','component','summary','nextAction'])string(record[key],record.id+'.'+key);
  if(!WORK_STATUSES.includes(record.status))fail(record.id+'.status is unknown.');
  date(record.updatedAt,record.id+'.updatedAt');
  for(const key of ['baselineSha','reviewedSha'])sha(record[key],record.id+'.'+key);
  if(record.branch!==null&&record.branch!==undefined)string(record.branch,record.id+'.branch',{max:200});
  array(record.files,record.id+'.files');record.files.forEach((v,i)=>repoPath(v,`${record.id}.files[${i}]`));
  array(record.links,record.id+'.links',20);record.links.forEach((v,i)=>{string(v?.label,`${record.id}.links[${i}].label`);url(v.url,`${record.id}.links[${i}].url`);});
  array(record.tests,record.id+'.tests',30);record.tests.forEach((v,i)=>{
    const label=`${record.id}.tests[${i}]`;
    for(const key of ['label','scope'])string(v?.[key],label+'.'+key);
    if(!['passed','failed','not_run','documented'].includes(v.result))fail(label+'.result is unknown.');
    if(v.observedAt!==undefined)date(v.observedAt,label+'.observedAt');
    source(v.source,label+'.source');
  });
  const d=record.deployment;
  if(!d||!DEPLOY_STATES.includes(d.state))fail(record.id+'.deployment.state is unknown.');
  string(d.environment,record.id+'.deployment.environment');sha(d.sourceSha,record.id+'.deployment.sourceSha');
  if(d.observedAt!==undefined)date(d.observedAt,record.id+'.deployment.observedAt');
  if(d.evidenceUrl!==undefined)url(d.evidenceUrl,record.id+'.deployment.evidenceUrl');
  textList(d.limitations,record.id+'.deployment.limitations');
  array(record.evidence,record.id+'.evidence',40);record.evidence.forEach((v,i)=>evidence(v,`${record.id}.evidence[${i}]`));
  textList(record.blockers,record.id+'.blockers');textList(record.doNotRepeat,record.id+'.doNotRepeat');
  if(record.status==='deployed'&&(d.state!=='verified'||!d.sourceSha||!record.evidence.some(v=>['production_asset','deployment','signed_in_production'].includes(v.kind))))
    fail(record.id+': deployed requires a verified publication, source SHA and explicit publication evidence.');
  return record;
}
export function validateWorkState(state){
  if(!state||state.schemaVersion!==1)fail('Unsupported work-state schemaVersion.');
  date(state.updatedAt,'updatedAt');array(state.records,'records',200);
  array(state.handoffs,'handoffs',40);
  const handoffIds=new Set();
  state.handoffs.forEach((entry,i)=>{
    if(!ID.test(entry?.id||'')||handoffIds.has(entry.id))fail('Invalid or duplicate handoff id.');
    handoffIds.add(entry.id);string(entry.title,`handoffs[${i}].title`);string(entry.scope,`handoffs[${i}].scope`);repoPath(entry.path,`handoffs[${i}].path`);
  });
  const ids=new Set();
  state.records.forEach(record=>{validateWorkRecord(record);if(ids.has(record.id))fail('Duplicate work record: '+record.id);ids.add(record.id);});
  return state;
}
export async function readWorkState(file=DEFAULT_WORK_STATE){return validateWorkState(JSON.parse(await readFile(file,'utf8')));}
export function upsertWorkRecord(state,record){
  validateWorkState(state);validateWorkRecord(record);
  const index=state.records.findIndex(v=>v.id===record.id);
  const records=state.records.slice();if(index<0)records.push(record);else records[index]=record;
  const updatedAt=Date.parse(record.updatedAt)>Date.parse(state.updatedAt)?record.updatedAt:state.updatedAt;
  return validateWorkState({...state,updatedAt,records});
}
async function stdin(){let result='';for await(const chunk of process.stdin){result+=chunk;if(result.length>500_000)fail('Input is too large.');}return result;}
export async function main(args=process.argv.slice(2)){
  const input=args.slice();let file=DEFAULT_WORK_STATE;const flag=input.indexOf('--file');
  if(flag>=0){if(!input[flag+1])fail('--file needs a path.');file=path.resolve(input[flag+1]);input.splice(flag,2);}
  const [command='read',idOrPath,...extra]=input;if(extra.length)fail('Unexpected arguments.');
  if(!['read','validate','upsert'].includes(command))fail('Use read [id], validate, or upsert [record.json|-], with optional --file path.');
  const state=await readWorkState(file);
  if(command==='validate'){if(idOrPath)fail('validate takes no record id.');process.stdout.write(`Valid work memory: ${state.records.length} records.\n`);return;}
  if(command==='read'){
    const value=idOrPath?state.records.find(v=>v.id===idOrPath):state;
    if(!value)fail('Unknown work record: '+idOrPath);
    process.stdout.write(JSON.stringify(value,null,2)+'\n');return;
  }
  const raw=idOrPath&&idOrPath!=='-'?await readFile(idOrPath,'utf8'):await stdin();
  const record=JSON.parse(raw);validateWorkRecord(record);
  // Read the latest dataset under a short exclusive write lock; preserve other tasks.
  const lockPath=file+'.lock',temp=file+`.${process.pid}.tmp`;let lock;
  try{lock=await open(lockPath,'wx',0o600);}catch(error){if(error.code==='EEXIST')fail('Work memory is being updated; inspect the current file before retrying.');throw error;}
  try{
    const latest=await readWorkState(file);
    const previous=latest.records.find(v=>v.id===record.id);
    if(previous&&Date.parse(record.updatedAt)<Date.parse(previous.updatedAt))fail('Refusing to replace a newer work record.');
    const next=upsertWorkRecord(latest,record);
    await writeFile(temp,JSON.stringify(next,null,2)+'\n',{mode:0o600});await rename(temp,file);
  }finally{await lock.close();await unlink(lockPath);await unlink(temp).catch(error=>{if(error.code!=='ENOENT')throw error;});}
  process.stdout.write(`Updated work record: ${record.id}.\n`);
}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))main().catch(error=>{process.stderr.write(error.message+'\n');process.exitCode=1;});
