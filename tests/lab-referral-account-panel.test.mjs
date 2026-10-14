import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';

const html=readFileSync(new URL('../lab/account.html',import.meta.url),'utf8');
const css=readFileSync(new URL('../lab/account.css',import.meta.url),'utf8');
const js=readFileSync(new URL('../lab/account.js',import.meta.url),'utf8');

test('referral reward, invite link and activity are one editorial panel',()=>{
  const panel=html.slice(html.indexOf('<div class="account-referral-panel">'),html.indexOf('</section>',html.indexOf('id="section-referrals"')));
  for(const id of ['referrals-title','referrals-description','referrals-reward','referrals-bonus','referrals-content','referrals-url','referrals-copy','referrals-invited','referrals-rewarded','referrals-earned','referrals-status']){
    assert.equal((panel.match(new RegExp('id="'+id+'"','g'))||[]).length,1,id+' belongs inside the referral panel exactly once');
  }
  assert.ok(panel.indexOf('id="referrals-url"')<panel.indexOf('id="referrals-invited"'),'link is above activity');
  assert.match(panel,/id="referrals-reward"[^>]*hidden/);
  assert.match(panel,/id="referrals-content" hidden/);
  // Account revisions may rotate asset cache keys without altering referrals.
  assert.match(html,/href="\.\/account\.css\?v=[^"]+"/);
  assert.match(html,/src="\.\/account\.js\?v=[^"]+"/);
});

test('referral presentation is dynamic and clears when changing accounts',()=>{
  assert.match(js,/\$\('referrals-reward'\)\.hidden=true/);
  assert.match(js,/\$\('referrals-bonus'\)\.textContent='0'/);
  assert.match(js,/bonusCredits=Number\(data\.bonusCredits\)/);
  assert.match(js,/\$\('referrals-bonus'\)\.textContent=bonusCredits\.toLocaleString\(\)/);
  assert.match(js,/\$\('referrals-reward'\)\.hidden=false/);
  assert.match(js,/url\.origin!==location\.origin/);
  assert.match(js,/!data\.rewardsAvailable/);
});

test('referral panel remains compact on mobile without clipping copy or stats',()=>{
  assert.match(css,/\.account-referral-top\{display:flex;flex-direction:column;gap:15px\}/);
  assert.match(css,/\.account-copy input\{[\s\S]*?min-width:0/);
  assert.match(css,/\.account-referral-stats\{[\s\S]*?grid-template-columns:repeat\(3,minmax\(0,1fr\)\)/);
  assert.match(css,/\.account-referral-panel\{padding:18px 14px\}/);
});
