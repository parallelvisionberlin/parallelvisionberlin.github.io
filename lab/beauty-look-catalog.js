/* ALTER: one reviewed source for visible labels, descriptions and generation instructions.
   Preview images are illustrative, never inputs to generation. Original uses the user's photo. */
const option=(id,label,instruction,image,preview='')=>({id,label,instruction,image,preview});
const A='./visuals/beauty/atelier/';
const B='./visuals/beauty/';
export const beautyLookCatalog={
 makeup:[
  option('keep','Original','Keep the original makeup.',null),
  option('natural','Natural','Subtle natural makeup.',A+'makeup-4.webp'),
  option('editorial','Editorial','Editorial makeup with a considered, photographic finish.',A+'makeup-2.webp'),
  option('soft-glam','Soft glam','Soft glam makeup, softly defined eyes and restrained gloss.',A+'makeup-3.webp'),
  option('bold','Bold','Bold fashion makeup with intentional colour and definition.',A+'makeup-5.webp'),
  option('metallic','Metallic','Reflective metallic fashion eyeshadow, precise edges and a believable photographed finish.',A+'makeup-0.webp'),
  option('smoky','Smoky eye','Apply a diffused charcoal smoky eye with softly blended edges; preserve the original eye shape and iris colour.',A+'makeup-5.webp'),
  option('copper','Copper','Apply warm copper eyeshadow to the eyelids only; preserve the original skin complexion and iris colour.',A+'makeup-1.webp'),
  option('rose','Rose','Apply soft rose-toned eyeshadow to the eyelids only, with restrained saturation and the original eye shape.',A+'makeup-3.webp','rose')
 ],
 hair:[
  option('keep','Original','Keep the original hairstyle and hair colour.',null),
  option('sleek','Sleek','Style the hair into a sleek finish without changing its colour.',B+'look-high-fashion-20261029.jpg','hair-crop'),
  option('waves','Soft waves','Style the hair into soft waves without changing its colour.',B+'look-editorial-20261029.jpg','hair-crop'),
  option('wet','Wet look','Give the existing hair a wet-look finish.',A+'hair-wet.webp'),
  option('updo','Updo','Style the existing hair into an elegant updo.',A+'fashion.webp','updo-crop'),
  option('textured','Textured','Give the existing hair an editorial textured finish, preserving length and colour.',A+'hair-wet.webp','dry-texture'),
  option('straight','Straight','Straighten the existing hair while preserving its length, hairline and colour; do not add extensions.',B+'look-high-fashion-20261029.jpg','hair-crop'),
  option('volume','Volume','Add natural root lift and controlled volume to the existing hair; preserve its colour, length and hairline.',B+'look-editorial-20261029.jpg','hair-crop'),
  option('slick-back','Slicked back','Comb the existing hair smoothly away from the forehead with a dry slicked-back finish; preserve its colour and hairline.',B+'look-natural-20261029.jpg','hair-crop')
 ],
 skin:[
  option('keep','Original','Keep the original skin finish and texture.',null),
  option('natural','Natural','Preserve natural skin texture, pores, freckles and distinctive marks.',A+'skin-natural.webp'),
  option('dewy','Dewy','Give the skin a subtle dewy finish while preserving pores and natural texture.',A+'skin-natural.webp','dewy'),
  option('matte','Matte','Give the skin a soft matte finish while preserving pores and natural texture.',A+'skin-natural.webp','matte'),
  option('satin','Satin','A subtle satin skin finish; retain pores, freckles and natural complexion.',A+'skin-natural.webp','satin'),
  option('refined','Refined','Gently refine temporary skin blemishes without smoothing pores, changing identity or removing distinctive marks.',A+'skin-natural.webp'),
  option('shine-control','Shine control','Reduce excess oily shine on the skin without flattening the existing light or erasing pores, freckles or natural texture.',A+'skin-natural.webp','matte'),
  option('even-tone','Even tone','Gently balance temporary patchy skin redness while preserving the original complexion, freckles, moles and natural skin texture.',A+'skin-natural.webp'),
  option('under-eye','Under-eye','Subtly soften temporary under-eye darkness without changing eye shape, removing natural creases or altering age.',A+'beauty.webp')
 ],
 light:[
  option('keep','Original','',null),
  option('daylight','Daylight','Soft natural daylight with believable falloff.',A+'hero.webp','daylight'),
  option('softbox','Soft studio','Large soft studio lighting with gentle shadows.',A+'hero.webp','softbox'),
  option('flash','Direct flash','Direct on-camera flash with hard falloff and natural photographic contrast.',A+'hero.webp','flash'),
  option('side','Side light','Directional side lighting, sculpted shadows and controlled highlights.',A+'hero.webp','side'),
  option('low-key','Low key','Low-key editorial lighting, deep shadows and restrained highlights.',A+'hero.webp','low-key'),
  option('rim','Rim light','Place a controlled rim light behind the subject to outline hair and shoulders; preserve the existing scene and objects.',A+'hero.webp','rim'),
  option('high-key','High key','Bright, diffuse high-key portrait illumination with low shadow contrast and retained highlight detail; do not replace the background.',A+'hero.webp','high-key'),
  option('overhead','Overhead','Directional overhead portrait lighting with believable shadows under the brow, nose and chin; preserve facial structure.',A+'hero.webp','overhead')
 ],
 color:[
  option('keep','Original','',null),
  option('neutral','Neutral','Neutral photographic colour balance and faithful skin tones.',A+'hero.webp','neutral'),
  option('warm','Warm','Restrained warm colour grading, keeping skin colour believable.',A+'hero.webp','warm'),
  option('cool','Cool','Restrained cool colour grading, preserving natural skin tone.',A+'hero.webp','cool'),
  option('mono','Monochrome','Photographic black-and-white tonal treatment with nuanced skin texture.',A+'hero.webp','mono'),
  option('film','Film tone','Subtle analog film colour and fine organic grain; no synthetic glow.',A+'hero.webp','film'),
  option('muted','Muted','Reduce overall colour saturation while retaining subtle colour separation and realistic skin tones.',A+'hero.webp','muted'),
  option('rich','Rich colour','Increase colour depth and controlled saturation without oversaturating skin or clipping colour detail.',A+'hero.webp','rich'),
  option('faded','Faded','Gently faded photographic colour with lifted blacks and restrained contrast; retain pores and fine detail.',A+'hero.webp','faded')
 ]
};
export const beautyLookPresets={
 editorial:{makeup:'editorial',hair:'keep',skin:'natural',light:'softbox',color:'neutral',text:'Refined editorial portrait lighting, realistic skin detail and controlled contrast. Preserve identity and natural anatomy.'},
 natural:{makeup:'natural',hair:'keep',skin:'natural',light:'daylight',color:'neutral',text:'Gentle natural light, subtle refinement, authentic skin texture. Keep the original person and background.'},
 night:{makeup:'keep',hair:'keep',skin:'natural',light:'low-key',color:'keep',text:'Atmospheric low-key evening portrait, controlled highlights and natural skin tones. Keep original identity.'},
 avant:{makeup:'metallic',hair:'textured',skin:'natural',light:'side',color:'keep',text:'Experimental editorial beauty. Preserve the person, clothing and background; do not add accessories.'},
 fashion:{makeup:'editorial',hair:'sleek',skin:'satin',light:'softbox',color:'neutral',text:'High-fashion editorial portrait with believable photographic texture. Preserve the original clothing and background.'},
 film:{makeup:'keep',hair:'keep',skin:'natural',light:'keep',color:'film',text:'Subtle analog grain, realistic film tonality and natural texture, understated contrast.'}
};
export const beautyChoiceMap=category=>Object.fromEntries(beautyLookCatalog[category].map(o=>[o.id,o.instruction]));
