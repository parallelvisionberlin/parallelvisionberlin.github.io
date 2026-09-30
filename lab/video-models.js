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
  seedance: Object.freeze({
    label: 'Seedance 2.5', minSeconds: 4, maxSeconds: 30, maxImages: 30,
    modes: ['start', 'reference', 'text'], resolutions: ['480p', '720p', '1080p'],
    ratios: ['auto', '21:9', '16:9', '9:16', '1:1', '4:3', '3:4'],
    endpoints: {start: 'bytedance/seedance-2.5/image-to-video', reference: 'bytedance/seedance-2.5/reference-to-video', text: 'bytedance/seedance-2.5/text-to-video'}
  })
});
export function engineFor(settings = {}) {
  if (settings.engine === 'seedance' || /^bytedance\/seedance-2\.5\//.test(settings.model || '')) return 'seedance';
  if (settings.engine === 'wanprime' || /^alibaba\/wan-3\.0-prime\//.test(settings.model || '')) return 'wanprime';
  return 'wan';
}
export function videoLabel(settings = {}) { return VIDEO_MODELS[engineFor(settings)].label; }
