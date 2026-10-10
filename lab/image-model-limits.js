// Mirrors the per-model limits enforced before provider submission by lab-worker/worker.mjs.
// Check input files before uploading or reserving paid generations. Originals stay unchanged.
const MIB = 1024 * 1024;
const mib = bytes => (bytes / MIB).toFixed(1);
const mb = bytes => (bytes / 1000000).toFixed(1);

export function modelImageInputIssue(engine, items = [], {count = 1, processing = 'normal'} = {}) {
  const refs = (Array.isArray(items) ? items : [])
    .map(item => item?.file ? item : {file:item})
    .filter(item => item.file && Number.isFinite(Number(item.file.size)));
  const total = refs.reduce((sum, item) => sum + Number(item.file.size), 0);
  if (engine === 'flash' && total > 16 * MIB)
    return 'Image too large for Seedream Flash: ' + mib(total) + ' MiB across ' + refs.length +
      ' reference image(s). This model accepts a maximum of 16 MiB combined. Compress or remove references. No generation submitted.';
  if (engine === 'gemini' && total > 14 * MIB)
    return 'Image too large for Nano Banana Pro: ' + mib(total) + ' MiB across ' + refs.length +
      ' reference image(s). This Lab supports a maximum of 14 MiB combined for Nano Banana Pro. Compress or remove references. No generation submitted.';
  const requested = Math.max(1, Number(count) || 1);
  if (engine === 'gemini' && processing === 'batch' && total * requested * 1.38 > 18 * MIB)
    return 'Batch input too large for Nano Banana Pro: ' + refs.length + ' reference image(s) repeated across ' +
      requested + ' generations exceed the Google inline-batch limit. Use fewer references, smaller files or Normal mode. No generation submitted.';
  if (engine === 'kling') {
    for (const item of refs) {
      const {file} = item, name = file.name || 'image';
      if (Number(file.size) > 10000000)
        return 'Image too large for Kling: ' + name + ' (' + mb(file.size) +
          ' MB). Maximum 10 MB per image. Compress the image and try again. No generation submitted.';
      const width = Number(item.width ?? item.ref?.width), height = Number(item.height ?? item.ref?.height);
      if (width > 0 && height > 0) {
        if (width < 300 || height < 300)
          return 'Image too small for Kling: ' + name + ' (' + width + ' × ' + height +
            ' px). Minimum 300 × 300 px. Use a larger image. No generation submitted.';
        const ratio = width / height;
        if (ratio < 0.4 || ratio > 2.5)
          return 'Unsupported image proportions for Kling: ' + name + ' (' + width + ' × ' + height +
            ' px). Kling accepts aspect ratios from 0.4 to 2.5. Crop the image. No generation submitted.';
      }
    }
  }
  return '';
}
