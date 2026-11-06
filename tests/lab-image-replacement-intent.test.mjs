import test from 'node:test';
import assert from 'node:assert/strict';
import {replacementIntent, replacementIntentIssue} from '../lab/image-replacement-intent.js';

const base = {role:'base', name:'street.png'};
const alma = {role:'identity', name:'Alma.png', elementName:'Alma Rosati', elementCategory:'characters', elementId:'alma'};
const outfit = {role:'outfit', elementName:'Chrome coat', elementCategory:'outfits', elementId:'coat'};
const object = {role:'object', elementName:'Telephone', elementCategory:'props', elementId:'phone'};

test('original typo prompt identifies the person and excludes the destination and preservation sentence', () => {
  const prompt = 'iamge 1 intact replace woman left red hair using alma with provided images. keep mood and filter and adapt, real photography asian nostalgia.';
  assert.deepEqual(replacementIntent(prompt, [base, alma]), {
    scope:'person', targetPrompt:'woman left red hair', referenceElementId:'alma', referenceIndex:1
  });
});

test('face replacement cannot expand into the later outfit preservation clause', () => {
  const result = replacementIntent('Replace her face with Alma, and keep her outfit and body.', [base, alma, outfit]);
  assert.equal(result.scope, 'face');
  assert.equal(result.targetPrompt, 'her face');
  assert.equal(result.referenceElementId, 'alma');
});

test('ordinary English and Spanish person pronouns propose a reviewable person region', () => {
  for (const prompt of ['Replace her with Alma.', 'Swap him using Alma.', 'Reemplaza a ella por Alma.', 'Cámbiala por Alma.']) {
    const result = replacementIntent(prompt, [base, alma]);
    assert.equal(result?.scope, 'person', prompt);
  }
});

test('saved full-appearance Custom Characters and all grouped views are one reference', () => {
  const views = Array.from({length:8}, (_, index) => ({...alma, role:'custom', elementView:index, name:'alma-' + index + '.png'}));
  const result = replacementIntent('Replace the woman on the left with Alma.', [base, ...views]);
  assert.equal(result.scope, 'person');
  assert.equal(result.referenceIndex, 1);
  assert.equal(result.referenceElementId, 'alma');
});

test('named destinations choose the matching Character, while unnamed multiple Characters stay ambiguous', () => {
  const eva = {...alma, elementName:'Eva Marris', name:'Eva.png', elementId:'eva'};
  assert.equal(replacementIntent('Replace the woman on the left with Eva.', [base, alma, eva]).referenceIndex, 2);
  assert.equal(replacementIntent('Replace her with Alma.', [base, alma, eva]).referenceIndex, 1);
  assert.equal(replacementIntent('Replace the woman on the left.', [base, alma, eva]), null);
  assert.equal(replacementIntent('Replace her with Eva.', [base, alma]), null);
});

test('shared first names require a more specific destination', () => {
  const neri = {...alma, elementName:'Alma Neri', elementId:'neri'};
  assert.equal(replacementIntent('Replace her with Alma.', [base, alma, neri]), null);
  assert.equal(replacementIntent('Replace her with Alma Rosati.', [base, alma, neri]).referenceElementId, 'alma');
});

test('reference destinations are separated from source hair descriptions', () => {
  const result = replacementIntent('Replace the woman with red hair on the left using Alma.', [base, alma]);
  assert.equal(result.targetPrompt, 'the woman with red hair on the left');
});

test('garment and whole outfit requests preserve their distinct scopes', () => {
  for (const prompt of ['Change her jacket with this coat.', "Change the woman's jacket with this coat.", 'Ponle esta chaqueta a la mujer de la izquierda.', 'Cambia la chaqueta de la mujer por esta referencia.']) {
    const result = replacementIntent(prompt, [base, alma, outfit]);
    assert.equal(result?.scope, 'garment', prompt);
    assert.equal(result.referenceElementId, 'coat');
  }
  for (const prompt of ['Change her complete outfit with this look.', 'Cámbiale el outfit completo por este look.']) {
    assert.equal(replacementIntent(prompt, [base, alma, outfit])?.scope, 'outfit', prompt);
  }
});

test('a described garment on the person does not turn a person replacement into a wardrobe edit', () => {
  const result = replacementIntent('Replace the woman in the black dress with Alma.', [base, alma, outfit]);
  assert.equal(result.scope, 'person');
  assert.equal(result.referenceElementId, 'alma');
  assert.equal(replacementIntent('Replace the woman with face paint using Alma.', [base, alma])?.scope, 'person');
});

test('object replacement selects the object reference and excludes the destination', () => {
  for (const prompt of ['Replace the pastry with this telephone.', 'Cambia el pastel por este teléfono.']) {
    const result = replacementIntent(prompt, [base, alma, object]);
    assert.equal(result?.scope, 'object', prompt);
    assert.equal(result.referenceElementId, 'phone');
  }
});

test('ordinary image directions never become object replacements because an Object is attached', () => {
  for (const prompt of ['Change the lighting.', 'Change the mood.', 'Change the background.', 'Change the camera angle.', 'Change the effect.', 'Change her jacket color to red.', 'Change the color of her dress.', 'Change her eyes.', 'Change the fit of her coat.', 'Change everything.', 'Replace the word woman with Alma.', 'Keep the photo intact.', 'Photograph Alma outside the shop.', 'A woman replacing a jacket.', 'A sign saying replace the pastry.', 'Cambia la iluminación.']) {
    assert.equal(replacementIntent(prompt, [base, alma, outfit, object]), null, prompt);
  }
});

test('negative replacement instructions are ignored', () => {
  for (const prompt of ['Do not replace the woman with Alma.', "Don't replace her.", "I don't want you to replace the woman.", 'Never change her outfit.', 'No reemplaza la mujer.', 'Sin cambiar la chaqueta.']) {
    assert.equal(replacementIntent(prompt, [base, alma, outfit]), null, prompt);
  }
});

test('a replacement followed by a preservation prohibition remains one edit', () => {
  assert.equal(replacementIntent('Replace her with Alma. Do not change the outfit.', [base, alma, outfit])?.scope, 'person');
});

test('multiple requested targets or unrelated additional edits require deliberate selection', () => {
  for (const prompt of ['Replace both women with Alma.', 'Replace the woman and the man with Alma.', 'Replace her with Alma and change the jacket.', 'Replace her with Alma and turn the wall blue.', 'Replace her face with Alma and her body with this Character.', 'Replace the pastry and the bicycle with this object.']) {
    assert.equal(replacementIntent(prompt, [base, alma, outfit, object]), null, prompt);
  }
});

test('unsupported reference combinations and missing or duplicate Base are rejected', () => {
  assert.equal(replacementIntent('Replace her with Alma.', [alma]), null);
  assert.equal(replacementIntent('Replace her with Alma.', [base, base, alma]), null);
  assert.equal(replacementIntent('Replace her with Alma.', [base, outfit]), null);
  assert.equal(replacementIntent('Change her jacket.', [base, alma]), null);
  assert.equal(replacementIntent('Replace the pastry.', [base, alma]), null);
  assert.equal(replacementIntent('', [base, alma]), null);
  assert.equal(replacementIntent(null, [base, alma]), null);
  assert.equal(replacementIntent('Replace her.', null), null);
});

test('a face-only reference proposal never claims body or wardrobe information', () => {
  const result = replacementIntent('Replace her face with Alma.', [base, {...alma, note:'Face portrait only'}]);
  assert.equal(result.scope, 'face');
  assert.deepEqual(Object.keys(result).sort(), ['referenceElementId', 'referenceIndex', 'scope', 'targetPrompt']);
});

test('ambiguous or mismatched Character destinations provide a blocking issue', () => {
  const eva = {...alma, elementName:'Eva Marris', name:'Eva.png', elementId:'eva'};
  assert.match(replacementIntentIssue('Replace her.', [base, alma, eva]), /Name the Character reference/);
  assert.match(replacementIntentIssue('Replace her with Eva.', [base, alma]), /matching Character/);
  assert.equal(replacementIntentIssue('Replace her with Alma.', [base, alma, eva]), '');
  assert.equal(replacementIntentIssue('Change the lighting.', [base, alma, object]), '');
  assert.equal(replacementIntentIssue('Change the effect.', [base, object]), '');
  assert.equal(replacementIntentIssue('Photograph Alma outside the shop.', [base, alma]), '');
});

test('a clear shared filename stem groups manual Character views without conflating generic uploads', () => {
  const named = [{role:'identity', name:'alma-front.png'}, {role:'identity', name:'alma-side.png'}];
  assert.equal(replacementIntent('Replace her with Alma.', [base, ...named])?.referenceIndex, 1);
  assert.equal(replacementIntentIssue('Replace her with Alma.', [base, ...named]), '');
  const unnamed = [{role:'identity', name:'image-1.png'}, {role:'identity', name:'image-2.png'}];
  assert.equal(replacementIntent('Replace her.', [base, ...unnamed]), null);
  assert.match(replacementIntentIssue('Replace her.', [base, ...unnamed]), /Name the Character reference/);
});
