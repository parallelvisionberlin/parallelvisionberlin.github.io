// Owner-only Soul experiment. The cover is never a generation input.
export const WON_KAR_NIGHT=Object.freeze({
  id:'won-kar-night',name:'Won Kar Night',category:'Cinema',ownerOnly:true,
  preview:'/lab/mood-previews/won-kar-night.png',
  description:'Emerald night, fleeting motion and intimate 35mm cinema. PV Soul owner test.',
  defaultIntensity:75
});
export function prepareWonKarNight(input='',amount=75,{hasBase=false}={}){
  const original=String(input||'').trim();
  const intensity=Math.max(1,Math.min(100,Math.round(Number(amount)||75)));
  const treatment=intensity<35
    ?'Subtle petrol-green ambient depth, restrained warm practical highlights, fine organic grain and a trace of source-bound shutter movement.'
    :intensity<70
      ?'Distinct emerald-green nighttime ambience, deep readable blacks, warm natural skin, luminous amber practicals, tactile 35mm grain and gentle moving-light trails.'
      :'Immersive dark emerald night, intimate warm skin against petrol-black shadows, elongated source-bound practical-light trails, imperfect slow-shutter exposure and rich organic 35mm negative texture. Keep the person legible.';
  const prompt=[original,'PV LAB MOOD / Won Kar Night / '+intensity+'%',
    'One believable late-1990s nocturnal cinema photograph: fleeting intimacy, motion and quiet longing. '+treatment,
    'Photographic fluorescent-green ambient light and occasional existing amber/red practicals, never a uniform green skin filter. Real optical halation around motivated lights, imperfect film microcontrast and integrated emulsion grain. Natural pores, tactile clothing, truthful faces and coherent anatomy. No plastic skin, cyberpunk neon, graphic streaks or pasted noise.',
    hasBase
      ?'The Base controls the people, facial identity, hair, body proportions, exact outfit and skin coverage, pose, gaze, camera, crop and scene geometry. Preserve identity unless a trained Soul ID is explicitly selected; then use that identity. Re-expose the existing moment into cinematic night. Preserve contact with seats, objects and other people. The cover supplies atmosphere only; do not copy its people, embrace, cigarette, road or vehicle.'
      :'Photograph the subject and setting described by the user, using the selected trained Soul ID when supplied. The cover is not a subject reference. Do not silently invent a couple, cigarette, road or vehicle.',
    'Explicit user-authored changes take priority. Intensity changes light, exposure, motion and film response, not identity, anatomy, wardrobe or person count.'
  ].filter(Boolean).join('\n');
  return {prompt,metadata:{moodId:WON_KAR_NIGHT.id,moodIntensity:intensity,moodOriginalPrompt:original},
    error:!hasBase&&!original?'Describe a subject or add a Base photograph before using Won Kar Night.':prompt.length>3500?'Direction and Won Kar Night exceed 3,500 characters. Shorten your direction.':''};
}
