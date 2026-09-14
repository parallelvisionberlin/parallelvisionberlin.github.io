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

// Retry stale device selections or unsupported processing once with system defaults.
export async function openSpeechMicrophone(mediaDevices, deviceId = '', isCurrent = () => true) {
  if (!mediaDevices?.getUserMedia) throw Object.assign(new Error('Microphone unavailable'), { name: 'NotSupportedError' });
  try {
    return await mediaDevices.getUserMedia(speechConstraints(deviceId, mediaDevices.getSupportedConstraints?.() || {}));
  } catch (error) {
    if (!isCurrent() || !['NotFoundError', 'OverconstrainedError'].includes(error?.name)) throw error;
    return await mediaDevices.getUserMedia({ audio: true, video: false });
  }
}

export function microphoneFailure(error) {
  switch (error?.name) {
    case 'NotAllowedError': case 'SecurityError':
      return 'Microphone permission blocked. Allow microphone access for this site in your browser and system settings.';
    case 'NotFoundError':
      return 'No microphone detected. Connect a microphone, then try again.';
    case 'NotReadableError': case 'TrackStartError':
      return 'Cannot open the microphone. Close other apps using it or select another microphone, then try again.';
    case 'OverconstrainedError':
      return 'This microphone could not start. Select another microphone, then try again.';
    case 'NotSupportedError':
      return 'Microphone capture is unavailable in this browser. Open this page in Chrome or Safari.';
    default:
      return 'The microphone could not start. Check its connection or select another microphone, then try again.';
  }
}
