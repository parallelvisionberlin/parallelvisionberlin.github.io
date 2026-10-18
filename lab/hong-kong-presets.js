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

// Keep these four source files available and verified before requesting a paid
// generation. The new Greg Girard photographs are not in the repository yet;
// do NOT point at missing assets or silently use tiny screenshot thumbnails.
// Once the actual photographs are supplied with permission to host, replace
// these filenames with four curated assets per treatment.
export const HONG_KONG_REFERENCE_FILES=Object.freeze({
  original:Object.freeze(['06-interior-portrait.jpg','05-passage-diffusion.jpg','02-city-haze.jpg','03-shop-reflections.jpg']),
  'deep-green':Object.freeze(['02-city-haze.jpg','05-passage-diffusion.jpg','03-shop-reflections.jpg','06-interior-portrait.jpg']),
  'slow-shutter':Object.freeze(['01-traffic-grain.png','05-passage-diffusion.jpg','02-city-haze.jpg','03-shop-reflections.jpg'])
});

export function hongKongOpticalDirection(value){
  switch(normalizeHongKongVariation(value)){
    case 'deep-green':
      return 'DEEP GREEN / 35mm NIGHT NEGATIVE: strong but source-motivated fluorescent emerald contamination in shadows and distant air, dense organic grain, humid diffusion, darker unlit zones, retained warm tungsten pockets and scarce ruby-red practical accents. Keep skin plausibly lit, NEVER flat green paint or all-over fog. Camera feeling: handheld 50mm at f/1.8, slightly underexposed, tactile emulsion.';
    case 'slow-shutter':
      return 'SLOW SHUTTER / 35mm NIGHT NEGATIVE: handheld 35mm lens, natural 1/8-1/15-second shutter drag where there is actual movement. Real traffic, people and practical lights may smear directionally; stationary surfaces and identity-defining facial structure stay legible. Green fluorescents, warm tungsten and restrained ruby reds bleed optically with imperfect grain and halation. No ghost limbs, doubled faces, digital streak overlays or invented traffic.';
    default:
      return 'ORIGINAL / ANALOG NIGHT: observational 35mm color-negative photograph, handheld 35mm lens, plausible f/2 low-light exposure. Noticeable uneven film emulsion grain, black intervals, humid illuminated depth, restrained fluorescent teal-green shadows against existing amber tungsten and selective red practicals. Slight realistic halation and imperfect focus without muddying the main subject. No polished CGI neon or copied scenery.';
  }
}
