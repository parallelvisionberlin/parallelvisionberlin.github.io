// Customer Image pricing preview for routes whose charge is derived from a
// server-side model rate instead of a vendor's bound quote. No provider calls,
// wallet mutations, jobs, reservations or payouts occur here.
import {creditsForJobUsd} from './job-pricing.mjs';
import {IMAGE_PRICES} from './image-models.mjs';
import {krea3EstimateMicros} from './krea3.mjs';
import {hongKongReferenceCount} from '../lab/hong-kong-reference-policy.js';
import {soulProEstimateMicros} from './soul-pro.mjs';
import {controlledPoseEstimateMicros} from './fal-controlled-pose.mjs';

export function quoteCustomerImageCredits(p,count,{geminiEstimateMicros}={}){
  if(!p||p.type!=='image')throw new Error('Choose an image model.');
  if(!Number.isInteger(count)||count<1||count>20)throw new Error('Choose a supported image count.');
  let estimatedMicros;
  if(p.engine==='krea3'){
    if(count>4)throw new Error('Krea 3 supports up to four images.');
    estimatedMicros=krea3EstimateMicros(p,(p.referenceRoles||[]).length+hongKongReferenceCount(p));
  }else if(p.engine==='kling'){
    if(count>4)throw new Error('This model supports up to four images.');
    estimatedMicros=IMAGE_PRICES[p.engine];
  }else if(['gemini','gemini21'].includes(p.engine)){
    if(p.engine==='gemini21'&&p.processing==='batch')throw new Error('Nano Banana 2.1 does not use Batch.');
    if(p.processing!=='batch'&&count>4)throw new Error('This model supports up to four normal images.');
    if(p.processing==='batch'&&![1,2,4,10,20].includes(count))
      throw new Error('Choose a supported batch size.');
    if(typeof geminiEstimateMicros!=='function')throw new Error('Gemini pricing unavailable.');
    estimatedMicros=geminiEstimateMicros(p);
  }else if(p.engine==='fal'&&p.mode==='controlled-pose'){
    if(count!==1)throw new Error('Controlled Pose generates one image.');
    estimatedMicros=controlledPoseEstimateMicros(p);
  }else if(p.engine==='soulpro'&&p.provider==='fal'){
    if(count!==1)throw new Error('This identity edit generates one image.');
    estimatedMicros=soulProEstimateMicros(p);
  }else{
    throw new Error('This model requires a live, bound provider quote.');
  }
  if(!Number.isSafeInteger(estimatedMicros)||estimatedMicros<=0)throw new Error('Model rate unavailable.');
  const each=creditsForJobUsd(estimatedMicros/1e6,p);
  return Object.freeze({
    kind:'server-estimate',source:'backend-model-rate',
    credits:each*count,perImageCredits:each,count,
    estimatedUsd:estimatedMicros*count/1e6,
    expiresAt:Date.now()+120000,
    notice:'Server-calculated estimate based on current model settings. The backend will independently validate and charge each submitted job. No generation or credit debit has occurred.'
  });
}
