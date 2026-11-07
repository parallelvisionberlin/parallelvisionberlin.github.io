// Source-driven optical scattering. No AI, scene reconstruction, color grading
// or full-frame blurred photo. The caller composites this light-only layer
// with Porter-Duff 'lighter', preserving the native-resolution image beneath.
// Linear-light convolution; three box passes approximate each Gaussian PSF.
// Artistic diffusion, not a measured camera/stock model or volumetric solver.
const clamp=(v,lo=0,hi=1)=>Math.max(lo,Math.min(hi,v));
const smooth=(lo,hi,v)=>{const t=clamp((v-lo)/(hi-lo));return t*t*(3-2*t);};
const linear=Float32Array.from({length:256},(_,i)=>{const x=i/255;return x<=.04045?x/12.92:((x+.055)/1.055)**2.4;});
const srgb=v=>v<=.0031308?12.92*v:1.055*v**(1/2.4)-.055;
export function opticalStrength(value){const n=Number(value);return Number.isFinite(n)?clamp(n/100)**1.7*(1+3*smooth(.6,1,clamp(n/100))):0;}
export function scatteringEmitter(r,g,b){
  const l=(.2126*r+.7152*g+.0722*b)/255,max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255;
  // Broad soft window highlights count, not just clipped point lights.
  // Dark colored walls and ordinary skin midtones are not emitters.
  return Math.max(smooth(.54,.93,l),smooth(.87,1,max)*smooth(.25,.58,max-min)*smooth(.22,.55,l)*.7);
}
function box(input,output,w,h,r,horizontal){
  const lines=horizontal?h:w,len=horizontal?w:h,step=horizontal?3:w*3,diameter=2*r+1;
  for(let line=0;line<lines;line++)for(let c=0;c<3;c++){
    const base=horizontal?line*w*3+c:line*3+c;
    let sum=input[base]*(r+1);
    for(let k=1;k<=r;k++)sum+=input[base+Math.min(k,len-1)*step];
    for(let p=0;p<len;p++){
      output[base+p*step]=Math.max(0,sum/diameter);
      sum+=input[base+Math.min(len-1,p+r+1)*step]-input[base+Math.max(0,p-r)*step];
    }
  }
}
function blur(source,w,h,sigma){
  const r=Math.max(1,Math.round((Math.sqrt(1+4*sigma*sigma)-1)/2));
  let a=source.slice(),b=new Float32Array(source.length);
  for(let pass=0;pass<3;pass++){box(a,b,w,h,r,true);box(b,a,w,h,r,false);}
  return a;
}
export function opticalScatterPixels(width,height,pixels,{haze=0,halation=0}={}){
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>1_000_000||pixels?.length!==width*height*4)
    throw new RangeError('Invalid bounded optical source.');
  const hs=opticalStrength(haze),ls=opticalStrength(halation),out=new Uint8Array(pixels.length);
  if(!hs&&!ls)return out;
  const source=new Float32Array(width*height*3);let active=false;
  for(let p=0;p<width*height;p++){
    const j=p*4,k=p*3,a=pixels[j+3]/255,w=scatteringEmitter(pixels[j],pixels[j+1],pixels[j+2])*a;
    if(w>.0001)active=true;
    for(let c=0;c<3;c++)source[k+c]=linear[pixels[j+c]]*w;
  }
  if(!active)return out;
  const scale=Math.max(width,height),energy=new Float32Array(source.length);
  if(hs){
    // Three spatial scales, all emitted by actual source highlights. No
    // uniform grey/green overlay and no darkening or invented light source.
    for(const [radius,mix] of [[.018,.50],[.055,.34],[.13,.16]]){
      const field=blur(source,width,height,Math.max(.8,scale*radius));
      for(let i=0;i<energy.length;i++)energy[i]+=field[i]*mix*hs*.26;
    }
  }
  if(ls){
    const tight=blur(source,width,height,Math.max(.65,scale*.0035));
    const outer=blur(source,width,height,Math.max(.9,scale*.012));
    const tint=[1.06,1,.90];
    for(let i=0;i<energy.length;i++)energy[i]+=Math.max(0,tight[i]*.68+outer[i]*.32-source[i]*.68)*ls*.34*tint[i%3];
  }
  for(let p=0;p<width*height;p++){
    const j=p*4,k=p*3,alpha=pixels[j+3]/255;if(!alpha)continue;
    const d=[0,0,0];
    for(let c=0;c<3;c++){
      // Soft compression and source headroom suppress highlight clipping.
      // Only light is added: original texture and geometry remain beneath.
      const e=Math.max(0,energy[k+c]),veil=srgb(e/(1+e))*.82;
      d[c]=clamp((1-pixels[j+c]/255)*veil*alpha);
    }
    const peak=Math.max(...d);if(peak<.5/255)continue;
    out[j]=Math.round(d[0]/peak*255);out[j+1]=Math.round(d[1]/peak*255);out[j+2]=Math.round(d[2]/peak*255);out[j+3]=Math.round(peak*255);
  }
  return out;
}
