// Hong Kong Nights preserves its three optional photographic look choices.
// Existing source photographs remain available for previews and saved History.\n// New image generations do not auto-attach them to the model.
export const HONG_KONG_VARIANTS=Object.freeze({
  original:Object.freeze({
    label:'Nocturne',
    direction:'',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['greg-iii.png','plaza-grill.webp','young-woman-tram.webp','greg-reds.png'])
  }),
  'deep-green':Object.freeze({
    label:'Deep Green',
    direction:'Deep Green: emerald ONLY in the existing background shadows, never on the face. Keep warm skin, clear texture, original street and no invented neon.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['greg22.png','supervalu.jpg','silver-grill-cafe.jpg','plaza-grill.webp'])
  }),
  'slow-shutter':Object.freeze({
    label:'Slow Shutter',
    direction:'Slow Shutter: drag ONLY on existing distant moving lights. If there are no moving practical lights, keep the scene clean; never blur the person or change location.',
    filmFinish:Object.freeze({version:2,grain:0,haze:0,halation:0,film:0}),
    files:Object.freeze(['sheung-wan-street.webp','greg-iii.png','young-woman-tram.webp','silver-grill-cafe.jpg'])
  })
});
export const hongKongVariant=value=>Object.hasOwn(HONG_KONG_VARIANTS,value)?value:'original';
