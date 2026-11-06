import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const {resolveOwnerRoute}=await import('../lab/owner-workspace-ui.js');

test('existing deep links retain their report while selecting its workspace',()=>{
  const expected=[
    ['owner-traffic-section','business','traffic'],
    ['owner-acquisition-section','business','conversion'],
    ['owner-payments-section','business','payments'],
    ['owner-providers-section','business','costs'],
    ['owner-referrals-section','business','referrals'],
    ['owner-vouchers-section','business','vouchers'],
    ['owner-customers-section','customers','directory'],
    ['owner-release-section','system','documentation']
  ];
  for(const [section,view,tab] of expected)
    assert.deepEqual(resolveOwnerRoute('#'+section),{view,tab,section});
});

test('primary destinations have one explicit default report and customer usage stays with customers',()=>{
  assert.deepEqual(resolveOwnerRoute('#owner-overview'),{view:'home',tab:'home',section:'owner-overview'});
  assert.deepEqual(resolveOwnerRoute('#owner-business'),{view:'business',tab:'conversion',section:'owner-acquisition-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-system'),{view:'system',tab:'attention',section:'owner-system-attention'});
  assert.deepEqual(resolveOwnerRoute('#owner-system-attention'),resolveOwnerRoute('#owner-system'));
  assert.deepEqual(resolveOwnerRoute('#owner-work-section'),{view:'system',tab:'work',section:'owner-work-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-customer-usage'),{view:'customers',tab:'usage',section:'owner-customer-usage'});
});

test('unknown and prototype-property hash values safely return Home',()=>{
  for(const hash of ['',null,undefined,'#missing','#constructor','#__proto__','#toString','#hasOwnProperty','https://example.com/#owner-system'])
    assert.deepEqual(resolveOwnerRoute(hash),{view:'home',tab:'home',section:'owner-overview'});
});

test('resolved route records cannot mutate future navigation',()=>{
  const first=resolveOwnerRoute('#owner-payments-section');
  first.view='system';first.tab='attention';first.section='owner-work-section';
  assert.deepEqual(resolveOwnerRoute('#owner-payments-section'),{view:'business',tab:'payments',section:'owner-payments-section'});
});

test('every routed report exists exactly once in Owner HTML',async()=>{
  const html=await readFile(new URL('../lab/owner.html',import.meta.url),'utf8');
  for(const hash of ['owner-overview','owner-traffic-section','owner-acquisition-section','owner-payments-section',
    'owner-providers-section','owner-referrals-section','owner-vouchers-section','owner-customers-section',
    'owner-customer-usage','owner-system','owner-work-section','owner-release-section']){
    const {section}=resolveOwnerRoute('#'+hash);
    assert.equal((html.match(new RegExp('id="'+section+'"','g'))||[]).length,1,hash+' has one preserved destination');
  }
});
