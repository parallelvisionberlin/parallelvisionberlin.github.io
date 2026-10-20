import {filmFinishSettings,FILM_FINISH_RENDER_REVISION} from '../lab/film-finish.js';
import {filmPrintPixelV3,filmEmitterWeightV3} from './film-engine-v3.mjs';

export const FILM_RENDER_REVISION=FILM_FINISH_RENDER_REVISION;
const INPUT_LIMIT=20_000_000,OUTPUT_LIMIT=20*1024*1024;
const signature=new Uint8Array([137,80,78,71,13,10,26,10]);
const crcTable=Uint32Array.from({length:256},(_,n)=>{for(let k=0;k<8;k++)n=n&1?0xedb88320^(n>>>1):n>>>1;return n>>>0;});
function chunk(name,data){
  const out=new Uint8Array(data.length+12),view=new DataView(out.buffer);
  view.setUint32(0,data.length);out.set(new TextEncoder().encode(name),4);out.set(data,8);
  let crc=0xffffffff;for(let i=4;i<out.length-4;i++)crc=crcTable[(crc^out[i])&255]^(crc>>>8);
  view.setUint32(out.length-4,(crc^0xffffffff)>>>0);return out;
}
function randomFor(seed){
  let value=2166136261;for(const char of String(seed))value=Math.imul(value^char.charCodeAt(0),16777619);
  return ()=>{value+=0x6d2b79f5;let n=value;n=Math.imul(n^(n>>>15),n|1);n^=n+Math.imul(n^(n>>>7),n|61);return ((n^(n>>>14))>>>0)/4294967296;};
}
async function png(width,height,scan,colorType){
  const compressed=new Uint8Array(await new Response(new Blob([scan]).stream().pipeThrough(new CompressionStream('deflate'))).arrayBuffer());
  const header=new Uint8Array(13),view=new DataView(header.buffer);view.setUint32(0,width);view.setUint32(4,height);header[8]=8;header[9]=colorType;
  return new Uint8Array(await new Blob([signature,chunk('IHDR',header),chunk('IDAT',compressed),chunk('IEND',new Uint8Array())]).arrayBuffer());
}
// Decode only bounded, Cloudflare-normalized PNGs. Never allocate source-sized
// pixel buffers, even when the original is a 6K photograph.
async function normalizedPixels(bytes){
  if(!signature.every((n,i)=>bytes[i]===n))throw Error('Invalid highlight image.');
  let width=0,height=0,depth=0,type=0,palette=null,alpha=null;const parts=[];
  for(let offset=8;offset+12<=bytes.length;){
    const view=new DataView(bytes.buffer,bytes.byteOffset+offset),length=view.getUint32(0),end=offset+12+length;
    if(end>bytes.length)throw Error('Incomplete highlight data.');
    const name=String.fromCharCode(...bytes.subarray(offset+4,offset+8)),data=bytes.subarray(offset+8,end-4);
    if(name==='IHDR'){
      if(length!==13)throw Error('Invalid highlight header.');
      const h=new DataView(data.buffer,data.byteOffset,data.byteLength);width=h.getUint32(0);height=h.getUint32(4);depth=data[8];type=data[9];
      if(data[10]||data[11]||data[12])throw Error('Unsupported highlight encoding.');
    }else if(name==='IDAT')parts.push(data);else if(name==='PLTE')palette=data;else if(name==='tRNS')alpha=data;
    offset=end;
  }
  const channels=({0:1,2:3,3:1,4:2,6:4})[type];
  if(!width||!height||width*height>1_000_000||!channels||![1,2,4,8,16].includes(depth)||(![0,3].includes(type)&&depth<8)||type===3&&!palette)
    throw Error('Unsupported highlight pixels.');
  const rowBytes=Math.ceil(width*channels*depth/8),bpp=Math.max(1,Math.ceil(channels*depth/8));
  const raw=await bytesFrom(new Response(new Blob(parts).stream().pipeThrough(new DecompressionStream('deflate'))),(rowBytes+1)*height);
  if(raw.length!==(rowBytes+1)*height)throw Error('Incomplete highlight pixels.');
  const pixels=new Uint8Array(width*height*4);
  function sample(start,index){
    if(depth===8)return raw[start+index];
    if(depth===16)return raw[start+index*2];
    return (raw[start+Math.floor(index*depth/8)]>>>(8-depth-(index*depth)%8))&((1<<depth)-1);
  }
  for(let y=0;y<height;y++){
    const start=y*(rowBytes+1)+1,filter=raw[start-1];if(filter>4)throw Error('Invalid highlight filter.');
    for(let x=0;x<rowBytes;x++){
      const a=x>=bpp?raw[start+x-bpp]:0,b=y?raw[start+x-rowBytes-1]:0,c=y&&x>=bpp?raw[start+x-rowBytes-1-bpp]:0;
      let prediction=0;
      if(filter===1)prediction=a;else if(filter===2)prediction=b;else if(filter===3)prediction=Math.floor((a+b)/2);
      else if(filter===4){const p=a+b-c,pa=Math.abs(p-a),pb=Math.abs(p-b),pc=Math.abs(p-c);prediction=pa<=pb&&pa<=pc?a:pb<=pc?b:c;}
      raw[start+x]=(raw[start+x]+prediction)&255;
    }
    for(let x=0;x<width;x++){
      let r,g,b,a=255;
      if(type===3){const i=sample(start,x);r=palette[i*3];g=palette[i*3+1];b=palette[i*3+2];a=alpha?.[i]??255;}
      else if(type===0||type===4){r=g=b=sample(start,x*channels)*(depth<8?255/((1<<depth)-1):1);if(type===4)a=sample(start,x*channels+1);}
      else{r=sample(start,x*channels);g=sample(start,x*channels+1);b=sample(start,x*channels+2);if(type===6)a=sample(start,x*channels+3);}
      pixels.set([r,g,b,a],(y*width+x)*4);
    }
  }
  return {width,height,pixels};
}
async function convertHighlights(bytes,asMask=false,gain=1){
  const {width,height,pixels}=await normalizedPixels(bytes),output=new Uint8Array((width*4+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const j=(y*width+x)*4,[r,g,b,a]=pixels.subarray(j,j+4),max=Math.max(r,g,b),i=y*(width*4+1)+1+x*4;
    if(asMask){
      // A soft shoulder includes reflective highlights without turning broad
      // skin midtones into orange patches. One weight preserves source hue.
      const luminance=(.2126*r+.7152*g+.0722*b)/255,saturation=max?(max-Math.min(r,g,b))/max:0;
      const brightness=saturation>.6&&max>235?Math.max(luminance,max/255*.88):luminance;
      const t=Math.min(1,Math.max(0,(brightness-.58)/.40)),weight=t*t*(3-2*t)*a/255;
      output[i]=Math.round(r*weight);output[i+1]=Math.round(g*weight);output[i+2]=Math.round(b*weight);output[i+3]=255;
    }else if(max){output[i]=Math.round(r/max*255);output[i+1]=Math.round(g/max*255);output[i+2]=Math.round(b/max*255);output[i+3]=Math.round(Math.min(255,max*a/255*gain));}
  }
  return png(width,height,output,6);
}

// Optical finish: light masks are built only from bright source pixels, never
// from general image edges. No person segmentation or new lights are invented.
const clamp=(n,min=0,max=1)=>Math.max(min,Math.min(max,n));
const smooth=(a,b,x)=>{const t=clamp((x-a)/(b-a));return t*t*(3-2*t);};
export function sourceLightWeight(r,g,b,localContrast=0){
  const l=(.2126*r+.7152*g+.0722*b)/255,max=Math.max(r,g,b)/255,min=Math.min(r,g,b)/255;
  const saturated=max>.94&&max-min>.45&&l>.52?smooth(.94,1,max)*.55:0;
  const core=Math.max(smooth(.79,.98,l),saturated);
  return core*(.3+.7*smooth(.035,.22,localContrast));
}
// Deluxe 35mm v5: 0-70 stays calibrated. 70-100 opens a photochemical
// overdrive without inventing scene lighting or new processing passes.
export function deluxeResponse(value){
  const t=clamp((value-70)/30);
  return t*t*(3-2*t);
}
export function photochemicalPlan(value,{engine='v9'}={}){
  const f=filmFinishSettings(value);
  const grainTop=deluxeResponse(f.grain),hazeTop=deluxeResponse(f.haze);
  const lightTop=deluxeResponse(f.halation),filmTop=deluxeResponse(f.film);
  const signature=filmTop*Math.min(hazeTop,lightTop);
  const expressive=engine==='v9';
  return {
    grainAmount:Math.min(134,f.grain*(1+.22*grainTop+.12*signature)),
    printStrength:.62*filmTop+.38*signature,
    printOpacity:Math.min(.98,f.film/100*.88+.07*filmTop+.03*signature),
    hazeRadius:43*(1+.35*hazeTop+.20*signature+(expressive?.35*hazeTop:0)),
    hazeOpacity:Math.min(expressive?.70:.56,f.haze/100*(.31+.09*hazeTop+.10*signature+(expressive?.08*hazeTop:0))),
    halationRadius:9*(1+.20*lightTop+.17*signature+(expressive?.14*lightTop:0)),
    halationOpacity:Math.min(expressive?.65:.54,f.halation/100*(.32+.06*lightTop+.10*signature+(expressive?.05*lightTop:0))),
    // Gaussian scattering thins out small practicals: strengthen only their
    // real-light contribution above 70%, with no invented emitters.
    hazeGain:expressive?1+4*hazeTop:1,
    halationGain:expressive?1+1.5*lightTop:1,
    // Lens diffusion is not generated spatial/volumetric fog, which belongs
    // in the mood generation. Keep the low-strength calibrated look.
    diffusionOpacity:expressive
      ?Math.min(.16,f.haze/100*(.026+.014*hazeTop+.01*signature+.085*hazeTop))
      :engine==='v8'
        ?Math.min(.06,f.haze/100*(.026+.014*hazeTop+.01*signature))
        :Math.min(.16,f.haze/100*(.09+.035*hazeTop+.025*signature)),
    signature
  };
}
export async function luminousMaskPng(bytes,engine='v6'){
  const {width,height,pixels}=await normalizedPixels(bytes),out=new Uint8Array((width*4+1)*height);
  const light=(x,y)=>{
    x=Math.max(0,Math.min(width-1,x));y=Math.max(0,Math.min(height-1,y));
    const p=(y*width+x)*4;return (.2126*pixels[p]+.7152*pixels[p+1]+.0722*pixels[p+2])/255;
  };
  let active=false;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,j=y*(width*4+1)+1+x*4;
    const current=light(x,y),d=Math.max(4,Math.round(Math.min(width,height)/55));
    const around=(light(x-d,y)+light(x+d,y)+light(x,y-d)+light(x,y+d))/4;
    const baseline=sourceLightWeight(pixels[i],pixels[i+1],pixels[i+2],current-around);
    const weight=['v3','v8','v9'].includes(engine)
      ?filmEmitterWeightV3(pixels[i],pixels[i+1],pixels[i+2],current-around,baseline)
      :baseline;
    if(weight>.008)active=true;
    out[j]=Math.round(pixels[i]*weight);out[j+1]=Math.round(pixels[i+1]*weight);
    out[j+2]=Math.round(pixels[i+2]*weight);out[j+3]=255;
  }
  return {bytes:await png(width,height,out,6),active};
}
// Artistic 35mm print simulation, not a calibrated stock or camera profile.
// Neutral curves first; gentle cool shadows / warm practical highlights next.
// No neon-green tint, auto exposure, edge sharpening or faux dust/scratches.
export function photochemicalPixel(r,g,b,deluxe=0){
  const push=clamp(Number(deluxe)||0);
  const l=(.2126*r+.7152*g+.0722*b)/255;
  const shadow=1-smooth(.07,.48,l),highlight=smooth(.62,.97,l);
  const midShape=(.055+.025*push)*(l-.5)*(1-Math.abs(2*l-1));
  // Pushed negative density is scene-wide, unlike source-only haze. Target
  // illuminated shadow midtones and keep black pockets genuinely black.
  const dense=smooth(.13,.30,l)*(1-smooth(.52,.76,l));
  const creamy=smooth(.28,.52,l)*(1-smooth(.77,.94,l));
  const blackGuard=smooth(.005,.16,l);
  const target=clamp(l+midShape-(.043+.033*push)*highlight+
    .006*shadow*blackGuard+.004*push*shadow*smooth(.02,.18,l)
    -push*(.037*dense+.012*creamy));
  const ratio=l>.006?target/l:1;
  const greenExcess=Math.max(0,g-(r+b)*.5);
  return [
    Math.round(clamp(r*ratio+(6+15*push)*highlight-1*shadow*blackGuard+3*push*creamy,0,255)),
    Math.round(clamp(g*ratio+2*highlight+shadow*blackGuard-
      greenExcess*(.065+.06*push+.065*push*dense),0,255)),
    Math.round(clamp(b*ratio-(3+12*push)*highlight+(4+4*push)*shadow*blackGuard+
      4*push*dense,0,255))
  ];
}
export async function printGradePng(bytes,deluxe=0,engine='v6'){
  const {width,height,pixels}=await normalizedPixels(bytes),scan=new Uint8Array((width*4+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,j=y*(width*4+1)+1+x*4,graded=(['v3','v8','v9'].includes(engine)?filmPrintPixelV3:photochemicalPixel)(pixels[i],pixels[i+1],pixels[i+2],deluxe);
    scan[j]=graded[0];scan[j+1]=graded[1];scan[j+2]=graded[2];scan[j+3]=pixels[i+3];
  }
  return png(width,height,scan,6);
}

export const transparentHighlights=(bytes,gain=1)=>convertHighlights(bytes,false,gain);
export const highlightMask=bytes=>convertHighlights(bytes,true);
// Custom multiscale grain, not a measured film-stock model. Isotropic smooth
// fields avoid row-direction artifacts and pixel-white speckles. Output scale
// is normalized by the caller; source exposure controls amplitude, not mean.
export async function grainPng(width,height,amount,seed,source=null){
  const random=randomFor(seed),stride=width*2+1,scan=new Uint8Array(stride*height);
  const gaussian=()=>Math.sqrt(-2*Math.log(Math.max(1e-9,random())))*Math.cos(2*Math.PI*random());
  function field(cell){
    const w=Math.ceil(width/cell)+2,h=Math.ceil(height/cell)+2,values=Float32Array.from({length:w*h},gaussian);
    return (x,y)=>{
      const gx=x/cell,gy=y/cell,ix=Math.floor(gx),iy=Math.floor(gy);
      const fx=gx-ix,fy=gy-iy,u=fx*fx*(3-2*fx),v=fy*fy*(3-2*fy);
      return (values[iy*w+ix]*(1-u)+values[iy*w+ix+1]*u)*(1-v)+(values[(iy+1)*w+ix]*(1-u)+values[(iy+1)*w+ix+1]*u)*v;
    };
  }
  const fine=field(1.15),body=field(2.3);
  const pushed=Math.max(0,Math.min(1,(amount-100)/34));
  // Stronger clustered emulsion exists only above the original calibrated
  // range; no extra digital white-pixel noise is introduced.
  const strength=amount/100*(10+5*pushed),clusters=pushed?field(4.2):null;
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const noise=Math.tanh(.72*fine(x+.37,y+.61)+.28*body(x+.83,y+.29)),index=y*stride+1+x*2;
    let luminance=127.5,alpha=1;
    if(source){
      const sx=Math.min(source.width-1,Math.floor((x+.5)*source.width/width)),sy=Math.min(source.height-1,Math.floor((y+.5)*source.height/height));
      const i=(sy*source.width+sx)*4,p=source.pixels;
      luminance=.2126*p[i]+.7152*p[i+1]+.0722*p[i+2];alpha=p[i+3]/255;
    }
    const envelope=Math.sin(Math.PI*luminance/255)**.8;
    const clusteredDensity=clusters?Math.max(.7,1+pushed*.32*Math.tanh(clusters(x+.51,y+.27))):1;
    const delta=Math.abs(noise)*strength*envelope*alpha*clusteredDensity;
    const room=noise>=0?255-luminance:luminance;
    scan[index]=noise>=0?255:0;
    scan[index+1]=Math.round(Math.min(.16,delta/Math.max(1,room))*255);
  }
  return png(width,height,scan,4);
}
// A gentle neutral shoulder reduces bright digital glare without re-grading
// Seedream's colors. Hue ratios are preserved. This is an artistic curve.
export async function shoulderPng(bytes){
  const {width,height,pixels}=await normalizedPixels(bytes),scan=new Uint8Array((width*4+1)*height);
  for(let y=0;y<height;y++)for(let x=0;x<width;x++){
    const i=(y*width+x)*4,j=y*(width*4+1)+1+x*4,max=Math.max(pixels[i],pixels[i+1],pixels[i+2]);
    const t=Math.max(0,(max-150)/105),mapped=max-12*t*t,ratio=max?mapped/max:1;
    scan[j]=Math.round(pixels[i]*ratio);scan[j+1]=Math.round(pixels[i+1]*ratio);scan[j+2]=Math.round(pixels[i+2]*ratio);scan[j+3]=pixels[i+3];
  }
  return png(width,height,scan,6);
}
async function bytesFrom(response,max=OUTPUT_LIMIT){
  if(!response.ok)throw Error('Film processing is temporarily unavailable.');
  const reader=response.body.getReader(),parts=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('The film finish exceeds the image size limit.');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
const stream=bytes=>new Blob([bytes]).stream();
// V8 retains the proven V3 color curve and real-lamp emitter masks with less
// global haze. V3 and V6 stay callable internally for image A/B and rollback.
export async function renderFilmFinish(images,bytes,settings,seed,{engine='v9'}={}){
  if(!['v6','v3','v8','v9'].includes(engine))throw Error('Unknown film engine.');
  const finish=filmFinishSettings(settings);
  if(!images?.input||!images?.info)throw Error('Film processing is temporarily unavailable.');
  if(bytes.length>INPUT_LIMIT)throw Error('This image is too large for the film finish.');
  const info=await images.info(stream(bytes)),width=Number(info.width),height=Number(info.height);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>36_000_000)
    throw Error('Unsupported image dimensions for the film finish.');
  let image=images.input(stream(bytes));
  if(!(finish.grain||finish.haze||finish.halation||finish.film))return bytes;
  const resized=(await images.input(stream(bytes)).transform({width:1000,height:1000,fit:'scale-down'})
    .output({format:'image/png',anim:false})).response();
  const sourcePng=await bytesFrom(resized,5_000_000);
  const plan=photochemicalPlan(finish,{engine});
  if(finish.film){
    // Blend a graded low-res negative/print layer over the native-resolution
    // photograph. Fine image detail remains in the original underneath.
    const grade=images.input(stream(await printGradePng(sourcePng,plan.printStrength,engine))).transform({width,height,fit:'squeeze'});
    image=image.draw(grade,{opacity:plan.printOpacity,composite:'over'});
  }
  if(finish.haze){
    // Minimal global softness; most visible bloom follows real light sources.
    const diffuse=images.input(stream(bytes)).transform({blur:Math.max(1,Math.round(Math.max(width,height)/(engine==='v9'?1200:2400)))});
    image=image.draw(diffuse,{opacity:plan.diffusionOpacity,composite:'over'});
  }
  if(finish.haze||finish.halation){
    const mask=await luminousMaskPng(sourcePng,engine);
    if(mask.active){
      // Scene-scale humid diffusion is separate from tight source halation.
      // Both only draw energy originating in actual bright source pixels.
      // Cloudflare Images enforces a ten-transform graph limit. One larger
      // haze pass plus one smaller source-halation pass leaves room for the
      // separate print curve, fine grain and restrained scene diffusion.
      const stages=[
        ...(finish.haze?[[plan.hazeRadius,plan.hazeOpacity,plan.hazeGain]]:[]),
        ...(finish.halation?[[plan.halationRadius,plan.halationOpacity,plan.halationGain]]:[])
      ];
      const scale=Math.max(.35,Math.min(1,Math.max(width,height)/1400));
      for(const [radius,opacity,gain] of stages){
        const spread=(await images.input(stream(mask.bytes)).transform({blur:Math.max(1,Math.round(radius*scale))})
          .output({format:'image/png',anim:false})).response();
        const halo=await transparentHighlights(await bytesFrom(spread,5_000_000),gain);
        const layer=images.input(stream(halo)).transform({width,height,fit:'squeeze'});
        image=image.draw(layer,{opacity,composite:'over'});
      }
    }
  }
  if(finish.grain){
    const source=await normalizedPixels(sourcePng),scale=Math.min(1,2000/Math.max(width,height));
    const grain=await grainPng(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)),plan.grainAmount,seed,source);
    const texture=images.input(stream(grain)).transform({width,height,fit:'squeeze'});
    image=image.draw(texture,{opacity:1,composite:'over'});
  }
  const response=(await image.output({format:'image/png',anim:false})).response();
  const result=await bytesFrom(response);
  if(!signature.every((value,index)=>result[index]===value))throw Error('Film processing returned an invalid image.');
  return result;
}
export async function filmAssetId(owner,originalId,settings){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([FILM_RENDER_REVISION,owner,originalId,filmFinishSettings(settings)]))));
  digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;
  const s=Array.from(digest.slice(0,16),n=>n.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

// Caller has already authorized the original asset. No URL fetch, provider API,
// generation quote or wallet debit exists anywhere in this module.
export async function prepareFilmAsset(env,original,settings,{first,remaining}){
  const finish=filmFinishSettings(settings);
  if(!finish.grain&&!finish.haze&&!finish.halation&&!finish.film)return original;
  const id=await filmAssetId(original.owner_id,original.id,finish);
  const cached=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',id,original.owner_id);
  if(cached&&await env.LAB_MEDIA.head(cached.object_key))return cached;
  if(original.bytes>INPUT_LIMIT)throw Error('This image is too large for the film finish.');
  const source=await env.LAB_MEDIA.get(original.object_key);
  if(!source)throw Error('The original image is unavailable.');
  const input=await bytesFrom(new Response(source.body),INPUT_LIMIT);
  const bytes=await renderFilmFinish(env.IMAGES,input,finish,original.id);
  if(bytes.length>remaining)throw Error('There is not enough archive space for a finished copy.');
  const object_key=original.owner_id+'/film-finish/v'+FILM_RENDER_REVISION+'/'+id+'.png';
  await env.LAB_MEDIA.put(object_key,bytes,{httpMetadata:{contentType:'image/png'}});
  return {id,owner_id:original.owner_id,object_key,kind:'source',mime:'image/png',filename:'parallel-vision-film-'+id+'.png',bytes:bytes.length,created_at:Date.now()};
}
