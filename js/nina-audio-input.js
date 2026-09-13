// Shared capture policy. These are preferences, never device requirements.
export const NINA_AUDIO_INPUT_REVISION = 'noise-control01';
export function speechConstraints(deviceId = '', supported = {}) {
  const audio = {};
  if (deviceId) audio.deviceId = { exact: deviceId };
  for (const key of ['echoCancellation', 'noiseSuppression', 'voiceIsolation']) {
    if (supported[key]) audio[key] = { ideal: true };
  }
  // Avoid raising the ambient noise floor during pauses. No software gain boost.
  if (supported.autoGainControl) audio.autoGainControl = { ideal: false };
  if (supported.channelCount) audio.channelCount = { ideal: 1 };
  // Keep the route's sample rate, including Bluetooth headsets.
  return { audio: Object.keys(audio).length ? audio : true, video: false };
}

export function appliedSpeechSettings(track) {
  let settings = {};
  try { settings = track?.getSettings?.() || {}; } catch { /* Unreported stays unknown. */ }
  return Object.fromEntries(['echoCancellation', 'noiseSuppression', 'autoGainControl', 'voiceIsolation'].map(key => {
    const value = settings[key];
    if (key === 'echoCancellation' && ['all', 'remote-only'].includes(value)) return [key, true];
    return [key, typeof value === 'boolean' ? value : null];
  }));
}
