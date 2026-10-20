// PV LAB's owner-approved Image UI contract.
// This fast, provider-free test runs on every PR and every main-branch push.
// Do not update these expected strings or invariants without explicit owner approval.
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';

const studio=readFileSync('lab/studio.html','utf8');
const lab=readFileSync('lab/lab.js','utf8');
const presentation=readFileSync('lab/image-editorial-deck.js','utf8');
const style=readFileSync('lab/image-editorial-deck.css','utf8');
const guestStyle=readFileSync('lab/studio-guest-image.css','utf8');

function section(source,start,end){
  const first=source.indexOf(start);
  assert.ok(first>=0,'Missing code section: '+start);
  const last=source.indexOf(end,first+start.length);
  assert.ok(last>first,'Missing end of code section: '+end);
  return source.slice(first,last);
}
const fit=section(lab,'function fitImageComposerPrompt(){','\nfunction syncImageComposer(){');
const sync=section(lab,'function syncImageComposer(){','\nfunction fitImageModelMenu(){');
const placeholder=sync.match(/textbox\.placeholder\s*=\s*([\s\S]*?);\s*updateComposerPromptBudget\(\);/);
assert.ok(placeholder,'syncImageComposer must keep the one contextual placeholder assignment');
const expression=new Script('('+placeholder[1]+')',{filename:'PV-LAB-approved-image-placeholder'});
function displayedCopy({native=false,photos=false,base=false,referenceOnly=false,engine='seedream'}={}){
  return expression.runInNewContext({
    window:{__PV_LAB_NATIVE__:native?1:0},
    hasPhotoReferences:photos,
    hasBasePhoto:base,
    referencesOnly:()=>referenceOnly,
    imageEngine:engine
  },{timeout:1000});
}

test('the exact approved copy is preserved in every Image input context',()=>{
  const contexts=[
    ['empty Image composer',{},'What do you imagine?'],
    ['one Base photo',{photos:true},'What would you like to change?'],
    ['separate Base source',{base:true},'What would you like to change?'],
    ['Base and additional photos',{photos:true,base:true},'What would you like to change?'],
    ['references-only mode',{photos:true,referenceOnly:true},'Describe the image you want to create...'],
    ['Controlled Pose with photos',{photos:true,engine:'fal'},'Describe the image you want to create...'],
    ['native with Base',{native:true,photos:true},'Anything else? Add a direction (optional)'],
    ['native without photos',{native:true},'Anything else? Add a direction (optional)']
  ];
  for(const [name,input,expected] of contexts)
    assert.equal(displayedCopy(input),expected,name);
  assert.match(studio,/<textarea\s+id="image-composer-prompt"[^>]*placeholder="What do you imagine\?"[^>]*><\/textarea>/,
    'First HTML paint must show the approved empty placeholder');
});

test('one function owns prompt copy; sizing and presentation never overwrite it',()=>{
  assert.equal((lab.match(/\btextbox\.placeholder\s*=/g)||[]).length,1,
    'The Image editor must have one writer for its placeholder');
  assert.doesNotMatch(fit,/\.placeholder\s*=|\.setAttribute\(\s*['"]placeholder['"]/,
    'fitImageComposerPrompt must resize only, without changing UI copy');
  assert.doesNotMatch(presentation,/\.placeholder\s*=|\.setAttribute\(\s*['"]placeholder['"]/,
    'The presentation controller must not write prompt placeholders');
  assert.doesNotMatch(lab,/Create a variation of this image \(tap to change\)/,
    'Do not reintroduce the unapproved placeholder');
});

test('the long-to-empty prompt shrink and reference-aware presentation remain intact',()=>{
  assert.match(fit,/textbox\.style\.height=minimum\+'px';\s*const naturalHeight=textbox\.scrollHeight;/,
    'Measure natural height from the minimum before fitting; never reuse the previous long height');
  assert.match(fit,/textbox\.style\.height=Math\.min\(maximum,Math\.max\(minimum,naturalHeight\)\)\+'px';/,
    'Long prompts stay bounded instead of growing indefinitely');
  assert.match(presentation,/const hasPrompt=!!field\.value\.trim\(\);/,
    'The deck must react to an actually nonempty prompt');
  assert.match(presentation,/const realNeedsSpace=kind==='real'&&!isSoul&&!hasRefs&&\s*realPromptNeedsSpace\(surface,field\)/,
    'Standard Image deck expands only when content needs the extra writing area');
  assert.doesNotMatch(presentation,/\(kind==='real'&&active&&/,
    'Clicking into the standard Image editor must not expand it');
  assert.match(presentation,/field\.scrollHeight>field\.clientHeight\+3\|\|\s*field\.scrollWidth>field\.clientWidth\+3/,
    'Prompt growth must use actual text overflow, including long unbroken lines');
  assert.match(presentation,/if\(kind==='real'&&!isSoul&&!expanded\)field\.style\.removeProperty\('height'\)/,
    'Shortening the prompt must clear stale inline height immediately');
  assert.match(presentation,/const expanded=hasRefs\|\|/,
    'References can keep their separate photo strip when needed');
  const emptyRule=style.match(/:not\(\.pv-deck-expanded\):not\(\.pv-deck-has-prompt\)\s*#image-composer-prompt\s*\{([^}]*)\}/);
  assert.ok(emptyRule,'Desktop empty prompt needs a compact height override');
  assert.match(emptyRule[1],/height:54px!important;/);
  assert.match(emptyRule[1],/min-height:54px!important;/);
  assert.match(emptyRule[1],/max-height:54px!important;/);
  const editorialEditor=section(style,'/* The authenticated editor keeps','/* Preserve the original functional two-row Image grid.');
  assert.match(editorialEditor,/transition:none!important;/,
    'Do not animate the textarea measurement and trap the previous tall height');
});

test('guest focus stays borderless and the desktop Sign in pill matches the header scale',()=>{
  assert.match(guestStyle,/#gate \.pv-guest-composer textarea:focus-visible\s*\{[^}]*outline:none!important;/,
    'Guest writing area has an unfenced focus state with a visible text caret');
  assert.doesNotMatch(guestStyle,/textarea:focus-visible\s*\{[^}]*outline:(?:1|2|3)px/,
    'No bright focus rectangle is allowed inside the public deck');
  assert.doesNotMatch(style,/#gate\.pv-guest-image \.pv-guest-composer:focus-within/,
    'Guest editor focus must not brighten the outer frame');
  assert.match(guestStyle,/#studio-header #signin\.pv-guest-signin:not\(\[hidden\]\)\s*\{[^}]*min-height:42px;[^}]*font:600 13px\/1 /,
    'Desktop guest Sign in must use the approved more legible scale');
  assert.match(guestStyle,/@media\(max-width:680px\)\{[\s\S]*?#studio-header #signin\.pv-guest-signin:not\(\[hidden\]\)\{padding:8px 13px;min-height:33px;font-size:11px\}/,
    'Existing small-screen Sign in proportions stay untouched');
  assert.match(presentation,/const expanded=hasRefs\|\|/,
    'Authenticated composer keeps its approved sizing expression');
  assert.match(presentation,/const guestNeedsSpace=kind==='guest'&&/,
    'Guest editor expansion must remain distinct from the standard signed-in editor');
  assert.match(presentation,/active&&emptyGuestFocus/,
    'Guest click reveals an unframed two-row input without submitting to a provider');
  assert.match(presentation,/if\(kind==='guest'\)emptyGuestFocus=false;/,
    'Clearing the guest prompt must return it to compact size');
  assert.match(guestStyle,/\.pv-guest-composer\.pv-deck-expanded\s*\{\s*display:grid;/,
    'Long guest directions use a genuine two-row instrument');
  assert.match(studio,/id="pv-guest-moods"[^>]*aria-controls="pv-guest-cards"/,
    'Guest Moods stays tied to the public Inspiration carousel');
  assert.doesNotMatch(studio,/pv-guest-moods-link" href="\.\/moods"/,
    'Guest toolbar must never send visitors to a different Mood page');
  assert.match(studio,/id="pv-guest-add"[^>]*title="Add photographs locally"/,
    'Public Image permits local photo selection before sign-in');
  assert.match(studio,/id="pv-guest-image-file"[^>]*type="file"[^>]*accept="image\/jpeg,image\/png,image\/webp"/,
    'Public photo references must come from a local file picker');
  assert.match(studio,/id="pv-guest-library"[^>]*data-guest-signin/,
    'Saving personal elements and using private libraries requires authentication');
  assert.match(studio,/id="pv-guest-closed-signout"/,
    'Closed-identity recovery must provide an explicit sign-out option');
});
