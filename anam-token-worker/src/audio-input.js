// Anam filters incoming audio before speech recognition / turn detection.
// https://anam.ai/docs/personas/session/voice-detection
export const AUDIO_INPUT_REVISION = 'noise-control01';
export const AUDIO_INPUT_OPTIONS = Object.freeze({
  speechEnhancementLevel: 1,
  silenceBeforeSkipTurnSeconds: 0,
});

export function applyAudioInputPolicy(config) {
  config.voiceDetectionOptions = { ...config.voiceDetectionOptions, ...AUDIO_INPUT_OPTIONS };
  // endOfSpeechSensitivity controls when to answer, not noise/barge-in rejection.
  // Preserve that setting and STT provider/language instead of adding a pause.
  return config;
}

export function audioInputDiagnostics(config) {
  const options = config.voiceDetectionOptions || {};
  return {
    revision: AUDIO_INPUT_REVISION,
    speechEnhancementLevel: options.speechEnhancementLevel,
    silenceBeforeSkipTurnSeconds: options.silenceBeforeSkipTurnSeconds,
  };
}
