// One Hong Kong Nights Mood, three photographic recipes. No extra model calls.
// These photos guide light/optics only, never identity, pose or source location.
export const HONG_KONG_VARIANTS=Object.freeze({
  original:Object.freeze({
    label:'Original',
    direction:'ORIGINAL COLOR NEGATIVE: handheld 35mm at f/2, pushed grain and real light halation; intimate imperfect night exposure. Amber and restrained ruby practicals, deep petrol/emerald shadow separation, dark unlit gaps. Human skin, hair, clothes and surrounding surfaces must share the same physically motivated light. Not a uniform green filter.',
    filmFinish:Object.freeze({version:2,grain:58,haze:78,halation:80,film:90}),
    files:Object.freeze(['greg-iii.png','plaza-grill.webp','young-woman-tram.webp','greg-reds.png'])
  }),
  'deep-green':Object.freeze({
    label:'Deep Green',
    direction:'DEEP GREEN COLOR NEGATIVE: handheld 50mm at f/1.8, grain and real halation; dense emerald darkness and humid optical depth lit by existing practicals, with controlled warm amber and ruby contrast. Preserve natural skin color under motivated light, distinct garment materials and deep black intervals. Never tint faces uniformly green or invent scenery.',
    filmFinish:Object.freeze({version:2,grain:78,haze:86,halation:81,film:93}),
    files:Object.freeze(['greg22.png','supervalu.jpg','silver-grill-cafe.jpg','plaza-grill.webp'])
  }),
  'slow-shutter':Object.freeze({
    label:'Slow Shutter',
    direction:'SLOW SHUTTER 35mm: handheld 35mm lens, 1/8–1/15-second exposure character; existing moving lights and distant reflections produce irregular directional drag, halation and creamy optical bloom. The original face, eyes, body, clothing and camera remain coherent and sharp; never duplicate people or transplant backgrounds.',
    filmFinish:Object.freeze({version:2,grain:68,haze:79,halation:89,film:94}),
    files:Object.freeze(['sheung-wan-street.webp','greg-iii.png','young-woman-tram.webp','silver-grill-cafe.jpg'])
  })
});
export const hongKongVariant=value=>Object.hasOwn(HONG_KONG_VARIANTS,value)?value:'original';
