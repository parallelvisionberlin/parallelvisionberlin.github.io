// Real controller with synthetic pixels and intercepted APIs. No provider calls.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync} from 'node:fs';
import {resolve, extname} from 'node:path';
import {pathToFileURL} from 'node:url';
const {chromium} = await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root = resolve('.');
const server = http.createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  if (path === '/test') {
    response.writeHead(200, {'Content-Type': 'text/html'}).end('<!doctype html><meta name="viewport" content="width=device-width,initial-scale=1"><link rel="stylesheet" href="/lab/image-replacement.css"><body style="background:#090909"><div id="host"></div>');
    return;
  }
  const file = resolve(root, '.' + path);
  if (!file.startsWith(root + '/') || !existsSync(file)) { response.writeHead(404).end(); return; }
  response.writeHead(200, {'Content-Type': extname(file) === '.js' ? 'text/javascript' : 'text/css'}).end(readFileSync(file));
});
await new Promise(resolve => server.listen(4198, '127.0.0.1', resolve));
const browser = await chromium.launch({headless: true});
try {
  const page = await browser.newPage({viewport: {width: 1440, height: 900}});
  const errors = [];
  page.on('pageerror', error => errors.push(error.message));
  await page.goto('http://127.0.0.1:4198/test');
  await page.evaluate(async () => {
    const {createImageReplacement} = await import('/lab/image-replacement.js');
    const make = async color => {
      const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
      const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 640, 480);
      return new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    };
    const original = await make('#294453');
    const raw = await make('#fa2010');
    const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
    const context = canvas.getContext('2d'); context.fillStyle = '#000'; context.fillRect(0, 0, 640, 480);
    context.fillStyle = '#fff'; context.fillRect(60, 40, 180, 360);
    const mask = await new Promise(resolve => canvas.toBlob(resolve, 'image/png'));
    const assets = new Map([['base', original], ['raw', raw], ['automatic-mask', mask]]);
    window.requests = []; window.uploads = []; window.changes = 0;
    const api = async (path, options = {}) => {
      window.requests.push({path, method: options.method, body: options.body});
      if (path === '/api/precision/segment') return {requestId: 'mock-segment', ticket: 'ticket', expires: 2000000000};
      if (path.startsWith('/api/precision/segment?')) return {status: 'completed', maskSourceId: 'automatic-mask'};
      if (path === '/api/replacement/commit') return {job: {...window.rawJob, outputId: options.body.compositeSourceId, settings: {...window.rawJob.settings, replacementFinalized: true}}};
      throw Error('Unexpected endpoint ' + path);
    };
    window.editor = createImageReplacement({host: document.querySelector('#host'), api,
      assetBlob: async id => {if (!assets.has(id)) throw Error('Unknown asset ' + id); return assets.get(id);},
      uploadAsset: async (file, options) => {const id = 'upload-' + window.uploads.length; assets.set(id, file); window.uploads.push({id, file, options}); return id;},
      ensureReferences: async () => ['base', 'alma-front', 'alma-body'], onChange: () => window.changes++});
    window.reviewContext = {key: 'draft-one', prompt: 'Replace the woman on the left with Alma',
      labels: [{role: 'base'}, {role: 'identity', elementId: 'alma'}, {role: 'identity', elementId: 'alma'}],
      references: [{file: new File([original], 'street.png', {type: 'image/png'})}, {}, {}],
      intent: {scope: 'person', targetPrompt: 'woman on the left', referenceIndex: 1, referenceElementId: 'alma'}};
    window.startReview = extra => {window.reviewDone = null; window.reviewPromise = window.editor.review({...window.reviewContext, ...extra}).then(value => window.reviewDone = value);};
    window.startReview();
  });
  await page.waitForFunction(() => !document.querySelector('[data-replacement-find]').disabled);
  assert.equal(await page.evaluate(() => window.requests.length), 0, 'Opening and preparing references must never request segmentation or generation');
  await page.locator('[data-replacement-mode="brush"]').click();
  const box = await page.locator('[data-replacement-overlay]').boundingBox();
  await page.mouse.click(box.x + box.width * .2, box.y + box.height * .4);
  assert.equal(await page.locator('[data-replacement-apply]').isEnabled(), true);
  await page.locator('[data-replacement-apply]').click();
  await page.waitForFunction(() => window.reviewDone === true);
  const reviewed = await page.evaluate(() => window.editor.settings('draft-one'));
  assert.equal(reviewed.scope, 'person');
  assert.deepEqual(reviewed.referenceSourceIds, ['alma-front', 'alma-body']);
  assert.equal(await page.evaluate(() => window.editor.settings('edited-draft')), null, 'An edited draft invalidates the reviewed selection');
  assert.equal(await page.evaluate(() => window.requests.length), 0, 'Brush and Use selection are local plus mask upload only');
  assert.equal(await page.evaluate(() => window.uploads[0].file.type), 'image/png');

  await page.evaluate(() => {
    const state = window.editor.snapshot(); window.editor.reset(); window.editor.restore(state);
    window.startReview();
  });
  await page.waitForFunction(() => !document.querySelector('[data-replacement-find]').disabled);
  assert.equal(await page.locator('[data-replacement-apply]').isEnabled(), true, 'The saved selection restores');
  assert.equal(await page.evaluate(() => window.requests.length), 0, 'Restoring never requests a provider');
  await page.locator('[data-replacement-close]').click();
  await page.waitForFunction(() => window.reviewDone === false);

  await page.evaluate(() => window.startReview({key: 'draft-two', autoSelect: true}));
  await page.waitForFunction(() => document.querySelector('[data-replacement-status]').textContent.includes('Review the highlighted'));
  assert.equal(await page.evaluate(() => window.requests.filter(item => item.path === '/api/precision/segment').length), 1, 'Explicit autoSelect makes one segmentation request');
  assert.equal(await page.evaluate(() => window.requests[0].body.targetPrompt), 'woman on the left');
  await page.locator('[data-replacement-apply]').click();
  await page.waitForFunction(() => window.reviewDone === true);
  assert.equal(await page.evaluate(() => window.requests.filter(item => /generate|submit/.test(item.path)).length), 0, 'Approving a selection never submits generation');

  const final = await page.evaluate(async () => {
    window.rawJob = {id: 'job-one', outputId: 'raw', status: 'completed', settings: {replacement: window.editor.settings('draft-two')}};
    const [first, second] = await Promise.all([window.editor.finalize(window.rawJob), window.editor.finalize(window.rawJob)]);
    const file = window.uploads.find(item => item.id === first.outputId).file;
    const image = await createImageBitmap(file); const canvas = document.createElement('canvas'); canvas.width = image.width; canvas.height = image.height;
    const context = canvas.getContext('2d'); context.drawImage(image, 0, 0); image.close();
    return {first, second, outside: Array.from(context.getImageData(500, 400, 1, 1).data), inside: Array.from(context.getImageData(120, 200, 1, 1).data)};
  });
  assert.equal(final.first.settings.replacementFinalized, true);
  assert.deepEqual(await page.evaluate(() => window.uploads.find(item => item.file.name === 'replacement-result.png').options), {replacementJobId: 'job-one'}, 'Finishing a paid job carries the pending-job upload token');
  assert.deepEqual(final.first, final.second);
  assert.deepEqual(final.outside, [41, 68, 83, 255]);
  assert.deepEqual(final.inside, [250, 32, 16, 255]);
  assert.equal(await page.evaluate(() => window.requests.filter(item => item.path === '/api/replacement/commit').length), 1, 'Concurrent finalization commits one composite');
  await page.setViewportSize({width: 390, height: 844});
  await page.evaluate(() => window.startReview({key: 'draft-three'}));
  await page.waitForFunction(() => !document.querySelector('[data-replacement-find]').disabled);
  assert.equal(await page.evaluate(() => document.documentElement.scrollWidth > innerWidth), false, 'Phone layout has no horizontal overflow');
  const applyBox = await page.locator('[data-replacement-apply]').boundingBox();
  assert.ok(applyBox.y + applyBox.height <= 844, 'Use selection stays inside phone viewport');
  await page.locator('[data-replacement-close]').click();
  assert.deepEqual(errors, []);
  console.log('PASS Image replacement selection review, local brush, explicit segmentation, restore, concurrent composition and phone layout');
} finally {
  await browser.close();
  await new Promise(resolve => server.close(resolve));
}
