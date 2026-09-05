const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const root = path.resolve(__dirname, '..');
const pages = ['index.html','alejandro-molinari.html','badwolf.html','blex.html','cabizbajo.html','berlin-2063.html','moving-transmissions.html','future-fashion.html','chromia.html','flesh-zero.html','lotus-2063.html','magnetic-tape.html','dna-mutation.html','cabizbajo-fashion-after-fabric.html','nina-fok.html','nina-project.html','nina.html','nina-fok/index.html'];
const redirectPages = new Set(['nina-fok/index.html']);
const errors = [];
const fail = message => errors.push(message);
const external = value => /^(?:https?:|mailto:|tel:|data:|javascript:|about:|#)/i.test(value);

for (const file of pages) {
  const absolute = path.join(root, file);
  if (!fs.existsSync(absolute)) { fail(`Missing public page: ${file}`); continue; }
  const html = fs.readFileSync(absolute, 'utf8');
  const ids = [...html.matchAll(/\bid=["']([^"']+)["']/gi)].map(match => match[1]);
  const duplicates = ids.filter((id, i) => ids.indexOf(id) !== i);
  if (duplicates.length) fail(`${file}: duplicate IDs: ${[...new Set(duplicates)].join(', ')}`);
  if ((html.match(/<h1\b/gi) || []).length !== 1) fail(`${file}: must contain exactly one h1`);
  if (!redirectPages.has(file) && !/<main\b[^>]*>/i.test(html)) fail(`${file}: missing main landmark`);
  if (!/<title>[^<]+<\/title>/i.test(html)) fail(`${file}: missing title`);
  if (!/<meta\s+name=["']description["'][^>]+content=["'][^"']+/i.test(html)) fail(`${file}: missing description`);
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (!canonical) fail(`${file}: missing canonical`);
  else {
    try {
      const url = new URL(canonical);
      if (url.origin !== 'https://parallelvisionlabel.com' || canonical.includes('.com..')) fail(`${file}: malformed canonical ${canonical}`);
    } catch { fail(`${file}: invalid canonical URL ${canonical}`); }
  }
  for (const match of html.matchAll(/<a\b[^>]*href=["']#([^"']+)["'][^>]*>/gi)) {
    if (!ids.includes(match[1])) fail(`${file}: fragment link targets missing ID #${match[1]}`);
  }
  for (const match of html.matchAll(/<img\b([^>]*)>/gi)) {
    const attributes = match[1];
    if (!/\balt=["'][^"']*["']/i.test(attributes)) fail(`${file}: image missing alt`);
    const source = attributes.match(/\bsrc=["']([^"']+)["']/i)?.[1];
    if (source && !external(source)) {
      if (!/\bwidth=["'][1-9]\d*["']/i.test(attributes) || !/\bheight=["'][1-9]\d*["']/i.test(attributes)) {
        fail(`${file}: local image missing numeric intrinsic width and height: ${source}`);
      }
    }
  }
  for (const match of html.matchAll(/<iframe\b([^>]*)>/gi)) if (!/\btitle=["'][^"']+["']/i.test(match[1])) fail(`${file}: iframe missing title`);
  for (const match of html.matchAll(/\b(?:src|href)=["']([^"']+)["']/gi)) {
    const value = match[1];
    if (external(value)) continue;
    const target = path.resolve(path.dirname(absolute), value.split(/[?#]/)[0]);
    if (!fs.existsSync(target)) fail(`${file}: unresolved ${value}`);
    else if (fs.statSync(target).isFile() && fs.statSync(target).size === 2) fail(`${file}: references two-byte placeholder ${value}`);
  }
  for (const match of html.matchAll(/<script(?![^>]+src=)[^>]*>([\s\S]*?)<\/script>/gi)) {
    try { new vm.Script(match[1], { filename: file }); } catch (error) { fail(`${file}: inline JS: ${error.message}`); }
  }
  if (/http-equiv=["']refresh/i.test(html)) {
    const target = html.match(/content=["'][^;]+;\s*url=([^"']+)/i)?.[1];
    if (!target || !fs.existsSync(path.resolve(path.dirname(absolute), target))) fail(`${file}: invalid redirect target`);
    else if (canonical) {
      const pageUrl = `https://parallelvisionlabel.com/${file.replace(/index\.html$/, '')}`;
      const destination = new URL(target, pageUrl).href;
      if (canonical !== destination) fail(`${file}: canonical ${canonical} differs from redirect destination ${destination}`);
    }
  }
}

for (const file of ['language.js','js/home.js','js/nina-access.js','anam-token-worker/src/auth.js','anam-token-worker/src/index.js','anam-token-worker/src/memory.js']) {
  try {
    const source = fs.readFileSync(path.join(root, file), 'utf8')
      .replace(/^import[\s\S]*?from\s+["'][^"']+["'];$/gm, '')
      .replace(/^export\s+(?=(?:class|const|function|async\s+function))/gm, '')
      .replace(/^export default /m, 'const __defaultExport = ');
    new vm.Script(source, { filename: file });
  }
  catch (error) { fail(`${file}: parse error: ${error.message}`); }
}

const index = fs.readFileSync(path.join(root, 'index.html'), 'utf8');
const nina = fs.readFileSync(path.join(root, 'js/nina-access.js'), 'utf8');
const ninaStandalone = fs.readFileSync(path.join(root, 'nina.html'), 'utf8');
const activeNinaRuntime = `${index}\n${nina}\n${ninaStandalone}`;
if (/tavus-embed|@tavus\/embed|tavus:|\.tavus\b/i.test(activeNinaRuntime)) fail('Tavus remains in active Nina runtime code');
if (/d70bc773-bd96-44e2-ad08-abf2cac262be|79e246c0-70c7-4c2c-930b-3bf421a01e46/.test(activeNinaRuntime)) fail('A Tavus deployment ID remains in active Nina runtime code');
if (index.includes('/api/verify-nina-access')) fail('Static gate calls a nonexistent API');
for (const marker of [
  'a5663da5-5f5c-4600-b545-cbb58bd4e155',
  'crypto.subtle.digest("SHA-256", encodedCode)',
  'let ninaAccessVerifiedForCurrentOpen = false',
  'let ninaConnecting = false',
  'if (ninaConnecting || ninaClient',
  'streamToVideoElement("nina-anam-video", ninaMicrophoneStream)',
  'navigator.mediaDevices.enumerateDevices()',
  'device.kind === "audioinput"',
  'ninaPreferredMicrophoneId',
  'navigator.mediaDevices?.addEventListener?.("devicechange"',
  'stopNinaMicrophone()',
  'stopStreaming()',
  'window.addEventListener("pagehide"',
  'window.addEventListener("beforeunload"',
  'client-side UI'
]) if (!nina.includes(marker)) fail(`Nina marker missing: ${marker}`);
if (!index.includes('id="nina-anam-video"') || !index.includes('autoplay playsinline')) fail('Nina Anam video element is missing');
if ((nina.match(/const ANAM_SESSION_TOKEN_ENDPOINT\s*=/g) || []).length !== 1) fail('Anam token endpoint must have exactly one client configuration point');
if (/ANAM_API_KEY/.test(`${index}\n${nina}\n${ninaStandalone}`)) fail('ANAM_API_KEY appears in client code');
const ninaProject = fs.readFileSync(path.join(root, 'nina-project.html'), 'utf8');
if (!/<a[^>]+class="[^"]*nina-identity-discover[^>]+href="\.\/nina-project.html"/.test(index) || !index.includes('class="home-desktop-signal-tab" type="button" data-nina-open')) fail('Homepage Nina project link and live access are not wired correctly');
if (index.includes('id="openNinaArtist"')) fail('Homepage Nina feature duplicates the floating live action');
if ((index.match(/class="listening-track"/g) || []).length !== 5) fail('Listening selection must preserve all five music entries');
if (/class="release-card"[\s\S]{0,400}vision-neo\.webp/.test(index)) fail('Vision artwork must not appear in the homepage catalog');
if (!ninaProject.includes('data-nina-open') || ninaProject.includes('href="./index.html?nina=1"')) fail('Nina project transmission must open the local shared access flow');
if (!ninaProject.includes('./js/nina-access.js') || !ninaProject.includes('id="ninaAccess"') || !ninaProject.includes('id="ninaOverlay"')) fail('Nina project page must host the shared Nina access component');
if (!index.includes('./css/nina-access.css') || !ninaProject.includes('./css/nina-access.css')) fail('Nina access styles must be shared by the homepage and project page');
const ninaProjectOrder = ['class="n-hero"','id="question-title"','id="study-title"','id="berlin-title"','id="condition-title"','id="transmit"'];
if (!ninaProjectOrder.every((marker, index) => ninaProject.includes(marker) && (index === 0 || ninaProject.indexOf(marker) > ninaProject.indexOf(ninaProjectOrder[index - 1])))) fail('Nina project section order changed');
if (!/<source\b[^>]*data-src="\.\/nina-fok\/NINATALKNEW\.mp4"[^>]*type="video\/mp4"/.test(ninaProject)) fail('Nina personality video is not wired to the hero');
if (/<video\b[^>]*\scontrols(?:\s|=|>)/i.test(ninaProject)) fail('Nina project must not expose native video controls');
for (const marker of ['id="ninaVideoSound"','Sound On','prefers-reduced-motion: reduce','video.pause()','./assets/optimized/thecitysuperhd1.webp']) if (!ninaProject.includes(marker)) fail(`Nina project visual marker missing: ${marker}`);
const connectNinaSource = nina.match(/async function connectNina\(\) \{[\s\S]*?\n\}/)?.[0] || '';
if (!connectNinaSource.includes('requestSessionToken(ninaTokenAbortController.signal, restoredHistory)')) fail('Anam token must only be requested from the CONNECT flow');
if ((nina.match(/requestSessionToken\(ninaTokenAbortController\.signal, restoredHistory\)/g) || []).length !== 1) fail('Anam token request must have exactly one CONNECT call site');
for (const match of index.matchAll(/<img\b([^>]*)>/gi)) if (/\bloading=["']eager["']/i.test(match[1])) fail('Homepage below-the-fold image must not be eager-loaded');
const soundcloudStatus = index.match(/<[^>]+id=["']soundcloudLoadingStatus["'][^>]*>/i)?.[0] || '';
if (!/\brole=["']status["']/i.test(soundcloudStatus) || !/\baria-live=["']polite["']/i.test(soundcloudStatus)) fail('SoundCloud deferred loading status is missing accessible live semantics');
for (const match of index.matchAll(/<iframe\b([^>]*data-soundcloud-src[^>]*)>/gi)) {
  if (!/\bsrc=["']about:blank["']/i.test(match[1])) fail('Deferred SoundCloud iframe must start unloaded');
  if (!/\baria-describedby=["']soundcloudLoadingStatus["']/i.test(match[1])) fail('Deferred SoundCloud iframe lacks accessible loading semantics');
}

const sitemap = fs.readFileSync(path.join(root, 'sitemap.xml'), 'utf8');
for (const file of pages.filter(file => file !== 'nina-fok/index.html')) {
  const html = fs.readFileSync(path.join(root, file), 'utf8');
  const canonical = html.match(/<link\s+rel=["']canonical["'][^>]+href=["']([^"']+)/i)?.[1];
  if (canonical && !sitemap.includes(`<loc>${canonical}</loc>`)) fail(`Sitemap missing ${canonical}`);
}

const maintainedExtensions = new Set(['.html', '.css', '.js']);
function checkWhitespace(directory) {
  for (const entry of fs.readdirSync(directory, { withFileTypes: true })) {
    if (['.git', '.codex-refrakt-work', '.publish-homepage', 'node_modules'].includes(entry.name)) continue;
    const absolute = path.join(directory, entry.name);
    if (entry.isDirectory()) { checkWhitespace(absolute); continue; }
    if (!maintainedExtensions.has(path.extname(entry.name))) continue;
    const lines = fs.readFileSync(absolute, 'utf8').replace(/\r\n/g, '\n').split('\n');
    lines.forEach((line, index) => { if (/[ \t]+$/.test(line)) fail(`${path.relative(root, absolute)}:${index + 1}: trailing whitespace`); });
  }
}
checkWhitespace(root);

if (errors.length) { console.error(errors.map(error => `- ${error}`).join('\n')); process.exit(1); }
console.log(`Static site validation passed (${pages.length} public HTML files).`);

