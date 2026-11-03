import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {loadClerkBrowserSdk} from '../lab/clerk-browser-sdk.js';
import {accountBootstrapMessage} from '../lab/native-account.js';

function browserFixture(succeeds){
  const calls=[],win={};
  const doc={
    createElement:()=>({
      setAttribute(k,v){this[k]=v;},
      remove(){this.removed=true;}
    }),
    head:{appendChild(script){
      calls.push(script);
      queueMicrotask(()=>{
        if(succeeds){win.Clerk={load:async()=>{}};script.onload?.();}
        else script.onerror?.();
      });
    }}
  };
  return {calls,win,doc};
}
test('Clerk starts with official first-party CDN without loading esm.sh on success',async()=>{
  const {calls,doc,win}=browserFixture(true);
  const clerk=await loadClerkBrowserSdk({frontendApi:'https://clerk.pvlab.studio',
    publishableKey:'pk_live_public_test',doc,win,
    fallbackImport:()=>{throw Error('Fallback must not run');}});
  assert.equal(clerk,win.Clerk);
  assert.equal(calls.length,1);
  assert.equal(calls[0].src,'https://clerk.pvlab.studio/npm/@clerk/clerk-js@6/dist/clerk.browser.js');
  assert.equal(calls[0]['data-clerk-publishable-key'],'pk_live_public_test');
});
test('Clerk falls back to legacy module CDN when browser bundle fails',async()=>{
  const {calls,doc,win}=browserFixture(false);
  let count=0;
  class FakeClerk{constructor(key){this.key=key}}
  const clerk=await loadClerkBrowserSdk({frontendApi:'https://clerk.pvlab.studio',
    publishableKey:'pk_live_public_test',doc,win,
    fallbackImport:async()=>{count++;return {Clerk:FakeClerk};}});
  assert.equal(clerk.key,'pk_live_public_test');
  assert.equal(count,1);
  assert.equal(calls[0].removed,true,'Failed browser script is removed before fallback');
});
test('Clerk exposes privacy-safe diagnostic when both sources fail',async()=>{
  const {doc,win}=browserFixture(false);
  await assert.rejects(loadClerkBrowserSdk({frontendApi:'https://clerk.pvlab.studio',
    publishableKey:'pk_live_public_test',doc,win,fallbackImport:async()=>{throw Error('private-network-detail');}}),
    error=>error.code==='AUTH_SDK'&&!error.message.includes('private-network-detail'));
});
test('Account error copy is actionable without exposing raw network or user information',()=>{
  assert.match(accountBootstrapMessage({code:'AUTH_SDK'}),/AUTH-SDK/);
  assert.match(accountBootstrapMessage({code:'AUTH_UI'}),/AUTH-UI/);
  assert.match(accountBootstrapMessage({code:'AUTH_SESSION'}),/AUTH-SESSION/);
  assert.match(accountBootstrapMessage({message:'my@example.com has an error'}),/AUTH-LOAD/);
  assert.doesNotMatch(accountBootstrapMessage({message:'my@example.com has an error'}),/@example/);
});
test('Studio and guest login both surface safe Clerk diagnostics without changing payment logic',()=>{
  const main=readFileSync('lab/lab.js','utf8');
  const guest=readFileSync('lab/studio-guest-image.js','utf8');
  const account=readFileSync('lab/native-account.js','utf8');
  assert.match(main,/\$\('auth-status'\)\.textContent=accountBootstrapMessage\(error\)/);
  assert.match(guest,/notice\.textContent=bootMessage\?bootMessage\(error\)/);
  assert.match(account,/Promise\.all\(\[sdk,ui\]\),12000/);
  assert.match(account,/await boundedSetup\(clerk\.load\(/);
});
