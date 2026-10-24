// Deliberately used only for Dream Blur + an actual Base photograph + 100%.
// Text-only generation, References Only, 1-99%, and the four optical photos
// retain their existing recipes and reference routing. No image pixels change here.
const FULL = [
  'PV LAB MOOD / Dream Blur: DREAM BLUR V2 / MAXIMUM BASE EXPOSURE.',
  '100%: maximum real shutter streaks, light leaks, halation and pushed-film texture OVER THE SAME FRAMING.',
  'IDENTITY FIRST / BASE FRAME LOCK: keep the exact same people, facial identity, facial structure, expression, hair, body proportions, anatomy, pose, orientation, wardrobe and skin coverage. Keep the same actual place, architecture, furniture, objects, camera viewpoint, subject size and crop. Full body stays full body; DO NOT zoom into a headshot. A rear view remains a rear view; never invent a hidden face or limb.',
  'CONTENT IS LOCKED, EXPOSURE IS NOT. Re-photograph that unchanged moment as a deeply dreamlike handheld slow-shutter 35mm exposure. Transform the photographic atmosphere across the subject AND the entire existing environment, not a sharp unchanged photograph with a few blue streaks on one side. Allow substantial exposure, contrast, color separation and optical softness changes without redesigning people or place.',
  'OPTICS: borrow broad imperfect highlight smears, creamy diffusion, irregular luminous falloff and dark negative space from the supplied Style photographs. Let existing windows, reflections and practical lights drag through foreground, middle distance and background in one coherent exposure. Cobalt/cyan luminous scatter may mingle with original warm skin and small amber highlights; retain genuine local colors and deep textured blacks. Daylight may become a darker, more dreamlike exposure of the SAME place, not a new night street. No invented lamps, vehicles, rain or wet rooms.',
  'FILM: dense irregular embedded 35mm emulsion grain, palpable shadow texture, imperfect highlight roll-off and source-bound halation throughout skin, clothes and surroundings. Optical softness may affect the whole photograph while the original face stays recognizable and anatomy remains single and stable. Never turn motion into another solid face, body or extra limb.',
  'Style photographs are OPTICS ONLY: never copy their people, eyes, rooms or compositions. An authentic photographic memory, not polished advertising. No radial zoom rays, decorative light ribbons, laser lines, glowing body outlines, uniform blue wash, pasted noise, generic Gaussian blur, plastic skin or scene replacement. Honor explicit customer direction and assigned reference roles.'
].join(' ');

// A fixed authored Lite recipe, not truncation based on customer prompt length.
const LITE = [
  'PV LAB MOOD / Dream Blur: DREAM BLUR V2 / MAXIMUM BASE EXPOSURE.',
  '100%: maximum real shutter streaks, light leaks, halation and pushed-film texture OVER THE SAME FRAMING.',
  'IDENTITY FIRST: same people, face, expression, hair, anatomy, pose, outfit, skin coverage, place, objects, camera and crop. Full body stays full body; DO NOT zoom into a headshot or invent hidden features.',
  'Lock content, NOT exposure. Make the SAME photograph deeply dreamlike across subject AND setting: broad irregular source-bound highlight drag, creamy optical diffusion, cobalt/cyan scatter with warm skin, deep textured shadows and dense embedded 35mm grain. Substantially reshape exposure and optical softness, not just add blue streaks at one edge. Existing windows, reflections and lamps motivate light; no new scenery or objects. Keep the face recognizable and one stable body.',
  'Style photographs supply optics only, never people or places. No radial rays, decorative lasers, body halos, uniform tint, pasted noise, duplicate anatomy, new rain or wet rooms. Honor explicit customer direction and assigned reference roles.'
].join(' ');

export function prepareDreamBlurBasePrompt(input='',{engine='seedream'}={}){
  const original=String(input||'').trim();
  return [original,engine==='seedreamlite'?LITE:FULL].filter(Boolean).join('\n\n');
}
