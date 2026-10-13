// PV LAB pricing policy, only the server controls customer prices.
// The provider's bound *maximum* quote is always charged/reserved before a job.
// Existing jobs and subscriptions keep their original immutable ledger entries.
export const DEFAULT_CREDITS_PER_USD=460;
export const MODEL_CREDITS_PER_USD=Object.freeze({
  seedance15:320,
  seedance:230,
  seedance4k:190
});
const VIDEO_ROUTES=Object.freeze({
  seedance15:/^bytedance\/seedance-1\.5-pro\/(image-to-video|text-to-video)$/,
  seedance:/^bytedance\/seedance-2\.5\/(image-to-video|reference-to-video|text-to-video|video-extend)$/,
  seedance4k:/^bytedance\/seedance-2\.5-spicy\/image-to-video$/
});
export function creditsPerUsdForJob(settings={}){
  // Valid model/engine pair, not an untrusted label or a browser-supplied rate.
  if(settings.type==='video'&&settings.provider!=='fal'&&settings.provider!=='higgsfield'){
    const engine=settings.engine,model=String(settings.model||'');
    if(Object.hasOwn(VIDEO_ROUTES,engine)&&VIDEO_ROUTES[engine].test(model))
      return MODEL_CREDITS_PER_USD[engine];
  }
  return DEFAULT_CREDITS_PER_USD;
}
export function creditsForJobUsd(usd,settings={}){
  if(!Number.isFinite(usd)||usd<0)throw Error('Invalid provider quote.');
  // All customer job quote amounts round upward. Minimum applies to all models.
  return Math.max(7,Math.ceil(Math.round(usd*1000000)*creditsPerUsdForJob(settings)/1000000));
}
