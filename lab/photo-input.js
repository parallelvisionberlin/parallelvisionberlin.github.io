// Local import normalization. Never upload HEIC bytes under a JPEG MIME label.
export const PHOTO_ACCEPT='image/jpeg,image/png,image/webp,image/heic,image/heif,.heic,.heif';
export async function preparePhotoInput(file,{maxBytes=10*1024*1024}={}){
  if(!file?.size)throw Error('This photo is empty. Choose it again from Photos.');
  if(file.size>maxBytes)throw Error('This photo is too large. Choose one up to '+Math.round(maxBytes/1048576)+' MB.');
  const bytes=new Uint8Array(await file.slice(0,256).arrayBuffer());
  const text=(start,end)=>String.fromCharCode(...bytes.slice(start,end));
  let type='';
  if(bytes[0]===255&&bytes[1]===216&&bytes[2]===255)type='image/jpeg';
  else if(text(1,4)==='PNG'&&bytes[0]===137)type='image/png';
  else if(text(0,4)==='RIFF'&&text(8,12)==='WEBP')type='image/webp';
  const heic=text(4,8)==='ftyp'&&/heic|heix|hevc|hevx|mif1|msf1/.test(text(8,bytes.length))&&!/avif|avis/.test(text(8,bytes.length));
  if(!type&&!heic)throw Error('Choose a JPG, PNG, WebP or iPhone HEIC photo.');
  if(type)return file.type===type?file:new File([file],file.name||'photo',{type,lastModified:file.lastModified});
  // Use the iPhone's native image decoder, including its orientation handling.
  const input=new File([file],file.name||'photo.heic',{type:'image/heic'});
  const url=URL.createObjectURL(input),image=new Image();let canvas;
  try{
    image.src=url;
    try{await image.decode();}catch{throw Error('This browser could not open the HEIC photo. Try it in Safari on your iPhone, or export a JPEG from Photos.');}
    const width=image.naturalWidth,height=image.naturalHeight;
    if(!width||!height||width*height>72000000)throw Error('Choose a photo up to 72 megapixels.');
    // Bound the temporary canvas on phones; the original stays in Photos.
    const scale=Math.min(1,4096/Math.max(width,height));
    canvas=document.createElement('canvas');canvas.width=Math.round(width*scale);canvas.height=Math.round(height*scale);
    const context=canvas.getContext('2d');if(!context)throw Error('Could not prepare this photo. Please try again.');
    context.drawImage(image,0,0,canvas.width,canvas.height);
    for(const quality of [.94,.88,.8]){
      const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
      if(blob?.type==='image/jpeg'&&blob.size&&blob.size<=maxBytes)
        return new File([blob],(file.name||'photo').replace(/\.[^.]+$/,'')+'.jpg',{type:'image/jpeg'});
    }
    throw Error('Could not prepare this photo below '+Math.round(maxBytes/1048576)+' MB. Export a smaller JPEG from Photos.');
  }finally{URL.revokeObjectURL(url);image.removeAttribute('src');if(canvas){canvas.width=0;canvas.height=0;}}
}
