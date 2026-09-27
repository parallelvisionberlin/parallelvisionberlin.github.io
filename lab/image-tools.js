// Browser-only file preparation. This does not generate content or alter the original.
export const PROVIDER_IMAGE_LIMIT = 10 * 1024 * 1024;
export const UPSCALE_PIXELS = Object.freeze({ '2k': 4194304, '4k': 16777216, '8k': 67108864 });
export async function imageDimensions(file) {
  const url = URL.createObjectURL(file), image = new Image();
  try {
    image.src = url;
    await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 72000000) throw new Error('Use an image up to 72 megapixels.');
    return { width, height, pixels: width * height };
  } finally { URL.revokeObjectURL(url); }
}
export async function providerWorkingCopy(file) {
  if (file.size <= PROVIDER_IMAGE_LIMIT) return file;
  const url = URL.createObjectURL(file), image = new Image();
  let canvas;
  try {
    image.src = url;
    await image.decode();
    const width = image.naturalWidth, height = image.naturalHeight;
    if (!width || !height || width * height > 72000000) throw new Error('This image is too large to prepare safely in the browser.');
    canvas = document.createElement('canvas'); canvas.width = width; canvas.height = height;
    const context = canvas.getContext('2d');
    if (!context) throw new Error('Your browser could not prepare this image.');
    context.drawImage(image, 0, 0);
    // WebP keeps the alpha channel. Do not flatten transparency, crop, or resize.
    for (const quality of [0.96, 0.92, 0.88, 0.84]) {
      const blob = await new Promise(resolve => canvas.toBlob(resolve, 'image/webp', quality));
      if (blob?.type === 'image/webp' && blob.size > 0 && blob.size <= PROVIDER_IMAGE_LIMIT) {
        const name = (file.name || 'reference').replace(/\.[^.]+$/, '') + '-working-copy.webp';
        return new File([blob], name, { type: 'image/webp' });
      }
    }
    throw new Error('A same-dimension copy is still above 10 MiB. Export a smaller working image manually; your original was not changed.');
  } finally {
    URL.revokeObjectURL(url);
    if (canvas) { canvas.width = 0; canvas.height = 0; }
  }
}
