// Shared browser/Worker recipe. No provider calls or native Soul style IDs.
export const SOUL_NIGHT_FLASH_ID='night-flash';
export const SOUL_NIGHT_FLASH_LIMIT=3500;

export function soulNightFlashQuoteMatches(expected={},actual={}){
  if(expected.moodId!=='night-flash'&&actual.moodId!=='night-flash')return true;
  return expected.moodId===actual.moodId&&expected.moodIntensity===actual.moodIntensity&&expected.moodOriginalPrompt===actual.moodOriginalPrompt;
}

export function prepareSoulNightFlash(input='',amount=60,{hasBase=false}={}){
  const original=String(input||'').trim();
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||60)));
  const strength=intensity<35
    ?'Subtle direct flash, gently lowered ambient exposure and fine visible film grain.'
    :intensity<70
      ?'Clear frontal flash with crisp shadows, dark ambient exposure and tactile negative-film grain.'
      :'Bold bare on-camera flash, brilliant controlled highlights, rapid falloff into deep readable blacks and pronounced organic film texture.';
  const prompt=[
    original,
    'PV LAB MOOD / Night Flash / '+intensity+'%',
    'Authentic after-dark paparazzi fashion photograph. '+strength,
    'Flash freezes the subject with physically credible directional shadows and specular highlights on real skin, hair, leather, metal and glass. Retain selective practical lights and reflective detail in the darkness. Spontaneous early-2000s street-arrival energy, imperfect documentary 35mm framing, integrated color-negative grain, restrained source-bound halation, natural pores and tactile fabric. No plastic skin, pasted lighting filter, fake grain overlay or invented neon.',
    hasBase
      ?'The base photograph controls person count, body proportions, expression, hair, exact outfit and skin coverage, pose, viewing direction, camera distance, perspective, framing, crop and scene geometry. Preserve its facial identity unless a trained Soul ID is explicitly selected; then use that identity. Relight the existing subject and environment coherently into night flash. Do not invent a new outfit, location, vehicle, rain or extra person.'
      :'Photograph the subject and setting described by the user. Use the selected trained Soul ID when supplied. Do not copy a preview model or invent an unrelated subject.',
    'Explicit user-authored changes take priority. Intensity controls photographic treatment, not identity, anatomy or wardrobe.'
  ].filter(Boolean).join('\n');
  const over=prompt.length-SOUL_NIGHT_FLASH_LIMIT;
  return {prompt,metadata:{moodId:SOUL_NIGHT_FLASH_ID,moodIntensity:intensity,moodOriginalPrompt:original},
    error:!hasBase&&!original?'Describe a subject or add a base photograph before using Night Flash with Soul.':over>0?'Direction and Night Flash exceed 3,500 characters by '+over+'. Shorten your direction.':''};
}
