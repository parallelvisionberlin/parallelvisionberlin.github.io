// PV LAB Full Editorial / reference taxonomy. Every card uses a photograph of what it names.
// Static catalog, separate from private user Elements. No automatic identity changes.
const ROOT='./visuals/editorial-scene-library/';
const file=name=>ROOT+name+'.webp';
const p=n=>file('platform-'+String(n).padStart(2,'0'));
const h=n=>file('hotel-room-'+String(n).padStart(2,'0'));
const look=n=>file('hotel-look-'+String(n).padStart(2,'0'));
const v=(path,tags=[])=>({path,tags});
const day=['natural','golden','overcast'];
const moody=['blue','night','overcast'];
export const PLATFORM_GROUPS=Object.freeze({
  'concrete-portal':[1,2,3,4,5],
  'reflective-installation':[6],
  'coastal-brutalism':[7,8,9,10,11,12,13,14],
  'industrial-hall':[15,24],
  'white-warehouse':[16,17,18,19],
  'desert-monument':[20,21,22,23],
  'quarry-platform':[25,26,27,28,29,30],
  'mountain-platform':[31,32,33,34,35,36,37,38,39]
});
export const PLATFORM_ARCHIVE=Object.freeze(Object.entries(PLATFORM_GROUPS).flatMap(([group,indices])=>indices.map(n=>Object.freeze({id:'platform-'+String(n).padStart(2,'0'),group,image:p(n),source:'User supplied PLATFORM.zip'}))));
export const SCENE_LIBRARY=Object.freeze([
 {id:'hotel-room',name:'Hotel Room',image:h(2),eyebrow:'PRIVATE / AFTER HOURS',summary:'Dark walls, bedside lamp, rumpled white linen',prompt:'An ordinary intimate hotel bedroom with matte dark walls, practical warm bedside lamp, black headboard, white pillows and naturally rumpled cotton sheets. Plausible furniture scale and imperfect real-world detail. Treat this as an environment only. Do not introduce people from scene references.',references:[v(h(2),['night','warm']),v(h(4),['night','warm']),v(h(1),['overcast','cool']),v(h(3),['natural','warm'])]},
 {id:'coastal-brutalism',name:'Coastal Brutalism',image:p(12),eyebrow:'PLATFORM / COAST',summary:'Concrete structures beside cold water',prompt:'Coastal brutalist architecture overlooking a real, overcast mountain bay. Wet stone and concrete, actual shoreline, deep spatial perspective and quiet monumental geometry. No invented city skyline.',references:[v(p(12),['overcast','moody']),v(p(11),['overcast','moody']),v(p(14),['overcast','moody']),v(p(8),['natural','cool']),v(p(9),['natural','cool']),v(p(10),['overcast','cool']),v(p(13),['overcast','moody']),v(p(7),['overcast','wet'])]},
 {id:'desert-monument',name:'Desert Monument',image:p(21),eyebrow:'PLATFORM / DESERT',summary:'Pale sculptural architecture in open terrain',prompt:'A real desert landscape with a single large sculptural concrete architectural form, mineral sand, distant mountains, physically plausible light and strong compositional negative space. Do not import reference figures or costumes.',references:[v(p(21),day),v(p(22),day),v(p(20),day),v(p(23),day)]},
 {id:'industrial-hall',name:'Industrial Hall',image:p(15),eyebrow:'PLATFORM / INDUSTRIAL',summary:'Industrial volume, raw structure and controlled light',prompt:'A stripped industrial warehouse or hall with structural concrete and exposed surfaces, practical industrial fixtures, believable floor perspective and controlled available light. Grounded physical architecture, no fashion portrait as a room reference.',references:[v(p(15),['warm','overcast']),v(p(24),['night','moody'])]},
 {id:'concrete-portal',name:'Concrete Portal',image:p(4),eyebrow:'PLATFORM / MONUMENT',summary:'Monolithic threshold and dramatic natural light',prompt:'Heavy concrete walls, a monolithic passage or stair and a singular open circular architectural aperture. Physical monumentality, weathered concrete, no fantasy CGI decorations.',references:[v(p(2),['overcast','moody']),v(p(3),['overcast','moody']),v(p(4),['golden','moody']),v(p(5),['golden','moody']),v(p(1),['overcast','moody'])]},
 {id:'white-warehouse',name:'White Warehouse',image:p(18),eyebrow:'PLATFORM / DAYLIGHT',summary:'Hazy daylight inside an empty industrial space',prompt:'An empty pale industrial warehouse with broad windows, white haze, soft natural daylight, weathered columns, dusty floor, realistic architecture and quiet depth. No subjects from the architecture reference.',references:[v(p(18),['natural','soft']),v(p(19),['overcast','soft']),v(p(16),['natural','soft']),v(p(17),['overcast','soft'])]},
 {id:'quarry-platform',name:'Quarry Platform',image:p(27),eyebrow:'PLATFORM / STONE',summary:'Weathered stone, wet surfaces, suspended slabs',prompt:'A geometric concrete platform integrated into a weathered stone quarry, exposed rock faces, wet slabs, mineral dust and dramatic natural shadows. No speculative floating buildings.',references:[v(p(27),['overcast','moody']),v(p(29),['overcast','moody']),v(p(30),['overcast','moody']),v(p(25),['natural','warm']),v(p(26),['natural','warm']),v(p(28),['overcast','cool'])]},
 {id:'mountain-platform',name:'Mountain Platform',image:p(35),eyebrow:'PLATFORM / MOUNTAIN',summary:'Brutalist terraces in remote mountain landscapes',prompt:'Real mountainous terrain with heavy concrete terraces and cantilevers, cloud banks, cold waterways and plausible structural proportions. Use one coherent mountainside architectural vocabulary.',references:[v(p(35),['overcast','moody']),v(p(34),['overcast','moody']),v(p(32),['overcast','moody']),v(p(33),['overcast','moody']),v(p(36),['overcast','moody']),v(p(31),['overcast','moody']),v(p(37),['overcast','moody']),v(p(38),['overcast','moody']),v(p(39),['natural','cool'])]},
 {id:'reflective-installation',name:'Reflective Installation',image:p(6),eyebrow:'PLATFORM / MATERIAL',summary:'Mirror-like surface and concrete columns',prompt:'A physically built installation with glossy reflective black fluid-like surfaces beside raw concrete pillars, dim industrial lighting, tactile specular reflections and photographic realism.',references:[v(p(6),['night','moody'])]},
 {id:'record-shop',name:'Record Shop',image:'./mood-previews/hd/90s-cinema-clean-final-20261011.jpg',eyebrow:'URBAN / INTERIOR',summary:'Lived-in record store, warm practical light',prompt:'A real small record shop with crates of vinyl records, lived-in furnishings, practical shop lighting, natural perspective and candid street-level character.',references:[]}
]);
export const LOOK_LIBRARY=Object.freeze([
 {id:'kodak-retro',name:'Kodak Retro',image:look(1),eyebrow:'FILM / AFTER HOURS',summary:'Imperfect 35mm grain, muted hotel colors',prompt:'Candid retro color-negative film aesthetic. Grain, gentle color shifts, restrained contrast, authentic halation and unretouched real skin. Keep the reference person and outfit out of the result.',references:[v(look(1))]},
 {id:'direct-flash',name:'Direct Flash',image:look(2),eyebrow:'FLASH / EDITORIAL',summary:'On-camera flash, natural skin, dark surroundings',prompt:'Unvarnished direct on-camera photographic flash, bright near-field exposure with rapid falloff into genuine nighttime shadow, slight lens flare and editorial spontaneity. Reproduce the optics, never the reference model.',references:[v(look(2))]},
 {id:'analog-night',name:'Analog Night',image:look(3),eyebrow:'NIGHT / WINDOW',summary:'City lights, contrast, gritty grain',prompt:'Nighttime photographic realism with high-ISO film grain, available city-light reflections and harsh flash highlights balanced against deep environmental shadows. Do not copy the reference person.',references:[v(look(3))]},
 {id:'warm-film',name:'Warm Film',image:'./mood-previews/hd/80s-film-20261011.jpg',eyebrow:'TUNGSTEN / COLOR NEGATIVE',summary:'Warm ambient light and subtle film grain',prompt:'Warm tungsten-lit analog color film, dense black levels, subtle halation and natural amber skin-tone transitions with realistic grain.',references:[v('./mood-previews/hd/80s-film-20261011.jpg')]},
 {id:'natural-editorial',name:'Natural Editorial',image:'./visuals/character-casting/copper-inertia.webp',eyebrow:'DAYLIGHT / COLOR',summary:'Soft daylight, true textures, minimal retouching',prompt:'Unforced photographic fashion editorial with believable ambient daylight, gentle contrast, visible fabric weave and convincing skin detail. No synthetic over-retouching.',references:[v('./visuals/character-casting/copper-inertia.webp')]},
 {id:'monochrome',name:'Monochrome Film',image:p(25),eyebrow:'BLACK & WHITE / GRAIN',summary:'Silver-gelatin tones and mineral contrast',prompt:'Monochrome analog film photography with natural silver-gelatin grain, measured midtone gradients, tactile shadows and restrained highlights.',references:[v(p(25))]}
]);
export const MATERIAL_LIBRARY=Object.freeze([
 {id:'concrete',name:'Concrete',image:file('material-concrete'),summary:'Raw architectural surface',prompt:'Tactile raw poured concrete, mineral pores, weathering and plausible roughness.'},
 {id:'wet-stone',name:'Wet Stone',image:file('material-wet-stone'),summary:'Dark weathered stone',prompt:'Wet weathered stone with natural mineral texture and damp specular variation.'},
 {id:'reflective-metal',name:'Polished Metal',image:file('material-reflective-metal'),summary:'Specular metal, true reflections',prompt:'Polished reflective metal with true physical reflections, restrained imperfections and dimensional shape.'},
 {id:'white-fabric',name:'White Fabric',image:file('material-white-fabric'),summary:'Voluminous soft cloth',prompt:'Voluminous real white woven fabric with visible seams, folds, tension and convincing weight.'},
 {id:'olive-drape',name:'Olive Drape',image:file('material-olive-drape'),summary:'Textured olive-green textile',prompt:'Textured olive-green woven drapery, genuine creases, weight and matte fiber detail.'},
 {id:'bronze',name:'Hammered Bronze',image:file('material-bronze'),summary:'Rough warm metallic surface',prompt:'Hammered bronze with irregular metallic patina, authentic surface grain and warm reflections.'}
]);
export function selectInjectedReferences({sceneId=null,lookId=null,time='natural',atmosphere='cinematic',available=3}={}){
  const scene=SCENE_LIBRARY.find(x=>x.id===sceneId),lookChoice=LOOK_LIBRARY.find(x=>x.id===lookId);
  const max=Math.max(0,Math.floor(Number(available)||0));
  if(!max)return [];
  // Preserve custom/model references first. Use at most two place photos and one photographic style.
  const reserveStyle=lookChoice&&max>1?1:0;
  const sceneBudget=Math.min(2,max-reserveStyle);
  const score=(r,i)=>((r.tags||[]).includes(time)?3:0)+((r.tags||[]).includes(atmosphere)?2:0)-i*0.01;
  const chosen=(scene?.references||[]).map((item,i)=>({item,score:score(item,i)})).sort((a,b)=>b.score-a.score).slice(0,sceneBudget).map(x=>({src:x.item.path,role:'room',name:scene.name, note:'Environment only. Do not copy people, clothing, appearance, or poses.'}));
  if(lookChoice&&chosen.length<max&&lookChoice.references?.length)
    chosen.push({src:lookChoice.references[0].path,role:'style',name:lookChoice.name,note:'Photographic treatment and optics only. Never transfer the example person or clothing.'});
  return chosen;
}
export function cardLibrary(tab){
 return tab==='location'?SCENE_LIBRARY:tab==='moods'?LOOK_LIBRARY:MATERIAL_LIBRARY;
}
