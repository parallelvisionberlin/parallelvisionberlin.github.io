import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {Script} from 'node:vm';
import {replacementIntent} from '../lab/image-replacement-intent.js';

const app = readFileSync('lab/lab.js', 'utf8');
function section(name, next) {
  const start = app.indexOf('function ' + name + '(');
  const end = app.indexOf('function ' + next + '(', start);
  assert.ok(start >= 0 && end > start);
  const code = app.slice(start, end).trim();
  // Include async on declarations extracted after the keyword itself.
  return app.slice(start - 6, start) === 'async ' ? 'async ' + code : code;
}
const code = [
  section('studioReturnPhoto', 'saveImageForMoods'),
  section('saveImageForMoods', 'restoreStudioFromMoods'),
  section('restoreStudioFromMoods', 'bindExploreMoodsReturn'),
  section('replacementDraftKey', 'currentReplacementIntent'),
  section('currentReplacementIntent', 'reviewedReplacement'),
  section('reviewedReplacement', 'replacementPending')
].join('\n').replace(/\nasync\s*$/gm, '');
const clone = value => JSON.parse(JSON.stringify(value));

function fixture() {
  const controls = new Map();
  const defaults = {'prompt': 'Replace the woman on the left with Alma', ratio: 'auto', resolution: '1k', 'image-count': '1', 'output-format': 'png'};
  const $ = id => {
    if (!controls.has(id)) controls.set(id, {value: defaults[id] || '', checked: false,
      options: ['auto', '3:4', '1k', '2k', '1', '2', 'png', 'jpeg'].map(value => ({value}))});
    return controls.get(id);
  };
  const events = [];
  let draft = null;
  let savedSelection = null;
  const env = {JSON, structuredClone, owner: true, tool: 'image', fashionActive: false, busy: false,
    imageSubmissionPending: false, userId: 'customer-one', epoch: 3, imageRevision: 9,
    imageEngine: 'seedream', imageProcessing: 'normal', imageReferenceMode: 'base', imageRatioExplicit: false, soulRatioExplicit: false,
    file: null, sourceId: null, $, references: [
      {id: 'base-one', role: 'base', file: {name: 'street.png', size: 100, lastModified: 1, type: 'image/png'}},
      {id: 'alma-one', role: 'identity', elementId: 'alma', elementCategory: 'characters', file: {name: 'alma.png', size: 200, lastModified: 2, type: 'image/png'}}
    ],
    replacementIntent, referenceRoles: () => env.references.map(ref => ({...ref, name: ref.file.name})),
    moodUI: {selected: () => null, intensity: () => 50, variant: () => '', restore() {}},
    settings: () => ({type: 'image', prompt: $('prompt').value, ...(env.reviewedReplacement() ? {replacement: env.reviewedReplacement()} : {})}),
    saveStudioReturnDraft: async (userId, state) => {assert.equal(userId, 'customer-one'); draft = clone(state); events.push('saved');},
    readStudioReturnDraft: async () => draft,
    clearStudioReturnDraft: async () => {events.push('cleared');},
    clearMedia: () => {env.references = []; env.imageRevision++;},
    setTool: tool => {env.tool = tool;},
    storedImageFile: record => record.file,
    addReferences: async (files, ids, labels) => {env.references = files.map((file, index) => ({file, id: ids[index], ...labels[index]}));},
    setImage: async () => {}, update: () => {events.push('updated');}, notify: () => {events.push('notice');},
    imageReplacement: {
      settings: key => savedSelection?.key === key ? clone(savedSelection.replacement) : null,
      snapshot: () => clone(savedSelection),
      restore: state => {savedSelection = clone(state); events.push('selection-restored');}
    }
  };
  new Script(code + '\nthis.save=saveImageForMoods;this.restore=restoreStudioFromMoods;this.key=replacementDraftKey;this.reviewedReplacement=reviewedReplacement;').runInNewContext(env);
  savedSelection = {key: env.key(), replacement: {version: 1, originalSourceId: 'base-one', maskSourceId: 'mask-one', scope: 'person', referenceSourceIds: ['alma-one']}};
  return {env, events, get draft() {return draft;}, set draft(value) {draft = value;}, get selection() {return savedSelection;}};
}

for (const change of ['prompt', 'model', 'references', 'format']) {
  test('checkout excludes an obsolete selection after changing ' + change, async () => {
    const f = fixture();
    if (change === 'prompt') f.env.$('prompt').value = 'Replace the woman on the right with Alma';
    if (change === 'model') f.env.imageEngine = 'gemini';
    if (change === 'references') f.env.references[1].file = {name: 'other.png', size: 300, lastModified: 3};
    if (change === 'format') f.env.$('output-format').value = 'jpeg';
    await f.env.save({returnReason: 'checkout'});
    assert.equal(f.draft.replacement, null);
    assert.equal(f.draft.settings.replacement, undefined);
  });
}

test('checkout restores a matching reviewed area after reconstructing its original and references', async () => {
  const f = fixture();
  await f.env.save({returnReason: 'checkout'});
  const before = clone(f.draft.replacement.replacement);
  await f.env.restore({checkoutOnly: true});
  assert.ok(f.events.includes('selection-restored'));
  assert.deepEqual(f.selection.replacement, before);
  assert.equal(f.selection.key, f.env.key());
  assert.deepEqual(f.events.filter(event => /generate|submit/.test(event)), []);
});

for (const changed of ['payload', 'base', 'destination']) {
  test('checkout refuses to rekey a selection with mismatched ' + changed, async () => {
    const f = fixture();
    await f.env.save({returnReason: 'checkout'});
    if (changed === 'payload') f.draft.settings.replacement.maskSourceId = 'another-mask';
    if (changed === 'base') f.draft.references[0].id = 'different-base';
    if (changed === 'destination') f.draft.references[1].id = 'different-character';
    await f.env.restore({checkoutOnly: true});
    assert.equal(f.events.includes('selection-restored'), false);
    assert.equal(f.env.reviewedReplacement(), null);
  });
}


test('a paid unfinished replacement keeps a direct raw download even when finalization fails', async () => {
  const start = app.indexOf('async function downloadJob(');
  const end = app.indexOf("\n$('asset-video-download')", start);
  assert.ok(start >= 0 && end > start, 'Download implementation must remain directly testable');
  const calls = [];
  const env = {
    owner: true, resultUrl: null, resultId: null, downloadUrls: new Set(),
    replacementPending: job => job.status === 'completed' && !!job.settings?.replacement && !job.settings.replacementFinalized,
    imageReplacement: {finalize: async () => {calls.push('finalize'); throw Error('PNG exceeds 20 MB');}},
    hasResult: job => job.status === 'completed' && !!job.outputId,
    assetBlob: async id => {calls.push('read:' + id); return {type: 'image/png'};},
    resultFormat: () => ['image', 'png'],
    URL: {createObjectURL: () => 'blob:raw'},
    saveDownload: (url, id, ext) => calls.push('download:' + id + '.' + ext),
    release: () => {}, setTimeout: () => {},
    downloadResult: () => {throw Error('Must not reuse another preview');}
  };
  new Script(app.slice(start, end) + '\nthis.downloadJob = downloadJob;').runInNewContext(env);
  const job = {id: 'paid-one', status: 'completed', outputId: 'raw-paid-image',
    settings: {replacement: {version: 1}, replacementFinalized: false}};
  await env.downloadJob(job, {rawReplacement: true});
  assert.deepEqual(calls, ['read:raw-paid-image', 'download:raw-paid-image.png'],
    'Raw download never attempts finishing, another generation or a credit request');
  await assert.rejects(env.downloadJob(job), /PNG exceeds 20 MB/,
    'The normal final result path still refuses to disguise a failed composite');
  assert.ok(calls.includes('finalize'));
  assert.match(app, /actions\.append\(button\('Download raw image',\(\)=>downloadJob\(j,\{rawReplacement:true\}\),viewMedia\)\)/,
    'History must expose the raw rescue action while finishing is pending');
});
