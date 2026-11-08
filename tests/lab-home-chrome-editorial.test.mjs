import test from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../lab/index.html', import.meta.url), 'utf8');
const css = readFileSync(new URL('../lab/home-chrome-editorial.css', import.meta.url), 'utf8');
const title = readFileSync(new URL('../lab/chrome-desert-title.svg', import.meta.url), 'utf8');
const match = html.match(/<section class="pv-chrome-editorial" id="featured-editorial"[\s\S]*?<\/section>/);
const section = match?.[0] || '';

test('Chrome Desert occupies the existing editorial position, once', () => {
  assert.ok(section, 'The feature is static HTML, not an injected screenshot');
  assert.equal((html.match(/id="featured-editorial"/g) || []).length, 1);
  assert.ok(html.indexOf('id="tools"') < html.indexOf(section));
  assert.ok(html.indexOf(section) < html.indexOf('id="creative-studios"'));
  assert.ok(html.indexOf('id="creative-studios"') < html.indexOf('id="create-your-character"'));
});

test('The existing Full Editorial entry route and accessible action survive', () => {
  assert.match(section, /<a class="pv-feature-button" href="\.\/full-editorial\.html\?start=1" aria-label="Create your editorial">Create your editorial<\/a>/);
  assert.equal((section.match(/<a\b/g) || []).length, 1);
  assert.doesNotMatch(section, /data-lab-buy|data-generate|Use photo pack|3 photos|New pack|[→↗↘]/i);
});

test('Approved display lettering retains a real accessible heading', () => {
  assert.match(section, /aria-labelledby="pv-editorial-feature-title"/);
  assert.match(section, /<h2 id="pv-editorial-feature-title"><span class="chrome-editorial__title-text">Chrome Desert<\/span>/);
  assert.match(section, /PV LAB \/ FULL EDITORIAL/);
  assert.match(section, /class="chrome-editorial__title-art"[^>]*alt="" aria-hidden="true"/);
  assert.match(title, /viewBox="0 0 356 305"/);
  assert.doesNotMatch(title, /<script|<foreignObject|<image|<text/i);
});

test('Photography is optimized, responsive and separate from the controls', () => {
  assert.match(section, /b32dad5b-a45b-4f0e-b6e6-8dba0bfc330a\.webp/);
  assert.match(section, /5bcefe56-3d70-4aa7-9157-5a7201e4b47c\.webp 640w/);
  assert.match(section, /\.webp 1048w/);
  assert.match(section, /width="1048" height="870"/);
  assert.match(section, /alt="Layered Chrome Desert editorial photographs:/);
  assert.equal((section.match(/loading="lazy" decoding="async"/g) || []).length, 2);
  assert.doesNotMatch(section, /<video|<script|<iframe|X-Amz-|\.png["?]/i);
});

test('New styling is versioned, section-scoped and responsive', () => {
  assert.match(html, /home-chrome-editorial\.css\?v=20261108-chrome-desert1/);
  assert.ok(html.indexOf('home-creative-features.css?') < html.indexOf('home-chrome-editorial.css?'));
  assert.match(css, /#featured-editorial\.pv-chrome-editorial/);
  assert.match(css, /height: auto !important/);
  assert.match(css, /min-height: 0 !important/);
  assert.match(css, /@media \(max-width: 760px\)/);
  assert.match(css, /grid-template-areas: 'heading' 'art' 'action'/);
  assert.match(css, /min-height: 56px !important/);
  assert.match(css, /:focus-visible/);
  assert.doesNotMatch(css, /@import|@font-face|animation:|position: fixed/);
});

test('The retired feature loop is no longer loaded, while hero motion remains', () => {
  assert.doesNotMatch(html, /src="\.\/home-editorial-loop\.js/);
  assert.match(html, /id="pv-hero-motion"/);
  assert.match(html, /src="\.\/landing-motion\.js\?v=20261028-flesh-zero-exact1"/);
});
