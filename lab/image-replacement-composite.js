const MAX_EXPORT_BYTES = 20 * 1024 * 1024;
const MAX_IMAGE_EDGE = 8192;
const STRIP_HEIGHT = 128;

function validPixels(value) {
  return (value instanceof Uint8Array || value instanceof Uint8ClampedArray) &&
    value.length > 0 && value.length % 4 === 0;
}

function hasSelection(mask) {
  for (let index = 0; index < mask.length; index += 4) {
    if (mask[index] > 0 && mask[index + 3] > 0) return true;
  }
  return false;
}

// Mask red and alpha describe the reviewed coverage. Black or transparent
// pixels remain byte-identical, including exclusions inside the selected area.
export function blendReplacementPixels(original, generated, mask) {
  if (!validPixels(original) || !validPixels(generated) || !validPixels(mask) ||
      original.length !== generated.length || original.length !== mask.length) {
    throw new Error('Replacement pixel buffers must contain matching RGBA images.');
  }
  if (!hasSelection(mask)) throw new Error('Select an area before generating a replacement.');

  const result = new Uint8ClampedArray(original);
  for (let index = 0; index < original.length; index += 4) {
    const coverage = mask[index] / 255 * mask[index + 3] / 255;
    const generatedAlpha = generated[index + 3] / 255 * coverage;
    if (generatedAlpha === 0) continue;
    if (generatedAlpha === 1) {
      result.set(generated.subarray(index, index + 4), index);
      continue;
    }
    const originalAlpha = original[index + 3] / 255;
    const retainedAlpha = originalAlpha * (1 - generatedAlpha);
    const outputAlpha = generatedAlpha + retainedAlpha;
    for (let channel = 0; channel < 3; channel++) {
      result[index + channel] = Math.round((generated[index + channel] * generatedAlpha +
        original[index + channel] * retainedAlpha) / outputAlpha);
    }
    result[index + 3] = Math.round(outputAlpha * 255);
  }
  return result;
}

function dimensions(image) {
  const {width, height} = image || {};
  if (!Number.isInteger(width) || !Number.isInteger(height) || width < 1 || height < 1 ||
      width > MAX_IMAGE_EDGE || height > MAX_IMAGE_EDGE) {
    throw new Error('Replacement images need valid dimensions up to 8192 pixels per side.');
  }
  return {width, height};
}

function canvas(width, height) {
  let value;
  if (typeof OffscreenCanvas === 'function') value = new OffscreenCanvas(width, height);
  else if (typeof document !== 'undefined') {
    value = document.createElement('canvas');
    value.width = width;
    value.height = height;
  } else throw new Error('This device cannot preserve the original image pixels.');
  const context = value.getContext('2d', {willReadFrequently: true});
  if (!context) throw new Error('This device could not prepare the replacement image.');
  return {value, context};
}

async function pngBlob(value) {
  if (typeof value.convertToBlob === 'function') return value.convertToBlob({type: 'image/png'});
  return new Promise((resolve, reject) => value.toBlob(blob => {
    if (blob) resolve(blob);
    else reject(new Error('PNG export failed. The generated image is saved. Retry finishing the edit.'));
  }, 'image/png'));
}

// Process narrow strips so an 8K original does not require several additional
// full-size RGBA canvases. Mask scaling uses nearest pixels and no outward blur.
export async function composeReplacement(originalBitmap, generatedBitmap, maskBitmap) {
  const original = dimensions(originalBitmap);
  for (const image of [generatedBitmap, maskBitmap]) {
    const size = dimensions(image);
    const relativeRatio = (size.width / size.height) / (original.width / original.height);
    if (Math.abs(relativeRatio - 1) > 0.01) {
      throw new Error('The replacement and selection must match the original photo proportions.');
    }
  }
  const {width, height} = original;
  const output = canvas(width, height);
  const generated = canvas(width, Math.min(STRIP_HEIGHT, height));
  const selection = canvas(width, Math.min(STRIP_HEIGHT, height));
  generated.context.imageSmoothingQuality = 'high';
  selection.context.imageSmoothingEnabled = false;
  let selected = false;
  try {
    output.context.drawImage(originalBitmap, 0, 0);
    for (let row = 0; row < height; row += STRIP_HEIGHT) {
      const rows = Math.min(STRIP_HEIGHT, height - row);
      selection.context.clearRect(0, 0, width, STRIP_HEIGHT);
      selection.context.drawImage(maskBitmap, 0, -row, width, height);
      const mask = selection.context.getImageData(0, 0, width, rows).data;
      if (!hasSelection(mask)) continue;
      selected = true;
      generated.context.clearRect(0, 0, width, STRIP_HEIGHT);
      generated.context.drawImage(generatedBitmap, 0, -row, width, height);
      const before = output.context.getImageData(0, row, width, rows);
      const replacement = generated.context.getImageData(0, 0, width, rows).data;
      before.data.set(blendReplacementPixels(before.data, replacement, mask));
      output.context.putImageData(before, 0, row);
    }
    if (!selected) throw new Error('Select an area before generating a replacement.');
    const blob = await pngBlob(output.value);
    if (blob.type !== 'image/png') {
      throw new Error('Lossless PNG export failed. The generated image is saved. Retry finishing the edit.');
    }
    if (blob.size > MAX_EXPORT_BYTES) {
      throw new Error('The lossless PNG exceeds 20 MB. The generated image is saved. Use a smaller original or download the generated image without another generation.');
    }
    return blob;
  } finally {
    output.value.width = generated.value.width = selection.value.width = 0;
  }
}
