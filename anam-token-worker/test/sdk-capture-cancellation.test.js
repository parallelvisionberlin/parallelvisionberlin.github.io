import test from 'node:test';
import assert from 'node:assert/strict';
import vm from 'node:vm';
import { readFileSync, existsSync } from 'node:fs';
import { createHash } from 'node:crypto';

const patchedUrl = new URL('../../js/vendor/anam-sdk-4.27.0-pv1.js', import.meta.url);
const upstreamUrl = new URL('../../vendor/anam-sdk/.upstream-control.js', import.meta.url);

// Execute the entire distributed SDK in an isolated browser sandbox. Internal
// access is confined to this test to reproduce a pending permission response;
// production uses only the SDK's public API.
function fixture(sourceUrl = patchedUrl) {
  let grant;
  const captures = [], events = [], replacements = [];
  const context = vm.createContext({
    console: { log() {}, warn() {}, error() {} },
    navigator: { userAgent: 'Chrome/152.0', mediaDevices: {
      getUserMedia: constraints => { captures.push(constraints); return new Promise(resolve => { grant = resolve; }); }
    } },
    setTimeout, clearTimeout, setInterval, clearInterval, TextEncoder,
    performance: { now: () => 0 },
    fetch() { throw new Error('The capture test must not make a network request.'); }
  });
  const source = readFileSync(sourceUrl, 'utf8');
  const exportsAt = source.lastIndexOf('\nexport {');
  assert.ok(exportsAt > 0, 'Bundle must remain ESM with its public exports');
  vm.runInContext(source.slice(0, exportsAt) + '\nsetClientMetricsDisabled(true); globalThis.testSdk = {StreamingClient, AnamEvent, AudioPermissionState};', context);
  const { StreamingClient, AnamEvent, AudioPermissionState } = context.testSdk;
  const track = { kind: 'audio', readyState: 'live', enabled: true, stops: 0,
    stop() { this.stops += 1; this.readyState = 'ended'; }, getSettings: () => ({}) };
  const stream = { getTracks: () => [track], getAudioTracks: () => [track] };
  const oldTrack = { kind: 'audio', readyState: 'live', stop() { this.readyState = 'ended'; } };
  const sender = { track: oldTrack, async replaceTrack(value) { replacements.push(value); this.track = value; } };
  const peerConnection = {
    connectionState: 'connected', getSenders: () => [sender],
    close() { this.connectionState = 'closed'; }, addTrack() { throw new Error('Expected replacement of existing sender'); }
  };
  const client = Object.create(StreamingClient.prototype);
  Object.assign(client, {
    peerConnection, inputAudioStream: null, inputAudioState: { isMuted: false, permissionState: AudioPermissionState.NOT_REQUESTED },
    audioDeviceId: 'default', iceRestartStopped: false,
    publicEventEmitter: { emit: (...args) => events.push(args) },
    internalEventEmitter: { removeListener() {} },
    signallingClient: { stop() {}, endIceRestartReconnect() {} }
  });
  return { client, peerConnection, stream, track, captures, events, replacements, AnamEvent,
    grant() { assert.equal(typeof grant, 'function', 'SDK requested actual mocked browser capture'); grant(stream); } };
}

for (const path of ['switch', 'initial']) {
  const startCapture = f => path === 'switch'
    ? f.client.changeAudioInputDevice('replacement') : f.client.requestMicrophonePermissionAsync();

  test(`${path}: delayed permission after real SDK shutdown releases the new capture`, async () => {
    const f = fixture(); const pending = startCapture(f);
    assert.equal(f.captures.length, 1);
    await f.client.stopConnection();
    assert.equal(f.client.peerConnection, null);
    f.grant(); await pending;
    assert.equal(f.track.readyState, 'ended');
    assert.equal(f.track.stops, 1);
    assert.equal(f.client.inputAudioStream, null);
    assert.equal(f.replacements.length, 0);
    assert.ok(!f.events.some(([event]) => [f.AnamEvent.INPUT_AUDIO_DEVICE_CHANGED,
      f.AnamEvent.INPUT_AUDIO_STREAM_STARTED, f.AnamEvent.MIC_PERMISSION_GRANTED].includes(event)));
  });

  test(`${path}: healthy capture retains the stream, publishes normal events and stops normally`, async () => {
    const f = fixture(); const pending = startCapture(f); f.grant(); await pending;
    assert.equal(f.client.inputAudioStream, f.stream);
    assert.equal(f.track.readyState, 'live');
    assert.deepEqual(f.replacements, [f.track]);
    assert.ok(f.events.some(([event, stream]) => event === f.AnamEvent.INPUT_AUDIO_STREAM_STARTED && stream === f.stream));
    await f.client.stopConnection();
    assert.equal(f.track.readyState, 'ended');
  });

  test(`${path}: an obsolete capture cannot attach to a replacement peer connection`, async () => {
    const f = fixture(); const pending = startCapture(f);
    const replacement = { ...f.peerConnection };
    f.client.peerConnection = replacement;
    f.grant(); await pending;
    assert.equal(f.track.readyState, 'ended');
    assert.equal(f.client.peerConnection, replacement);
    assert.equal(f.client.inputAudioStream, null);
    assert.equal(f.replacements.length, 0);
    await f.client.stopConnection();
  });

  test(`${path}: published unpatched 4.27.0 reproduces the capture leak`, {
    skip: !existsSync(upstreamUrl) && 'Optional control: run vendor/anam-sdk/build.mjs --upstream-control'
  }, async () => {
    const f = fixture(upstreamUrl); const pending = startCapture(f);
    await f.client.stopConnection(); f.grant(); await pending;
    assert.equal(f.track.readyState, 'live', 'Published SDK leaves the late track recording');
    assert.equal(f.client.inputAudioStream, f.stream, 'Published SDK stores capture on a stopped connection');
    assert.equal(f.replacements.length, 0);
    f.track.stop();
  });
}

test('shutdown-in-progress also cancels late capture before optional stats finish', async () => {
  const f = fixture(); let finishStats;
  f.client.showPeerConnectionStatsReport = true;
  f.peerConnection.getStats = () => new Promise(resolve => { finishStats = resolve; });
  const pending = f.client.changeAudioInputDevice('replacement');
  const stopped = f.client.stopConnection();
  assert.equal(f.client.peerConnection, f.peerConnection);
  assert.equal(f.client.iceRestartStopped, true);
  f.grant(); await pending;
  assert.equal(f.track.readyState, 'ended');
  assert.equal(f.client.inputAudioStream, null);
  finishStats(null); await stopped;
});

test('checked-in SDK bundle matches the audited manifest and has no external imports', () => {
  const source = readFileSync(patchedUrl, 'utf8');
  const manifest = JSON.parse(readFileSync(new URL('../../vendor/anam-sdk/manifest.json', import.meta.url), 'utf8'));
  assert.equal(createHash('sha256').update(source).digest('hex'), manifest.sha256);
  assert.equal(Buffer.byteLength(source), manifest.bytes);
  assert.ok(!/^import\s/m.test(source));
  assert.ok(manifest.exports.includes('createClient'));
  assert.ok(manifest.exports.includes('AnamEvent'));
});
