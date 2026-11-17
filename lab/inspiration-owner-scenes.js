// Owner-approved 2026-11-17 Inspiration photography. Visual examples only.
// Keep customer Base images, Mood/engine choices, pricing and generation separate.
const root='./visuals/inspiration-sets/';
const card=(series,filename)=>root+series+'/cards/'+filename+'.webp';
const identity=' If a user supplies a Base person or photograph, preserve their identity, age, anatomy, proportions, outfit and location unless that user explicitly requests a change. All depicted people are adults. These examples are never uploaded as hidden references. No text or logos unless requested.';
const frame=(series,filename,direction)=>Object.freeze({
  cover:card(series,filename),
  prompt:direction+identity
});
export const OWNER_ORIGINAL_HOVER_FRAMES=Object.freeze({
  'dream-blur':card('dream-blur','01-blue-afterimage'),
  'fashion-editorial':card('flash-leather','02-velvet-leather'),
  'chrome-couture':card('chrome-couture','04-silver-sculpture'),
  'hong-kong-nights':card('hong-kong-nights','12-rain-window-profile')
});
const eros=Object.freeze([
  frame('eros','05-lingerie-editorial',
    '1970s–1990s European lingerie editorial on real 35mm color-negative film. An adult woman in delicately constructed black lace and tactile satin, with honest skin texture, warm sepia flash and lived-in interiors. Close asymmetric composition, unscripted sensuality, shallow falloff, a fashion campaign rather than a glossy boudoir advertisement. No graphics, lettering or brand marks in the generated image.')
]);
const hotel=Object.freeze([
  frame('hotel-intimacy','07-velvet-sofa',
    'Intimate European hotel-room editorial. An adult woman in carefully fitted black lace lingerie, sheer stockings and long black evening gloves sits sideways on a worn olive-gold vintage sofa. Slightly off-center frontal 35mm camera flash, pale weathered plaster, quiet disheveled mood, textured skin and believable garment seams. Understated, unresolved morning-after narrative.'),
  frame('hotel-intimacy','08-sitting-after-hours',
    'An intimate after-hours fashion photograph: an adult woman in simple opaque black lingerie and long dark gloves rests on a vintage patterned sofa, legs naturally folded, gaze drifting out of frame. Warm aged upholstery, a quiet European apartment, blunt direct flash and natural negative-film color, believable anatomy and textile behavior.'),
  frame('hotel-intimacy','09-silk-sheets',
    'A candid close fashion portrait of an adult woman in fine black lace and dark stockings against rumpled cream silk bedding in an old hotel room. Raw early-2000s point-and-shoot flash, asymmetrical crop, tiny physical fabric details, honest skin and a thoughtful expression, cinematic intimacy without plastic beauty smoothing.')
]);
const postHuman=Object.freeze([
  frame('post-human','17-synthetic-lovers-wide',
    'Post-human cinema on a real, physically built futuristic set: two adult synthetic humanoids in brushed, worn chrome stand close together in a dim rain-soaked research chamber. Pale rectangular overhead light, isolated red practicals, pooled water, hard metal reflections, atmospheric grain and emotional stillness. Wide restrained 35mm science-fiction film composition.'),
  frame('post-human','18-synthetic-lovers-close',
    'A close observational post-human film frame: two adult chrome synthetic beings facing each other, almost touching, in a dark abandoned industrial research space. Cold light against low ruby practical lamps, real brushed metal and tiny scratches, rain and soft optical diffusion, no glowing CGI fantasy or generic holograms.'),
  frame('post-human','19-synthetic-lovers-film-burn',
    'Two adult post-human bodies of distinct design lean together amid the aged technological ruins of a once-inhabited city. A luminous vertical film burn divides a grainy wide frame, dim red practical light reflects on scratched physical chrome, smoky air and complex emotional ambiguity.'),
  frame('post-human','16-transmission-interface',
    'An adult feminine chrome android in quiet side profile examining a wall of obsolete physical switches, monitors and transmission panels in an abandoned research complex. Long shadows, analog video screens, realistic machine construction and imperfect reflective surfaces. Restrained post-human industrial archaeology on 35mm film.')
]);
const desert=Object.freeze([
  frame('desert-sculptures','20-sculpture-desert-editorial',
    'Monumental desert fashion photograph in the late afternoon: an adult woman in oversized architectural black couture stands beside a weathered folded steel sculpture among pale sandstone mountains. Hard pale sunlight, actual wind and dust, physically credible fabric weight, visible oxidized metal, broad negative space and slightly faded 35mm film texture.')
]);
const extensions=Object.freeze({
  'eros-lingerie':eros,
  'hotel-intimacy':hotel,
  'post-human':postHuman,
  'desert-sculptures':desert
});
export function withOwnerInspirationFrames(scene){
  const added=extensions[scene.id];
  if(!added)return scene;
  const original=Object.freeze({cover:scene.cover,prompt:scene.prompt});
  // Preserve the previously approved EROS/Desert primary frame. Hotel and
  // Post-Human lead with the owner's new unified sets, but retain the old frame.
  const examples=Object.freeze(
    scene.id==='eros-lingerie'||scene.id==='desert-sculptures'?
      [original,...added]:[...added,original]
  );
  return Object.freeze({...scene,cover:examples[0].cover,prompt:examples[0].prompt,examples});
}
const raverFrames=Object.freeze([
  frame('raver','10-chrome-dj-collective',
    'RAVER: candid underground electroclash fashion reportage around a crowded DJ booth. Adult fashion models in black industrial vinyl and precision-cut harness garments stand beside physically made chrome androids. Real DJ decks, tungsten industrial hardware, hard direct-camera flash, imperfect skin and metal, restrained late-1990s magazine grain. A credible fashion subculture, not a futuristic video-game poster.'),
  frame('raver','11-chrome-android-afterparty',
    'RAVER: late-night hard-flash fashion photograph inside an underground electronic-music room. A polished black metal android is surrounded by adult clubgoers in tactile black leather and minimalist vinyl styling, worn concrete wall, scratched CDJs in foreground and real atmospheric depth. Spontaneous electroclash social image with credible human anatomy, clothing seams and analog film texture.')
]);
export const RAVER_INSPIRATION_SCENE=Object.freeze({
  id:'raver',title:'Raver',category:'After Hours',
  cover:raverFrames[0].cover,prompt:raverFrames[0].prompt,examples:raverFrames
});
