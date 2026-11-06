import {composeReplacement} from './image-replacement-composite.js?v=20261106-replacement1';

const MAX_PIXELS = 5000000;
const pause = ms => new Promise(resolve => setTimeout(resolve, ms));
const canvasBlob = canvas => new Promise((resolve, reject) => {
  canvas.toBlob(blob => blob ? resolve(blob) : reject(Error('The selection could not be saved.')), 'image/png');
});

// Selection is local until the user explicitly requests Find selection or clicks
// with Select. Reviewing, restoring and applying a selection never generate.
export function createImageReplacement({host, api, assetBlob, uploadAsset, ensureReferences, onChange = () => {}}) {
  const dialog = document.createElement('dialog');
  dialog.className = 'image-replacement-dialog';
  dialog.setAttribute('aria-labelledby', 'image-replacement-title');
  dialog.innerHTML = `
    <div class="image-replacement-shell">
      <header class="image-replacement-header">
        <div><h2 id="image-replacement-title">Review the area to replace</h2><p data-replacement-target></p></div>
        <button type="button" data-replacement-close aria-label="Close selection">Close</button>
      </header>
      <div class="image-replacement-tools" role="group" aria-label="Selection tools">
        <button type="button" data-replacement-mode="select" aria-pressed="true">Select</button>
        <button type="button" data-replacement-mode="brush" aria-pressed="false">Brush</button>
        <button type="button" data-replacement-mode="erase" aria-pressed="false">Erase</button>
        <label>Size <input data-replacement-size type="range" min="6" max="160" value="40" aria-label="Brush size"></label>
        <button type="button" data-replacement-undo disabled>Undo</button>
        <button type="button" data-replacement-find>Find selection</button>
      </div>
      <div class="image-replacement-stage"><div class="image-replacement-photo">
        <canvas data-replacement-photo aria-label="Original photo"></canvas>
        <canvas data-replacement-overlay aria-label="Select or paint the area to replace"></canvas>
      </div></div>
      <footer class="image-replacement-footer">
        <p data-replacement-status role="status" aria-live="polite">Loading photo…</p>
        <button type="button" data-replacement-apply disabled>Use selection</button>
      </footer>
    </div>`;
  host.append(dialog);
  const get = selector => dialog.querySelector(selector);
  const photo = get('[data-replacement-photo]');
  const overlay = get('[data-replacement-overlay]');
  const photoContext = photo.getContext('2d');
  const overlayContext = overlay.getContext('2d');
  const mask = document.createElement('canvas');
  const maskContext = mask.getContext('2d', {willReadFrequently: true});
  const status = get('[data-replacement-status]');
  const apply = get('[data-replacement-apply]');
  const undo = [];
  const finalizing = new Map();
  let reviewed = null;
  let workingSelection = null;
  let active = null;
  let reviewPromise = null;
  let resolveReview = null;
  let revision = 0;
  let lifecycle = 0;
  let busy = false;
  let selected = false;
  let mode = 'select';
  let drawing = false;
  let lastPoint = null;

  function setStatus(text, error = false) {
    status.textContent = text;
    status.classList.toggle('is-error', error);
  }
  function refresh() {
    apply.disabled = busy || !active?.bitmap || !selected;
    get('[data-replacement-find]').disabled = busy || !active?.sourceId;
    get('[data-replacement-undo]').disabled = busy || !undo.length;
    for (const button of dialog.querySelectorAll('[data-replacement-mode]')) button.disabled = busy || !active?.bitmap;
    overlay.style.cursor = busy ? 'wait' : mode === 'select' ? 'crosshair' : 'cell';
  }
  function finish(accepted = false) {
    if (active?.bitmap && selected && !accepted) {
      workingSelection = {key: active.key, pixels: maskContext.getImageData(0, 0, mask.width, mask.height)};
    }
    revision++;
    active?.bitmap?.close();
    active = null;
    busy = false;
    drawing = false;
    undo.length = 0;
    if (dialog.open) dialog.close();
    const resolve = resolveReview;
    resolveReview = null;
    reviewPromise = null;
    resolve?.(accepted);
  }
  function setMode(value) {
    mode = value;
    for (const button of dialog.querySelectorAll('[data-replacement-mode]')) {
      button.setAttribute('aria-pressed', String(button.dataset.replacementMode === value));
    }
    setStatus(value === 'select' ? 'Click the person or item to select it. Brush adds room for a larger shape. The original crop is retained.' : value === 'erase' ? 'Paint over areas to protect them.' : 'Paint the area that may change, including room for a larger shape.');
    refresh();
  }
  function renderMask() {
    overlayContext.clearRect(0, 0, overlay.width, overlay.height);
    overlayContext.drawImage(mask, 0, 0);
    overlayContext.globalCompositeOperation = 'source-in';
    overlayContext.fillStyle = 'rgba(213,234,149,.38)';
    overlayContext.fillRect(0, 0, overlay.width, overlay.height);
    overlayContext.globalCompositeOperation = 'source-over';
  }
  function checkSelection() {
    const pixels = maskContext.getImageData(0, 0, mask.width, mask.height).data;
    selected = false;
    for (let i = 3; i < pixels.length; i += 4) {
      if (pixels[i]) { selected = true; break; }
    }
    refresh();
  }
  function remember() {
    undo.push(maskContext.getImageData(0, 0, mask.width, mask.height));
    if (undo.length > 6) undo.shift();
  }
  function pointAt(event) {
    const rect = overlay.getBoundingClientRect();
    return {x: Math.max(0, Math.min(mask.width - 1, (event.clientX - rect.left) * mask.width / rect.width)),
      y: Math.max(0, Math.min(mask.height - 1, (event.clientY - rect.top) * mask.height / rect.height))};
  }
  function stroke(point) {
    maskContext.globalCompositeOperation = mode === 'erase' ? 'destination-out' : 'source-over';
    maskContext.strokeStyle = '#fff';
    maskContext.fillStyle = '#fff';
    maskContext.lineCap = 'round';
    maskContext.lineJoin = 'round';
    const size = Number(get('[data-replacement-size]').value);
    maskContext.lineWidth = size;
    maskContext.beginPath();
    maskContext.moveTo(lastPoint?.x ?? point.x, lastPoint?.y ?? point.y);
    maskContext.lineTo(point.x, point.y);
    maskContext.stroke();
    maskContext.beginPath();
    maskContext.arc(point.x, point.y, size / 2, 0, Math.PI * 2);
    maskContext.fill();
    maskContext.globalCompositeOperation = 'source-over';
    lastPoint = point;
    renderMask();
  }
  async function installMask(blob, epoch = revision) {
    const image = await createImageBitmap(blob);
    try {
      if (revision !== epoch) return;
      remember();
      maskContext.clearRect(0, 0, mask.width, mask.height);
      maskContext.drawImage(image, 0, 0, mask.width, mask.height);
      const pixels = maskContext.getImageData(0, 0, mask.width, mask.height);
      for (let i = 0; i < pixels.data.length; i += 4) {
        const strength = Math.round((pixels.data[i] + pixels.data[i + 1] + pixels.data[i + 2]) / 3 * pixels.data[i + 3] / 255);
        pixels.data[i] = pixels.data[i + 1] = pixels.data[i + 2] = 255;
        pixels.data[i + 3] = strength;
      }
      maskContext.putImageData(pixels, 0, 0);
      renderMask();
      checkSelection();
    } finally { image.close(); }
  }
  async function findSelection(point = null) {
    if (busy || !active?.sourceId) return;
    busy = true;
    const epoch = revision;
    const sourceId = active.sourceId;
    const body = {sourceId};
    if (point) body.point = {x: Math.floor(point.x * active.bitmap.width / mask.width), y: Math.floor(point.y * active.bitmap.height / mask.height)};
    else body.targetPrompt = active.intent.targetPrompt;
    setStatus('Finding the area…');
    refresh();
    try {
      const request = await api('/api/precision/segment', {method: 'POST', body});
      for (let attempt = 0; attempt < 120; attempt++) {
        if (revision !== epoch) return;
        const query = new URLSearchParams({sourceId, requestId: request.requestId, ticket: request.ticket, expires: String(request.expires)});
        const result = await api('/api/precision/segment?' + query);
        if (revision !== epoch) return;
        if (result.status === 'completed') {
          const blob = await assetBlob(result.maskSourceId);
          if (revision !== epoch) return;
          await installMask(blob, epoch);
          setStatus(selected ? 'Review the highlighted area. Brush adds space and Erase protects details.' : 'No area was found. Click the target or paint it with Brush.');
          return;
        }
        await pause(1000);
      }
      throw Error('Selection is still processing. Use Brush or check the selection again later.');
    } catch (error) {
      if (revision === epoch) setStatus(error.message + ' Brush and Erase remain available.', true);
    } finally {
      if (revision === epoch) { busy = false; refresh(); }
    }
  }
  async function acceptSelection() {
    if (busy || !active?.bitmap || !selected) return;
    const epoch = revision;
    busy = true;
    refresh();
    setStatus('Saving your selection…');
    try {
      const full = document.createElement('canvas');
      full.width = active.bitmap.width;
      full.height = active.bitmap.height;
      const context = full.getContext('2d');
      context.fillStyle = '#000';
      context.fillRect(0, 0, full.width, full.height);
      context.imageSmoothingEnabled = false;
      context.drawImage(mask, 0, 0, full.width, full.height);
      const blob = await canvasBlob(full);
      if (revision !== epoch) return;
      const maskSourceId = await uploadAsset(new File([blob], 'replacement-selection.png', {type: 'image/png'}));
      if (revision !== epoch) return;
      workingSelection = null;
      reviewed = {key: active.key, replacement: {version: 1, originalSourceId: active.sourceId, maskSourceId,
        scope: active.intent.scope, referenceSourceIds: active.destinationIds}};
      onChange();
      finish(true);
    } catch (error) {
      if (revision === epoch) { setStatus(error.message, true); busy = false; refresh(); }
    }
  }
  async function prepareReview(context, epoch) {
    try {
      const ids = await ensureReferences();
      if (revision !== epoch) return;
      const baseIndex = context.labels.findIndex(label => label.role === 'base');
      if (baseIndex < 0 || !ids[baseIndex]) throw Error('Choose a Base photo before selecting an area.');
      const refIndex = context.intent.referenceIndex;
      const elementId = context.intent.referenceElementId || context.labels[refIndex]?.elementId;
      const destinationRole = context.labels[refIndex]?.role;
      const destinationIds = context.labels.flatMap((label, index) => {
        if (index === baseIndex) return [];
        const matches = elementId ? label.elementId === elementId : destinationRole === 'identity' ? label.role === 'identity' && !label.elementId : index === refIndex;
        return matches ? [ids[index]] : [];
      }).filter(Boolean);
      if (!destinationIds.length) throw Error('Choose the replacement reference before selecting an area.');
      const reference = context.references[baseIndex];
      const blob = reference?.file || await assetBlob(ids[baseIndex]);
      if (revision !== epoch) return;
      const bitmap = await createImageBitmap(blob);
      if (revision !== epoch) { bitmap.close(); return; }
      if (bitmap.width < 240 || bitmap.height < 240 || bitmap.width > 8192 || bitmap.height > 8192 || bitmap.width * bitmap.height > MAX_PIXELS) {
        bitmap.close();
        throw Error('Use a smaller photo, up to 5 megapixels, for a lossless replacement.');
      }
      active = {...context, sourceId: ids[baseIndex], destinationIds, bitmap};
      const scale = Math.min(1, 2048 / Math.max(bitmap.width, bitmap.height));
      photo.width = overlay.width = mask.width = Math.round(bitmap.width * scale);
      photo.height = overlay.height = mask.height = Math.round(bitmap.height * scale);
      photoContext.drawImage(bitmap, 0, 0, photo.width, photo.height);
      maskContext.clearRect(0, 0, mask.width, mask.height);
      selected = false;
      undo.length = 0;
      renderMask();
      if (workingSelection?.key === context.key && workingSelection.pixels.width === mask.width && workingSelection.pixels.height === mask.height) {
        maskContext.putImageData(workingSelection.pixels, 0, 0);
        renderMask();
        checkSelection();
      } else if (reviewed?.key === context.key) {
        const saved = await assetBlob(reviewed.replacement.maskSourceId);
        if (revision !== epoch) return;
        await installMask(saved, epoch);
      }
      if (revision !== epoch) return;
      setMode('select');
      busy = false;
      refresh();
      if (context.autoSelect && !selected) await findSelection();
    } catch (error) {
      if (revision === epoch) { busy = false; setStatus(error.message, true); refresh(); }
    }
  }
  function review(context) {
    if (reviewPromise && active?.key === context.key) return reviewPromise;
    if (reviewPromise) finish(false);
    const epoch = ++revision;
    active = context;
    selected = false;
    busy = true;
    const replacementName = context.labels[context.intent.referenceIndex]?.elementName || context.labels[context.intent.referenceIndex]?.name;
    get('[data-replacement-target]').textContent = context.intent.targetPrompt + (replacementName ? ' · ' + replacementName : '');
    setStatus('Loading photo…');
    refresh();
    reviewPromise = new Promise(resolve => { resolveReview = resolve; });
    dialog.showModal();
    void prepareReview(context, epoch);
    return reviewPromise;
  }
  function settings(key) {
    return reviewed?.key === key ? structuredClone(reviewed.replacement) : null;
  }
  function snapshot() { return reviewed ? structuredClone(reviewed) : null; }
  function restore(state) {
    if (!state || typeof state.key !== 'string' || state.replacement?.version !== 1 || !state.replacement.originalSourceId || !state.replacement.maskSourceId || !Array.isArray(state.replacement.referenceSourceIds)) return;
    reviewed = structuredClone(state);
  }
  function reset() {
    lifecycle++;
    finish(false);
    reviewed = null;
    workingSelection = null;
    photo.width = overlay.width = mask.width = 1;
    photo.height = overlay.height = mask.height = 1;
    onChange();
  }
  async function finalize(job) {
    const replacement = job?.settings?.replacement;
    if (job?.status !== 'completed' || !job.outputId || !replacement || job.settings.replacementFinalized) return job;
    if (finalizing.has(job.id)) return finalizing.get(job.id);
    const session = lifecycle;
    const checkSession = () => { if (session !== lifecycle) throw Error('The account changed while preparing the replacement result.'); };
    const pending = (async () => {
      const loaded = await Promise.allSettled([replacement.originalSourceId, job.outputId, replacement.maskSourceId].map(async id => createImageBitmap(await assetBlob(id))));
      const images = loaded.filter(result => result.status === 'fulfilled').map(result => result.value);
      try {
        const failed = loaded.find(result => result.status === 'rejected');
        if (failed) throw failed.reason;
        checkSession();
        const blob = await composeReplacement(...images);
        checkSession();
        const compositeSourceId = await uploadAsset(new File([blob], 'replacement-result.png', {type: 'image/png'}), {replacementJobId: job.id});
        checkSession();
        const result = await api('/api/replacement/commit', {method: 'POST', body: {jobId: job.id, compositeSourceId, expectedOutputId: job.outputId}});
        checkSession();
        return result.job;
      } finally { images.forEach(image => image.close()); }
    })();
    finalizing.set(job.id, pending);
    try { return await pending; } finally { finalizing.delete(job.id); }
  }

  get('[data-replacement-close]').onclick = () => finish(false);
  dialog.addEventListener('cancel', event => { event.preventDefault(); finish(false); });
  dialog.addEventListener('close', () => { if (!dialog.open && resolveReview) finish(false); });
  get('[data-replacement-find]').onclick = () => void findSelection();
  get('[data-replacement-apply]').onclick = () => void acceptSelection();
  get('[data-replacement-undo]').onclick = () => {
    const previous = undo.pop();
    if (!previous || busy) return;
    maskContext.putImageData(previous, 0, 0);
    renderMask();
    checkSelection();
  };
  for (const button of dialog.querySelectorAll('[data-replacement-mode]')) button.onclick = () => setMode(button.dataset.replacementMode);
  overlay.addEventListener('pointerdown', event => {
    if (busy || !active?.bitmap || event.button !== 0) return;
    event.preventDefault();
    const point = pointAt(event);
    if (mode === 'select') { void findSelection(point); return; }
    remember();
    drawing = true;
    lastPoint = null;
    overlay.setPointerCapture(event.pointerId);
    stroke(point);
  });
  overlay.addEventListener('pointermove', event => { if (drawing) { event.preventDefault(); stroke(pointAt(event)); } });
  const endStroke = () => { if (drawing) { drawing = false; lastPoint = null; checkSelection(); } };
  overlay.addEventListener('pointerup', endStroke);
  overlay.addEventListener('pointercancel', endStroke);
  overlay.addEventListener('lostpointercapture', endStroke);
  return {review, settings, snapshot, restore, reset, finalize};
}
