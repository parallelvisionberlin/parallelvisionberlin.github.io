export const BEAUTY_PROMPT_PREFIX='Beauty Studio portrait edit.';
const makeup={editorial:'Editorial makeup with a considered, photographic finish.',natural:'Subtle natural makeup.', 'soft-glam':'Soft glam makeup, softly defined eyes and restrained gloss.',bold:'Bold fashion makeup with intentional colour and definition.',keep:'Keep the original makeup.'};
const hair={keep:'Keep the original hairstyle and hair colour.',sleek:'Style the hair into a sleek finish without changing its colour.',waves:'Style the hair into soft waves without changing its colour.',wet:'Give the existing hair a wet-look finish.',updo:'Style the existing hair into an elegant updo.'};
const skin={natural:'Preserve natural skin texture, pores, freckles and distinctive marks.',dewy:'Give the skin a subtle dewy finish while preserving pores and natural texture.',matte:'Give the skin a soft matte finish while preserving pores and natural texture.',keep:'Keep the original skin finish and texture.'};
export function beautySettings({makeup:makeupId='editorial',hair:hairId='keep',skin:skinId='natural',strength=50,direction='',model='seedream',resolution='1k',aspectRatio='4:5',filename='Your photo'}={}){
 const value=Number(strength);
 if(!makeup[makeupId]||!hair[hairId]||!skin[skinId]||!Number.isInteger(value)||value<0||value>100)throw Error('Choose valid beauty settings.');
 if(!['seedream','seedream-pro','flash'].includes(model)||!['1k','2k'].includes(resolution)||!['4:5','1:1','3:4','9:16','auto'].includes(aspectRatio))throw Error('Choose valid image settings.');
 const extra=String(direction).trim();if(extra.length>1500)throw Error('Keep the extra direction within 1,500 characters.');
 const prompt=[BEAUTY_PROMPT_PREFIX,'Edit the supplied photograph of this same person. Preserve their identity, facial structure, age, skin tone, body proportions, pose and background. Make only the requested beauty changes. Do not add a veil, clothing, jewellery or props unless explicitly requested.',
 value===0?'Keep the original look without an intentional transformation.':[makeup[makeupId],hair[hairId],skin[skinId],`Look intensity: ${value}/100; scale the beauty changes accordingly.`].join(' '),
 'Believable fashion photography, realistic skin and hair; no plastic smoothing or reshaped anatomy.',extra?`Additional direction: ${extra}`:''].filter(Boolean).join('\n');
 // The Worker normalizes Auto to 16:9 for reference edits. Bind the live quote to that exact ratio.
 const quotedAspectRatio=aspectRatio==='auto'?'16:9':aspectRatio;
 return {type:'image',mode:'image',engine:model==='seedream-pro'?'seedream':model,referenceMode:'references',prompt,resolution,aspectRatio:quotedAspectRatio,outputFormat:'png',referenceRoles:[{name:String(filename).slice(0,160),role:'identity',note:'Preserve the identity and distinctive facial features of this person.'}]};
}
export function validateBeautyQuote(quote,settings,sourceId,at=Date.now()){
 if(typeof quote?.id!=='string'||!quote.id||quote.id.length>100||!Number.isSafeInteger(quote.creditCost)||quote.creditCost<1||!Number.isFinite(quote.expiresAt)||quote.expiresAt<=at)throw Error('The server could not confirm a current credit price. Nothing was generated.');
 const returned=quote.settings;
 if(!returned||returned.type!=='image'||returned.mode!=='image'||returned.engine!==settings.engine||returned.prompt!==settings.prompt||returned.resolution!==settings.resolution||returned.aspectRatio!==settings.aspectRatio||returned.referenceSourceIds?.length!==1||returned.referenceSourceIds[0]!==sourceId)throw Error('The price did not match this photograph and these settings. Nothing was generated.');
 return quote;
}
