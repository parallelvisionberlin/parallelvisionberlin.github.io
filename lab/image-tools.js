// Local browser preparation only. Display previews never replace original uploads.
export const PROVIDER_IMAGE_LIMIT = 10 * 1024 * 1024;
export const UPSCALE_PIXELS = Object.freeze({ '2k': 4194304, '4k': 16777216, '8k': 67108864 });
const MAX_PIXELS = 72000000;
let imageWorker = null, workerUnavailable = false, taskId = 0, generation = 0;
let queue = Promise.resolve();
const pending = new Map();
const cancelled = () => new DOMException('Image preparation cancelled.', 'AbortError');
const yieldUI = () => new Promise(resolve => setTimeout(resolve, 0));

function stopWorker(error) {
  imageWorker?.terminate(); imageWorker = null;
  for (const task of pending.values()) { clearTimeout(task.timer); task.reject(error); }
  pending.clear();
}
export function cancelImagePreparation() {
  generation++; stopWorker(cancelled()); queue = Promise.resolve();
}
function workerTask(operation, file) {
  if (!imageWorker) {
    imageWorker = new Worker(new URL('./image-worker.js?v=20260929-soul1', import.meta.url), { type: 'module' });
    imageWorker.onmessage = ({ data }) => {
      const task = pending.get(data.id); if (!task) return;
      pending.delete(data.id); clearTimeout(task.timer);
      if (data.error) { const error = new Error(data.error); error.code = data.code; task.reject(error); }
      else task.resolve(data.result);
    };
    imageWorker.onerror = event => {
      event.preventDefault(); workerUnavailable = true;
      const error = new Error('Background image preparation is unavailable.'); error.code = 'unavailable';
      stopWorker(error);
    };
  }
  return new Promise((resolve, reject) => {
    const id = ++taskId;
    const timer = setTimeout(() => stopWorker(new Error('Image preparation took too long. Try a smaller working file; the original is unchanged.')), 60000);
    pending.set(id, { resolve, reject, timer });
    try { imageWorker.postMessage({ id, operation, file }); }
    catch (error) { clearTimeout(timer); pending.delete(id); reject(error); }
  });
}
function processLocally(operation, file) {
  const requestedGeneration = generation;
  const result = queue.catch(() => {}).then(async () => {
    if (requestedGeneration !== generation) throw cancelled();
    await yieldUI();
    let data;
    if (!workerUnavailable && typeof Worker !== 'undefined' && typeof OffscreenCanvas !== 'undefined') {
      try { data = await workerTask(operation, file); }
      catch (error) {
        if (error.code !== 'unavailable') throw error;
        workerUnavailable = true;
      }
    }
    if (requestedGeneration !== generation) throw cancelled();
    if (!data) data = await runImageTask(operation, file);
    if (requestedGeneration !== generation) throw cancelled();
    await yieldUI(); return data;
  });
  queue = result.catch(() => {}); return result;
}
export async function imageDimensions(file) { return processLocally('dimensions', file); }
export async function imagePreview(file) { return processLocally('preview', file); }
export async function providerWorkingCopy(file) {
  if (file.size <= PROVIDER_IMAGE_LIMIT) return file;
  const { blob } = await processLocally('working-copy', file);
  const name = (file.name || 'reference').replace(/\.[^.]+$/, '') + '-working-copy.webp';
  return new File([blob], name, { type: 'image/webp' });
}
export async function wanUltrawideWorkingCopy(file) {
  const { blob } = await processLocally('wan-ultrawide', file);
  const name = (file.name || 'start-frame').replace(/\.[^.]+$/, '') + '-21x9.webp';
  return new File([blob], name, { type: 'image/webp' });
}
export async function soulTrainingCopy(file) {
  const { blob } = await processLocally('soul-training', file);
  const name = (file.name || 'training-photo').replace(/\.[^.]+$/, '') + '-training.webp';
  return new File([blob], name, { type: 'image/webp' });
}

// Shared implementation: normally called inside image-worker.js, with a browser fallback.
export async function runImageTask(operation, file) {
  let image, sourceUrl, canvas;
  try {
    if (typeof createImageBitmap === 'function') image = await createImageBitmap(file);
    else if (typeof Image !== 'undefined') {
      sourceUrl = URL.createObjectURL(file); image = new Image(); image.src = sourceUrl; await image.decode();
    } else { const error = new Error('Background image decoding is unavailable.'); error.code = 'unavailable'; throw error; }
    const width = image.width || image.naturalWidth, height = image.height || image.naturalHeight;
    if (!width || !height || width * height > MAX_PIXELS) throw new Error('Use an image up to 72 megapixels.');
    const dimensions = { width, height, pixels: width * height };
    if (operation === 'dimensions') return dimensions;
    function drawRegion(sx, sy, sw, sh, w, h) {
      if (canvas) { canvas.width = 0; canvas.height = 0; }
      canvas = typeof OffscreenCanvas !== 'undefined' ? new OffscreenCanvas(w, h) : document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      const context = canvas.getContext('2d'); if (!context) throw new Error('Your browser could not prepare this image.');
      context.imageSmoothingEnabled = true; context.imageSmoothingQuality = 'high';
      context.drawImage(image, sx, sy, sw, sh, 0, 0, w, h);
    }
    function draw(w, h) { drawRegion(0, 0, width, height, w, h); }
    const encode = async quality => {
      const blob = canvas.convertToBlob ? await canvas.convertToBlob({ type: 'image/webp', quality }) :
        await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (!blob?.size) throw new Error('Your browser could not encode this image.');
      return blob;
    };
    if (operation === 'preview') {
      const fit = edge => { const scale = Math.min(1, edge / Math.max(width, height)); draw(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale))); };
      fit(320); const thumbnail = await encode(0.84);
      fit(1280); const preview = await encode(0.90);
      return { ...dimensions, thumbnail, preview };
    }
    if (operation === 'wan-ultrawide') {
      const unit = Math.floor(Math.min(width / 21, height / 9));
      if (unit < 1) throw new Error('This image is too small to prepare a 21:9 frame.');
      const cropWidth = unit * 21, cropHeight = unit * 9;
      const sx = Math.floor((width - cropWidth) / 2), sy = Math.floor((height - cropHeight) / 2);
      drawRegion(sx, sy, cropWidth, cropHeight, cropWidth, cropHeight);
      for (const quality of [0.96, 0.92, 0.88, 0.84]) {
        const blob = await encode(quality);
        if (blob.type === 'image/webp' && blob.size <= PROVIDER_IMAGE_LIMIT) return { width: cropWidth, height: cropHeight, pixels: cropWidth * cropHeight, blob };
        await yieldUI();
      }
      throw new Error('The 21:9 working crop is still above 10 MiB. Export a smaller source image and try again; the original was not changed.');
    }
    if (operation === 'soul-training') {
      const targetBytes = 700 * 1024;
      for (const edge of [1600, 1440, 1280, 1120, 960]) {
        const scale = Math.min(1, edge / Math.max(width, height));
        draw(Math.max(1, Math.round(width * scale)), Math.max(1, Math.round(height * scale)));
        for (const quality of [0.92, 0.86, 0.80, 0.74]) {
          const blob = await encode(quality);
          if (blob.type === 'image/webp' && blob.size <= targetBytes) return { ...dimensions, blob };
          await yieldUI();
        }
      }
      throw new Error('A training copy could not be reduced below 700 KiB. Export this source photo smaller and try again.');
    }
    if (operation !== 'working-copy') throw new Error('Unknown image operation.');
    draw(width, height);
    // Same dimensions and alpha channel. This copy is prepared only after UI permission.
    for (const quality of [0.96, 0.92, 0.88, 0.84]) {
      const blob = await encode(quality);
      if (blob.type === 'image/webp' && blob.size <= PROVIDER_IMAGE_LIMIT) return { ...dimensions, blob };
      await yieldUI();
    }
    throw new Error('A same-dimension copy is still above 10 MiB. Export a smaller working image manually; your original was not changed.');
  } finally {
    image?.close?.();
    if (sourceUrl) URL.revokeObjectURL(sourceUrl);
    if (image && typeof image.removeAttribute === 'function') image.removeAttribute('src');
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
