// Customer Image pricing preview for routes whose charge is derived from a
// server-side model rate instead of a vendor's bound quote. No provider calls,
// wallet mutations, jobs, reservations or payouts occur here.
import {creditsForUsd} from './customer-billing.mjs';
import {IMAGE_PRICES} from './image-models.mjs';
import {soulProEstimateMicros} from './soul-pro.mjs';
import {controlledPoseEstimateMicros} from './fal-controlled-pose.mjs';

export function quoteCustomerImageCredits(p,count,{geminiEstimateMicros}={}){
  if(!p||p.type!=='image')throw new Error('Choose an image model.');
  if(!Number.isInteger(count)||count<1||count>20)throw new Error('Choose a supported image count.');
  let estimatedMicros;
  if(['flash','kling'].includes(p.engine)){
    if(count>4)throw new Error('This model supports up to four images.');
    estimatedMicros=IMAGE_PRICES[p.engine];
  }else if(p.engine==='gemini'){
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
  const each=creditsForUsd(estimatedMicros/1e6);
  return Object.freeze({
    kind:'server-estimate',source:'backend-model-rate',
    credits:each*count,perImageCredits:each,count,
    estimatedUsd:estimatedMicros*count/1e6,
    expiresAt:Date.now()+120000,
    notice:'Server-calculated estimate based on current model settings. The backend will independently validate and charge each submitted job. No generation or credit debit has occurred.'
  });
}
