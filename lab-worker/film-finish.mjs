import {filmFinishSettings} from '../lab/film-finish.js';

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
// Decode only our small, Cloudflare-normalized highlight PNG. Converting black
// to transparent keeps the original dark pixels untouched by normal compositing.
// Bounds are independent of the source resolution; no full-size pixel buffer.
export async function transparentHighlights(bytes){
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
  const output=new Uint8Array((width*4+1)*height);
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
      const max=Math.max(r,g,b),i=y*(width*4+1)+1+x*4;
      if(max){output[i]=Math.round(r/max*255);output[i+1]=Math.round(g/max*255);output[i+2]=Math.round(b/max*255);output[i+3]=Math.round(max*a/255);}
    }
  }
  return png(width,height,output,6);
}
// A full-frame seeded texture, never a repeated tile. Two spatial scales avoid
// a regular pixel grid; the same original and settings always use the same grain.
export async function grainPng(width,height,amount,seed){
  const random=randomFor(seed),stride=width*2+1,scan=new Uint8Array(stride*height);
  let previous=new Float32Array(width),current=new Float32Array(width);
  const strength=amount/100*.25;
  for(let y=0;y<height;y++){
    let left=0;
    for(let x=0;x<width;x++){
      const fine=(random()+random()+random()-1.5)/1.5;
      const coarse=.45*left+.3*previous[x]+.25*(random()*2-1);current[x]=coarse;left=coarse;
      const noise=.65*fine+.35*coarse,index=y*stride+1+x*2;
      scan[index]=noise>=0?255:0;scan[index+1]=Math.round(Math.abs(noise)*strength*255);
    }
    [previous,current]=[current,previous];
  }
  return png(width,height,scan,4);
}
async function bytesFrom(response,max=OUTPUT_LIMIT){
  if(!response.ok)throw Error('Film processing is temporarily unavailable.');
  const reader=response.body.getReader(),parts=[];let size=0;
  while(true){const {done,value}=await reader.read();if(done)break;size+=value.length;if(size>max){await reader.cancel();throw Error('The film finish exceeds the image size limit.');}parts.push(value);}
  const bytes=new Uint8Array(size);let offset=0;for(const part of parts){bytes.set(part,offset);offset+=part.length;}return bytes;
}
const stream=bytes=>new Blob([bytes]).stream();
export async function renderFilmFinish(images,bytes,settings,seed){
  const finish=filmFinishSettings(settings);
  if(!images?.input||!images?.info)throw Error('Film processing is temporarily unavailable.');
  if(bytes.length>INPUT_LIMIT)throw Error('This image is too large for the film finish.');
  const info=await images.info(stream(bytes)),width=Number(info.width),height=Number(info.height);
  if(!Number.isInteger(width)||!Number.isInteger(height)||width<1||height<1||width*height>36_000_000)
    throw Error('Unsupported image dimensions for the film finish.');
  let image=images.input(stream(bytes));
  if(finish.glow){
    const mask=(await images.input(stream(bytes)).transform({brightness:.62}).transform({contrast:12})
      .transform({width:700,height:700,fit:'scale-down'}).output({format:'image/png',anim:false})).response();
    const maskPng=await bytesFrom(mask,5_000_000),maskScale=Math.min(Math.max(width,height),700)/1400;
    // Each overlay is a fresh pipeline. Darken then increase contrast to keep
    // the glow concentrated in highlights, with a small core and a wider falloff.
    // The original itself is never blurred, sharpened or reconstructed.
    for(const [radius,weight] of [[3,.34],[15,.22]]){
      // Blur opaque light energy before converting it to transparency. Blurring
      // straight RGBA would mix transparent black into the bright light cores.
      const spread=(await images.input(stream(maskPng)).transform({blur:Math.max(1,Math.round(radius*maskScale))})
        .output({format:'image/png',anim:false})).response();
      const highlightsPng=await transparentHighlights(await bytesFrom(spread,5_000_000));
      const highlights=images.input(stream(highlightsPng)).transform({width,height,fit:'squeeze'});
      image=image.draw(highlights,{opacity:finish.glow/100*weight,composite:'over'});
    }
  }
  if(finish.grain){
    const textureScale=Math.min(1,1400/Math.max(width,height));
    const grain=await grainPng(Math.max(1,Math.round(width*textureScale)),Math.max(1,Math.round(height*textureScale)),finish.grain,seed);
    const texture=images.input(stream(grain)).transform({width,height,fit:'squeeze'});
    image=image.draw(texture,{opacity:1,composite:'over'});
  }
  const response=(await image.output({format:'image/png',anim:false})).response();
  const result=await bytesFrom(response);
  if(!signature.every((value,index)=>result[index]===value))throw Error('Film processing returned an invalid image.');
  return result;
}
export async function filmAssetId(owner,originalId,settings){
  const digest=new Uint8Array(await crypto.subtle.digest('SHA-256',new TextEncoder().encode(JSON.stringify([owner,originalId,filmFinishSettings(settings)]))));
  digest[6]=(digest[6]&15)|64;digest[8]=(digest[8]&63)|128;
  const s=Array.from(digest.slice(0,16),n=>n.toString(16).padStart(2,'0')).join('');
  return `${s.slice(0,8)}-${s.slice(8,12)}-${s.slice(12,16)}-${s.slice(16,20)}-${s.slice(20)}`;
}

// Caller has already authorized the original asset. No URL fetch, provider API,
// generation quote or wallet debit exists anywhere in this module.
export async function prepareFilmAsset(env,original,settings,{first,remaining}){
  const finish=filmFinishSettings(settings);
  if(!finish.grain&&!finish.glow)return original;
  const id=await filmAssetId(original.owner_id,original.id,finish);
  const cached=await first(env,'SELECT * FROM assets WHERE id=? AND owner_id=?',id,original.owner_id);
  if(cached&&await env.LAB_MEDIA.head(cached.object_key))return cached;
  if(original.bytes>INPUT_LIMIT)throw Error('This image is too large for the film finish.');
  const source=await env.LAB_MEDIA.get(original.object_key);
  if(!source)throw Error('The original image is unavailable.');
  const input=await bytesFrom(new Response(source.body),INPUT_LIMIT);
  const bytes=await renderFilmFinish(env.IMAGES,input,finish,original.id);
  if(bytes.length>remaining)throw Error('There is not enough archive space for a finished copy.');
  const object_key=original.owner_id+'/film-finish/v1/'+id+'.png';
  await env.LAB_MEDIA.put(object_key,bytes,{httpMetadata:{contentType:'image/png'}});
  return {id,owner_id:original.owner_id,object_key,kind:'source',mime:'image/png',filename:'parallel-vision-film-'+id+'.png',bytes:bytes.length,created_at:Date.now()};
}
