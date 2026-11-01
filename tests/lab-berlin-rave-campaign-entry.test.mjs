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
test('PV LAB Meta tracking is opt-in, and the campaign has no automatic consent banner',()=>{
  const pixel=read('lab/meta-pixel.js');
  assert.match(pixel,/if \(choice === 'granted'\) bootPixel\(\)/);
  assert.doesNotMatch(pixel,/else if \(!choice &&.*showChoices\(\)/);
  assert.doesNotMatch(pixel,/body\.insertBefore\(dialog/);
  assert.match(pixel,/preferences\.addEventListener\('click', \(\) => \{/);
  assert.match(pixel,/showChoices\(\);/);
  assert.match(pixel,/data-choice="denied"/);
  assert.match(pixel,/data-choice="granted"/);
});
