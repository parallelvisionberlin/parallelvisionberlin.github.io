import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {runSafety,profile} from '../scripts/pvlab-release-safety.mjs';

test('customer safety propagates failures, crashes and interrupted execution',()=>{
  for(const result of [{status:1},{status:null,signal:'SIGTERM'},{status:null},{status:0,signal:'SIGTERM'}])
    assert.equal(runSafety({execute:()=>result}),1);
  assert.throws(()=>runSafety({execute:()=>({error:Error('spawn failed')})}),/spawn failed/);
  assert.equal(runSafety({execute:()=>({status:0,signal:null})}),0);
});
test('missing, empty, duplicate or unsafe tests cannot produce a green check',()=>{
  let launched=false;const execute=()=>{launched=true;return {status:0};};
  for(const files of [[],[profile.tests[0],profile.tests[0]],['tests/missing-safety-file.test.mjs'],['../outside.test.mjs']])
    assert.throws(()=>runSafety({files,execute}));
  assert.equal(launched,false);
});
test('every selected test runs together using this checkout regardless of caller location',()=>{
  runSafety({execute:(binary,args,options)=>{
    assert.equal(binary,process.execPath);assert.deepEqual(args,['--test',...profile.tests]);
    assert.deepEqual(JSON.parse(readFileSync(options.cwd+'/.github/pvlab-customer-safety.json','utf8')),profile);
    assert.equal(options.stdio,'inherit');return {status:0};
  }});
});
test('activation payload requires the exact safety check with no bypass actors',()=>{
  const rule=JSON.parse(readFileSync(new URL('../.github/pvlab-main-ruleset.json',import.meta.url),'utf8'));
  assert.deepEqual(rule.bypass_actors,[]);assert.equal(rule.enforcement,'active');
  assert.deepEqual(rule.conditions.ref_name.include,['refs/heads/main']);
  const checks=rule.rules.find(x=>x.type==='required_status_checks').parameters;
  assert.equal(checks.strict_required_status_checks_policy,true);
  assert.ok(checks.required_status_checks.some(x=>x.context===profile.checkName&&x.integration_id===15368));
  assert.ok(rule.rules.some(x=>x.type==='pull_request'));
});
