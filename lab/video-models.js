// General-purpose video controls. Provider content policies and refusals remain unchanged.
// No safety-checker flags, prompt rewriting to avoid filters, or automatic provider fallback.
export const VIDEO_MODELS = Object.freeze({
  wan: Object.freeze({
    label: 'Wan 3.0', minSeconds: 2, maxSeconds: 30, maxImages: 10,
    modes: ['start', 'reference'], resolutions: ['480p', '720p', '1080p'],
    ratios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'alibaba/wan-3.0/image-to-video', reference: 'alibaba/wan-3.0/reference-to-video'}
  }),
  wanprime: Object.freeze({
    label: 'Wan 3.0 Prime', minSeconds: 2, maxSeconds: 30, maxImages: 10,
    modes: ['start', 'reference'], resolutions: ['480p', '720p', '1080p'],
    ratios: ['auto', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'alibaba/wan-3.0-prime/image-to-video', reference: 'alibaba/wan-3.0-prime/reference-to-video'}
  }),
  h3: Object.freeze({
    label: 'MiniMax H3', minSeconds: 4, maxSeconds: 15, maxImages: 9,
    modes: ['start', 'reference', 'text'], resolutions: ['480p', '768p', '2k'],
    ratios: ['auto', '21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'minimax/h3/image-to-video', reference: 'minimax/h3/reference-to-video', text: 'minimax/h3/text-to-video'}
  }),
  h3max: Object.freeze({
    label: 'MiniMax H3 Max', minSeconds: 5, maxSeconds: 15, maxImages: 1,
    modes: ['start', 'text'], resolutions: ['768p'],
    ratios: ['auto', '21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'minimax/h3-max/image-to-video', text: 'minimax/h3-max/text-to-video'}
  }),
  h3spicy: Object.freeze({
    label: 'MiniMax H3 Spicy', minSeconds: 3, maxSeconds: 15, maxImages: 1,
    modes: ['start'], resolutions: ['480p', '540p', '768p', '1080p'],
    ratios: ['auto'],
    endpoints: {start: 'minimax/h3-spicy/image-to-video'}
  }),
  h3maxfal: Object.freeze({
    label: 'MiniMax H3 Max Reference · FAL', minSeconds: 5, maxSeconds: 15, maxImages: 12,
    modes: ['reference'], resolutions: ['480p', '768p', '1080p'],
    ratios: ['auto', '21:9', '16:9', '4:3', '1:1', '3:4', '9:16'],
    endpoints: {reference: 'minimax/h3-max/reference-to-video'}
  }),
  omni: Object.freeze({
    label: 'Gemini Omni Flash 1.1 · FAL', minSeconds: 3, maxSeconds: 10, maxImages: 10,
    modes: ['start', 'reference', 'text'], resolutions: ['360p', '720p', '1080p', '4k'],
    ratios: ['16:9', '9:16'],
    endpoints: {
      start: 'google/gemini-omni-flash/v1.1/image-to-video',
      reference: 'google/gemini-omni-flash/v1.1/reference-to-video',
      text: 'google/gemini-omni-flash/v1.1/text-to-video'
    }
  }),
  seedance: Object.freeze({
    label: 'Seedance 2.5', minSeconds: 4, maxSeconds: 30, maxImages: 30,
    modes: ['start', 'reference', 'text'], resolutions: ['480p', '720p', '1080p'],
    ratios: ['auto', '21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'bytedance/seedance-2.5/image-to-video', reference: 'bytedance/seedance-2.5/reference-to-video', text: 'bytedance/seedance-2.5/text-to-video'}
  })
});
export function engineFor(settings = {}) {
  if (settings.engine === 'omni' || /^google\/gemini-omni-flash\/v1\.1\//.test(settings.model || '')) return 'omni';
  if (settings.engine === 'h3maxfal' || settings.model === 'minimax/h3-max/reference-to-video' && settings.provider === 'fal') return 'h3maxfal';
  if (settings.engine === 'seedance' || /^bytedance\/seedance-2\.5\//.test(settings.model || '')) return 'seedance';
  if (settings.engine === 'h3spicy' || /^minimax\/h3-spicy\//.test(settings.model || '')) return 'h3spicy';
  if (settings.engine === 'h3max' || /^minimax\/h3-max\//.test(settings.model || '')) return 'h3max';
  if (settings.engine === 'h3' || /^minimax\/h3\//.test(settings.model || '')) return 'h3';
  if (settings.engine === 'wanprime' || /^alibaba\/wan-3\.0-prime\//.test(settings.model || '')) return 'wanprime';
  return 'wan';
}
export function videoLabel(settings = {}) { return VIDEO_MODELS[engineFor(settings)].label; }
