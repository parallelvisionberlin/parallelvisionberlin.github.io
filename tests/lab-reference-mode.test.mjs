import test from 'node:test';
import assert from 'node:assert/strict';
import {compileImagePrompt,normalizeReferenceLabel,referenceGuidanceError} from '../lab/reference-guidance.js';
test('reference-only composition has no inherited base instructions',()=>{
 const roles=[{role:'identity'},{role:'body'},{role:'detail',target:'hair'}].map(normalizeReferenceLabel);
 assert.equal(referenceGuidanceError(roles),'');assert.equal(roles[1].role,'body');
 const prompt=compileImagePrompt('Full body, front view, new studio setting',roles);
 assert.match(prompt,/There is no base image/);assert.match(prompt,/body proportions/);assert.match(prompt,/REQUESTED IMAGE/);
 assert.doesNotMatch(prompt,/Base supplies|base photograph|base perspective|REQUESTED EDIT/);
});
test('base editing and plain text retain their original behavior',()=>{
 const prompt=compileImagePrompt('Change the jacket',[{role:'base'},{role:'outfit'}]);
 assert.match(prompt,/Base supplies everything else/);assert.match(prompt,/REQUESTED IMAGE/);
 assert.equal(compileImagePrompt('A quiet room',[]),'A quiet room');
});

test('compact reference map preserves roles and notes while leaving room for direction',()=>{
 const direction='A'.repeat(3500);
 const roles=[
  {role:'base'}, {role:'identity',note:'Preserve the small scar and distinctive eye shape.'},
  {role:'pose'}, {role:'lighting'}
 ].map(normalizeReferenceLabel);
 const result=compileImagePrompt(direction,roles,{moodId:'midnight-reverie',referenceMode:'base'});
 assert.ok(result.length<5000,'Four roles must fit beside a 3,500-character direction');
 assert.ok(result.includes(direction),'The user direction must remain intact');
 assert.match(result,/Reference 2 \[Identity\]/);
 assert.match(result,/Reference 3 \[Pose only\]/);
 assert.match(result,/Reference 4 \[Lighting\]/);
 assert.match(result,/Note: Preserve the small scar and distinctive eye shape\./);
 assert.match(result,/Base supplies everything else/);
});

test('without a Mood, Base photo uses original detailed reference instructions',()=>{
 const labels=[
  {role:'base',name:'scene.png'},
  {role:'identity',name:'face.png',note:'Preserve distinctive eyes.'},
  {role:'pose',name:'pose.png'},
  {role:'detail',target:'hands',name:'hands.png'}
 ];
 const prompt=compileImagePrompt('Change the jacket',labels,{referenceMode:'base'});
 assert.match(prompt,/REFERENCE MAP \(same order as the attached images\)/);
 assert.match(prompt,/Use as the base photograph\. Preserve its framing, camera, pose, scene and lighting/);
 assert.match(prompt,/Use for the subject identity and consistent facial features/);
 assert.match(prompt,/Use only the body pose and limb placement/);
 assert.match(prompt,/localized visual reference\. Match it to the final composition perspective/);
 assert.match(prompt,/Note: Preserve distinctive eyes\./);
});
test('Mood plus Base uses compact reference instructions only',()=>{
 const labels=[{role:'base'},{role:'identity',note:'Keep my real eye shape.'},{role:'pose'}];
 const mood={moodId:'midnight-reverie',referenceMode:'base'};
 const compact=compileImagePrompt('Same person and place',labels,mood);
 const detailed=compileImagePrompt('Same person and place',labels,{referenceMode:'base'});
 assert.ok(compact.length<detailed.length);
 assert.match(compact,/REFERENCE MAP \(attached image order\)/);
 assert.match(compact,/Match the subject’s facial identity and features/);
 assert.ok(compact.includes('Note: Keep my real eye shape.'));
 assert.doesNotMatch(compact,/Use for the subject identity and consistent facial features/);
 const custom=compileImagePrompt('Same person and place',labels,{moodId:'custom',referenceMode:'base'});
 assert.equal(custom,compact,'Saved Moods also use compact instructions with Base');
});
test('Mood plus References only preserves full original role control',()=>{
 const labels=[{role:'identity',note:'Use my real eye shape.'},{role:'pose',note:'Only posture.'},{role:'body'}];
 const full=compileImagePrompt('Create a new editorial portrait',labels,{moodId:'midnight-reverie',referenceMode:'references'});
 const original=compileImagePrompt('Create a new editorial portrait',labels,{referenceMode:'references'});
 assert.equal(full,original);
 assert.match(full,/There is no base image/);
 assert.match(full,/Use for the subject identity and consistent facial features/);
 assert.match(full,/Use only the body pose and limb placement/);
 assert.match(full,/Use only the subject body proportions, build and anatomy/);
 assert.match(full,/Note: Use my real eye shape\./);
 assert.match(full,/Note: Only posture\./);
 assert.equal(compileImagePrompt('Create a new editorial portrait',labels,{moodId:'custom',referenceMode:'references'}),original);
});
test('References-only explicitly wins even if an old draft still carries a Base role',()=>{
 const roles=[{role:'base'},{role:'identity'}];
 const full=compileImagePrompt('Create',roles,{moodId:'hong-kong-nights',referenceMode:'references'});
 assert.equal(full,compileImagePrompt('Create',roles,{referenceMode:'references'}));
});
