import {grainPng,INPUT_LIMIT} from './film-renderer.mjs';
import {segmentPhoto} from './night-flash-subject-mask.js';

const MAX_PIXELS=36_000_000;
const SAMPLE_EDGE=768;
const clamp=value=>Math.max(0,Math.min(1,value));
const smooth=(a,b,value)=>{const t=clamp((value-a)/(b-a));return t*t*(3-2*t);};
const makeCanvas=(width,height)=>Object.assign(document.createElement('canvas'),{width,height});
const toLinear=value=>value<=.04045?value/12.92:((value+.055)/1.055)**2.4;
const fromLinear=value=>value<=.0031308?12.92*value:1.055*value**(1/2.4)-.055;
const exposureTable=stops=>Float32Array.from({length:256},(_,i)=>255*clamp(fromLinear(toLinear(i/255)*2**stops)));
const ambient=exposureTable(-.7),flash=exposureTable(.15);

function maskLayer({width,height,person,face}){
  const canvas=makeCanvas(width,height),ctx=canvas.getContext('2d');
  const mask=ctx.createImageData(width,height);
  let detected=0;
  for(let index=0,i=0;index<person.length;index++,i+=4){
    if(person[index]>.65)detected++;
    mask.data[i]=255*smooth(.48,.96,person[index]);
    mask.data[i+1]=255*smooth(.45,.9,face[index]);
    mask.data[i+3]=255;
  }
  if(detected<person.length*.008){
    canvas.width=canvas.height=1;
    throw Error('Could not find a clear person in this Base photo.');
  }
  ctx.putImageData(mask,0,0);
  return canvas;
}

function develop(frame,mask){
  for(let i=0;i<frame.length;i+=4){
    const person=mask[i]/255;
    const luminance=(.2126*frame[i]+.7152*frame[i+1]+.0722*frame[i+2])/255;
    const reflection=person*(mask[i+1]/255)*smooth(.40,.68,luminance)*(1-smooth(.78,.98,luminance));
    for(let channel=i;channel<i+3;channel++){
      const value=frame[channel];
      frame[channel]=value+(ambient[value]-value)*(1-person)+(flash[value]-value)*reflection;
    }
  }
}

export async function applyNightFlash(file,{segment=segmentPhoto,signal}={}){
  if(file.size>INPUT_LIMIT)throw Error('This image is too large for Night Flash.');
  const image=await createImageBitmap(file);
  const {width,height}=image;
  if(width<1||height<1||width*height>MAX_PIXELS){
    image.close();throw Error('Unsupported image dimensions for Night Flash.');
  }
  const canvas=makeCanvas(width,height);
  const ctx=canvas.getContext('2d',{willReadFrequently:true});
  const scale=Math.min(1,SAMPLE_EDGE/Math.max(width,height));
  const small=makeCanvas(Math.max(1,Math.round(width*scale)),Math.max(1,Math.round(height*scale)));
  const low=small.getContext('2d',{willReadFrequently:true});
  try{
    ctx.drawImage(image,0,0);
    low.drawImage(image,0,0,small.width,small.height);
  }finally{image.close();}
  let matte,strip;
  try{
    matte=maskLayer(await segment(low.getImageData(0,0,small.width,small.height),{signal}));
    // Process the original in strips to avoid allocating a second full-size mask.
    const bandHeight=Math.min(height,192);
    strip=makeCanvas(width,bandHeight);
    const maskContext=strip.getContext('2d',{willReadFrequently:true});
    for(let top=0;top<height;top+=bandHeight){
      const rows=Math.min(bandHeight,height-top);
      maskContext.drawImage(matte,0,-top,width,height);
      const band=ctx.getImageData(0,top,width,rows);
      develop(band.data,maskContext.getImageData(0,0,width,rows).data);
      ctx.putImageData(band,0,top);
    }

    low.clearRect(0,0,small.width,small.height);
    low.drawImage(canvas,0,0,small.width,small.height);
    const source={width:small.width,height:small.height,pixels:low.getImageData(0,0,small.width,small.height).data};
    const grainScale=Math.min(1,2000/Math.max(width,height));
    const grain=await grainPng(Math.max(1,Math.round(width*grainScale)),Math.max(1,Math.round(height*grainScale)),24,file.name,source);
    const texture=await createImageBitmap(new Blob([grain],{type:'image/png'}));
    try{ctx.drawImage(texture,0,0,width,height);}
    finally{texture.close();}
    return await new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(Error('Could not export this photo.')),'image/png'));
  }finally{
    canvas.width=canvas.height=small.width=small.height=1;
    if(matte)matte.width=matte.height=1;
    if(strip)strip.width=strip.height=1;
  }
}
