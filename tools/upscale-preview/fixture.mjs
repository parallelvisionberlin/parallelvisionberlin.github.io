import {falUpscaleParameters, setFalUpscaleDimensions, falUpscaleEstimateMicros} from './fal-upscale.mjs';
import {creditsForJobMicros} from './job-pricing.mjs';

const jobId = '10000000-0000-4000-8000-000000000070';
const imageId = '10000000-0000-4000-8000-000000000071';
const walletStart = 1000;
const active = new Set(['submitting', 'queued', 'running', 'saving', 'uncertain']);
const exampleSettings = {
  type: 'image', mode: 'upscale', provider: 'fal', model: 'fal-ai/seedvr/upscale/image',
  upscaleEngine: 'seedvr2', scale: 2, outputFormat: 'png', referenceSourceIds: []
};

export function installFixture() {
  const role = new URLSearchParams(location.search).get('role') === 'owner' ? 'owner' : 'customer';
  const storageKey = 'pvlab-upscale-pr939-' + role;
  const customer = role === 'customer';
  const config = {enabled: true, falEnabled: true, concurrency: {image: 4, video: 1}};
  const request = window.fetch.bind(window);
  const quoteStore = new Map();
  const uploads = new Map();
  const canvas = document.createElement('canvas');
  canvas.width = canvas.height = 320;
  const context = canvas.getContext('2d');
  context.fillStyle = '#222426';
  context.fillRect(0, 0, 320, 320);
  const gradient = context.createLinearGradient(0, 0, 320, 320);
  gradient.addColorStop(0, '#d9d9cc');
  gradient.addColorStop(1, '#323941');
  context.fillStyle = gradient;
  context.fillRect(73, 55, 174, 210);
  context.strokeStyle = '#e9e9df';
  context.lineWidth = 2;
  context.strokeRect(84, 66, 152, 188);
  const sampleBlob = new Promise(resolve => canvas.toBlob(resolve, 'image/png'));

  function initial() {
    return {balance: walletStart, jobs: [{
      id: jobId, status: 'uncertain', sourceId: imageId, createdAt: Date.now(),
      settings: exampleSettings, error: 'Submission interrupted before acknowledgement.'
    }]};
  }

  let state;
  try { state = JSON.parse(sessionStorage.getItem(storageKey)) ?? initial(); }
  catch { state = initial(); }
  const save = () => sessionStorage.setItem(storageKey, JSON.stringify(state));
  const reset = () => sessionStorage.removeItem(storageKey);
  const id = () => crypto.randomUUID();

  function settleDemoJobs() {
    let changed = false;
    for (const job of state.jobs) {
      // Only separate jobs created in the demo finish. The original stays in review.
      if (job.status !== 'queued' || !job.quoteId || Date.now() - job.createdAt < 1500) continue;
      job.status = 'completed';
      job.outputId = id();
      changed = true;
    }
    if (changed) save();
  }

  async function demoResult(job) {
    const bitmap = await createImageBitmap(uploads.get(job.sourceId) ?? await sampleBlob);
    const scale = Math.min(job.settings.scale, 2048 / Math.max(bitmap.width, bitmap.height));
    const result = document.createElement('canvas');
    result.width = Math.max(1, Math.round(bitmap.width * scale));
    result.height = Math.max(1, Math.round(bitmap.height * scale));
    result.getContext('2d').drawImage(bitmap, 0, 0, result.width, result.height);
    bitmap.close();
    const mime = job.settings.outputFormat === 'jpeg' ? 'image/jpeg' : 'image/png';
    return new Promise(resolve => result.toBlob(resolve, mime, 0.94));
  }
  const json = (body, status = 200) => Response.json(body, {status});
  const fail = (status, message) => { throw Object.assign(new Error(message), {status}); };

  window.fetch = async (input, options) => {
    const original = input instanceof Request ? input : new Request(input, options);
    const url = new URL(original.url);
    if (url.origin !== location.origin) throw new TypeError('External requests are disabled in this demo.');
    if (!url.pathname.startsWith('/api/')) return request(input, options);
    const path = url.pathname;
    const method = original.method;
    try {
      if (path === '/api/session' && method === 'GET') {
        return json({
          owner: !customer, customer, ownerId: 'upscale-preview-' + role, generationReady: true,
          billingReady: true, balanceCredits: state.balance, products: [], config
        });
      }
      if (path === '/api/jobs' && method === 'GET') {
        settleDemoJobs();
        const quoteId = url.searchParams.get('quoteId');
        if (quoteId) return json({job: state.jobs.find(job => job.quoteId === quoteId) ?? null});
        return json({
          jobs: state.jobs, activeJobs: state.jobs.filter(job => active.has(job.status)),
          concurrency: config.concurrency, next: null
        });
      }
      if (path === '/api/packs') return json({packs: []});
      if (path === '/api/customer/wallet' && method === 'GET')
        return json({balanceCredits: state.balance, billingReady: true, products: []});
      if (path === '/api/uploads' && method === 'POST') {
        const sourceId = id();
        uploads.set(sourceId, await original.blob());
        return json({id: sourceId});
      }
      if (path === '/api/quotes' && method === 'POST') {
        const {sourceId, settings} = await original.json();
        if (!uploads.has(sourceId)) return json({error: 'Select a demo photo first.'}, 400);
        const parameters = falUpscaleParameters(settings, {fail});
        const bitmap = await createImageBitmap(uploads.get(sourceId));
        setFalUpscaleDimensions(parameters, {width: bitmap.width, height: bitmap.height}, {fail});
        bitmap.close();
        const micros = falUpscaleEstimateMicros(parameters);
        const quote = {
          id: id(), provider: 'fal.ai', estimatedUsd: micros / 1e6, maxUsd: micros / 1e6,
          creditCost: creditsForJobMicros(micros, parameters), expiresAt: Date.now() + 180000,
          priceIsEstimate: true, requiresPriceReview: true, settings: parameters
        };
        quoteStore.set(quote.id, {quote, sourceId});
        return json(quote);
      }
      if (path === '/api/jobs' && method === 'POST') {
        const data = await original.json();
        const existing = state.jobs.find(job => job.quoteId === data.quoteId);
        if (existing) return json({job: existing});
        const entry = quoteStore.get(data.quoteId);
        if (!entry || entry.quote.expiresAt <= Date.now() || data.confirm !== true)
          return json({error: 'A current confirmed quote is required.'}, 409);
        if (state.jobs.some(job => job.status === 'uncertain') && data.confirmNewCharge !== true)
          return json({error: 'Confirm the separate demo charge first.'}, 409);
        if (customer && state.balance < entry.quote.creditCost)
          return json({error: 'Insufficient demo credits.'}, 402);
        const job = {
          id: id(), quoteId: data.quoteId, status: 'queued', settings: entry.quote.settings,
          sourceId: entry.sourceId, createdAt: Date.now()
        };
        if (customer) state.balance -= entry.quote.creditCost;
        state.jobs.unshift(job);
        save();
        return json({job}, 202);
      }
      if (path.startsWith('/api/assets/') && method === 'GET') {
        const assetId = path.split('/')[3];
        const resultJob = state.jobs.find(job => job.outputId === assetId);
        const image = resultJob ? await demoResult(resultJob) : uploads.get(assetId) ?? await sampleBlob;
        return new Response(image, {headers: {'Content-Type': image.type}});
      }
      if (/^\/api\/jobs\/[^/]+$/.test(path) && method === 'GET') {
        settleDemoJobs();
        const job = state.jobs.find(item => item.id === path.split('/')[3]);
        return job ? json({job}) : json({error: 'Unknown demo job.'}, 404);
      }
      return json({error: 'This feature is outside the Upscale demo.'}, 404);
    } catch (error) {
      return json({error: error.message}, error.status ?? 400);
    }
  };

  window.addEventListener('message', event => {
    if (event.origin !== location.origin || event.source !== parent || event.data !== 'reset-upscale-demo') return;
    reset();
    location.reload();
  });
  return {
    clerk: {
      isSignedIn: true, user: {id: 'upscale-preview-' + role, firstName: 'Demo', fullName: 'Upscale Demo'},
      session: {getToken: async () => 'synthetic-upscale-preview'},
      addListener() {}, signOut: async () => { reset(); location.reload(); }
    },
    sample: async () => new File([await sampleBlob], 'upscale-demo-sample.png', {type: 'image/png'})
  };
}
