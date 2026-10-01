// Reinterpret presets are backend-owned. They define a full photographic treatment,
// not just a short lighting suffix. The source still supplies pose/framing unless a
// preset or the user explicitly releases those constraints.
export const SOUL_PRESETS=Object.freeze([
  {
    id:'photographic-real-skin',
    label:'Photographic / Real Skin',
    imageFidelity:.70,
    identityStrength:.75,
    keepComposition:true,
    keepStyling:true,
    description:'Identity recast with natural skin. Keeps the original photograph recognisable.',
    direction:'Natural editorial photograph with realistic pores, fine skin texture, subtle asymmetry, natural body hair, believable folds, individual hair strands, physically plausible eyes and hands, restrained retouching, neutral lens rendering and no synthetic beauty finish. Preserve the source wardrobe, set and broad light only because this preset is the neutral recast mode.'
  },
  {
    id:'editorial-fashion',
    label:'Editorial Fashion',
    imageFidelity:.52,
    identityStrength:.70,
    keepComposition:true,
    keepStyling:false,
    description:'Full fashion-editorial restyle while keeping the source pose and framing.',
    direction:'Rebuild the styling as a high-end European fashion editorial. Art-directed wardrobe, deliberate silhouette, refined but believable hair and makeup, tactile fabrics, controlled directional key light with shaped shadow, sophisticated neutral set dressing, 50mm editorial lens character, moderate contrast, subtle filmic grain, natural skin and no glossy CGI finish.'
  },
  {
    id:'flash-editorial',
    label:'Flash Editorial',
    imageFidelity:.50,
    identityStrength:.70,
    keepComposition:true,
    keepStyling:false,
    description:'Hard direct flash, darker ambience, candid fashion energy.',
    direction:'Restyle the photograph as a raw direct-flash fashion image. Strong on-camera flash, crisp cast shadows, dark ambient room falloff, realistic specular highlights on skin, slightly underexposed background, imperfect 35mm framing, tactile fabric, candid nightlife energy, visible pores and texture, restrained colour processing.'
  },
  {
    id:'moody-neon-cinema',
    label:'Moody Neon Cinema',
    imageFidelity:.48,
    identityStrength:.70,
    keepComposition:true,
    keepStyling:false,
    description:'Nocturnal cinematic rebuild with saturated practical colour and deep shadow.',
    direction:'Rebuild the visual world as a nocturnal romantic urban photograph: mixed tungsten practicals, deep red and amber with sparse green or cyan contamination, low-key exposure, pools of darkness, soft halation, subtle motion-like lens softness at the edges, atmospheric depth, lived-in set dressing, realistic skin and analog colour separation.'
  },
  {
    id:'soft-intimate',
    label:'Soft Intimate',
    imageFidelity:.56,
    identityStrength:.70,
    keepComposition:true,
    keepStyling:false,
    description:'Natural intimate photograph with softer wardrobe, materials and room treatment.',
    direction:'Restyle as an intimate natural-light photograph. Soft window or bedside practical light, gentle directional shadow, warm restrained palette, rumpled natural textiles, quieter wardrobe styling, shallow but believable depth of field, delicate lens falloff, natural skin microtexture and no beauty-filter smoothing.'
  },
  {
    id:'night-hotel',
    label:'Night Hotel',
    imageFidelity:.47,
    identityStrength:.65,
    keepComposition:true,
    keepStyling:false,
    description:'Transform the set into a late-night hotel photograph with strong atmosphere.',
    direction:'Rebuild the setting and styling as a late-night European hotel photograph. Dark wood, tactile bedding, small practical lamps, warm pools of tungsten light, deep room falloff, selective reflections, elegant but slightly imperfect wardrobe styling, intimate 35mm editorial camera character, rich blacks, realistic skin texture and believable materials.'
  },
  {
    id:'dirty-analog',
    label:'Dirty Analog',
    imageFidelity:.50,
    identityStrength:.65,
    keepComposition:true,
    keepStyling:false,
    description:'Aggressive analog treatment, imperfect exposure and snapshot character.',
    direction:'Restyle as a deliberately imperfect 35mm snapshot. Noticeable but fine film grain, flash-and-ambient mismatch, slight colour cast, imperfect white balance, minor lens softness, occasional highlight bloom, deeper shadow noise, candid wardrobe and set treatment, tactile realism and no polished AI sheen.'
  },
  {
    id:'studio-clean',
    label:'Studio Clean',
    imageFidelity:.45,
    identityStrength:.70,
    keepComposition:true,
    keepStyling:false,
    description:'Replace the environment with a real studio setup while keeping pose and camera geometry.',
    direction:'Rebuild the scene as a real professional photo studio. Replace the source environment with a clean seamless paper or painted cyclorama, controlled large soft key plus subtle negative fill, precise shadow placement, minimal set, considered fashion styling, neutral colour science, crisp lens rendering, accurate natural skin and small physical imperfections. It must look photographed in a studio, not like a cleaned-up version of the original room.'
  }
].map(p=>Object.freeze({...p})));
export const publicSoulPresets=()=>SOUL_PRESETS.map(({direction,...p})=>p);
export const soulPreset=id=>SOUL_PRESETS.find(p=>p.id===id);
