// One Hong Kong Nights Mood, three photographic treatments.
// Each option changes optics and color, never the customer's identity or scene.
export const HONG_KONG_VARIATIONS=Object.freeze([
  Object.freeze({id:'original',label:'Original',hint:'Balanced analog night · teal, tungsten and red'}),
  Object.freeze({id:'deep-green',label:'Deep Green',hint:'Fluorescent green · grainier, denser and darker'}),
  Object.freeze({id:'slow-shutter',label:'Slow Shutter',hint:'Handheld drag · natural motion and luminous trails'})
]);
export const normalizeHongKongVariation=value=>
  HONG_KONG_VARIATIONS.some(option=>option.id===value)?value:'original';

const FINISH_PRESETS=Object.freeze({
  original:Object.freeze({version:2,grain:58,haze:78,halation:80,film:90}),
  'deep-green':Object.freeze({version:2,grain:78,haze:86,halation:81,film:93}),
  'slow-shutter':Object.freeze({version:2,grain:68,haze:79,halation:89,film:94})
});
export const hongKongFinishPreset=value=>({...FINISH_PRESETS[normalizeHongKongVariation(value)]});

// Verified against SHA-256 checksums of the eight photographs the owner
// supplied. Each variant uses exactly four actual photographs so six customer
// reference slots remain free. These images are photographic STYLE ONLY.
// Never borrow signage, architecture, people, wardrobe or a scene by default.
export const HONG_KONG_REFERENCE_FILES=Object.freeze({
  original:Object.freeze(['greg-iii.png','plaza-grill.webp','young-woman-tram.webp','greg-reds.png']),
  'deep-green':Object.freeze(['greg22.png','supervalu.jpg','silver-grill-cafe.jpg','plaza-grill.webp']),
  'slow-shutter':Object.freeze(['sheung-wan-street.webp','greg-iii.png','young-woman-tram.webp','silver-grill-cafe.jpg'])
});

export function hongKongOpticalDirection(value,{lite=false}={}){
  if(lite){
    switch(normalizeHongKongVariation(value)){
      case 'deep-green':return 'DEEP GREEN: stronger source-lit fluorescent green shadow and haze, heavier organic grain, warm tungsten pockets and selective ruby reds. Natural skin, no painted green overlay.';
      case 'slow-shutter':return 'SLOW SHUTTER: real handheld 1/8-1/15s motion drag on existing moving light only, analog grain, source-lit green and red practicals; keep faces and stationary geometry legible.';
      default:return 'ORIGINAL: tactile analog 35mm night photography, uneven grain, motivated green fluorescent shade, real tungsten and selective red, humid lit depth and natural skin.';
    }
  }
  switch(normalizeHongKongVariation(value)){
    case 'deep-green':
      return 'DEEP GREEN / 35mm NIGHT NEGATIVE: strong but source-motivated fluorescent emerald contamination in shadows and distant air, dense organic grain, humid diffusion, darker unlit zones, retained warm tungsten pockets and scarce ruby-red practical accents. Keep skin plausibly lit, NEVER flat green paint or all-over fog. Camera feeling: handheld 50mm at f/1.8, slightly underexposed, tactile emulsion.';
    case 'slow-shutter':
      return 'SLOW SHUTTER / 35mm NIGHT NEGATIVE: handheld 35mm lens, natural 1/8-1/15-second shutter drag where there is actual movement. Real traffic, people and practical lights may smear directionally; stationary surfaces and identity-defining facial structure stay legible. Green fluorescents, warm tungsten and restrained ruby reds bleed optically with imperfect grain and halation. No ghost limbs, doubled faces, digital streak overlays or invented traffic.';
    default:
      return 'ORIGINAL / ANALOG NIGHT: observational 35mm color-negative photograph, handheld 35mm lens, plausible f/2 low-light exposure. Noticeable uneven film emulsion grain, black intervals, humid illuminated depth, restrained fluorescent teal-green shadows against existing amber tungsten and selective red practicals. Slight realistic halation and imperfect focus without muddying the main subject. No polished CGI neon or copied scenery.';
  }
}
