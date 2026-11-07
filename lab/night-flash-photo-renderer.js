import {renderFilmFinish} from './film-renderer.mjs';

const decode=async body=>createImageBitmap(await new Response(body).blob());

class ImageLayer {
  constructor(body){this.body=body;this.layers=[];}
  transform(size){this.size=size;return this;}
  draw(layer,options){this.layers.push({layer,options});return this;}
  async raster(){
    const bitmap=await decode(this.body);
    const size=this.size;
    const scale=size?Math.min(1,size.width/bitmap.width,size.height/bitmap.height):1;
    const canvas=document.createElement('canvas');
    canvas.width=size?.fit==='squeeze'?size.width:Math.max(1,Math.round(bitmap.width*scale));
    canvas.height=size?.fit==='squeeze'?size.height:Math.max(1,Math.round(bitmap.height*scale));
    const ctx=canvas.getContext('2d');
    try{ctx.drawImage(bitmap,0,0,canvas.width,canvas.height);}
    finally{bitmap.close();}
    for(const {layer,options} of this.layers){
      const overlay=await layer.raster();
      ctx.globalAlpha=options.opacity;
      ctx.globalCompositeOperation=options.composite==='lighter'?'lighter':'source-over';
      ctx.drawImage(overlay,0,0);
      overlay.width=overlay.height=1;
    }
    return canvas;
  }
  async output(){
    const canvas=await this.raster();
    try{
      const blob=await new Promise((resolve,reject)=>canvas.toBlob(result=>result?resolve(result):reject(Error('Could not export this photo.')),'image/png'));
      return {response:()=>new Response(blob)};
    }finally{canvas.width=canvas.height=1;}
  }
}

const images={
  input:body=>new ImageLayer(body),
  info:async body=>{
    const bitmap=await decode(body);
    try{return {width:bitmap.width,height:bitmap.height};}
    finally{bitmap.close();}
  }
};

const settings=Object.freeze({version:2,grain:29,haze:0,halation:16,film:100});
const smooth=(a,b,value)=>{const t=Math.max(0,Math.min(1,(value-a)/(b-a)));return t*t*(3-2*t);};
function nightFlashGrade(r,g,b){
  const y=(.2126*r+.7152*g+.0722*b)/255;
  const gain=.58+.36*smooth(.12,.62,y)+.12*smooth(.58,.98,y);
  return [r,g,b].map(value=>Math.round(Math.min(255,value*gain)));
}

export async function applyNightFlash(file){
  const bytes=new Uint8Array(await file.arrayBuffer());
  return renderFilmFinish(images,bytes,settings,file.name,{grade:nightFlashGrade});
}

