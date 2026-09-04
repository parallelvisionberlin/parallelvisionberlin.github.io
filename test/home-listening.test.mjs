import assert from 'node:assert/strict';
import fs from 'node:fs';
import vm from 'node:vm';
import test from 'node:test';

const source = fs.readFileSync(new URL('../js/home.js', import.meta.url), 'utf8');
const controller = source.slice(source.indexOf('(function setupListeningSelection()'));

function fixture() {
  const events = [];
  const pageEvents = {};
  const status = { textContent: '' };
  const entries = Array.from({ length: 5 }, (_, i) => {
    const handlers = {}, summary = {};
    const frame = { src: 'about:blank', dataset: { soundcloudSrc: `https://w.soundcloud.com/player/?url=track-${i}&auto_play=false` } };
    const entry = {
      open: false, frame,
      querySelector: selector => selector === 'summary' ? { addEventListener: (type, fn) => { summary[type] = fn; } } : frame,
      addEventListener: (type, fn) => { handlers[type] = fn; },
      click() { summary.click(); this.open = !this.open; handlers.toggle(); },
      toggle() { handlers.toggle(); }
    };
    return entry;
  });
  vm.runInNewContext(controller, {
    document: { querySelectorAll: () => entries, getElementById: () => status, documentElement: { lang: 'en' }, dispatchEvent: event => events.push(event.type) },
    window: { addEventListener: (type, fn) => { pageEvents[type] = fn; } },
    Event: class { constructor(type) { this.type = type; } }
  });
  return { entries, events, status, pageEvents };
}

test('SoundCloud remains unloaded until an explicit selection, without autoplay', () => {
  const f = fixture();
  assert.ok(f.entries.every(e => e.frame.src === 'about:blank'));
  f.entries[0].click();
  assert.match(f.entries[0].frame.src, /track-0&auto_play=false/);
  assert.ok(f.entries.slice(1).every(e => e.frame.src === 'about:blank'));
  assert.deepEqual(f.events, ['pv-listening-open']);
  assert.match(f.status.textContent, /Press play/);
});

test('switching selections unloads the previous player so audio cannot overlap', () => {
  const f = fixture();
  f.entries[0].click(); f.entries[1].click();
  assert.equal(f.entries[0].open, false);
  assert.equal(f.entries[0].frame.src, 'about:blank');
  assert.equal(f.entries[1].open, true);
  f.entries[0].toggle(); // A queued close notification must not disturb the new player.
  assert.match(f.entries[1].frame.src, /track-1/);
  assert.equal(f.entries.filter(e => e.open).length, 1);
});

test('closing a selection and leaving the page stop the embedded player', () => {
  const f = fixture();
  f.entries[2].click(); f.entries[2].click();
  assert.equal(f.entries[2].frame.src, 'about:blank');
  f.entries[4].click(); f.pageEvents.pagehide();
  assert.ok(f.entries.every(e => !e.open && e.frame.src === 'about:blank'));
});

test('homepage keeps project discovery distinct from Nina live access', () => {
  const html = fs.readFileSync(new URL('../index.html', import.meta.url), 'utf8');
  const feature = html.slice(html.indexOf('id="nina-fok"'), html.indexOf('id="artists"'));
  assert.match(feature, /nina-identity-discover.*href="\.\/nina-project.html"/);
  assert.doesNotMatch(feature, /TALK TO NINA|data-nina-open|openNinaArtist/i);
  assert.match(html, /class="home-desktop-signal-tab"[^>]+data-nina-open/);
  assert.match(html, /class="home-mobile-signal-entry"[^>]+data-nina-open/);
  assert.doesNotMatch(html, /vision-neo\.webp/);
  assert.equal((html.match(/class="listening-track"/g) || []).length, 5);
  assert.match(html, /class="hero-video"/);
  assert.match(html, /class="logo hero-wordmark" aria-label="Parallel Vision"/);
  assert.doesNotMatch(html, /SIGNAL STABILITY 87%/);
});
