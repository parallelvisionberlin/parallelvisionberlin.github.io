import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';

const {resolveOwnerRoute}=await import('../lab/owner-workspace-ui.js');

test('existing deep links retain their report while selecting its workspace',()=>{
  const expected=[
    ['owner-traffic-section','traffic','traffic'],
    ['owner-acquisition-section','sales','sales'],
    ['owner-payments-section','sales','sales'],
    ['owner-providers-section','costs','costs'],
    ['owner-referrals-section','promotions','promotions'],
    ['owner-vouchers-section','promotions','promotions'],
    ['owner-customers-section','customers','customers']
  ];
  for(const [section,view,tab] of expected)
    assert.deepEqual(resolveOwnerRoute('#'+section),{view,tab,section});
});

test('primary destinations have one explicit default report and customer usage stays with customers',()=>{
  assert.deepEqual(resolveOwnerRoute('#owner-overview'),{view:'home',tab:'home',section:'owner-overview'});
  assert.deepEqual(resolveOwnerRoute('#owner-business'),{view:'sales',tab:'sales',section:'owner-acquisition-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-system'),{view:'work',tab:'attention',section:'owner-work-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-system-attention'),resolveOwnerRoute('#owner-system'));
  assert.deepEqual(resolveOwnerRoute('#owner-work-section'),{view:'work',tab:'work',section:'owner-work-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-release-section'),{view:'work',tab:'reference',section:'owner-work-section'});
  assert.deepEqual(resolveOwnerRoute('#owner-customer-usage'),{view:'customers',tab:'customers',section:'owner-customers-section'});
});

test('unknown and prototype-property hash values safely return Home',()=>{
  for(const hash of ['',null,undefined,'#missing','#constructor','#__proto__','#toString','#hasOwnProperty','https://example.com/#owner-system'])
    assert.deepEqual(resolveOwnerRoute(hash),{view:'home',tab:'home',section:'owner-overview'});
});

test('resolved route records cannot mutate future navigation',()=>{
  const first=resolveOwnerRoute('#owner-payments-section');
  first.view='system';first.tab='attention';first.section='owner-work-section';
  assert.deepEqual(resolveOwnerRoute('#owner-payments-section'),{view:'sales',tab:'sales',section:'owner-payments-section'});
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


test('sidebar uses direct task labels and no second customer or Business navigation',async()=>{
  const html=await readFile(new URL('../lab/owner.html',import.meta.url),'utf8');
  const nav=html.match(/<nav class="owner-side-nav"[\s\S]*?<\/nav>/)?.[0]||'';
  const labels=[...nav.matchAll(/<span>([^<]+)<\/span>/g)].map(m=>m[1]);
  assert.deepEqual(labels,['Overview','Customers','Sales','Traffic','Costs','Promotions','Work log']);
  assert.doesNotMatch(html,/id="owner-(?:business-nav|customer-nav|system-nav|customer-usage)"/);
  assert.match(html,/id="owner-notifications-dialog"/);
  assert.match(html,/id="owner-reference-dialog"/);
});
