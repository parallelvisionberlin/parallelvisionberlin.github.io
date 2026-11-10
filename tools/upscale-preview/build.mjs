import assert from 'node:assert/strict';
import {execFileSync} from 'node:child_process';
import {cpSync, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname, extname, join, resolve} from 'node:path';

const root = resolve(process.argv[2]);
const fixture = resolve(process.argv[3]);
const publicRoot = join(root, '.upscale-preview-public');
const workerRoot = join(root, 'lab-worker');
const copy = (path, target = path) => {
  const destination = join(publicRoot, target);
  mkdirSync(dirname(destination), {recursive: true});
  cpSync(join(root, path), destination);
};
const files = execFileSync('git', ['ls-files', '-z', 'lab'], {cwd: root, encoding: 'utf8'}).split('\0');
const staticExtensions = new Set(['.js', '.css', '.svg', '.png', '.jpg', '.jpeg', '.webp', '.woff', '.woff2', '.avif']);
for (const path of files) {
  if (staticExtensions.has(extname(path)) && existsSync(join(root, path))) copy(path);
}
for (const file of ['fal-upscale.mjs', 'job-pricing.mjs', 'nano-banana-21.mjs'])
  copy('lab-worker/' + file, 'lab/' + file);
cpSync(fixture, join(publicRoot, 'lab', 'upscale-preview-fixture.mjs'));

const shell = readFileSync(join(root, 'lab', 'studio.html'), 'utf8');
assert.match(shell, /20261109-upscale-recovery2/);
writeFileSync(join(publicRoot, 'lab', 'studio.html'),
  shell.replace(/<script[^>]+src="\.\/meta-pixel\.js[^"]*"[^>]*><\/script>/, '')
    .replace(/<link[^>]+href="https?:\/\/[^"]+"[^>]*>/g, ''));

const source = readFileSync(join(root, 'lab', 'lab.js'), 'utf8');
const api = "const API='https://parallel-vision-lab.parallelvision.workers.dev';";
const bootstrap = 'try{clerk=await loadLabAccount();clerk.addListener(()=>void sync());await sync();}';
assert.ok(source.includes(api) && source.includes(bootstrap), 'Expected exact reviewed Studio source');
const transformed = "import {installFixture} from './upscale-preview-fixture.mjs';\n"
  + source.replace(api, 'const API=location.origin;const upscaleFixture=installFixture();')
    .replace(bootstrap, 'try{clerk=upscaleFixture.clerk;await sync();if(owner&&tool===\'upscale\')await setImage(await upscaleFixture.sample());}');
writeFileSync(join(publicRoot, 'lab', 'lab.js'), transformed);

writeFileSync(join(publicRoot, 'index.html'), `<!doctype html>
<html lang="es">
<meta charset="utf-8">
<meta name="viewport" content="width=device-width,initial-scale=1">
<meta name="robots" content="noindex,nofollow,noarchive">
<title>PV LAB | Prueba de Upscale</title>
<style>
*{box-sizing:border-box}
body{margin:0;min-height:100dvh;height:100dvh;display:flex;flex-direction:column;background:#121212;color:#f5f5f3;font:14px system-ui,sans-serif}
header{padding:10px 14px;border-bottom:1px solid #3d3d3b;background:#171717}
header>div{display:flex;flex-wrap:wrap;align-items:center;gap:8px}
h1{font-size:14px;margin:0 10px 0 0}
p{color:#d0d0cb;margin:7px 0 0;line-height:1.4}
button{border:1px solid #555;border-radius:4px;background:#252525;color:inherit;padding:6px 9px;font:inherit;cursor:pointer}
button[aria-pressed="true"]{background:#eee;color:#141414;border-color:#eee}
iframe{flex:1;width:100%;border:0;min-height:0}
</style>
<header>
<div><h1>PV LAB · Upscale de prueba</h1><button id="customer" type="button">Cliente</button><button id="owner" type="button">Propietario</button><button id="reset" type="button">Reiniciar</button></div>
<p>Simulación sin cargos. En Studio, abre <b>Review Queue</b> y luego pulsa <b>Upscale</b> para revisar el precio simulado. La imagen de muestra se carga sola.</p>
</header>
<iframe title="Studio de Upscale" id="studio"></iframe>
<script>
const studio=document.getElementById('studio');
function select(role){
  for(const id of ['customer','owner']) document.getElementById(id).setAttribute('aria-pressed',String(id===role));
  studio.src='/lab/studio.html?tool=upscale&role='+role;
}
document.getElementById('customer').onclick=()=>select('customer');
document.getElementById('owner').onclick=()=>select('owner');
document.getElementById('reset').onclick=()=>studio.contentWindow.postMessage('reset-upscale-demo',location.origin);
select('customer');
</script>
</html>`);

writeFileSync(join(workerRoot, 'upscale-preview-entry.mjs'), `
import candidate from './worker.mjs';

const csp = [
  "default-src 'none'", "script-src 'self' 'unsafe-inline'", "style-src 'self' 'unsafe-inline'",
  "img-src 'self' data: blob:", "font-src 'self'", "media-src 'self' data: blob:",
  "connect-src 'self'", "frame-src 'self'", "frame-ancestors 'self'", "form-action 'none'",
  "base-uri 'none'", "object-src 'none'", "worker-src 'self' blob:"
].join('; ');

export default {
  async fetch(request, env, ctx) {
    const url = new URL(request.url);
    if (url.pathname === '/health' && request.method === 'GET') return candidate.fetch(request, env, ctx);
    if (request.method !== 'GET' && request.method !== 'HEAD' || url.pathname.startsWith('/api/'))
      return new Response('Upscale preview does not expose production APIs.', {status: 404});
    const response = await env.PREVIEW_ASSETS.fetch(request);
    const headers = new Headers(response.headers);
    headers.set('Content-Security-Policy', csp);
    headers.set('Referrer-Policy', 'no-referrer');
    headers.set('X-Robots-Tag', 'noindex, nofollow, noarchive');
    return new Response(response.body, {status: response.status, headers});
  }
};
`);
writeFileSync(join(workerRoot, 'wrangler-upscale-studio-preview.json'), JSON.stringify({
  name: 'parallel-vision-lab', main: 'upscale-preview-entry.mjs', compatibility_date: '2026-09-26',
  assets: {directory: '../.upscale-preview-public', binding: 'PREVIEW_ASSETS', run_worker_first: true},
  previews: {}
}, null, 2));
