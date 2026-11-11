// Curated PV LAB worlds. Public visual direction only, never character or wardrobe identity.
export const CHROME_DESERT = Object.freeze({
  id:'chrome-desert',
  name:'Chrome Desert',
  hero:'./visuals/featured-worlds/chrome-desert/hero.jpg',
  gallery:[
    './visuals/featured-worlds/chrome-desert/hero.jpg',
    './visuals/featured-worlds/chrome-desert/installation.jpg',
    './visuals/featured-worlds/chrome-desert/curved.jpg'
  ],
  // Cropped in the browser before upload so curated fashion models are not given as identity references.
  environments:[
    {src:'./visuals/featured-worlds/chrome-desert/installation.jpg',name:'chrome-desert-mirrored-architecture.jpg',crop:{x:0,y:0,width:.66,height:1}},
    {src:'./visuals/featured-worlds/chrome-desert/curved.jpg',name:'chrome-desert-curved-sculpture.jpg',crop:{x:0,y:0,width:.64,height:1}}
  ],
  description:'An arid landscape, monumental mirrored sculpture and real golden-hour light.',
  prompt:'Curated environment preset: Chrome Desert. A grounded, monumental desert landscape with physically plausible sculptural polished-metal architecture, reflective planes and sweeping curved mirrors, rocky geological formations and open sky. Natural warm late-afternoon sunlight, long believable shadows, crisp real reflections, restrained analog grain and tactile materials. Compose a cohesive, photorealistic luxury fashion campaign, not fantasy or generic science fiction. The people in PV LAB reference-world artwork are NOT identity or clothing references; use only the user-selected cast and their chosen garments, and do not copy poses, faces or wardrobe from curated artwork.'
});
export function resolveEditorialWorld(search){
  const params=new URLSearchParams(search||'');
  return params.get('world')===CHROME_DESERT.id?CHROME_DESERT:null;
}
export function nextEditorialStep(current,hasWorld){
  if(hasWorld&&(current===1||current===2||current===3))return 4;
  return current+1;
}
export function previousEditorialStep(current,hasWorld){
  if(hasWorld&&current===4)return 1;
  return Math.max(0,current-1);
}
export function needsStylingChoice(hasWorld,referenceCount,direction){
  return !hasWorld&&referenceCount===0&&!String(direction||'').trim();
}
