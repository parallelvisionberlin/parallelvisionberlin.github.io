import test from 'node:test';
import assert from 'node:assert/strict';
import { EventEmitter } from 'node:events';
import { watchNinaLiveMedia, streamNinaVideoForAttempt } from '../../js/nina-live-media.js';

const events = Object.fromEntries(['VIDEO_PLAY_STARTED', 'CONNECTION_ESTABLISHED', 'CONNECTION_CLOSED',
  'MIC_PERMISSION_DENIED', 'USER_SPEECH_STARTED', 'MESSAGE_HISTORY_UPDATED'].map(name => [name, name]));
function fixture({ frameCallbacks = true } = {}) {
  let time = 0, visible = true, current = true, poll, nextFrame = 0;
  const frames = new Map(), failures = [], notes = [];
  const client = new EventEmitter(), video = new EventTarget(), visibilityTarget = new EventTarget();
  Object.assign(video, { currentTime: 0, paused: false, readyState: 4, playCalls: 0,
    play() { this.playCalls += 1; this.paused = false; return Promise.resolve(); } });
  if (frameCallbacks) Object.assign(video, {
    requestVideoFrameCallback(callback) { const id = ++nextFrame; frames.set(id, callback); return id; },
    cancelVideoFrameCallback(id) { frames.delete(id); }
  });
  const guard = watchNinaLiveMedia({ client, events, video, visibilityTarget, isCurrent: () => current,
    isVisible: () => visible, now: () => time, schedule(fn) { poll = fn; return 1; }, cancel() { poll = null; },
    onFailure: problem => failures.push(problem), record: (kind, data) => notes.push({ kind, data }) });
  return { client, video, guard, failures, notes, frames,
    advance(ms) { time += ms; poll?.(); },
    frame() { video.currentTime += 1; const queued = [...frames.values()]; frames.clear(); queued.forEach(fn => fn()); },
    setVisible(value, notify = false) { visible = value; if (notify) visibilityTarget.dispatchEvent(new Event('visibilitychange')); },
    elapseWithoutPolling(ms) { time += ms; }, setCurrent(value) { current = value; },
    get polling() { return Boolean(poll); } };
}

test('connection and resolved SDK startup do not mean video is ready', async () => {
  const f = fixture(); let ready = false;
  f.guard.ready.then(() => { ready = true; });
  await Promise.resolve();
  f.client.emit(events.CONNECTION_ESTABLISHED);
  await Promise.resolve();
  assert.equal(ready, false);
  f.client.emit(events.VIDEO_PLAY_STARTED);
  await f.guard.ready;
  assert.equal(ready, true);
  f.guard.dispose();
});

test('missing first video frame times out and detaches every listener', async () => {
  const f = fixture();
  f.advance(29999); assert.equal(f.polling, true);
  f.advance(1);
  await assert.rejects(f.guard.ready, { code: 'video_start_timeout' });
  assert.equal(f.polling, false);
  assert.equal(f.frames.size, 0);
  assert.equal(f.client.eventNames().length, 0);
  assert.equal(f.failures.length, 0, 'Startup rejection is handled by the connecting caller');
});

test('connection failure before playback rejects readiness with diagnostic reason', async () => {
  const f = fixture();
  f.client.emit(events.CONNECTION_CLOSED, 'CONNECTION_CLOSED_CODE_WEBRTC_FAILURE', 'provider details');
  await assert.rejects(f.guard.ready, { code: 'connection_closed' });
  assert.ok(f.notes.some(n => n.kind === 'connection_closed' && n.data.reason === 'CONNECTION_CLOSED_CODE_WEBRTC_FAILURE'));
  assert.ok(!JSON.stringify(f.notes).includes('provider details'));
});

test('a visible frozen image fails despite continuing speech and text events', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.frame();
  f.advance(14000);
  f.client.emit(events.USER_SPEECH_STARTED, 'speech');
  f.client.emit(events.MESSAGE_HISTORY_UPDATED, [{ role: 'persona', content: 'Still talking' }]);
  f.advance(1000);
  assert.equal(f.failures.length, 1);
  assert.equal(f.failures[0].code, 'video_stalled');
  f.advance(60000); f.client.emit(events.CONNECTION_CLOSED, 'normal');
  assert.equal(f.failures.length, 1);
  assert.equal(f.client.eventNames().length, 0);
});

test('healthy rendered listening can continue indefinitely without speech or text', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  for (let i = 0; i < 100; i += 1) { f.frame(); f.advance(1000); }
  assert.equal(f.failures.length, 0);
  assert.equal(f.polling, true);
  f.guard.dispose();
});

test('background suspension is ignored and returning tab receives full grace', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.setVisible(false); f.advance(120000);
  assert.equal(f.failures.length, 0);
  f.setVisible(true); f.advance(1000);
  f.advance(14000); assert.equal(f.failures.length, 0);
  f.frame(); f.advance(1000); assert.equal(f.failures.length, 0);
  f.guard.dispose();
});

test('a paused video is resumed once before failing, with no new client session', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.video.paused = true;
  f.advance(15000);
  assert.equal(f.video.playCalls, 1);
  assert.equal(f.failures.length, 0);
  f.advance(4999); assert.equal(f.failures.length, 0);
  f.advance(1); assert.equal(f.failures[0].code, 'video_stalled');
  assert.equal(f.video.playCalls, 1);
});

test('a fully throttled hidden tab is not failed on its first foreground timer', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.setVisible(false, true); f.elapseWithoutPolling(60000); f.setVisible(true, true);
  f.advance(1000); assert.equal(f.failures.length, 0);
  f.frame(); f.advance(14000); assert.equal(f.failures.length, 0);
  f.guard.dispose();
});

test('resumed rendered frames clear the stall without ending a call', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.video.paused = true; f.advance(15000); f.frame(); f.advance(5000);
  assert.equal(f.failures.length, 0);
  assert.equal(f.video.playCalls, 1);
  f.guard.dispose();
});

test('fallback uses advancing playback time, not user speech or heartbeat', async () => {
  const f = fixture({ frameCallbacks: false }); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  for (let i = 0; i < 20; i += 1) { f.frame(); f.advance(1000); }
  assert.equal(f.failures.length, 0);
  f.advance(15000); assert.equal(f.failures[0].code, 'video_stalled');
});

test('cancelling or superseding a startup rejects ready and cannot fail a later call', async () => {
  const f = fixture();
  f.setCurrent(false); f.advance(1000);
  await assert.rejects(f.guard.ready, { name: 'AbortError' });
  f.client.emit(events.VIDEO_PLAY_STARTED); f.video.dispatchEvent(new Event('error'));
  f.advance(60000);
  assert.equal(f.failures.length, 0);
  assert.equal(f.frames.size, 0);
  assert.equal(f.polling, false);
});

test('an explicit playback failure ends a ready call once', async () => {
  const f = fixture(); f.client.emit(events.VIDEO_PLAY_STARTED); await f.guard.ready;
  f.video.dispatchEvent(new Event('error')); f.video.dispatchEvent(new Event('error'));
  assert.equal(f.failures.length, 1);
  assert.equal(f.failures[0].code, 'video_playback_error');
});

for (const exit of ['timeout', 'close']) {
  test(`a late SDK startup after ${exit} is stopped without touching a new call`, async () => {
    const f = fixture(); let finishStartup, oldStops = 0, newStops = 0;
    const replacement = { stopStreaming() { newStops += 1; } };
    let currentClient = f.client;
    f.client.streamToVideoElement = () => new Promise(resolve => { finishStartup = resolve; });
    f.client.stopStreaming = async () => { oldStops += 1; };
    const startup = streamNinaVideoForAttempt(f.client, 'nina-anam-video', {}, () => currentClient === f.client);
    const connected = Promise.all([startup, f.guard.ready]);
    await Promise.resolve();
    if (exit === 'timeout') f.advance(30000);
    else f.guard.dispose();
    await assert.rejects(connected, exit === 'timeout' ? { code: 'video_start_timeout' } : { name: 'AbortError' });
    // Application cleanup happens while the SDK has no streaming client yet.
    await f.client.stopStreaming();
    currentClient = replacement; f.setCurrent(false);
    finishStartup(); await startup;
    assert.equal(oldStops, 2, 'Late startup receives its own cleanup after initial stop');
    assert.equal(newStops, 0);
    assert.equal(currentClient, replacement);
    assert.equal(f.failures.length, 0);
  });
}

test('a current SDK startup remains connected after first video readiness', async () => {
  const f = fixture(); let stops = 0;
  f.client.streamToVideoElement = async () => {};
  f.client.stopStreaming = async () => { stops += 1; };
  const startup = streamNinaVideoForAttempt(f.client, 'nina-anam-video', {}, () => true);
  f.client.emit(events.VIDEO_PLAY_STARTED);
  await Promise.all([startup, f.guard.ready]);
  assert.equal(stops, 0);
  f.guard.dispose();
});
