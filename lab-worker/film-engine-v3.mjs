// Hong Kong Nights V3: scene-referred, hue-aware photochemical reconstruction.
// Preview-only until actual image comparisons pass. This file does not perform
// paid generation, image fetches, or storage writes.
export const FILM_ENGINE_V3_REVISION=7;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=(a,b,value)=>{
  const t=clamp((value-a)/(b-a));
  return t*t*(3-2*t);
};
// Suppress luminosity-only masks on faces/walls while admitting small, locally
// bright cyan-green or tungsten practicals that V6 mistakenly ignores.
export function filmEmitterWeightV3(r,g,b,localContrast=0,baseline=0){
  const red=r/255,green=g/255,blue=b/255,max=Math.max(red,green,blue);
  const chroma=max-Math.min(red,green,blue);
  const teal=smooth(.13,.33,green-red)*smooth(.02,.15,blue-red);
  // Amber needs a stronger red/blue split than skin, plus a near-hot source.
  const amber=smooth(.32,.48,red-blue)*smooth(.08,.20,green-blue)*
    smooth(.80,.91,max);
  const emitter=smooth(.56,.86,max)*smooth(.18,.46,chroma)*
    smooth(.09,.26,Math.max(0,localContrast))*Math.max(teal,amber)*.62;
  return Math.max(baseline,emitter);
}
export function filmPrintPixelV3(r,g,b,strength=0){
  const push=clamp(Number(strength)||0);
  const l=(.2126*r+.7152*g+.0722*b)/255;
  if(l<=.00001)return [0,0,0];
  // A single luminance curve respects source hue and avoids the previous
  // green-channel subtraction that drained saturated cinematic ambience.
  const shadow=smooth(.07,.22,l)*(1-smooth(.40,.63,l));
  const shoulder=smooth(.67,.97,l);
  const mid=.012*(.5-l)*Math.sin(Math.PI*l);
  const target=clamp(l-mid-(.005+.009*push)*shadow-(.008+.018*push)*shoulder);
  const ratio=target/l,neutral=target*255;
  const cool=smooth(.025,.16,(g-r)/255)*smooth(.005,.105,(b-r)/255)*
    (1-smooth(.68,.87,l));
  const chromaGain=1+(.035+.075*push)*cool;
  let rr=neutral+(r*ratio-neutral)*chromaGain;
  let gg=neutral+(g*ratio-neutral)*chromaGain;
  let bb=neutral+(b*ratio-neutral)*chromaGain;
  // Warm practicals get a gentle highlight shoulder. Midtone skin is protected.
  const tungsten=smooth(.55,.86,l)*smooth(.04,.20,(r-b)/255)*
    smooth(.02,.13,(r-g)/255);
  rr+=(2+4*push)*tungsten;bb-=(1+2*push)*tungsten;
  return [Math.round(clamp(rr,0,255)),Math.round(clamp(gg,0,255)),
    Math.round(clamp(bb,0,255))];
}
