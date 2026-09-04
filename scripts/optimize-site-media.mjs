// Run from the repository root: node scripts/optimize-site-media.mjs [--videos]
// Original media stays untouched. Existing WebP derivatives are reused.
import { readdir, readFile, writeFile, mkdir, stat, rename } from 'node:fs/promises';
import path from 'node:path';
import { promisify } from 'node:util';
import { execFile } from 'node:child_process';
import { createRequire } from 'node:module';
const sharp = createRequire(import.meta.url)('sharp');

const run = promisify(execFile);
const pages = (await readdir('.')).filter(name => name.endsWith('.html'));
const files = [...pages, 'fashion.css'];
const images = new Map();
const videos = new Set();
const manifestPath = 'scripts/media-manifest.json';
const manifest = { images: {}, videos: {} };
try { Object.assign(manifest, JSON.parse(await readFile(manifestPath, 'utf8'))); } catch {}
const local = value => value && !/^(https?:|data:|about:|#)/.test(value);
const normalize = value => decodeURIComponent(value.split(/[?#]/)[0]).replace(/^\.\//, '');
const exists = async file => { try { return (await stat(file)).size > 32; } catch { return false; } };
const imageOutput = source => `assets/optimized/${source.replace(/^assets\//, '').replace(/\.(png|jpe?g|webp)$/i, '.webp')}`;
const videoOutput = (source, variant) => `assets/optimized/video/${source.replace(/^assets\//, '').replace(/\.mp4$/i, `-${variant}.mp4`)}`;

for (const file of files) {
  const html = await readFile(file, 'utf8');
  for (const match of html.matchAll(/<(img|video|source)\b[^>]*>/gi)) {
    const tag = match[0];
    for (const attr of tag.matchAll(/\s(?:src|data-src|poster)=["']([^"']+)["']/g)) {
      if (!local(attr[1])) continue;
      const source = normalize(attr[1]);
      if (/\.mp4$/i.test(source) && !source.startsWith('assets/optimized/')) videos.add(source);
      if (/\.(png|jpe?g|webp)$/i.test(source) && !source.startsWith('assets/optimized/')) images.set(source, true);
    }
  }
  for (const match of html.matchAll(/url\(['"]?([^)'"\s]+)['"]?\)/g)) {
    if (local(match[1]) && /\.(png|jpe?g|webp)$/i.test(match[1])) {
      const source = normalize(match[1]);
      if (!source.startsWith('assets/optimized/')) images.set(source, true);
    }
  }
}

if (!process.argv.includes('--videos')) {
  for (const source of images.keys()) {
    if (!await exists(source)) throw new Error(`Missing image: ${source}`);
    const before = (await stat(source)).size;
    if (before < 450000) continue;
    const output = imageOutput(source);
    if (!await exists(output)) {
      await mkdir(path.dirname(output), { recursive: true });
      await sharp(source).rotate().resize({ width: 1920, withoutEnlargement: true })
        .webp({ quality: 82, effort: 5, smartSubsample: true }).toFile(output);
    }
    const after = (await stat(output)).size;
    if (after >= before) continue;
    manifest.images[source] = { output, before, after };
    console.log(`Image: ${source} ${(before / 1e6).toFixed(2)} MB -> ${Math.round(after / 1000)} KB`);
  }
} else {
  for (const source of videos) {
    if (!await exists(source)) throw new Error(`Missing video: ${source}`);
    const metadata = JSON.parse((await run('ffprobe', ['-v', 'error', '-show_entries', 'format=duration:stream=codec_type,width,height', '-of', 'json', source])).stdout);
    const entry = { before: (await stat(source)).size, duration: Number(metadata.format.duration) };
    for (const [variant, width, crf, rate] of [['desktop', 1920, '24', '3200k'], ['mobile', 1280, '26', '1400k']]) {
      const output = videoOutput(source, variant);
      if (!await exists(output)) {
        await mkdir(path.dirname(output), { recursive: true });
        const temporary = output.replace(/\.mp4$/, '.partial.mp4');
        await run('ffmpeg', ['-y', '-v', 'error', '-i', source, '-map', '0:v:0', '-map', '0:a?',
          '-vf', `scale=w='min(${width},iw)':h=-2`, '-c:v', 'libx264', '-preset', 'medium', '-crf', crf,
          '-maxrate', rate, '-bufsize', variant === 'mobile' ? '2800k' : '6400k', '-threads', '2',
          '-pix_fmt', 'yuv420p', '-g', '48', '-c:a', 'aac', '-b:a', '96k', '-movflags', '+faststart', temporary], { maxBuffer: 1e6 });
        if (variant === 'desktop' && (await stat(temporary)).size >= entry.before) {
          await run('ffmpeg', ['-y', '-v', 'error', '-i', source, '-map', '0', '-c', 'copy', '-movflags', '+faststart', temporary]);
        }
        await rename(temporary, output);
      }
      entry[variant] = output;
      entry[`${variant}Bytes`] = (await stat(output)).size;
    }
    const poster = videoOutput(source, 'poster').replace(/\.mp4$/, '.webp');
    if (!await exists(poster)) {
      await run('ffmpeg', ['-y', '-v', 'error', '-i', source, '-frames:v', '1', '-vf', "scale=w='min(1600,iw)':h=-2", '-c:v', 'libwebp', '-quality', '82', poster]);
    }
    entry.poster = poster;
    manifest.videos[source] = entry;
    await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
    console.log(`Video: ${source} ${(entry.before / 1e6).toFixed(1)} MB -> ${(entry.desktopBytes / 1e6).toFixed(2)} / ${(entry.mobileBytes / 1e6).toFixed(2)} MB`);
  }
}
await writeFile(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
