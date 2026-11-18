// Shared local preview fallback and server quote validation. No provider calls.
export const VIDEO_UPSCALE_MAX_SECONDS=30;
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
  if(!found||!Number.isFinite(found.duration)||found.duration<0.5||found.duration>VIDEO_UPSCALE_MAX_SECONDS||
    !Number.isFinite(found.fps)||found.fps<8||found.fps>60.1||found.frames>2000||
    !Number.isInteger(found.width)||!Number.isInteger(found.height)||
    found.width<160||found.height<160||found.width>7680||found.height>7680)
    throw Error('Choose an MP4 or MOV between 0.5 and 30 seconds, 8 to 60 fps, with a valid video track.');
  return found;
}
