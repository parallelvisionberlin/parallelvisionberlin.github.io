// PV LAB pricing policy, only the server controls customer prices.
// The provider's bound *maximum* quote is always charged/reserved before a job.
// Existing jobs and subscriptions keep their original immutable ledger entries.
import {NANO21_CREDITS,isNano21Job} from './nano-banana-21.mjs';
export const DEFAULT_CREDITS_PER_USD=460;
export const SOUL_ID_TRAINING_CREDITS=400;
export const TRANSFORM_FIXED_RETAIL_VERSION='source-seconds-v1';
// Retail price is charged once for the SOURCE VIDEO, rounded up to full seconds.
// SpicyAPI can separately preauthorize 30s against the owner's provider balance.
// This route is set by the Worker after verifying private MP4 timing, never by
// the client. A mismatch falls back to the existing debit and quote parity guard.
export function isFixedTransformRetail(settings={}){
  return settings.type==='video'&&settings.provider==='spicy'&&
    settings.engine==='seedance'&&settings.mode==='transform'&&
    settings.model==='bytedance/seedance-2.5/video-edit'&&
    settings.transformFixedChargeVersion===TRANSFORM_FIXED_RETAIL_VERSION&&
    Number.isInteger(settings.transformBillableSeconds)&&
    settings.transformBillableSeconds>=4&&settings.transformBillableSeconds<=30;
}

export const MODEL_CREDITS_PER_USD=Object.freeze({
  seedance15:320,
  seedance15Silent720:300,
  seedance:160,
  seedance4k:190,
  wan1080:388
});
const VIDEO_ROUTES=Object.freeze({
  seedance15:/^bytedance\/seedance-1\.5-pro\/(image-to-video|text-to-video)$/,
  seedance:/^bytedance\/seedance-2\.5\/(image-to-video|reference-to-video|text-to-video|video-extend|video-edit)$/,
  seedance4k:/^bytedance\/seedance-2\.5-spicy\/image-to-video$/,
  wan:/^alibaba\/wan-3\.0\/(image-to-video|reference-to-video)$/
});
export function creditsPerUsdForJob(settings={}){
  // Valid model/engine pair, not an untrusted label or a browser-supplied rate.
  if(settings.type==='video'&&settings.provider!=='fal'&&settings.provider!=='higgsfield'){
    const engine=settings.engine,model=String(settings.model||'');
    if(engine==='seedance15'&&VIDEO_ROUTES.seedance15.test(model)&&settings.resolution==='720p'&&settings.audio===false)
      return MODEL_CREDITS_PER_USD.seedance15Silent720;
    if(engine==='wan'&&VIDEO_ROUTES.wan.test(model)&&settings.resolution==='1080p')
      return MODEL_CREDITS_PER_USD.wan1080;
    if(Object.hasOwn(MODEL_CREDITS_PER_USD,engine)&&Object.hasOwn(VIDEO_ROUTES,engine)&&VIDEO_ROUTES[engine].test(model))
      return MODEL_CREDITS_PER_USD[engine];
  }
  return DEFAULT_CREDITS_PER_USD;
}
// Store, reserve and settle provider estimates in integer USD micros. The
// browser price and the D1 trigger use the same exact micros, including on
// rounding boundaries. No exchange-rate or package-price assumptions here.
export function creditsForJobMicros(micros,settings={}){
  if(!Number.isSafeInteger(micros)||micros<0)throw Error('Invalid provider quote.');
  // Match the long-standing D1 Soul ID training fixed-price exception.
  if(settings.provider==='higgsfield'&&settings.mode==='soul-id-training'&&settings.model==='soul-id')
    return SOUL_ID_TRAINING_CREDITS;
  // Exact-model Premium Upscale retail prices; client labels cannot select a price.
  if(settings.type==='image'&&settings.provider==='fal'&&settings.mode==='upscale'&&settings.upscaleEngine==='seedvr2'&&settings.model==='fal-ai/seedvr/upscale/image'&&(settings.scale===2||settings.scale===4))return settings.scale===2?10:18;
  // Fixed introductory price for exact Google Nano Banana 2.1 routes only.
  if(isNano21Job(settings))return NANO21_CREDITS[settings.resolution];
  // Exact bounded Transform quote remains the 30s provider hold, but PV LAB
  // charges the customer only the source duration. Integer micro-USD parity with
  // migration 0064 prevents floating point drift and rejects forged quotes.
  if(isFixedTransformRetail(settings))return Math.max(7,
    Math.ceil(micros*settings.transformBillableSeconds*160/30000000));
  // All customer job quote amounts round upward. Minimum applies to all models.
  const calculated=Math.max(7,Math.ceil(micros*creditsPerUsdForJob(settings)/1000000));
  // A real, non-fixed SpicyAPI image generation has one clear five-credit retail increment.
  // This must match the LAB_DB lab_charge_job trigger in migration 0021.
  // Existing quote ledgers remain immutable; do not round videos, upscales or fixed-price Nano.
  return settings.type==='image'&&settings.provider==='spicy'&&settings.mode==='image'
    ?Math.ceil(calculated/5)*5:calculated;
}

// Compatibility entrypoint for callers holding a USD decimal. Once converted,
// price calculation is integer micros, matching the persisted D1 estimate.
export function creditsForJobUsd(usd,settings={}){
  if(!Number.isFinite(usd)||usd<0||!Number.isSafeInteger(Math.round(usd*1000000)))
    throw Error('Invalid provider quote.');
  return creditsForJobMicros(Math.round(usd*1000000),settings);
}
