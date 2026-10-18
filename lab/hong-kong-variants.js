// One Hong Kong Nights Mood, three photographic recipes. No extra model calls.
// These photos guide light/optics only, never identity, pose or source location.
export const HONG_KONG_VARIANTS=Object.freeze({
  original:Object.freeze({
    label:'Original',
    direction:'ORIGINAL COLOR NEGATIVE: an intimate, imperfect 35mm night exposure. Amber and restrained ruby practicals, deep petrol/emerald shadow separation, dark unlit gaps. Human skin, hair, clothes and surrounding surfaces must share the same physically motivated light. Not a uniform green filter.',
    files:Object.freeze(['01-person-interior.jpg','02-person-street.jpg','03-red-night.jpg','04-golden-lion.jpg'])
  }),
  'deep-green':Object.freeze({
    label:'Deep Green',
    direction:'DEEP GREEN COLOR NEGATIVE: dense emerald darkness and humid optical depth lit by existing practicals, with controlled warm amber and ruby contrast. Preserve natural skin color under motivated light, distinct garment materials and deep black intervals. Never tint faces uniformly green or invent scenery.',
    files:Object.freeze(['01-person-interior.jpg','03-red-night.jpg','06-sheung-wan.jpg','05-club-gold-star.jpg'])
  }),
  'slow-shutter':Object.freeze({
    label:'Slow Shutter',
    direction:'SLOW SHUTTER 35mm: handheld 1/15–1/30-second exposure character; existing moving lights and distant reflections produce irregular directional drag, halation and creamy optical bloom. The original face, eyes, body, clothing and camera remain coherent and sharp; never duplicate people or transplant backgrounds.',
    files:Object.freeze(['02-person-street.jpg','03-red-night.jpg','04-golden-lion.jpg','05-club-gold-star.jpg'])
  })
});
export const hongKongVariant=value=>Object.hasOwn(HONG_KONG_VARIANTS,value)?value:'original';
