// User-supplied Pastel Dream photographic collection (18 November 2026).
// First frame is already archived in the Mood bank (byte-identical original).
// Other three original photographs are stored on the same CloudFront image
// host already used for curated PV LAB art. Never treat depicted people as Base.
const refs=[
  {
    name:'01-window-blossoms',
    url:new URL('./mood-bank/2026-10-11/soft-pastel-film/originals/soft-paste-1-.png',import.meta.url).href,
    note:'COLOR AND OPTICS ONLY: spring daylight through a window, pale blush highlights, creamy film color, gentle bloom and natural skin. Do not copy the reference woman, bedroom, pose, outfit or face.'
  },
  {
    name:'02-camera-blossoms',
    url:'https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/1e8a75e2-d7de-4370-891c-9b7224336a2e.png',
    note:'FILM AND LIGHT ONLY: delicate warm backlight, textured pink blossoms, airy ambient depth and believable grain. Never copy the model, camera, flower arrangement, exact scene or facial features.'
  },
  {
    name:'03-car-spring-light',
    url:'https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/2435ea6e-aa2d-4852-9be6-6b3128f1c48f.png',
    note:'PHOTOGRAPHIC FINISH ONLY: pastel window spill, graceful highlight rolloff, warm pink-blue balance, honest soft portrait texture. Never copy the car, model, blonde hair, lingerie, pose or identity.'
  },
  {
    name:'04-floral-portrait',
    url:'https://d2ol7oe51mr4n9.cloudfront.net/user_36QWljeNVgnwNMkZtgtVQjVUBoW/db3554d2-32c9-4781-8e3a-b92ecdf076d5.png',
    note:'PORTRAIT OPTICS ONLY: delicate spring color, fine facial texture, soft backlit blonde highlights and tactile film softness. Do not copy the person, hairstyle, blouse, facial features, framing or cherry blossoms.'
  }
];
export const PASTEL_DREAM_PHOTOS=Object.freeze(refs.map(ref=>Object.freeze({...ref})));
export const PASTEL_DREAM_CARD_COVER='./mood-bank/2026-10-11/soft-pastel-film/preview.webp';
export const PASTEL_DREAM_CARD_HOVER=PASTEL_DREAM_PHOTOS[2].url;
