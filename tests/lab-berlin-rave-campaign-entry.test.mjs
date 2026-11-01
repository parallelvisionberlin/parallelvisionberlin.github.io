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
test('PV LAB consent is opt-in for direct campaign entry, never silently granted',()=>{
  const pixel=read('lab/meta-pixel.js');
  assert.match(pixel,/isLabCampaignLanding\(location\.pathname, location\.hostname, location\.search\)/);
  assert.match(pixel,/choice === 'granted'\) bootPixel/);
  assert.match(pixel,/dialog\.classList\.add\('pv-campaign-consent'\)/);
  assert.match(pixel,/data-choice="denied"/);
});
