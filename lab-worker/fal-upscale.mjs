// Topaz image endpoints and published output-pixel pricing, checked 2026-10-02.
// https://fal.ai/models/topaz/upscale/image/precision
// https://fal.ai/models/topaz/upscale/image/generative
// Local estimates do not reserve a provider price or override provider policies.
export const FAL_UPSCALERS=Object.freeze({
  'topaz-precision':{endpoint:'topaz/upscale/image/precision',pixelsPerUnit:24000000},
  'topaz-wonder':{endpoint:'topaz/upscale/image/generative',pixelsPerUnit:8000000}
});
// Lab archive guard, not a claim about the provider's maximum supported size.
export const MAX_UPSCALE_PIXELS=67108864;

export function falUpscaleParameters(value,{fail}){
  const upscaleEngine=value.upscaleEngine;
  if(!Object.hasOwn(FAL_UPSCALERS,upscaleEngine))fail(400,'Choose SpicyAPI, Topaz Precision or Topaz Wonder 3.5.');
  const scale=Number(value.scale??2),outputFormat=value.outputFormat||'png';
  if(![2,4].includes(scale))fail(400,'Topaz supports 2x or 4x enlargement in this Lab.');
  if(!['png','jpeg'].includes(outputFormat))fail(400,'Topaz image upscaling supports PNG or JPEG.');
  const topazModel=upscaleEngine==='topaz-wonder'?'Wonder 3.5':value.topazModel||'Standard V2';
  if(upscaleEngine==='topaz-precision'&&!['Standard V2','High Fidelity V3'].includes(topazModel))fail(400,'Choose Standard V2 or High Fidelity V3 for Topaz Precision.');
  if(upscaleEngine==='topaz-wonder'&&value.topazModel&&value.topazModel!=='Wonder 3.5')fail(400,'This Topaz Wonder option uses Wonder 3.5.');
  return {type:'image',provider:'fal',engine:'upscale',upscaleEngine,model:FAL_UPSCALERS[upscaleEngine].endpoint,mode:'upscale',prompt:'',scale,topazModel,resolution:scale+'x',aspectRatio:'source',outputFormat,referenceRoles:[],referenceSourceIds:[],lastSourceId:null};
}

function exifOrientation(bytes,start,end){
  if(end-start<14||String.fromCharCode(...bytes.subarray(start,start+6))!=='Exif\0\0')return 1;
  const t=start+6,view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength),little=bytes[t]===73&&bytes[t+1]===73;
  if(!little&&!(bytes[t]===77&&bytes[t+1]===77))return 1;
  if(view.getUint16(t+2,little)!==42)return 1;
  const ifd=t+view.getUint32(t+4,little);if(ifd<t||ifd+2>end)return 1;
  const count=view.getUint16(ifd,little);if(ifd+2+count*12>end)return 1;
  for(let i=0;i<count;i++){const at=ifd+2+i*12;if(view.getUint16(at,little)===0x112&&view.getUint16(at+2,little)===3&&view.getUint32(at+4,little)===1){const value=view.getUint16(at+8,little);return value>=1&&value<=8?value:1;}}
  return 1;
}

// Read dimensions from the stored file, never from browser-supplied width/height.
export function storedImageDimensions(bytes,mime){
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  let width=0,height=0,orientation=1;
  if(mime==='image/png'&&bytes.length>=33&&[137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)&&view.getUint32(8)===13&&String.fromCharCode(...bytes.subarray(12,16))==='IHDR'){
    width=view.getUint32(16);height=view.getUint32(20);
  }else if(mime==='image/jpeg'&&bytes.length>=4&&bytes[0]===255&&bytes[1]===216){
    let at=2;
    while(at+1<bytes.length){
      if(bytes[at++]!==255)throw new Error('Invalid JPEG marker.');
      while(at<bytes.length&&bytes[at]===255)at++;
      const marker=bytes[at++];if(marker===0xda||marker===0xd9)break;
      if(marker===0x01||marker>=0xd0&&marker<=0xd7)continue;
      if(at+2>bytes.length)throw new Error('Truncated JPEG header.');
      const length=view.getUint16(at),end=at+length;if(length<2||end>bytes.length)throw new Error('Invalid JPEG segment.');
      if(marker===0xe1)orientation=exifOrientation(bytes,at+2,end);
      if([0xc0,0xc1,0xc2,0xc3,0xc5,0xc6,0xc7,0xc9,0xca,0xcb,0xcd,0xce,0xcf].includes(marker)){
        if(length<8)throw new Error('Invalid JPEG dimensions.');height=view.getUint16(at+3);width=view.getUint16(at+5);
      }
      at=end;
    }
  }else if(mime==='image/webp'&&bytes.length>=20&&String.fromCharCode(...bytes.subarray(0,4))==='RIFF'&&String.fromCharCode(...bytes.subarray(8,12))==='WEBP'){
    const size=view.getUint32(4,true)+8;if(size>bytes.length||size<20)throw new Error('Truncated WebP.');
    for(let at=12;at+8<=size;){
      const kind=String.fromCharCode(...bytes.subarray(at,at+4)),length=view.getUint32(at+4,true),data=at+8;
      if(data+length>size)throw new Error('Invalid WebP chunk.');
      if(kind==='VP8X'&&length>=10){width=1+bytes[data+4]+(bytes[data+5]<<8)+(bytes[data+6]<<16);height=1+bytes[data+7]+(bytes[data+8]<<8)+(bytes[data+9]<<16);break;}
      if(kind==='VP8 '&&length>=10&&bytes[data+3]===0x9d&&bytes[data+4]===0x01&&bytes[data+5]===0x2a){width=view.getUint16(data+6,true)&0x3fff;height=view.getUint16(data+8,true)&0x3fff;break;}
      if(kind==='VP8L'&&length>=5&&bytes[data]===0x2f){const bits=view.getUint32(data+1,true);width=(bits&0x3fff)+1;height=((bits>>>14)&0x3fff)+1;break;}
      at=data+length+(length&1);
    }
  }
  if(!Number.isSafeInteger(width)||!Number.isSafeInteger(height)||width<1||height<1||width>16000||height>16000)throw new Error('Cannot verify supported image dimensions. Use a valid PNG, JPEG or WebP up to 16,000 pixels per side.');
  if(orientation>=5)[width,height]=[height,width];
  return {width,height};
}

export function setFalUpscaleDimensions(p,{width,height},{fail}){
  const targetWidth=width*p.scale,targetHeight=height*p.scale,pixels=targetWidth*targetHeight;
  if(!Number.isSafeInteger(pixels)||pixels>MAX_UPSCALE_PIXELS)fail(400,'This enlargement exceeds the Lab limit of 67 megapixels. Choose 2x or a smaller source image.');
  Object.assign(p,{sourceWidth:width,sourceHeight:height,targetWidth,targetHeight,inputTransport:'inline-data-uri'});
  return p;
}

export function falUpscaleEstimateMicros(p){
  const pixels=p.targetWidth*p.targetHeight;
  if(!Number.isSafeInteger(pixels)||pixels<1||!FAL_UPSCALERS[p.upscaleEngine])throw new Error('Verified upscale dimensions are required before estimating.');
  return Math.ceil(pixels/FAL_UPSCALERS[p.upscaleEngine].pixelsPerUnit)*80000;
}

export function buildFalUpscaleInput(p){
  return {model:p.topazModel,upscale_factor:p.scale,output_format:p.outputFormat,crop_to_fill:false,face_enhancement:false};
}
