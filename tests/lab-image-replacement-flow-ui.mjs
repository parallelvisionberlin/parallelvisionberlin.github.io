// Real Image composer with synthetic private media and intercepted API routes.
// Every external request is blocked or fulfilled locally. No paid inference runs.
import assert from 'node:assert/strict';
import http from 'node:http';
import {readFileSync, existsSync, statSync, mkdirSync} from 'node:fs';
import {resolve, extname, sep} from 'node:path';
import {pathToFileURL} from 'node:url';

const {chromium} = await import(pathToFileURL(process.env.PV_PLAYWRIGHT_MODULE).href);
const root = resolve('.');
const source = readFileSync('lab/lab.js', 'utf8');
const boot = source.indexOf('try{clerk=await loadLabAccount();');
const tail = source.indexOf('\n// Soul composer:', boot);
assert.ok(boot > 0 && tail > boot, 'The normal Studio account bootstrap must be identifiable');
const injected = `
clerk={isSignedIn:true,user:{id:'replacement-flow-customer',fullName:'Synthetic Customer'},session:{id:'replacement-flow-session',getToken:async()=> 'mock-token'}};
owner=true;ownerAccount=false;customerMode=true;userId='replacement-flow-customer';customerGenerationReady=true;customerBillingReady=true;
const replacementProfile={customer:true,balanceCredits:100,billingReady:true,generationReady:true,products:[]};
wallet.connect(replacementProfile);studioAccount.update({signed:true,user:clerk.user,profile:replacementProfile});
applyConfig({enabled:true,falEnabled:true,geminiEnabled:true,imageReplacementEnabled:true,concurrency:{image:4,video:3},videoEngines:['seedance']});
$('app').hidden=false;$('gate').hidden=true;imageEngine='seedream';$('image-engine').value='seedream';setTool('image');moodUI.clear(true);
await loadHistory();update();finishLabBoot();
window.__replacementFlow={
  openResult:async job=>openVideo(job,{scroll:false,detail:true}),
  state:()=>({pending:imageSubmissionPending||customerPriceIntentPending||replacementReviewPending,
    price:customerImagePricing.current().status,settings:settings(),references:references.map(r=>({id:r.id,role:r.role,elementId:r.elementId}))}),
  seed:async(original,identity)=>{
    const file=(encoded,name)=>new File([Uint8Array.from(atob(encoded),c=>c.charCodeAt(0))],name,{type:'image/png'});
    await addReferences([file(original,'street.png'),file(identity,'alma.png')],[],[
      {role:'base'},
      {role:'identity',elementId:'20000000-0000-4000-8000-000000000001',elementName:'Alma',elementCategory:'characters',elementView:0,elementCount:1}
    ]);
    update();
  }
};
window.__replacementFlowReady=true;
`;
const server = http.createServer((request, response) => {
  const path = new URL(request.url, 'http://localhost').pathname;
  const file = resolve(root, '.' + path + (path.endsWith('/') ? 'index.html' : ''));
  if (!file.startsWith(root + sep) || !existsSync(file) || !statSync(file).isFile()) {
    response.writeHead(404).end(); return;
  }
  response.setHeader('Cache-Control', 'no-store');
  response.setHeader('Content-Type', ({'.html':'text/html', '.js':'text/javascript', '.css':'text/css', '.svg':'image/svg+xml', '.png':'image/png', '.webp':'image/webp'})[extname(file)] || 'application/octet-stream');
  response.end(path === '/lab/lab.js' ? source.slice(0, boot) + injected + source.slice(tail) : readFileSync(file));
});
await new Promise(resolve => server.listen(0, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:' + server.address().port;
let browser;
try {
  browser = await chromium.launch({headless:true});
  mkdirSync('test-results', {recursive:true});
  for (const width of [390, 1440, 1728]) {
    const context = await browser.newContext({viewport:{width, height:900}});
    const page = await context.newPage();
    const requests = [], uploads = [], quotes = new Map(), assets = new Map(), errors = [];
    let submitted = 0, segments = 0, commits = 0, savedJob = null;
    const segmentInputs = [];
    page.on('pageerror', error => errors.push(error.message));
    await context.route('https://**/*', async route => {
      const request = route.request(), url = new URL(request.url());
      if (url.hostname !== 'parallel-vision-lab.parallelvision.workers.dev') return route.abort();
      requests.push({path:url.pathname, method:request.method()});
      const send = (body, status = 200) => route.fulfill({status, contentType:'application/json', body:JSON.stringify(body)});
      if (url.pathname === '/api/uploads' || url.pathname === '/api/reference-uploads') {
        const id = '10000000-0000-4000-8000-' + String(uploads.length + 1).padStart(12, '0');
        const upload = {id, name:decodeURIComponent(request.headers()['x-filename'] || ''),
          jobId:request.headers()['x-replacement-job-id'] || null, bytes:request.postDataBuffer()};
        uploads.push(upload); assets.set(id, upload.bytes); return send({id});
      }
      if (url.pathname === '/api/precision/segment' && request.method() === 'POST') {
        const input = request.postDataJSON();
        assert.ok(input.sourceId, 'Selection is associated with the actual uploaded Base');
        assert.ok(input.targetPrompt || input.point, 'Selection has a text target or explicit click');
        segments++; segmentInputs.push(input);return send({requestId:'mock-selection-request', ticket:'mock-selection-ticket', expires:Date.now() + 90000});
      }
      if (url.pathname === '/api/precision/segment') return send({status:'completed', maskSourceId:'automatic-mask'});
      if (url.pathname === '/api/quotes') {
        const input = request.postDataJSON(), id = 'quote-' + quotes.size;
        const quote = {id, provider:'SpicyAPI', creditCost:35, maxUsd:.1, estimatedUsd:.1,
          expiresAt:Date.now() + 180000, settings:input.settings};
        quotes.set(id, {...quote, inputs:input}); return send(quote);
      }
      if (url.pathname === '/api/jobs' && request.method() === 'POST') {
        const quote = quotes.get(request.postDataJSON().quoteId);
        assert.ok(quote, 'Generate must consume a verified quote');
        submitted++;
        savedJob = {id:'30000000-0000-4000-8000-000000000001', status:'completed', outputId:'generated-raw',
          sourceId:quote.inputs.referenceSourceIds[0], createdAt:Date.now(), updatedAt:Date.now(),
          settings:{...quote.settings, referenceSourceIds:quote.inputs.referenceSourceIds,
            replacementFinalized:false}};
        return send({job:{...savedJob, status:'queued', outputId:null}});
      }
      if (url.pathname === '/api/replacement/commit') {
        const input = request.postDataJSON();
        assert.equal(input.jobId, savedJob.id);
        assert.equal(input.expectedOutputId, 'generated-raw');
        const upload = uploads.find(item => item.id === input.compositeSourceId);
        assert.equal(upload.jobId, savedJob.id, 'Final upload must carry the pending paid job authorization');
        assert.equal(upload.name, 'replacement-result.png');
        commits++;
        savedJob = {...savedJob, outputId:input.compositeSourceId, updatedAt:Date.now(),
          settings:{...savedJob.settings, replacementFinalized:true, replacementRawOutputId:'generated-raw'}};
        return send({job:savedJob});
      }
      if (url.pathname.startsWith('/api/assets/')) {
        const id = decodeURIComponent(url.pathname.split('/')[3]);
        assert.ok(assets.has(id), 'Only synthetic known private assets can be read');
        return route.fulfill({contentType:'image/png', body:assets.get(id)});
      }
      if (url.pathname.startsWith('/api/jobs/')) return send({job:savedJob});
      if (url.pathname === '/api/jobs') return send({jobs:savedJob ? [savedJob] : [], activeJobs:[], next:null});
      if (url.pathname === '/api/customer/wallet') return send({customer:true, balanceCredits:100,
        billingReady:true, generationReady:true, products:[], storage:{bytes:0, limitBytes:10000000, files:0}});
      if (url.pathname === '/api/packs') return send({packs:[
        {id:'20000000-0000-4000-8000-000000000088',name:'PVSCENE1|characters|Alma Eight',refs:Array.from({length:8},(_,i)=>({id:'saved-view-'+i,name:'Alma '+i,role:'identity',note:'Saved angle note '+i}))},
        {id:'20000000-0000-4000-8000-000000000089',name:'PVSCENE1|outfits|Leather jacket',refs:[{id:'saved-view-0',role:'outfit'}]},
        {id:'20000000-0000-4000-8000-000000000090',name:'PVSCENE1|props|Camera',refs:[{id:'saved-view-1',role:'object'}]},
        {id:'20000000-0000-4000-8000-000000000091',name:'PVSCENE1|locations|Studio',refs:[{id:'saved-view-2',role:'room'}]}
      ]});
      if (url.pathname === '/api/library') return send({folders:[]});
      if (url.pathname === '/api/moodboards') return send({boards:[]});
      return send({});
    });
    await page.goto(base + '/lab/studio.html?tool=image');
    await page.waitForFunction(() => window.__replacementFlowReady).catch(error => {
      throw new Error('Studio replacement fixture did not finish booting. Page errors: ' + JSON.stringify(errors), {cause:error});
    });
    await page.locator('#lab-boot').waitFor({state:'hidden'});
    const fixtures = await page.evaluate(() => {
      const make = (color, selection = false) => {
        const canvas = document.createElement('canvas'); canvas.width = 640; canvas.height = 480;
        const context = canvas.getContext('2d'); context.fillStyle = color; context.fillRect(0, 0, 640, 480);
        if (selection) { context.fillStyle = '#fff'; context.fillRect(60, 40, 180, 360); }
        return canvas.toDataURL('image/png').split(',')[1];
      };
      return {original:make('#294453'), identity:make('#7b6c59'), raw:make('#fa2010'), mask:make('#000', true)};
    });
    for(let i=0;i<8;i++)assets.set('saved-view-'+i,Buffer.from(fixtures.identity,'base64'));
    assets.set('generated-raw', Buffer.from(fixtures.raw, 'base64'));
    assets.set('automatic-mask', Buffer.from(fixtures.mask, 'base64'));
    await page.evaluate(data => window.__replacementFlow.seed(data.original, data.identity), fixtures);
    await page.locator('#image-composer-prompt').fill('Keep this person in the original photo.');
    await page.waitForFunction(() => window.__replacementFlow.state().price === 'ready');
    assert.equal(await page.locator('#image-composer-generate .composer-generate-label').textContent(), 'Generate');
    assert.equal(segments, 0, 'An ordinary prompt must never request selection');
    assert.equal(submitted, 0);

    await page.locator('#image-composer-prompt').fill('Replace the woman on the left with Alma. Keep the original photo.');
    await page.waitForFunction(() => document.querySelector('#image-composer-generate .composer-generate-label').textContent === 'Review selection');
    assert.equal(segments, 0, 'Typing a replacement request must stay local');
    await page.locator('#image-composer-generate').click();
    await page.locator('.image-replacement-dialog').waitFor({state:'visible'});
    await page.waitForFunction(() => document.querySelector('[data-replacement-status]').textContent.includes('Review the highlighted'));
    assert.equal(segments, 1, 'The explicit review action requests one automatic selection');
    assert.equal(submitted, 0, 'Review cannot submit a generation');
    await page.locator('[data-replacement-apply]').click();
    await page.locator('.image-replacement-dialog').waitFor({state:'hidden'});
    await page.waitForFunction(() => !window.__replacementFlow.state().pending && window.__replacementFlow.state().price === 'ready');
    const reviewed = await page.evaluate(() => window.__replacementFlow.state());
    assert.equal(reviewed.settings.engine, 'seedream');
    assert.equal(reviewed.settings.replacement.scope, 'person');
    assert.equal(reviewed.settings.replacement.originalSourceId, reviewed.references[0].id);
    assert.deepEqual(reviewed.settings.replacement.referenceSourceIds, [reviewed.references[1].id]);
    assert.ok(uploads.find(item => item.id === reviewed.settings.replacement.maskSourceId && item.name === 'replacement-selection.png'));
    assert.equal(submitted, 0, 'Use selection prepares the draft and requires a new Generate action');
    assert.equal(await page.locator('#image-composer-generate .composer-generate-label').textContent(), 'Generate');
    await page.locator('#image-composer-generate').click();
    await page.waitForFunction(() => !window.__replacementFlow.state().pending);
    await page.waitForFunction(() => document.querySelector('[data-job="30000000-0000-4000-8000-000000000001"]'));
    assert.equal(submitted, 1, 'The new explicit Generate submits one paid job');
    if (!commits) await page.locator('#refresh').click();
    await page.waitForFunction(() => document.querySelector('[data-job="30000000-0000-4000-8000-000000000001"]')?.dataset.state === 'completed');
    await page.waitForFunction(() => window.__replacementFlow.state().settings.replacement?.maskSourceId);
    // A finished card alone is insufficient evidence. Wait for the actual mocked commit.
    for (let attempt = 0; attempt < 100 && !commits; attempt++) await page.waitForTimeout(100);
    assert.equal(commits, 1, 'The completed raw output must finish through the composite endpoint');
    assert.equal(savedJob.settings.engine, 'seedream', 'Replacement preserves the selected image model');
    assert.deepEqual(savedJob.settings.replacement, reviewed.settings.replacement);
    const composite = uploads.find(item => item.id === savedJob.outputId);
    const pixels = await page.evaluate(async images => {
      const read = async encoded => {
        const bytes = Uint8Array.from(atob(encoded), c => c.charCodeAt(0));
        const bitmap = await createImageBitmap(new Blob([bytes], {type:'image/png'}));
        const canvas = document.createElement('canvas'); canvas.width = bitmap.width; canvas.height = bitmap.height;
        const context = canvas.getContext('2d'); context.drawImage(bitmap, 0, 0); bitmap.close();
        return context.getImageData(0, 0, canvas.width, canvas.height).data;
      };
      const [original, mask, result] = await Promise.all([images.original, images.mask, images.composite].map(read));
      let exterior = 0, exteriorChanges = 0, interiorChanges = 0;
      for (let index = 0; index < original.length; index += 4) {
        const changed = [0, 1, 2, 3].some(channel => original[index + channel] !== result[index + channel]);
        if (mask[index] === 0 || mask[index + 3] === 0) { exterior++; if (changed) exteriorChanges++; }
        else if (changed) interiorChanges++;
      }
      return {exterior, exteriorChanges, interiorChanges};
    }, {original:fixtures.original, mask:fixtures.mask, composite:composite.bytes.toString('base64')});
    assert.ok(pixels.exterior > 100000);
    assert.equal(pixels.exteriorChanges, 0, 'Every exterior pixel, including the mask boundary, retains original RGBA');
    assert.ok(pixels.interiorChanges > 0, 'The selected region contains the generated change');

    if (await page.locator('#image-lightbox').isVisible()) await page.locator('#image-lightbox-close').click();
    await page.locator('#image-composer-prompt').fill('Replace her face with Alma. Keep the hair and body.');
    await page.waitForFunction(() => document.querySelector('#image-composer-generate .composer-generate-label').textContent === 'Review selection');
    assert.equal((await page.evaluate(() => window.__replacementFlow.state())).settings.replacement, undefined,
      'A changed scope invalidates the previous selection and paid quote');
    assert.equal(submitted, 1);
    assert.equal(segments, 1, 'Changing the prompt does not buy another selection');
    await page.locator('#image-composer-generate').click();
    await page.locator('.image-replacement-dialog').waitFor({state:'visible'});
    await page.waitForFunction(() => document.querySelector('[data-replacement-status]').textContent.includes('Review the highlighted'));
    assert.equal(segments, 2);
    await page.screenshot({path:`test-results/image-replacement-flow-${width}.png`});
    await page.locator('[data-replacement-close]').click();
    await page.waitForFunction(() => !window.__replacementFlow.state().pending);
    assert.equal(submitted, 1, 'Cancelling the revised selection never starts a generation');
    assert.equal(commits, 1);
    assert.equal(requests.some(item => /fal\/controlled|precision\/submit/.test(item.path)), false,
      'The Image replacement must not switch to FLUX or the separate Retouch submission route');
    assert.ok(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth), 'No horizontal phone overflow');
    // The approved sidebar actions reuse the real editor without route changes.
    await page.evaluate(job=>window.__replacementFlow.openResult(job),savedJob);
    await page.locator('#image-detail-edit').waitFor({state:'visible'});
    assert.equal(await page.locator('#image-composer-edit-area').isVisible(),false);
    assert.equal(await page.locator('.image-detail-inspector #image-detail-replace').count(),1);
    assert.equal(await page.locator('.image-detail-inspector #image-detail-edit').count(),1);
    const editCard=await page.locator('#image-detail-edit').boundingBox();
    const replaceCard=await page.locator('#image-detail-replace').boundingBox();
    const videoCard=await page.locator('#image-detail-video').boundingBox();
    assert.ok(Math.abs(editCard.y-replaceCard.y)<2,'Replace and Edit share one row');
    assert.ok(editCard.y+editCard.height<=videoCard.y,'Both actions stay above Turn into video');
    const originalURL=page.url(),previousDraft=await page.evaluate(()=>window.__replacementFlow.state());
    await page.waitForFunction(()=>{const image=document.getElementById('image-lightbox-img');return image.complete&&image.naturalWidth>0;});
    const fittedPhoto=await page.locator('#image-lightbox-img').evaluate(image=>{
      const rect=image.getBoundingClientRect(),scale=Math.min(rect.width/image.naturalWidth,rect.height/image.naturalHeight);
      return {width:image.naturalWidth*scale,height:image.naturalHeight*scale};
    });
    const beforeRequests=requests.length;
    await page.screenshot({path:`test-results/pv-viewer-actions-${width}.png`});
    await page.locator('#image-detail-edit').click();
    await page.waitForFunction(()=>document.querySelector('#precision-tool-brush').getAttribute('aria-pressed')==='true'&&document.querySelector('#image-lightbox').classList.contains('is-viewer-editing'));
    assert.equal(page.url(),originalURL,'Editing stays inside the current viewer');
    assert.equal(await page.locator('#image-lightbox #precision-workspace').count(),1,'Move the existing editor; do not duplicate it');
    assert.equal(requests.slice(beforeRequests).some(r=>r.method==='POST'&&/segment|quote|submit|jobs/.test(r.path)),false,'Opening must not select, quote or generate');
    const brush=await page.locator('#precision-selection-canvas').boundingBox();
    assert.ok(brush.width>150&&brush.height>100,'The source remains large enough to select');
    assert.ok(Math.abs(brush.width-fittedPhoto.width)<2,'Edit preserves the fitted viewer photo width');
    assert.ok(Math.abs(brush.height-fittedPhoto.height)<2,'Edit preserves the fitted viewer photo height');
    assert.equal(await page.locator('.image-detail-inspector .precision-tools').count(),1,'Tools occupy the existing right sidebar');
    assert.equal(await page.locator('.image-detail-inspector .precision-deck').count(),1,'No additional middle panel');
    assert.equal(await page.locator('.image-detail-inspector-head').isVisible(),false,'Details are replaced, not displayed beside the edit deck');
    await page.screenshot({path:`test-results/pv-sidebar-edit-${width}.png`});
    await page.mouse.move(brush.x+brush.width*.4,brush.y+brush.height*.5);
    await page.mouse.down();await page.mouse.move(brush.x+brush.width*.5,brush.y+brush.height*.5,{steps:4});await page.mouse.up();
    assert.equal(await page.locator('#precision-clear-mask').isDisabled(),false);
    await page.locator('#precision-return').click();
    assert.equal(await page.locator('#image-detail-edit').isVisible(),true);
    assert.equal(await page.locator('.viewer-editor-sidebar').count(),0,'Leaving Edit removes the contextual sidebar');
    assert.equal(await page.locator('.image-detail-inspector-head').isVisible(),true,'Image details return on exit');
    assert.deepEqual(await page.evaluate(()=>window.__replacementFlow.state()),previousDraft,'Back must not mutate the Image draft');
    await page.locator('#image-detail-replace').click();
    await page.waitForFunction(()=>document.querySelector('#precision-tool-magic').getAttribute('aria-pressed')==='true');
    await page.locator('#precision-clear-mask').click();
    assert.equal(await page.locator('.viewer-selection-guide').isVisible(),true,'Replace guides the first photo click');
    assert.equal(await page.locator('[data-viewer-character-scope]').count(),2,'Character offers Face and Whole person');
    assert.equal(await page.locator('[data-viewer-character-scope="face"]').getAttribute('aria-pressed'),'true');
    assert.match(await page.locator('.viewer-selection-guide').textContent(),/Click the face you want to replace/);
    assert.equal(await page.locator('label[for="precision-prompt"]').textContent(),'Replace with…');
    assert.equal(await page.locator('[data-viewer-kind]').count(),4);
    assert.match(await page.locator('#precision-selection-canvas').evaluate(node=>getComputedStyle(node).cursor),/data:image\/svg/);
    assert.equal(submitted,1,'Guidance cannot submit a generation');
    await page.screenshot({path:`test-results/pv-guided-enter-${width}.png`});
    const selection=await page.locator('#precision-selection-canvas').boundingBox();
    assert.ok(Math.abs(selection.width-fittedPhoto.width)<2,'Replace preserves the fitted viewer photo width');
    assert.ok(Math.abs(selection.height-fittedPhoto.height)<2,'Replace preserves the fitted viewer photo height');
    assert.equal(await page.locator('.image-detail-inspector .viewer-replacement-kinds').count(),1,'Saved reference controls live in the original sidebar');
    await page.screenshot({path:`test-results/pv-sidebar-replace-${width}.png`});
    await page.mouse.click(selection.x+selection.width*.2,selection.y+selection.height*.3);
    await page.waitForFunction(()=>document.querySelector('#precision-status-text').textContent.includes('Selection ready.'));
    assert.equal(segments,3,'Replace requests selection only after an explicit photo click');
    assert.equal(segmentInputs.at(-1).targetPrompt,'face','Face request carries a semantic target with the explicit point');
    assert.equal(await page.locator('.viewer-selection-guide').isVisible(),false);
    assert.match(await page.locator('label[for="precision-prompt"]').textContent(),/Replace selected face area with/);
    await page.locator('[data-viewer-character-scope="person"]').click();
    assert.equal(await page.locator('#precision-clear-mask').isDisabled(),true,'Switching Face to Whole person invalidates the previous mask and quote');
    assert.match(await page.locator('.viewer-selection-guide').textContent(),/person’s torso/);
    await page.mouse.click(selection.x+selection.width*.32,selection.y+selection.height*.6);
    await page.waitForFunction(()=>document.querySelector('#precision-status-text').textContent.includes('Selection ready.'));
    assert.equal(segments,4,'Explicit reselection runs one additional segmentation');
    assert.equal(segmentInputs.at(-1).targetPrompt,'person');
    assert.match(await page.locator('label[for="precision-prompt"]').textContent(),/Replace selected person with/);
    await page.locator('[data-viewer-kind="person"]').click();
    await page.locator('[data-viewer-saved="20000000-0000-4000-8000-000000000088"]').waitFor({state:'visible'});
    await page.screenshot({path:`test-results/pv-guided-library-${width}.png`});
    await page.locator('[data-viewer-saved="20000000-0000-4000-8000-000000000088"]').click();
    await page.waitForFunction(()=>!document.querySelector('#viewer-replacement-continue').disabled);
    assert.match(await page.locator('.viewer-selected-reference').textContent(),/Alma Eight.*8 photos/s);
    const savedQuote=[...quotes.values()].at(-1);
    assert.equal(savedQuote.inputs.referenceSourceIds.length,9,'Original plus every saved Character view');
    assert.equal(savedQuote.settings.referenceRoles[8].elementView,7);
    assert.match(savedQuote.settings.referenceRoles[8].note,/Saved angle note 7/);
    assert.equal(requests.some(r=>r.path.includes('/analyze')),false,'Opening the saved picker never triggers paid analysis');
    await page.screenshot({path:`test-results/pv-guided-saved-${width}.png`});
    await page.locator('.viewer-selected-reference button').click();
    assert.equal(await page.locator('.viewer-selected-reference').isVisible(),false);
    await page.locator('#viewer-replacement-reference').setInputFiles({name:'reference.png',mimeType:'image/png',buffer:Buffer.from(fixtures.identity,'base64')});
    await page.locator('#precision-prompt').fill('Keep the original pose and light.');
    await page.waitForFunction(()=>!document.querySelector('#viewer-replacement-continue').disabled);
    assert.equal(await page.locator('#precision-generate').isVisible(),false,'Replace cannot accidentally call FLUX');
    await page.screenshot({path:`test-results/pv-viewer-replace-${width}.png`});
    assert.equal(await page.locator('.image-detail-inspector').isVisible(),true,'Editing reuses the existing sidebar frame');
    assert.equal(await page.locator('.image-detail-media > #precision-workspace').count(),1,'Edit lives inside the existing photo pane');
    assert.equal(await page.locator('.precision-panel-label').first().isVisible(),false,'No technical Original/file-name header');
    assert.equal(await page.locator('.viewer-edit-options').getAttribute('open'),null,'Advanced tools are collapsed');
    assert.equal(submitted,1,'Preparing a viewer quote never submits a generation');
    assert.match(await page.locator('#viewer-replacement-continue').textContent(),/Generate.*35 credits/);
    const unchangedDraft=await page.evaluate(()=>({settings:window.__replacementFlow.state().settings,references:window.__replacementFlow.state().references}));
    await page.locator('#viewer-replacement-continue').click();
    await page.waitForFunction(()=>document.querySelector('#image-lightbox').open&&!document.querySelector('#image-lightbox').classList.contains('is-viewer-editing'));
    assert.equal(submitted,2,'One inline Generate click submits exactly one job');
    assert.equal(commits,2,'The inline result retains lossless exterior compositing');
    assert.equal(savedJob.settings.engine,'seedream','Inline replacement preserves the selected model');
    assert.equal(savedJob.settings.replacement.scope,'person');
    assert.deepEqual(await page.evaluate(()=>({settings:window.__replacementFlow.state().settings,references:window.__replacementFlow.state().references})),unchangedDraft,'The inline flow never overwrites the main Image draft');
    assert.equal(await page.locator('#image-detail-edit').isVisible(),true,'Result returns to the same viewer actions');
    assert.equal(page.url(),originalURL);
    assert.equal(await page.evaluate(()=>localStorage.getItem('pv:replace-guidance:v1:replacement-flow-customer')),'1','Only successful completion reduces guidance');
    await page.locator('#image-detail-replace').click();
    await page.locator('[data-viewer-kind="location"]').click();
    assert.equal(await page.locator('#precision-clear-mask').isDisabled(),true,'A location cannot reuse a person mask');
    assert.equal(await page.locator('.viewer-selection-guide.is-compact').count(),1);
    assert.equal(await page.locator('#viewer-replacement-reference').isDisabled(),true,'Unsupported location references are not disguised as object references');
    assert.match(await page.locator('.viewer-location-note').textContent(),/not supported/);
    await page.locator('[data-viewer-kind="outfit"]').click();
    assert.equal(await page.locator('#viewer-replacement-reference').isDisabled(),false);
    await page.locator('#precision-return').click();
    assert.equal(requests.some(r=>/precision\/(submit|quote)/.test(r.path)),false,'Reference replacement never switches to FLUX');
    assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth),'Inline editor fits mobile');
    assert.deepEqual(errors, []);
    await context.close();
    console.log('PASS full Image replacement flow, selected model, explicit action, exact exterior and invalidation ' + width);
  }
} finally {
  if (browser) await browser.close();
  await new Promise(resolve => server.close(resolve));
}
