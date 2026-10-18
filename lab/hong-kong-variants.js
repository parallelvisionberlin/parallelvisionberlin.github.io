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
    direction:'Deep Green variation: slightly richer emerald atmospheric shadows and deeper film blacks, retaining natural skin, the same subject and the same scene.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['greg22.png','supervalu.jpg','silver-grill-cafe.jpg','plaza-grill.webp'])
  }),
  'slow-shutter':Object.freeze({
    label:'Slow Shutter',
    direction:'Slow Shutter variation: gentle motion trails only in existing distant moving lights and practical reflections; preserve the person, eyes, clothing, scene and framing.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['sheung-wan-street.webp','greg-iii.png','young-woman-tram.webp','silver-grill-cafe.jpg'])
  })
});
export const hongKongVariant=value=>Object.hasOwn(HONG_KONG_VARIANTS,value)?value:'original';
