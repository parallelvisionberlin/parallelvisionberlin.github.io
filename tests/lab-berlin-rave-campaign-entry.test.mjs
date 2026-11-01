import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {isLabCampaignLanding} from '../lab/meta-pixel.js';

const read=path=>readFileSync(new URL('../'+path,import.meta.url),'utf8');

test('only the explicit Berlin Rave campaign entry gets additional on-page messaging',()=>{
  assert.equal(isLabCampaignLanding('/moods','pvlab.studio','?mood=berlin-rave&campaign=berlin-rave&utm_source=instagram'),true);
  assert.equal(isLabCampaignLanding('/moods','pvlab.studio','?mood=berlin-rave'),false);
  assert.equal(isLabCampaignLanding('/moods','pvlab.studio','?mood=night-flash&campaign=berlin-rave'),false);
  assert.equal(isLabCampaignLanding('/moods','untrusted.example','?mood=berlin-rave&campaign=berlin-rave'),false);
  assert.equal(isLabCampaignLanding('/studio','pvlab.studio','?mood=berlin-rave&campaign=berlin-rave'),false);
});
test('existing Mood photobooth, input, generation and deep-link remain intact',()=>{
  const html=read('lab/moods.html');
  const script=read('lab/explore-moods.js');
  assert.match(html,/id="mc-look-file"/);
  assert.match(html,/id="mc-look-continue"/);
  assert.match(html,/id="mc-look-campaign-proof"[^>]*hidden/);
  assert.match(html,/id="mc-look-campaign-offer"[^>]*hidden/);
  assert.match(script,/if\(requested&&moodById\(requested\)\)showMood\(moodById\(requested\)\)/);
  assert.match(script,/selected\.id==='berlin-rave'&&new URLSearchParams\(location\.search\)\.get\('campaign'\)==='berlin-rave'/);
});
test('Berlin Rave offers a compact Cookies choice without shifting the editor controls',()=>{
  const pixel=read('lab/meta-pixel.js'),css=read('lab/berlin-rave-campaign.css');
  assert.match(pixel,/isLabCampaignLanding\(location\.pathname, location\.hostname, location\.search\)\)\) showChoices\(\)/);
  assert.match(pixel,/data-choice="denied">Reject/);
  assert.match(pixel,/data-choice="granted">Accept/);
  assert.match(pixel,/data-settings aria-expanded="false">Settings/);
  assert.match(pixel,/moodDialog\.append\(dialog\)/);
  assert.doesNotMatch(pixel,/body\.insertBefore\(dialog/);
  assert.match(css,/#mc-look-dialog \.pv-cookies-on-deck/);
  assert.match(pixel,/preferences\.addEventListener\('click'/);
  assert.match(pixel,/showChoices\(true\)/);
  assert.match(pixel,/if \(choice === 'granted'\) bootPixel\(\)/);
});
test('fresh registration can be reported when cookies were accepted after signup',()=>{
  const pixel=read('lab/meta-pixel.js');
  assert.match(pixel,/pendingRegistration=\{subject,createdAt\}/);
  assert.match(pixel,/if \(next === 'granted' && pendingRegistration\)/);
  assert.match(pixel,/trackLabRegistration\(registration\.subject,registration\.createdAt\)/);
  assert.match(pixel,/localStorage\.setItem\(key, 'sent'\)/);
});
