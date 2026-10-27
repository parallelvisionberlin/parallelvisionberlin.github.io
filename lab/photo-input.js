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


/* Upscaler: prepare an oversized camera photo locally, without uploading its
   oversized original or altering the file in the user's photo library. */
export async function prepareUpscaleInput(file,{maxBytes=20*1024*1024}={}){
  if(!file?.size||file.size<=maxBytes)return file;
  if(!['image/jpeg','image/png','image/webp'].includes(file.type))
    throw Error('Choose a JPG, PNG or WebP photograph.');
  const url=URL.createObjectURL(file);
  const img=new Image();
  let canvas;
  try{
    img.src=url;
    await img.decode();
    const width=img.naturalWidth,height=img.naturalHeight;
    if(!width||!height||width*height>72000000||Math.max(width,height)>16000)
      throw Error('This photograph exceeds the supported image dimensions.');
    // Preserve full pixel dimensions whenever possible, reducing JPEG quality
    // before scaling. Downscale only as a last resort for unusually large input.
    canvas=document.createElement('canvas');
    const ctx=canvas.getContext('2d',{alpha:false});
    if(!ctx)throw Error('Could not prepare this photograph.');
    const baseName=(file.name||'photograph').replace(/\.[^.]+$/,'');
    for(const scale of [1,.9,.8,.7]){
      canvas.width=Math.max(1,Math.round(width*scale));
      canvas.height=Math.max(1,Math.round(height*scale));
      ctx.drawImage(img,0,0,canvas.width,canvas.height);
      for(const quality of [.94,.88,.82,.74]){
        const blob=await new Promise(resolve=>canvas.toBlob(resolve,'image/jpeg',quality));
        if(blob?.size>0&&blob.size<=maxBytes)
          return new File([blob],baseName+'-upscale-ready.jpg',{type:'image/jpeg',lastModified:file.lastModified});
      }
    }
    throw Error('Could not prepare a working copy under 20 MB. Please export a smaller JPEG.');
  }finally{
    URL.revokeObjectURL(url);
    img.removeAttribute('src');
    if(canvas){canvas.width=0;canvas.height=0;}
  }
}


/* Browser-local working copies for Elements and Video.
   Ordinary supported photos stay byte-for-byte intact. Oversized or
   browser-decodable alternate image types are converted privately before
   upload; the chosen local file is never modified. */
export async function prepareElementPhoto(file,{maxSide=6000,maxBytes=20*1024*1024}={}){
  if(!file?.size||!String(file.type||'').startsWith('image/'))
    throw Error('Choose a valid photograph.');
  if(file.size>120*1024*1024)
    throw Error('This photograph exceeds the browser upload safety limit.');
  const originalType=['image/jpeg','image/png','image/webp'].includes(file.type);
  let image=null,url=null,canvas=null;
  try{
    if(typeof createImageBitmap==='function'){
      try{image=await createImageBitmap(file);}catch{}
    }
    if(!image){
      url=URL.createObjectURL(file);
      image=new Image();image.src=url;
      await image.decode();
    }
    const width=image.width||image.naturalWidth,height=image.height||image.naturalHeight;
    if(!width||!height||width*height>72000000)
      throw Error('This photograph exceeds the supported image dimensions.');
    if(originalType&&Math.max(width,height)<=maxSide&&file.size<=maxBytes)
      return file;
    const name=(file.name||'reference').replace(/\.[^.]+$/,'')+'-ready.webp';
    canvas=typeof OffscreenCanvas!=='undefined'?new OffscreenCanvas(1,1):document.createElement('canvas');
    const context=canvas.getContext('2d');
    if(!context)throw Error('Your browser could not prepare this photograph.');
    const firstScale=Math.min(1,maxSide/Math.max(width,height));
    for(const factor of [1,.88,.76,.65,.54]){
      const scale=firstScale*factor;
      canvas.width=Math.max(1,Math.floor(width*scale));
      canvas.height=Math.max(1,Math.floor(height*scale));
      context.imageSmoothingEnabled=true;context.imageSmoothingQuality='high';
      context.drawImage(image,0,0,canvas.width,canvas.height);
      for(const quality of [.94,.86,.76,.66]){
        const blob=canvas.convertToBlob
          ?await canvas.convertToBlob({type:'image/webp',quality})
          :await new Promise(resolve=>canvas.toBlob(resolve,'image/webp',quality));
        if(blob?.type==='image/webp'&&blob.size>0&&blob.size<=maxBytes)
          return new File([blob],name,{type:'image/webp',lastModified:file.lastModified});
      }
    }
    throw Error('Your browser could not prepare this photograph.');
  }catch(error){
    if(error?.message==='This photograph exceeds the supported image dimensions.'||
       error?.message==='Your browser could not prepare this photograph.')throw error;
    throw Error('This browser could not read the selected image. Use a JPG, PNG or WebP export.');
  }finally{
    image?.close?.();
    if(url)URL.revokeObjectURL(url);
    if(image&&typeof image.removeAttribute==='function')image.removeAttribute('src');
    if(canvas){canvas.width=0;canvas.height=0;}
  }
}
