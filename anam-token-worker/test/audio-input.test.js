import assert from 'node:assert/strict';
import test from 'node:test';
import { buildLivePersonaConfig } from '../src/index.js';
import { speechConstraints, appliedSpeechSettings } from '../../js/nina-audio-input.js';
import { attachConversationDiagnostics } from '../../js/nina-diagnostics.js';

test('noise policy reaches live config without changing identity, voice, STT or response timing', () => {
  const persona = {
    avatar: { id: 'avatar' }, voice: { id: 'voice' }, llmId: 'model', languageCode: 'es',
    brain: { systemPrompt: 'EXACT CANON' }, voiceGenerationOptions: { speed: .9 },
    voiceDetectionOptions: { speechEnhancementLevel: .2, silenceBeforeSkipTurnSeconds: 15,
      endOfSpeechSensitivity: .37, sttProvider: 'deepgram', silenceBeforeSessionEndSeconds: 60, silenceBeforeAutoEndTurnSeconds: 5 }
  };
  const before = structuredClone(persona), config = buildLivePersonaConfig(persona, 'canon');
  assert.deepEqual(config.voiceDetectionOptions, { ...before.voiceDetectionOptions, speechEnhancementLevel: 1, silenceBeforeSkipTurnSeconds: 0 });
  assert.deepEqual(persona, before);
  assert.equal(config.systemPrompt, 'EXACT CANON'); assert.equal(config.voiceId, 'voice');
  assert.equal(config.languageCode, 'es'); assert.equal(config.llmId, 'model');
  assert.deepEqual(config.voiceGenerationOptions, before.voiceGenerationOptions);
});

test('missing saved input settings still get server denoising without an invented endpoint delay', () => {
  const config = buildLivePersonaConfig({ avatar: { id: 'a' }, voice: { id: 'v' }, llmId: 'l' }, 'canon');
  assert.deepEqual(config.voiceDetectionOptions, { speechEnhancementLevel: 1, silenceBeforeSkipTurnSeconds: 0 });
});

test('capture supports isolation and mono without mandatory processing, gain boost or resampling', () => {
  const supported = { echoCancellation: true, noiseSuppression: true, voiceIsolation: true, autoGainControl: true, channelCount: true };
  const result = speechConstraints('bluetooth-route', supported);
  assert.deepEqual(result, { audio: { deviceId: { exact: 'bluetooth-route' }, echoCancellation: { ideal: true },
    noiseSuppression: { ideal: true }, voiceIsolation: { ideal: true }, autoGainControl: { ideal: false }, channelCount: { ideal: 1 } }, video: false });
  result.audio.autoGainControl.ideal = true;
  assert.equal(speechConstraints('', supported).audio.autoGainControl.ideal, false);
  assert.deepEqual(speechConstraints('', {}), { audio: true, video: false });
  assert.deepEqual(speechConstraints('', { echoCancellation: true }), { audio: { echoCancellation: { ideal: true } }, video: false });
});

test('actual settings distinguish disabled from unreported and exclude device identifiers', () => {
  const result = appliedSpeechSettings({ getSettings: () => ({ echoCancellation: 'remote-only', noiseSuppression: false,
    autoGainControl: false, deviceId: 'PRIVATE DEVICE', label: 'PRIVATE NAME' }) });
  assert.deepEqual(result, { echoCancellation: true, noiseSuppression: false, autoGainControl: false, voiceIsolation: null });
  assert.deepEqual(appliedSpeechSettings({ getSettings() { throw new Error('unavailable'); } }),
    { echoCancellation: null, noiseSuppression: null, autoGainControl: null, voiceIsolation: null });
});

test('diagnostics observe the stream actually attached by Anam and never claim requested filters applied', async () => {
  const listeners = new Map(), sent = [];
  const stream = settings => ({ getAudioTracks: () => [{ getSettings: () => settings }] });
  const tracker = attachConversationDiagnostics({
    client: { addListener: (event, callback) => listeners.set(event, callback), removeListener: event => listeners.delete(event) },
    events: { INPUT_AUDIO_STREAM_STARTED: 'input' }, conversationId: 'synthetic',
    stream: stream({ echoCancellation: true }), send: async body => { sent.push(...body.events); return true; }
  });
  try {
    listeners.get('input')(stream({ echoCancellation: true, noiseSuppression: true, autoGainControl: false, voiceIsolation: false, deviceId: 'SECRET' }));
    await tracker.flush();
    const events = sent.filter(event => event.kind === 'microphone');
    assert.equal(events.length, 2);
    assert.equal(events[0].data.noiseSuppression, null);
    assert.equal(events[1].data.noiseSuppression, true);
    assert.equal(events[1].data.voiceIsolation, false);
    assert.equal(events[1].data.autoGainControl, false);
    assert.equal(events[1].data.audioInputRevision, 'noise-control01');
    assert.doesNotMatch(JSON.stringify(sent), /SECRET|deviceId/);
  } finally { tracker.stop(); await tracker.flush(); }
  assert.equal(listeners.size, 0);
});
