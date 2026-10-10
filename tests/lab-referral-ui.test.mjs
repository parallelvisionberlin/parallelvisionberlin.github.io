import {test} from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const read=path=>readFileSync(new URL(path,import.meta.url),'utf8');
const html=read('../lab/studio.html');
const app=read('../lab/lab.js');
const wallet=read('../lab/customer-wallet.js');

test('customer Studio account menu has one guarded Invite friends control',()=>{
  assert.equal((html.match(/id="studio-invite-friends"/g)||[]).length,1);
  assert.match(html,/id="studio-invite-friends"[^>]*hidden>Invite friends<\/button>/);
  assert.match(app,/\$\('studio-invite-friends'\)\.hidden=!customerMode/);
  assert.match(app,/\$\('studio-invite-friends'\)\.hidden=true/);
  assert.match(app,/\$\('studio-invite-friends'\)\.onclick=.*wallet\.openReferrals\(\)/);
});
test('invite link opens a dedicated modal, not the purchasing wallet',()=>{
  assert.equal((html.match(/id="lab-referrals-dialog"/g)||[]).length,1);
  assert.equal((html.match(/id="lab-credit-invite"/g)||[]).length,1);
  assert.match(html,/id="lab-referrals-dialog"[^>]*aria-labelledby="lab-referral-title"/);
  assert.match(html,/id="lab-referrals-close"/);
  const walletMarkup=html.slice(html.indexOf('<dialog id="lab-credits-dialog"'),html.indexOf('<dialog id="lab-referrals-dialog"'));
  assert.doesNotMatch(walletMarkup,/id="lab-referral-url"/);
  assert.match(wallet,/function openReferrals\(\)/);
  assert.match(wallet,/if\(dialog\.open\)dialog\.close\(\)/);
  assert.match(wallet,/referralDialog\.showModal\(\)/);
  assert.match(wallet,/\$\('lab-credit-invite'\)\.onclick=openReferrals/);
  assert.match(wallet,/\$\('lab-referrals-close'\)\.onclick/);
  assert.match(app,/get\('referrals'\)==='1'\)wallet\.openReferrals\(\)/);
});
test('referral state does not leak when switching or signing out of accounts',()=>{
  assert.match(wallet,/referralEpoch\+\+/);
  assert.match(wallet,/epoch!==referralEpoch/);
  assert.match(wallet,/referralUrl\.value='';referralCopy\.disabled=true/);
  assert.match(wallet,/if\(referralDialog\?\.open\)referralDialog\.close\(\)/);
  assert.match(wallet,/await api\('\/api\/customer\/referrals'\)/);
});
