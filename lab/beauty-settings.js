import {beautyChoiceMap} from './beauty-look-catalog.js?v=20261108-makeup2';
// Auto follows the uploaded photo's shape using the nearest supported provider aspect ratio.
export function beautyAutoRatio(sourceWidth,sourceHeight){
 const width=Number(sourceWidth),height=Number(sourceHeight);
 if(!(width>0&&height>0&&Number.isFinite(width)&&Number.isFinite(height)))return '16:9';
 const ratios=['1:1','4:3','3:4','16:9','9:16','3:2','2:3','4:5','5:4','21:9','9:21','2:1','1:2','3:1','1:3'];
 return ratios.reduce((best,ratio)=>{
  const [w,h]=ratio.split(':').map(Number),[bw,bh]=best.split(':').map(Number);
  return Math.abs(Math.log(width/height/(w/h)))<Math.abs(Math.log(width/height/(bw/bh)))?ratio:best;
 },'1:1');
}
export const BEAUTY_PROMPT_PREFIX='Beauty Studio portrait edit.';
const makeup=beautyChoiceMap('makeup');
const hair=beautyChoiceMap('hair');
const skin=beautyChoiceMap('skin');
// Light and Color only extend the existing portrait-edit prompt. Original contributes
// nothing, preserving byte-identical legacy prompts and quote validation by default.
const light=beautyChoiceMap('light');
const color=beautyChoiceMap('color');
export function beautySettings({makeup:makeupId='editorial',hair:hairId='keep',skin:skinId='natural',light:lightId='keep',color:colorId='keep',strength=50,direction='',model='seedream',resolution='1k',aspectRatio='4:5',sourceWidth=0,sourceHeight=0,filename='Your photo'}={}){
 const value=Number(strength);
 if(!Object.hasOwn(makeup,makeupId)||!Object.hasOwn(hair,hairId)||!Object.hasOwn(skin,skinId)||!Object.hasOwn(light,lightId)||!Object.hasOwn(color,colorId)||!Number.isInteger(value)||value<0||value>100)throw Error('Choose valid beauty settings.');
 if(!['seedream','seedream-pro','flash'].includes(model)||!['1k','2k'].includes(resolution)||!['4:5','1:1','3:4','9:16','auto'].includes(aspectRatio))throw Error('Choose valid image settings.');
 const extra=String(direction).trim();if(extra.length>1500)throw Error('Keep the extra direction within 1,500 characters.');
 const prompt=[BEAUTY_PROMPT_PREFIX,(colorId==='mono'&&value>0?'Edit the supplied photograph of this same person. Preserve their identity, facial structure, age, relative skin luminance, body proportions, pose and background. Apply the requested monochrome treatment without changing identity. Do not add a veil, clothing, jewellery or props unless explicitly requested.':'Edit the supplied photograph of this same person. Preserve their identity, facial structure, age, skin tone, body proportions, pose and background. Make only the requested beauty changes. Do not add a veil, clothing, jewellery or props unless explicitly requested.'),
 value===0?'Keep the original look without an intentional transformation.':[makeup[makeupId],colorId==='mono'?hair[hairId].replace(/hair colour/g,'relative hair tone').replace(/colour/g,'relative tonal value'):hair[hairId],skin[skinId],`Look intensity: ${value}/100; scale the beauty changes accordingly.`].join(' '),
 value===0?'':[light[lightId],color[colorId],lightId!=='keep'||colorId!=='keep'?`Apply the requested lighting and colour at ${value}/100 intensity. These settings do not change makeup, hairstyle, facial structure, clothing or background objects.`:''].filter(Boolean).join(' '),
 'Believable fashion photography, realistic skin and hair; no plastic smoothing or reshaped anatomy.',extra&&value>0?`Additional direction: ${extra}`:''].filter(Boolean).join('\n');
 // Resolve Auto before quoting so the provider's reference-edit fallback cannot silently force 16:9.
 const quotedAspectRatio=aspectRatio==='auto'?beautyAutoRatio(sourceWidth,sourceHeight):aspectRatio;
 return {type:'image',mode:'image',engine:model==='seedream-pro'?'seedream':model,referenceMode:'references',prompt,resolution,aspectRatio:quotedAspectRatio,outputFormat:'png',referenceRoles:[{name:String(filename).slice(0,160),role:'identity',note:'Preserve the identity and distinctive facial features of this person.'}]};
}
export function validateBeautyQuote(quote,settings,sourceId,at=Date.now()){
 if(typeof quote?.id!=='string'||!quote.id||quote.id.length>100||!Number.isSafeInteger(quote.creditCost)||quote.creditCost<1||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=at)throw Error('The server could not confirm a current credit price. Nothing was generated.');
 const returned=quote.settings;
 if(!returned||returned.type!=='image'||returned.mode!=='image'||returned.engine!==settings.engine||returned.prompt!==settings.prompt||returned.resolution!==settings.resolution||returned.aspectRatio!==settings.aspectRatio||returned.referenceSourceIds?.length!==1||returned.referenceSourceIds[0]!==sourceId)throw Error('The price did not match this photograph and these settings. Nothing was generated.');
 return quote;
}
