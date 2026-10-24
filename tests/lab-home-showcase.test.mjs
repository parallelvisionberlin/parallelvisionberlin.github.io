import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {fileURLToPath} from 'node:url';
import path from 'node:path';

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const html = readFileSync(path.join(root, 'lab/index.html'), 'utf8');
const css = readFileSync(path.join(root, 'lab/home-showcase.css'), 'utf8');
const js = readFileSync(path.join(root, 'lab/home-showcase.js'), 'utf8');

test('image-to-motion chapter follows original hero and precedes Mood Creator', () => {
  const hero = html.indexOf('class="lab-hero"');
  const showcase = html.indexOf('id="from-image-to-motion"');
  const mood = html.indexOf('id="mood-creator"');
  assert.ok(hero >= 0 && showcase > hero && mood > showcase);
  assert.match(html, /Build the look\. Keep the identity\. <em>Make it move\.<\/em>/);
});
test('showcase uses only existing publicly hosted PV LAB assets', () => {
  for (const rel of [
    'visuals/leather-editorial/hero-desktop.webp',
    'visuals/fashion-replace/hero-model-oct24.jpg',
    'visuals/studio-tools/video-liquid-dress.webp',
    'visuals/studio-tools/video-liquid-dress-hd.mp4'
  ]) {
    assert.match(html, new RegExp(rel.replaceAll('.', '\\.') ));
  }
  assert.match(html, /The examples are separate works/);
});
test('showcase does not trigger jobs and has accessible explicit video control', () => {
  assert.match(html, /id="pv-showcase-reel-toggle"/);
  assert.match(html, /preload="none"/);
  assert.match(js, /addEventListener\('click'/);
  assert.doesNotMatch(js, /fetch\(|XMLHttpRequest|api\/jobs|autoplay/);
});
test('showcase is independently styled and responsive', () => {
  assert.match(html, /home-showcase\.css\?v=20261024-editorial-triptych1/);
  assert.match(html, /home-showcase\.js\?v=20261024-editorial-triptych1/);
  assert.match(css, /@media\(max-width:700px\)/);
  assert.match(css, /scroll-snap-type:x mandatory/);
});
