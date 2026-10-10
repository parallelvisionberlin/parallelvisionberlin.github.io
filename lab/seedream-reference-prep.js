// Browser-local, zero-network Seedream working-copy prewarming.
// Originals are never mutated. Prepared files are keyed by File object identity,
// not by filenames or asset IDs, to prevent accidental cross-reference reuse.
export function seedreamPrepKind(item,{pixelLimit=36000000,byteLimit=10*1024*1024}={}){
  const file=item?.file, width=Number(item?.width), height=Number(item?.height);
  if(!file||!Number.isFinite(Number(file.size)))return null;
  if(Number.isSafeInteger(width)&&width>0&&Number.isSafeInteger(height)&&height>0&&width*height>pixelLimit)
    return 'pixels';
  return Number(file.size)>byteLimit?'bytes':null;
}

export function createSeedreamReferencePreparer({
  pixelCopy,byteCopy,canBackground=()=>false,now=()=>Date.now(),ttlMs=15*60*1000
}={}){
  if(typeof pixelCopy!=='function'||typeof byteCopy!=='function')
    throw new TypeError('Seedream preparation requires pixel and byte optimizers.');
  let prepared=new WeakMap(),inflight=new WeakMap(),revision=0;
  function prepare(item,{background=false}={}){
    const kind=seedreamPrepKind(item);
    if(!kind)return null;
    const source=item.file,existing=prepared.get(source);
    if(existing?.kind===kind&&now()>=existing.at&&now()-existing.at<ttlMs)
      return Promise.resolve(existing.file);
    const current=inflight.get(source);
    if(current?.kind===kind){
      if(background||!current.background)return current.promise;
      // A background-only Worker may be unavailable. A deliberate Generate
      // action can use the existing foreground fallback without duplicating work.
      return current.promise.catch(error=>{
        if(error?.code!=='unavailable')throw error;
        return prepare(item,{background:false});
      });
    }
    if(background&&!canBackground())return null;
    const stamp=revision,make=kind==='pixels'?pixelCopy:byteCopy;
    let entry;
    const promise=Promise.resolve()
      .then(()=>make(source,{backgroundOnly:background}))
      .then(result=>{
        if(stamp===revision&&inflight.get(source)===entry)
          prepared.set(source,{kind,file:result,at:now()});
        return result;
      })
      .finally(()=>{if(inflight.get(source)===entry)inflight.delete(source);});
    entry={kind,background,promise};
    inflight.set(source,entry);
    return promise;
  }
  return {
    warm:item=>prepare(item,{background:true}),
    forSubmission:item=>prepare(item,{background:false}),
    status(item){
      const kind=seedreamPrepKind(item);
      if(!kind)return 'not-needed';
      const cached=prepared.get(item.file);
      if(cached?.kind===kind&&now()>=cached.at&&now()-cached.at<ttlMs)return 'ready';
      return inflight.get(item.file)?.kind===kind?'preparing':'idle';
    },
    forget(file){if(file){prepared.delete(file);inflight.delete(file);}},
    clear(){revision++;prepared=new WeakMap();inflight=new WeakMap();}
  };
}
