import { readFile, writeFile, mkdir } from 'node:fs/promises';
import { createHash } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, relative } from 'node:path';
import { build } from 'esbuild';
import { gzipSync } from 'node:zlib';
import { patchCaptureCancellation } from './capture-cancellation.mjs';

const here = dirname(fileURLToPath(import.meta.url));
const project = resolve(here, '../..');
const upstream = resolve(here, 'node_modules/@anam-ai/js-sdk');
const control = process.argv.includes('--upstream-control');
const outfile = control ? resolve(here, '.upstream-control.js') : resolve(project, 'js/vendor/anam-sdk-4.27.0-pv1.js');
await mkdir(dirname(outfile), { recursive: true });
const sdkPackage = JSON.parse(await readFile(resolve(upstream, 'package.json'), 'utf8'));
if (sdkPackage.version !== '4.27.0') throw new Error('Only SDK 4.27.0 is audited.');
const result = await build({
  absWorkingDir: project,
  entryPoints: [resolve(upstream, 'dist/module/index.js')],
  outfile, bundle: true, format: 'esm', platform: 'browser', target: ['es2020'],
  minify: false, legalComments: 'inline', metafile: true,
  banner: { js: '/*! @anam-ai/js-sdk 4.27.0, Anam AI, MIT. PV capture-cancellation patch. See ../../vendor/anam-sdk/NOTICE.txt. */' },
  plugins: [{ name: 'pv-microphone-cancellation', setup(build) {
    build.onLoad({ filter: /[/\\]modules[/\\]StreamingClient\.js$/ }, async ({ path }) => {
      const source = await readFile(path, 'utf8');
      return { contents: control ? source : patchCaptureCancellation(source), loader: 'js', resolveDir: dirname(path) };
    });
  } }]
});
const output = await readFile(outfile);
const hash = createHash('sha256').update(output).digest('hex');
if (!control) {
  const bufferLicense = await readFile(resolve(here, 'node_modules/buffer/LICENSE'), 'utf8');
  const mitPermission = bufferLicense.slice(bufferLicense.indexOf('Permission is hereby granted'));
  const notices = [
    'Anam AI JavaScript SDK 4.27.0\nAuthor and attribution: Anam AI\nSource: https://github.com/anam-org/javascript-sdk/tree/v4.27.0\nLicense declared by the published package: MIT.\nThe SDK package does not include a separate license text.\n\nMIT permission text:\n\n' + mitPermission,
    'buffer 6.0.3\n\n' + bufferLicense,
    'base64-js 1.5.1\n\n' + await readFile(resolve(here, 'node_modules/base64-js/LICENSE'), 'utf8'),
    'ieee754 1.2.1\n\n' + await readFile(resolve(here, 'node_modules/ieee754/LICENSE'), 'utf8')
  ];
  await writeFile(resolve(here, 'NOTICE.txt'), notices.join('\n\n========================================\n\n'));
  const manifest = {
    upstream: '@anam-ai/js-sdk@4.27.0', patch: 'pv1-capture-cancellation',
    source: 'https://github.com/anam-org/javascript-sdk/tree/v4.27.0',
    npmIntegrity: 'sha512-oU0izvlv1Q+25gL/EoW7QYUFxSNEY48/G/efmL1f24AYuI0WU16albNIpbNDEivqJAFFsdHa52mWQXciAi13Hg==',
    output: relative(project, outfile), bytes: output.length, gzipBytes: gzipSync(output, { level: 9 }).length, sha256: hash,
    exports: Object.values(result.metafile.outputs).find(item => item.entryPoint)?.exports || []
  };
  await writeFile(resolve(here, 'manifest.json'), JSON.stringify(manifest, null, 2) + '\n');
}
console.log(JSON.stringify({ output: relative(project, outfile), bytes: output.length, sha256: hash }));
