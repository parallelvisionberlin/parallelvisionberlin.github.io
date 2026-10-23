import assert from 'node:assert/strict';
import test from 'node:test';
import {readFileSync} from 'node:fs';
import {runInNewContext} from 'node:vm';

// Execute the actual read-only workflow gate with synthetic health replies.
// The source VERSION must be accepted; failures must still stop the job.
const workflow=readFileSync('.github/workflows/pv-lab-fashion-smoke.yml','utf8');
const command=workflow.match(/^\s+node -e "([^"\n]+)"/m)?.[1];
assert.ok(command,'The public smoke retains its Worker-health gate');
const gate=command.replace(/\\\\/g,'\\');
const version=readFileSync('lab-worker/worker.mjs','utf8').match(/export const VERSION = '([^']+)'/)?.[1];
assert.ok(version,'Worker exports its actual build identifier');
function result(reply){
  try{
    runInNewContext(gate,{
      require:path=>{assert.equal(path,'/tmp/pv-lab-health.json');return reply;},
      console:{log(){},error(){}},process:{exit:code=>{throw {exitCode:code};}}
    });
    return 0;
  }catch(error){
    if(Number.isInteger(error?.exitCode))return error.exitCode;
    throw error;
  }
}
test('Fashion smoke accepts current and legacy build versions but rejects unhealthy or malformed replies',()=>{
  assert.equal(result({ok:true,version}),0,'Actual source VERSION is a valid deployed build format');
  assert.equal(result({ok:true,version:'pv-lab-2026-10-23.1'}),0,'Retain the prior dot-delimited format');
  for(const reply of [
    {ok:false,version},{version},{ok:true},{ok:true,version:null},
    {ok:true,version:'another-worker-2026-10-23-build'},
    {ok:true,version:'pv-lab-2026-10-23'},
    {ok:true,version:'pv-lab-2026-10-23.'},
    {ok:true,version:version+' INVALID'}
  ])assert.equal(result(reply),1,'Invalid health must fail: '+JSON.stringify(reply));
});
