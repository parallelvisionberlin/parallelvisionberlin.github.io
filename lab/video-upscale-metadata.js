// Shared local preview fallback and server quote validation. No provider calls.
export const VIDEO_UPSCALE_MAX_SECONDS=300;
export const VIDEO_UPSCALE_MAX_BYTES=20*1024*1024*1024;
export const VIDEO_METADATA_MAX_BYTES=32*1024*1024;
const text4=(a,p)=>String.fromCharCode(a[p],a[p+1],a[p+2],a[p+3]);

// MP4 and modern QuickTime MOV share ISO BMFF boxes for video duration, sample timing and
// dimensions. Do not price an arbitrary client-provided duration or frame rate.
// Reject unsupported/fragmented media instead of guessing and undercharging.
export function inspectUpscaleMp4(data){
  const bytes=data instanceof Uint8Array?data:new Uint8Array(data);
  if(bytes.byteLength<128||text4(bytes,4)!=='ftyp')throw Error('Use a valid, unfragmented MP4 or MOV video.');
  const view=new DataView(bytes.buffer,bytes.byteOffset,bytes.byteLength);
  const u32=p=>view.getUint32(p);
  const boxes=(from,to)=>{
    const out=[];let p=from;
    while(p+8<=to){
      let size=u32(p),header=8;
      if(size===1){if(p+16>to)throw Error('Invalid MP4 box.');const hi=u32(p+8),lo=u32(p+12);
        size=hi*4294967296+lo;header=16;}
      else if(size===0)size=to-p;
      if(!Number.isSafeInteger(size)||size<header||p+size>to)throw Error('Invalid MP4 box dimensions.');
      out.push({type:text4(bytes,p+4),start:p+header,end:p+size});
      p+=size;
    }
    return out;
  };
  const inside=(parent,type)=>parent?boxes(parent.start,parent.end).find(b=>b.type===type):null;
  const root=boxes(0,bytes.length),moov=root.find(b=>b.type==='moov');
  if(!moov||inside(moov,'mvex'))throw Error('This video has no readable index. Export as a standard MP4 (H.264).');
  let found=null;
  for(const trak of boxes(moov.start,moov.end).filter(b=>b.type==='trak')){
    const mdia=inside(trak,'mdia'),hdlr=inside(mdia,'hdlr');
    if(!hdlr||hdlr.start+12>hdlr.end||text4(bytes,hdlr.start+8)!=='vide')continue;
    const mdhd=inside(mdia,'mdhd'),tkhd=inside(trak,'tkhd');
    const minf=inside(mdia,'minf'),stbl=inside(minf,'stbl'),stts=inside(stbl,'stts');
    if(!mdhd||!tkhd||!stts||mdhd.start+20>mdhd.end||stts.start+8>stts.end)
      throw Error('MP4 timing metadata is incomplete. Export a standard H.264 MP4.');
    const version=bytes[mdhd.start],scaleAt=mdhd.start+(version===1?20:12);
    if(scaleAt+4>mdhd.end)throw Error('Invalid MP4 time scale.');
    const timescale=u32(scaleAt);
    const count=u32(stts.start+4);
    if(!timescale||count===0||count>100000||stts.start+8+count*8>stts.end)
      throw Error('Invalid MP4 frame timing.');
    let samples=0,ticks=0;
    for(let k=0;k<count;k++){
      const n=u32(stts.start+8+k*8),delta=u32(stts.start+12+k*8);
      if(!n||!delta)throw Error('Invalid MP4 frame rate.');
      samples+=n;ticks+=n*delta;
    }
    const duration=ticks/timescale,fps=samples/duration;
    const width=u32(tkhd.end-8)/65536,height=u32(tkhd.end-4)/65536;
    found={duration,fps,width:Math.round(width),height:Math.round(height),frames:samples};
    break;
  }
  if(!found||!Number.isFinite(found.duration)||found.duration<0.5||
    !Number.isFinite(found.fps)||found.fps<=0||!Number.isSafeInteger(found.frames)||
    !Number.isInteger(found.width)||!Number.isInteger(found.height)||
    found.width<160||found.height<160||found.width>7680||found.height>7680)
    throw Error('Choose an MP4 or MOV with a valid video track and frame timing.');
  return found;
}

// Read only ISO BMFF headers and moov metadata. Never buffer a camera file's
// media payload, whether this reader is backed by File.slice or private R2.
export async function inspectUpscaleVideoRanges(size,readRange){
  if(!Number.isSafeInteger(size)||size<128||size>VIDEO_UPSCALE_MAX_BYTES)throw Error('Choose an MP4 or MOV up to 20 GB.');
  let offset=0,prefix=null;
  for(let boxes=0;offset+8<=size&&boxes<1024;boxes++){
    const head=new Uint8Array(await readRange(offset,Math.min(16,size-offset)));
    if(head.length<8)throw Error('Incomplete video header.');
    const view=new DataView(head.buffer,head.byteOffset,head.byteLength);
    let length=view.getUint32(0),header=8;
    if(length===1){if(head.length<16)throw Error('Incomplete video header.');length=view.getUint32(8)*4294967296+view.getUint32(12);header=16;}
    else if(length===0)length=size-offset;
    const type=text4(head,4);
    if(!Number.isSafeInteger(length)||length<header||offset+length>size)throw Error('Invalid video box dimensions.');
    if(offset===0){
      if(type!=='ftyp'||length>65536)throw Error('Choose a valid MP4 or MOV container.');
      prefix=new Uint8Array(await readRange(0,length));
    }
    if(type==='moov'){
      if(length>VIDEO_METADATA_MAX_BYTES)throw Error('Video metadata is too large to read safely.');
      const moov=new Uint8Array(await readRange(offset,length));
      if(moov.length!==length)throw Error('Incomplete video metadata.');
      const data=new Uint8Array(prefix.length+moov.length);data.set(prefix);data.set(moov,prefix.length);
      return inspectUpscaleMp4(data);
    }
    offset+=length;
  }
  throw Error('This video has no readable index. Export a standard MP4 or MOV.');
}
