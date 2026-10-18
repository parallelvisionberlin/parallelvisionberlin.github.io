// Hong Kong Nights preserves its three optional photographic look choices.
// Existing source photographs remain available for previews and saved History.\n// New image generations do not auto-attach them to the model.
export const HONG_KONG_VARIANTS=Object.freeze({
  original:Object.freeze({
    label:'Original',
    direction:'',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['greg-iii.png','plaza-grill.webp','young-woman-tram.webp','greg-reds.png'])
  }),
  'deep-green':Object.freeze({
    label:'Deep Green',
    direction:'Deep Green variation: a restrained jade/emerald shift ONLY in the existing background shadows. Keep original naturally lit face, warm healthy skin, crisp eyes, rich material texture and visible shadow detail. Never coat the person, walls or whole photograph green, and never invent neon, signs or a different street.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['greg22.png','supervalu.jpg','silver-grill-cafe.jpg','plaza-grill.webp'])
  }),
  'slow-shutter':Object.freeze({
    label:'Slow Shutter',
    direction:'Slow Shutter variation: very soft optical bloom and directional light drag only where the original photo already contains moving lights or bright reflections. If there are no moving practical lights, preserve the clean scene with subtle lens diffusion; never invent lights, smear the person or transplant the background.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['sheung-wan-street.webp','greg-iii.png','young-woman-tram.webp','silver-grill-cafe.jpg'])
  })
});
export const hongKongVariant=value=>Object.hasOwn(HONG_KONG_VARIANTS,value)?value:'original';
