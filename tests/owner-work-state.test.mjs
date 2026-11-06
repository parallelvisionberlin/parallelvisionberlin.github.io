import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,readFile,writeFile,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import path from 'node:path';
import {fileURLToPath} from 'node:url';
import {execFile} from 'node:child_process';
import {promisify} from 'node:util';
import {readWorkState,validateWorkState,validateWorkRecord,upsertWorkRecord,DEFAULT_WORK_STATE} from '../scripts/owner-work-state.mjs';
const exec=promisify(execFile);
const cli=fileURLToPath(new URL('../scripts/owner-work-state.mjs',import.meta.url));
const copy=value=>JSON.parse(JSON.stringify(value));

test('shared memory validates and links scoped existing project handoffs',async()=>{
  const state=await readWorkState();
  assert.equal(state.schemaVersion,1);
  assert.ok(state.records.some(v=>v.id==='owner-operational-workspace'));
  assert.ok(state.handoffs.some(v=>v.id==='soul'&&v.path.includes('README.md')));
  assert.ok(state.handoffs.some(v=>v.id==='purchase'&&v.path.includes('IMAGE-SUBMIT')));
  assert.equal(new Set(state.records.map(v=>v.id)).size,state.records.length);
});

test('deployed publication evidence never implies signed-in production behavior',async()=>{
  const state=await readWorkState();
  const record=state.records.find(v=>v.id==='owner-partners');
  assert.equal(record.status,'deployed');
  assert.equal(record.deployment.state,'verified');
  assert.ok(record.evidence.some(v=>v.kind==='production_asset'));
  assert.equal(record.evidence.some(v=>v.kind==='signed_in_production'),false);
  assert.ok(record.deployment.limitations.some(v=>/signed-in/.test(v)));
  assert.equal(validateWorkRecord(record),record);
  const unsupported=copy(record);unsupported.evidence=[];
  assert.throws(()=>validateWorkRecord(unsupported),/explicit publication evidence/);
});

test('rejects unknown states, duplicate records and unsafe sources before writing',async()=>{
  const state=await readWorkState();
  const badStatus=copy(state.records[0]);badStatus.status='all_done';
  assert.throws(()=>validateWorkRecord(badStatus),/status is unknown/);
  const badUrl=copy(state.records[0]);badUrl.links[0].url='javascript:alert(1)';
  assert.throws(()=>validateWorkRecord(badUrl),/HTTPS/);
  const credentials=copy(state.records[0]);credentials.links[0].url='https://secret:password@example.com';
  assert.throws(()=>validateWorkRecord(credentials),/without credentials/);
  const escape=copy(state.records[0]);escape.files[0]='../private.txt';
  assert.throws(()=>validateWorkRecord(escape),/relative repository path/);
  const duplicate=copy(state);duplicate.records.push(copy(duplicate.records[0]));
  assert.throws(()=>validateWorkState(duplicate),/Duplicate work record/);
});

test('upsert replaces one task while preserving all other work and handoffs',async()=>{
  const state=await readWorkState();
  const record=copy(state.records.find(v=>v.id==='owner-operational-workspace'));
  record.nextAction='Run the relevant candidate checks.';
  const next=upsertWorkRecord(state,record);
  assert.deepEqual(next.handoffs,state.handoffs);
  assert.equal(next.records.length,state.records.length);
  assert.deepEqual(next.records.filter(v=>v.id!==record.id),state.records.filter(v=>v.id!==record.id));
  assert.equal(next.records.find(v=>v.id===record.id).nextAction,record.nextAction);
  assert.notEqual(state.records.find(v=>v.id===record.id).nextAction,record.nextAction);
});

test('CLI read is deterministic and scoped; upsert keeps unrelated records and rejects stale replacement',async()=>{
  const directory=await mkdtemp(path.join(tmpdir(),'pv-owner-work-'));
  try{
    const file=path.join(directory,'records.json');await writeFile(file,await readFile(DEFAULT_WORK_STATE));
    const args=[cli,'read','owner-partners','--file',file];
    const one=await exec(process.execPath,args),two=await exec(process.execPath,args);
    assert.equal(one.stdout,two.stdout);assert.equal(JSON.parse(one.stdout).id,'owner-partners');
    await assert.rejects(exec(process.execPath,[cli,'read','not-a-record','--file',file]),/Unknown work record/);
    const before=await readWorkState(file);const record=copy(before.records.find(v=>v.id==='owner-operational-workspace'));
    record.updatedAt='2026-11-07T12:00:00Z';record.nextAction='Publish the tested candidate.';
    const input=path.join(directory,'input.json');await writeFile(input,JSON.stringify(record));
    await exec(process.execPath,[cli,'upsert',input,'--file',file]);
    const after=await readWorkState(file);
    assert.deepEqual(after.records.filter(v=>v.id!==record.id),before.records.filter(v=>v.id!==record.id));
    assert.equal(after.records.find(v=>v.id===record.id).nextAction,record.nextAction);
    record.updatedAt='2026-11-06T12:00:00Z';await writeFile(input,JSON.stringify(record));
    await assert.rejects(exec(process.execPath,[cli,'upsert',input,'--file',file]),/newer work record/);
    assert.equal((await readWorkState(file)).updatedAt,after.updatedAt);
  }finally{await rm(directory,{recursive:true,force:true});}
});
