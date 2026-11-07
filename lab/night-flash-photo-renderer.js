import {grainPng,INPUT_LIMIT} from './film-renderer.mjs';
import {opticalScatterPixels} from './film-light-scatter.mjs';

const MAX_PIXELS=36_000_000;
const clamp=(value,min=0,max=1)=>Math.max(min,Math.min(max,value));
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
const makeCanvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});

// Shape the exposure at the picked point and let it spread down over the body.
// The field is smooth and full resolution, so it keeps pores, fabric and edges.
function relight({data,width,height},point){
  const scale=Math.min(width,height);
  const centerX=point.x*width,centerY=point.y*height;
  const vertical=new Float32Array(height),horizontal=new Float32Array(width);
  for(let x=0;x<width;x++)horizontal[x]=((x-centerX)/(scale*.285))**2;
  for(let y=0;y<height;y++){
    const distance=(y-centerY)/scale;
    vertical[y]=(distance/(distance<0?.32:.84))**2;
  }
  for(let y=0,i=0;y<height;y++)for(let x=0;x<width;x++,i+=4){
    const light=Math.exp(-1.4*(horizontal[x]+vertical[y]));
    const luminance=(.2126*data[i]+.7152*data[i+1]+.0722*data[i+2])/255;
    const ambient=.48+.14*smooth(.06,.55,luminance);
    const exposure=ambient+(1.42-ambient)*light;
    // Soft shoulder on hot skin and fabric, with restrained cool shadow color.
    const lifted=luminance*exposure;
    const shoulder=lifted>.79?(.79+.18*(1-Math.exp(-(lifted-.79)/.18)))/lifted:1;
    const gain=exposure*shoulder;
    const cool=1-light;
    data[i]*=gain*(1-.065*cool);
    data[i+1]*=gain;
    data[i+2]*=gain*(1+.045*cool);
  }
}

export async function applyNightFlash(file,point){
  if(file.size>INPUT_LIMIT)throw Error('This image is too large for Night Flash.');
  const image=await createImageBitmap(file);
  const {width,height}=image;
  if(width<1||height<1||width*height>MAX_PIXELS){
    image.close();throw Error('Unsupported image dimensions for Night Flash.');
  }
  const canvas=makeCanvas(width,height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  try{
    ctx.drawImage(image,0,0);
  }finally{image.close();}
  try{
    const frame=ctx.getImageData(0,0,width,height);
    relight(frame,{x:clamp(point.x),y:clamp(point.y)});
    ctx.putImageData(frame,0,0);

    const opticalScale=Math.min(1,1000/Math.max(width,height));
    const small=makeCanvas(Math.max(1,Math.round(width*opticalScale)),Math.max(1,Math.round(height*opticalScale)));
    const low=small.getContext('2d');
    low.drawImage(canvas,0,0,small.width,small.height);
    const source={width:small.width,height:small.height,pixels:low.getImageData(0,0,small.width,small.height).data};
    const scatter=low.createImageData(source.width,source.height);
    scatter.data.set(opticalScatterPixels(source.width,source.height,source.pixels,{haze:0,halation:22}));
    low.putImageData(scatter,0,0);
    ctx.globalCompositeOperation='lighter';
    ctx.drawImage(small,0,0,width,height);
    small.width=small.height=1;
    ctx.globalCompositeOperation='source-over';

    const grainScale=Math.min(1,2000/Math.max(width,height));
    const grain=await grainPng(Math.max(1,Math.round(width*grainScale)),Math.max(1,Math.round(height*grainScale)),39,file.name,source);
    const texture=await createImageBitmap(new Blob([grain],{type:'image/png'}));
    try{ctx.drawImage(texture,0,0,width,height);}
    finally{texture.close();}
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not export this photo.')),'image/png'));
  }finally{canvas.width=canvas.height=1;}
}
